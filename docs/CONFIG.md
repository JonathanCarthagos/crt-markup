# Configuração e Deploy

Variáveis de ambiente, serviços externos e notas de configuração.

---

## URL oficial

- **Produção:** https://markup.carthagos.com
- **Vercel:** crt-markup.vercel.app (alternativa)

---

## Variáveis de ambiente

Ver `.env.example` na raiz do projeto.

### Resumo (Vercel)

| Variável | Obrigatório | Descrição |
|----------|-------------|-----------|
| `NEXT_PUBLIC_SUPABASE_URL` | Sim | URL do projeto Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Sim | Chave anónima Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Sim* | Chave Service Role (convite guest, processSilentJoin, invite/validate) |
| `RESEND_API_KEY` | Sim | Chave API Resend (emails de convite) |
| `NEXT_PUBLIC_APP_URL` | Sim* | URL da app (ex.: https://markup.carthagos.com) |
| `RESEND_FROM_EMAIL` | Sim* | Remetente (ex.: noreply@carthagos.com) |
| `RESEND_FROM_NAME` | Não | Nome do remetente (default: CRT Markup) |

\* `SUPABASE_SERVICE_ROLE_KEY`: obrigatório para fluxo de convite (guest view, processSilentJoin, backfill de invite_token). Nunca expor no client.  
\* `NEXT_PUBLIC_APP_URL`, `RESEND_FROM_EMAIL`: obrigatórios para envio de emails a qualquer destinatário. Sem domínio verificado, Resend só envia para o dono da conta.

---

## Emails de convite (Resend)

Os emails de convite para partilha de projetos usam **Resend**.

### Configuração atual (produção)

- **Domínio verificado:** carthagos.com
- **Remetente:** noreply@carthagos.com
- **Links nos emails:** https://markup.carthagos.com

### DNS no Resend

Para verificar um domínio no Resend, adicionar no provedor DNS:

1. **DKIM (Domain Verification):** 1 registo TXT em `resend._domainkey`
2. **SPF (Enable Sending):** 1 registo MX e 1 registo TXT em `send` (subdomínio `send.carthagos.com`)

Valores exatos no painel Resend → Domains → [domínio] → Records.

### Sem domínio verificado

- Usa `onboarding@resend.dev` (domínio de teste)
- **Limitação:** Resend só envia para o email do dono da conta Resend
- Para enviar a qualquer destinatário, é obrigatório verificar domínio

---

## Supabase Redirect URLs (Auth)

Para o fluxo de convite (Sign Up com confirmação de email), adicionar em **Supabase → Authentication → URL Configuration → Redirect URLs**:

- `https://markup.carthagos.com/auth/callback`
- `http://localhost:3000/auth/callback` (desenvolvimento)

## ShareModal e timeouts

O ShareModal inclui timeouts para evitar travamentos:

- **addGuest:** 15s
- **send-invite API:** 15s
- **fetchGuests:** 10s

Em caso de timeout, o utilizador vê mensagem de erro e o botão volta ao estado normal.

---

## Vercel MCP (opcional)

Para conectar o Cursor ao projeto Vercel via MCP:

Ficheiro `.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "vercel": {
      "url": "https://mcp.vercel.com/jonathan-4779s-projects/crt-markup"
    }
  }
}
```

Substituir `jonathan-4779s-projects` pelo team slug do teu projeto na Vercel.
