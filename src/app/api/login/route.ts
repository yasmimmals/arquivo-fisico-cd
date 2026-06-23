import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { SignJWT } from 'jose'

// Essa é a chave mestre para forjar os crachás (protegida pela Vercel depois)
const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'chave-secreta-magalu-123')

export async function POST(request: NextRequest) {
  try {
    const { email, senha } = await request.json()

    // 1. Busca o usuário no banco de dados
    const usuario = await prisma.usuario.findUnique({ where: { email } })
    if (!usuario) {
      return NextResponse.json({ error: 'Usuário não encontrado.' }, { status: 401 })
    }

    // 2. Verifica se a senha está correta
    const senhaCorreta = await bcrypt.compare(senha, usuario.senha)
    if (!senhaCorreta) {
      return NextResponse.json({ error: 'Senha incorreta.' }, { status: 401 })
    }

    // 3. Verifica se o usuário não foi desativado pelo administrador
    if (usuario.ativo === false) {
      return NextResponse.json({ error: 'Seu acesso foi desativado.' }, { status: 401 })
    }

    // 4. Cria o "Crachá" (Token JWT) válido por 8 horas
    const token = await new SignJWT({ id: usuario.id, email: usuario.email, perfil: usuario.perfil })
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime('8h')
      .sign(JWT_SECRET)

    // 5. Guarda o crachá no bolso do navegador (Cookies)
    const response = NextResponse.json({ sucesso: true })
    response.cookies.set('arquivo_token', token, {
      httpOnly: true, // Protege contra hackers roubarem via script
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 8, // 8 horas em segundos
      path: '/',
    })

    return response
  } catch (e: any) {
    return NextResponse.json({ error: 'Erro interno no servidor.' }, { status: 500 })
  }
}