'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

interface ItemTemporalidade {
  id: string
  nomeDocumento: string
  dataInicial: string
  dataVencimento: string
  caixa: { etiqueta: string; cliente: { nome: string }; endereco: { enderecoCodigo: string } | null }
  tipoDocumento: { nome: string; tempGuardaAnos: number }
}

const NAV = [
  { icon: '📊', label: 'Dashboard', href: '/dashboard' },
  { icon: '🔍', label: 'Busca', href: '/' },
  { icon: '📦', label: 'Caixas', href: '/caixas' },
  { icon: '📬', label: 'Solicitações', href: '/solicitacoes' },
  { icon: '🗺️', label: 'Mapa do barracão', href: '/mapa' },
  { icon: '📋', label: 'Tipos de documento', href: '/tipos-documento' },
  { icon: '⏳', label: 'Temporalidade', href: '/temporalidade' },
  { icon: '⚙️', label: 'Administração', href: '/admin' },
]

export default function TemporalidadePage() {
  const router = useRouter()
  
  // Controles da tela
  const [abaAtiva, setAbaAtiva] = useState<'resumo' | 'vencidos' | 'aVencer' | 'regulares'>('resumo')
  const [pagina, setPagina] = useState(1)
  const [carregando, setCarregando] = useState(true)
  const [carregandoMais, setCarregandoMais] = useState(false)
  
  // Dados
  const [totais, setTotais] = useState({ vencidos: 0, aVencer: 0, regulares: 0 })
  const [itens, setItens] = useState<ItemTemporalidade[]>([])
  const [temMais, setTemMais] = useState(false)

  // Carrega os dados sempre que a aba ou a página mudar
  useEffect(() => {
    async function buscarDados() {
      if (pagina === 1) setCarregando(true)
      else setCarregandoMais(true)

      const res = await fetch(`/api/temporalidade?aba=${abaAtiva}&pagina=${pagina}`)
      const json = await res.json()
      
      setTotais(json.totais)
      setTemMais(json.temMais)
      
      if (pagina === 1) {
        setItens(json.itens) // Substitui a lista se for a aba nova
      } else {
        setItens(prev => [...prev, ...json.itens]) // Adiciona na lista se for carregar mais
      }
      
      setCarregando(false)
      setCarregandoMais(false)
    }
    buscarDados()
  }, [abaAtiva, pagina])

  function formatarData(dataISO: string) {
    return new Date(dataISO).toLocaleDateString('pt-BR', { timeZone: 'UTC' })
  }

  function abrirLista(aba: 'vencidos' | 'aVencer' | 'regulares') {
    setAbaAtiva(aba)
    setPagina(1) // Reseta para a página 1 ao trocar de aba
  }

  const CardDocumento = ({ item, cor, badgeBg, badgeText }: { item: ItemTemporalidade, cor: string, badgeBg: string, badgeText: string }) => (
    <div style={{ background: '#fff', border: `1px solid ${cor}40`, borderLeft: `4px solid ${cor}`, borderRadius: 8, padding: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.05)', marginBottom: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: '#1e293b' }}>📦 Caixa {item.caixa.etiqueta}</div>
        <span style={{ fontSize: 11, fontWeight: 700, color: cor, background: badgeBg, padding: '2px 8px', borderRadius: 12 }}>
          {badgeText}
        </span>
      </div>
      <div style={{ fontSize: 13, color: '#475569', marginBottom: 4 }}>🏢 {item.caixa.cliente.nome}</div>
      <div style={{ fontSize: 12, color: '#64748b', marginBottom: 12 }}>📄 {item.tipoDocumento.nome}</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, background: '#f8fafc', padding: 8, borderRadius: 6, border: '1px solid #f1f5f9' }}>
        <div>
          <div style={{ fontSize: 10, textTransform: 'uppercase', color: '#94a3b8', fontWeight: 600 }}>Início do Doc</div>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#334155' }}>{formatarData(item.dataInicial)}</div>
        </div>
        <div>
          <div style={{ fontSize: 10, textTransform: 'uppercase', color: '#94a3b8', fontWeight: 600 }}>Vencimento Legal</div>
          <div style={{ fontSize: 12, fontWeight: 700, color: cor }}>{formatarData(item.dataVencimento)}</div>
        </div>
      </div>
      {item.caixa.endereco && (
        <div style={{ marginTop: 10, fontSize: 11, color: '#2563eb', fontFamily: 'monospace' }}>📍 Local: {item.caixa.endereco.enderecoCodigo}</div>
      )}
    </div>
  )

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f8fafc', fontFamily: 'Inter, system-ui, sans-serif' }}>
      <aside style={{ width: 220, minWidth: 220, background: '#fff', borderRight: '1px solid #e5e7eb', display: 'flex', flexDirection: 'column', padding: '24px 0', minHeight: '100vh' }}>
        <div style={{ padding: '0 20px 24px', borderBottom: '1px solid #f3f4f6', marginBottom: 16 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#111827' }}>📦 ArquivoFísico</div>
          <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>Sistema de gestão</div>
        </div>
        {NAV.map(item => {
          const active = item.href === '/temporalidade'
          return (
            <button key={item.label} onClick={() => router.push(item.href)}
              style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 20px', fontSize: 14, fontWeight: active ? 600 : 400, color: active ? '#2563eb' : '#6b7280', background: active ? '#eff6ff' : 'transparent', borderLeft: active ? '3px solid #2563eb' : '3px solid transparent', cursor: 'pointer', border: 'none', width: '100%', textAlign: 'left' }}>
              {item.icon} {item.label}
            </button>
          )
        })}
      </aside>

      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
        <header style={{ background: '#fff', borderBottom: '1px solid #e5e7eb', padding: '16px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#111827' }}>Controle de Temporalidade</div>
            <div style={{ fontSize: 12, color: '#64748b' }}>Acompanhe o prazo legal dos documentos para descarte</div>
          </div>
          
          {abaAtiva !== 'resumo' && (
            <button onClick={() => setAbaAtiva('resumo')} style={{ padding: '8px 16px', background: '#f1f5f9', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600, color: '#475569' }}>
              ⬅ Voltar ao Resumo
            </button>
          )}
        </header>

        <div style={{ flex: 1, padding: '32px', overflowY: 'auto' }}>
          {carregando && pagina === 1 ? (
             <div style={{ textAlign: 'center', color: '#9ca3af', marginTop: 40 }}>Analisando datas do barracão...</div>
          ) : abaAtiva === 'resumo' ? (
            
            /* TELA 1: RESUMO (Botões Gigantes) */
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24, maxWidth: 1000, margin: '0 auto' }}>
              <div onClick={() => abrirLista('vencidos')} style={{ background: '#fef2f2', border: '2px solid #fecaca', borderRadius: 16, padding: 32, cursor: 'pointer', textAlign: 'center', transition: 'transform 0.2s' }} onMouseOver={e => e.currentTarget.style.transform = 'scale(1.02)'} onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'}>
                <div style={{ fontSize: 48 }}>🔴</div>
                <div style={{ fontSize: 16, color: '#dc2626', fontWeight: 700, marginTop: 16 }}>PRONTOS P/ EXPURGO</div>
                <div style={{ fontSize: 36, fontWeight: 800, color: '#991b1b', marginTop: 8 }}>{totais.vencidos}</div>
                <div style={{ fontSize: 13, color: '#f87171', marginTop: 4 }}>Clique para ver a lista</div>
              </div>

              <div onClick={() => abrirLista('aVencer')} style={{ background: '#fffbeb', border: '2px solid #fde68a', borderRadius: 16, padding: 32, cursor: 'pointer', textAlign: 'center', transition: 'transform 0.2s' }} onMouseOver={e => e.currentTarget.style.transform = 'scale(1.02)'} onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'}>
                <div style={{ fontSize: 48 }}>🟡</div>
                <div style={{ fontSize: 16, color: '#d97706', fontWeight: 700, marginTop: 16 }}>PRÓXIMOS 90 DIAS</div>
                <div style={{ fontSize: 36, fontWeight: 800, color: '#b45309', marginTop: 8 }}>{totais.aVencer}</div>
                <div style={{ fontSize: 13, color: '#fbbf24', marginTop: 4 }}>Clique para ver a lista</div>
              </div>

              <div onClick={() => abrirLista('regulares')} style={{ background: '#f0fdf4', border: '2px solid #bbf7d0', borderRadius: 16, padding: 32, cursor: 'pointer', textAlign: 'center', transition: 'transform 0.2s' }} onMouseOver={e => e.currentTarget.style.transform = 'scale(1.02)'} onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'}>
                <div style={{ fontSize: 48 }}>🟢</div>
                <div style={{ fontSize: 16, color: '#16a34a', fontWeight: 700, marginTop: 16 }}>NO PRAZO (REGULARES)</div>
                <div style={{ fontSize: 36, fontWeight: 800, color: '#15803d', marginTop: 8 }}>{totais.regulares}</div>
                <div style={{ fontSize: 13, color: '#4ade80', marginTop: 4 }}>Clique para ver a lista</div>
              </div>
            </div>

          ) : (
            
            /* TELA 2: LISTA DE DETALHES */
            <div style={{ maxWidth: 600, margin: '0 auto' }}>
              <div style={{ marginBottom: 24, fontSize: 20, fontWeight: 700, color: '#1e293b', borderBottom: '2px solid #e2e8f0', paddingBottom: 12 }}>
                {abaAtiva === 'vencidos' ? '🔴 Documentos Prontos para Expurgo' : abaAtiva === 'aVencer' ? '🟡 Documentos Vencendo em 90 dias' : '🟢 Documentos no Prazo Seguro'}
              </div>
              
              {itens.length === 0 ? (
                <div style={{ textAlign: 'center', color: '#94a3b8', padding: 40 }}>Nenhum documento encontrado nesta categoria.</div>
              ) : (
                itens.map(item => (
                  <CardDocumento 
                    key={item.id} 
                    item={item} 
                    cor={abaAtiva === 'vencidos' ? '#dc2626' : abaAtiva === 'aVencer' ? '#d97706' : '#16a34a'} 
                    badgeBg={abaAtiva === 'vencidos' ? '#fee2e2' : abaAtiva === 'aVencer' ? '#fef3c7' : '#dcfce7'} 
                    badgeText={abaAtiva === 'vencidos' ? 'VENCIDO' : abaAtiva === 'aVencer' ? 'A VENCER' : 'NO PRAZO'} 
                  />
                ))
              )}

              {/* Botão de Carregar Mais */}
              {temMais && (
                <button 
                  onClick={() => setPagina(p => p + 1)} 
                  disabled={carregandoMais}
                  style={{ width: '100%', padding: '16px', marginTop: 16, background: '#e2e8f0', color: '#334155', border: 'none', borderRadius: 8, fontSize: 16, fontWeight: 600, cursor: carregandoMais ? 'not-allowed' : 'pointer', transition: 'background 0.2s' }}
                  onMouseOver={e => { if (!carregandoMais) e.currentTarget.style.background = '#cbd5e1' }}
                  onMouseOut={e => { if (!carregandoMais) e.currentTarget.style.background = '#e2e8f0' }}
                >
                  {carregandoMais ? 'Carregando...' : '👇 Carregar mais documentos'}
                </button>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}