# Banco de Dados - Supabase (CRT Markup)

## 1) Tabelas Atuais

- `workspaces`
- `workspace_members`
- `sites`
- `comments`
- `site_shares`
- `profiles`

## 2) Resumo por Tabela

## `sites`

- representa projetos (URL base de revisão);
- chave unica: `(url, created_by)`;
- relacionamento opcional com `workspace_id`;
- ownership por `created_by`.

## `comments`

- pertence a `site_id`;
- coordenadas (`position_x`, `position_y`) em percentual;
- status: `open | resolved`;
- metadados: `author_name`, `comment_number`, `viewport`, `timestamp`.

## `profiles`

- extensao do `auth.users`;
- `user_id` unico;
- `name` obrigatorio, `phone` opcional.

## `site_shares`

- compartilhamento de projetos com convidados (guest_email, guest_user_id, invite_token, invited_by);
- `invite_token` (TEXT UNIQUE): token para links de convite (Progressive Disclosure); gerado em `addGuest`, usado em `/editor?inviteToken=X&url=Y`;
- backfill: shares antigos sem token recebem um ao reenviar convite via `send-invite`.

## `workspaces` e `workspace_members`

- base para colaboracao multi-tenant;
- roles previstas: `owner | admin | member`.

## 3) RLS (Row Level Security)

- habilitado para `workspaces`, `workspace_members`, `sites`, `comments`, `profiles`;
- donos de sites acessam seus próprios recursos; políticas de insert/update/delete por `auth.uid()`;
- **guests autenticados** (`site_shares.guest_user_id = auth.uid()`) têm acesso expandido a `comments`:
  - **SELECT:** pode ler comentários dos sites a que foi convidado;
  - **INSERT:** pode criar comentários (com `created_by = auth.uid()`);
  - **UPDATE:** pode atualizar comentários dos sites a que foi convidado (toggle de status);
- migration aplicada: `supabase/migrations/20250308_guest_rls_policies.sql`.

## 4) Indices Existentes

- `idx_sites_created_by`
- `idx_comments_site_id`
- `idx_comments_status`
- `idx_comments_created_by`
- `idx_workspace_members_user_id`
- `idx_site_shares_invite_token`

## 5) Regras de Negocio Persistidas

- comentario sempre vinculado a um `site_id` valido;
- `created_by` obrigatorio em `sites` e `comments`;
- viewport controlada por check constraint (`desktop|mobile`).

## 6) Lacunas para Proximas Fases

- `project_invites`, `comment_replies`, `comment_snapshots`, `activity_events` existem no plano e devem ser confirmadas/ativadas conforme fase;
- estrategia de auditoria (quem alterou status e quando);
- historico de mudancas de conteudo de comentario.

## 7) Comandos Operacionais Recomendados

- manter `supabase/schema.sql` como referencia consolidada;
- usar migrations incrementais para alteracoes futuras;
- validar politicas RLS a cada feature nova.
