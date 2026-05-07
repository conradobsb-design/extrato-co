import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Anthropic from 'https://esm.sh/@anthropic-ai/sdk@0.27.0'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SYSTEM_PROMPT = `Você é um especialista em extratos bancários brasileiros. Analise o texto e extraia TODAS as transações.

Regras obrigatórias:
- amount NEGATIVO = débito/despesa/compra
- amount POSITIVO = crédito/receita/depósito
- Para extratos: "D" ou "Débito" = negativo; "C" ou "Crédito" = positivo
- Para faturas de cartão: TODAS as compras são negativas
- Parcelados: transaction_date = data original da compra
- Transações internacionais: usar sempre valor em R$
- IGNORAR: totais, encargos, IOF, juros, anuidade, tarifas bancárias, saldo

Categorias disponíveis: Alimentação, Transporte, Saúde, Assinaturas, Academia / Esporte, Educação, Moradia, Telefone, Lazer, Viagem, Compras, Investimentos, Transferências, Outros

Retorne SOMENTE JSON válido neste formato:
{
  "transactions": [
    {
      "description": "nome limpo da transação",
      "amount": -45.90,
      "transaction_date": "2024-01-15",
      "billing_month": null,
      "category": "Alimentação",
      "metadata": {}
    }
  ]
}`

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  try {
    const { text_data, user_id, file_name, import_type, source_type, bank } = await req.json()

    if (!text_data || !user_id) {
      return new Response(JSON.stringify({ error: 'text_data e user_id são obrigatórios' }), {
        status: 400, headers: { ...CORS, 'Content-Type': 'application/json' },
      })
    }

    // Verificar arquivo duplicado
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { db: { schema: 'app' } }
    )

    if (file_name) {
      const { data: existing } = await supabase
        .from('imported_files')
        .select('id')
        .eq('user_id', user_id)
        .eq('file_name', file_name)
        .single()

      if (existing) {
        return new Response(JSON.stringify({ error: 'Este arquivo já foi importado anteriormente.', duplicate: true }), {
          status: 409, headers: { ...CORS, 'Content-Type': 'application/json' },
        })
      }
    }

    // Chamar Claude
    const anthropic = new Anthropic({ apiKey: Deno.env.get('ANTHROPIC_API_KEY')! })

    const contextHint = import_type === 'credit_card'
      ? `\nEste é uma FATURA DE CARTÃO DE CRÉDITO do banco ${bank || 'desconhecido'}. Todas as compras são negativas.`
      : `\nEste é um EXTRATO BANCÁRIO do banco ${bank || 'desconhecido'}.`

    // Limpa o texto no servidor também (defesa em profundidade)
    const cleanText = text_data
      .replace(/[ \t]{2,}/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .slice(0, 48000) // ~12k tokens — deixa margem para o JSON de resposta

    const message = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 8192, // era 4096 — extratos grandes truncavam o JSON no meio
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: `${contextHint}\n\nTexto do documento:\n\n${cleanText}`,
        },
      ],
    })

    const raw = message.content[0].type === 'text' ? message.content[0].text : ''
    const jsonMatch = raw.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('Claude não retornou JSON válido')

    const { transactions } = JSON.parse(jsonMatch[0])
    if (!Array.isArray(transactions)) throw new Error('Formato inválido')

    // Inserir em batches de 50 (evita timeout do Supabase em extratos grandes)
    const rows = transactions.map(t => ({
      user_id,
      description: t.description,
      amount: t.amount,
      transaction_date: t.transaction_date,
      billing_month: t.billing_month ?? null,
      category: t.category || 'Outros',
      bank: bank || null,
      source_type: source_type || 'bank',
      metadata: t.metadata || {},
    }))

    const BATCH = 50
    for (let i = 0; i < rows.length; i += BATCH) {
      const { error: insertError } = await supabase.from('transactions').insert(rows.slice(i, i + BATCH))
      if (insertError) throw insertError
    }

    // Registrar arquivo importado
    if (file_name) {
      await supabase.from('imported_files').insert({
        user_id,
        file_name,
        transaction_count: rows.length,
      })
    }

    return new Response(JSON.stringify({ count: rows.length, ok: true }), {
      status: 200, headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('parse-statement error:', err)
    return new Response(JSON.stringify({ error: err.message || 'Erro interno' }), {
      status: 500, headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  }
})
