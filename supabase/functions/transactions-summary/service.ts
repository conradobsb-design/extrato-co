import type { CategorySummary, SummaryParams, SummaryRepository, SummaryResult, SummaryService } from './types.ts'

export function createSummaryService(repo: SummaryRepository): SummaryService {
  return {
    async getSummary({ userId, month }: SummaryParams): Promise<SummaryResult> {
      const [year, mon] = month.split('-').map(Number)
      const dateStart = `${month}-01`
      // Dia 0 do mês seguinte = último dia do mês atual (trata bissexto automaticamente)
      const dateEnd = new Date(year, mon, 0).toISOString().slice(0, 10)

      const rows = await repo.fetchExpensesByCategory(userId, dateStart, dateEnd)

      const total_expense = parseFloat(rows.reduce((sum, r) => sum + r.total, 0).toFixed(2))

      const by_category: CategorySummary[] = rows.map(r => ({
        category: r.category,
        total: r.total,
        count: r.count,
        pct: total_expense === 0
          ? 0
          : parseFloat(((r.total / total_expense) * 100).toFixed(1)),
      }))

      return { month, total_expense, by_category }
    },
  }
}
