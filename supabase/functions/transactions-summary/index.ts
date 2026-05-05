import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { CORS } from '../_shared/cors.ts'
import { createSummaryRepository } from './repository.ts'
import { createSummaryService } from './service.ts'

const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/

function currentMonth(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

function extractUserId(authHeader: string): string | null {
  try {
    const token = authHeader.replace('Bearer ', '')
    const payload = JSON.parse(atob(token.split('.')[1]))
    return payload.sub ?? null
  } catch {
    return null
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  if (req.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405, headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  }

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'Missing Authorization header' }), {
      status: 401, headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  }

  const userId = extractUserId(authHeader)
  if (!userId) {
    return new Response(JSON.stringify({ error: 'Invalid token' }), {
      status: 401, headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  }

  const url = new URL(req.url)
  const monthParam = url.searchParams.get('month') ?? currentMonth()

  if (!MONTH_RE.test(monthParam)) {
    return new Response(JSON.stringify({ error: 'Invalid month format. Use YYYY-MM' }), {
      status: 400, headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  }

  try {
    const client = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { db: { schema: 'app' } },
    )

    const repo = createSummaryRepository(client)
    const service = createSummaryService(repo)
    const result = await service.getSummary({ userId, month: monthParam })

    return new Response(JSON.stringify(result), {
      status: 200, headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error'
    return new Response(JSON.stringify({ error: message }), {
      status: 500, headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  }
})
