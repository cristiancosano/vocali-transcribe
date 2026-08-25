# Enunciado de la prueba técnica

La empresa Vocali se encuentra construyendo un servicio en la nube que permita
a los usuarios registrados realizar transcripciones de audio.

## Funcionalidades

- **Registrarse en la plataforma:** permite darse de alta para poder utilizar
  los servicios de transcripción.
- **Autenticarse en la plataforma:** permite autenticarse en cualquier momento
  para utilizar los servicios de transcripción.
- **Cerrar sesión:** permite cerrar la sesión de un usuario autenticado.
- **Transcribir un fichero de audio:** permite subir y transcribir ficheros de
  audio de hasta 20 MB.
- **Transcribir en tiempo real:** permite transcribir lo que se va hablando a
  través del micrófono del ordenador.
- **Listar el historial de transcripciones:** debe implementar una paginación
  de 10 elementos por página.
- **Descargar transcripciones:** permite descargar cualquier transcripción del
  historial.

> Nota: se recomienda para el servicio de transcripción utilizar la capa gratuita que
> ofrecen servicios de terceros como [Speechmatics](https://www.speechmatics.com/pricing).

## Requisitos técnicos

### Backend

- NodeJS + Typescript
- Serverless framework ó Terraform
- Unidades computacionales: AWS Lambdas orquestadas por el framework de
IaC
- Base de datos: DynamoDB
- Persistencia física: AWS S3
- Autenticación: AWS Cognito
- Pruebas unitarias: Jest

### Frontend

- NuxtJS + Typescript
- Framework para vistas: Materialize ó Tailwind CSS
- Pruebas unitarias: Jest
- Pruebas E2E: Cypress

Nota: aunque no tiene que utilizar todas las herramientas que se le recomiendan, se
valora adicionalmente el uso del Stack sugerido.

## Criterios de valoración adicionales

### Arquitectura del proyecto

- Organización del código y modularidad.
- Uso adecuado del framework de IaC.

### Calidad del código

- Uso de TypeScript correctamente tipado.
- Buenas prácticas en Node.js y Nuxt.js.

### Integración con servicios de terceros

- Correcta implementación de la API de IA.
- Uso seguro de AWS Cognito.

### Despliegue

- Uso de estrategias de CI/CD.
  - Análisis estático del código fuente.
  - Pruebas y cobertura de código.
