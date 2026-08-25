# 0003: Usar Cognito como fuente de identidad

- Estado: Reemplazado por [ADR 0006](./0006-autenticacion-mediante-bff.md)
- Fecha: 2026-08-24

## Contexto

Solo los usuarios registrados pueden transcribir y consultar su historial. La
aplicación necesita asociar datos de DynamoDB y S3 a una identidad estable sin
mantener dos sistemas de usuarios sincronizados.

## Decisión

Usar Amazon Cognito User Pools como fuente de identidad y AWS Amplify Auth en
el frontend con una interfaz propia. El registro, inicio de sesión, confirmación
y recuperación de contraseña utilizarán únicamente el correo electrónico.

Las APIs protegidas validarán el access token y obtendrán el identificador
`sub` de sus claims. Ese `sub`, y no el correo ni un identificador enviado por
el cliente, será la clave de propietario de los datos.

No se creará inicialmente una tabla de usuarios en DynamoDB. Si aparecen datos
de dominio como plan, cuota o preferencias, se añadirá un perfil asociado al
mismo `sub`.

## Consecuencias

- Cognito gestiona credenciales, confirmación y recuperación de cuentas.
- El correo puede cambiar sin romper la relación con las transcripciones.
- Cada operación del backend debe derivar el propietario del token validado y
  nunca confiar en un `userId` recibido del frontend.
- No es necesario llamar a la API propia durante el registro.
