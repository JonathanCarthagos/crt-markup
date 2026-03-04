# Fase 3 - Dados, Auth e Plano Free

## Objetivo

Persistir projetos/comentarios com seguranca e controle de acesso, incluindo autenticacao e regras de plano.

## Entregaveis

- integracao Supabase (`lib/supabase.ts`);
- schema com `sites`, `comments`, `profiles` e base de workspaces;
- RLS ativa nas tabelas principais;
- login social (Google) + fluxo email/senha;
- limite free de 2 projetos por usuario.

## Status Atual

- auth e persistencia ativas;
- `FREE_PROJECT_LIMIT = 2` aplicado na home/editor;
- comentarios e sites gravando em banco;
- `profiles` com `name` e `phone` (phone opcional).

## Definicao de Pronto

- usuario autenticado cria projeto e comentario com sucesso;
- usuario deslogado nao acessa fluxo de persistencia;
- dados isolados por owner via RLS;
- limite free bloqueia terceiro projeto.

## Testes da Fase

- login/logout e retomada de sessao;
- cadastro/perfil minimo;
- criacao de 1o e 2o projeto, bloqueio no 3o;
- tentativas cross-user (A acessando dados de B).

## Riscos

- inconsistencias de sessao entre tabs;
- erros de permissao por politica RLS incompleta;
- necessidade de fluxo robusto de reset de senha.
