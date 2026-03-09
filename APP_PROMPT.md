# CRT Markup — Prompt de Contexto da Aplicação

Este documento descreve tudo que a aplicação **CRT Markup** já faz. Use-o como contexto para desenvolvimento, onboarding ou documentação.

---

## Visão geral

**CRT Markup** é uma ferramenta de feedback visual para websites. Permite que agências e clientes coletem comentários diretamente em páginas ao vivo, com anotações clicáveis, status (aberto/resolvido) e colaboração em tempo real. A stack é **Next.js 16**, **Supabase** (auth + banco) e **Tailwind CSS**.

**Cor primária:** `#FE4004`  
**Fonte:** Inter

**URL produção:** https://markup.carthagos.com

---

## Rotas e páginas

### 1. Home (`/`)

- **Landing page** com hero, input de URL e seção de features
- **Input de URL** para iniciar revisão: aceita URL com ou sem `https://`
- **Login obrigatório no Start Review:** usuário não logado que clica "Start Review" → abre modal de auth; após login, redireciona para `/editor?url=...` com a URL que tentou revisar
- **Usuário logado:** redireciona automaticamente para `/dashboard` ao acessar a home (via `router.replace`); enquanto na home, exibe **UserMenu** (avatar, nome, link Dashboard) no header e botão "Go to Dashboard" no hero
- **Logo** clicável: volta para home
- **Modal de auth** (Sign In / Sign Up / Forgot Password) ao clicar em Sign In
- **Features** exibidas: click-to-comment, colaboração em tempo real, links compartilháveis, sem setup
- **Nota:** o controle de limite de projetos é feito no **Dashboard e Editor**, não na Home

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

### 3. Editor (`/editor?url=...` ou `/editor?inviteToken=...&url=...`)

- **URL:** via query `url` ou via `inviteToken` (API `/api/invite/validate` retorna url + siteId + comments)
- **Progressive Disclosure (convite):** com `inviteToken` válido, o guest acessa **sem login** em modo leitura
  - Welcome Toast: "Você foi convidado para revisar este projeto. Clique em qualquer lugar para comentar."
  - Ao clicar no site para comentar sem estar logado → abre **AuthModal** (apenas Email) em vez do composer
  - Após login/signup → `processSilentJoin` vincula o usuário ao share; modal fecha e o comentário pode ser feito
- **Requer login** apenas quando: sem `inviteToken` ou token inválido; mostra "Sign in required" com link para home
- **Limite de projetos:** bloqueia criação do 3º projeto para usuários free
- **Preview do site** em iframe via proxy (`/api/proxy?url=...`)
- **Toggle Desktop/Mobile** para alternar viewport (375px mobile / full desktop)
- **Comentários:**
  - Clique no site abre modal para adicionar comentário (ou AuthModal se guest não logado)
  - **Modal de comentário:** posição com clamp (top 15–80%, left 20–80%) para não cortar no topo da tela
  - Pins numerados no canvas (posição em % do documento)
  - Status: `open` (vermelho) ou `resolved` (verde)
  - Sidebar com abas Active / Resolved
  - Marcar como resolvido / Reabrir / Deletar: apenas quando logado (guest read-only não vê botões)
  - Ao clicar em um comentário na sidebar, scroll automático no iframe até o pin
- **Nome do autor:** modal "What's your name?" na primeira vez; salva em `localStorage` e em `author_name` no comentário
- **Share:** botão Share (apenas para donos do projeto) abre ShareModal para convidar usuários; botão **Resend** por guest para reenviar convite
- **Guest:** acessa via link de convite (`inviteToken` + `url`); modo leitura até fazer login ao tentar comentar
- **Logo** clicável: volta para home
- **UserMenu** no header (avatar, nome, Dashboard, Sign Out)

### 4. Reset Password (`/reset-password`)

- **Fluxo de recuperação** via hash na URL (Supabase magic link)
- **Formulário de nova senha** quando link válido
- **Formulário de reenvio** quando link inválido/expirado (com cooldown de 60s)
- **Tratamento de erros:** `otp_expired`, `access_denied`, rate limit
- **Redirecionamento:** home → reset-password quando hash indica recovery flow

### 5. Auth Callback (`/auth/callback`)

- **Callback** após confirmação de email (Sign Up no fluxo de convite)
- Supabase redireciona aqui com `?code=XXX` (PKCE) ou `#access_token=...` (implicit); supabase-js troca automaticamente na inicialização do client
- Usa `onAuthStateChange` para aguardar evento `SIGNED_IN`/`TOKEN_REFRESHED` (timeout de 10s como safety net) — **não usa delay fixo**
- Envolto em `<Suspense>` (obrigatório para `useSearchParams` no App Router)
- Se `inviteToken` e `url` na query: chama `processSilentJoin`, redireciona para `/editor?inviteToken=X&url=Y`
- Caso contrário: redireciona para `/dashboard`

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

### `POST /api/send-invite`

- **Envia email de convite** quando um utilizador é adicionado a um projeto via ShareModal (ou ao clicar Resend)
- **Body:** `{ siteId, guestEmail, siteUrl, inviteToken? }` — `inviteToken` opcional; se null no share, a API faz backfill e atualiza o registro
- **Auth:** header `Authorization: Bearer <access_token>`
- **Serviço:** Resend (`RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `RESEND_FROM_NAME`)
- **Link no email:** `{APP_URL}/editor?inviteToken={TOKEN}&url={encodeURIComponent(siteUrl)}`
- **Fallback:** se o envio falhar, o convite continua na BD e o utilizador vê toast informativo

### `GET /api/invite/validate?token=<inviteToken>`

- **Valida** `invite_token` e retorna dados para modo guest (Progressive Disclosure)
- **Usa Service Role Key** (bypass RLS)
- **Resposta 200:** `{ siteId, url, comments }` — token válido
- **Resposta 404:** token inválido

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
- **site_shares:** compartilhamento de projetos com convidados (site_id, guest_user_id, guest_email, invite_token, role); `invite_token` único por share para links de convite (Progressive Disclosure)
- **profiles:** user_id, name, phone
- **workspaces / workspace_members:** estrutura presente, ainda não usada no fluxo principal

### RLS

- Donos de sites veem/criam/editam seus próprios sites e todos os comentários dos seus sites
- **Guests autenticados** (com `site_shares.guest_user_id = auth.uid()`) também podem:
  - **SELECT** comentários do site a que foram convidados
  - **INSERT** comentários (com `created_by = auth.uid()`)
  - **UPDATE** comentários do site a que foram convidados (para toggle de status)
- Migration: `supabase/migrations/20250308_guest_rls_policies.sql`
- Políticas para SELECT, INSERT, UPDATE, DELETE em `sites` e `comments`

---

## Regras de negócio e decisões

- **Progressive Disclosure no convite:** guest acessa o editor em modo leitura via `inviteToken`; login é solicitado apenas ao tentar comentar
- **Login obrigatório no Start Review (Home):** usuário sem conta → modal de auth → após login → editor com URL pendente
- **Editor sem inviteToken e sem sessão:** mostra tela "Sign in required" com link para home

## Limites e regras de negócio

- **FREE_PROJECT_LIMIT = 2** (em `lib/constants.ts`)
- Bloqueio ao tentar criar 3º projeto (dashboard e editor)
- Tela "Free plan limit reached" no editor

## Decisões técnicas importantes

- **`inviteSiteIdRef` no editor:** ref que armazena o `siteId` carregado no modo guest via `inviteToken`. Ao fazer login, o `loadSiteAndComments` usa esse cache em vez de buscar no banco — evita race condition com `processSilentJoin` (que pode ainda não ter completado quando `onAuthStateChange` dispara `loadSiteAndComments`)
- **`onAuthSuccess` separado de `onClose`:** o `Auth` e `AuthModal` distinguem login bem-sucedido (dispara `onAuthSuccess`) de fechar o modal via X (dispara apenas `onClose`). Evita abrir o composer ou chamar `processSilentJoin` ao fechar sem logar

---

## Componentes UI

- **Auth** (`auth-form-1.tsx`): Sign In, Sign Up, Forgot Password com animações (Framer Motion)
  - Props chave: `onClose` (X-button), `onAuthSuccess` (apenas em login bem-sucedido — **separado do onClose**)
  - `onAuthSuccess` é repassado para `AuthSignIn` e `AuthSignUp`; dispara após `signInWithPassword` ou `signUp` com sessão imediata
- **AuthModal** (`AuthModal.tsx`): wrapper fino sobre `Auth` para o fluxo de convite
  - `onSuccess` (prop do modal) → mapeado para `onAuthSuccess` do `Auth`
  - X-button → apenas `onClose`, **sem** disparar `onSuccess`
- **UserMenu** (`user-menu.tsx`): avatar, dropdown com Dashboard e Sign Out
- **ShareModal** (`ShareModal.tsx`): convidar usuários para projeto (editor)
- **DropdownMenu** (Radix): usado no UserMenu
- **Button, Input, Label, Checkbox, Separator, Card** (Shadcn-style)

---

## Fluxos principais

1. **Novo usuário:** Home → Sign In/Sign Up → Dashboard (redirect)
2. **Start Review sem login:** Home → URL → Start Review → modal auth → login → Editor com URL
3. **Adicionar projeto:** Dashboard → New project → URL → Editor
4. **Revisar site:** Editor → clicar no site → nome (se necessário) → comentário → salvar
5. **Gerenciar comentários:** marcar resolvido, reabrir, deletar
6. **Compartilhar:** Editor → Share → ShareModal → convidar usuário
7. **Recuperar senha:** link no email → /reset-password → nova senha → home

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
  ShareModal.tsx
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
