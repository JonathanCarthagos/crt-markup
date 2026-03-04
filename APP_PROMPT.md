# CRT Markup — Prompt de Contexto da Aplicação

Este documento descreve tudo que a aplicação **CRT Markup** já faz. Use-o como contexto para desenvolvimento, onboarding ou documentação.

---

## Visão geral

**CRT Markup** é uma ferramenta de feedback visual para websites. Permite que agências e clientes coletem comentários diretamente em páginas ao vivo, com anotações clicáveis, status (aberto/resolvido) e colaboração em tempo real. A stack é **Next.js 16**, **Supabase** (auth + banco) e **Tailwind CSS**.

**Cor primária:** `#FE4004`  
**Fonte:** Inter

---

## Rotas e páginas

### 1. Home (`/`)

- **Landing page** com hero, input de URL e seção de features
- **Input de URL** para iniciar revisão: aceita URL com ou sem `https://`
- **Usuário não logado:** botão "Sign In" no header; ao submeter URL, abre modal de autenticação
- **Usuário logado:** redireciona automaticamente para `/dashboard`
- **Logo** clicável: volta para home
- **Modal de auth** (Sign In / Sign Up / Forgot Password) ao clicar em Sign In
- **Modal de limite** quando o usuário atinge o limite de projetos (2 no plano free)
- **Features** exibidas: click-to-comment, colaboração em tempo real, links compartilháveis, sem setup

### 2. Dashboard (`/dashboard`)

- **Protegida:** requer login; redireciona para `/` se não autenticado
- **Cards de estatísticas:**
  - Total de projetos
  - Comentários abertos (open)
  - Comentários resolvidos (resolved)
- **Grid de projetos** (cards clicáveis):
  - Domínio e URL do site
  - Contagem de comentários open/resolved por projeto
  - Data de atualização
  - Botão de deletar (hover) com confirmação
- **Botão "New project"** abre formulário inline para adicionar URL
- **Limite do plano free:** exibe "2/2 projects" quando no limite
- **Estado vazio** quando não há projetos, com CTA para adicionar o primeiro
- **Logo** clicável: volta para home
- **UserMenu** no header (avatar, nome, Sign Out; sem link Dashboard pois já está na página)

### 3. Editor (`/editor?url=...`)

- **Requer URL** via query param `url`; sem URL mostra mensagem de erro
- **Requer login**; redireciona para home se não autenticado
- **Limite de projetos:** bloqueia criação do 3º projeto para usuários free
- **Preview do site** em iframe via proxy (`/api/proxy?url=...`)
- **Toggle Desktop/Mobile** para alternar viewport (375px mobile / full desktop)
- **Comentários:**
  - Clique no site abre modal para adicionar comentário
  - Pins numerados no canvas (posição em % do documento)
  - Status: `open` (vermelho) ou `resolved` (verde)
  - Sidebar com abas Active / Resolved
  - Marcar como resolvido / Reabrir
  - Deletar comentário
  - Ao clicar em um comentário na sidebar, scroll automático no iframe até o pin
- **Nome do autor:** modal "What's your name?" na primeira vez; salva em `localStorage` e em `author_name` no comentário
- **Logo** clicável: volta para home
- **UserMenu** no header (avatar, nome, Dashboard, Sign Out)

### 4. Reset Password (`/reset-password`)

- **Fluxo de recuperação** via hash na URL (Supabase magic link)
- **Formulário de nova senha** quando link válido
- **Formulário de reenvio** quando link inválido/expirado (com cooldown de 60s)
- **Tratamento de erros:** `otp_expired`, `access_denied`, rate limit
- **Redirecionamento:** home → reset-password quando hash indica recovery flow

---

## Autenticação

- **Supabase Auth** (email/senha + OAuth Google)
- **Sign In:** email + senha
- **Sign Up:** nome (obrigatório), email, senha, termos
- **Forgot Password:** envia email de reset
- **Google Sign In:** OAuth com redirect para origem
- **Perfil:** tabela `profiles` (user_id, name, phone); nome usado no UserMenu e em comentários
- **Criação automática de profile** com `full_name` do Google ao primeiro login

---

## Header e navegação

- **Logo + "CRT Markup"** em todas as páginas: link para `/`
- **UserMenu** (quando logado):
  - Avatar (foto Google ou iniciais)
  - Nome do usuário
  - Dropdown: Dashboard, Sign Out
  - Na dashboard: sem link Dashboard no dropdown
- **Sign In** (quando não logado) na home

---

## API

### `GET /api/proxy?url=...`

- **Proxy de HTML** para exibir sites em iframe (evita X-Frame-Options)
- Usa **Cheerio** para parse e **Axios** para fetch
- **Reescreve** `src`, `href` e `url()` em `style` para URLs absolutas
- **Remove** meta tags de segurança (X-Frame-Options, CSP)
- **Injeta script tracker** no final do `<body>`:
  - Captura cliques e envia `CARTHAGOS_CLICK` (x, y em %, selector)
  - Envia `CARTHAGOS_SCROLL` (scrollX, scrollY, docWidth, docHeight)
  - Escuta `CARTHAGOS_SCROLL_TO` para scroll programático
  - Usa `postMessage` para comunicação com o parent

---

## Banco de dados (Supabase)

### Tabelas principais

- **sites:** id, url, created_by, workspace_id, screenshot_url, created_at, updated_at  
  - UNIQUE (url, created_by)
- **comments:** id, site_id, position_x, position_y, selector, content, status (open/resolved), author_name, comment_number, viewport (desktop/mobile), created_by, timestamps
- **profiles:** user_id, name, phone
- **workspaces / workspace_members:** estrutura presente, ainda não usada no fluxo principal

### RLS

- Usuários veem apenas seus próprios sites e comentários
- Políticas para SELECT, INSERT, UPDATE, DELETE em sites e comments

---

## Limites e regras de negócio

- **FREE_PROJECT_LIMIT = 2** (em `lib/constants.ts`)
- Bloqueio ao tentar criar 3º projeto (home, dashboard, editor)
- Modal "Free plan limit reached" na home
- Tela "Free plan limit reached" no editor

---

## Componentes UI

- **Auth** (`auth-form-1.tsx`): Sign In, Sign Up, Forgot Password com animações (Framer Motion)
- **UserMenu** (`user-menu.tsx`): avatar, dropdown com Dashboard e Sign Out
- **DropdownMenu** (Radix): usado no UserMenu
- **Button, Input, Label, Checkbox, Separator, Card** (Shadcn-style)

---

## Fluxos principais

1. **Novo usuário:** Home → Sign In/Sign Up → Dashboard (redirect)
2. **Adicionar projeto:** Dashboard → New project → URL → Editor
3. **Revisar site:** Editor → clicar no site → nome (se necessário) → comentário → salvar
4. **Gerenciar comentários:** marcar resolvido, reabrir, deletar
5. **Recuperar senha:** link no email → /reset-password → nova senha → home

---

## Tecnologias

- Next.js 16 (App Router)
- React 19
- Supabase (Auth, PostgreSQL)
- Tailwind CSS
- Framer Motion
- Radix UI (Dropdown, etc.)
- Lucide React (ícones)
- Cheerio, Axios
- Zod, React Hook Form

---

## Estrutura de pastas relevante

```
app/
  page.tsx          # Home
  dashboard/page.tsx
  editor/page.tsx
  reset-password/page.tsx
  api/proxy/route.ts
components/
  user-menu.tsx
  ui/auth-form-1.tsx
  ui/dropdown-menu.tsx
  ui/button.tsx, input.tsx, ...
lib/
  supabase.ts
  constants.ts
  utils.ts
supabase/
  schema.sql
  migrations/
types/
  index.ts         # Comment, Site, ClickData
```

---

*Documento gerado para contexto da aplicação CRT Markup. Atualize conforme novas features forem implementadas.*
