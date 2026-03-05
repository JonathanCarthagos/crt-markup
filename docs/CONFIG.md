# Configuração e Deploy

Variáveis de ambiente, serviços externos e notas de configuração.

---

## Variáveis de ambiente

Ver `.env.example` na raiz do projeto.

---

## Emails de convite (Resend)

Os emails de convite para partilha de projetos usam **Resend**. Configurar `RESEND_API_KEY` no Vercel.

- **Remetente padrão:** `onboarding@resend.dev` (domínio de teste do Resend)
- **Domínio customizado:** configurar `RESEND_FROM_EMAIL` e `RESEND_FROM_NAME` quando tiver domínio verificado

---

## ⚠️ Alerta futuro: domínio customizado (Brevo/Resend)

**Quando configurar um domínio customizado** (ex.: `crtmarkup.com`):

1. **Brevo ou Resend:** adicionar e verificar o domínio no painel do provedor de email
2. **Variáveis no Vercel:**
   - `RESEND_FROM_EMAIL=noreply@seudominio.com` (ou equivalente no Brevo)
   - `RESEND_FROM_NAME=CRT Markup`
   - `NEXT_PUBLIC_APP_URL=https://seudominio.com` (para links nos emails apontarem ao domínio final)
3. **Se migrar para Brevo:** criar rota `/api/send-invite` compatível com a API do Brevo e atualizar variáveis (`BREVO_API_KEY`, etc.)

---

## URL da aplicação

- **Vercel:** `VERCEL_URL` é definida automaticamente; os links nos emails usam essa URL
- **Domínio customizado:** definir `NEXT_PUBLIC_APP_URL` para que os links nos emails usem o domínio final
