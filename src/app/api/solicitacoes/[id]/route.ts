import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function PUT(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  try {
    const params = await props.params
    const { status, observacao } = await request.json()

    const solicitacao = await prisma.solicitacao.update({
      where: { id: params.id },
      data: {
        status,
        ...(status === 'ENTREGUE' || status === 'DEVOLVIDA' ? { atendidoEm: new Date() } : {}),
      },
    })

    if (observacao) {
      await prisma.entrega.create({
        data: { solicitacaoId: params.id, status, observacao },
      })
    }

    return NextResponse.json(solicitacao)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}