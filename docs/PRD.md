# PRD - CRT Markup

## 1) Visao do Produto

`CRT Markup` e uma plataforma de feedback visual em websites que permite comentar diretamente no site real (via proxy), com pinos posicionados no canvas, fluxo colaborativo e persistencia em Supabase.

## 2) Problema

Agencias e clientes perdem tempo com feedback difuso em print, chat e email, sem contexto visual exato do ponto alterado.

## 3) Objetivo

Centralizar a revisao visual de websites em um unico fluxo:

- abrir URL do cliente no editor;
- clicar no ponto da tela e registrar comentario;
- acompanhar status (ativo/resolvido);
- manter historico por projeto, usuario e viewport.

## 4) Publico-Alvo

- agencias digitais;
- desenvolvedores freelas;
- squads de produto/design;
- clientes que aprovam entregas web.

## 5) Metricas de Sucesso (MVP)

- tempo medio para registrar 1 feedback < 15s;
- taxa de conclusao de comentario (click -> save) > 80%;
- tempo de primeira anotacao < 60s apos abrir URL;
- erro de ancoragem de pino < 5% em cenarios validos.

## 6) Escopo

### 6.1 MVP (estado atual + consolidacao)

- proxy reverso com injeção de tracker;
- captura de click no iframe com `postMessage`;
- pinos numerados e comentarios com status;
- tabs Active/Resolved;
- filtro por viewport desktop/mobile;
- ancoragem sidebar -> pino;
- autenticacao com Supabase;
- limite free de 2 projetos por usuario;
- persistencia de projetos e comentarios no Supabase.

### 6.2 Pos-MVP

- workspaces/membros completos no app;
- convites e compartilhamento externo;
- notificacoes e automacoes;
- exportacao de relatorios;
- snapshots visuais por comentario;
- permissao granular por papel.

## 7) Requisitos Funcionais

- FR-01: usuario informa URL e entra no editor;
- FR-02: sistema injeta tracker na pagina proxiada;
- FR-03: click gera coordenada relativa e abre fluxo de comentario;
- FR-04: comentario salvo com numero sequencial, autor, status e viewport;
- FR-05: sidebar lista comentarios por status;
- FR-06: click na sidebar ancora no ponto do comentario;
- FR-07: trocar viewport filtra pins/comentarios da viewport correta;
- FR-08: login obrigatorio para persistir projeto/comentarios;
- FR-09: limite de 2 projetos no plano free.

## 8) Requisitos Nao Funcionais

- RNF-01: resposta do proxy em tempo adequado (< 10s alvo inicial);
- RNF-02: seguranca com RLS ativa em tabelas principais;
- RNF-03: UX consistente com design system da marca (`#FE4004`);
- RNF-04: rastreabilidade basica de eventos/erros no backend.

## 9) Regras de Negocio

- RB-01: cada usuario free pode criar no maximo 2 projetos;
- RB-02: comentario pertence a um site e a um usuario autenticado;
- RB-03: status permitido: `open` ou `resolved`;
- RB-04: viewport permitida: `desktop` ou `mobile`.

## 10) Restricoes e Premissas

- alguns sites podem bloquear renderizacao/recursos por CSP/cookies/anti-bot;
- conteudo dinamico pode afetar seletor e ancoragem;
- autenticacao e dados dependem da disponibilidade do Supabase.

## 11) Riscos

- regressao de ancoragem ao alterar tracker/proxy;
- divergencia visual ao misturar classes utilitarias e tokens do tema;
- mudancas de politica de websites de terceiros (CSP/X-Frame).

## 12) Critérios de Aceite do MVP

- usuario autenticado consegue criar projeto e salvar comentarios;
- pinos permanecem consistentes ao scroll interno do iframe;
- sidebar ancora no pin correto em 1 clique;
- tabs Active/Resolved refletem status real;
- viewport desktop/mobile respeita visibilidade dos pins.

## 13) Dependencias

- Next.js App Router;
- Supabase Auth + Postgres + RLS;
- Axios + Cheerio no proxy;
- Tailwind + componentes UI.

## 14) Decisoes de Produto em Aberto

- modelo final de planos alem do free;
- politica de compartilhamento publico/privado;
- SLA alvo e limites operacionais do proxy;
- estrategia de notificacoes (email/in-app).
