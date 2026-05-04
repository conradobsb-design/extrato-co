export const CATEGORY_RULES = [
  { cat: 'Alimentação', keywords: ['restaurante', 'lanchonete', 'padaria', 'ifood', 'uber eats', 'rappi', 'mcdonalds', 'burger', 'pizza', 'sushi', 'mercado', 'supermercado', 'açougue', 'hortifruti', 'pão de açúcar', 'carrefour', 'extra', 'atacadão'] },
  { cat: 'Transporte', keywords: ['uber', '99pop', 'taxi', 'posto', 'combustivel', 'gasolina', 'etanol', 'estacionamento', 'pedagio', 'onibus', 'metrô', 'trem', 'transfero'] },
  { cat: 'Saúde', keywords: ['farmacia', 'drogaria', 'ultrafarma', 'medico', 'hospital', 'clinica', 'laboratorio', 'dentista', 'psicólogo', 'terapia', 'plano de saude', 'amil', 'unimed', 'hapvida'] },
  { cat: 'Assinaturas', keywords: ['netflix', 'spotify', 'amazon prime', 'disney', 'hbo', 'globoplay', 'apple.com', 'google one', 'icloud', 'dropbox', 'adobe', 'microsoft 365', 'youtube premium', 'deezer'] },
  { cat: 'Academia / Esporte', keywords: ['smartfit', 'bluefit', 'gympass', 'totalpass', 'academia', 'crossfit', 'natação', 'musculação'] },
  { cat: 'Educação', keywords: ['kiwify', 'hotmart', 'coursera', 'udemy', 'alura', 'escola', 'faculdade', 'curso', 'mensalidade'] },
  { cat: 'Moradia', keywords: ['aluguel', 'condomínio', 'iptu', 'luz', 'água', 'gás', 'enel', 'copel', 'sabesp', 'cemig', 'internet', 'claro residencial'] },
  { cat: 'Telefone', keywords: ['claro ', 'vivo ', 'tim ', 'oi ', 'celular', 'telefonia'] },
  { cat: 'Lazer', keywords: ['cinema', 'teatro', 'show', 'ingresso', 'ticketmaster', 'sympla', 'bar', 'balada', 'clube'] },
  { cat: 'Viagem', keywords: ['hotel', 'airbnb', 'latam', 'gol', 'azul', 'booking', 'decolar', 'trivago', 'aeroporto', 'passagem'] },
  { cat: 'Compras', keywords: ['amazon', 'mercado livre', 'shopee', 'americanas', 'magazine luiza', 'casas bahia', 'shein', 'lojas'] },
  { cat: 'Investimentos', keywords: ['cdb', 'tesouro', 'fundo', 'ação', 'etf', 'poupança', 'previdência', 'btg', 'xp investimentos', 'rico', 'inter invest', 'nu invest'] },
  { cat: 'Transferências', keywords: ['pix', 'ted', 'doc', 'transferência'] },
]

export const SAVINGS_CATS = ['Investimentos', 'Poupança', 'CDB', 'Tesouro', 'Fundo']

export function categorize(description) {
  if (!description) return 'Outros'
  const lower = description.toLowerCase()
  for (const rule of CATEGORY_RULES) {
    if (rule.keywords.some(k => lower.includes(k))) return rule.cat
  }
  return 'Outros'
}

export function classifyTransaction(item) {
  if (SAVINGS_CATS.some(c => item.category?.includes(c))) {
    return item.amount > 0 ? 'savings_in' : 'savings_out'
  }
  return item.amount > 0 ? 'income' : 'expense'
}

export const CATEGORY_COLORS = {
  'Alimentação': '#f97316',
  'Transporte': '#3b82f6',
  'Saúde': '#ec4899',
  'Assinaturas': '#8b5cf6',
  'Academia / Esporte': '#06b6d4',
  'Educação': '#f59e0b',
  'Moradia': '#84cc16',
  'Telefone': '#6366f1',
  'Lazer': '#e879f9',
  'Viagem': '#14b8a6',
  'Compras': '#fb923c',
  'Investimentos': '#60a5fa',
  'Transferências': '#9ca3af',
  'Outros': '#6b7280',
}

export const CATEGORY_EMOJI = {
  'Alimentação': '🍽️',
  'Transporte': '🚗',
  'Saúde': '💊',
  'Assinaturas': '📺',
  'Academia / Esporte': '💪',
  'Educação': '📚',
  'Moradia': '🏠',
  'Telefone': '📱',
  'Lazer': '🎉',
  'Viagem': '✈️',
  'Compras': '🛍️',
  'Investimentos': '📈',
  'Transferências': '↔️',
  'Outros': '💳',
}

export function formatCurrency(value) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
}

export function formatDate(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export function monthLabel(yyyymm) {
  if (!yyyymm) return ''
  const [y, m] = yyyymm.split('-')
  const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
  return `${months[parseInt(m) - 1]}/${y.slice(2)}`
}
