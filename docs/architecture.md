# Arquitetura - CRT Markup

## 1) Visao Geral

Arquitetura web com Next.js no frontend/backend, Supabase para auth + dados e um proxy reverso para carregar o site alvo dentro de iframe com captura de interacoes.

## 2) Blocos Principais

- **Frontend (`app/`)**
  - `app/page.tsx`: landing, auth modal, limite free.
  - `app/editor/page.tsx`: canvas, pins, sidebar, filtros e fluxo de comentario.
- **Backend (`app/api/proxy/route.ts`)**
  - busca HTML externo, reescreve assets, injeta `tracker.js`.
- **Dados (`supabase/`)**
  - schema com `sites`, `comments`, `profiles`, `workspaces`, `workspace_members`.
- **Design System**
  - Tailwind + componentes UI + tokens em `app/globals.css`.

## 3) Fluxo Principal

1. usuario informa URL na landing;
2. app redireciona para `/editor?url=...`;
3. iframe carrega `/api/proxy?url=...`;
4. proxy injeta script de tracking e retorna HTML modificado;
5. clique no iframe envia `CARTHAGOS_CLICK` via `postMessage`;
6. editor abre composer e salva comentario no Supabase;
7. pins e sidebar atualizam no estado local com persistencia no banco.

## 4) Fluxo de Ancoragem

1. click em card da sidebar;
2. editor envia `CARTHAGOS_SCROLL_TO` para iframe;
3. iframe converte coordenadas (%) em pixels e executa `window.scrollTo`;
4. pin recebe destaque visual no canvas.

## 5) Estrategia de Coordenadas

- `position_x` e `position_y` em percentual do documento total;
- tracker envia dimensoes do documento + scroll atual;
- editor projeta pin para viewport visivel (compensando scroll interno do iframe).

## 6) Seguranca

- RLS habilitado em tabelas de dominio;
- politicas por dono/membro; guests autenticados via `site_shares` tambem podem SELECT/INSERT/UPDATE em `comments`;
- auth obrigatoria para persistencia (Progressive Disclosure: leitura sem auth via Service Role no endpoint `invite/validate`);
- proxy com cuidado para links/assets relativos.

## 9) Fluxo de Convite (Progressive Disclosure)

1. dono envia convite → `site_shares` recebe `invite_token` gerado em `addGuest`;
2. guest recebe email com link `/editor?inviteToken=TOKEN&url=URL`;
3. editor detecta `inviteToken` sem sessao → chama `GET /api/invite/validate?token=TOKEN` (Service Role, bypass RLS) → carrega site + comments;
4. guest ve o projeto em modo leitura (sem sessao); welcome toast exibido;
5. guest clica no canvas → interceptor detecta `!userId && inviteToken` → abre `AuthModal` (emailOnly);
6. **sign in existente:** `AuthSignIn.onSubmit` → `onAuthSuccess` → `processSilentJoin` (vincula `guest_user_id`) → `setUserId` explicito → fecha modal → abre compositor;
7. **sign up novo:** `signUp` com `emailRedirectTo=/auth/callback?inviteToken=X&url=Y` → email de confirmacao; callback chama `processSilentJoin` → redireciona para o editor ja autenticado;
8. `inviteSiteIdRef` no editor cacheia o `siteId` do guest mode → evita race condition quando `loadSiteAndComments` reroda apos login antes de `processSilentJoin` completar.

## 7) Escalabilidade (curto prazo)

- indices em colunas de filtro (`site_id`, `created_by`, `status`);
- separacao por `workspace_id` para evolucao multi-tenant;
- modularizacao progressiva do editor (composables/hooks).

## 8) Pontos de Atencao Tecnica

- sites externos com protecoes fortes podem falhar no proxy;
- seletor CSS nem sempre e estavel em SPAs altamente dinamicas;
- sincronizacao de scroll/resize precisa de monitoramento continuo.
