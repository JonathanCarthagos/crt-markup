# Fase 2 - Sistema de Feedback

## Objetivo

Converter cliques no site proxiado em feedback estruturado, com pinos no canvas e navegacao por comentarios.

## Entregaveis

- captura de click no iframe;
- composer de comentario no canvas;
- pinos numerados com tooltip;
- sidebar com cards de comentario;
- ancoragem sidebar -> pin;
- tabs `Active` e `Resolved`;
- separacao por viewport desktop/mobile.

## Status Atual

- implementado em `app/editor/page.tsx`;
- pinos posicionados por coordenadas percentuais + ajuste por scroll interno;
- ancoragem por `CARTHAGOS_SCROLL_TO` funcionando.

## Definicao de Pronto

- comentario salvo aparece no canvas e na sidebar;
- 1 clique no card faz ancoragem e selecao visual;
- pinos ficam consistentes durante scroll da pagina proxiada;
- status open/resolved atualiza em tempo real local.

## Testes da Fase

- comentario em regioes diferentes da pagina;
- comportamento com muitos comentarios;
- hover tooltip e acoes de card (resolve/delete);
- troca de viewport e visibilidade correta de pins.

## Riscos

- drift de posicao em layouts responsivos muito dinamicos;
- seletor CSS pouco estavel em SPAs;
- sobreposicao visual de pinos em densidade alta.
