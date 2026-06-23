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

async function main() {
  const csvDir = path.join(__dirname, '../MAGALU_BD/Sistema')
  const arquivos = fs.readdirSync(csvDir).filter(f => f.endsWith('.csv'))
  
  let atualizados = 0

  for (const arquivo of arquivos) {
    const nomeCliente = arquivo.replace('.csv', '')
    console.log(`⏳ Processando ${nomeCliente}...`)

    const conteudo = fs.readFileSync(path.join(csvDir, arquivo), 'utf-8')
    const registros: any[] = parse(conteudo, {
      columns: true,
      skip_empty_lines: true,
      relax_quotes: true,
    })

    // Busca o cliente no banco
    const cliente = await prisma.cliente.findFirst({ where: { nome: nomeCliente } })
    if (!cliente) { console.log(`  ⚠️ Cliente ${nomeCliente} não encontrado`); continue }

    for (const reg of registros) {
      const etiqueta = String(reg.ETIQUETA || '').trim()
      const nomeDoc = String(reg.DOCUMENTO || '').trim()
      if (!etiqueta || !nomeDoc) continue

      // Busca a caixa pela etiqueta
      const caixa = await prisma.caixa.findUnique({
        where: { etiqueta },
        select: { id: true },
      })
      if (!caixa) continue

      // Atualiza documentos da caixa que estão com nomeDocumento null
      const updated = await prisma.documento.updateMany({
        where: {
          caixaId: caixa.id,
          nomeDocumento: null,
        },
        data: {
          nomeDocumento: nomeDoc,
        },
      })
      atualizados += updated.count
    }

    console.log(`  ✅ ${nomeCliente} processado`)
  }

  console.log(`\n✅ Total atualizado: ${atualizados} documentos`)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())