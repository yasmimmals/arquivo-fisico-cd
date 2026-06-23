import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function PUT(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  try {
    const params = await props.params
    const { nome, descricao, tempGuardaAnos, ativo, campos } = await request.json()

    // Atualiza o tipo
    const tipo = await prisma.tipoDocumento.update({
      where: { id: params.id },
      data: {
        ...(nome && { nome }),
        ...(descricao !== undefined && { descricao }),
        ...(tempGuardaAnos !== undefined && { tempGuardaAnos: parseInt(tempGuardaAnos) }),
        ...(ativo !== undefined && { ativo }),
      },
    })

    // Se campos foram enviados, recria todos
    if (campos) {
      await prisma.campoTipoDocumento.deleteMany({ where: { tipoDocumentoId: params.id } })
      await prisma.campoTipoDocumento.createMany({
        data: campos.map((c: any, i: number) => ({
          tipoDocumentoId: params.id,
          nome: c.nome,
          label: c.label,
          tipo: c.tipo,
          obrigatorio: c.obrigatorio || false,
          ordem: i,
          opcoes: c.opcoes || null,
        })),
      })
    }

    return NextResponse.json(tipo)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}