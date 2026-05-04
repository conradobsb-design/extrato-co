import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Anthropic from 'https://esm.sh/@anthropic-ai/sdk@0.27.0'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function buildSystemPrompt(ctx: Record<string, unknown>) {
  const formatBRL = (v: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)

  const income = typeof ctx.income === 'number' ? ctx.income : 0
  const expense = typeof ctx.expense === 'number' ? ctx.expense : 0
  const balance = typeof ctx.balance === 'number' ? ctx.balance : 0
  const savings = typeof ctx.savings === 'number' ? ctx.savings : 0

  const topCats = Array.isArray(ctx.topCategories)
    ? (ctx.topCategories as [string, number][])
        .map(([cat, val]) => `  • ${cat}: ${formatBRL(val)}`)
        .join('\n')
    : 'Sem dados disponíveis'

  const hasData = income > 0 || expense > 0

  return `Você é Clara, consultora financeira pessoal. Tom: direto, acolhedor, sem jargão financeiro. Celebre conquistas, seja honesta com problemas, nunca alarmista. Respostas curtas e práticas (máx 3 parágrafos).

## Dados financeiros do usuário — ${ctx.month}
${
  hasData
    ? `- Receitas: ${formatBRL(income)}
- Despesas: ${formatBRL(expense)}
- Saldo: ${formatBRL(balance)}
- Investimentos: ${formatBRL(savings)}
- Metas ativas: ${ctx.goalsCount ?? 0}

Top categorias de gasto:
${topCats}`
    : `Ainda não há transações importadas para o período atual.
Sugira ao usuário importar um extrato ou fatura para começar a análise.
Use dados de tendências gerais ou faça perguntas para entender a situação financeira.`
}

Regras:
- Quando dados estiverem zerados, ofereça análise com o que tem ou faça perguntas abertas — NUNCA diga "não tenho dados suficientes" sem antes tentar ajudar.
- Use emojis com moderação.
- Valores sempre em R$.
- Responda sempre em português brasileiro.`
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  try {
    const { message, user_id, context } = await req.json()
    if (!message || !user_id) {
      return new Response(JSON.stringify({ error: 'message e user_id são obrigatórios' }), {
        status: 400, headers: { ...CORS, 'Content-Type': 'application/json' },
      })
    }

    const anthropic = new Anthropic({ apiKey: Deno.env.get('ANTHROPIC_API_KEY')! })

    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 600,
      system: buildSystemPrompt(context || {}),
      messages: [{ role: 'user', content: message }],
    })

    const reply = response.content[0].type === 'text' ? response.content[0].text : 'Desculpe, não consegui processar sua pergunta.'

    return new Response(JSON.stringify({ reply }), {
      status: 200, headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('ai-chat error:', err)
    return new Response(JSON.stringify({ error: err.message || 'Erro interno' }), {
      status: 500, headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  }
})
