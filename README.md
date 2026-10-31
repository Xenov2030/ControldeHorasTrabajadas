# Jornada · Control de horas trabajadas

Aplicación Next.js en español para registrar jornadas y estimar ingresos con selección geográfica para Latinoamérica. La configuración original de Argentina y Mendoza se conserva para los perfiles existentes. La versión actual es personal y local: todavía no ofrece cuentas, base de datos remota ni servicios comerciales activos.

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

Vercel puede detectar Next.js en la raíz. Este cambio no configura ni publica el proyecto remoto.

## Funciones implementadas

- Catálogo local de 23 países y Puerto Rico como territorio, con 507 divisiones administrativas. Incluye los 20 países de América Latina y cobertura regional adicional para Belice, Guyana y Surinam. Cada país muestra provincia, estado, departamento, región o municipio según corresponda. Datos y licencia: [data/README.md](data/README.md).
- Zona horaria IANA configurable por país: reloj, fecha de registro y recordatorios usan la selección; se evita asumir UTC-3 para toda Latinoamérica.
- Moneda de registro configurable antes de cargar registros. Al cambiar de país con registros existentes se conserva la moneda, sin conversiones ni cambios de importes históricos.
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

La selección geográfica no aplica automáticamente legislación o feriados del país. El aguinaldo disponible sigue siendo el SAC argentino y su pantalla no ejecuta esa fórmula en países distintos de Argentina. Los valores iniciales son ejemplos editables. No se cargan ni analizan recibos de sueldo. Los resultados son estimaciones, no liquidaciones legales ni importes netos confirmados.

Las horas extra se calculan según el excedente diario del horario pactado, con un multiplicador por condición salarial. No se aplican automáticamente límites semanales, convenios, recargos nocturnos, distintos recargos según horario ni descuentos, aportes o retenciones. Los feriados son manuales y usan su propio multiplicador, sin acumular extras.

Por jornada, el importe se divide por las horas incluidas que informa el usuario para estimar fracciones y extras. Los salarios fijos se proyectan por días calendario, incluso antes de cargar asistencia: no se descuentan vacaciones sin pago ni ausencias automáticamente. Los descuentos de faltas con sueldo fijo solo se aplican por el importe manual indicado en cada registro. Para extras y recargos de feriados con sueldo fijo se pide un valor hora explícito. Al tanto, se calcula cantidad por precio sin agregar importes extra automáticos.

Las jornadas nocturnas se asignan a la fecha de entrada y admiten hasta 24 horas, incluido el descanso. Las configuraciones de horario y calendario de cobro se aplican a todo el historial; el historial de vigencias actual cubre únicamente las condiciones salariales.

Las faltas se registran por fecha y no pueden mezclarse con trabajo, vacaciones u otra falta en el mismo día. Si se necesita corregir la justificación de una falta ya guardada, se puede eliminar y volver a cargar.

El SAC usa solo los meses cargados manualmente, no infiere una remuneración legal de las jornadas. Sin fecha de ingreso se asume el semestre completo. No contempla licencias o ausencias no computables. Si falta algún mes, la estimación queda identificada como incompleta.

## Persistencia y privacidad

Los datos quedan en `localStorage` del navegador (`jornada-v2`). No hay sincronización entre dispositivos, autenticación ni aislamiento entre personas que comparten el mismo perfil del navegador. Borrar el almacenamiento elimina los registros locales. Conviene descargar copias JSON; el CSV es para consulta y no permite restaurar toda la configuración.

La aplicación no sobrescribe datos que no puede validar. Los archivos de copia incluyen información personal y salarial: deben guardarse en un lugar privado. No se usan analítica, fuentes externas, proveedores de lectura de documentos ni servicios de mensajería en esta etapa.

## Integraciones pendientes

- Inicio de sesión con Google y base de datos con separación por cuenta.
- WhatsApp Business Platform, verificación de teléfono y registro por mensajes.
- Notificaciones con la aplicación cerrada, autorización del dispositivo y servicio de programación.
- Calendario oficial de feriados nacionales y de Mendoza.
- Espacios de empresa, roles y auditoría de cambios.
- Suscripciones, precios y límites de Premium.

La pantalla Premium informa qué funciones están previstas y no activa pagos ni simula integraciones.

## Crédito del creador

El componente `CreatorCredit` está preparado para mostrar una firma discreta con enlace al portfolio en el pie del panel y en la configuración inicial. Su identidad pública se define en `lib/branding.mjs`. La firma actual es «Hecho por Nicolás» y enlaza a https://nicolasaguirrescode.com/. El enlace utiliza HTTPS y abre el portfolio en una pestaña nueva.
