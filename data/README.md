# Catálogo de Latinoamérica

`latam.json` contiene los 20 países de América Latina, más Belice, Guyana y Surinam por cobertura regional y Puerto Rico identificado como territorio. Los nombres y las divisiones administrativas son datos geográficos; no activan leyes laborales ni calendarios de feriados.

Fuente: `country-region-data` 4.1.0 (MIT), https://github.com/country-regions/country-region-data. El aviso de licencia se conserva en `REGIONS-LICENSE.txt`. Para regenerar: `npm run update:locations`.

El generador mantiene correcciones explícitas: 31 provincias y Distrito Nacional de República Dominicana; 78 municipios de Puerto Rico; Ciudad Autónoma de Buenos Aires; Querétaro; Distrito Capital y La Guaira; Guna Yala, Emberá-Wounaan y Naso Tjër Di; y algunas tildes en Perú y Paraguay. Estos ajustes evitan reproducir listas incompletas y denominaciones antiguas del catálogo base.

Las zonas horarias son identificadores IANA. En países con varias zonas, la selección debe confirmarse según la ubicación del usuario. Las monedas son sugerencias para cuentas nuevas: cambiar de país no convierte importes históricos.
