import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts'
import { createSummaryService } from '../service.ts'
import type { ExpenseByCategory, SummaryRepository } from '../types.ts'

function makeMockRepo(rows: ExpenseByCategory[]): SummaryRepository {
  return {
    fetchExpensesByCategory: (_userId, _start, _end) => Promise.resolve(rows),
  }
}

Deno.test('service: calcula pct correto para 3 categorias', async () => {
  const repo = makeMockRepo([
    { category: 'Alimentação', total: 1200, count: 10 },
    { category: 'Transporte',  total: 800,  count: 5  },
    { category: 'Lazer',       total: 400,  count: 3  },
  ])
  const service = createSummaryService(repo)
  const result = await service.getSummary({ userId: 'u1', month: '2026-05' })

  assertEquals(result.total_expense, 2400)
  assertEquals(result.by_category.find(c => c.category === 'Alimentação')!.pct, 50.0)
  assertEquals(result.by_category.find(c => c.category === 'Transporte')!.pct, 33.3)
  assertEquals(result.by_category.find(c => c.category === 'Lazer')!.pct, 16.7)
})

Deno.test('service: dateStart e dateEnd corretos para maio de 2026', async () => {
  let capturedStart = '', capturedEnd = ''
  const repo: SummaryRepository = {
    fetchExpensesByCategory: (_userId, start, end) => {
      capturedStart = start
      capturedEnd = end
      return Promise.resolve([])
    },
  }
  const service = createSummaryService(repo)
  await service.getSummary({ userId: 'u1', month: '2026-05' })

  assertEquals(capturedStart, '2026-05-01')
  assertEquals(capturedEnd, '2026-05-31')
})

Deno.test('service: dateEnd correto para fevereiro nao-bissexto (2025)', async () => {
  let capturedEnd = ''
  const repo: SummaryRepository = {
    fetchExpensesByCategory: (_userId, _start, end) => {
      capturedEnd = end
      return Promise.resolve([])
    },
  }
  await createSummaryService(repo).getSummary({ userId: 'u1', month: '2025-02' })
  assertEquals(capturedEnd, '2025-02-28')
})

Deno.test('service: dateEnd correto para fevereiro bissexto (2024)', async () => {
  let capturedEnd = ''
  const repo: SummaryRepository = {
    fetchExpensesByCategory: (_userId, _start, end) => {
      capturedEnd = end
      return Promise.resolve([])
    },
  }
  await createSummaryService(repo).getSummary({ userId: 'u1', month: '2024-02' })
  assertEquals(capturedEnd, '2024-02-29')
})

Deno.test('service: retorna total_expense=0 e by_category=[] sem NaN quando sem despesas', async () => {
  const service = createSummaryService(makeMockRepo([]))
  const result = await service.getSummary({ userId: 'u1', month: '2026-05' })

  assertEquals(result.month, '2026-05')
  assertEquals(result.total_expense, 0)
  assertEquals(result.by_category, [])
})
