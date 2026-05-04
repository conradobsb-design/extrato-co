import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import {
  TrendingUp, TrendingDown, DollarSign, PiggyBank,
  Upload, Sparkles, ChevronLeft, ChevronRight,
  BarChart3, List, Flame, LogOut, Settings,
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts'

import { useApp } from '../contexts/AppContext'
import { useTransactions } from '../hooks/useTransactions'
import { useGoals } from '../hooks/useGoals'
import { useStreak } from '../hooks/useStreak'
import { formatCurrency, monthLabel, CATEGORY_COLORS, CATEGORY_EMOJI } from '../utils/categories'
import TransactionList from '../components/TransactionList'
import GoalCard from '../components/GoalCard'
import StatementImport from '../components/StatementImport'
import ChatDrawer from '../components/ChatDrawer'

// ── helpers ──────────────────────────────────────────────────────────────────

function prevMonth(yyyymm) {
  const [y, m] = yyyymm.split('-').map(Number)
  const d = new Date(y, m - 2, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function nextMonth(yyyymm) {
  const [y, m] = yyyymm.split('-').map(Number)
  const d = new Date(y, m, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function isCurrentMonth(yyyymm) {
  const now = new Date()
  return yyyymm === `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

// ── sub-components ────────────────────────────────────────────────────────────

function SummaryCard({ icon, label, value, sub, color = 'text-white', trend }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="card flex flex-col gap-1"
    >
      <div className="flex items-center justify-between">
        <div className={`w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center ${color}`}>
          {icon}
        </div>
        {trend !== undefined && (
          <span className={`text-xs ${trend >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {trend >= 0 ? '+' : ''}{trend.toFixed(0)}%
          </span>
        )}
      </div>
      <p className="text-xs text-white/40 mt-2">{label}</p>
      <p className={`text-xl font-bold ${color}`}>{value}</p>
      {sub && <p className="text-xs text-white/30">{sub}</p>}
    </motion.div>
  )
}

function CategoryBreakdown({ transactions }) {
  const data = useMemo(() => {
    const map = {}
    transactions.filter(t => t.amount < 0).forEach(t => {
      const cat = t.category || 'Outros'
      map[cat] = (map[cat] || 0) + Math.abs(t.amount)
    })
    return Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([name, value]) => ({ name, value }))
  }, [transactions])

  if (!data.length) return null
  const total = data.reduce((s, d) => s + d.value, 0)

  return (
    <div className="card">
      <p className="text-sm font-semibold mb-4 text-white/70">Gastos por categoria</p>
      <div className="flex gap-4 items-center">
        <PieChart width={110} height={110}>
          <Pie data={data} cx={50} cy={50} innerRadius={32} outerRadius={50} dataKey="value" paddingAngle={2}>
            {data.map((d, i) => (
              <Cell key={i} fill={CATEGORY_COLORS[d.name] || '#6b7280'} />
            ))}
          </Pie>
        </PieChart>
        <div className="flex-1 space-y-2 min-w-0">
          {data.map(d => (
            <div key={d.name} className="flex items-center gap-2">
              <div
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ background: CATEGORY_COLORS[d.name] || '#6b7280' }}
              />
              <span className="text-xs text-white/60 truncate flex-1">{d.name}</span>
              <span className="text-xs font-medium shrink-0">{((d.value / total) * 100).toFixed(0)}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function MonthlyBarChart({ userId, currentMonth }) {
  const months = useMemo(() => {
    const list = []
    let m = currentMonth
    for (let i = 0; i < 6; i++) {
      list.unshift(m)
      m = prevMonth(m)
    }
    return list
  }, [currentMonth])

  // Simplified: show bars from current transactions only for now
  // Real implementation would fetch all 6 months
  const data = months.map(mo => ({
    name: monthLabel(mo),
    month: mo,
  }))

  return (
    <div className="card">
      <p className="text-sm font-semibold mb-4 text-white/70">Histórico mensal</p>
      <ResponsiveContainer width="100%" height={120}>
        <BarChart data={data} barSize={20}>
          <XAxis dataKey="name" tick={{ fill: '#ffffff40', fontSize: 11 }} axisLine={false} tickLine={false} />
          <YAxis hide />
          <Tooltip
            contentStyle={{ background: '#242424', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12 }}
            labelStyle={{ color: '#fff' }}
            formatter={v => formatCurrency(v)}
          />
          <Bar dataKey="expenses" fill="#ef4444" radius={[4, 4, 0, 0]} name="Despesas" />
          <Bar dataKey="income" fill="#22c55e" radius={[4, 4, 0, 0]} name="Receita" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

// ── Main Dashboard ────────────────────────────────────────────────────────────

export default function Dashboard() {
  const { user, signOut, selectedMonth, setSelectedMonth } = useApp()
  const { transactions, summary, loading, refetch } = useTransactions(user?.id, selectedMonth)
  const { goals, createGoal, updateGoal, archiveGoal } = useGoals(user?.id)
  const streak = useStreak(user?.id)

  const [tab, setTab] = useState('overview') // 'overview' | 'transactions' | 'goals'
  const [showImport, setShowImport] = useState(false)
  const [showChat, setShowChat] = useState(false)

  const name = user?.user_metadata?.full_name?.split(' ')[0] || 'você'

  // Chat context
  const chatContext = useMemo(() => ({
    month: selectedMonth,
    income: summary.income,
    expense: summary.expense,
    balance: summary.balance,
    savings: summary.savings,
    topCategories: Object.entries(
      transactions.filter(t => t.amount < 0).reduce((acc, t) => {
        const cat = t.category || 'Outros'
        acc[cat] = (acc[cat] || 0) + Math.abs(t.amount)
        return acc
      }, {})
    ).sort((a, b) => b[1] - a[1]).slice(0, 5),
    goalsCount: goals.length,
  }), [summary, transactions, goals, selectedMonth])

  return (
    <div className="min-h-screen bg-[#0f0f0f] flex flex-col max-w-2xl mx-auto px-4 pb-24">

      {/* ── Top bar ── */}
      <div className="flex items-center justify-between pt-6 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-green-500 flex items-center justify-center">
            <TrendingUp className="w-4 h-4 text-black" />
          </div>
          <div>
            <p className="text-sm font-semibold">Olá, {name} 👋</p>
            {streak > 1 && (
              <p className="text-xs text-orange-400 flex items-center gap-1">
                <Flame className="w-3 h-3" /> {streak} dias seguidos
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowImport(true)}
            className="btn-ghost px-3 py-2 text-sm flex items-center gap-1.5"
          >
            <Upload className="w-4 h-4" /> Importar
          </button>
          <button
            onClick={() => setShowChat(true)}
            className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center"
          >
            <Sparkles className="w-4 h-4 text-white" />
          </button>
          <button
            onClick={signOut}
            className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center text-white/40 hover:text-white/70 transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ── Month navigation ── */}
      <div className="flex items-center justify-between mb-5">
        <button onClick={() => setSelectedMonth(prevMonth(selectedMonth))} className="p-2 text-white/40 hover:text-white/70 transition-colors">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div className="text-center">
          <p className="font-semibold">{monthLabel(selectedMonth)}</p>
          {isCurrentMonth(selectedMonth) && <p className="text-xs text-green-400">Mês atual</p>}
        </div>
        <button
          onClick={() => setSelectedMonth(nextMonth(selectedMonth))}
          disabled={isCurrentMonth(selectedMonth)}
          className="p-2 text-white/40 hover:text-white/70 transition-colors disabled:opacity-20"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* ── Summary cards ── */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        <SummaryCard
          icon={<TrendingUp className="w-4 h-4" />}
          label="Receitas"
          value={formatCurrency(summary.income)}
          color="text-green-400"
        />
        <SummaryCard
          icon={<TrendingDown className="w-4 h-4" />}
          label="Despesas"
          value={formatCurrency(summary.expense)}
          color="text-red-400"
        />
        <SummaryCard
          icon={<DollarSign className="w-4 h-4" />}
          label="Saldo"
          value={formatCurrency(summary.balance)}
          color={summary.balance >= 0 ? 'text-white' : 'text-red-400'}
        />
        <SummaryCard
          icon={<PiggyBank className="w-4 h-4" />}
          label="Investimentos"
          value={formatCurrency(summary.savings)}
          color="text-blue-400"
        />
      </div>

      {/* ── Tab bar ── */}
      <div className="flex bg-white/5 rounded-xl p-1 mb-5 gap-1">
        {[
          { id: 'overview', label: 'Visão geral', icon: <BarChart3 className="w-3.5 h-3.5" /> },
          { id: 'transactions', label: 'Transações', icon: <List className="w-3.5 h-3.5" /> },
          { id: 'goals', label: 'Metas', icon: <TrendingUp className="w-3.5 h-3.5" /> },
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-all ${
              tab === t.id ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white/60'
            }`}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* ── Tab content ── */}
      {tab === 'overview' && (
        <div className="space-y-4">
          {loading ? (
            <div className="card animate-pulse h-32" />
          ) : transactions.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="card text-center py-12"
            >
              <Upload className="w-10 h-10 text-white/20 mx-auto mb-3" />
              <p className="font-medium text-white/60">Nenhuma transação ainda</p>
              <p className="text-sm text-white/30 mt-1 mb-4">Importe seu extrato ou fatura para começar</p>
              <button onClick={() => setShowImport(true)} className="btn-primary mx-auto">
                Importar agora
              </button>
            </motion.div>
          ) : (
            <>
              <CategoryBreakdown transactions={transactions} />
              <div className="card">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-semibold text-white/70">Últimas transações</p>
                  <button onClick={() => setTab('transactions')} className="text-xs text-green-400 hover:text-green-300">
                    Ver todas →
                  </button>
                </div>
                <div className="space-y-1.5">
                  {transactions.slice(0, 5).map(t => (
                    <div key={t.id} className="flex items-center gap-3">
                      <span className="text-lg">{CATEGORY_EMOJI[t.category] || '💳'}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm truncate">{t.description}</p>
                        <p className="text-xs text-white/30">{t.category || 'Outros'}</p>
                      </div>
                      <p className={`text-sm font-medium shrink-0 ${t.amount > 0 ? 'text-green-400' : 'text-white'}`}>
                        {t.amount > 0 ? '+' : ''}{formatCurrency(t.amount)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {tab === 'transactions' && (
        <TransactionList transactions={transactions} onDelete={refetch} />
      )}

      {tab === 'goals' && (
        <GoalCard
          goals={goals}
          onUpdate={updateGoal}
          onArchive={archiveGoal}
          onCreate={createGoal}
        />
      )}

      {/* ── FAB: Clara ── */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setShowChat(true)}
        className="fixed bottom-6 right-4 w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-600 to-pink-600 shadow-xl flex items-center justify-center"
      >
        <Sparkles className="w-6 h-6 text-white" />
      </motion.button>

      {/* ── Modals ── */}
      {showImport && (
        <StatementImport
          onSuccess={() => { refetch(); setShowImport(false) }}
          onClose={() => setShowImport(false)}
        />
      )}

      <ChatDrawer open={showChat} onClose={() => setShowChat(false)} context={chatContext} />
    </div>
  )
}
