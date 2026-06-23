import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const agora = new Date()
  const inicioMes = new Date(agora.getFullYear(), agora.getMonth(), 1)
  const fimMes = new Date(agora.getFullYear(), agora.getMonth() + 1, 0)

  const [
    totalCaixas,
    caixasAtivas,
    caixasRetiradas,
    totalDocumentos,
    totalSolicitacoes,
    solicitacoesPendentes,
    solicitacoesUrgentes,
    caixasPorCliente,
    solicitacoesPorStatus,
    caixasProximasExpurgo,
    ultimasSolicitacoes,
    ocupacaoPorCorredor,
  ] = await Promise.all([
    prisma.caixa.count(),
    prisma.caixa.count({ where: { status: 'ATIVA' } }),
    prisma.caixa.count({ where: { status: 'RETIRADA' } }),
    prisma.documento.count(),
    prisma.solicitacao.count(),
    prisma.solicitacao.count({ where: { status: 'PENDENTE' } }),
    prisma.solicitacao.count({ where: { tipo: 'URGENTE', status: { notIn: ['ENTREGUE', 'DEVOLVIDA', 'CANCELADA'] } } }),

    // Caixas por cliente (top 6)
    prisma.caixa.groupBy({
      by: ['clienteId'],
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 6,
    }),

    // Solicitações por status
    prisma.solicitacao.groupBy({
      by: ['status'],
      _count: { id: true },
    }),

    // Documentos próximos do expurgo (fim de guarda nos próximos 90 dias)
    prisma.documento.count({
      where: {
        dataFimGuarda: {
          gte: agora,
          lte: new Date(agora.getTime() + 90 * 24 * 60 * 60 * 1000),
        },
      },
    }),

    // Últimas 5 solicitações
    prisma.solicitacao.findMany({
      take: 5,
      orderBy: { criadoEm: 'desc' },
      include: {
        caixa: { include: { cliente: true } },
        usuario: { select: { nome: true } },
      },
    }),

    // Ocupação por corredor
    prisma.endereco.groupBy({
      by: ['corredor'],
      _count: { id: true },
    }),
  ])

  // Buscar nomes dos clientes
  const clienteIds = caixasPorCliente.map((c: any) => c.clienteId)
  const clientes = await prisma.cliente.findMany({
    where: { id: { in: clienteIds } },
    select: { id: true, nome: true },
  })
  const clienteMap = Object.fromEntries(clientes.map(c => [c.id, c.nome]))

  // Ocupação real por corredor (com caixa)
  const enderecosOcupados = await prisma.endereco.groupBy({
    by: ['corredor'],
    where: { caixa: { isNot: null } },
    _count: { id: true },
  })
  const ocupadosMap = Object.fromEntries(enderecosOcupados.map(e => [e.corredor, e._count.id]))

  const ocupacao = ocupacaoPorCorredor.map(e => ({
    corredor: `Corredor ${e.corredor}`,
    total: e._count.id,
    ocupados: ocupadosMap[e.corredor] || 0,
    livres: e._count.id - (ocupadosMap[e.corredor] || 0),
    pct: Math.round(((ocupadosMap[e.corredor] || 0) / e._count.id) * 100),
  }))

  return NextResponse.json({
    resumo: { totalCaixas, caixasAtivas, caixasRetiradas, totalDocumentos, totalSolicitacoes, solicitacoesPendentes, solicitacoesUrgentes, caixasProximasExpurgo },
    caixasPorCliente: caixasPorCliente.map(c => ({ nome: clienteMap[c.clienteId] || 'Desconhecido', total: c._count.id })),
    solicitacoesPorStatus: solicitacoesPorStatus.map(s => ({ status: s.status, total: s._count.id })),
    ocupacao,
    ultimasSolicitacoes,
  })
}