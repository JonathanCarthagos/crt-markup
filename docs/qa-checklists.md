# QA Checklists - CRT Markup

## 1) Landing + Auth

- [ ] abrir home e validar header/logo/tipografia;
- [ ] abrir modal de login no botao `Sign In`;
- [ ] fechar modal clicando no `X`;
- [ ] fechar modal clicando fora do card;
- [ ] validar login com email/senha;
- [ ] validar login com Google;
- [ ] validar logout e retorno visual para estado deslogado.

## 2) Criacao de Projeto

- [ ] informar URL sem protocolo e confirmar normalizacao (`https://`);
- [ ] abrir editor com site carregado via proxy;
- [ ] validar limite free de 2 projetos;
- [ ] validar mensagem de limite quando excedido.

## 3) Comentarios

- [ ] clicar no canvas e abrir composer;
- [ ] salvar comentario e validar pin numerado;
- [ ] verificar autor e timestamp no card;
- [ ] resolver/reabrir comentario;
- [ ] deletar comentario;
- [ ] validar persistencia apos refresh.

## 4) Ancoragem e Scroll

- [ ] clicar no card da sidebar e focar pin correto;
- [ ] ancoragem e selecao visual devem ocorrer no mesmo clique;
- [ ] validar comportamento com muitos comentarios;
- [ ] validar highlight apos ancoragem.

## 5) Viewport

- [ ] criar comentario no desktop;
- [ ] alternar para mobile e garantir que pin desktop nao aparece;
- [ ] clicar em comentario mobile na sidebar e trocar viewport automaticamente;
- [ ] validar tabs Active/Resolved por viewport atual.

## 6) Regressao de Proxy

- [ ] assets relativos (css/js/img) carregam corretamente;
- [ ] links com `mailto:` e `#` nao quebram;
- [ ] pagina continua funcional em rolagem;
- [ ] `CARTHAGOS_CLICK` e `CARTHAGOS_SCROLL` chegam no parent.

## 7) Banco e RLS

- [ ] usuario A nao enxerga dados do usuario B;
- [ ] inserts de `sites/comments` com usuario autenticado funcionam;
- [ ] updates/deletes fora de ownership devem falhar.
