'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState('')
  const [carregando, setCarregando] = useState(false)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setErro('')
    setCarregando(true)

    try {
      // Bate na porta do Porteiro (API)
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, senha })
      })

      const data = await res.json()

      // Se o porteiro barrou (senha errada, etc)
      if (!res.ok) {
        setErro(data.error || 'Erro ao fazer login')
        setCarregando(false)
        return
      }

      // Se deu tudo certo, a API já colou o crachá no navegador. Entra no sistema!
      router.push('/dashboard')
      router.refresh() 

    } catch (error) {
      setErro('Sem conexão com o servidor.')
      setCarregando(false)
    }
  }
  return (
    <div style={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center', background: '#f8fafc', fontFamily: 'Inter, system-ui, sans-serif' }}>
      
      <div style={{ width: '100%', maxWidth: 400, background: '#fff', padding: 40, borderRadius: 16, boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)' }}>
        
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>📦</div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1e293b', margin: 0 }}>ArquivoFísico</h1>
          <p style={{ fontSize: 14, color: '#64748b', marginTop: 4 }}>Faça login para acessar o sistema</p>
        </div>

        {erro && (
          <div style={{ background: '#fef2f2', color: '#dc2626', padding: 12, borderRadius: 8, fontSize: 14, marginBottom: 20, textAlign: 'center', border: '1px solid #fecaca' }}>
            {erro}
          </div>
        )}

        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          
          <div>
            <label style={{ display: 'block', fontSize: 14, fontWeight: 600, color: '#475569', marginBottom: 8 }}>E-mail</label>
            <input 
              type="email" 
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="exemplo@empresa.com.br"
              style={{ width: '100%', padding: '12px 16px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 15, outline: 'none', transition: 'border-color 0.2s', boxSizing: 'border-box' }}
              onFocus={(e) => e.target.style.borderColor = '#2563eb'}
              onBlur={(e) => e.target.style.borderColor = '#cbd5e1'}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 14, fontWeight: 600, color: '#475569', marginBottom: 8 }}>Senha</label>
            <input 
              type="password" 
              required
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              placeholder="••••••••"
              style={{ width: '100%', padding: '12px 16px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 15, outline: 'none', transition: 'border-color 0.2s', boxSizing: 'border-box' }}
              onFocus={(e) => e.target.style.borderColor = '#2563eb'}
              onBlur={(e) => e.target.style.borderColor = '#cbd5e1'}
            />
          </div>

          <button 
            type="submit" 
            disabled={carregando}
            style={{ width: '100%', padding: '14px', marginTop: 8, background: '#2563eb', color: '#fff', border: 'none', borderRadius: 8, fontSize: 16, fontWeight: 600, cursor: carregando ? 'not-allowed' : 'pointer', opacity: carregando ? 0.7 : 1, transition: 'background 0.2s' }}
            onMouseOver={(e) => { if (!carregando) e.currentTarget.style.background = '#1d4ed8' }}
            onMouseOut={(e) => { if (!carregando) e.currentTarget.style.background = '#2563eb' }}
          >
            {carregando ? 'Entrando...' : 'Entrar no Sistema'}
          </button>
        </form>

      </div>
    </div>
  )
}