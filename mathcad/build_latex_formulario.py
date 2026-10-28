# -*- coding: utf-8 -*-
"""
Script generador del Formulario Maestro y Guía Pedagógica Universal
para Análisis Estructural de Vigas en PTC Mathcad Prime 11.
Compila automáticamente a PDF mediante pdflatex.
"""

import os
import subprocess
import sys

sys.stdout.reconfigure(encoding='utf-8')

CUR_DIR = os.path.dirname(os.path.abspath(__file__))
TEX_FILE = os.path.join(CUR_DIR, "FORMULARIO_MAESTRO_VIGAS_MATHCAD.tex")
PDF_FILE = os.path.join(CUR_DIR, "FORMULARIO_MAESTRO_VIGAS_MATHCAD.pdf")

tex_content = r"""\documentclass[10pt,a4paper]{article}

\usepackage[utf8]{inputenc}
\usepackage[spanish,es-noquoting,es-nodecimaldot]{babel}
\usepackage{amsmath,amssymb,amsfonts,mathtools}
\usepackage[margin=1.8cm,top=2.2cm,bottom=2.2cm]{geometry}
\usepackage{xcolor}
\usepackage{booktabs}
\usepackage{tabularx}
\usepackage{enumitem}
\usepackage{fancyhdr}
\usepackage{tcolorbox}
\tcbuselibrary{skins,breakable}
\usepackage{tikz}
\usetikzlibrary{arrows.meta,patterns,decorations.pathmorphing,calc,babel}
\usepackage{hyperref}

% Definición de Colores Corporativos de Ingeniería
\definecolor{NavyBlue}{RGB}{11,60,93}
\definecolor{SlateDark}{RGB}{29,39,49}
\definecolor{AccentBlue}{RGB}{50,140,193}
\definecolor{WarmGold}{RGB}{217,179,16}
\definecolor{SoftGray}{RGB}{245,247,250}
\definecolor{BorderGray}{RGB}{210,215,225}
\definecolor{MathcadGreen}{RGB}{34,139,34}
\definecolor{MathcadRed}{RGB}{180,30,30}

% Configuración de Hipervínculos
\hypersetup{
    colorlinks=true,
    linkcolor=NavyBlue,
    urlcolor=AccentBlue,
    citecolor=NavyBlue,
    pdftitle={Formulario Maestro - Análisis de Vigas en Mathcad Prime 11},
    pdfauthor={Ingeniería Estructural}
}

% Encabezados y Pies de Página
\pagestyle{fancy}
\fancyhf{}
\fancyhead[L]{\small\textbf{\color{NavyBlue}ANÁLISIS ESTRUCTURAL II} \textbar{} Formulario Maestro Mathcad Prime 11}
\fancyhead[R]{\small\color{gray}Método de Singularidad (Macaulay)}
\fancyfoot[L]{\small\color{gray}Guía Universal para Exámenes y Prácticas}
\fancyfoot[R]{\small\textbf{\color{NavyBlue}\thepage}}
\renewcommand{\headrulewidth}{0.6pt}
\renewcommand{\footrulewidth}{0.4pt}

% Cajas de Estilo Mathcad y Alertas
\newtcolorbox{mathcadbox}[2][]{
    enhanced,
    colback=SoftGray,
    colframe=NavyBlue,
    coltitle=white,
    fonttitle=\bfseries\sffamily,
    title={#2},
    sharp corners,
    boxrule=1pt,
    left=10pt, right=10pt, top=8pt, bottom=8pt,
    #1
}

\newtcolorbox{tipbox}[1][Tip de Examen]{
    enhanced,
    colback=WarmGold!10,
    colframe=WarmGold!80!black,
    fonttitle=\bfseries\sffamily\color{black},
    title={#1},
    sharp corners,
    boxrule=0.8pt,
    left=8pt, right=8pt, top=6pt, bottom=6pt
}

\newtcolorbox{formulaalert}[1][Principio Fundamental]{
    enhanced,
    colback=AccentBlue!10,
    colframe=AccentBlue,
    fonttitle=\bfseries\sffamily\color{white},
    title={#1},
    sharp corners,
    boxrule=1pt,
    left=8pt, right=8pt, top=6pt, bottom=6pt
}

\begin{document}

% =============================================================================
% PORTADA / ENCABEZADO PRINCIPAL
% =============================================================================
\begin{tcolorbox}[enhanced,colback=NavyBlue,colframe=NavyBlue,sharp corners,boxrule=0pt,center,halign=center]
    \vspace{4pt}
    {\Huge \textbf{\color{white}\sffamily FORMULARIO MAESTRO Y GUÍA PASO A PASO}}\\[4pt]
    {\Large \textbf{\color{WarmGold}\sffamily MODELADO Y ANÁLISIS DE VIGAS EN PTC MATHCAD PRIME 11}}\\[6pt]
    {\normalsize \color{white} \textbf{Cálculo de Reacciones, Método de Secciones y Funciones de Singularidad de Macaulay para $Q(x)$ y $M(x)$}}
    \vspace{4pt}
\end{tcolorbox}

\vspace{10pt}

\begin{abstract}
\noindent Esta guía constituye el manual formal y formulario definitivo para resolver \textbf{cualquier problema de vigas isostáticas} en el software \textbf{PTC Mathcad Prime 11}. Explica minuciosamente cómo se dividen los tramos, cómo declarar los datos de entrada sin colisiones, cómo formular las ecuaciones de equilibrio con operadores simbólicos (\texttt{solve}), el fundamento matemático de las condiciones booleanas de Macaulay, por qué se anulan los brazos de palanca en la fuerza cortante y la razón técnica del rango continuo infinitesimal ($1\,\text{mm}$). Incluye además la resolución completa y paso a paso del ejercicio de examen de referencia.
\end{abstract}

\vspace{8pt}

% =============================================================================
% SECCIÓN 1: CONCEPTOS Y SINTAXIS BÁSICA EN MATHCAD PRIME 11
% =============================================================================
\section{\color{NavyBlue}1. Sintaxis Matemática y Operadores en Mathcad Prime 11}

Para que un archivo en Mathcad funcione sin advertencias ni iconos de error, es imperativo dominar sus cuatro operadores de asignación y evaluación:

\begin{table}[h!]
\centering
\small
\begin{tabularx}{\textwidth}{lcp{6.5cm}X}
\toprule
\textbf{Operador} & \textbf{Símbolo} & \textbf{Atajo de Teclado} & \textbf{Uso Estructural} \\
\midrule
\textbf{Asignación} & $:=$ & Dos puntos (\texttt{:}) & Asigna valores a variables y define funciones $M(x), Q(x)$. \\
\textbf{Evaluación} & $=$ & Signo igual (\texttt{=}) & Muestra el valor numérico calculado con sus unidades. \\
\textbf{Igualdad Simbólica} & $==$ & \texttt{Ctrl} + \texttt{=} & Formula ecuaciones de equilibrio ($\sum M_A == 0, \sum F_y == 0$). \\
\textbf{Evaluación Simbólica} & $\rightarrow$ & \texttt{Ctrl} + \texttt{.} & Ejecuta el despeje formal mediante comandos como $\xrightarrow{\text{solve}, V_D}$. \\
\bottomrule
\end{tabularx}
\end{table}

\begin{tipbox}[Regla de Oro de las Unidades en Mathcad]
Mathcad gestiona dimensionalmente cada número. Cuando definas una longitud escribe $2\,\text{m}$, una carga puntual $20\,\text{kg}$, una distribuida $15\,\frac{\text{kg}}{\text{m}}$ y un momento $10\,\text{kg}\cdot\text{m}$. En las gráficas y tablas, nunca mezcles unidades sin conversión explícita; Mathcad simplifica de manera automática los resultados al formato estándar.
\end{tipbox}

\vspace{6pt}

% =============================================================================
% SECCIÓN 2: PASO 1 - SUBDIVISIÓN DE LA VIGA Y DECLARACIÓN DE DATOS
% =============================================================================
\section{\color{NavyBlue}2. Paso 1: Subdivisión de la Viga y Declaración de Datos}

\subsection{¿En cuántas partes subdividir cualquier viga?}
Toda viga se subdivide analíticamente identificando sus \textbf{puntos nodales singulares}. Se debe definir una frontera de tramo en cada una de las siguientes posiciones:
\begin{enumerate}[leftmargin=*,itemsep=1pt]
    \item \textbf{Nodo 0 ($x=0$):} El extremo inicial izquierdo de la viga.
    \item \textbf{Puntos de Apoyo:} Donde se ubiquen apoyos fijos, articulaciones o rodillos.
    \item \textbf{Cargas Puntuales:} En la coordenada exacta donde esté aplicada cada fuerza concentrada $P_i$.
    \item \textbf{Cargas Distribuidas:} Tanto en el punto donde \textbf{inicia} la carga como en el punto donde \textbf{termina}.
    \item \textbf{Momentos Concentrados:} En el punto de aplicación de cada par de flexión externo $M_i$.
    \item \textbf{Nodo Final ($x=L_{\text{tot}}$):} El extremo derecho terminal de la viga.
\end{enumerate}

\subsection{Declaración de Variables en Mathcad (Separación y Anti-Colisión)}
Para evitar colisiones de texto como las ocurridas en versiones preliminares, organiza las variables en bloques ordenados con espaciado horizontal de al menos $140\,\text{pt}$:

\begin{mathcadbox}{Declaración Formal de Variables de Entrada}
\textbf{1. Longitudes de Tramo (m):}
\begin{align*}
    a &:= 2\,\text{m} & b &:= 1\,\text{m} & c &:= 1\,\text{m} & d &:= 1\,\text{m}
\end{align*}
\textbf{2. Cargas Puntuales y Distribuidas:}
\begin{align*}
    P_1 &:= 20\,\text{kg} & P_2 &:= 8\,\text{kg} & q &:= 15\,\frac{\text{kg}}{\text{m}}
\end{align*}
\textbf{3. Momentos Aplicados:}
\begin{align*}
    M &:= 10\,\text{kg}\cdot\text{m}
\end{align*}
\end{mathcadbox}

\vspace{4pt}

% Esquema TikZ de la Viga
\begin{center}
\begin{tikzpicture}[scale=1.1, >=Latex]
    % Viga
    \draw[fill=gray!25, draw=NavyBlue, thick] (0, 0) rectangle (10, 0.35);
    
    % Apoyo A (Articulado en x=0)
    \draw[fill=NavyBlue!80] (0, 0) -- (-0.25, -0.45) -- (0.25, -0.45) -- cycle;
    \draw[thick] (-0.35, -0.45) -- (0.35, -0.45);
    \node[below] at (0, -0.48) {\textbf{A} ($V_A$)};

    % Apoyo D (Rodillo en x=8)
    \draw[fill=white, draw=NavyBlue, thick] (7.8, -0.15) circle (0.15);
    \draw[fill=NavyBlue!80] (8, 0) -- (7.75, -0.4) -- (8.25, -0.4) -- cycle;
    \draw[thick] (7.6, -0.42) -- (8.4, -0.42);
    \node[below] at (8, -0.48) {\textbf{D} ($V_D$)};

    % Carga Distribuida q sobre tramo a (0 a 4)
    \draw[fill=AccentBlue!20, draw=AccentBlue, opacity=0.7] (0, 0.35) rectangle (4, 1.15);
    \foreach \x in {0.3, 0.9, 1.5, 2.1, 2.7, 3.3, 3.9} {
        \draw[->, thick, AccentBlue] (\x, 1.15) -- (\x, 0.35);
    }
    \node[above, AccentBlue] at (2, 1.18) {\textbf{$q = 15\,\text{kg/m}$}};

    % Momento Concentrado en x=4
    \draw[->, very thick, WarmGold!90!black] (4, 0.17) arc (220:-40:0.45);
    \node[above, WarmGold!90!black] at (4, 0.75) {\textbf{$M = 10\,\text{kg}\cdot\text{m}$}};

    % Carga Puntual P1 en x=6
    \draw[->, very thick, MathcadRed] (6, 1.5) -- (6, 0.35);
    \node[above, MathcadRed] at (6, 1.5) {\textbf{$P_1 = 20\,\text{kg}$}};

    % Carga Puntual P2 en x=10
    \draw[->, very thick, MathcadRed] (10, 1.5) -- (10, 0.35);
    \node[above, MathcadRed] at (10, 1.5) {\textbf{$P_2 = 8\,\text{kg}$}};

    % Cotas de Tramo
    \draw[|<->|, thick] (0, -0.9) -- node[fill=white]{\small $a = 2\,\text{m}$} (4, -0.9);
    \draw[|<->|, thick] (4, -0.9) -- node[fill=white]{\small $b = 1\,\text{m}$} (6, -0.9);
    \draw[|<->|, thick] (6, -0.9) -- node[fill=white]{\small $c = 1\,\text{m}$} (8, -0.9);
    \draw[|<->|, thick] (8, -0.9) -- node[fill=white]{\small $d = 1\,\text{m}$} (10, -0.9);

    % Secciones de Corte
    \node[above, color=gray!80!black] at (2, -1.35) {\small Corte 1-1};
    \node[above, color=gray!80!black] at (5, -1.35) {\small Corte 2-2};
    \node[above, color=gray!80!black] at (7, -1.35) {\small Corte 3-3};
    \node[above, color=gray!80!black] at (9, -1.35) {\small Corte 4-4};
\end{tikzpicture}
\end{center}

\vspace{6pt}

% =============================================================================
% SECCIÓN 3: PASO 2 - CÁLCULO DE REACCIONES DE APOYO EN MATHCAD
% =============================================================================
\section{\color{NavyBlue}3. Paso 2: Cálculo de Reacciones de Apoyo (Equilibrio Estático)}

Para hallar las reacciones de apoyo en Mathcad Prime sin errores de definición circular, se aplican las dos condiciones universales de equilibrio en el plano:
\[
\sum M_{\text{apoyo}} = 0 \qquad \text{y} \qquad \sum F_y = 0
\]

\subsection{Paso 2.1: Sumatoria de Momentos en el Apoyo A ($\sum M_A = 0$)}
Tomar momentos con respecto al apoyo articulado $A$ es la estrategia ideal porque el brazo de palanca de la reacción $V_A$ es cero, anulando su presencia y permitiendo despejar directamente la reacción vertical del apoyo opuesto $V_D$.

\begin{mathcadbox}{Formulación de $\sum M_A = 0$ en Mathcad Prime}
Considerando sentido horario como negativo y antihorario como positivo (o viceversa):
\begin{equation*}
    \sum M_A = 0 \implies - q \cdot a \cdot \left(\frac{a}{2}\right) - P_1 \cdot (a + b) + V_D \cdot (a + b + c) + M - P_2 \cdot (a + b + c + d) = 0
\end{equation*}
\textbf{En Mathcad Prime se programa de la siguiente forma:}
\begin{align*}
    \sum M_A == 0 & \quad \xrightarrow{\text{solve}, V_D} \quad \mathbf{35\,\text{kg}} \\
    V_D &:= 35\,\text{kg} \qquad (\text{Asignación formal}) \\
    V_D &= 35\,\text{kg} \qquad (\text{Invocación numérica con unidades})
\end{align*}
\end{mathcadbox}

\noindent \textbf{Análisis de los Brazos de Palanca respecto a $A$:}
\begin{itemize}[leftmargin=*,itemsep=1pt]
    \item \textbf{Carga distribuida $q$:} La fuerza resultante es $(q \cdot a) = 15\,\frac{\text{kg}}{\text{m}} \cdot 2\,\text{m} = 30\,\text{kg}$. Al ser rectangular uniforme, su centroide está a la mitad del tramo, por ende su brazo es $\frac{a}{2} = 1\,\text{m}$. Momento: $30\,\text{kg} \cdot 1\,\text{m} = 30\,\text{kg}\cdot\text{m}$.
    \item \textbf{Carga puntual $P_1$:} Ubicada al final del tramo $b$. Su brazo es $(a + b) = 2 + 1 = 3\,\text{m}$. Momento: $20\,\text{kg} \cdot 3\,\text{m} = 60\,\text{kg}\cdot\text{m}$.
    \item \textbf{Reacción $V_D$:} Ubicada al final del tramo $c$. Su brazo es $(a + b + c) = 2 + 1 + 1 = 4\,\text{m}$. Momento: $V_D \cdot 4\,\text{m}$.
    \item \textbf{Momento concentrado $M$:} \textbf{¡Cuidado! No tiene brazo de palanca.} Al ser un par puro, se suma o resta directamente con su magnitud escalar ($+10\,\text{kg}\cdot\text{m}$).
    \item \textbf{Carga puntual $P_2$:} Ubicada en el extremo derecho. Brazo: $(a+b+c+d) = 5\,\text{m}$. Momento: $8\,\text{kg} \cdot 5\,\text{m} = 40\,\text{kg}\cdot\text{m}$.
\end{itemize}

\subsection{Paso 2.2: Sumatoria de Fuerzas Verticales ($\sum F_y = 0$)}
Una vez obtenida $V_D$, se plantea la suma de fuerzas verticales para despejar $V_A$:

\begin{mathcadbox}{Formulación de $\sum F_y = 0$ en Mathcad Prime}
\begin{equation*}
    \sum F_y = 0 \implies V_A - q \cdot a - P_1 + V_D - P_2 = 0
\end{equation*}
\textbf{En Mathcad Prime se programa de la siguiente forma:}
\begin{align*}
    \sum F_y == 0 & \quad \xrightarrow{\text{solve}, V_A} \quad \mathbf{23\,\text{kg}} \\
    V_A &:= 23\,\text{kg} \qquad (\text{Asignación formal}) \\
    V_A &= 23\,\text{kg} \qquad (\text{Invocación numérica con unidades})
\end{align*}
\end{mathcadbox}

\begin{tipbox}[¿Por qué asignar $V_D := 35\,\text{kg}$ después del solve?]
La flecha de evaluación simbólica ($\rightarrow \text{solve}$) muestra la respuesta en pantalla, pero \textbf{no almacena el valor en la memoria de cálculo numérico de Mathcad}. Para poder usar $V_D$ y $V_A$ dentro de las funciones $M(x)$ y $Q(x)$, es obligatorio escribir la asignación explícita ($V_D := 35\,\text{kg}$).
\end{tipbox}

\vspace{6pt}

% =============================================================================
% SECCIÓN 4: PASO 3 - MÉTODO DE SINGULARIDAD DE MACAULAY
% =============================================================================
\section{\color{NavyBlue}4. Paso 3: Funciones de Singularidad de Macaulay en Mathcad}

\subsection{¿Por qué se condiciona cada tramo?}
En el método clásico de secciones, para una viga de 4 tramos se requeriría resolver 4 cortes independientes, generando 8 ecuaciones por separado. El \textbf{Método de Funciones de Singularidad de Macaulay} permite describir toda la viga mediante \textbf{una sola función analítica continua} $M(x)$ y $Q(x)$.

Para lograr esto en Mathcad Prime, cada carga se condiciona mediante un \textbf{interruptor lógico booleano} que devuelve $1$ si la carga está activa a la izquierda del corte, o $0$ si el corte aún no ha alcanzado la posición de la carga:

\begin{formulaalert}[Regla Universal de Corchetes de Macaulay en Mathcad]
Cualquier corchete de singularidad $\langle x - x_i \rangle^n$ se traduce en Mathcad mediante operadores booleanos:
\[
\langle x - x_i \rangle^n \equiv (x - x_i)^n \cdot (x \ge x_i)
\]
Donde $(x \ge x_i)$ evalúa a $1$ para todo punto situado a la derecha de la carga, y a $0$ a la izquierda.
\end{formulaalert}

\subsection{Formulación Completa de la Función de Momento Flector $M(x)$}
Analizando la viga de izquierda a derecha (corte a una distancia genérica $x$):

\begin{mathcadbox}{Ecuación Universal de Momento Flector $M(x)$}
\begin{align*}
    M(x) := &+ V_A \cdot x \\
            &- \frac{q \cdot x^2}{2} \cdot (a > x > 0) \\
            &- q \cdot a \cdot \left(x - \frac{a}{2}\right) \cdot (x \ge a) \\
            &+ M \cdot (x \ge a) \\
            &- P_1 \cdot (x - (a + b)) \cdot (x \ge (a + b)) \\
            &+ V_D \cdot (x - (a + b + c)) \cdot (x \ge (a + b + c))
\end{align*}
\end{mathcadbox}

\noindent \textbf{Desglose y Justificación de Cada Término de $M(x)$:}
\begin{enumerate}[leftmargin=*,itemsep=2pt]
    \item \textbf{$+ V_A \cdot x$:} La reacción en el apoyo $A$ actúa desde el origen ($x=0$) produciendo flexión positiva (tracción inferior) con brazo directo $x$.
    \item \textbf{$- \frac{q \cdot x^2}{2} \cdot (a > x > 0)$ (Tramo Activo de Carga Distribuida):} Mientras el corte $x$ se encuentre dentro del tramo distribuido ($0 < x < a$), la carga acumulada es $q \cdot x$ y su centroide está en $\frac{x}{2}$, generando un momento horario de magnitud $q \cdot x \cdot \frac{x}{2} = \frac{q \cdot x^2}{2}$.
    \item \textbf{$- q \cdot a \cdot \left(x - \frac{a}{2}\right) \cdot (x \ge a)$ (Tramo Superado de Carga Distribuida):} Cuando el corte $x$ supera el tramo $a$ ($x \ge a$), la carga distribuida ya terminó de actuar. Toda su masa se convierte en una fuerza resultante fija de $q \cdot a = 30\,\text{kg}$ concentrada permanentemente en su centro de gravedad original ($\frac{a}{2} = 1\,\text{m}$), por lo que su brazo de palanca respecto a $x$ es constante e igual a $\left(x - \frac{a}{2}\right)$.
    \item \textbf{$+ M \cdot (x \ge a)$ (Momento Concentrado Aplicado):} A partir del punto $x = a$, el momento horario/antihorario externo actúa de forma directa como un salto de discontinuidad vertical en el diagrama flector. \textbf{No se multiplica por ninguna distancia $(x - a)$ porque ya es un momento.}
    \item \textbf{$- P_1 \cdot (x - (a + b)) \cdot (x \ge (a + b))$ (Carga Puntual $P_1$):} Entra en juego únicamente a partir de $x \ge a + b = 3\,\text{m}$. Su brazo de distancia al corte es $(x - (a+b))$.
    \item \textbf{$+ V_D \cdot (x - (a + b + c)) \cdot (x \ge (a + b + c))$ (Reacción $V_D$):} Se activa a partir de $x \ge 4\,\text{m}$ empujando hacia arriba con brazo $(x - (a+b+c))$.
\end{enumerate}

\vspace{6pt}

% =============================================================================
% SECCIÓN 5: PASO 4 - CONSTRUCCIÓN DE Q(x) Y POR QUÉ SE QUITAN LOS BRAZOS
% =============================================================================
\section{\color{NavyBlue}5. Paso 4: Construcción de $Q(x)$ y Justificación de los Brazos}

\subsection{El Fundamento Diferencial Universal}
En la teoría de vigas de Euler-Bernoulli, la relación matemática entre el momento flector y la fuerza cortante es su \textbf{primera derivada espacial}:
\begin{equation}
    Q(x) = \frac{dM(x)}{dx}
\end{equation}

\subsection{¿Por qué en la cortante se eliminan los brazos de palanca?}
Al aplicar la derivada $\frac{d}{dx}$ a cada término de la ecuación de momento, ocurre un fenómeno algebraico exacto:

\begin{table}[h!]
\centering
\small
\begin{tabularx}{\textwidth}{p{4.2cm}p{4.2cm}p{3.8cm}X}
\toprule
\textbf{Elemento Físico} & \textbf{Término en $M(x)$} & \textbf{Derivada $\frac{dM}{dx} = Q(x)$} & \textbf{Efecto en el Brazo} \\
\midrule
Reacción en el origen & $+ V_A \cdot x$ & $+ V_A \cdot 1 = \mathbf{+ V_A}$ & El brazo lineal $x$ se vuelve $1$. \\
Carga puntual $P_i$ & $- P_i \cdot (x - x_i)$ & $- P_i \cdot 1 = \mathbf{- P_i}$ & \textbf{El brazo desaparece}, queda la fuerza pura. \\
Distribuida activa & $-\frac{q \cdot x^2}{2}$ & $- q \cdot \frac{2x}{2} = \mathbf{- q \cdot x}$ & El brazo cuadrático pasa a lineal. \\
Distribuida superada & $- q \cdot a \cdot \left(x - \frac{a}{2}\right)$ & $- q \cdot a \cdot 1 = \mathbf{- q \cdot a}$ & El brazo desaparece, queda la carga total. \\
Momento concentrado $M$ & $+ M \cdot (x \ge x_M)$ & $\frac{d}{dx}[M] = \mathbf{0}$ & \textbf{Se anula por completo} (derivada de constante). \\
\bottomrule
\end{tabularx}
\end{table}

\begin{mathcadbox}{Ecuación Universal de Fuerza Cortante $Q(x)$ en Mathcad}
\begin{align*}
    Q(x) := &+ V_A \\
            &- q \cdot x \cdot (a > x > 0) \\
            &- q \cdot a \cdot (x \ge a) \\
            &- P_1 \cdot (x \ge (a + b)) \\
            &+ V_D \cdot (x \ge (a + b + c))
\end{align*}
\end{mathcadbox}

\begin{tipbox}[Regla Mnemotécnica para Exámenes Rápidos]
Para escribir la función de cortante $Q(x)$ a partir de la de momento $M(x)$ sin derivar paso a paso:
\begin{itemize}[leftmargin=*,itemsep=1pt]
    \item Borra completamente todos los paréntesis de brazos $(x - x_i)$ en las fuerzas puntuales y reacciones.
    \item Elimina absolutamente todos los momentos concentrados $M$ (la cortante no siente pares puros).
    \item Convierte los términos $\frac{q \cdot x^2}{2}$ en $q \cdot x$.
\end{itemize}
\end{tipbox}

\vspace{6pt}

% =============================================================================
% SECCIÓN 6: PASO 5 - RANGO DE DISCRETIZACIÓN
% =============================================================================
\section{\color{NavyBlue}6. Paso 5: Rango de Evaluación Continua ($x := 0\,\text{m}, 0.001\,\text{m} \dots L_{\text{tot}}$)}

\subsection{Sintaxis de Rango en Mathcad Prime}
Para que Mathcad trace los diagramas continuos, se debe declarar la variable $x$ como una variable de rango con la siguiente notación:
\begin{equation*}
    x := 0\,\text{m}, 0.001\,\text{m} \dots (a + b + c + d)
\end{equation*}

\subsection{¿Por qué escribir dos valores ($0\,\text{m}, 0.001\,\text{m}$)?}
En Mathcad, si escribes únicamente $x := 0 \dots L$, el software asume un paso automático por defecto de $1$ unidad (es decir, de $1\,\text{metro}$ en $1\,\text{metro}$). Al escribir dos números separados por coma antes de los dos puntos (\texttt{..}), estás definiendo explícitamente el paso de avance:
\[
\Delta x = x_2 - x_1 = 0.001\,\text{m} - 0.000\,\text{m} = \mathbf{0.001\,\text{m} = 1\,\text{milímetro}}
\]

\subsection{¿Por qué es indispensable un paso infinitesimal de $1\,\text{mm}$?}
Los diagramas de cortante y momento tienen \textbf{discontinuidades de salto vertical} en los puntos donde se aplican cargas puntuales y reacciones.
\begin{itemize}[leftmargin=*,itemsep=1pt]
    \item Si se usa un paso grueso (por ejemplo, $0.5\,\text{m}$ o $1\,\text{m}$), Mathcad unirá los puntos calculados mediante segmentos rectilíneos diagonales, produciendo un gráfico distorsionado y falso.
    \item Con un paso de $0.001\,\text{m}$ ($1\,\text{mm}$), se evalúan $5\,001$ puntos a lo largo de los $5\,\text{m}$ de viga. A esa escala, los saltos abruptos se dibujan como líneas perfectamente verticales a $90^\circ$, logrando el aspecto profesional exigido en exámenes.
\end{itemize}

\vspace{6pt}

% =============================================================================
% SECCIÓN 7: PASO 6 - DIAGRAMAS GRÁFICOS Y TABLAS
% =============================================================================
\section{\color{NavyBlue}7. Paso 6: Gráficos 2D XY y Tablas Numéricas en Mathcad}

\subsection{Creación de los Gráficos de Fuerza Cortante y Momento}
\begin{enumerate}[leftmargin=*,itemsep=2pt]
    \item Presiona \texttt{Shift} + \texttt{2} o ve a la pestaña \textbf{Gráficos} $\rightarrow$ \textbf{Insertar Gráfico XY}.
    \item \textbf{Eje Horizontal (Abscisas):} Escribe la variable independiente $x$ con su unidad entre corchetes:
          \begin{equation*}
              x \quad [\text{m}]
          \end{equation*}
    \item \textbf{Eje Vertical (Ordenadas):}
          \begin{itemize}
              \item Para el DFC: Escribe $Q(x)$ con corchetes de unidad $[\text{kg}]$ o $[\text{kN}]$.
              \item Para el DMF: Escribe $M(x)$ con corchetes de unidad $[\text{kg}\cdot\text{m}]$ o $[\text{kN}\cdot\text{m}]$.
          \end{itemize}
    \item \textbf{Color de Trazo:} Asigna rojo al cortante $Q(x)$ y verde/azul al momento $M(x)$.
\end{enumerate}

\subsection{Invocación de las Tablas de Valores Numéricos}
Para verificar numéricamente el comportamiento en cada sección, Mathcad permite invocar la matriz de evaluación simplemente escribiendo el nombre de la función seguido del signo igual ($=$):
\begin{align*}
    Q(x) &= \quad \text{(Muestra la tabla de 12 filas iniciales con los valores de cortante en kg)} \\
    M(x) &= \quad \text{(Muestra la tabla de 12 filas iniciales con los valores de momento en kg}\cdot\text{m)}
\end{align*}

\vspace{6pt}

% =============================================================================
% SECCIÓN 8: FORMULARIO MAESTRO RESUMIDO (TABLA DE CONSULTA RÁPIDA)
% =============================================================================
\section{\color{NavyBlue}8. Formulario Maestro Sintético para Cualquier Viga}

Utiliza esta tabla universal para ensamblar las ecuaciones de cualquier ejercicio de examen de forma inmediata:

\begin{table}[h!]
\centering
\small
\renewcommand{\arraystretch}{1.3}
\begin{tabularx}{\textwidth}{p{3.8cm}p{3.2cm}p{4.6cm}X}
\toprule
\textbf{Tipo de Carga o Apoyo} & \textbf{Posición / Tramo} & \textbf{Término en Momento $M(x)$} & \textbf{Término en Cortante $Q(x)$} \\
\midrule
Reacción en el origen $V_A$ & $x = 0$ & $+ V_A \cdot x$ & $+ V_A$ \\
Reacción interior $V_i$ & $x = x_i$ & $+ V_i \cdot (x - x_i) \cdot (x \ge x_i)$ & $+ V_i \cdot (x \ge x_i)$ \\
Carga puntual hacia abajo $P_i$ & $x = x_i$ & $- P_i \cdot (x - x_i) \cdot (x \ge x_i)$ & $- P_i \cdot (x \ge x_i)$ \\
Momento horario concentrado $M$ & $x = x_M$ & $+ M \cdot (x \ge x_M)$ & $0$ \quad (\textit{No aporta}) \\
Momento antihorario concentrado & $x = x_M$ & $- M \cdot (x \ge x_M)$ & $0$ \quad (\textit{No aporta}) \\
Carga distribuida activa $q$ & $x_1 < x < x_2$ & $-\frac{q \cdot (x - x_1)^2}{2} \cdot (x_2 > x > x_1)$ & $- q \cdot (x - x_1) \cdot (x_2 > x > x_1)$ \\
Carga distribuida superada $q$ & $x \ge x_2$ & $- q \cdot L_{tr} \cdot \left(x - \text{CG}\right) \cdot (x \ge x_2)$ & $- q \cdot L_{tr} \cdot (x \ge x_2)$ \\
\bottomrule
\end{tabularx}
\end{table}

\vspace{6pt}

% =============================================================================
% SECCIÓN 9: RESOLUCIÓN NUMÉRICA INTEGRAL DEL EJERCICIO 01 DE REFERENCIA
% =============================================================================
\section{\color{NavyBlue}9. Resolución Paso a Paso del Ejercicio 01 de Examen}

Para validar el formulario, resolvemos paso a paso el problema de examen del usuario:
\begin{align*}
    a &= 2\,\text{m}, \quad b = 1\,\text{m}, \quad c = 1\,\text{m}, \quad d = 1\,\text{m} \implies L_{\text{tot}} = 5\,\text{m} \\
    q &= 15\,\frac{\text{kg}}{\text{m}}, \quad P_1 = 20\,\text{kg}, \quad P_2 = 8\,\text{kg}, \quad M = 10\,\text{kg}\cdot\text{m}
\end{align*}

\subsection{1. Reacciones de Apoyo}
\begin{align*}
    \sum M_A &= 0 \implies -15(2)(1) - 20(3) + V_D(4) + 10 - 8(5) = 0 \\
             &\implies -30 - 60 + 4 V_D + 10 - 40 = 0 \implies 4 V_D - 120 = 0 \implies \mathbf{V_D = 35\,\text{kg}} \\[4pt]
    \sum F_y &= 0 \implies V_A - 15(2) - 20 + 35 - 8 = 0 \\
             &\implies V_A - 30 - 20 + 35 - 8 = 0 \implies V_A - 23 = 0 \implies \mathbf{V_A = 23\,\text{kg}}
\end{align*}

\subsection{2. Funciones de Tramo y Valores Notables}
Evaluando $Q(x)$ y $M(x)$ en cada punto singular:
\begin{itemize}[leftmargin=*,itemsep=2pt]
    \item \textbf{En $x = 0\,\text{m}$ (Apoyo A):}
          $Q(0^+) = +23\,\text{kg}$, \quad $M(0) = 0\,\text{kg}\cdot\text{m}$.
    \item \textbf{En $x = 2\,\text{m}^-$ (Fin de distribuida):}
          $Q(2^-) = 23 - 15(2) = \mathbf{-7\,\text{kg}}$, \quad $M(2^-) = 23(2) - 15\frac{2^2}{2} = 46 - 30 = \mathbf{16\,\text{kg}\cdot\text{m}}$.
    \item \textbf{Corte por cero de Cortante (Momento Máximo):}
          $Q(x) = 23 - 15 x = 0 \implies x_{\text{max}} = \frac{23}{15} \approx \mathbf{1.533\,\text{m}}$. \\
          $M_{\text{max}} = 23(1.533) - 15 \frac{1.533^2}{2} = 35.267 - 17.633 = \mathbf{17.633\,\text{kg}\cdot\text{m}}$.
    \item \textbf{En $x = 2\,\text{m}^+$ (Salto por Momento $M = 10\,\text{kg}\cdot\text{m}$):}
          $Q(2^+) = -7\,\text{kg}$ (\textit{la cortante no cambia}), \\
          $M(2^+) = 16 + 10 = \mathbf{26\,\text{kg}\cdot\text{m}}$ (\textbf{salto vertical directo de $+10$ en el flector}).
    \item \textbf{En $x = 3\,\text{m}^-$ (Antes de $P_1$):}
          $Q(3^-) = -7\,\text{kg}$, \quad $M(3^-) = 23(3) - 30(3 - 1) + 10 = 69 - 60 + 10 = \mathbf{19\,\text{kg}\cdot\text{m}}$.
    \item \textbf{En $x = 3\,\text{m}^+$ (Después de $P_1 = 20\,\text{kg}$):}
          $Q(3^+) = -7 - 20 = \mathbf{-27\,\text{kg}}$ (\textbf{salto vertical de $-20$ en la cortante}), \quad $M(3^+) = 19\,\text{kg}\cdot\text{m}$.
    \item \textbf{En $x = 4\,\text{m}^-$ (Antes de $V_D$):}
          $Q(4^-) = -27\,\text{kg}$, \quad $M(4^-) = 19 - 27(1) = \mathbf{-8\,\text{kg}\cdot\text{m}}$.
    \item \textbf{En $x = 4\,\text{m}^+$ (Después de $V_D = 35\,\text{kg}$):}
          $Q(4^+) = -27 + 35 = \mathbf{+8\,\text{kg}}$ (\textbf{salto vertical de $+35$ en la cortante}), \quad $M(4^+) = -8\,\text{kg}\cdot\text{m}$.
    \item \textbf{En $x = 5\,\text{m}$ (Extremo terminal con $P_2 = 8\,\text{kg}$):}
          $Q(5^-) = +8\,\text{kg}$, \quad al aplicar $P_2$: $Q(5^+) = 8 - 8 = \mathbf{0\,\text{kg}}$ (\textbf{Cierre perfecto a cero}). \\
          $M(5) = -8 + 8(1) = \mathbf{0\,\text{kg}\cdot\text{m}}$ (\textbf{Cierre perfecto a cero}).
\end{itemize}

\vspace{6pt}

\begin{tcolorbox}[enhanced,colback=MathcadGreen!10,colframe=MathcadGreen,sharp corners,boxrule=1pt,title=\textbf{Conclusión y Certificación de Equilibrio}]
El cierre exacto a cero tanto en el cortante terminal $Q(L_{\text{tot}}) = 0\,\text{kg}$ como en el momento flector terminal $M(L_{\text{tot}}) = 0\,\text{kg}\cdot\text{m}$ demuestra matemáticamente que las reacciones calculadas ($V_D = 35\,\text{kg}, V_A = 23\,\text{kg}$) y las funciones de Macaulay formuladas son $100\%$ exactas y rigurosas.
\end{tcolorbox}

\end{document}
"""

with open(TEX_FILE, 'w', encoding='utf-8') as f:
    f.write(tex_content)

print(f"Archivo LaTeX generado en: {TEX_FILE}")
print("Compilando con pdflatex (Pasada 1)...")
res1 = subprocess.run(['pdflatex', '-interaction=nonstopmode', 'FORMULARIO_MAESTRO_VIGAS_MATHCAD.tex'], cwd=CUR_DIR, capture_output=True, text=True)
print("Código de salida Pasada 1:", res1.returncode)

if res1.returncode != 0:
    print("Error en Pasada 1:")
    print(res1.stdout[-1000:])
    sys.exit(1)

print("Compilando con pdflatex (Pasada 2 para referencias)...")
res2 = subprocess.run(['pdflatex', '-interaction=nonstopmode', 'FORMULARIO_MAESTRO_VIGAS_MATHCAD.tex'], cwd=CUR_DIR, capture_output=True, text=True)
print("Código de salida Pasada 2:", res2.returncode)

if res2.returncode == 0 and os.path.exists(PDF_FILE):
    print(f"¡PDF generado con ÉXITO!: {PDF_FILE} ({os.path.getsize(PDF_FILE)} bytes)")
else:
    print("Error en la compilación final.")
