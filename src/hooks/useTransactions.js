import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { classifyTransaction } from '../utils/categories'

export function useTransactions(userId, month) {
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(false)

  const fetch = useCallback(async () => {
    if (!userId || !month) return
    setLoading(true)
    const [year, m] = month.split('-')
    const start = `${year}-${m}-01`
    const end = new Date(parseInt(year), parseInt(m), 0).toISOString().slice(0, 10)

    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', userId)
      .gte('transaction_date', start)
      .lte('transaction_date', end)
      .order('transaction_date', { ascending: false })

    if (!error) setTransactions(data || [])
    setLoading(false)
  }, [userId, month])

  useEffect(() => { fetch() }, [fetch])

  const summary = transactions.reduce(
    (acc, t) => {
      const type = classifyTransaction(t)
      if (type === 'income') acc.income += t.amount
      else if (type === 'expense') acc.expense += Math.abs(t.amount)
      else if (type === 'savings_in') acc.savings += t.amount
      else if (type === 'savings_out') acc.savings -= Math.abs(t.amount)
      return acc
    },
    { income: 0, expense: 0, savings: 0 }
  )

  summary.balance = summary.income - summary.expense

  return { transactions, loading, summary, refetch: fetch }
}
