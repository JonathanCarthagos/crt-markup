# Fase 4 - UI/UX e Consistencia Visual

## Objetivo

Consolidar experiencia visual do produto com identidade da marca (`#FE4004`) e padrao de interacao previsivel.

## Entregaveis

- landing alinhada ao branding CRT;
- header consistente entre home/editor;
- modal de auth com fechamento por `X` e clique fora;
- feedback visual claro para estados (hover, selected, resolved);
- padronizacao de componentes com design tokens.

## Status Atual

- base visual consolidada em grande parte da aplicacao;
- modal auth integrado com ajustes de UX;
- tokens de tema definidos em `app/globals.css` (inclui `primary`).

## Definicao de Pronto

- fluxo visual coerente entre home, auth e editor;
- componentes com contraste adequado e acessibilidade minima;
- sem regressao nos comportamentos principais do editor.

## Testes da Fase

- revisao visual responsiva (desktop/mobile);
- validacao de estados de botao/input/modal;
- smoke test de toda jornada (home -> auth -> editor -> comentar).

## Riscos

- divergencia entre componentes custom e componentes de biblioteca;
- ajustes manuais de cor fora do token central;
- regressao de UX durante evolucao rapida de features.
