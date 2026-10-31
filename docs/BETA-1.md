# JornadApp · Beta 1

Versión: **0.1.0-beta.1**. Fecha de preparación: **31 de octubre de 2026**.

Sitio: https://controldehorastrabajadas.vercel.app/

Esta primera beta está orientada al control personal de horas y a estimaciones de ingresos. El código se publica en `main`, conectado al despliegue de Vercel. La etiqueta `v0.1.0-beta.1` identifica esta entrega. La actualización del dominio depende de que Vercel complete ese despliegue.

## Incluye

- Acceso con Google o enlace por correo mediante Supabase; guardado por cuenta, copias locales pendientes y manejo de conflictos.
- Hasta diez trabajos independientes, con horarios, condiciones de pago, moneda y registros separados; por ejemplo, ARS y USD sin conversiones automáticas.
- Jornadas, descansos, turnos nocturnos, horas extra, faltas justificadas o sin justificar y cobros manuales.
- Condición registrada, no registrada o mixta, descuentos porcentuales configurables, importes brutos o netos y monotributo argentino con categoría y cuota informadas manualmente.
- Vacaciones por períodos, calendario, planificación, condición paga y control de superposiciones.
- SAC argentino estimado a partir del historial mensual manual, incluidos sueldos de años anteriores.
- Temas claro y oscuro, diseño para celular y PC, catálogo regional, CSV y copias JSON.
- Logo, favicon y aviso de titularidad de Nicolas Aguirres.

## Alcance de las pruebas

Las verificaciones locales cubren cálculos, validación y conservación de datos; recorridos de navegador; sincronización con una API de prueba; y permisos de PostgreSQL en una base temporal aislada. Las pruebas de autenticación simulada no validan Google ni el correo de producción.

Resultado de esta entrega: compilación y formato correctos; 94 pruebas de cálculo/validación, 14 recorridos de navegador, 7 flujos de sincronización con API simulada y 7 comprobaciones de permisos en PostgreSQL aprobados.

El titular confirmó que el ingreso con Google funciona. La red del entorno de desarrollo bloquea el dominio de Vercel: no se puede certificar desde aquí la disponibilidad ni el estado del último despliegue. Antes de invitar participantes, comprobar en el dominio real:

1. Que Vercel muestre el despliegue de esta versión en estado Ready y que el pie de la web indique `0.1.0-beta.1`.
2. Que una cuenta pueda guardar una jornada y ver «Guardado en tu cuenta», y recuperarla en otro dispositivo.
3. Que una segunda cuenta no vea los registros de la primera.
4. Qué personas pueden ingresar con Google: en modo Testing, solo usuarios de prueba autorizados; para acceso general, revisar la publicación del cliente OAuth y los requisitos que indique Google.
5. Si se ofrecerá ingreso por correo, comprobar SMTP, entrega de enlaces y cuotas de envío de Supabase.

## Límites conocidos

- Los importes son estimaciones. No se aplica legislación completa por país, ni convenios, impuestos, plus vacacional o saldo legal de vacaciones automáticamente.
- El cálculo de SAC está disponible para Argentina, con los meses cargados manualmente y sin aplicar descuentos de jornadas al SAC.
- Los feriados se cargan manualmente y los recordatorios necesitan que la página esté abierta.
- WhatsApp, espacios de empresa, roles y Premium todavía no están habilitados. No se solicitan pagos.
- Se guarda un documento de hasta 2 MB por cuenta. Los conflictos entre dispositivos requieren elegir una versión; no se fusionan automáticamente.
- Las copias locales y descargadas no están cifradas por la aplicación. No borrar el almacenamiento si hay cambios pendientes.

## Comentarios y errores

Usar [Reportar un problema](https://github.com/Xenov2030/ControldeHorasTrabajadas/issues/new?template=bug_report.yml), también disponible al pie de la aplicación. Si el repositorio no permite crear incidencias, el titular puede habilitar Issues en la configuración de GitHub.

Indicar versión, dispositivo, pasos y comportamiento esperado usando datos ficticios. No publicar datos personales, recibos, importes salariales reales, claves o tokens.

La guía de configuración y las comprobaciones de lanzamiento están en [BETA.md](BETA.md).
