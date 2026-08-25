# 0004: Usar Nuxt y Tailwind CSS en el frontend

- Estado: Aceptado
- Fecha: 2026-08-24

## Contexto

El frontend requiere TypeScript, una estructura modular y un framework de
estilos. También debe poder evolucionar desde las pantallas de autenticación
hacia la carga, transcripción en tiempo real e historial.

## Decisión

Usar Nuxt 4 y Vue 3 con TypeScript. Usar Tailwind CSS 4 mediante su plugin de
Vite para construir las vistas y mantener los componentes propios de la
aplicación.

## Consecuencias

- Nuxt aporta enrutado, autoimportación y convenciones compartidas para las
  vistas y composables.
- Tailwind evita incorporar una librería completa de componentes y permite
  mantener un diseño consistente con utilidades locales.
