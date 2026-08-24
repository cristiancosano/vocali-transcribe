# Vocali Transcribe

Servicio web para transcribir archivos de audio y voz en tiempo real.

## Estructura

```text
api/        Lambdas TypeScript y configuración de Serverless Framework
contracts/  Contratos compartidos entre la API y el frontend
web/        Aplicación Nuxt
```

## Requisitos

- Node.js 24
- pnpm 11
- Una cuenta de Serverless Framework

## Instalación

```bash
pnpm install
pnpm api exec serverless login
```

El inicio de sesión en Serverless solo es necesario la primera vez.

## Desarrollo

Inicia el frontend y la API local simultáneamente:

```bash
pnpm dev
```

Servicios locales:

- Web: <http://localhost:3000>
- API: <http://localhost:3030>
- Health check: <http://localhost:3030/health>
- Emulador interno de Lambda: puerto `3031`

También pueden iniciarse por separado:

```bash
pnpm web dev
pnpm api dev
```

## Comprobaciones

```bash
pnpm api check
pnpm web build
```
