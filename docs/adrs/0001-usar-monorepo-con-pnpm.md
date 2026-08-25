# 0001: Usar un monorepo con pnpm

- Estado: Aceptado
- Fecha: 2026-08-24

## Contexto

La API y el frontend se despliegan de forma independiente, pero comparten
contratos y evolucionan como partes de un mismo producto. El alcance de la
prueba no justifica mantener repositorios, versiones y pipelines separados.

## Decisión

Mantener un único repositorio administrado con pnpm workspaces y tres paquetes
en la raíz:

- `api`: funciones Lambda e infraestructura.
- `contracts`: contratos TypeScript compartidos.
- `web`: aplicación Nuxt.

Cada paquete conserva sus propios scripts y dependencias desplegables.

## Consecuencias

- Los cambios que afectan a API, contratos y web pueden realizarse de forma
  atómica.
- Las dependencias se instalan una sola vez y los comandos pueden ejecutarse
  desde la raíz.
- Los despliegues siguen siendo independientes aunque compartan repositorio.
- Los contratos compartidos acoplan su evolución, lo que es deliberado para
  evitar duplicar tipos entre API y frontend.
- Si aumentan considerablemente los equipos o paquetes, coordinar permisos,
  pipelines y versiones independientes puede requerir herramientas adicionales;
  en ese escenario deberá reevaluarse el monorepo frente a varios repositorios.
  Este riesgo se acepta porque el proyecto tiene un alcance reducido y no se
  prevén múltiples equipos ni ciclos de publicación independientes.
