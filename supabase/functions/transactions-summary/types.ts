export interface TransactionRow {
  category: string | null
  amount: number
}

export interface ExpenseByCategory {
  category: string
  total: number
  count: number
}

export interface CategorySummary {
  category: string
  total: number
  count: number
  pct: number
}

export interface SummaryResult {
  month: string
  total_expense: number
  by_category: CategorySummary[]
}

export interface SummaryParams {
  userId: string
  month: string
}

export interface SummaryRepository {
  fetchExpensesByCategory(
    userId: string,
    dateStart: string,
    dateEnd: string,
  ): Promise<ExpenseByCategory[]>
}

export interface SummaryService {
  getSummary(params: SummaryParams): Promise<SummaryResult>
}
