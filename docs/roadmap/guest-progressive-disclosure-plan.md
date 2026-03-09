# Plano Técnico: Guest Progressive Disclosure (Time-to-Value)

**Objetivo:** O cliente convidado vê o projeto PRIMEIRO em modo leitura e só faz login no momento em que tentar comentar.

**Stack:** Next.js App Router, Supabase, Tailwind. Usa `site_shares` (não `workspace_members`) para convites.

---

## 1. INTEGRAÇÃO DO CONVITE (URL)

### Estrutura da URL

```
https://markup.carthagos.com/editor?inviteToken={TOKEN}&url={SITE_URL}
```

- `inviteToken`: token único por share (armazenado em `site_shares.invite_token`)
- `url`: URL do site a revisar (ex: `https://cliente.webflow.io`)

**Alternativa com siteId no path:** `/editor/[siteId]?inviteToken=TOKEN` — exige rota dinâmica e lookup do site.

**Escolha:** Manter `/editor?inviteToken=X&url=Y` para compatibilidade com proxy existente.

### Migration: `invite_token` em `site_shares`

```sql
ALTER TABLE site_shares ADD COLUMN IF NOT EXISTS invite_token TEXT UNIQUE;
CREATE INDEX IF NOT EXISTS idx_site_shares_invite_token ON site_shares(invite_token);
```

- Ao criar share (`addGuest`), gerar `crypto.randomUUID()` e salvar em `invite_token`.
- O token é único e não expira (opcional: adicionar `invite_token_expires_at` no futuro).
- **Backfill:** Shares antigos (criados antes da migration) têm `invite_token` null. Em `send-invite`, quando o share não tem token, a API gera um novo via `crypto.randomUUID()`, atualiza o registro com Service Role e usa no link. Assim o link nunca aponta para a Home.

### ShareModal: botão Resend

- Cada guest na lista tem um botão "Resend" (ícone Send).
- Permite reenviar o convite a guests existentes (útil para shares com token null antes do backfill).
- Chama a mesma API `POST /api/send-invite` com `siteId`, `guestEmail`, `siteUrl`, `inviteToken` (opcional).

---

## 2. GUEST VIEW (Modo Leitura no Editor)

### Fluxo

1. Usuário abre `/editor?inviteToken=X&url=Y` **sem sessão**.
2. Server Action ou API valida o token e retorna `{ site, comments }` usando **Service Role Key** (bypass RLS).
3. Editor renderiza: iframe + pins + sidebar em **somente leitura** (sem botões de editar/resolver/deletar).
4. Mostrar **Welcome Toast**: "Você foi convidado para revisar este projeto. Clique em qualquer lugar para comentar."

### API: `GET /api/invite/validate?token=X`

- Usa `SUPABASE_SERVICE_ROLE_KEY`.
- Busca `site_shares` onde `invite_token = X`.
- Retorna `{ siteId, url, comments }` ou 404.

### Ajuste no Editor

- Se `inviteToken` presente e válido **e** `!userId`: modo guest (read-only).
- Se `inviteToken` presente **e** `userId`: após login, modo normal (pode comentar).

---

## 3. AUTH INTERCEPTOR (Fricção Tática)

### Lógica no `CARTHAGOS_CLICK`

```ts
if (event.data.type === 'CARTHAGOS_CLICK') {
  if (!userId && inviteToken) {
    // Guest: interceptar — abrir AuthModal em vez do composer
    setPendingClickForAuth({ x, y, selector, ... });
    setAuthModalOpen(true);
    return;
  }
  if (!userName) setShowNameModal(true);
  else setIsAddingComment(true);
}
```

- **Não** abrir o composer de comentário.
- Abrir `AuthModal` (apenas Sign In / Sign Up por Email — sem Google).
- Após auth bem-sucedida: fechar modal, chamar `processSilentJoin`, permitir o comentário.

---

## 4. AUTENTICAÇÃO E SILENT JOIN

### processSilentJoin (Server Action)

- **Input:** `inviteToken`, `userId`, `userEmail`
- **Lógica:** Com Service Role, atualizar `site_shares`:
  ```sql
  UPDATE site_shares
  SET guest_user_id = $userId
  WHERE invite_token = $inviteToken
    AND LOWER(guest_email) = LOWER($userEmail)
    AND guest_user_id IS NULL;
  ```
- Garante que o usuário fica vinculado ao share após login/signup.

### SIGN IN (usuário existente)

1. Submit do form → `signInWithPassword`.
2. Sucesso → chamar `processSilentJoin(inviteToken)`.
3. Fechar modal, permitir comentário (reutilizar `pendingClick`).

### SIGN UP (usuário novo)

1. `signUp` com `emailRedirectTo`:
   ```
   ${appUrl}/auth/callback?inviteToken=X&url=Y
   ```
2. Usuário confirma email → Supabase redireciona para `/auth/callback`.
3. Callback: trocar código por sessão, chamar `processSilentJoin`, redirecionar para `/editor?inviteToken=X&url=Y`.

### AuthModal (Email apenas)

- Variante do `auth-form-1.tsx` que:
  - Mostra apenas Sign In e Sign Up (sem Google).
  - Aceita `onSuccess` com `{ userId, email }` para chamar `processSilentJoin`.
  - Aceita `inviteToken` para passar ao callback no sign up.

---

## 5. DASHBOARD "SHARED WITH ME"

O dashboard já carrega projetos compartilhados via `site_shares`:

```ts
supabase.from('site_shares').select('sites(...)').eq('guest_user_id', uid)
```

Após `processSilentJoin`, `guest_user_id` fica preenchido e os projetos aparecem em "Shared with me". Nenhuma alteração estrutural necessária.

---

## 6. ARQUIVOS A CRIAR/ALTERAR

| Arquivo | Ação |
|---------|------|
| `supabase/migrations/YYYYMMDD_invite_token.sql` | Criar |
| `app/api/invite/validate/route.ts` | Criar |
| `app/api/send-invite/route.ts` | Alterar (link com inviteToken) |
| `actions/share.ts` | Alterar (gerar invite_token no insert) |
| `app/editor/page.tsx` | Alterar (guest mode, interceptor, toast) |
| `components/AuthModal.tsx` | Criar (Email-only, onSuccess) |
| `actions/process-silent-join.ts` | Criar |
| `app/auth/callback/page.tsx` | Criar (client page, lê hash Supabase) |
| `docs/api-contracts.md` | Atualizar (GET /api/invite/validate, POST /api/send-invite) |
| `components/ShareModal.tsx` | Alterar (botão Resend por guest) |

---

## 7. RLS E SEGURANÇA

- Validação do `inviteToken` sempre server-side (API ou Server Action).
- Service Role Key apenas em Server Actions e API routes (nunca no client).
- Token único por share; não expor dados sensíveis no token.

## 8. CONFIGURAÇÃO SUPABASE (Redirect URLs)

Para o fluxo de Sign Up com confirmação de email, adicionar em **Supabase → Authentication → URL Configuration → Redirect URLs**:

- `https://markup.carthagos.com/auth/callback`
- `http://localhost:3000/auth/callback` (desenvolvimento)
