# Banco de Dados - Supabase (CRT Markup)

## 1) Tabelas Atuais

- `workspaces`
- `workspace_members`
- `sites`
- `comments`
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

## `workspaces` e `workspace_members`

- base para colaboracao multi-tenant;
- roles previstas: `owner | admin | member`.

## 3) RLS (Row Level Security)

- habilitado para `workspaces`, `workspace_members`, `sites`, `comments`, `profiles`;
- usuarios so acessam dados dos seus recursos (ou do workspace com permissao);
- politicas de insert/update/delete restritas por `auth.uid()`.

## 4) Indices Existentes

- `idx_sites_created_by`
- `idx_comments_site_id`
- `idx_comments_status`
- `idx_comments_created_by`
- `idx_workspace_members_user_id`

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
