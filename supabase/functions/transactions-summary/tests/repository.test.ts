import { assertEquals, assertRejects } from 'https://deno.land/std@0.224.0/assert/mod.ts'
import { createSummaryRepository } from '../repository.ts'
import type { SupabaseClientLike } from '../repository.ts'
import type { TransactionRow } from '../types.ts'

function makeMockClient(
  rows: TransactionRow[],
  error?: { message: string },
): SupabaseClientLike {
  const result = { data: error ? null : rows, error: error ?? null }
  const chain = {
    select: () => chain,
    eq:     () => chain,
    lt:     () => chain,
    gte:    () => chain,
    lte:    () => chain,
    not:    () => chain,
    then:   (resolve: (v: typeof result) => void) => resolve(result),
  }
  return { from: () => chain }
}

Deno.test('repository: agrupa corretamente por categoria', async () => {
  const rows: TransactionRow[] = [
    { category: 'Alimentação', amount: -120.00 },
    { category: 'Alimentação', amount: -80.00 },
    { category: 'Transporte',  amount: -50.00 },
  ]
  const repo = createSummaryRepository(makeMockClient(rows))
  const result = await repo.fetchExpensesByCategory('user-1', '2026-05-01', '2026-05-31')

  assertEquals(result.length, 2)

  const alimentacao = result.find(r => r.category === 'Alimentação')!
  assertEquals(alimentacao.total, 200.00)
  assertEquals(alimentacao.count, 2)

  const transporte = result.find(r => r.category === 'Transporte')!
  assertEquals(transporte.total, 50.00)
  assertEquals(transporte.count, 1)
})

Deno.test('repository: substitui category null por "Outros"', async () => {
  const rows: TransactionRow[] = [
    { category: null, amount: -30.00 },
    { category: null, amount: -20.00 },
  ]
  const repo = createSummaryRepository(makeMockClient(rows))
  const result = await repo.fetchExpensesByCategory('user-1', '2026-05-01', '2026-05-31')

  assertEquals(result.length, 1)
  assertEquals(result[0].category, 'Outros')
  assertEquals(result[0].total, 50.00)
  assertEquals(result[0].count, 2)
})

Deno.test('repository: retorna [] sem erro quando banco retorna vazio', async () => {
  const repo = createSummaryRepository(makeMockClient([]))
  const result = await repo.fetchExpensesByCategory('user-1', '2026-05-01', '2026-05-31')
  assertEquals(result, [])
})

Deno.test('repository: lança erro quando Supabase retorna error', async () => {
  const repo = createSummaryRepository(makeMockClient([], { message: 'DB connection failed' }))
  await assertRejects(
    () => repo.fetchExpensesByCategory('user-1', '2026-05-01', '2026-05-31'),
    Error,
    'DB connection failed',
  )
})
