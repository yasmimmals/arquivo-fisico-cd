import 'dotenv/config'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@prisma/client'
import pg from 'pg'
import fs from 'fs'
import path from 'path'
import { parse } from 'csv-parse/sync'

const pool = new pg.Pool({ connectionString: process.env.DIRECT_URL })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter } as any)

function parseEndereco(raw: string) {
  const match = raw?.match(/^(\d+)([A-Z]+)(\d{2})(\d{2})(\d{2})$/)
  if (!match) return null
  return {
    barracão:      parseInt(match[1]),
    corredor:      match[2],
    prateleira:    parseInt(match[3]),
    andar:         parseInt(match[4]),
    posicao:       parseInt(match[5]),
    enderecoCodigo: raw,
  }
}

function parseDate(raw: string | null): Date | null {
  if (!raw) return null
  const d = new Date(raw)
  return isNaN(d.getTime()) ? null : d
}

async function main() {
  const csvDir = path.join(__dirname, '../MAGALU_BD/Sistema')

  if (!fs.existsSync(csvDir)) {
    console.error(`❌ Pasta não encontrada: ${csvDir}`)
    console.error('   Esperado em: ' + csvDir)
    process.exit(1)
  }

  const arquivos = fs.readdirSync(csvDir).filter((f: string) => f.endsWith('.csv'))
  console.log(`📂 ${arquivos.length} arquivos CSV encontrados\n`)

  let totalCaixas = 0
  let totalDocumentos = 0
  let erros = 0

  for (const arquivo of arquivos) {
    const nomeCliente = arquivo.replace('.csv', '')
    console.log(`⏳ Importando ${nomeCliente}...`)

    const conteudo = fs.readFileSync(path.join(csvDir, arquivo), 'utf-8')
    const registros: any[] = parse(conteudo, {
      columns: true,
      skip_empty_lines: true,
      relax_quotes: true,
    })

    // Criar ou buscar cliente
    const cliente = await prisma.cliente.upsert({
      where: { nome: nomeCliente },
      update: {},
      create: { nome: nomeCliente },
    })

    // Criar setores únicos
    const setoresUnicos = [...new Set(registros.map((r) => r.SETOR).filter(Boolean))] as string[]
    for (const nomeSetor of setoresUnicos) {
      await prisma.setor.upsert({
        where: { nome_clienteId: { nome: nomeSetor, clienteId: cliente.id } },
        update: {},
        create: { nome: nomeSetor, clienteId: cliente.id },
      })
    }

    const setoresDb = await prisma.setor.findMany({ where: { clienteId: cliente.id } })
    const setorMap = Object.fromEntries(setoresDb.map((s) => [s.nome, s.id]))

    // Agrupar por caixa
    const caixaMap = new Map<string, any[]>()
    for (const reg of registros) {
      const numCaixa = String(reg.CAIXA || '').trim()
      if (!numCaixa) continue
      if (!caixaMap.has(numCaixa)) caixaMap.set(numCaixa, [])
      caixaMap.get(numCaixa)!.push(reg)
    }

    // Criar endereço + caixa + documentos
    for (const [numCaixa, docs] of caixaMap) {
      try {
        const primeiro = docs[0]
        const enderecoRaw = String(primeiro.ENDERECO || '').trim()
        const etiqueta = String(primeiro.ETIQUETA || numCaixa).trim()

        let enderecoId: string | undefined = undefined
        if (enderecoRaw) {
          const parsed = parseEndereco(enderecoRaw)
          if (parsed) {
            const endereco = await prisma.endereco.upsert({
              where: { enderecoCodigo: parsed.enderecoCodigo },
              update: {},
              create: parsed,
            })
            enderecoId = endereco.id
          }
        }

        const caixa = await prisma.caixa.upsert({
          where: { etiqueta },
          update: {},
          create: {
            etiqueta,
            clienteId: cliente.id,
            enderecoId: enderecoId ?? null,
            status: 'ATIVA',
          },
        })
        totalCaixas++

        for (const doc of docs) {
          const setorNome = String(doc.SETOR || '').trim()
          const setorId = setorMap[setorNome]
          if (!setorId) continue

          let metadata: Record<string, any> = {}
          try { metadata = JSON.parse(doc.metadata || '{}') } catch { metadata = {} }

          await prisma.documento.create({
            data: {
              caixaId: caixa.id,
              setorId,
              nomeDocumento: String(doc.DOCUMENTO || '').trim(),
              dataInicial: parseDate(doc.document_date),
              dataFinal: null,
              metadata,
            },
          })
          totalDocumentos++
        }
      } catch (err: any) {
        erros++
        if (erros <= 5) console.warn(`  ⚠️  Erro na caixa ${numCaixa}: ${err.message}`)
      }
    }

    console.log(`  ✅ ${nomeCliente}: ${caixaMap.size} caixas | ${registros.length} documentos`)
  }

  console.log('\n═══════════════════════════════════')
  console.log('✅ Importação concluída!')
  console.log(`   Caixas:     ${totalCaixas}`)
  console.log(`   Documentos: ${totalDocumentos}`)
  if (erros > 0) console.log(`   ⚠️  Erros:   ${erros}`)
  console.log('═══════════════════════════════════')
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())