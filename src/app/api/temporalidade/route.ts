import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const aba = searchParams.get('aba') || 'resumo'
    const pagina = parseInt(searchParams.get('pagina') || '1')
    const itensPorPagina = 100

    const documentos = await prisma.documento.findMany({
      where: {
        dataInicial: { not: null },
        tipoDocumento: { isNot: null }
      },
      include: {
        caixa: { include: { cliente: true, endereco: true } },
        tipoDocumento: true
      }
    })

    const hoje = new Date()
    const noventaDias = new Date()
    noventaDias.setDate(hoje.getDate() + 90)

    const vencidos: any[] = []
    const aVencer: any[] = []
    const regulares: any[] = []

    documentos.forEach((doc: any) => {
      if (!doc.dataInicial || !doc.tipoDocumento) return

      const dataVencimento = new Date(doc.dataInicial)
      dataVencimento.setFullYear(dataVencimento.getFullYear() + doc.tipoDocumento.tempGuardaAnos)

      const item = { ...doc, dataVencimento }

      if (dataVencimento < hoje) {
        vencidos.push(item)
      } else if (dataVencimento <= noventaDias) {
        aVencer.push(item)
      } else {
        regulares.push(item)
      }
    })

    vencidos.sort((a, b) => a.dataVencimento - b.dataVencimento)
    aVencer.sort((a, b) => a.dataVencimento - b.dataVencimento)
    regulares.sort((a, b) => a.dataVencimento - b.dataVencimento)

    const totais = {
      vencidos: vencidos.length,
      aVencer: aVencer.length,
      regulares: regulares.length
    }

    // Descobre qual lista o usuário clicou
    let listaDesejada: any[] = []
    if (aba === 'vencidos') listaDesejada = vencidos
    if (aba === 'aVencer') listaDesejada = aVencer
    if (aba === 'regulares') listaDesejada = regulares

    // Faz o corte da página exata
    const inicio = (pagina - 1) * itensPorPagina
    const fim = inicio + itensPorPagina
    const itensPaginados = listaDesejada.slice(inicio, fim)

    return NextResponse.json({ 
      totais,
      itens: itensPaginados,
      temMais: fim < listaDesejada.length // Avisa se precisa do botão "Carregar mais"
    })
  } catch (erro: any) {
    return NextResponse.json({ error: erro.message }, { status: 500 })
  }
}