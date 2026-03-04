# Documentacao do Projeto

Este diretorio concentra a documentacao oficial do `CRT Markup`.

## Arquivos Principais

- `PRD.md`: documento de produto (escopo, objetivos, requisitos e aceite);
- `architecture.md`: arquitetura tecnica consolidada;
- `api-contracts.md`: contratos HTTP e `postMessage`;
- `db-schema.md`: modelo de dados, RLS e regras;
- `qa-checklists.md`: checklist funcional e de regressao.

## Roadmap por Fase

- `roadmap/phase-1-proxy.md`
- `roadmap/phase-2-feedback.md`
- `roadmap/phase-3-data-auth.md`
- `roadmap/phase-4-ui-ux.md`

## Como Evoluir Esta Documentacao

1. ao iniciar feature, atualizar PRD + fase correspondente;
2. ao alterar payload/evento, atualizar `api-contracts.md`;
3. ao alterar schema/politica, atualizar `db-schema.md`;
4. antes de merge, executar `qa-checklists.md`.
