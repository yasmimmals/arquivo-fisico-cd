import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function PUT(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  try {
    const params = await props.params
    const { etiqueta, clienteId, enderecoCodigo, observacao, status } = await request.json()

    let enderecoId: string | undefined | null = undefined
    if (enderecoCodigo !== undefined) {
      if (!enderecoCodigo) {
        enderecoId = null
      } else {
        const match = enderecoCodigo.match(/^(\d+)([A-Z]+)(\d{2})(\d{2})(\d{2})$/)
        if (!match) return NextResponse.json({ error: 'Endereço inválido. Use o formato 10A010101' }, { status: 400 })

        const endereco = await prisma.endereco.upsert({
          where: { enderecoCodigo },
          update: {},
          create: {
            barracão: parseInt(match[1]),
            corredor: match[2],
            prateleira: parseInt(match[3]),
            andar: parseInt(match[4]),
            posicao: parseInt(match[5]),
            enderecoCodigo,
          },
        })
        enderecoId = endereco.id
      }
    }

    const data: any = {}
    if (etiqueta)   data.etiqueta = etiqueta
    if (clienteId)  data.clienteId = clienteId
    if (observacao !== undefined) data.observacao = observacao
    if (status)     data.status = status
    if (enderecoId !== undefined) data.enderecoId = enderecoId

    const caixa = await prisma.caixa.update({ where: { id: params.id }, data })
    return NextResponse.json(caixa)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params
  await prisma.caixa.delete({ where: { id: params.id } })
  return NextResponse.json({ ok: true })
}