# 0006: Gestionar la autenticación mediante un BFF

- Estado: Aceptado
- Fecha: 2026-08-25
- Reemplaza: [ADR 0003](./0003-cognito-como-fuente-de-identidad.md)

## Contexto

El frontend se desplegará en Vercel y el backend en AWS. Permitir que el
navegador gestione directamente los tokens de Cognito aumenta su exposición y
acopla la aplicación web al proveedor de identidad.

## Decisión

Las operaciones de registro, acceso y cierre de sesión se realizarán mediante
Lambdas BFF separadas por operación. Estas
serán los únicos clientes de Cognito y guardarán el refresh token en una tabla
de sesiones de DynamoDB.

El navegador recibirá únicamente un identificador de sesión aleatorio en una
cookie `HttpOnly`, `Secure` y `SameSite=Lax`. En DynamoDB se almacenará su hash,
nunca el identificador original. Las peticiones que modifican estado validarán
el encabezado `Origin`.

La aplicación Nuxt reenviará `/api/*` a API Gateway para mantener frontend y
API bajo el mismo origen, también cuando se despliegue en Vercel. El
identificador `sub` de Cognito seguirá siendo el propietario estable de los
datos de negocio; no se duplicarán usuarios en DynamoDB.

## Consecuencias

- Los tokens de Cognito no quedan accesibles al código del navegador.
- El backend puede revocar sesiones y centralizar las reglas de autenticación.
- Cada operación puede desplegarse, escalarse y observarse por separado.
- DynamoDB necesita una tabla adicional con TTL para las sesiones.
- El frontend depende del BFF para conocer y cambiar el estado de autenticación.
- En desarrollo se usa DynamoDB Local en memoria para mantener las Lambdas
  aisladas sin escribir datos en AWS.
