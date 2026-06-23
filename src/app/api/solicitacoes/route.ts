import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status') || undefined
  const pagina = parseInt(searchParams.get('pagina') || '1')
  const porPagina = 20

  const where: any = {}
  if (status) where.status = status

  const [total, solicitacoes] = await Promise.all([
    prisma.solicitacao.count({ where }),
    prisma.solicitacao.findMany({
      where,
      include: {
        caixa: { include: { cliente: true, endereco: true } },
        usuario: { select: { id: true, nome: true, email: true } },
      },
      orderBy: { criadoEm: 'desc' },
      skip: (pagina - 1) * porPagina,
      take: porPagina,
    }),
  ])

  return NextResponse.json({ total, pagina, totalPaginas: Math.ceil(total / porPagina), solicitacoes })
}

export async function POST(request: NextRequest) {
  try {
    // Adicionado o nomeSolicitante aqui
    const { caixaId, usuarioId, nomeSolicitante, tipo, motivo, localEntrega } = await request.json()
    const prazoHoras = tipo === 'URGENTE' ? 4 : 24

    const solicitacao = await prisma.solicitacao.create({
      data: { 
        caixaId, 
        usuarioId: usuarioId || null, // Permite ser null
        // nomeSolicitante: nomeSolicitante || null, // Desativado pois não existe no banco
        tipo,
        motivo, 
        localEntrega, 
        prazoHoras, 
        status: 'PENDENTE' 
      },
      include: {
        caixa: { include: { cliente: true, endereco: true } },
        usuario: { select: { id: true, nome: true, email: true } },
      },
    })

    return NextResponse.json(solicitacao, { status: 201 })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}