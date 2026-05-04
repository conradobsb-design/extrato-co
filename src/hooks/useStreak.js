import { useEffect, useState } from 'react'

export function useStreak(userId) {
  const [streak, setStreak] = useState(0)

  useEffect(() => {
    if (!userId) return
    const key = `streak_${userId}`
    const stored = localStorage.getItem(key)
    if (!stored) {
      localStorage.setItem(key, JSON.stringify({ count: 1, last: new Date().toDateString() }))
      setStreak(1)
      return
    }
    const { count, last } = JSON.parse(stored)
    const today = new Date().toDateString()
    const yesterday = new Date(Date.now() - 86400000).toDateString()

    if (last === today) {
      setStreak(count)
    } else if (last === yesterday) {
      const next = count + 1
      localStorage.setItem(key, JSON.stringify({ count: next, last: today }))
      setStreak(next)
    } else {
      localStorage.setItem(key, JSON.stringify({ count: 1, last: today }))
      setStreak(1)
    }
  }, [userId])

  return streak
}
