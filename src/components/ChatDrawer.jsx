import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Send, Sparkles, Loader2 } from 'lucide-react'
import { useApp } from '../contexts/AppContext'
import { supabase } from '../lib/supabase'

const CHAT_URL = 'https://YOUR_PROJECT.supabase.co/functions/v1/ai-chat'

const CLARA_AVATAR = (
  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-sm font-bold shrink-0">
    C
  </div>
)

const SUGGESTIONS = [
  'Como estão meus gastos este mês?',
  'Em qual categoria gasto mais?',
  'Estou no caminho certo para minhas metas?',
  'Me dê dicas para economizar',
]

export default function ChatDrawer({ open, onClose, context }) {
  const { user } = useApp()
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: `Oi! Sou a Clara, sua consultora financeira 💚\n\nEstou aqui para ajudar você a entender seu dinheiro e tomar decisões melhores. Como posso ajudar hoje?`,
    },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef()

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const send = async (text) => {
    const msg = text || input.trim()
    if (!msg || loading) return
    setInput('')
    setMessages(prev => [...prev, { role: 'user', content: msg }])
    setLoading(true)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch(CHAT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          message: msg,
          user_id: user.id,
          context,
        }),
      })

      if (!res.ok) throw new Error('Erro na resposta')
      const { reply } = await res.json()
      setMessages(prev => [...prev, { role: 'assistant', content: reply }])
    } catch {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Ops, tive um problema de conexão. Tente novamente em alguns instantes.',
      }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 z-40"
          />

          {/* Drawer */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            className="fixed right-0 top-0 bottom-0 w-full max-w-sm bg-[#1a1a1a] border-l border-white/5 z-50 flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center gap-3 p-4 border-b border-white/5">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center font-bold">
                C
              </div>
              <div className="flex-1">
                <p className="font-semibold text-sm">Clara</p>
                <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                  <p className="text-xs text-white/40">Consultora financeira IA</p>
                </div>
              </div>
              <button onClick={onClose} className="text-white/30 hover:text-white/70 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((m, i) => (
                <div key={i} className={`flex gap-2.5 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
                  {m.role === 'assistant' && CLARA_AVATAR}
                  <div
                    className={`max-w-[80%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                      m.role === 'user'
                        ? 'bg-green-500 text-black rounded-tr-sm'
                        : 'bg-white/5 text-white/90 rounded-tl-sm'
                    }`}
                  >
                    {m.content}
                  </div>
                </div>
              ))}

              {loading && (
                <div className="flex gap-2.5">
                  {CLARA_AVATAR}
                  <div className="bg-white/5 rounded-2xl rounded-tl-sm px-4 py-3 flex gap-1.5 items-center">
                    <span className="w-1.5 h-1.5 bg-white/40 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1.5 h-1.5 bg-white/40 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-1.5 h-1.5 bg-white/40 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              )}

              {/* Suggestions on first load */}
              {messages.length === 1 && !loading && (
                <div className="space-y-2">
                  <p className="text-xs text-white/30 text-center">Sugestões</p>
                  {SUGGESTIONS.map(s => (
                    <button
                      key={s}
                      onClick={() => send(s)}
                      className="w-full text-left text-sm px-3.5 py-2.5 bg-white/5 hover:bg-white/10 rounded-xl transition-colors text-white/70"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}

              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div className="p-4 border-t border-white/5">
              <div className="flex gap-2">
                <input
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()}
                  placeholder="Pergunte algo para a Clara..."
                  className="input text-sm"
                />
                <button
                  onClick={() => send()}
                  disabled={!input.trim() || loading}
                  className="btn-primary px-3 flex items-center justify-center"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
