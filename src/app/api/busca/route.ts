import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)

  const clienteId   = searchParams.get('clienteId') || undefined
  const setorId     = searchParams.get('setorId') || undefined
  const tipoDoc     = searchParams.get('tipoDocumento') || undefined
  const dataInicial = searchParams.get('dataInicial') || undefined
  const dataFinal   = searchParams.get('dataFinal') || undefined
  const pagina      = parseInt(searchParams.get('pagina') || '1')
  const porPagina   = 20

  // Monta filtros de metadata dinamicamente
  const metaFiltros: Record<string, string> = {}
  for (const [key, value] of searchParams.entries()) {
    if (key.startsWith('meta_') && value) {
      metaFiltros[key.replace('meta_', '')] = value
    }
  }

  const where: any = {}
  if (setorId) where.setorId = setorId
  if (tipoDoc) where.nomeDocumento = { contains: tipoDoc, mode: 'insensitive' }
  if (clienteId) where.caixa = { clienteId }

  if (dataInicial || dataFinal) {
    where.dataInicial = {}
    if (dataInicial) where.dataInicial.gte = new Date(dataInicial)
    if (dataFinal) where.dataInicial.lte = new Date(dataFinal)
  }

  // Filtros de metadata via SQL raw quando necessário
  const metaConditions = Object.entries(metaFiltros)
  
  try {
    let documentos: any[]
    let total: number

    if (metaConditions.length > 0) {
      // Busca com filtro de metadata
      const allDocs = await prisma.documento.findMany({
        where,
        include: {
          caixa: { include: { endereco: true, cliente: true } },
          setor: true,
        },
        orderBy: { dataInicial: 'desc' },
      })

      // Filtra no JS pelos campos do metadata
      const filtered = allDocs.filter((doc: any) => {
        const meta = doc.metadata as Record<string, any>
        return metaConditions.every(([k, v]) => {
          const val = meta?.[k]
          return val && String(val).toLowerCase().includes(v.toLowerCase())
        })
      })

      total = filtered.length
      documentos = filtered.slice((pagina - 1) * porPagina, pagina * porPagina)
    } else {
      const [t, d] = await Promise.all([
        prisma.documento.count({ where }),
        prisma.documento.findMany({
          where,
          include: {
            caixa: { include: { endereco: true, cliente: true } },
            setor: true,
          },
          orderBy: { dataInicial: 'desc' },
          skip: (pagina - 1) * porPagina,
          take: porPagina,
        }),
      ])
      total = t
      documentos = d
    }

    return NextResponse.json({
      total,
      pagina,
      totalPaginas: Math.ceil(total / porPagina),
      documentos,
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}