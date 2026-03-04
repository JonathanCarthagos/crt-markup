# 🚀 Guia Rápido de Início

## Instalação Rápida

```bash
# 1. Instalar dependências
npm install

# 2. Configurar Supabase (opcional para começar)
# - Crie conta em https://supabase.com
# - Execute o SQL de supabase/schema.sql
# - Copie as credenciais para .env.local

# 3. Rodar o projeto
npm run dev
```

## Como Funciona

### 1. **Proxy Reverso** (`/api/proxy`)
- Remove headers de segurança (X-Frame-Options, CSP)
- Reescreve URLs relativas para absolutas
- Injeta script de rastreamento de cliques

### 2. **Sistema de Cliques**
- Script injetado captura cliques no iframe
- Envia coordenadas via `postMessage` para o app
- App renderiza pinos visuais sobre o iframe

### 3. **Armazenamento**
- Inicialmente: LocalStorage (funciona sem Supabase)
- Futuro: Supabase para persistência e compartilhamento

## Testando

1. Acesse `http://localhost:3000`
2. Cole uma URL (ex: `example.com`)
3. Clique no site carregado
4. Adicione um comentário
5. Veja o pino aparecer!

## Troubleshooting

### Site não carrega no iframe?
- Alguns sites bloqueiam iframes mesmo com proxy
- Tente sites mais simples primeiro (ex: example.com)

### Erro de CORS?
- O proxy deve resolver isso automaticamente
- Verifique se a URL está correta

### Comentários não aparecem?
- Verifique o console do navegador
- Certifique-se que o script foi injetado (veja no DevTools)

## Próximos Passos

- [ ] Integrar Supabase para salvar comentários
- [ ] Adicionar autenticação
- [ ] Sistema de compartilhamento de links
- [ ] Exportar relatórios em PDF
