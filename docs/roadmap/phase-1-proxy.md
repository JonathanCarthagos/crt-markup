# Fase 1 - Proxy e Renderizacao

## Objetivo

Garantir carregamento confiavel de websites externos no editor via proxy reverso, com suporte a captura de interacoes.

## Entregaveis

- endpoint `GET /api/proxy?url=...`;
- fetch de HTML externo com timeout e redirects;
- reescrita de `src/href/style url(...)` para links absolutos;
- remocao de headers/meta restritivos de frame;
- injeção de script tracker no HTML.

## Status Atual

- implementado em `app/api/proxy/route.ts`;
- injecao de tracker funcional;
- envio de eventos de click/scroll via `postMessage`.

## Definicao de Pronto

- URL valida carrega em iframe sem quebrar assets principais;
- tracker injeta com sucesso em paginas com `<body>` ou fallback em `<html>`;
- erro de URL invalida retorna `400`;
- erro de fetch retorna `500` com payload padrao.

## Testes da Fase

- URLs com e sem protocolo;
- paginas com assets relativos;
- pagina com scroll longo;
- validacao de `CARTHAGOS_CLICK` e `CARTHAGOS_SCROLL`.

## Riscos

- sites com politicas anti-bot/cookies agressivas;
- dependencias de scripts de terceiros com bloqueio CORS;
- variacao de DOM entre requests.
