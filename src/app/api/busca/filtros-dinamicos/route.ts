import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const clienteId    = searchParams.get('clienteId')
  const setorId      = searchParams.get('setorId')
  const tipoDocumento = searchParams.get('tipoDocumento')

  // 4. Campos dinâmicos do metadata
  if (tipoDocumento && setorId) {
    const docs = await prisma.documento.findMany({
      where: { setorId, nomeDocumento: tipoDocumento },
      select: { metadata: true },
      take: 50,
    })

    const chaves = new Set<string>()
    for (const doc of docs) {
      if (doc.metadata && typeof doc.metadata === 'object') {
        Object.keys(doc.metadata as object).forEach(k => chaves.add(k))
      }
    }

    const camposIgnorar = ['Etiqueta', 'Data do Documento', 'Caixa Cliente', 'Endereço', 'Caixa']

    const campos: Array<{ nome: string; label: string; valores: string[] }> = []
    for (const chave of chaves) {
      if (camposIgnorar.includes(chave)) continue
      const valores = new Set<string>()
      for (const doc of docs) {
        const meta = doc.metadata as Record<string, any>
        if (meta?.[chave] && meta[chave] !== 'null' && meta[chave] !== null) {
          valores.add(String(meta[chave]))
        }
      }
      campos.push({
        nome: chave,
        label: chave,
        valores: [...valores].sort().slice(0, 50),
      })
    }

    return NextResponse.json({ campos })
  }

  // 3. Tipos de documento do setor
  if (setorId && !tipoDocumento) {
    const docs = await prisma.documento.findMany({
      where: { setorId },
      select: { nomeDocumento: true },
      distinct: ['nomeDocumento'],
      orderBy: { nomeDocumento: 'asc' },
    })
    const tipos = docs.map((d: any) => d.nomeDocumento).filter(Boolean)
    return NextResponse.json({ tipos })
  }

  // 2. Setores do cliente
  if (clienteId && !setorId) {
    const setores = await prisma.setor.findMany({
      where: { clienteId },
      orderBy: { nome: 'asc' },
      select: { id: true, nome: true },
    })
    return NextResponse.json({ setores })
  }

  // 1. Clientes
  const clientes = await prisma.cliente.findMany({
    where: { ativo: true },
    orderBy: { nome: 'asc' },
    select: { id: true, nome: true },
  })
  return NextResponse.json({ clientes })
}