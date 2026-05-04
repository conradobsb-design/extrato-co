import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, Filter, Trash2, ChevronDown } from 'lucide-react'
import { formatCurrency, formatDate, CATEGORY_EMOJI, CATEGORY_COLORS } from '../utils/categories'
import { supabase } from '../lib/supabase'

export default function TransactionList({ transactions, onDelete }) {
  const [search, setSearch] = useState('')
  const [catFilter, setCatFilter] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [deleting, setDeleting] = useState(null)

  const categories = [...new Set(transactions.map(t => t.category).filter(Boolean))].sort()

  const filtered = transactions.filter(t => {
    const matchSearch = !search || t.description?.toLowerCase().includes(search.toLowerCase())
    const matchCat = !catFilter || t.category === catFilter
    return matchSearch && matchCat
  })

  const handleDelete = async (id) => {
    setDeleting(id)
    await supabase.from('transactions').delete().eq('id', id)
    onDelete?.()
    setDeleting(null)
  }

  return (
    <div className="space-y-3">
      {/* Search & Filter bar */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 w-4 h-4 text-white/30" />
          <input
            placeholder="Buscar transação..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="input pl-9 py-2.5 text-sm"
          />
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`btn-ghost px-3 gap-1.5 flex items-center text-sm ${catFilter ? 'text-green-400 bg-green-500/10' : ''}`}
        >
          <Filter className="w-4 h-4" />
          {catFilter ? catFilter.split(' ')[0] : 'Filtrar'}
        </button>
      </div>

      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="flex flex-wrap gap-2 pb-1">
              <button
                onClick={() => { setCatFilter(''); setShowFilters(false) }}
                className={`chip ${!catFilter ? 'bg-green-500 text-black' : 'bg-white/5 text-white/60 hover:bg-white/10'}`}
              >
                Todas
              </button>
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => { setCatFilter(cat === catFilter ? '' : cat); setShowFilters(false) }}
                  className={`chip ${catFilter === cat ? 'bg-green-500 text-black' : 'bg-white/5 text-white/60 hover:bg-white/10'}`}
                >
                  {CATEGORY_EMOJI[cat] || '💳'} {cat}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Transaction items */}
      {filtered.length === 0 ? (
        <div className="card text-center py-10 text-white/30 text-sm">
          {search || catFilter ? 'Nenhuma transação encontrada.' : 'Nenhuma transação neste período.'}
        </div>
      ) : (
        <div className="space-y-1.5">
          <AnimatePresence>
            {filtered.map((t, i) => (
              <motion.div
                key={t.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ delay: i * 0.02 }}
                className="flex items-center gap-3 card-sm hover:bg-white/5 transition-colors group"
              >
                {/* Category icon */}
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0"
                  style={{ backgroundColor: (CATEGORY_COLORS[t.category] || '#6b7280') + '20' }}
                >
                  {CATEGORY_EMOJI[t.category] || '💳'}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{t.description}</p>
                  <p className="text-xs text-white/40">{formatDate(t.transaction_date)} · {t.category || 'Outros'}</p>
                </div>

                {/* Amount */}
                <div className="text-right shrink-0">
                  <p className={`text-sm font-semibold ${t.amount > 0 ? 'text-green-400' : 'text-white'}`}>
                    {t.amount > 0 ? '+' : ''}{formatCurrency(t.amount)}
                  </p>
                  {t.bank && <p className="text-xs text-white/30">{t.bank}</p>}
                </div>

                {/* Delete (hover) */}
                <button
                  onClick={() => handleDelete(t.id)}
                  disabled={deleting === t.id}
                  className="opacity-0 group-hover:opacity-100 text-white/20 hover:text-red-400 transition-all ml-1 shrink-0"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {filtered.length > 0 && (
        <p className="text-xs text-white/30 text-center pt-1">
          {filtered.length} {filtered.length === 1 ? 'transação' : 'transações'}
        </p>
      )}
    </div>
  )
}
