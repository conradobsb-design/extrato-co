import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { TrendingUp, Upload, Target, Sparkles, ArrowRight, CheckCircle2 } from 'lucide-react'
import { useApp } from '../contexts/AppContext'
import { supabase } from '../lib/supabase'

const steps = [
  {
    icon: <TrendingUp className="w-8 h-8 text-green-400" />,
    title: 'Bem-vindo ao Extrato Co.',
    desc: 'Controle financeiro real, sem planilhas. Importe seus extratos e entenda seu dinheiro em minutos.',
    action: 'Começar',
  },
  {
    icon: <Upload className="w-8 h-8 text-blue-400" />,
    title: 'Importe seus extratos',
    desc: 'Nossa IA lê extratos e faturas bancárias brasileiras automaticamente. Itaú, BTG, Nubank, Sicredi e mais.',
    action: 'Entendi',
  },
  {
    icon: <Target className="w-8 h-8 text-purple-400" />,
    title: 'Defina suas metas',
    desc: 'Crie objetivos financeiros e acompanhe o progresso. Guardar para viagem, reduzir gastos, investir mais.',
    action: 'Legal',
  },
  {
    icon: <Sparkles className="w-8 h-8 text-yellow-400" />,
    title: 'Conheça a Clara',
    desc: 'Sua consultora financeira IA. Ela analisa seus dados e dá insights personalizados sem jargão financeiro.',
    action: 'Acessar o app',
  },
]

export default function Onboarding() {
  const { user } = useApp()
  const [step, setStep] = useState(0)
  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)

  const finish = async () => {
    setSaving(true)
    if (name && user) {
      await supabase.auth.updateUser({ data: { full_name: name } })
    }
    await supabase.auth.updateUser({ data: { onboarding_done: true } })
    setSaving(false)
    window.location.reload()
  }

  const next = () => {
    if (step < steps.length - 1) setStep(s => s + 1)
    else finish()
  }

  const current = steps[step]

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 bg-[#0f0f0f]">
      <div className="w-full max-w-sm">
        {/* Progress dots */}
        <div className="flex gap-2 justify-center mb-10">
          {steps.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all duration-300 ${i === step ? 'w-8 bg-green-500' : i < step ? 'w-4 bg-green-500/40' : 'w-4 bg-white/10'}`}
            />
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            transition={{ duration: 0.3 }}
            className="text-center"
          >
            <div className="w-20 h-20 rounded-3xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-6">
              {current.icon}
            </div>

            <h2 className="text-2xl font-bold mb-3">{current.title}</h2>
            <p className="text-white/50 text-sm leading-relaxed mb-8">{current.desc}</p>

            {step === 0 && (
              <div className="mb-6">
                <input
                  type="text"
                  placeholder="Seu nome (opcional)"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="input text-center"
                />
              </div>
            )}

            {step === steps.length - 1 && (
              <div className="mb-6 space-y-2">
                {['Importar extrato ou fatura', 'Ver resumo do mês', 'Criar primeira meta'].map((item, i) => (
                  <div key={i} className="flex items-center gap-3 text-left card-sm">
                    <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0" />
                    <span className="text-sm text-white/70">{item}</span>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        <button
          onClick={next}
          disabled={saving}
          className="btn-primary w-full flex items-center justify-center gap-2"
        >
          {saving ? 'Salvando...' : current.action}
          {!saving && <ArrowRight className="w-4 h-4" />}
        </button>

        {step < steps.length - 1 && (
          <button onClick={finish} className="w-full text-center mt-4 text-xs text-white/30 hover:text-white/50 transition-colors">
            Pular introdução
          </button>
        )}
      </div>
    </div>
  )
}
