import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const [clientes, setores, documentos] = await Promise.all([
      prisma.cliente.findMany({
        where: { ativo: true },
        orderBy: { nome: 'asc' },
      }),
      prisma.setor.findMany({
        orderBy: { nome: 'asc' },
        include: { cliente: true },
      }),
      // AUTO-DESCOBERTA: Vamos procurar diretamente nos documentos importados
      // para descobrir quais são os tipos de documentos e quais os campos JSON (metadata) deles.
      prisma.documento.findMany({
        select: { setorId: true, nomeDocumento: true, metadata: true },
        where: { AND: [{ nomeDocumento: { not: null } }, { nomeDocumento: { not: '' } }] }
      })
    ])

    // Agrupamos os tipos e extraímos as chaves únicas de dentro do JSON
    const tiposMap = new Map()
    
    for (const doc of documentos) {
      if (!doc.nomeDocumento || !doc.setorId) continue;
      
      const key = `${doc.setorId}-${doc.nomeDocumento}`;
      
      if (!tiposMap.has(key)) {
        tiposMap.set(key, {
          id: key, // Criamos um ID virtual juntando o Setor e o Nome
          nome: doc.nomeDocumento,
          setorId: doc.setorId,
          camposSet: new Set<string>() // O Set evita campos duplicados
        })
      }
      
      const tipo = tiposMap.get(key)
      
      let meta = doc.metadata as any
      if (typeof meta === 'string') {
        try { meta = JSON.parse(meta) } catch { meta = {} }
      }
      
      // Lemos as chaves do JSON e adicionamos como campos dinâmicos
      if (meta && typeof meta === 'object') {
        Object.keys(meta).forEach(k => {
          // Ignoramos colunas que já existem por padrão no sistema
          const ignorar = ['Caixa Cliente', 'Caixa Magalu', 'Data do Documento', 'Etiqueta'];
          if (!ignorar.includes(k)) {
            tipo.camposSet.add(k)
          }
        })
      }
    }

    // Convertendo o Map para a estrutura que o Frontend precisa
    const tiposDocumento = Array.from(tiposMap.values()).map(t => ({
      id: t.id,
      nome: t.nome,
      setorId: t.setorId, // AMARRADO AO SETOR!
      campos: Array.from(t.camposSet).map(c => ({
        nome: c,
        label: c as string,
        tipo: 'TEXTO' // Tudo que vem do CSV entra como Texto livre
      }))
    })).sort((a, b) => a.nome.localeCompare(b.nome))

    return NextResponse.json({
      clientes,
      setores,
      tiposDocumento,
    })
  } catch (error: any) {
    console.error("Erro na API Filtros:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}