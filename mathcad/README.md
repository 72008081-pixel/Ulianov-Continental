# Diagramas en Mathcad — Suite y Generador Automatizado para PTC Mathcad Prime 11

[![Live Web App](https://img.shields.io/badge/🌐%20Web%20App%20Live-GitHub%20Pages-00D2B5?style=for-the-badge&logo=googlechrome&logoColor=white)](https://72008081-pixel.github.io/diagramas-en-MATHCAD/)
[![GitHub Repo](https://img.shields.io/badge/GitHub-Repository-181717?style=for-the-badge&logo=github&logoColor=white)](https://github.com/72008081-pixel/diagramas-en-MATHCAD)
[![PTC Mathcad](https://img.shields.io/badge/PTC%20Mathcad-Prime%2011.0.0-orange?style=for-the-badge&logo=mathcad&logoColor=white)](https://www.mathcad.com/)
[![Tests](https://img.shields.io/badge/Tests%20COM%20Mathcad-10%2F10%20Aprobados-10b981?style=for-the-badge)](run_10_tests.py)

---

> 🚀 **HERRAMIENTA WEB DESPLEGADA EN VIVO:**  
> 👉 **[https://72008081-pixel.github.io/diagramas-en-MATHCAD/](https://72008081-pixel.github.io/diagramas-en-MATHCAD/)**  
> *(Accede y utiliza la suite completa directamente desde tu navegador sin instalar nada, o descárgate los `.mcdx` listos para Mathcad Prime 11)*

---

Suite interactiva de cálculo estructural y generador de memorias de cálculo para el análisis de vigas isostáticas e hiperestáticas en **PTC Mathcad Prime 11.0.0**. Implementa el método de **Funciones de Singularidad / Macaulay mediante operadores booleanos** para producir automáticamente las funciones seccionales, el cálculo de reacciones, los cortes formales de sección y los diagramas en vivo de **Fuerza Cortante (DFC)** y **Momento Flector (DMF)**.

Disponible tanto en **Web App interactiva en vivo (GitHub Pages)** como en **Aplicación de Escritorio con sincronización COM directa a Mathcad Prime 11**.

---

## 🌟 Dos Modos de Uso Disponibles

### 🌐 Modo 1: Aplicación Web en Vivo (GitHub Pages)
Accede directamente desde cualquier navegador web sin requerir instalaciones:
🔗 **[https://72008081-pixel.github.io/diagramas-en-MATHCAD/](https://72008081-pixel.github.io/diagramas-en-MATHCAD/)**

- **Barra de Presets Rápidos en 1 Clic:** Carga instantáneamente los casos típicos de examen (Oficial 4 tramos, Céntrica 2 tramos, Distribuida continua 3 tramos, Cantilever voladizo, Doble voladizo y Viga Maestra de 10 tramos).
- **Editor Dinámico de 1 a 10 Tramos:** Modificación reactiva en tiempo real de longitudes, tipos de apoyos (libre, articulado, móvil, empotrado), cargas distribuidas ($q$), cargas concentradas ($P$) y momentos ($M$).
- **Lienzo Vectorial en Tiempo Real (Canvas 2D):** Dibuja la viga a escala automática, con cotas por tramo, cota total $L_{\text{tot}}$, apoyos, cargas y **líneas de corte de sección punteadas con etiquetas formales (`Corte 1-1`, `Corte 2-2`, etc.)**.
- **Consola de Equilibrio y Reacciones en Vivo:** Cálculo instantáneo de $V_A$, $V_D$, verificación de $\sum F_y = 0$ y estado de balance estático.
- **Gráficos Dinámicos DFC y DMF:** Curvas de alta resolución con detección del punto de cortante nulo ($Q=0$) y Momento Máximo ($M_{\max}$).
- **Generador y Descarga Directa de `.mcdx` en el Navegador:** Mediante JSZip empaqueta dinámicamente el archivo `.mcdx` compatible con Mathcad Prime 11 con la imagen del diagrama incrustada y las variables actualizadas.
- **Memoria de Cálculo Formal Imprimible:** Genera un reporte técnico listo para imprimir a PDF con membrete universitario.
- **Ecuaciones de Macaulay listas para Copiar:** Transcripción exacta a la sintaxis booleana de Mathcad Prime 11.

---

### 💻 Modo 2: Aplicación de Escritorio & Automatización COM Mathcad Prime 11
Para usuarios con **PTC Mathcad Prime 11.0.0** instalado en Windows:

1. **Iniciar la GUI de Escritorio:**
   ```powershell
   python app_gui.py
   ```
   *o doble clic en:*
   ```text
   INICIAR_APP_VIGAS.bat
   ```
2. **Botón "Generar y Abrir en Mathcad Prime 11":** Genera el archivo `.mcdx`, lo abre de inmediato en Mathcad Prime 11 y actualiza las gráficas automáticamente.
3. **Botón "Exportar a PDF Directo":** Utiliza la API COM de Mathcad en segundo plano para generar un PDF vectorial de alta fidelidad (~470 KB) sin abrir ventanas.

---

## 📊 Batería de Pruebas de Estrés: 10 Casos Reales Verificados

Se diseñó e implementó un script de verificación automatizado (`run_10_tests.py`) que conecta directamente vía COM con `MathcadPrime.Application`, genera los archivos `.mcdx`, los abre en el motor nativo de Mathcad Prime 11, sincroniza el cálculo, verifica la ausencia total de regiones corruptas y exporta a PDF vectorial:

| Caso | Nombre del Test | Configuración Estructural | Estado en Mathcad Prime 11 | Tiempo | PDF Generado | CorruptedRegion |
| :---: | :--- | :--- | :---: | :---: | :---: | :---: |
| **01** | `TEST_01_4TRAMOS` | 4 tramos (Caso Oficial Examen: $q_1=15, P_1=20, P_2=8, M_1=10$) | **✓ APROBADO** | 4.66 s | 465.3 KB | **False (0 errores)** |
| **02** | `TEST_02_2TRAMOS` | 2 tramos, puntual central ($P=50\text{ kg}$) | **✓ APROBADO** | 4.86 s | 463.9 KB | **False (0 errores)** |
| **03** | `TEST_03_3TRAMOS` | 3 tramos, carga distribuida total ($q=10\text{ kg/m}$) | **✓ APROBADO** | 6.07 s | 484.5 KB | **False (0 errores)** |
| **04** | `TEST_04_2TRAMOS` | Voladizo cantilever empotrado en origen ($q=12, P=40$) | **✓ APROBADO** | 5.47 s | 431.9 KB | **False (0 errores)** |
| **05** | `TEST_05_4TRAMOS` | 4 tramos, doble voladizo con apoyos interiores | **✓ APROBADO** | 3.90 s | 498.9 KB | **False (0 errores)** |
| **06** | `TEST_06_3TRAMOS` | 3 tramos, momentos concentrados puros ($+30, -15\text{ kg}\cdot\text{m}$) | **✓ APROBADO** | 4.43 s | 469.3 KB | **False (0 errores)** |
| **07** | `TEST_07_5TRAMOS` | 5 tramos asimétrica con cargas combinadas ($q, P, M$) | **✓ APROBADO** | 5.16 s | 479.8 KB | **False (0 errores)** |
| **08** | `TEST_08_6TRAMOS` | 6 tramos con apoyos interiores y cargas múltiples | **✓ APROBADO** | 4.82 s | 476.1 KB | **False (0 errores)** |
| **09** | `TEST_09_8TRAMOS` | 8 tramos con cargas continuas y puntuales mixtas | **✓ APROBADO** | 6.63 s | 491.9 KB | **False (0 errores)** |
| **10** | `TEST_10_10TRAMOS` | **10 tramos completos** con máxima variabilidad de cargas | **✓ APROBADO** | 6.32 s | 514.7 KB | **False (0 errores)** |

> **Diagnóstico:** **10 de 10 pruebas aprobadas (100% de éxito).** Ningún archivo presentó regiones corruptas (`Corrupted: False`), los gráficos se evaluaron sin errores y los PDFs vectoriales se exportaron limpios.

---

## 🔧 Parches Técnicos Desarrollados e Integrados

### 1. Parche COM #1: Selección Explícita de Hoja y Cierre Seguro
- **Diagnóstico:** Mathcad crea por defecto una hoja vacía `"Sin título"` en el índice 0. Al abrir un nuevo archivo sin especificar el índice, `mc.ActiveWorksheet` quedaba vinculado a la hoja en blanco, produciendo PDFs vacíos de 1.7 KB.
- **Solución implementada:** Selección explícita mediante `ws = mc.Worksheets.Item(mc.Worksheets.Count - 1)`. En el bloque `finally:` se forzó `mc.CloseAll(0)` y `mc.Quit(0)` para liberar memoria RAM.

### 2. Parche XML #2: Aislamiento de Atributos de Imagen en `<picture><png>`
- **Diagnóstico:** Mathcad Prime 11 rechaza etiquetas `<region>` que contengan atributos no reconocidos como `display-width` o `display-height`.
- **Solución implementada:** Las dimensiones de escalado visual se aplican exclusivamente al nodo interno `<picture><png display-width="550" display-height="165"/>`, dejando a `<region>` únicamente con sus atributos estándar.

### 3. Parche AST #3: Encadenamiento Binario Asociativo Izquierdo en Macaulay
- **Diagnóstico:** Expresiones con múltiples términos de singularidad requerían un árbol binario estricto de operadores (`<apply><plus/><apply><minus/>...</apply></apply>`).
- **Solución implementada:** Creación del algoritmo `build_additive_chain()` en `mcdx_generator.py`, que ensambla recursivamente de izquierda a derecha todos los términos de apoyos, cargas uniformes de tramo activo, tramos superados, momentos y cargas puntuales.

### 4. Parche UI #4: Presets Rápidos en 1 Clic y Redimensionamiento Adaptativo
- **Diagnóstico:** La entrada manual de hasta 10 tramos en pleno examen demandaba agilidad.
- **Solución implementada:** Integración de la barra superior de Presets Rápidos en 1 Clic tanto en la interfaz de escritorio (`app_gui.py`) como en la aplicación web (`index.html`), incluyendo el nuevo preset de examen de 3 tramos ($L=[2, 4, 2]\text{ m}, q_2=500\text{ kg/m}$).

### 5. Parche Crítico #5: Desacoplamiento de Índices XML y Búsqueda por Region-ID
- **Diagnóstico:** El acceso previo por índice de lista (`regs[k]`) se desfasaba tras la eliminación de regiones parásitas, provocando que las reacciones sobreescribieran el rango de la variable $x$ en la Región 64 y asignaran cargas a tramos equivocados.
- **Solución implementada:** Búsqueda y modificación exclusiva mediante diccionario `regs_dict.get(region_id)`. Se garantiza inmunidad absoluta ante cualquier cambio en el orden o eliminación de regiones XML.

### 6. Parche Crítico #6: Autoescalado Dinámico de Ejes 2D para DFC y DMF
- **Diagnóstico:** Los diagramas en Mathcad Prime 11 mantenían cotas fijas en los ejes XML (`start="0" end="5"` en X, y límites fijos en Y), provocando el corte visual de vigas de más de 5 metros y el aplanamiento de curvas con cargas elevadas.
- **Solución implementada:** Evaluación analítica previa de extremos $(Q_{\min}, Q_{\max}, M_{\min}, M_{\max})$ y actualización dinámica de los atributos `start`, `end` y `positionticmark` en los elementos `<ns0:xAxis>` y `<ns0:yAxis>` de las Regiones 66 y 67, asegurando un encuadre visual completo con margen del 15%.

### 7. Parche Web #7: Generador Nativo en JavaScript para la Web App (`index.html`)
- **Diagnóstico:** La página web interactiva utilizaba la plantilla antigua con regiones duplicadas y no regeneraba los árboles MathML de Macaulay ni los límites de los gráficos en el `.mcdx` descargado.
- **Solución implementada:** Implementación completa en JavaScript del generador dinámico de árboles DOM MathML de singularidad, poda de imágenes parásitas, autoescalado de ejes y presets directos de examen, igualando la funcionalidad del generador de escritorio.

---

## 📐 Fundamento Teórico del Método

### 1. Funciones de Singularidad con Operadores Booleanos en Mathcad
En Mathcad Prime, las expresiones de comparación como `(x ≥ a)` o `(a > x > 0)` operan como **funciones escalón (Heaviside)**:
$$(x \ge a) = \begin{cases} 1 & \text{si } x \ge a \quad (\text{Verdadero}) \\ 0 & \text{si } x < a \quad (\text{Falso}) \end{cases}$$

Esto permite formular una sola función continua a trozos válida para toda la viga $[0, L_{\text{tot}}]$:

$$\begin{aligned}
M(x) := & + V_A \cdot x \\
& - (a > x > 0) \cdot q \cdot \frac{x^2}{2} \\
& - (x \ge a) \cdot q \cdot a \cdot \left(x - \frac{a}{2}\right) \\
& + (x \ge a) \cdot M \\
& - (x \ge a + b) \cdot P_1 \cdot (x - (a + b)) \\
& + (x \ge a + b + c) \cdot V_D \cdot (x - (a + b + c))
\end{aligned}$$

### 2. ¿Por qué se quitan los brazos en la función de cortante $Q(x)$?
Por la relación diferencial de equilibrio:
$$Q(x) = \frac{d M(x)}{dx}$$

Al derivar respecto a $x$:
- $\frac{d}{dx}(V_A \cdot x) = V_A \implies$ El brazo lineal desaparece.
- $\frac{d}{dx}\left(q \frac{x^2}{2}\right) = q \cdot x \implies$ La parábola se deriva a variación lineal.
- $\frac{d}{dx}\left[q \cdot a \left(x - \frac{a}{2}\right)\right] = q \cdot a \implies$ Queda la fuerza constante del tramo.
- $\frac{d}{dx}[M] = 0 \implies$ **¡Un momento concentrado no produce cortante!** Desaparece por completo en $Q(x)$.
- $\frac{d}{dx}[P_1 \cdot (x - x_1)] = P_1 \implies$ Queda la fuerza puntual pura.

### 3. Rango de Discretización Milimétrico
$$x := 0\text{ m}, 0.001\text{ m} .. L_{\text{tot}}$$
- Paso $\Delta x = 1\text{ mm}$: Genera miles de puntos de evaluación para trazar los saltos verticales instantáneos sin diagonales falsas.
- Localiza con precisión milimétrica la coordenada de cortante cero donde ocurre el momento máximo ($M_{\max}$).

---

## 📂 Estructura del Repositorio

```text
diagramas-en-MATHCAD/
├── index.html                            # APLICACIÓN WEB INTERACTIVA EN VIVO (GitHub Pages)
├── app_gui.py                            # Interfaz gráfica de escritorio con presets y preview en vivo
├── beam_engine.py                        # Motor analítico y generador de gráficos vectoriales con cortes
├── mcdx_generator.py                     # Constructor dinámico de paquetes OPC nativos .mcdx
├── run_10_tests.py                       # Batería de 10 pruebas de estrés automatizadas vía COM
├── build_template.py                     # Generador de la plantilla base validada de 10 tramos
├── mcdx_toolkit.py                       # Utilidades de inspección y validación OPC
├── INICIAR_APP_VIGAS.bat                 # Acceso directo para iniciar la interfaz gráfica de escritorio
├── ABRIR_PLANTILLA_MATHCAD.bat           # Acceso directo para abrir la plantilla en Mathcad Prime
├── FORMULARIO_Y_MANUAL_MATHCAD_VIGAS.md  # Manual teórico y formulario exhaustivo paso a paso
├── EJERCICIO-01.mcdx                     # Plantilla base oficial del examen
├── PLANTILLA_MAESTRA_10_TRAMOS_VIGAS.mcdx# Archivo de cálculo de 10 tramos verificado
├── PLANTILLA_MAESTRA_10_TRAMOS_VIGAS.pdf # Memoria de cálculo en PDF vectorial (460 KB)
├── test_outputs/                         # Salidas verificadas de las 10 pruebas (.mcdx y .pdf)
├── README.md                             # Documentación oficial del proyecto
└── LICENSE                               # Licencia MIT
```

---

## 🔗 Enlaces Oficiales

- 🌐 **Herramienta Web en Vivo (GitHub Pages):** [https://72008081-pixel.github.io/diagramas-en-MATHCAD/](https://72008081-pixel.github.io/diagramas-en-MATHCAD/)
- 💻 **Repositorio en GitHub:** [https://github.com/72008081-pixel/diagramas-en-MATHCAD](https://github.com/72008081-pixel/diagramas-en-MATHCAD)
- 👤 **Autor:** Desarrollado para **Análisis Estructural II** por **[72008081-pixel](https://github.com/72008081-pixel)**.
