# CRT Markup

Professional visual feedback tool for websites - Similar to Markup.io / FreeMarkup.

## 🚀 Tecnologias

- **Next.js 16** (App Router)
- **React 19**
- **TypeScript**
- **Tailwind CSS**
- **Supabase** (PostgreSQL + Auth)
- **Cheerio** (Manipulação de HTML)
- **Axios** (HTTP Client)

## 📋 Pré-requisitos

- Node.js 18+ 
- npm ou yarn
- Conta no Supabase (gratuita)

## 🛠️ Instalação

1. **Clone o repositório e instale as dependências:**

```bash
npm install
```

2. **Configure o Supabase:**

   - Crie um projeto no [Supabase](https://supabase.com)
   - Execute o SQL do arquivo `supabase/schema.sql` no SQL Editor do Supabase
   - Execute também `supabase/migrations/20250227_profiles.sql` para a tabela de perfis
   - Copie a URL do projeto e a chave anônima
   - Para login com Google: Authentication → Providers → Google → habilite e configure Client ID/Secret do Google Cloud Console

3. **Configure as variáveis de ambiente:**

```bash
cp .env.example .env.local
```

Edite `.env.local` e adicione suas credenciais do Supabase:

```
NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua-chave-anon
```

4. **Execute o servidor de desenvolvimento:**

```bash
npm run dev
```

Acesse [http://localhost:3000](http://localhost:3000)

## 🏗️ Arquitetura

### FASE 1: Proxy Reverso
A API Route `/api/proxy` funciona como um proxy reverso que:
- Baixa o HTML do site alvo
- Remove headers de segurança (X-Frame-Options, CSP)
- Reescreve URLs relativas para absolutas
- Injeta o script `tracker.js` para capturar cliques

### FASE 2: Comunicação Iframe ↔ App
O script injetado captura cliques e envia coordenadas via `postMessage` para o app principal, que renderiza pinos visuais.

### FASE 3: Banco de Dados
Supabase armazena:
- **Sites**: URLs dos projetos
- **Comments**: Comentários com posição, seletor CSS e conteúdo

### FASE 4: Interface
- Landing page com formulário de URL
- Editor com canvas (iframe) e sidebar de comentários
- Toggle entre viewport desktop/mobile

## 📚 Documentação Estruturada

Para documentação completa por etapa e visão de produto:

- `docs/README.md`
- `docs/PRD.md`
- `docs/roadmap/phase-1-proxy.md`
- `docs/roadmap/phase-2-feedback.md`
- `docs/roadmap/phase-3-data-auth.md`
- `docs/roadmap/phase-4-ui-ux.md`

## 📝 Uso

1. Na landing page, cole a URL do site que deseja marcar
2. O site será carregado em um iframe
3. Clique em qualquer lugar do site para adicionar um comentário
4. Digite seu feedback e salve
5. Os comentários aparecem como pinos vermelhos no site e na sidebar

## 🔒 Segurança

- O proxy remove headers de segurança para permitir iframe
- Row Level Security (RLS) no Supabase protege os dados
- Suporte a autenticação opcional (inicialmente funciona sem login)

## 🚧 Próximos Passos

- [x] Integração inicial com Supabase (sites + comments)
- [x] Sistema de autenticação (magic link)
- [ ] Workspaces e membros completos no app
- [ ] Compartilhamento de links públicos
- [ ] Exportação de relatórios
- [ ] Screenshots automáticos
- [ ] Notificações por email

## 📄 Licença

MIT
