# Criterios de aceptación

Estos criterios definen cuándo Vocali Transcribe puede considerarse terminada.
Derivan del [enunciado](./enunciado.md) y de las decisiones recogidas en los
[ADR](./adrs/README.md).

## Autenticación

### CA-01. Registro

- Una persona no autenticada puede registrarse con correo electrónico y
  contraseña desde un formulario propio de la aplicación.
- Los datos inválidos se rechazan indicando el campo que debe corregirse, sin
  revelar detalles de infraestructura o implementación.
- Cuando Cognito solicita código de confirmación, la persona recibe el código por mail y
  puede introducirlo en la aplicación para completar el registro.

### CA-02. Inicio de sesión

- Una cuenta confirmada puede iniciar sesión con sus credenciales.
- Unas credenciales incorrectas producen un mensaje genérico y no permiten
  distinguir si el correo existe.
- Tras iniciar sesión, el navegador recibe una cookie de sesión y puede acceder
  a las páginas protegidas.

### CA-03. Sesión y cierre de sesión

- Los tokens de Cognito nunca se entregan al código del navegador.
- La cookie de sesión es `HttpOnly`, `Secure` y `SameSite=Lax` en producción; en
  DynamoDB solo se almacena el hash de su identificador.
- Mientras la sesión se encuentra iniciada, el usuario no puede acceder a las
  páginas de inicio de sesión o registro. En esos casos, se redirige a la
  página principal de la aplicación.
- Una sesión ausente, inválida o caducada no permite acceder a recursos
  protegidos.
- Al cerrar sesión se revoca el refresh token, se elimina la sesión de DynamoDB,
  se caduca la cookie y se vuelve al inicio de sesión.

## Transcripción de ficheros

### CA-04. Selección y carga

- Una persona autenticada puede seleccionar un fichero de audio de hasta 20 MB.
- Un fichero que no sea de audio o que supere 20 MB se rechaza antes de iniciar
  la transcripción con un mensaje comprensible.
- El fichero se carga directamente en S3 mediante una URL prefirmada y no
  atraviesa el cuerpo de una Lambda.

### CA-05. Procesamiento

- Durante la carga y el procesamiento, la interfaz muestra el progreso sin crear
  registros parciales en DynamoDB.
- Solo al completarse se crea la transcripción con su texto y se asocia al `sub`
  de Cognito de la persona autenticada.
- Un fallo del proveedor se muestra sin exponer credenciales ni detalles internos
  y no crea una transcripción en el historial.

## Seguridad y persistencia

### CA-06. Autorización y aislamiento

- Todas las operaciones de transcripción, historial y descarga requieren una
  sesión válida.
- El backend obtiene el propietario desde la sesión y el `sub` de Cognito; nunca
  confía en un identificador de usuario enviado por el frontend.

### CA-07. Almacenamiento

- DynamoDB almacena las sesiones, el historial y el texto de las transcripciones.
- S3 almacena los audios sin hacerlos públicos.
- El rol de las Lambdas se limita a las operaciones de DynamoDB y S3 y a los
  recursos declarados por el servicio.

## Transcripción en tiempo real

### CA-08. Grabación y transcripción

- Una persona autenticada puede iniciar y detener una grabación desde el
  navegador y ve el texto parcial mientras habla.
- El navegador recibe una credencial temporal de Speechmatics; la clave
  permanente del proveedor nunca se entrega al frontend.
- Al detener la grabación, el audio se guarda en S3 y la transcripción final se
  incorpora a la biblioteca.
- La grabación se detiene al alcanzar el límite de 20 MB y los fallos de inicio,
  reconocimiento o guardado se muestran con un mensaje comprensible.

## Biblioteca y descargas

### CA-09. Historial paginado

- La biblioteca muestra las transcripciones de la persona autenticada en orden
  cronológico inverso y pagina los resultados de 10 en 10.
- Abrir un elemento permite reproducir su audio y consultar el texto completo.
- Un estado vacío explica cómo crear la primera transcripción.

### CA-10. Descargas

- El audio puede descargarse mediante una URL temporal de S3 y el texto como
  un fichero TXT.
- Una persona no puede consultar ni descargar transcripciones de otra cuenta.

## Interfaz adaptable

### CA-11. Navegación móvil

- En escritorio, En directo, Archivo y Biblioteca aparecen juntos en el
  dashboard.
- En móvil, una barra inferior permite cambiar entre las tres secciones y solo
  muestra una cada vez sin desmontar las demás ni interrumpir su estado.
