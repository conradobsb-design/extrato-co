import type { ExpenseByCategory, SummaryRepository, TransactionRow } from './types.ts'

const INVESTMENT_CATS = ['Investimentos', 'Poupança', 'CDB', 'Tesouro', 'Fundo']
const INVESTMENT_FILTER = `(${INVESTMENT_CATS.map(c => `"${c}"`).join(',')})`

// Interface mínima do query builder do Supabase — permite mockar nos testes
interface QueryBuilder {
  select(cols: string): QueryBuilder
  eq(col: string, val: string): QueryBuilder
  lt(col: string, val: number): QueryBuilder
  gte(col: string, val: string): QueryBuilder
  lte(col: string, val: string): QueryBuilder
  not(col: string, op: string, val: string): QueryBuilder
  then(resolve: (result: { data: TransactionRow[] | null; error: { message: string } | null }) => void): void
}

export interface SupabaseClientLike {
  from(table: string): QueryBuilder
}

export function createSummaryRepository(client: SupabaseClientLike): SummaryRepository {
  return {
    async fetchExpensesByCategory(userId, dateStart, dateEnd) {
      const { data, error } = await new Promise<{
        data: TransactionRow[] | null
        error: { message: string } | null
      }>((resolve) => {
        client
          .from('transactions')
          .select('category, amount')
          .eq('user_id', userId)
          .lt('amount', 0)
          .gte('transaction_date', dateStart)
          .lte('transaction_date', dateEnd)
          .not('category', 'in', INVESTMENT_FILTER)
          .then(resolve)
      })

      if (error) throw new Error(error.message)

      const rows = data ?? []
      const map = new Map<string, ExpenseByCategory>()

      for (const row of rows) {
        const cat = row.category ?? 'Outros'
        const existing = map.get(cat)
        if (existing) {
          existing.total = parseFloat((existing.total + Math.abs(row.amount)).toFixed(2))
          existing.count += 1
        } else {
          map.set(cat, { category: cat, total: Math.abs(row.amount), count: 1 })
        }
      }

      return Array.from(map.values()).sort((a, b) => b.total - a.total)
    },
  }
}
