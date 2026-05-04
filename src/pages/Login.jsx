import { useState } from 'react'
import { motion } from 'framer-motion'
import { Mail, Lock, Eye, EyeOff, TrendingUp } from 'lucide-react'
import { supabase } from '../lib/supabase'

export default function Login() {
  const [mode, setMode] = useState('login') // 'login' | 'register' | 'reset'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState(null)

  const handle = async (e) => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
      } else if (mode === 'register') {
        const { error } = await supabase.auth.signUp({ email, password })
        if (error) throw error
        setMessage({ type: 'success', text: 'Conta criada! Verifique seu e-mail para confirmar.' })
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email)
        if (error) throw error
        setMessage({ type: 'success', text: 'Link de redefinição enviado para seu e-mail.' })
      }
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Algo deu errado.' })
    } finally {
      setLoading(false)
    }
  }

  const handleGoogle = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    })
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-[#0f0f0f]">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm"
      >
        {/* Logo */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-green-500 flex items-center justify-center">
            <TrendingUp className="w-5 h-5 text-black" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Extrato Co.</h1>
            <p className="text-xs text-white/40">Finanças que fazem sentido</p>
          </div>
        </div>

        <div className="card">
          <h2 className="text-lg font-semibold mb-1">
            {mode === 'login' ? 'Entrar' : mode === 'register' ? 'Criar conta' : 'Recuperar senha'}
          </h2>
          <p className="text-sm text-white/40 mb-6">
            {mode === 'login' ? 'Bem-vindo de volta' : mode === 'register' ? 'Comece a controlar suas finanças' : 'Enviaremos um link por e-mail'}
          </p>

          {message && (
            <div className={`mb-4 p-3 rounded-xl text-sm ${message.type === 'success' ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
              {message.text}
            </div>
          )}

          <form onSubmit={handle} className="space-y-3">
            <div className="relative">
              <Mail className="absolute left-3.5 top-3.5 w-4 h-4 text-white/30" />
              <input
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                className="input pl-10"
              />
            </div>

            {mode !== 'reset' && (
              <div className="relative">
                <Lock className="absolute left-3.5 top-3.5 w-4 h-4 text-white/30" />
                <input
                  type={showPass ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  className="input pl-10 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3.5 top-3.5 text-white/30 hover:text-white/60"
                >
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            )}

            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? 'Aguarde...' : mode === 'login' ? 'Entrar' : mode === 'register' ? 'Criar conta' : 'Enviar link'}
            </button>
          </form>

          {mode !== 'reset' && (
            <>
              <div className="flex items-center gap-3 my-4">
                <div className="flex-1 h-px bg-white/10" />
                <span className="text-xs text-white/30">ou</span>
                <div className="flex-1 h-px bg-white/10" />
              </div>
              <button
                onClick={handleGoogle}
                className="btn-ghost w-full flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Continuar com Google
              </button>
            </>
          )}

          <div className="mt-5 flex flex-col gap-2 text-center text-sm text-white/40">
            {mode === 'login' && (
              <>
                <button onClick={() => setMode('reset')} className="hover:text-white/70 transition-colors">
                  Esqueci minha senha
                </button>
                <button onClick={() => setMode('register')} className="hover:text-white/70 transition-colors">
                  Não tem conta? <span className="text-green-400">Criar grátis</span>
                </button>
              </>
            )}
            {mode === 'register' && (
              <button onClick={() => setMode('login')} className="hover:text-white/70 transition-colors">
                Já tem conta? <span className="text-green-400">Entrar</span>
              </button>
            )}
            {mode === 'reset' && (
              <button onClick={() => setMode('login')} className="hover:text-white/70 transition-colors">
                Voltar para login
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  )
}
