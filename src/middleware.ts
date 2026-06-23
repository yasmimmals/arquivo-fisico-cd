import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { jwtVerify } from 'jose'

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'chave-secreta-magalu-123')

// O Segurança que vigia as rotas
export async function middleware(request: NextRequest) {
  // Olha no bolso do usuário para ver se tem o crachá
  const token = request.cookies.get('arquivo_token')?.value
  const isLoginPage = request.nextUrl.pathname === '/login'

  // Se NÃO tem crachá e está tentando acessar o sistema, chuta pro login
  if (!token && !isLoginPage) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Se TEM crachá, vamos conferir se é falso ou se expirou
  if (token) {
    try {
      await jwtVerify(token, JWT_SECRET) // Se não der erro, o crachá é verdadeiro!
      
      // Se ele já está logado e tenta ir pra tela de login de novo, manda ele pro painel
      if (isLoginPage) {
        return NextResponse.redirect(new URL('/dashboard', request.url))
      }
    } catch (error) {
      // Crachá falso ou expirado (passou das 8h). Apaga o crachá e manda pro login!
      const response = NextResponse.redirect(new URL('/login', request.url))
      response.cookies.delete('arquivo_token')
      return response
    }
  }

  return NextResponse.next() // Pode passar!
}

// Configura QUAIS páginas o segurança deve vigiar
export const config = {
  matcher: [
    // Ele vai vigiar o site inteiro, EXCETO a própria porta da API de login e arquivos de imagem
    '/((?!api/login|_next/static|_next/image|favicon.ico).*)',
  ],
}