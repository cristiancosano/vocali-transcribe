# 0005: Usar Vitest y Cypress para las pruebas del frontend

- Estado: Aceptado
- Fecha: 2026-08-24

## Contexto

El enunciado propone Jest para las pruebas unitarias y Cypress para E2E. Jest
requiere transformadores adicionales para los componentes Vue, mientras que
Nuxt ya está construido sobre Vite.

## Decisión

Usar Vitest para las pruebas unitarias y de componentes, y Cypress para los
recorridos E2E ejecutados contra la aplicación completa.

## Consecuencias

- Vitest reutiliza el entorno de Vite y simplifica las pruebas de componentes
  Vue y módulos TypeScript.
- Cypress permite comprobar los recorridos principales en la aplicación
  completa desde el navegador.
- Se evita mantener la configuración y dependencias de Jest en paralelo.
- Cypress requiere levantar la aplicación antes de ejecutar las pruebas E2E.
