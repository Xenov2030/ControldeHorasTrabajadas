# Jornadapp · Control de horas trabajadas

Jornadapp ayuda a registrar el tiempo trabajado y entender cuánto se espera cobrar. Está pensada para trabajadores que necesitan llevar su propio control de jornadas, horas extra, faltas y pagos desde el celular o la computadora.

**Sitio:** https://controldehorastrabajadas.vercel.app/

**Creador:** [Nicolas Aguirres](https://nicolasaguirrescode.com/)

El proyecto está en preparación de beta. El código incluye cuentas y almacenamiento con Supabase; su funcionamiento en producción se confirma después de configurar la base, Auth y Vercel siguiendo [la guía de activación](docs/BETA.md). Sin esa configuración se conserva el modo local. Los servicios comerciales todavía no están activos.

## Presentación del producto

La propuesta es que cada persona pueda comparar sus registros de trabajo con lo que cobra, incluso cuando su horario cambia según el día o cobra por hora con liquidaciones quincenales. La modalidad de pago, el período liquidado y la fecha de cobro se configuran por separado.

- Registrá entrada y salida, o cargá las horas manualmente.
- Configurá tu horario semanal y el valor de tus horas extra.
- Llevá el registro de faltas, vacaciones, feriados y cobros.
- Consultá estimaciones de ingresos y, para Argentina, del aguinaldo con base y extras cargadas manualmente.
- Elegí país, división administrativa, moneda y zona horaria.
- Usá tema claro u oscuro y descargá copias de tus registros.

## Material para crear contenido

**Descripción breve:** Jornadapp es una aplicación web para registrar horas trabajadas, estimar ingresos y llevar un control personal de jornadas y cobros.

**Texto de presentación:** «¿Trabajás por hora pero cobrás por quincena? Con Jornadapp podés configurar tus horarios, registrar tus entradas y salidas y consultar una estimación de lo que te corresponde cobrar. También podés llevar tus horas extra, faltas y pagos en una interfaz adaptada al celular y la computadora».

Ideas para publicaciones y demostraciones:

- Un ejemplo de lunes a jueves con nueve horas, viernes con ocho y sábado libre.
- Cómo separar el valor por hora de las fechas de cierre y cobro de cada quincena.
- Cómo registrar una falta justificada y distinguir si fue paga o sin pago.
- Cómo configurar un aumento con fecha de vigencia.
- Un recorrido por los temas claro y oscuro en celular y PC.

Para comunicar el estado actual, consultá las funciones y los límites detallados más abajo. El acceso real con Google y el guardado entre dispositivos requieren verificar la instalación alojada. WhatsApp, notificaciones con la aplicación cerrada, gestión de empresas y Premium son funciones previstas. La selección de país no adapta automáticamente las reglas laborales y los importes mostrados son estimaciones.

## Desarrollo

Node.js 24 y npm. Usar el checkout existente; no es necesario crear un worktree.

```sh
npm ci
npm run dev
```

## Validación

```sh
npm test
npm run build
npm run format:check
```

Prueba de navegador sobre la compilación de producción:

```sh
npx playwright install chromium
npm run test:e2e
```

En el entorno en la nube, Chromium ya está instalado:

```sh
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm run test:e2e
```

La prueba inicia y detiene su propio servidor en el puerto 3002 y genera capturas reales en `test-results/`. En entornos con sandbox puede ser necesario autorizar la ejecución del navegador y la apertura del puerto local.

Para servir una compilación existente:

```sh
npm start
```

Vercel utiliza Next.js en la raíz del repositorio. La configuración de la base de datos y del acceso con cuentas se documenta en [docs/BETA.md](docs/BETA.md).

## Funciones implementadas

- Monotributo para Argentina: categorías A–K, cuota mensual opcional en ARS y fecha de vigencia. La cuota se informa por separado, sin descontarla automáticamente de sueldos ni duplicarla por trabajo o quincena. No se infieren categorías, topes de facturación ni importes de ARCA.
- Condición laboral por trabajo y fecha de vigencia: registrado, no registrado o mixto. Permite indicar importes brutos o netos y un porcentaje manual de aportes/retenciones sobre la parte registrada, con opción de excluir las horas extra. Los importes netos no se descuentan otra vez. El resumen y los cobros muestran el importe antes de aportes, los descuentos configurados y el monto estimado a cobrar. Las condiciones anteriores sin configurar conservan sus importes.
- Hasta diez trabajos por cuenta, con nombre, horarios, sueldos, jornadas, faltas, cobros y SAC separados. Selector para cambiar de trabajo y renombrarlo; los datos anteriores se conservan como «Mi trabajo». Los resúmenes, CSV y recordatorios corresponden al trabajo seleccionado. La copia JSON y la sincronización incluyen todos los trabajos. No hay todavía un resumen combinado.

- Catálogo local de 23 países y Puerto Rico como territorio, con 507 divisiones administrativas. Incluye los 20 países de América Latina y cobertura regional adicional para Belice, Guyana y Surinam. Cada país muestra provincia, estado, departamento, región o municipio según corresponda. Datos y licencia: [data/README.md](data/README.md).
- Zona horaria IANA configurable por país: reloj, fecha de registro y recordatorios usan la selección; se evita asumir UTC-3 para toda Latinoamérica.
- Moneda de registro editable. Cada país propone su moneda y la interfaz muestra códigos explícitos (ARS, MXN, BRL, etc.). Si ya hay datos financieros, corregir su moneda requiere confirmar que los valores ya estaban expresados en la nueva unidad: no se aplica ningún tipo de cambio. Se conserva una copia local del espacio anterior al último cambio, descargable desde Configuración. Para hacer conversiones reales hay que calcular y cargar los importes correspondientes; esta función solo corrige la unidad de registro.
- Integración beta con Google y enlace de ingreso por correo mediante Supabase Auth, guardado por cuenta, migración local explícita, estado de sincronización y control de conflictos entre dispositivos. Requiere configuración externa; no se activa solo por subir el código.
- Asistente inicial de cinco pasos: perfil, horario semanal, modalidad e importe, cierres y cobros, recordatorios.
- Identidad visual azul noche, violeta y tonos cálidos, con fuentes locales, reloj de fichaje, resumen semanal y navegación propia para celular. Tema claro, oscuro o según el dispositivo, con preferencia persistida.
- Importes, cantidades y horas aceptan coma o punto decimal; por ejemplo, `3500,50`, `3500.50` y `8,5`. También se aceptan miles con parte decimal explícita, como `1.234,50`; un único separador siempre se interpreta como decimal.
- Registro de faltas justificadas y sin justificar, con motivo opcional y condición paga/sin pago independiente. Las faltas no suman horas trabajadas. Para sueldo fijo, un descuento solo se aplica si el usuario ingresa su importe manualmente.
- Entrada activa y confirmación de salida real. Carga manual por horarios o por total de horas, con descansos, turnos nocturnos, feriados y vacaciones.
- Horario pactado diferente para cada día; opciones de 44 horas semanales con o sin sábado. Se acumulan los turnos del mismo día antes de calcular extras.
- Pago por hora, jornada, quincena, mes o al tanto. La modalidad es independiente de la frecuencia de liquidación y de las fechas de cobro.
- Quincenas con cierre configurable (1–27 y último día del mes), semanas de lunes a domingo y meses completos. Fechas de cobro con desplazamiento de mes y ajuste al último día si no existe el día configurado.
- Condiciones de pago con fecha de vigencia para aumentos y cambios de modalidad. Los importes previos usan la condición vigente en su fecha.
- Registro manual de cobros, separado de los ingresos estimados.
- Estimación manual de aguinaldo sobre la mitad de la mayor remuneración mensual computable del semestre, con desglose de base y extras del mismo mes. Proporción por fecha de ingreso, si se informó. Se indica cuántos meses se cargaron.
- Recordatorios dentro de la página tras la salida pactada, con demora y repetición configurables. Requieren una entrada activa y la página abierta; nunca cierran automáticamente una jornada.
- Exportación CSV y copia/restauración completa en JSON. Migración del almacenamiento de la primera versión sin borrar el original.
- Adaptación a PC y celular con navegación móvil y formularios accesibles.

## Cálculos y límites actuales

La selección geográfica no aplica automáticamente legislación o feriados del país. El aguinaldo disponible sigue siendo el SAC argentino y su pantalla no ejecuta esa fórmula en países distintos de Argentina. Los valores iniciales son ejemplos editables. No se cargan ni analizan recibos de sueldo. Los resultados son estimaciones, no liquidaciones legales ni importes netos confirmados. La condición laboral y los porcentajes no se deducen automáticamente del país. En modo mixto se aplica el mismo porcentaje de parte registrada a la base y, si se habilita, a las extras; no se modelan distintos valores hora bruto/neto en una misma condición. El cálculo manual de SAC no aplica estos descuentos.

Las horas extra se calculan según el excedente diario del horario pactado, con un multiplicador por condición salarial. No se aplican automáticamente límites semanales, convenios, recargos nocturnos, distintos recargos según horario ni descuentos o impuestos legales automáticos. Los aportes y retenciones se estiman solo con el porcentaje manual configurado, sin topes, escalas ni mínimos legales. Los feriados son manuales y usan su propio multiplicador, sin acumular extras.

Por jornada, el importe se divide por las horas incluidas que informa el usuario para estimar fracciones y extras. Los salarios fijos se proyectan por días calendario, incluso antes de cargar asistencia: no se descuentan vacaciones sin pago ni ausencias automáticamente. Los descuentos de faltas con sueldo fijo solo se aplican por el importe manual indicado en cada registro. Para extras y recargos de feriados con sueldo fijo se pide un valor hora explícito. Al tanto, se calcula cantidad por precio sin agregar importes extra automáticos.

Las jornadas nocturnas se asignan a la fecha de entrada y admiten hasta 24 horas, incluido el descanso. Las configuraciones de horario y calendario de cobro se aplican a todo el historial; el historial de vigencias actual cubre únicamente las condiciones salariales.

Las faltas se registran por fecha y no pueden mezclarse con trabajo, vacaciones u otra falta en el mismo día. Si se necesita corregir la justificación de una falta ya guardada, se puede eliminar y volver a cargar.

El SAC usa solo los meses cargados manualmente, no infiere una remuneración legal de las jornadas. Sin fecha de ingreso se asume el semestre completo. No contempla licencias o ausencias no computables. Si falta algún mes, la estimación queda identificada como incompleta.

## Persistencia y privacidad

Sin configurar Supabase, los datos siguen en `localStorage` (`jornada-v2`) y el modo local no tiene autenticación ni sincronización. Con Supabase configurado, se ingresa por cuenta, se guarda un documento por usuario en PostgreSQL y las copias pendientes se separan por identificador de cuenta. Los conflictos no se sobrescriben automáticamente. Borrar el almacenamiento elimina las copias que todavía no se sincronizaron. Conviene descargar copias JSON; el CSV es para consulta y no permite restaurar toda la configuración.

La aplicación no sobrescribe datos que no puede validar. El almacenamiento local no está cifrado; usá tu propio perfil del navegador para datos salariales. Los archivos de copia incluyen información personal y salarial: deben guardarse en un lugar privado. No se usan analítica, fuentes externas ni proveedores de lectura de documentos. Al activar la nube, Supabase gestiona la autenticación, la base de datos y los enlaces de ingreso por correo. WhatsApp sigue pendiente.

## Integraciones pendientes

- Activar y verificar en el proyecto alojado la integración de Google y base de datos ya implementada: [docs/BETA.md](docs/BETA.md).
- WhatsApp Business Platform, verificación de teléfono y registro por mensajes.
- Notificaciones con la aplicación cerrada, autorización del dispositivo y servicio de programación.
- Calendario oficial de feriados nacionales y de Mendoza.
- Espacios de empresa, roles y auditoría de cambios.
- Suscripciones, precios y límites de Premium.

La pantalla Premium informa qué funciones están previstas y no activa pagos ni simula integraciones.

## Crédito del creador

El componente `CreatorCredit` está preparado para mostrar una firma discreta con enlace al portfolio en el pie del panel y en la configuración inicial. Su identidad pública se define en `lib/branding.mjs`. La firma actual es «Hecho por Nicolas Aguirres» y enlaza a https://nicolasaguirrescode.com/. El enlace utiliza HTTPS y abre el portfolio en una pestaña nueva.
