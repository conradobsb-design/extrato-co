import { useState } from 'react'
import { motion } from 'framer-motion'
import { Target, Plus, MoreHorizontal, Check, Archive } from 'lucide-react'
import { formatCurrency } from '../utils/categories'

function GoalItem({ goal, onUpdate, onArchive }) {
  const pct = Math.min(100, Math.round((goal.current_amount / goal.target_amount) * 100))
  const [menu, setMenu] = useState(false)

  return (
    <div className="card-sm relative">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{goal.emoji || '🎯'}</span>
          <div>
            <p className="text-sm font-semibold">{goal.title}</p>
            {goal.deadline && (
              <p className="text-xs text-white/40">até {new Date(goal.deadline).toLocaleDateString('pt-BR')}</p>
            )}
          </div>
        </div>
        <div className="relative">
          <button onClick={() => setMenu(!menu)} className="text-white/30 hover:text-white/60 p-1">
            <MoreHorizontal className="w-4 h-4" />
          </button>
          {menu && (
            <div className="absolute right-0 top-6 bg-[#2e2e2e] border border-white/10 rounded-xl py-1 z-10 min-w-32 shadow-xl">
              <button
                onClick={() => { onArchive(goal.id); setMenu(false) }}
                className="flex items-center gap-2 w-full px-3 py-2 text-sm text-white/60 hover:bg-white/5 hover:text-white"
              >
                <Archive className="w-3.5 h-3.5" /> Arquivar
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Progress */}
      <div className="mb-2">
        <div className="flex justify-between text-xs text-white/40 mb-1.5">
          <span>{formatCurrency(goal.current_amount)}</span>
          <span>{pct}%</span>
          <span>{formatCurrency(goal.target_amount)}</span>
        </div>
        <div className="h-2 bg-white/10 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            className={`h-full rounded-full ${pct >= 100 ? 'bg-green-500' : 'bg-blue-500'}`}
          />
        </div>
      </div>

      {pct >= 100 && (
        <div className="flex items-center gap-1.5 text-green-400 text-xs mt-2">
          <Check className="w-3.5 h-3.5" /> Meta atingida!
        </div>
      )}
    </div>
  )
}

function CreateGoalModal({ onClose, onCreate }) {
  const [form, setForm] = useState({ title: '', emoji: '🎯', target_amount: '', deadline: '' })
  const [saving, setSaving] = useState(false)

  const handle = async (e) => {
    e.preventDefault()
    setSaving(true)
    await onCreate({ ...form, target_amount: parseFloat(form.target_amount), current_amount: 0, status: 'active' })
    setSaving(false)
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        className="card w-full max-w-sm"
      >
        <h3 className="font-semibold mb-4">Nova meta</h3>
        <form onSubmit={handle} className="space-y-3">
          <div className="flex gap-2">
            <input
              className="input w-16 text-center text-xl px-2"
              value={form.emoji}
              onChange={e => setForm(f => ({ ...f, emoji: e.target.value }))}
              maxLength={2}
            />
            <input
              className="input flex-1"
              placeholder="Nome da meta"
              value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              required
            />
          </div>
          <input
            type="number"
            className="input"
            placeholder="Valor alvo (R$)"
            value={form.target_amount}
            onChange={e => setForm(f => ({ ...f, target_amount: e.target.value }))}
            required
            min="1"
            step="0.01"
          />
          <input
            type="date"
            className="input"
            value={form.deadline}
            onChange={e => setForm(f => ({ ...f, deadline: e.target.value }))}
          />
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} className="btn-ghost flex-1">Cancelar</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1">
              {saving ? 'Salvando...' : 'Criar meta'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  )
}

export default function GoalCard({ goals, onUpdate, onArchive, onCreate }) {
  const [showCreate, setShowCreate] = useState(false)

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Target className="w-4 h-4 text-white/40" />
          <h3 className="text-sm font-semibold text-white/70">Metas</h3>
        </div>
        <button onClick={() => setShowCreate(true)} className="text-white/40 hover:text-green-400 transition-colors">
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {goals.length === 0 ? (
        <button
          onClick={() => setShowCreate(true)}
          className="card-sm w-full text-center border-dashed border-white/10 hover:border-green-500/30 hover:bg-green-500/5 transition-all py-6"
        >
          <Target className="w-6 h-6 text-white/20 mx-auto mb-2" />
          <p className="text-sm text-white/30">Criar primeira meta</p>
        </button>
      ) : (
        <div className="space-y-2">
          {goals.map(g => (
            <GoalItem key={g.id} goal={g} onUpdate={onUpdate} onArchive={onArchive} />
          ))}
          <button onClick={() => setShowCreate(true)} className="btn-ghost w-full text-sm flex items-center justify-center gap-1.5">
            <Plus className="w-4 h-4" /> Nova meta
          </button>
        </div>
      )}

      {showCreate && (
        <CreateGoalModal onClose={() => setShowCreate(false)} onCreate={onCreate} />
      )}
    </div>
  )
}
