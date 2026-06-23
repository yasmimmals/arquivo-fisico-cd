import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import nodemailer from 'nodemailer' // <-- Importando o nosso carteiro!

export async function GET() {
  const usuarios = await prisma.usuario.findMany({ orderBy: { criadoEm: 'desc' } })
  return NextResponse.json(usuarios)
}

export async function POST(request: NextRequest) {
  try {
    const { nome, email, senha, perfil } = await request.json()
    
    // Criptografa a senha para salvar no banco com segurança
    const hash = await bcrypt.hash(senha, 10)
    const usuario = await prisma.usuario.create({ data: { nome, email, senha: hash, perfil } })

    // ==========================================
    // ✉️ MÁGICA DO E-MAIL COMEÇA AQUI
    // ==========================================
    
    // 1. Configura o carteiro com as senhas da Vercel
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    })

    // 🔴 ATENÇÃO: Troque este link pelo link real do seu site na Vercel!
    const linkDoSistema = 'https://arquivo-fisico-cd-yas.vercel.app/'

    // 2. Monta o e-mail bonitão em HTML
    const mailOptions = {
      from: `"Sistema ArquivoFísico" <${process.env.EMAIL_USER}>`,
      to: email, // Manda para o e-mail que acabou de ser cadastrado
      subject: 'Bem-vindo! Suas credenciais de acesso',
      html: `
        <div style="font-family: Arial, sans-serif; color: #334155; padding: 20px; max-width: 600px; margin: 0 auto;">
          <div style="text-align: center; margin-bottom: 20px;">
            <h1 style="color: #1e293b; margin: 0;">📦 ArquivoFísico</h1>
          </div>
          
          <h2 style="color: #2563eb;">Olá, ${nome}!</h2>
          <p>Seu perfil foi criado com sucesso no nosso sistema de gestão de acervos.</p>
          <p>Aqui estão os seus dados para acessar a plataforma:</p>
          
          <div style="background: #f8fafc; padding: 20px; border-radius: 8px; border: 1px solid #e2e8f0; margin: 20px 0;">
            <p style="margin: 0; font-size: 16px;"><b>E-mail:</b> ${email}</p>
            <p style="margin: 10px 0 0 0; font-size: 16px;"><b>Senha:</b> ${senha}</p>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${linkDoSistema}" style="background: #2563eb; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px;">Acessar o Sistema</a>
          </div>
          
          <p style="font-size: 12px; color: #94a3b8; text-align: center; margin-top: 40px; border-top: 1px solid #e2e8f0; padding-top: 20px;">
            Por questões de segurança, recomendamos que você guarde esta senha em um local seguro e não a compartilhe com terceiros.
          </p>
        </div>
      `,
    }

    // 3. Dispara o e-mail!
    await transporter.sendMail(mailOptions)

    // ==========================================
    // FIM DA MÁGICA DO E-MAIL
    // ==========================================

    return NextResponse.json(usuario, { status: 201 })
  } catch (e: any) {
    if (e.code === 'P2002') return NextResponse.json({ error: 'Email já cadastrado.' }, { status: 400 })
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}