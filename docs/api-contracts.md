# API Contracts - CRT Markup

## 1) HTTP Endpoints

## `GET /api/invite/validate?token=<inviteToken>`

### Objetivo

Validar `invite_token` e retornar dados do site para modo guest (Progressive Disclosure). Usa Service Role Key para bypass RLS.

### Query Params

- `token` (string, obrigatório): `invite_token` do share (`site_shares.invite_token`).

### Respostas

- `200 application/json`: `{ siteId, url, comments }` — token válido;
- `404 application/json`: token inválido ou inexistente.

### Exemplo de sucesso

```json
{
  "siteId": "uuid",
  "url": "https://cliente.webflow.io",
  "comments": [{ "id": "...", "position_x": 50, ... }]
}
```

---

## `POST /api/send-invite`

### Objetivo

Enviar email de convite (Resend) com link para o editor. O link inclui `inviteToken` e `url` para o fluxo Progressive Disclosure. O guest vê o projeto primeiro (sem login); o cadastro é solicitado apenas ao clicar para comentar.

### Body (JSON)

- `siteId` (string, obrigatório)
- `guestEmail` (string, obrigatório)
- `siteUrl` (string, obrigatório)
- `inviteToken` (string, opcional): se ausente, a API busca em `site_shares` ou gera backfill quando `invite_token` é null.

### Auth

- Header `Authorization: Bearer <access_token>` (usuário dono do site).

### Link gerado

```
{APP_URL}/editor?inviteToken={TOKEN}&url={encodeURIComponent(siteUrl)}
```

Se `invite_token` for null (shares antigos), a API gera um novo token e atualiza o registro via Service Role antes de enviar.

### Respostas

- `200`: `{ success: true, id: "..." }`
- `400`: parâmetros ausentes ou email inválido
- `401`: não autenticado
- `404`: convite não encontrado (adicionar guest primeiro)
- `503`: Resend não configurado

---

## `GET /api/proxy?url=<target>`

### Objetivo

Carregar HTML externo com reescrita e injeção de tracker para uso no iframe.

### Query Params

- `url` (string, obrigatorio): dominio ou URL completa do site alvo.

### Respostas

- `200 text/html`: HTML modificado com tracker injetado;
- `400 application/json`: parametro ausente/formato invalido;
- `500 application/json`: erro de fetch/processamento.

### Erros (JSON)

```json
{ "error": "URL parameter is required" }
```

```json
{ "error": "Invalid URL format" }
```

```json
{ "error": "Failed to fetch URL", "message": "..." }
```

---

## 2) Contratos `postMessage` (iframe <-> parent)

## 2.1 Iframe -> Parent

### `CARTHAGOS_CLICK`

```ts
{
  type: "CARTHAGOS_CLICK",
  data: {
    x: number,          // percentual X no documento total
    y: number,          // percentual Y no documento total
    selector: string,   // seletor CSS aproximado
    element: string,    // tag clicada
    timestamp: number,  // epoch ms
    docWidth: number,
    docHeight: number
  }
}
```

### `CARTHAGOS_SCROLL`

```ts
{
  type: "CARTHAGOS_SCROLL",
  data: {
    scrollX: number,
    scrollY: number,
    docWidth: number,
    docHeight: number,
    viewportWidth: number,
    viewportHeight: number
  }
}
```

## 2.2 Parent -> Iframe

### `CARTHAGOS_SCROLL_TO`

```ts
{
  type: "CARTHAGOS_SCROLL_TO",
  data: {
    x: number, // percentual X salvo no comentario
    y: number  // percentual Y salvo no comentario
  }
}
```

---

## 3) Contratos de Dados (aplicacao)

## `Comment`

```ts
{
  id: string;
  site_id?: string;
  position_x: number;
  position_y: number;
  selector: string;
  content: string;
  status: "open" | "resolved";
  browser_info?: string;
  created_by?: string;
  author_name?: string;
  comment_number?: number;
  created_at?: string;
  updated_at?: string;
  timestamp?: number;
  viewport?: "desktop" | "mobile";
}
```

## `Site`

```ts
{
  id: string;
  url: string;
  created_by?: string;
  screenshot_url?: string;
  created_at?: string;
  updated_at?: string;
}
```
