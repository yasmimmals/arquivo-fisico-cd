import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

export async function PUT(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  try {
    const params = await props.params
    const { nome, email, senha, perfil, ativo } = await request.json()
    
    const data: any = {}
    if (nome !== undefined) data.nome = nome
    if (email !== undefined) data.email = email
    if (perfil !== undefined) data.perfil = perfil
    if (ativo !== undefined) data.ativo = ativo
    if (senha) data.senha = await bcrypt.hash(senha, 10)
    
    const usuario = await prisma.usuario.update({ where: { id: params.id }, data })
    return NextResponse.json(usuario)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}