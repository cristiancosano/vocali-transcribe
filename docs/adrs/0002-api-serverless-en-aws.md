# 0002: Construir una API serverless en AWS

- Estado: Aceptado
- Fecha: 2026-08-24

## Contexto

La plataforma debe procesar cargas variables de transcripción y el enunciado
solicita infraestructura como código, AWS Lambda, DynamoDB y S3. Mantener un
servidor Node.js permanente añadiría operación sin aportar valor al ejercicio.

## Decisión

Usar Serverless Framework para declarar una HTTP API de API Gateway y funciones
Lambda escritas en TypeScript. Los handlers se implementarán directamente, sin
Express ni NestJS.

DynamoDB almacenará únicamente las transcripciones completadas, con sus metadatos
y texto. S3 almacenará los ficheros de audio. `serverless-offline`
proporcionará el servidor local de desarrollo.

## Consecuencias

- La infraestructura queda versionada junto al código y las unidades de
  cómputo escalan de forma independiente.
- Se paga principalmente por uso, a cambio de asumir latencia de arranque y
  límites propios de Lambda y API Gateway.
- El entorno local aproxima AWS, pero las integraciones reales deben comprobarse
  también en una cuenta de desarrollo.
- Los ficheros grandes no deben atravesar innecesariamente las Lambdas; se
  utilizarán URLs prefirmadas de S3 cuando se implemente la carga de audio.
