# Extrato Co. — Blueprint para novo app de finanças pessoais

## Visão do produto

App de gestão financeira pessoal **dopaminérgico**: combina controle financeiro real com uma experiência fluida, agradável e motivadora. Foco no usuário brasileiro, mobile-first, com IA integrada.

**Diferencial central:** importação automática de extratos e faturas bancárias brasileiras via IA (Claude), sem planilhas, sem trabalho manual.

**O que significa "dopaminérgico" neste contexto (critérios concretos):**
- Streak de dias consecutivos de acesso visível no header
- Animação de celebração (confetti ou pulse verde) ao atingir 100% de uma meta
- Cores positivas dominam: verde para receita/meta cumprida, vermelho só aparece quando necessário
- Transições suaves em todas as mudanças de estado (Framer Motion, duration ≤ 300ms)
- Feedback imediato após importação: contador animado de transações processadas
- Sem telas de erro vazias — sempre há uma ação sugerida

---

## Stack recomendada

| Camada | Tecnologia | Motivo |
|---|---|---|
| Frontend | React + Vite | Build rápido, HMR, ecosystem maduro |
| Estilo | Tailwind CSS via CLI (não CDN) | CDN não serve para produção |
| Animações | Framer Motion | Fluido, simples de usar |
| Ícones | Lucide React | Consistente, tree-shakeable |
| Backend | Supabase | Auth, DB, Edge Functions, Storage em um só lugar |
| IA | Anthropic Claude (Haiku) | Barato, rápido, multimodal — ideal para parsing |
| Deploy | Coolify + Docker | Self-hosted, controle total |
| Auth social | Supabase OAuth (Google) | Pronto out-of-the-box |

---

## Arquitetura

```
Browser (React SPA)
    │
    ├── Supabase Auth (email + Google OAuth)
    ├── Supabase REST API (transações, metas, perfil)
    └── Supabase Edge Functions (Deno)
            ├── ai-chat        → Clara (consultora IA)
            └── parse-statement → Parser de extratos/faturas
                    └── Anthropic Claude API
```

---

## Banco de dados (Supabase, schema: `app`)

### Tabelas essenciais

```sql
-- Transações financeiras
CREATE TABLE transactions (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id         UUID REFERENCES auth.users NOT NULL,
  description     TEXT NOT NULL,
  amount          NUMERIC NOT NULL,        -- negativo = despesa, positivo = receita
  transaction_date DATE NOT NULL,
  billing_month   TEXT,                    -- YYYY-MM (para cartão de crédito)
  category        TEXT,
  bank            TEXT,
  source_type     TEXT,                    -- 'bank' | 'credit_card' | 'investment'
  metadata        JSONB DEFAULT '{}',
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Controle de arquivos importados (evita duplicatas)
CREATE TABLE imported_files (
  id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id           UUID REFERENCES auth.users NOT NULL,
  file_name         TEXT NOT NULL,
  imported_at       TIMESTAMPTZ DEFAULT NOW(),
  transaction_count INT DEFAULT 0
);

-- Metas financeiras
CREATE TABLE goals (
  id             UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id        UUID REFERENCES auth.users NOT NULL,
  title          TEXT NOT NULL,
  emoji          TEXT DEFAULT '🎯',
  type           TEXT,                    -- 'save_amount' | 'reduce_category'
  target_amount  NUMERIC NOT NULL,
  current_amount NUMERIC DEFAULT 0,      -- atualizado MANUALMENTE pelo usuário via UI (V1)
  category       TEXT,
  status         TEXT DEFAULT 'active',  -- 'active' | 'done' | 'archived'
  deadline       DATE,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- DECISÃO: current_amount é preenchido pelo usuário no GoalCard (input manual).
-- Cálculo automático a partir de transações por categoria é funcionalidade V2.
-- Quando type = 'reduce_category': current_amount = total gasto nessa categoria no mês.
-- Essa agregação automática só entra na V2 junto com o detector de assinaturas.
```

### RLS (Row Level Security) — SEMPRE ativar

```sql
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users see own" ON transactions FOR ALL USING (auth.uid() = user_id);

ALTER TABLE imported_files ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users see own" ON imported_files FOR ALL USING (auth.uid() = user_id);

ALTER TABLE goals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users see own" ON goals FOR ALL USING (auth.uid() = user_id);
```

---

## Edge Functions (Deno)

### Regras obrigatórias para Edge Functions Supabase

1. **CORS**: sempre incluir headers de CORS e responder OPTIONS
2. **`SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY`**: são **injetadas automaticamente** — não precisam ser configuradas como secrets
3. **`ANTHROPIC_API_KEY`**: setar via Supabase Dashboard → Edge Functions → Secrets
4. **Secrets customizados**: NÃO podem ter prefixo `SUPABASE_` (restrição da plataforma)
5. **Deploy**: usar `supabase functions deploy <nome>` via CLI ou pelo editor do Dashboard

```typescript
// Template base para Edge Function
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { db: { schema: 'app' } }
  );
  
  // lógica aqui...
});
```

### parse-statement (import de extratos/faturas)

**Fluxo:**
1. Frontend extrai texto do PDF via `pdfjs-dist`
2. Envia para Edge Function: `{ text_data, user_id, file_name, import_type, source_type }`
3. Edge Function envia para Claude com prompt especializado
4. Claude retorna JSON estruturado com transações
5. Edge Function insere no Supabase e retorna `{ count: N }`

**Formatos brasileiros suportados:**
- Itaú (múltiplos cartões/titulares, parcelados)
- BTG Pactual
- Sicredi
- Nubank
- Caixa Econômica Federal
- Bradesco, Santander, Inter, C6, XP

**Regras críticas do prompt de parsing:**
- `amount` NEGATIVO = despesa/débito; POSITIVO = receita/crédito
- Para extratos: `C` = crédito (+), `D` = débito (-)
- Para faturas de cartão: todas as compras são negativas
- Parcelados: `transaction_date` = data original da compra; `billing_month` = mês da fatura
- Transações internacionais: usar sempre valor em R$
- IGNORAR: totais, encargos, IOF, juros, anuidade, tarifas

**Regra de `billing_month` por tipo:**
- `source_type = 'credit_card'`: preencher com `YYYY-MM` do mês da fatura (ex: `"2024-04"`)
- `source_type = 'bank'` ou `'investment'`: sempre `null` — extratos bancários não têm mês de fatura

### ai-chat (Clara — consultora financeira IA)

**Persona:** Clara, CFO amiga — direta, acolhedora, sem jargão. Celebra conquistas, honesta com problemas, nunca alarmista.

**Contexto enviado:**
- Mês atual: receita, despesa, investimentos, saldo, top categorias
- Comparativo vs mês anterior (% de variação)
- Trimestre e ano acumulados
- Metas e progresso
- Streak de uso

**Responsabilidade do contexto:**
O frontend é responsável por agregar e enviar o contexto completo já calculado. A Edge Function `ai-chat` recebe dados prontos — não faz queries no banco. Fluxo:
1. `useTransactions(userId, currentMonth)` → summary do mês atual
2. `useTransactions(userId, prevMonth)` → summary do mês anterior
3. Frontend calcula `% variação` e monta o objeto `context`
4. Envia tudo para `ai-chat` em uma única chamada

Isso mantém a Edge Function simples e sem lógica de agregação.

**Regra de fallback:** quando mês atual tem dados zerados, analisar trimestre/ano disponíveis — nunca dizer "de mãos atadas".

---

## Frontend — estrutura de componentes

```
src/
├── pages/
│   ├── Dashboard.jsx    (componente principal, ~4500 linhas — separar em módulos)
│   ├── Login.jsx
│   └── Onboarding.jsx
├── components/
│   ├── ChatDrawer.jsx   (Clara — assistente IA)
│   ├── GoalCard.jsx     (metas)
│   └── TransactionList.jsx
├── hooks/
│   ├── useTransactions.js
│   ├── useGoals.js
│   └── useStreak.js
└── contexts/
    └── AppContext.jsx   (theme, user, plan)
```

**ATENÇÃO:** Manter o Dashboard.jsx modular desde o início. Um arquivo de 4500 linhas é difícil de manter.

---

## Classificação de transações

```javascript
// Mapeamento de palavras-chave por categoria
const CATEGORY_RULES = [
  { cat: 'Alimentação',     keywords: ['restaurante', 'lanchonete', 'padaria', 'ifood', 'uber eats', 'rappi'] },
  { cat: 'Transporte',      keywords: ['uber', '99', 'posto', 'combustivel', 'estacionamento'] },
  { cat: 'Saúde',           keywords: ['farmacia', 'drogaria', 'medico', 'hospital', 'laboratorio'] },
  { cat: 'Assinaturas',     keywords: ['netflix', 'spotify', 'amazon prime', 'disney', 'youtube'] },
  { cat: 'Viagem',          keywords: ['hotel', 'airbnb', 'latam', 'gol', 'azul', 'booking'] },
  // ...
];

// Classificação de modalidade
const classifyTransaction = (item) => {
  const SAVINGS_CATS = ['Investimentos', 'Poupança', 'CDB', 'Tesouro', 'Fundo'];
  if (SAVINGS_CATS.some(c => item.category?.includes(c))) {
    return item.amount > 0 ? 'savings_in' : 'savings_out';
  }
  return item.amount > 0 ? 'income' : 'expense';
};
```

---

## Funcionalidades — roadmap por prioridade

### MVP (lançamento)
- [ ] Auth (email + Google)
- [ ] Import de extratos/faturas via IA
- [ ] Dashboard com resumo mensal (receitas, despesas, saldo)
- [ ] Lista de transações com busca e filtros
- [ ] Categorização automática
- [ ] Análise comparativa (mês, trimestre, ano)

### V2 (retenção)
- [ ] Clara — consultora financeira IA
- [ ] Metas financeiras com progresso
- [ ] Detector de assinaturas recorrentes (apenas serviços conhecidos — Netflix, Spotify, academias, etc.)
- [ ] Modo multiusuário / família (compartilhamento de conta)

**Decisão de modelagem — multiusuário V2:**
Contas separadas com visão consolidada via convite. Cada usuário mantém seu próprio `user_id` e suas próprias transações. Um `family_group` vincula membros e permite uma view agregada. Nunca login compartilhado — viola isolamento de dados e RLS. Nova tabela necessária: `family_groups` + `family_members`. Escopo V2, não antecipar.

### V3 (monetização)
- [ ] Planos (Essencial / Private / Family Office)
- [ ] Pluggy / Open Banking para sincronização automática
- [ ] Previsão de fluxo de caixa (Prophet)
- [ ] Desafios financeiros semanais

---

## Detector de assinaturas — lógica correta

O erro mais comum: tentar detectar assinaturas por recorrência genérica. Isso captura aluguel, condomínio, impostos, salário.

**Abordagem correta:**
1. Só flaggar como assinatura se a descrição contém nome de serviço conhecido
2. Confirmar recorrência em 2+ meses
3. Variação de valor ≤ 25%
4. Deixar o usuário confirmar/rejeitar cada candidata (salvar em tabela `subscriptions`)

```typescript
// Exemplo de lista de serviços conhecidos
const KNOWN_SERVICES = [
  'netflix', 'spotify', 'amazon prime', 'disney', 'hbo', 'globoplay',
  'apple.com/bill', 'google one', 'icloud', 'dropbox', 'adobe',
  'smartfit', 'bluefit', 'gympass', 'totalpass',
  'kiwify', 'hotmart', 'coursera', 'udemy',
  'claro ', 'vivo ', 'tim ', 'oi ',
  'assinatura', 'subscription',
];
```

---

## Dockerfile — configuração correta para Vite + Coolify

```dockerfile
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci

# CRÍTICO: VITE_ vars precisam de ARG + ENV para serem injetadas no bundle
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY
ARG VITE_SUPABASE_SCHEMA

ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ENV VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY
ENV VITE_SUPABASE_SCHEMA=$VITE_SUPABASE_SCHEMA

COPY . .
RUN npm run build

FROM nginx:alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 3000
CMD ["nginx", "-g", "daemon off;"]
```

**Lições aprendidas sobre Coolify:**
- Marcar **"Available at Buildtime"** para TODAS as variáveis `VITE_`
- Após salvar env vars, sempre fazer **Redeploy** (não Restart)
- Se o bundle hash não mudar após redeploy: verificar se há CDN (Cloudflare) cacheando o `index.html`
- **Cloudflare**: configurar regra para não cachear HTML (`Cache-Control: no-store` no `index.html`)
- NÃO usar Tailwind CSS via CDN em produção — instalar como PostCSS plugin
- Para URLs fixas de serviços internos (Edge Functions), hardcode no código é mais seguro que env var (evita cache Docker)

---

## nginx.conf (SPA routing)

```nginx
server {
  listen 3000;
  root /usr/share/nginx/html;
  index index.html;

  location / {
    try_files $uri $uri/ /index.html;
  }

  # Não cachear HTML para garantir deploys
  location ~* \.html$ {
    add_header Cache-Control "no-cache, no-store, must-revalidate";
  }

  # Cachear assets estáticos (JS/CSS com hash no nome)
  location ~* \.(js|css|png|jpg|svg|ico|woff2)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
  }
}
```

---

## Variáveis de ambiente necessárias

```env
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
VITE_SUPABASE_SCHEMA=app

# Stripe (monetização)
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_...

# Edge Function secrets (setar no Supabase Dashboard)
ANTHROPIC_API_KEY=sk-ant-...
```

---

## Armadilhas a evitar

| Problema | Causa | Solução |
|---|---|---|
| Bundle nunca atualiza em produção | CDN cacheando `index.html` | Configurar nginx para não cachear HTML |
| Edge Function com erro 500 | `SUPABASE_SERVICE_ROLE_KEY` não disponível | É injetada automaticamente — não setar como custom secret |
| Tela branca ao clicar em componente | Hook chamado fora do componente (ex: `useApp()`) | Sempre declarar hooks dentro do componente |
| Assinaturas detectando aluguel/impostos | Algoritmo baseado em recorrência pura | Filtrar por lista de serviços conhecidos + confirmação do usuário |
| Import de extrato falhando | n8n trial expirado | Migrar para Supabase Edge Function com Claude |
| Chat IA respondendo "de mãos atadas" | Prompt não instrui comportamento com dados zerados | Adicionar regra explícita no system prompt |
