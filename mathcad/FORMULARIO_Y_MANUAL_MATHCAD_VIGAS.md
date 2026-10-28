# FORMULARIO Y MANUAL MAESTRO DE VIGAS EN PTC MATHCAD PRIME 11.0.0
## Análisis Estructural II — Método de Funciones de Singularidad / Macaulay
**Autor:** Antigravity AI Engineering Suite  
**Archivo de Plantilla Nativo:** [`PLANTILLA_MAESTRA_10_TRAMOS_VIGAS.mcdx`](file:///D:/ANTIGRAVITY%20CUBA%20V/01.%20Análisis%20Estructural%20II/01.%20PLANTILLAS%20FINALES%20EXAMENES/03.%20MATHCAD/PLANTILLA_MAESTRA_10_TRAMOS_VIGAS.mcdx)  
**Acceso Directo Windows:** [`ABRIR_PLANTILLA_MATHCAD.bat`](file:///D:/ANTIGRAVITY%20CUBA%20V/01.%20Análisis%20Estructural%20II/01.%20PLANTILLAS%20FINALES%20EXAMENES/03.%20MATHCAD/ABRIR_PLANTILLA_MATHCAD.bat)  
**PDF Vectorial Generado:** [`PLANTILLA_MAESTRA_10_TRAMOS_VIGAS.pdf`](file:///D:/ANTIGRAVITY%20CUBA%20V/01.%20Análisis%20Estructural%20II/01.%20PLANTILLAS%20FINALES%20EXAMENES/03.%20MATHCAD/PLANTILLA_MAESTRA_10_TRAMOS_VIGAS.pdf)

---

## 1. INTRODUCCIÓN Y FUNDAMENTO DEL MÉTODO

En el cálculo estructural clásico de vigas sometidas a múltiples cargas (distribuidas, puntuales y momentos concentrados), la aproximación tradicional por tramos obliga al ingeniero a plantear **múltiples ecuaciones seccionales independientes** ($M_1(x), M_2(x), M_3(x), \dots$), cada una con su propio intervalo de validez local. Esto genera un desarrollo extenso, propenso a errores algebraicos y sumamente engorroso para graficar.

En **PTC Mathcad Prime 11.0.0**, este problema se resuelve de manera inmediata y elegante mediante las **Funciones de Singularidad (Método de Macaulay / Heaviside implementado con operadores booleanos)**. Gracias a este enfoque:
1. Se formula **una única función global** de Momento Flector $M(x)$ y **una única función global** de Fuerza Cortante $Q(x)$ válidas para toda la longitud de la viga $[0, L_{\text{tot}}]$.
2. Las discontinuidades y activaciones de cargas se controlan automáticamente mediante condiciones lógicas `(x ≥ x_i)` y `(x_i > x > x_{i-1})` que actúan como interruptores (toman valor $1$ cuando se cumplen y $0$ cuando no).
3. Los diagramas de Fuerza Cortante (DFC) y Momento Flector (DMF) se generan en **tiempo real**, actualizándose instantáneamente ante cualquier cambio en las cargas o dimensiones.

---

## 2. GUÍA DE DATOS DE ENTRADA Y DISCRETIZACIÓN DE LA VIGA

### 2.1. ¿En cuántas partes se divide la viga y qué datos se colocan en la cabecera?
Para resolver cualquier ejercicio en Mathcad, la regla de oro de la discretización estructural establece que **se define un nuevo tramo en cada punto singular de la viga**. 

Un **punto singular (o nodo $x_i$)** ocurre obligatoriamente donde:
1. Comienza o termina una carga distribuida (rectangular, triangular o trapezoidal).
2. Se aplica una carga puntual concentrada ($P_i$).
3. Se aplica un momento concentrado ($M_i$).
4. Se ubica un apoyo (aparición de una reacción vertical $R_i$ o momento de empotramiento).
5. Ocurre un cambio brusco de sección transversal o existe una rótula/articulación interna.

```
       Nodo 0         Nodo 1            Nodo 2        Nodo 3          Nodo 4
         ▼              ▼                 ▼             ▼               ▼
      [Apoyo A]    [Fin q / Momento M]  [Carga P1]  [Apoyo D]       [Carga P2]
         ▲              ▲                 ▲             ▲               ▲
         |◄── Tramo 1 ─►|◄─── Tramo 2 ───►|◄─ Tramo 3 ─►|◄── Tramo 4 ──►|
         |    L1 = a    |     L2 = b      |   L3 = c    |    L4 = d     |
```

### 2.2. Definición Paramétrica de Tramos en Mathcad Prime
En la parte superior de la plantilla, se definen las longitudes de los tramos individuales:
$$L_1 := 2\text{ m}, \quad L_2 := 1\text{ m}, \quad L_3 := 1\text{ m}, \quad L_4 := 1\text{ m}$$
Si la viga tiene menos de 10 tramos (por ejemplo 4 tramos como en el ejercicio de muestra), los tramos no utilizados simplemente se configuran en cero:
$$L_5 := 0\text{ m}, \quad L_6 := 0\text{ m}, \quad L_7 := 0\text{ m}, \quad L_8 := 0\text{ m}, \quad L_9 := 0\text{ m}, \quad L_{10} := 0\text{ m}$$

A partir de estas longitudes, Mathcad calcula automáticamente las **coordenadas nodales acumuladas**:
$$\begin{aligned}
x_0 &:= 0\text{ m} \\
x_1 &:= L_1 \\
x_2 &:= x_1 + L_2 \\
x_3 &:= x_2 + L_3 \\
x_4 &:= x_3 + L_4 \\
&\;\;\vdots \\
x_{10} &:= x_9 + L_{10} \\
L_{\text{tot}} &:= x_{10}
\end{aligned}$$

### 2.3. Asignación de Cargas por Tramo y por Nodo
- **Cargas Distribuidas por Tramo ($q_k$)**: Se define la intensidad uniforme que actúa sobre el tramo $k$ (entre $x_{k-1}$ y $x_k$):
  $$q_1 := 15\,\frac{\text{kg}}{\text{m}}, \quad q_2 := 0\,\frac{\text{kg}}{\text{m}}, \quad \dots, \quad q_{10} := 0\,\frac{\text{kg}}{\text{m}}$$
- **Cargas Puntuales en Nodos ($P_i$)**: Se definen las fuerzas verticales aplicadas en cada nodo $x_i$ (positivas hacia abajo):
  $$P_0 := 0\text{ kg}, \quad P_1 := 0\text{ kg}, \quad P_2 := 20\text{ kg}, \quad P_3 := 0\text{ kg}, \quad P_4 := 8\text{ kg}, \quad \dots$$
- **Momentos Concentrados en Nodos ($M_i$)**: Se definen los pares aplicados en cada nodo $x_i$:
  $$M_0 := 0\text{ kg}\cdot\text{m}, \quad M_1 := 10\text{ kg}\cdot\text{m}, \quad M_2 := 0\text{ kg}\cdot\text{m}, \quad \dots$$

---

## 3. CÁLCULO DE REACCIONES DE APOYO EN MATHCAD

### 3.1. Ecuación de Sumatoria de Momentos en el Apoyo $A$ ($\sum M_A = 0$)
Para hallar la reacción vertical en el apoyo $D$ ($V_D$), se toma sumatoria de momentos con respecto al apoyo inicial $A$ ($x_0 = 0$).

#### Convención de Signos:
- **Momentos Horarios ($\curvearrowright$)**: Considerados **positivos ($+$)**.
- **Momentos Antihorarios ($\curvearrowleft$)**: Considerados **negativos ($-$)**.

#### Desglose de cada término y su brazo de palanca:
1. **Carga distribuida $q$ en el tramo $a$**:
   - Carga resultante total: $R_q = q \cdot a = (15\text{ kg/m}) \cdot (2\text{ m}) = 30\text{ kg}$.
   - Centroide de la carga: Ubicado en la mitad del tramo, es decir, a distancia $\frac{a}{2} = 1\text{ m}$ desde $A$.
   - Momento horario respecto a $A$:
     $$\text{Momento}_q = +(q \cdot a) \cdot \left(\frac{a}{2}\right) = + q \cdot \frac{a^2}{2} = 15 \cdot \frac{2^2}{2} = +30\text{ kg}\cdot\text{m}$$
2. **Momento concentrado $M$ aplicado en $x = a$**:
   - Como gira en sentido horario, suma directamente:
     $$\text{Momento}_M = +M = +10\text{ kg}\cdot\text{m}$$
   - > [!IMPORTANT]
     > **¿Por qué NO tiene brazo de palanca?**  
     > Un momento concentrado es un par de fuerzas puro. Su magnitud ya tiene dimensiones de $[Fuerza] \times [Longitud]$ ($\text{kg}\cdot\text{m}$). Multiplicarlo por una distancia sería un error dimensional grave ($[F] \times [L]^2$). Actúa con la misma intensidad independientemente del punto donde se calculen momentos.
3. **Carga puntual $P_1$ aplicada en $x = a+b$**:
   - Fuerza hacia abajo: $P_1 = 20\text{ kg}$.
   - Distancia desde el apoyo $A$: Brazo acumulado $= (a + b) = 2 + 1 = 3\text{ m}$.
   - Momento horario:
     $$\text{Momento}_{P1} = + P_1 \cdot (a + b) = 20 \cdot 3 = +60\text{ kg}\cdot\text{m}$$
4. **Reacción vertical en el apoyo $D$ ($V_D$) en $x = a+b+c$**:
   - Reacción hacia arriba (desconocida a priori, asumida hacia arriba).
   - Distancia desde el apoyo $A$: Brazo acumulado $= (a + b + c) = 2 + 1 + 1 = 4\text{ m}$.
   - Como empuja hacia arriba, genera giro antihorario respecto a $A$ (signo negativo):
     $$\text{Momento}_{VD} = - V_D \cdot (a + b + c) = - V_D \cdot 4\text{ m}$$
5. **Carga puntual en el extremo $P_2$ en $x = a+b+c+d$**:
   - Fuerza hacia abajo: $P_2 = 8\text{ kg}$.
   - Distancia desde el apoyo $A$: Brazo total $= (a + b + c + d) = 2 + 1 + 1 + 1 = 5\text{ m}$.
   - Momento horario:
     $$\text{Momento}_{P2} = + P_2 \cdot (a + b + c + d) = 8 \cdot 5 = +40\text{ kg}\cdot\text{m}$$

#### Ecuación de Equilibrio en Mathcad Prime:
Se escribe la igualdad usando el operador booleano de restricción (`Ctrl + =`):
$$q \cdot \frac{a^2}{2} + M + P_1 \cdot (a + b) - V_D \cdot (a + b + c) + P_2 \cdot (a + b + c + d) = 0$$

Para que Mathcad despeje la incógnita simbólica y numéricamente con unidades, se aplica el operador de evaluación simbólica (`Ctrl + .`) con la palabra clave `solve, VD`:
$$V_D := \left[ q \cdot \frac{a^2}{2} + M + P_1 \cdot (a + b) - V_D \cdot (a + b + c) + P_2 \cdot (a + b + c + d) = 0 \right] \xrightarrow{\text{solve, } V_D} 35\text{ kg}$$

Sustitución numérica:
$$V_D = \frac{30 + 10 + 60 + 40}{4} = \frac{140}{4} = \mathbf{35\text{ kg}}$$

---

### 3.2. Ecuación de Sumatoria de Fuerzas Verticales ($\sum F_y = 0$)
Una vez conocida $V_D$, se plantea el equilibrio vertical para hallar la reacción en el apoyo $A$ ($V_A$):

#### Convención:
- Fuerzas hacia arriba: Positivas ($+$) $\implies +V_A, +V_D$.
- Fuerzas hacia abajo: Negativas ($-$) $\implies -q \cdot a, -P_1, -P_2$.

#### Ecuación en Mathcad Prime:
$$V_A - q \cdot a - P_1 + V_D - P_2 = 0$$

Despeje automático con `solve, VA`:
$$V_A := \left[ V_A - q \cdot a - P_1 + V_D - P_2 = 0 \right] \xrightarrow{\text{solve, } V_A} 23\text{ kg}$$

Sustitución numérica:
$$V_A = q \cdot a + P_1 + P_2 - V_D = (15 \times 2) + 20 + 8 - 35 = 30 + 20 + 8 - 35 = \mathbf{23\text{ kg}}$$

---

### 3.3. Resolución de Vigas Hiperestáticas en Mathcad Prime (Solve Block)
Cuando la viga tiene más de 2 apoyos verticales o empotramientos (grado de hiperestaticidad $GH \ge 1$), las dos ecuaciones de equilibrio estático no alcanzan para despejar todas las reacciones. 

En Mathcad Prime, esto se resuelve de forma automática y unificada mediante un **Solve Block (Bloque de Solución)** que combina:
1. **Equilibrio Estático Global**: $\sum F_y = 0$ y $\sum M = 0$.
2. **Compatibilidad Cinemática de Deformaciones**: Integrando dos veces la ecuación de Macaulay para la elástica:
   $$EI \cdot \frac{d^2 y}{dx^2} = M(x) \implies EI \cdot y(x) = \iint M(x)\,dx^2 + C_1 x + C_2$$
   En cada apoyo intermedio $k$, el asentamiento es nulo: $y(x_k) = 0$.
   Si hay un empotramiento en el origen: $\theta(0) = 0$ y $y(0) = 0$.

```mathcad
// 1. Valores Semilla (Guess values)
VA := 10 kg
VB := 10 kg
VC := 10 kg
C1 := 0 kg*m^2
C2 := 0 kg*m^3

// 2. Bloque de Solución
Given
  // Equilibrio
  VA + VB + VC - q*Ltot - P1 == 0
  VB*x_B + VC*x_C - q*(Ltot^2 / 2) - P1*x_P == 0
  
  // Compatibilidad elastica (deflexion cero en los apoyos)
  y_elastica(x_A, VA, VB, VC, C1, C2) == 0
  y_elastica(x_B, VA, VB, VC, C1, C2) == 0
  y_elastica(x_C, VA, VB, VC, C1, C2) == 0

// 3. Resolucion simultanea exacta
(VA, VB, VC, C1, C2) := Find(VA, VB, VC, C1, C2)
```
Esto resuelve instantáneamente cualquier viga continua de 2, 3, 4 o más tramos.

---

## 4. ANÁLISIS DE SECCIONES CON CONDICIONES BOOLEANAS (MACAULAY)

### 4.1. ¿Por qué se condiciona cada parte en la ecuación de momentos?
En Mathcad, los operadores de comparación lógica como `(x ≥ a)` o `(a > x > 0)` son **funciones booleanas de paso unitario**:
$$(x \ge a) = \begin{cases} 1 & \text{si } x \ge a \quad \text{(Verdadero)} \\ 0 & \text{si } x < a \quad \text{(Falso)} \end{cases}$$

Esto reproduce exactamente la **Función Escalón Unitario de Heaviside**:
$$H(x - a) = (x \ge a)$$

Al multiplicar cualquier término estructural por su condición booleana:
$$\text{Término} \cdot (x \ge x_i)$$
- **Antes del punto de aplicación ($x < x_i$)**: La condición vale $0$. El término completo se multiplica por cero y **se apaga automáticamente**.
- **A partir del punto de aplicación ($x \ge x_i$)**: La condición vale $1$. El término completo se multiplica por uno y **se activa con su valor físico real**.

### 4.2. Desglose Riguroso Término a Término de $M(x)$
La ecuación implementada en la práctica es:
$$\begin{aligned}
M(x) := & + V_A \cdot x \\
& - (a > x > 0) \cdot q \cdot \frac{x^2}{2} \\
& - (x \ge a) \cdot q \cdot a \cdot \left(x - \frac{a}{2}\right) \\
& + (x \ge a) \cdot M \\
& - (x \ge a + b) \cdot P_1 \cdot (x - (a + b)) \\
& + (x \ge a + b + c) \cdot V_D \cdot (x - (a + b + c))
\end{aligned}$$

Analicemos por qué cada término tiene esa forma exacta:

#### 1. $+ V_A \cdot x$
- Actúa desde el origen $x = 0$ (apoyo $A$).
- La reacción $V_A$ empuja hacia arriba, provocando curvatura cóncava hacia arriba (tracción en fibras inferiores $\implies$ momento flector positivo).
- Brazo de palanca al corte $x$: la distancia directa $x$.
- No requiere condición booleana porque $x \ge 0$ en toda la viga.

#### 2. $- (a > x > 0) \cdot q \cdot \frac{x^2}{2}$  *(Carga distribuida activa en el tramo)*
- **¿Por qué tiene la condición $(a > x > 0)$?**
  Mientras el corte transversal esté ubicado dentro del tramo cargado ($0 < x < a$), la sección cortada a la izquierda solo tiene una longitud cargada igual a $x$.
  - Carga total acumulada hasta el corte: $q \cdot x$.
  - Centroide de esa carga: está ubicado en el punto medio de la zona cortada: $\frac{x}{2}$.
  - Momento flector generado:
    $$-(q \cdot x) \cdot \left(\frac{x}{2}\right) = - q \cdot \frac{x^2}{2}$$
  - El signo es negativo porque la carga empuja hacia abajo (tracción en fibras superiores).
  - Esta fórmula parabólica **únicamente es válida mientras $x < a$**. Por eso se multiplica por $(a > x > 0)$. En cuanto $x$ alcanza o supera $a$, la condición se vuelve $0$ y este término se extingue automáticamente.

#### 3. $- (x \ge a) \cdot q \cdot a \cdot \left(x - \frac{a}{2}\right)$  *(Carga distribuida superada)*
- **¿Por qué se activa para $x \ge a$?**
  Una vez que el corte transversal sobrepasa el punto $a$ ($x \ge a$), toda la carga distribuida del tramo $1$ ha quedado completamente a la izquierda del corte.
  - La fuerza resultante de esa carga ya no varía con $x$; es fija y vale: $R_q = q \cdot a$.
  - Su centroide está fijo en la coordenada: $x_G = \frac{a}{2}$.
  - Por tanto, la distancia desde ese centroide fijo hasta el corte actual $x$ es el brazo de palanca:
    $$\text{Brazo} = \left(x - \frac{a}{2}\right)$$
  - Momento flector resultante:
    $$- (q \cdot a) \cdot \left(x - \frac{a}{2}\right)$$
  - Se multiplica por $(x \ge a)$ para que empiece a actuar en el instante exacto en que $x = a$ y permanezca activo hasta el final de la viga.

#### 4. $+ (x \ge a) \cdot M$  *(Momento concentrado aplicado)*
- En $x = a$ hay un momento aplicado $M = 10\text{ kg}\cdot\text{m}$.
- **¿Por qué NO tiene brazo de palanca?**
  Porque un momento concentrado es una cupla pura. Su efecto sobre la sección transversal es inducir un **salto vertical instantáneo** en el diagrama de momentos flectores. No depende de la distancia al corte $(x - a)$. Solo se multiplica por $(x \ge a)$ para indicar que antes de $a$ no actúa ($0$) y después de $a$ actúa en su totalidad ($+M$).

#### 5. $- (x \ge a + b) \cdot P_1 \cdot (x - (a + b))$  *(Carga puntual concentrada)*
- Ubicada en la coordenada nodal $x_1 = a + b = 3\text{ m}$.
- Antes de llegar a $x_1$ ($x < 3\text{ m}$), la condición vale $0$ y la carga no afecta el corte.
- Una vez superado el nodo ($x \ge 3\text{ m}$), la fuerza hacia abajo es $P_1$, y su brazo de palanca al corte es la distancia entre la carga y la sección: $(x - (a + b))$.
- Momento: $- P_1 \cdot (x - (a + b))$.

#### 6. $+ (x \ge a + b + c) \cdot V_D \cdot (x - (a + b + c))$  *(Reacción intermedia de apoyo)*
- Ubicada en el apoyo $D$ ($x_D = a + b + c = 4\text{ m}$).
- Empuja hacia arriba con fuerza $V_D$, por lo que genera momento positivo ($+$) con brazo de palanca $(x - (a + b + c))$.

---

## 5. CÁLCULO DE CORTANTES $Q(x)$ Y ¿POR QUÉ SE QUITAN LOS BRAZOS?

### 5.1. La Ecuación de Cortante
En el archivo resuelto por el profesor, la función de cortante está formulada como:
$$Q(x) := V_A - (a > x > 0) \cdot q \cdot x - (x \ge a) \cdot q \cdot a - (x \ge a + b) \cdot P_1 + (x \ge a + b + c) \cdot V_D - (x \ge a + b + c + d) \cdot P_2$$

### 5.2. ¿Por qué se le "quitan los brazos"?

#### Razón 1: Definición Estática de Fuerza Cortante
Por definición fundamental de la estática en vigas:
- La **fuerza cortante interna $Q(x)$** en una sección transversal es la suma algebraica directa de **todas las fuerzas transversales** a la izquierda de la sección:
  $$Q(x) = \sum F_{y,\text{izquierda}}$$
  Al ser una suma de **fuerzas**, dimensionalmente **no intervienen distancias ni brazos de palanca**.
- En cambio, el **momento flector $M(x)$** es la suma de los momentos producidos por esas fuerzas respecto al centro de gravedad de la sección:
  $$M(x) = \sum M_{\text{corte}} = \sum \left(\text{Fuerza} \times \text{Brazo}\right)$$
  Por tanto, al pasar de Momento a Cortante, **los brazos de palanca desaparecen por completo**.

#### Razón 2: Relación Diferencial de Vigas (Derivada respecto a $x$)
En Resistencia de Materiales y Mecánica de Sólidos rige la ecuación diferencial de Navier-Euler:
$$Q(x) = \frac{d M(x)}{dx}$$

Al derivar formalmente cada término de $M(x)$ con respecto a la variable $x$:

| Término en Momento $M(x)$ | Derivada $\frac{d}{dx}$ | Término resultante en Cortante $Q(x)$ | Explicación Física |
| :--- | :---: | :---: | :--- |
| $+ V_A \cdot x$ | $\frac{d}{dx}(V_A \cdot x) = V_A \cdot 1$ | $+ V_A$ | El brazo lineal $x$ se convierte en 1. Queda la fuerza pura de reacción. |
| $- (a > x > 0) \cdot q \cdot \frac{x^2}{2}$ | $\frac{d}{dx}\left(q \frac{x^2}{2}\right) = q \cdot \frac{2x}{2}$ | $- (a > x > 0) \cdot q \cdot x$ | La parábola cuadrática de momento se deriva a una recta lineal de cortante. |
| $- (x \ge a) \cdot q \cdot a \cdot \left(x - \frac{a}{2}\right)$ | $\frac{d}{dx}\left[q \cdot a \cdot \left(x - \frac{a}{2}\right)\right] = q \cdot a \cdot 1$ | $- (x \ge a) \cdot q \cdot a$ | El brazo $(x - a/2)$ se deriva a 1. Queda la fuerza constante total del tramo distribuido. |
| $+ (x \ge a) \cdot M$ | $\frac{d}{dx}[M] = 0$ | **$0$ (Desaparece)** | **¡Un momento concentrado NO produce cortante!** Al derivar una constante su derivada es cero. Por eso $M$ no figura en $Q(x)$. |
| $- (x \ge a + b) \cdot P_1 \cdot (x - (a+b))$ | $\frac{d}{dx}[P_1 \cdot (x - (a+b))] = P_1 \cdot 1$ | $- (x \ge a + b) \cdot P_1$ | El brazo se anula. Queda la magnitud pura de la fuerza puntual $P_1$. |
| $+ (x \ge a+b+c) \cdot V_D \cdot (x - (a+b+c))$ | $\frac{d}{dx}[V_D \cdot (x - \dots)] = V_D \cdot 1$ | $+ (x \ge a + b + c) \cdot V_D$ | Queda la fuerza pura de reacción $V_D$. |
| *(Extremo final de la viga)* | $\frac{d}{dx}[\text{Extremo}]$ | $- (x \ge L_{\text{tot}}) \cdot P_2$ | En el extremo final $x = L_{\text{tot}}$, actúa la fuerza puntual terminal $P_2$ cerrando el diagrama a cero. |

---

## 6. RANGO DE EVALUACIÓN MILIMÉTRICO: $x := 0\text{ m}, 0.001\text{ m} .. L_{\text{tot}}$

### 6.1. ¿Cómo funciona una Variable de Rango en Mathcad Prime?
En Mathcad, la sintaxis especial:
$$\text{Variable} := \text{Inicio}, \text{Segundo\_Valor} .. \text{Final}$$
define una **Variable de Rango (Range Variable)**.

- **`0 m`**: Es el límite inferior del dominio (inicio de la viga en $x = 0$).
- **`0.001 m`**: Es el segundo valor evaluado. La diferencia entre el segundo valor y el inicial establece el **paso de muestreo ($\Delta x$ o step)**:
  $$\Delta x = 0.001\text{ m} - 0.0\text{ m} = 0.001\text{ m} = 1\text{ milímetro}$$
- **`a + b + c + d` ($L_{\text{tot}}$)**: Es el límite superior del dominio (extremo final de la viga, $5\text{ m}$).

### 6.2. ¿Por qué se utiliza exactamente un paso de $0.001\text{ m}$ ($1\text{ mm}$)?
1. **Resolución Gráfica Perfecta**: Para una viga de $5\text{ m}$, un paso de $1\text{ mm}$ evalúa exactamente:
   $$N = \frac{5.000\text{ m}}{0.001\text{ m}} + 1 = 5001\text{ puntos}$$
   Mathcad realiza este cómputo en apenas **15 milisegundos**.
2. **Discontinuidades Verticales Reales (Saltos Bruscos)**: En los puntos donde actúan cargas puntuales ($P_1, P_2$) y reacciones ($V_A, V_D$), la fuerza cortante experimenta una discontinuidad de salto instantáneo. Si se usara un paso grande (por ejemplo $\Delta x = 0.5\text{ m}$), el gráfico uniría los puntos mediante líneas diagonales inclinadas falsas. Con $\Delta x = 1\text{ mm}$, el salto se visualiza como una **línea rigurosamente vertical**.
3. **Detección Exacta del Momento Flector Máximo ($M_{\max}$)**: El momento flector máximo en una viga se produce en la sección donde la fuerza cortante se anula:
   $$Q(x^*) = 0 \implies M_{\max} = M(x^*)$$
   Con una malla de $1\text{ mm}$, la coordenada crítica $x^*$ se ubica con precisión milimétrica, impidiendo que el pico del diagrama de momentos aparezca truncado o subestimado.

---

## 7. ESPECIFICACIÓN DE LA PLANTILLA MAESTRA DE 10 TRAMOS

La plantilla generada [`PLANTILLA_MAESTRA_10_TRAMOS_VIGAS.mcdx`](file:///D:/ANTIGRAVITY%20CUBA%20V/01.%20Análisis%20Estructural%20II/01.%20PLANTILLAS%20FINALES%20EXAMENES/03.%20MATHCAD/PLANTILLA_MAESTRA_10_TRAMOS_VIGAS.mcdx) está estructurada en 6 bloques interactivos modulares:

```
┌────────────────────────────────────────────────────────────────────────┐
│  PLANTILLA MAESTRA DE VIGAS (10 TRAMOS) - PTC MATHCAD PRIME 11.0.0     │
├────────────────────────────────────────────────────────────────────────┤
│ 1. GEOMETRÍA Y TRAMOS:                                                 │
│    L1 := 2 m   L2 := 1 m   L3 := 1 m   L4 := 1 m   L5..L10 := 0 m      │
│    x0 := 0 m   x1 := L1    x2 := x1+L2 ...        Ltot := x10 = 5 m    │
├────────────────────────────────────────────────────────────────────────┤
│ 2. CARGAS APLICADAS:                                                   │
│    q1 := 15 kg/m    q2..q10 := 0 kg/m                                  │
│    P0 := 0 kg       P2 := 20 kg       P4 := 8 kg                       │
│    M1 := 10 kg*m    M0, M2..M10 := 0 kg*m                              │
├────────────────────────────────────────────────────────────────────────┤
│ 3. CÁLCULO DE REACCIONES:                                              │
│    VD := 35 kg      VA := 23 kg  (Equilibrio o Solve Block)            │
├────────────────────────────────────────────────────────────────────────┤
│ 4. FUNCIONES DE SECCIÓN (MACAULAY BOOLEANO):                           │
│    M(x) := VA*x - (x1>x>x0)*q1*(x^2/2) - (x>=x1)*q1*L1*(x - L1/2) + ...│
│    Q(x) := VA - (x1>x>x0)*q1*x - (x>=x1)*q1*L1 - (x>=x2)*P2 + ...     │
├────────────────────────────────────────────────────────────────────────┤
│ 5. RANGO DE DISCRETIZACIÓN CONTINUO:                                   │
│    x := 0 m , 0.001 m .. Ltot                                          │
├────────────────────────────────────────────────────────────────────────┤
│ 6. DIAGRAMAS DINÁMICOS EN VIVO (XY PLOTS):                             │
│    [Gráfico DFC: Curva Roja Q(x) vs x]                                 │
│    [Gráfico DMF: Curva Verde M(x) vs x]                                │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 8. HERRAMIENTAS Y SCRIPTS LOCALES DE AUTOMATIZACIÓN

Para garantizar el funcionamiento autónomo e integración con PTC Mathcad Prime 11 instalado en su máquina, se han implementado las siguientes utilidades:

### 8.1. Acceso Directo de Lanzamiento Rápido
- **Archivo:** [`ABRIR_PLANTILLA_MATHCAD.bat`](file:///D:/ANTIGRAVITY%20CUBA%20V/01.%20Análisis%20Estructural%20II/01.%20PLANTILLAS%20FINALES%20EXAMENES/03.%20MATHCAD/ABRIR_PLANTILLA_MATHCAD.bat)
- **Función:** Al hacer doble clic sobre este archivo `.bat` en el Explorador de Windows, se abre automáticamente la plantilla maestra en la interfaz de usuario de **PTC Mathcad Prime 11.0.0.0**.

### 8.2. Suite de Automatización COM en Python
- **Archivo:** [`mcdx_toolkit.py`](file:///D:/ANTIGRAVITY%20CUBA%20V/01.%20Análisis%20Estructural%20II/01.%20PLANTILLAS%20FINALES%20EXAMENES/03.%20MATHCAD/mcdx_toolkit.py)
- **Comandos disponibles en consola:**
  ```powershell
  # 1. Regenerar la plantilla desde cero:
  python mcdx_toolkit.py build

  # 2. Sincronizar y recalcular todas las ecuaciones y graficos en segundo plano:
  python mcdx_toolkit.py sync

  # 3. Exportar el documento de Mathcad a PDF vectorial:
  python mcdx_toolkit.py pdf

  # 4. Abrir en la GUI de Mathcad Prime:
  python mcdx_toolkit.py open

  # 5. Ejecutar el flujo completo de construccion, calculo y PDF:
  python mcdx_toolkit.py all
  ```

---

## 9. CONCLUSIONES Y RECOMENDACIONES DE EXAMEN

1. **Simplicidad de Uso:** Para resolver cualquier ejercicio nuevo en un examen, solo debe modificar los valores numéricos del Bloque 1 ($L_1 \dots L_{10}$) y del Bloque 2 ($q_k, P_i, M_i$). Todo el resto de la hoja se recalcula automáticamente.
2. **Consistencia de Unidades:** En Mathcad Prime, asegúrese de ingresar siempre las unidades correspondientes (`m`, `kg`, `kg/m`, `kg*m` o `kN`, `kN/m`, `kN*m`). Mathcad valida el análisis dimensional en cada paso e impide errores de suma entre cantidades incompatibles.
3. **Puntos de Inflexión:** Para ubicar los puntos de momento cero (puntos de inflexión donde cambia la curvatura de la viga), basta con usar la función de Mathcad:
   $$\text{root}(M(x), x, x_{\text{estimado}})$$
   obteniendo la coordenada exacta donde el armado de refuerzo cambia de lecho en vigas de concreto armado.
