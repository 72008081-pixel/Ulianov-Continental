# CHANGELOG FINAL — PARCHES Y OPTIMIZACIONES
## Proyecto: Suite Estructural Ulianov Continental
**Versión Final:** v8.3 GOLD RELEASE  
**Fecha:** 2026-11-01  
**Autor:** Antigravity Autonomous Engineering & QA Core  

---

### 1. Módulo Vigas (`beam-excel-generator.js`, `vigas.html`, `vigas-tablas.html`)
- **[CORRECCIÓN CRÍTICA] Generación de Excel Nativo de Cátedra:**
  - Se eliminó el bloque de captura que interceptaba la descarga con una plantilla incompleta (`PLANTILLA_MAESTRA_5_PESTANAS_ULIANOV.xlsx`), unificando la descarga con `generateBeamWorkbook(config)`.
  - Ahora el Excel descargado contiene la hoja auténtica **`PLANTILLA ULIANOV`** con **11,466 fórmulas nativas de Excel** (Steiner, matrices locales 6x6, global 36x36, `=MINVERSE`, desplazamientos y reacciones) correspondiente a `PLANTILLA_MEJORADA_VIGAS_ULIANOV_OFICIAL.xlsx`.
  - Se garantiza la inclusión de la segunda hoja **`GRÁFICAS`** que incrusta los 4 diagramas vectoriales (Curva Elástica Poligonal, Curva Elástica Suavizada con Giros $\theta$, Cortante $V(x)$ y Momento $M(x)$) a 900x340 px con fondo pizarra oscuro de alta resolución.
- **[MEJORA UX/RESPONSIVE] `vigas-tablas.html`:**
  - Se incorporaron media queries CSS para pantallas menores a 768 px y 360 px, adaptando la barra de navegación superior, botones y contenedores de tablas para evitar desbordamientos en smartphones.

---

### 2. Módulo Pórticos (`frame-excel-generator.js`, `frame-app.js`)
- **[NUEVA CARACTERÍSTICA] Gráfica Embebida en Excel:**
  - Se actualizó `buildMasterFrameWorkbook(model, result, opts)` y `downloadFrameExcel(model, result, opts)` para recibir la captura del canvas en base64 (`opts.framePngBase64`).
  - Se genera automáticamente la tercera pestaña **`GRÁFICA PÓRTICO`**, insertando el esquema visual del pórtico con cotas, apoyos, cargas nodales y distribuidas a 960x500 px.
  - Se mantienen al 100% las dos pestañas maestras:
    - **`3.1 MIXTAS`** (3,193 fórmulas nativas de rigidez y cargas).
    - **`PLANTILLA ULIANOV`** (Partición matricial hasta 33 GDL con `=MINVERSE` y `=MMULT`).

---

### 3. Módulo Armaduras (`excel-generator.js`, `truss-app.js`)
- **[NUEVA CARACTERÍSTICA] Gráfica Embebida en Excel:**
  - Se actualizó `generateTrussWorkbook(nodesData, barsData, isIsostatic, solverResult, opts)` para admitir `opts.trussPngBase64`.
  - Se implementó la tercera pestaña **`GRÁFICA ARMADURA`**, incrustando la estructura analizada a 960x500 px en alta definición.
  - Se sincronizó `truss-app.js` para extraer la imagen del canvas en tiempo real al hacer clic en "Descargar Excel con Fórmulas".
  - Se conservan las dos hojas oficiales de cálculo:
    - **`MANUAL_ISOSTATICA_3R`** (2,229 fórmulas nativas).
    - **`MANUAL_HIPERESTATICA_4R`** (2,212 fórmulas nativas).

---

### 4. Módulo Mathcad Prime 11 (`mathcad/index.html`)
- **[VERIFICACIÓN Y VALIDACIÓN 100%]:**
  - Verificación de plantillas base `.mcdx`: `PLANTILLA_MAESTRA_10_TRAMOS_CORREGIDA.mcdx` y `PLANTILLA_MAESTRA_10_TRAMOS_VIGAS.mcdx`.
  - Verificación del blindaje XSD en exportación XML (`axisLine` sanitizado a entero para compatibilidad con Mathcad Prime 11).
  - Inyección de imagen esquemática de la viga en `mathcad/media/Image0.png`.
  - Operatividad comprobada de los botones de Presets (4 tramos examen oficial, puntual céntrica, doble voladizo, 10 tramos) y exportación directa en PNG.

---

### 5. Suite Central e Integridad Global (`index.html`, enlaces cruzados)
- **[AUDITORÍA DE ENLACES]:**
  - 100% de los hipervínculos internos entre módulos (`armaduras.html`, `vigas.html`, `porticos.html`, `mathcad/index.html` y sus tablas correspondientes) verificados con 0 errores 404.
- **[SEGURIDAD Y PERMISOS]:**
  - Modo comunidad habilitado en `auth.js` (`hasExcelPermission: () => true`) permitiendo acceso directo e irrestricto a los libros Excel de cátedra con fórmulas nativas vivas.
