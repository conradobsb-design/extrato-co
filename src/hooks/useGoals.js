import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'

export function useGoals(userId) {
  const [goals, setGoals] = useState([])
  const [loading, setLoading] = useState(false)

  const fetch = useCallback(async () => {
    if (!userId) return
    setLoading(true)
    const { data, error } = await supabase
      .from('goals')
      .select('*')
      .eq('user_id', userId)
      .neq('status', 'archived')
      .order('created_at', { ascending: false })

    if (!error) setGoals(data || [])
    setLoading(false)
  }, [userId])

  useEffect(() => { fetch() }, [fetch])

  const createGoal = async (goal) => {
    const { error } = await supabase.from('goals').insert({ ...goal, user_id: userId })
    if (!error) fetch()
    return { error }
  }

  const updateGoal = async (id, updates) => {
    const { error } = await supabase.from('goals').update(updates).eq('id', id)
    if (!error) fetch()
    return { error }
  }

  const archiveGoal = async (id) => updateGoal(id, { status: 'archived' })

  return { goals, loading, refetch: fetch, createGoal, updateGoal, archiveGoal }
}
