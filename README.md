# Vocali Transcribe

Servicio web para transcribir archivos de audio y voz en tiempo real.
Incluye autenticación mediante Cognito, historial paginado y
descarga del audio y el texto de cada transcripción.

## Estructura

```text
api/        Lambdas TypeScript y configuración de Serverless Framework
contracts/  Contratos compartidos entre la API y el frontend
web/        Aplicación Nuxt
docs/       Arquitectura, criterios de aceptación y decisiones técnicas
```

## Requisitos

- Node.js 24
- pnpm 11
- Docker para DynamoDB Local
- Credenciales de AWS y una cuenta de Serverless Framework para desplegar
- Un User Pool de Cognito con un cliente que permita `ALLOW_USER_PASSWORD_AUTH`

## Instalación

```bash
pnpm install
cp api/.env.example api/.env
cp web/.env.example web/.env
pnpm api exec serverless login
```

Configura en `api/.env` el ID del cliente de Cognito, su secreto,
y `SPEECHMATICS_API_KEY`. En `web/.env`, `NUXT_API_ENDPOINT` indica la API que
recibe las peticiones reenviadas desde `/api`. Estas credenciales nunca se
exponen al frontend. El inicio de sesión en Serverless solo es necesario la
primera vez.

## Desarrollo

Inicia el frontend y la API local simultáneamente:

```bash
pnpm dev
```

Servicios locales:

- Web: <http://localhost:3000>
- API: <http://localhost:3030>
- Emulador interno de Lambda: puerto `3031`

La API levanta DynamoDB Local en el puerto `8000` y crea las tablas de sesiones
y transcripciones al utilizarlas por primera vez. El contenedor usa
almacenamiento en memoria. S3, Cognito y Speechmatics siguen siendo
integraciones reales.

También pueden iniciarse por separado:

```bash
pnpm web dev
pnpm api dev
```

## Comprobaciones

```bash
pnpm run check
pnpm run test
pnpm run test:coverage
pnpm web build
```

`check` ejecuta ESLint y la comprobación estricta de tipos de la API y la web.
`test:coverage` ejecuta las pruebas unitarias, muestra la cobertura y falla si
esta cae por debajo de los umbrales configurados. Los informes HTML se guardan
en `api/coverage/` y `web/coverage/`.

Para las pruebas E2E, inicia la web y ejecuta Cypress en otro terminal:

```bash
NUXT_API_ENDPOINT=http://localhost:3030 pnpm web dev
pnpm web test:e2e
```

La pipeline de GitHub Actions repite automáticamente estas comprobaciones,
incluido el E2E, en cada `push` y pull request.

## Despliegue

Despliega primero la API:

```bash
pnpm api deploy
```

Para desplegar la web en Vercel, selecciona `web` como directorio de la
aplicación y configura `NUXT_API_ENDPOINT` con el endpoint de API Gateway. En
la API, `WEB_ORIGIN` debe contener el origen público de la web para permitir la
cookie de sesión y validar las peticiones que modifican estado.
