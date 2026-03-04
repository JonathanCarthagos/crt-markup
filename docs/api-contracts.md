# API Contracts - CRT Markup

## 1) HTTP Endpoint

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
