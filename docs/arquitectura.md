# Arquitectura de la aplicación

Diagrama de contenedores de alto nivel.

```mermaid
flowchart LR
  user["Usuario"]

  subgraph vercel["Vercel"]
    web["Nuxt 4 + Tailwind CSS 4"]
    proxy["Rewrite /api/*"]
  end

  subgraph aws["AWS"]
    gateway["API Gateway HTTP API"]
    lambda["Lambdas BFF por operación<br/>Node.js + TypeScript"]
    cognito["Cognito User Pool<br/>Identidad y tokens"]
    sessions[("DynamoDB<br/>Sesiones con TTL")]
    data[("DynamoDB<br/>Historial y texto")]
    s3[("S3<br/>Audios")]
  end

  provider["Speechmatics<br/>Batch y tiempo real"]
  user -->|HTTPS y cookie HttpOnly| web
  web --> proxy --> gateway --> lambda
  lambda <-->|Registro, acceso y tokens| cognito
  lambda <-->|Sesión opaca| sessions
  lambda -->|Metadatos por Cognito sub| data
  lambda -->|Genera URLs prefirmadas| s3
  web <-->|Sube y descarga con URL prefirmada| s3
  lambda <-->|Crea y consulta transcripciones| provider
  lambda -->|Genera JWT temporal| provider
  web <-->|PCM por WebSocket + JWT temporal| provider

  classDef external fill:#fff7ed,stroke:#f97316,color:#7c2d12
  class provider external
```

Para los archivos, el navegador solicita una carga prefirmada, envía el audio
directamente a S3 y la API entrega a Speechmatics una URL de lectura temporal.
La web consulta el estado hasta que la API guarda la transcripción completada
en DynamoDB.

En tiempo real, la API genera una credencial temporal de Speechmatics y el
navegador envía PCM por WebSocket. Al detener la grabación, la web guarda el
audio en S3 y envía el texto final a la API para incorporarlo a la biblioteca.
