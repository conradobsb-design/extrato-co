import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Upload, FileText, CheckCircle2, AlertCircle, X, Loader2 } from 'lucide-react'
import { useApp } from '../contexts/AppContext'
import { supabase } from '../lib/supabase'

const PARSE_URL = 'https://zifouatrpgupggyddloe.supabase.co/functions/v1/parse-statement'

const BANKS = [
  { value: 'itau', label: 'Itaú' },
  { value: 'btg', label: 'BTG Pactual' },
  { value: 'nubank', label: 'Nubank' },
  { value: 'sicredi', label: 'Sicredi' },
  { value: 'caixa', label: 'Caixa Econômica' },
  { value: 'bradesco', label: 'Bradesco' },
  { value: 'santander', label: 'Santander' },
  { value: 'inter', label: 'Banco Inter' },
  { value: 'c6', label: 'C6 Bank' },
  { value: 'xp', label: 'XP' },
  { value: 'outro', label: 'Outro' },
]

async function extractPdfText(file) {
  const pdfjsLib = await import('pdfjs-dist')
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@5.7.284/build/pdf.worker.min.mjs`

  const arrayBuffer = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise

  // Extrai todas as páginas em paralelo (era sequencial — principal gargalo)
  const pageTexts = await Promise.all(
    Array.from({ length: pdf.numPages }, (_, i) =>
      pdf.getPage(i + 1)
        .then(page => page.getTextContent())
        .then(content => content.items.map(item => item.str).join(' '))
    )
  )

  // Limpa o texto antes de enviar: remove espaços duplicados e linhas vazias
  return pageTexts
    .join('\n')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

export default function StatementImport({ onSuccess, onClose }) {
  const { user } = useApp()
  const fileRef = useRef()
  const [file, setFile] = useState(null)
  const [bank, setBank] = useState('')
  const [type, setType] = useState('bank') // 'bank' | 'credit_card' | 'investment'
  const [stage, setStage] = useState('idle') // 'idle' | 'reading' | 'parsing' | 'done' | 'error'
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const [drag, setDrag] = useState(false)

  const pickFile = (f) => {
    if (f && f.type === 'application/pdf') setFile(f)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setDrag(false)
    const f = e.dataTransfer.files[0]
    pickFile(f)
  }

  const run = async () => {
    if (!file || !bank) return
    setStage('reading')
    setError(null)

    try {
      const text = await extractPdfText(file)
      setStage('parsing')

      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token

      const res = await fetch(PARSE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          text_data: text,
          user_id: user.id,
          file_name: file.name,
          import_type: type,
          source_type: type,
          bank,
        }),
      })

      const json = await res.json()

      if (!res.ok || json.error) {
        throw new Error(json.error || `Erro ${res.status}`)
      }

      setResult(json)
      setStage('done')
      onSuccess?.()
    } catch (err) {
      setError(err.message || 'Erro ao processar arquivo')
      setStage('error')
    }
  }

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        className="card w-full max-w-md"
      >
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="font-semibold">Importar extrato / fatura</h3>
            <p className="text-xs text-white/40 mt-0.5">PDF de qualquer banco brasileiro</p>
          </div>
          <button onClick={onClose} className="text-white/30 hover:text-white/70">
            <X className="w-5 h-5" />
          </button>
        </div>

        {stage === 'idle' || stage === 'error' ? (
          <div className="space-y-4">
            {/* Drop zone */}
            <div
              onClick={() => fileRef.current?.click()}
              onDragOver={e => { e.preventDefault(); setDrag(true) }}
              onDragLeave={() => setDrag(false)}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
                drag ? 'border-green-500/60 bg-green-500/5' : file ? 'border-green-500/30 bg-green-500/5' : 'border-white/10 hover:border-white/20 hover:bg-white/5'
              }`}
            >
              {file ? (
                <div className="flex items-center justify-center gap-3">
                  <FileText className="w-6 h-6 text-green-400" />
                  <div className="text-left">
                    <p className="text-sm font-medium text-green-400">{file.name}</p>
                    <p className="text-xs text-white/40">{(file.size / 1024).toFixed(0)} KB</p>
                  </div>
                  <button
                    onClick={e => { e.stopPropagation(); setFile(null) }}
                    className="text-white/30 hover:text-red-400 ml-2"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <>
                  <Upload className="w-8 h-8 text-white/20 mx-auto mb-2" />
                  <p className="text-sm text-white/50">Arraste o PDF ou clique para selecionar</p>
                  <p className="text-xs text-white/30 mt-1">Apenas arquivos PDF</p>
                </>
              )}
            </div>
            <input ref={fileRef} type="file" accept=".pdf" className="hidden" onChange={e => pickFile(e.target.files[0])} />

            {/* Bank selector */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-white/40 mb-1.5 block">Banco</label>
                <select
                  value={bank}
                  onChange={e => setBank(e.target.value)}
                  className="input text-sm"
                >
                  <option value="">Selecionar...</option>
                  {BANKS.map(b => (
                    <option key={b.value} value={b.value}>{b.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-white/40 mb-1.5 block">Tipo</label>
                <select
                  value={type}
                  onChange={e => setType(e.target.value)}
                  className="input text-sm"
                >
                  <option value="bank">Extrato bancário</option>
                  <option value="credit_card">Fatura cartão</option>
                  <option value="investment">Investimentos</option>
                </select>
              </div>
            </div>

            {error && (
              <div className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
                <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}

            <button
              onClick={run}
              disabled={!file || !bank}
              className="btn-primary w-full"
            >
              Processar com IA
            </button>
          </div>
        ) : stage === 'reading' || stage === 'parsing' ? (
          <div className="py-10 text-center space-y-4">
            <Loader2 className="w-10 h-10 text-green-500 mx-auto animate-spin" />
            <div>
              <p className="font-medium">{stage === 'reading' ? 'Lendo PDF...' : 'Claude está analisando...'}</p>
              <p className="text-sm text-white/40 mt-1">
                {stage === 'reading' ? 'Extraindo texto do documento' : 'Identificando e categorizando transações'}
              </p>
            </div>
          </div>
        ) : (
          <div className="py-8 text-center space-y-4">
            <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto" />
            <div>
              <p className="font-semibold text-lg">Importação concluída!</p>
              <p className="text-white/50 text-sm mt-1">
                <span className="text-green-400 font-medium">{result?.count || 0} transações</span> adicionadas com sucesso
              </p>
            </div>
            <button onClick={onClose} className="btn-primary px-8">
              Ver transações
            </button>
          </div>
        )}
      </motion.div>
    </div>
  )
}
