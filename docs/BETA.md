# Activar la beta con cuentas y base de datos

El código está preparado para Supabase (PostgreSQL y Auth). Crear y probar una base temporal en el entorno de desarrollo no crea un proyecto alojado en tu cuenta. Sin las variables públicas de Supabase, la web conserva el modo local existente. No anuncies guardado en la nube hasta completar y verificar esta activación.

## 1. Crear el proyecto alojado

Desde Vercel, abrí el proyecto → Storage → Create Database → Supabase. También podés crear un proyecto desde el panel de Supabase y conectarlo después. Usá el plan que elijas; para una beta pequeña se puede comenzar por el gratuito si está disponible. La contraseña de PostgreSQL se guarda de forma privada: no va en el chat, el repositorio ni las variables del navegador.

## 2. Crear la estructura y los permisos

En Supabase → SQL Editor, ejecutá el contenido completo de:

`supabase/migrations/202610310001_beta_workspaces.sql`

La migración es repetible y crea:

- `public.workspaces`: un documento JSONB por cuenta, con perfil, configuración, jornadas, vacaciones, faltas, cobros y remuneraciones del SAC. Límite: 2 MB por documento.
- Referencia a `auth.users` para que los datos se eliminen si se borra la cuenta desde la administración de Supabase.
- RLS: una cuenta autenticada solo puede leer su propia fila.
- `save_workspace`: escritura atómica que comprueba el usuario y la revisión anterior. No permite sobreescribir una revisión más nueva ni escribir para otra cuenta.
- Acceso anónimo y escrituras directas a la tabla deshabilitados. La aplicación no usa claves `service_role`.

En esta beta se guarda un documento completo por cuenta. No hay todavía espacios de empresa, administración de empleados ni combinación automática de ediciones simultáneas. Si dos dispositivos editan al mismo tiempo, se conserva la copia pendiente y se pide descargarla antes de cargar la versión remota.

## 3. Configurar los ingresos

En Supabase → Authentication → URL Configuration:

- Site URL: `https://controldehorastrabajadas.vercel.app`
- Redirect URL: `https://controldehorastrabajadas.vercel.app/auth/callback`
- Para desarrollo local, agregá solamente las direcciones locales que uses, por ejemplo `http://localhost:3000/auth/callback`.

Para Google:

1. Activá Google en Authentication → Providers.
2. Creá un cliente OAuth web en Google Cloud y configurá el consentimiento.
3. En Google, autorizá la URL de callback que indica Supabase, normalmente `https://<tu-proyecto>.supabase.co/auth/v1/callback`. Esta es diferente del callback de la aplicación en Vercel.
4. Guardá el Client ID y el Client Secret en el proveedor Google de Supabase. El secreto nunca va en `NEXT_PUBLIC_*`.
5. Si Google está en modo de pruebas, agregá los correos de los participantes de la beta como usuarios de prueba.

El ingreso por correo utiliza un enlace que debe abrirse en el mismo navegador donde se pidió. Para invitar usuarios por correo a una beta pública, configurá SMTP y verificá las cuotas de envío: el correo incorporado de Supabase tiene límites y no debe asumirse como servicio de envío ilimitado.

## 4. Conectar Vercel

En Vercel → Settings → Environment Variables, cargá para Production:

| Variable                               | Dónde obtenerla                        |
| -------------------------------------- | -------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`             | URL del proyecto de Supabase           |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Clave pública publishable del proyecto |

También se acepta `NEXT_PUBLIC_SUPABASE_ANON_KEY` para la clave pública anon anterior. Usá una de las dos claves públicas, no ambas. Nunca uses la contraseña de la base, `service_role` ni `sb_secret_*` en estas variables. La compilación rechaza claves privadas antes de generar el navegador.

Después de guardar ambas variables, hacé un nuevo despliegue de `main`. Las variables públicas se incluyen durante la compilación; agregarlas sin volver a desplegar no activa una compilación anterior.

No hace falta una contraseña de PostgreSQL en la aplicación: el SDK usa Auth y la API protegida por RLS.

## 5. Verificar el lanzamiento

Antes de anunciar la beta:

1. Ingresá con Google en el dominio real. Verificá el correo de la cuenta en la barra superior.
2. Elegí explícitamente importar el espacio local o empezar uno vacío. El original del navegador se conserva y nunca se asigna automáticamente a una cuenta.
3. Registrá una jornada y esperá «Guardado en tu cuenta». «Guardado en dispositivo · Sincronizando» todavía no confirma la escritura remota.
4. Abrí la misma cuenta en otro dispositivo: debe recuperar la jornada.
5. Probá una segunda cuenta: no debe ver las jornadas de la primera.
6. Probá una desconexión: los cambios deben quedar pendientes en ese dispositivo y sincronizar al reintentar. Si dos dispositivos generan un conflicto, descargá la copia pendiente y cargá la versión remota; no se mezclan automáticamente.

La integración de Google y la configuración de un proyecto alojado requieren una comprobación real después de configurarlos. Las pruebas locales no certifican que un proyecto externo aún no creado esté listo.

## Desarrollo y pruebas

Copiá `.env.example` a `.env.local` y completá solo URL y clave pública para trabajar con un proyecto real. `.env.local` está ignorado por Git.

```sh
npm test
npm run build
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm run test:e2e
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm run test:cloud
npm run test:database
```

- `test:e2e`: versión local sobre la compilación de producción.
- `test:cloud`: servidor de desarrollo separado, con Auth/API simulados exclusivamente en el navegador de pruebas. Comprueba migración, separación de cachés, sincronización, desconexión, conflictos y cierre de sesión. No valida Google real.
- `test:database`: PostgreSQL 16 oficial en un contenedor aislado, sin red ni puertos publicados. Comprueba la migración, RLS, roles, revisiones y borrado por cuenta, y elimina el contenedor al finalizar. Necesita Docker y puede requerir autorización del entorno para acceder al socket local.

## Datos en dispositivos compartidos

Supabase autentica a cada cuenta y el servidor protege las filas. La copia de trabajo local no está cifrada: alguien con acceso al perfil del navegador puede inspeccionar el almacenamiento del dispositivo. Al cerrar sesión se limpia la copia de cuenta que ya está sincronizada. Si hay cambios pendientes, se informa y se conservan para el siguiente ingreso, evitando perderlos. Los archivos JSON descargados contienen datos personales y salariales y deben guardarse de forma privada.

Los datos locales anteriores al uso de cuentas no se eliminan por cerrar una sesión. Si el equipo es compartido, descargá una copia y eliminá esos datos con las herramientas del navegador cuando ya hayas confirmado su migración. Las copias de conflicto y de cambio de moneda también permanecen en el dispositivo hasta que se borra su almacenamiento.
