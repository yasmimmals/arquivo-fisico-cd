import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST() {
  try {
    // 1. Busca todos os documentos no banco que ainda não estão amarrados a um Tipo Oficial
    const documentos = await prisma.documento.findMany({
      where: { tipoDocumentoId: null }
    })

    if (documentos.length === 0) {
      return NextResponse.json({ message: 'Nenhum documento sem tipo encontrado no banco. Já está tudo sincronizado!' })
    }

    // 2. Agrupa os documentos por nome e coleta todos os metadados (campos) únicos deles
    const mapaTipos = new Map<string, Set<string>>()

    documentos.forEach((doc: any) => {
      const nome = doc.nomeDocumento || 'Documento Geral'
      if (!mapaTipos.has(nome)) {
        mapaTipos.set(nome, new Set())
      }
      
      // Se tiver metadados (JSON), extrai as chaves
      if (doc.metadata && typeof doc.metadata === 'object') {
        Object.keys(doc.metadata).forEach(chave => {
          if (chave !== 'nome') mapaTipos.get(nome)!.add(chave)
        })
      }
    })

    let criados = 0

    // 3. Para cada documento agrupado, cria o Tipo de Documento no banco
    for (const [nomeDoc, camposSet] of Array.from(mapaTipos.entries())) {
      // Verifica se já existe para não duplicar
      let tipoExistente = await prisma.tipoDocumento.findFirst({ where: { nome: nomeDoc } })

      if (!tipoExistente) {
        // Converte as chaves do JSON para o formato de Campos da nova tela
        const arrayCampos = Array.from(camposSet).map(campoNome => ({
          nome: campoNome,
          label: campoNome.charAt(0).toUpperCase() + campoNome.slice(1).replace(/_/g, ' '),
          tipo: 'TEXTO', // Define como texto por padrão
          obrigatorio: false
        }))

        // Cria o Tipo Oficial corrigido para relações do Prisma
        tipoExistente = await prisma.tipoDocumento.create({
          data: {
            nome: nomeDoc,
            descricao: 'Importado automaticamente das caixas existentes',
            tempGuardaAnos: 5, 
            ativo: true,
            campos: {
              create: arrayCampos as any
            }
          }
        })
        criados++
      }

      // 4. Atualiza os documentos antigos para "nascerem" com este novo tipo vinculado
      await prisma.documento.updateMany({
        where: { nomeDocumento: nomeDoc, tipoDocumentoId: null },
        data: { tipoDocumentoId: tipoExistente.id }
      })
    }

    return NextResponse.json({ 
      sucesso: true, 
      message: `${criados} novos Tipos de Documentos foram importados das caixas antigas com sucesso!` 
    })
  } catch (erro: any) {
    return NextResponse.json({ error: erro.message }, { status: 500 })
  }
}