# -*- coding: utf-8 -*-
"""
generate_pdf_manual.py
Generates a publication-grade, beautifully styled PDF manual explaining the
Direct Stiffness Method, kinematic partitioning (why rows/columns are eliminated),
and step-by-step Excel construction for plane trusses.
Cátedra: Ing. Ulianov Cuba Valencia - Análisis Estructural II - Universidad Continental.
"""

import os
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether, HRFlowable
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.pdfgen import canvas

BASE_DIR = r"C:\Users\CYBORG\.gemini\antigravity\AUTOMATIZACION"
DIR_ANA2 = os.path.join(BASE_DIR, "EXCEL ANALISIS 2 - ULIANOV")
PDF_PATH = os.path.join(BASE_DIR, "MANUAL_TEORICO_Y_TUTORIAL_ARMADURAS.pdf")
PDF_PATH_ANA2 = os.path.join(DIR_ANA2, "MANUAL_TEORICO_Y_TUTORIAL_ARMADURAS.pdf")

# Custom Canvas for Header, Footer and Page Numbers
class NumberedCanvas(canvas.Canvas):
    def __init__(self, *args, **kwargs):
        super(NumberedCanvas, self).__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_header_footer(num_pages)
            super(NumberedCanvas, self).showPage()
        super(NumberedCanvas, self).save()

    def draw_header_footer(self, page_count):
        if self._pageNumber > 1:
            self.saveState()
            self.setFont("Helvetica-Bold", 8)
            self.setFillColor(colors.HexColor("#0F766E"))
            self.drawString(54, 800, "ANÁLISIS ESTRUCTURAL II | CÁTEDRA ING. ULIANOV CUBA VALENCIA")
            self.setFont("Helvetica", 8)
            self.setFillColor(colors.HexColor("#64748B"))
            self.drawRightString(541, 800, "Método de la Rigidez Directa en Armaduras")
            self.setStrokeColor(colors.HexColor("#CBD5E1"))
            self.setLineWidth(0.7)
            self.line(54, 794, 541, 794)

            # Footer
            self.line(54, 45, 541, 45)
            self.setFont("Helvetica", 8)
            self.setFillColor(colors.HexColor("#64748B"))
            self.drawString(54, 32, "Manual Teórico Maestro y Guía de Construcción en Excel")
            page_text = f"Página {self._pageNumber} de {page_count}"
            self.drawRightString(541, 32, page_text)
            self.restoreState()

def build_pdf():
    doc = SimpleDocTemplate(
        PDF_PATH,
        pagesize=A4,
        leftMargin=54,
        rightMargin=54,
        topMargin=54,
        bottomMargin=54
    )

    styles = getSampleStyleSheet()

    # Custom typography styles
    c_primary = colors.HexColor("#1E293B")
    c_teal = colors.HexColor("#0F766E")
    c_accent_green = colors.HexColor("#10B981")
    c_dark_blue = colors.HexColor("#1E3A8A")

    title_cover = ParagraphStyle(
        'CoverTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=24,
        leading=28,
        textColor=c_primary,
        alignment=1, # Center
        spaceAfter=12
    )

    sub_cover = ParagraphStyle(
        'CoverSub',
        parent=styles['Normal'],
        fontName='Helvetica-Oblique',
        fontSize=12,
        leading=16,
        textColor=c_teal,
        alignment=1,
        spaceAfter=25
    )

    h1_style = ParagraphStyle(
        'Heading1_Custom',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=16,
        leading=20,
        textColor=c_primary,
        spaceBefore=16,
        spaceAfter=8,
        keepWithNext=True
    )

    h2_style = ParagraphStyle(
        'Heading2_Custom',
        parent=styles['Heading2'],
        fontName='Helvetica-Bold',
        fontSize=12,
        leading=16,
        textColor=c_teal,
        spaceBefore=12,
        spaceAfter=6,
        keepWithNext=True
    )

    body_style = ParagraphStyle(
        'Body_Custom',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9.5,
        leading=14,
        textColor=colors.HexColor("#334155"),
        spaceAfter=6
    )

    body_bold = ParagraphStyle(
        'Body_Bold',
        parent=body_style,
        fontName='Helvetica-Bold'
    )

    formula_style = ParagraphStyle(
        'Formula_Text',
        parent=styles['Normal'],
        fontName='Courier-Bold',
        fontSize=9,
        leading=13,
        textColor=colors.HexColor("#065F46"),
        alignment=0
    )

    box_text = ParagraphStyle(
        'BoxText',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        leading=13,
        textColor=colors.HexColor("#1E293B")
    )

    box_title = ParagraphStyle(
        'BoxTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=10,
        leading=14,
        textColor=colors.HexColor("#0F766E"),
        spaceAfter=4
    )

    table_cell = ParagraphStyle(
        'TableCell',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8.5,
        leading=11,
        textColor=colors.HexColor("#1E293B")
    )

    table_hdr = ParagraphStyle(
        'TableHdr',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8.5,
        leading=11,
        textColor=colors.white,
        alignment=1
    )

    story = []

    # -------------------------------------------------------------------------
    # COVER PAGE
    # -------------------------------------------------------------------------
    story.append(Spacer(1, 30))
    p_univ = Paragraph("UNIVERSIDAD CONTINENTAL", ParagraphStyle('Univ', parent=styles['Normal'], fontName='Helvetica-Bold', fontSize=15, leading=18, alignment=1, textColor=c_primary))
    p_fac = Paragraph("FACULTAD DE INGENIERÍA | CARRERA PROFESIONAL DE INGENIERÍA CIVIL", ParagraphStyle('Fac', parent=styles['Normal'], fontName='Helvetica', fontSize=10, leading=13, alignment=1, textColor=c_teal))
    story.append(p_univ)
    story.append(Spacer(1, 6))
    story.append(p_fac)
    story.append(Spacer(1, 40))

    p_course = Paragraph("ASIGNATURA: ANÁLISIS ESTRUCTURAL II", ParagraphStyle('Course', parent=styles['Normal'], fontName='Helvetica-Bold', fontSize=14, leading=17, alignment=1, textColor=colors.HexColor("#B91C1C")))
    p_prof = Paragraph("DOCENTE DE CÁTEDRA: ING. ULIANOV CUBA VALENCIA", ParagraphStyle('Prof', parent=styles['Normal'], fontName='Helvetica-Bold', fontSize=11, leading=15, alignment=1, textColor=c_primary))
    story.append(p_course)
    story.append(Spacer(1, 5))
    story.append(p_prof)
    story.append(Spacer(1, 45))

    story.append(HRFlowable(width="100%", thickness=2, color=c_teal, spaceAfter=20))
    story.append(Paragraph("MANUAL TEÓRICO MAESTRO Y TUTORIAL PASO A PASO:<br/>MÉTODO DE LA RIGIDEZ DIRECTA EN ARMADURAS PLANAS", title_cover))
    story.append(Paragraph("Fundamentos Físicos, Deducción de Matrices, Partición Cinemática (Por qué se eliminan filas y columnas), y Automatización Profesional en Microsoft Excel", sub_cover))
    story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#CBD5E1"), spaceAfter=40))

    # Meta card
    meta_data = [
        [Paragraph("<b>Institución:</b>", table_cell), Paragraph("Universidad Continental – Facultad de Ingeniería", table_cell)],
        [Paragraph("<b>Capacidad del Sistema:</b>", table_cell), Paragraph("Hasta 6 Nodos (12 Grados de Libertad) y 8 Barras", table_cell)],
        [Paragraph("<b>Tipología Soportada:</b>", table_cell), Paragraph("Armaduras Isostáticas (3 Reacciones) e Hiperestáticas (4 a 6 Reacciones)", table_cell)],
        [Paragraph("<b>Compatibilidad:</b>", table_cell), Paragraph("100% Automatizada con Fórmulas Nativas de Excel (Cero Errores #¡NUM!)", table_cell)],
        [Paragraph("<b>Objetivo Pedagógico:</b>", table_cell), Paragraph("Dominio teórico y práctico para construir la plantilla desde cero en exámenes", table_cell)],
    ]
    t_meta = Table(meta_data, colWidths=[150, 330])
    t_meta.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#F8FAFC")),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor("#CBD5E1")),
        ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor("#E2E8F0")),
        ('TOPPADDING', (0,0), (-1,-1), 6),
        ('BOTTOMPADDING', (0,0), (-1,-1), 6),
    ]))
    story.append(t_meta)

    story.append(Spacer(1, 60))
    story.append(Paragraph("<b>Universidad Continental – Perú | Semestre 2026-II</b>", ParagraphStyle('Date', parent=styles['Normal'], fontName='Helvetica-Bold', fontSize=10, alignment=1, textColor=colors.HexColor("#64748B"))))
    story.append(PageBreak())

    # -------------------------------------------------------------------------
    # CAPÍTULO 1: INTRODUCCIÓN Y FUNDAMENTO FÍSICO
    # -------------------------------------------------------------------------
    story.append(Paragraph("Capítulo 1: Fundamento Físico de las Armaduras Planas", h1_style))
    story.append(HRFlowable(width="100%", thickness=1, color=c_teal, spaceAfter=10))

    story.append(Paragraph(
        "Una <b>armadura plana</b> (reticulado o cercha) es un sistema estructural compuesto por barras esbeltas unidas entre sí en sus extremos formando triángulos rígidos. El principio fundamental del método de la rigidez se basa en la <b>Ley de Hooke</b> generalizada y la compatibilidad cinemática de los desplazamientos nodales.",
        body_style
    ))

    # Box: Hipotesis
    h_box_data = [[
        Paragraph(
            "<b>HIPÓTESIS FUNDAMENTALES DEL ANÁLISIS DE ARMADURAS:</b><br/>"
            "1. <b>Nudos Articulados Perfectos:</b> Los pasadores o rótulas son libres de fricción; no transmiten momentos flectores (M = 0) ni fuerzas cortantes (V = 0).<br/>"
            "2. <b>Barras Biarticuladas:</b> Cada barra trabaja únicamente a esfuerzo axial puro (Tensión o Compresión).<br/>"
            "3. <b>Cargas Nodalmente Concentradas:</b> Las fuerzas externas actúan única y exclusivamente en los nudos.<br/>"
            "4. <b>Linealidad Elástica:</b> Relación lineal entre tensiones y deformaciones (pequeñas deformaciones, primer orden).",
            box_text
        )
    ]]
    t_hbox = Table(h_box_data, colWidths=[480])
    t_hbox.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#F1F5F9")),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor("#94A3B8")),
        ('LEFTPADDING', (0,0), (-1,-1), 10),
        ('RIGHTPADDING', (0,0), (-1,-1), 10),
        ('TOPPADDING', (0,0), (-1,-1), 8),
        ('BOTTOMPADDING', (0,0), (-1,-1), 8),
    ]))
    story.append(t_hbox)
    story.append(Spacer(1, 10))

    story.append(Paragraph("1.1 Deducción de la Rigidez Axial Unidimensional", h2_style))
    story.append(Paragraph(
        "Para una barra elástica de sección transversal constante <i>A</i>, longitud <i>L</i> y módulo de elasticidad <i>E</i>, la relación entre el esfuerzo normal &sigma; y la deformación unitaria &epsilon; es:",
        body_style
    ))

    # Formula Box
    f_box1 = [[
        Paragraph(
            "&sigma; = E &middot; &epsilon;  &implies;  (F / A) = E &middot; (&Delta;L / L)  &implies;  <b>F = (EA / L) &middot; &Delta;L</b><br/>"
            "Definimos la <b>Rigidez Axial (k)</b> como:  <b>k = EA / L  [Kgf / cm]</b>",
            formula_style
        )
    ]]
    t_fbox1 = Table(f_box1, colWidths=[480])
    t_fbox1.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#DCFCE7")),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor("#10B981")),
        ('TOPPADDING', (0,0), (-1,-1), 6),
        ('BOTTOMPADDING', (0,0), (-1,-1), 6),
        ('LEFTPADDING', (0,0), (-1,-1), 10),
    ]))
    story.append(t_fbox1)
    story.append(Spacer(1, 8))
    story.append(Paragraph(
        "Físicamente, <b>k = EA/L</b> representa la magnitud de la fuerza requerida para provocar un alargamiento o acortamiento axial unitario (&Delta;L = 1 cm).",
        body_style
    ))

    # -------------------------------------------------------------------------
    # CAPÍTULO 2: DE COORDENADAS LOCALES A GLOBALES (MATRIZ 4x4)
    # -------------------------------------------------------------------------
    story.append(Spacer(1, 10))
    story.append(Paragraph("Capítulo 2: De Coordenadas Locales a Globales (Matriz 4x4)", h1_style))
    story.append(HRFlowable(width="100%", thickness=1, color=c_teal, spaceAfter=10))

    story.append(Paragraph(
        "En el plano global cartesiano (X, Y), cada barra conecta un <b>Nudo Inicio (i)</b> con un <b>Nudo Fin (j)</b>. Cada nudo posee dos grados de libertad traslacionales, sumando 4 grados de libertad por elemento: {D<sub>m</sub>} = [u<sub>iX</sub>, u<sub>iY</sub>, u<sub>jX</sub>, u<sub>jY</sub>]<sup>T</sup>.",
        body_style
    ))

    story.append(Paragraph("2.1 Cosenos Directores y Geometría de la Barra", h2_style))
    story.append(Paragraph(
        "A partir de las coordenadas nodales (X<sub>i</sub>, Y<sub>i</sub>) y (X<sub>j</sub>, Y<sub>j</sub>):<br/>"
        "&bull; <b>&Delta;X</b> = X<sub>j</sub> - X<sub>i</sub> , &nbsp;&nbsp;&bull; <b>&Delta;Y</b> = Y<sub>j</sub> - Y<sub>i</sub><br/>"
        "&bull; <b>Longitud Real:</b> L = &radic;[(&Delta;X)<sup>2</sup> + (&Delta;Y)<sup>2</sup>]<br/>"
        "&bull; <b>Coseno Director X:</b> C<sub>x</sub> = cos(&theta;) = &Delta;X / L<br/>"
        "&bull; <b>Coseno Director Y:</b> C<sub>y</sub> = sin(&theta;) = &Delta;Y / L<br/>"
        "Cumpliéndose rigurosamente la identidad: <b>C<sub>x</sub><sup>2</sup> + C<sub>y</sub><sup>2</sup> = 1</b>.",
        body_style
    ))

    story.append(Paragraph("2.2 Deducción de la Matriz Local k<sub>m</sub> (4x4)", h2_style))
    story.append(Paragraph(
        "Aplicando la rotación de coordenadas mediante la matriz de transformación [T], obtenemos la célebre matriz de rigidez en coordenadas globales:",
        body_style
    ))

    # Table showing 4x4 matrix
    mat_4x4_data = [
        [Paragraph("k<sub>m</sub> =", table_cell), Paragraph("u<sub>iX</sub>", table_hdr), Paragraph("u<sub>iY</sub>", table_hdr), Paragraph("u<sub>jX</sub>", table_hdr), Paragraph("u<sub>jY</sub>", table_hdr)],
        [Paragraph("<b>u<sub>iX</sub></b>", table_cell), Paragraph("+(EA/L)&middot;Cx&sup2;", table_cell), Paragraph("+(EA/L)&middot;CxCy", table_cell), Paragraph("&minus;(EA/L)&middot;Cx&sup2;", table_cell), Paragraph("&minus;(EA/L)&middot;CxCy", table_cell)],
        [Paragraph("<b>u<sub>iY</sub></b>", table_cell), Paragraph("+(EA/L)&middot;CxCy", table_cell), Paragraph("+(EA/L)&middot;Cy&sup2;", table_cell), Paragraph("&minus;(EA/L)&middot;CxCy", table_cell), Paragraph("&minus;(EA/L)&middot;Cy&sup2;", table_cell)],
        [Paragraph("<b>u<sub>jX</sub></b>", table_cell), Paragraph("&minus;(EA/L)&middot;Cx&sup2;", table_cell), Paragraph("&minus;(EA/L)&middot;CxCy", table_cell), Paragraph("+(EA/L)&middot;Cx&sup2;", table_cell), Paragraph("+(EA/L)&middot;CxCy", table_cell)],
        [Paragraph("<b>u<sub>jY</sub></b>", table_cell), Paragraph("&minus;(EA/L)&middot;CxCy", table_cell), Paragraph("&minus;(EA/L)&middot;Cy&sup2;", table_cell), Paragraph("+(EA/L)&middot;CxCy", table_cell), Paragraph("+(EA/L)&middot;Cy&sup2;", table_cell)],
    ]
    t_mat4 = Table(mat_4x4_data, colWidths=[60, 105, 105, 105, 105])
    t_mat4.setStyle(TableStyle([
        ('BACKGROUND', (1,0), (4,0), c_teal),
        ('BACKGROUND', (0,1), (0,4), colors.HexColor("#E2E8F0")),
        ('BACKGROUND', (1,1), (-1,-1), colors.HexColor("#E0F2FE")),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor("#94A3B8")),
        ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor("#CBD5E1")),
        ('ALIGN', (1,0), (-1,-1), 'CENTER'),
        ('TOPPADDING', (0,0), (-1,-1), 4),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
    ]))
    story.append(t_mat4)
    story.append(Spacer(1, 8))

    story.append(Paragraph(
        "<b>Propiedades Clave de k<sub>m</sub>:</b><br/>"
        "1. <b>Simétrica:</b> k<sub>ij</sub> = k<sub>ji</sub> (Teorema de reciprocidad de Maxwell-Betti).<br/>"
        "2. <b>Suma Cero por Filas y Columnas:</b> Garantiza el equilibrio traslacional de la barra en el plano.<br/>"
        "3. <b>Diagonal Positiva:</b> C<sub>x</sub><sup>2</sup> &ge; 0 y C<sub>y</sub><sup>2</sup> &ge; 0.",
        body_style
    ))

    story.append(PageBreak())

    # -------------------------------------------------------------------------
    # CAPÍTULO 3: ENSAMBLAJE GLOBAL Y KARMADURA
    # -------------------------------------------------------------------------
    story.append(Paragraph("Capítulo 3: Ensamblaje Global y la Matriz de la Estructura (Karmadura)", h1_style))
    story.append(HRFlowable(width="100%", thickness=1, color=c_teal, spaceAfter=10))

    story.append(Paragraph(
        "Para un modelo general de <b>hasta 6 nodos</b>, existen 2 &times; 6 = <b>12 grados de libertad globales</b> (U<sub>1X</sub>, U<sub>1Y</sub>, U<sub>2X</sub>, U<sub>2Y</sub>, ..., U<sub>6X</sub>, U<sub>6Y</sub>). La matriz de rigidez global de toda la armadura (llamada en clase <b>Karmadura</b>) posee una dimensión completa de <b>12 &times; 12</b>.",
        body_style
    ))

    story.append(Paragraph("3.1 Expansión Matricial y Seguimiento Visual por Colores", h2_style))
    story.append(Paragraph(
        "Cada una de las 8 barras se expande de su tamaño local de 4&times;4 a una matriz de 12&times;12 (<b>K<sub>m</sub></b>), donde los 16 términos se colocan exactamente en las filas y columnas correspondientes a sus nudos inicio y fin.<br/>"
        "En nuestra plantilla automatizada, <b>cada barra tiene asignado un color pastel propio</b> (Celeste para Barra 1, Menta para Barra 2, Coral para Barra 3, etc.). Gracias a las reglas dinámicas de formato condicional, <b>los coeficientes no nulos de cada barra se iluminan exactamente con su color en la matriz grandota 12&times;12</b>, permitiendo rastrear visualmente cómo viaja la rigidez de cada elemento al sistema global.",
        body_style
    ))

    story.append(Paragraph("3.2 Ensamblaje Directo por Superposición", h2_style))
    story.append(Paragraph(
        "Por el principio de superposición lineal, la rigidez global de la armadura es la suma directa de las matrices expandidas de todas las barras activas:",
        body_style
    ))

    f_box2 = [[
        Paragraph(
            "<b>[K<sub>armadura</sub>] = [K<sub>1</sub>] + [K<sub>2</sub>] + [K<sub>3</sub>] + ... + [K<sub>8</sub>]  (Dimensión: 12 &times; 12)</b>",
            formula_style
        )
    ]]
    t_fbox2 = Table(f_box2, colWidths=[480])
    t_fbox2.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#FEF08A")),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor("#D97706")),
        ('TOPPADDING', (0,0), (-1,-1), 6),
        ('BOTTOMPADDING', (0,0), (-1,-1), 6),
        ('ALIGN', (0,0), (-1,-1), 'CENTER'),
    ]))
    story.append(t_fbox2)
    story.append(Spacer(1, 8))

    story.append(Paragraph("3.3 La Diagonal Principal de Karmadura (Pastel Green)", h2_style))
    story.append(Paragraph(
        "Los bloques 2&times;2 sobre la diagonal principal representan la <b>rigidez propia de cada nudo</b> (resistencia del nudo a ser desplazado en X e Y al aplicar una fuerza en el mismo nudo). En la plantilla, estos bloques se presentan con un elegante fondo verde pastel (<code>#D1FAE5</code>) y bordes esmeralda. Si un nudo no existe o está inactivo (por ejemplo, los nudos 4, 5 o 6 en una armadura pequeña de 3 nudos), su diagonal queda en blanco o se regula automáticamente.",
        body_style
    ))

    # -------------------------------------------------------------------------
    # CAPÍTULO 4: LA GRAN PREGUNTA EXPLICADA AL DETALLE: ¿POR QUÉ SE ELIMINAN FILAS Y COLUMNAS?
    # -------------------------------------------------------------------------
    story.append(Spacer(1, 10))
    story.append(Paragraph("Capítulo 4: ¿Por Qué se Eliminan Filas y Columnas? (Fundamento Teórico)", h1_style))
    story.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor("#B91C1C"), spaceAfter=10))

    story.append(Paragraph(
        "Esta es la pregunta crucial de la cátedra del Ing. Ulianov Cuba Valencia y la base conceptual de todo el método matricial. Muchos estudiantes memorizan mecánicamente <i>'elimino fila y columna'</i> sin entender por qué se hace. A continuación se demuestra matemáticamente:",
        body_style
    ))

    story.append(Paragraph("4.1 La Singularidad Cinemática Inicial (Determinante Cero)", h2_style))
    story.append(Paragraph(
        "La ecuación global de la armadura antes de considerar los apoyos es:<br/>"
        "<center><b>{C} = [K<sub>global</sub>] &middot; {D}</b></center><br/>"
        "En este punto, la armadura flota libre en el espacio sin ninguna unión a tierra. Como cuerpo libre, puede trasladarse o girar rígidamente sin deformarse. Matemáticamente, esto implica que las filas y columnas de [K<sub>global</sub>] son linealmente dependientes, y su determinante es exactamente <b>CERO</b>:<br/>"
        "<center><b>det([K<sub>global</sub>]) = 0  &implies;  NO EXISTE INVERSA DIRECTA</b></center><br/>"
        "No es posible despejar {D} = [K]<sup>-1</sup>{C} sin fijar la estructura al suelo.",
        body_style
    ))

    story.append(Paragraph("4.2 Las Condiciones de Contorno y Partición por Bloques", h2_style))
    story.append(Paragraph(
        "Al anclar la armadura a tierra mediante apoyos, los grados de libertad se dividen en dos grupos complementarios:",
        body_style
    ))

    # Comparative table of DOFs
    dof_comp_data = [
        [Paragraph("CLASIFICACIÓN", table_hdr), Paragraph("DESPLAZAMIENTO {D}", table_hdr), Paragraph("CARGA / FUERZA {C}", table_hdr), Paragraph("ESTADO EN APOYOS", table_hdr)],
        [
            Paragraph("<b>Grados Libres (1 / L)</b>", table_cell),
            Paragraph("<b>INCÓGNITAS</b> {D<sub>1</sub>}<br/>(Desplazamientos reales)", table_cell),
            Paragraph("<b>CONOCIDAS</b> {C<sub>1</sub>} = {P}<br/>(Cargas externas en nudos)", table_cell),
            Paragraph("Nudos sin apoyo o rodillos libres en X/Y", table_cell)
        ],
        [
            Paragraph("<b>Grados de Apoyo (2 / R)</b>", table_cell),
            Paragraph("<b>CONOCIDOS = 0</b> {D<sub>2</sub>} = <b>0</b><br/>(Apoyo rígido sin movimiento)", table_cell),
            Paragraph("<b>INCÓGNITAS</b> {C<sub>2</sub>} = {R}<br/>(Reacciones del suelo)", table_cell),
            Paragraph("Apoyos fijos (X,Y) o rodillos en su eje restringido", table_cell)
        ],
    ]
    t_dof = Table(dof_comp_data, colWidths=[110, 130, 130, 110])
    t_dof.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), c_primary),
        ('BACKGROUND', (0,1), (-1,1), colors.HexColor("#DCFCE7")), # green
        ('BACKGROUND', (0,2), (-1,2), colors.HexColor("#EDEDFA")), # lavender
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor("#94A3B8")),
        ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor("#CBD5E1")),
        ('TOPPADDING', (0,0), (-1,-1), 5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 5),
    ]))
    story.append(t_dof)
    story.append(Spacer(1, 10))

    story.append(PageBreak())

    story.append(Paragraph("4.3 Demostración Matemática: ¿Por qué se eliminan filas y columnas?", h2_style))
    story.append(Paragraph(
        "Escribiendo la ecuación matricial particionada por bloques:",
        body_style
    ))

    # Partitioned system
    p_sys_box = [[
        Paragraph(
            "&lceil; &nbsp; {C<sub>1</sub>} (Cargas Conocidas P) &nbsp; &rceil; &nbsp; = &nbsp; "
            "&lceil; &nbsp; [K<sub>11</sub>] &nbsp;&nbsp; [K<sub>12</sub>] &nbsp; &rceil; &nbsp; &middot; &nbsp; "
            "&lceil; &nbsp; {D<sub>1</sub>} (Desplazamientos Incógnita) &nbsp; &rceil;<br/>"
            "&lfloor; &nbsp; {R<sub>2</sub>} (Reacciones Incógnita) &nbsp; &rfloor; &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; "
            "&lfloor; &nbsp; [K<sub>21</sub>] &nbsp;&nbsp; [K<sub>22</sub>] &nbsp; &rfloor; &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; "
            "&lfloor; &nbsp; {D<sub>2</sub>} = <b>0</b> (Apoyos Rígidos) &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; &rfloor;",
            formula_style
        )
    ]]
    t_psys = Table(p_sys_box, colWidths=[480])
    t_psys.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#F8FAFC")),
        ('BOX', (0,0), (-1,-1), 1.5, c_teal),
        ('TOPPADDING', (0,0), (-1,-1), 8),
        ('BOTTOMPADDING', (0,0), (-1,-1), 8),
        ('LEFTPADDING', (0,0), (-1,-1), 12),
    ]))
    story.append(t_psys)
    story.append(Spacer(1, 10))

    story.append(Paragraph(
        "Al desarrollar la <b>primera ecuación matricial</b> por producto de bloques:<br/>"
        "<center><b>{C<sub>1</sub>} = [K<sub>11</sub>] &middot; {D<sub>1</sub>} + [K<sub>12</sub>] &middot; {D<sub>2</sub>}</b></center><br/>"
        "Pero como los desplazamientos en los apoyos son idénticamente nulos (<b>{D<sub>2</sub>} = 0</b>), el producto [K<sub>12</sub>]&middot;0 se convierte en <b>CERO ABSOLUTO</b>:",
        body_style
    ))

    # The magic simplification
    p_simp_box = [[
        Paragraph(
            "<b>[K<sub>12</sub>] &middot; {D<sub>2</sub>} = [K<sub>12</sub>] &middot; {0} = 0</b> &nbsp;&implies;&nbsp; "
            "<b>{C<sub>1</sub>} = [K<sub>11</sub>] &middot; {D<sub>1</sub>}</b><br/>"
            "Despejando: &nbsp; <b>{D<sub>1</sub>} = [K<sub>11</sub>]<sup>-1</sup> &middot; {C<sub>1</sub>}</b>",
            formula_style
        )
    ]]
    t_psimp = Table(p_simp_box, colWidths=[480])
    t_psimp.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#DCFCE7")),
        ('BOX', (0,0), (-1,-1), 1.5, colors.HexColor("#10B981")),
        ('TOPPADDING', (0,0), (-1,-1), 8),
        ('BOTTOMPADDING', (0,0), (-1,-1), 8),
        ('LEFTPADDING', (0,0), (-1,-1), 12),
    ]))
    story.append(t_psimp)
    story.append(Spacer(1, 10))

    # Big Answer Box
    ans_box = [[
        Paragraph(
            "<b>SÍNTESIS TEÓRICA PARA RESPONDERLE AL PROFESOR:</b><br/>"
            "&bull; <b>¿Por qué eliminamos las COLUMNAS de los apoyos?</b><br/>"
            "Porque esas columnas multiplican a los desplazamientos en los apoyos {D<sub>2</sub>}, los cuales son <b>CERO</b>. Cualquier valor de rigidez multiplicado por cero desaparece de la ecuación.<br/><br/>"
            "&bull; <b>¿Por qué eliminamos las FILAS de los apoyos?</b><br/>"
            "Porque en las filas de los apoyos residen las <b>reacciones incógnitas {R<sub>2</sub>}</b>. No podemos despejar desplazamientos de una ecuación donde la fuerza también es desconocida. Al quedarnos únicamente con las filas de los grados libres, el vector de fuerzas {C<sub>1</sub>} está compuesto por las <b>cargas externas conocidas P</b>.<br/><br/>"
            "&bull; <b>Resultado:</b> La submatriz resultante <b>[K<sub>11</sub>]</b> es simétrica, estrictamente definida positiva y <b>100% invertible</b>.",
            box_text
        )
    ]]
    t_ans = Table(ans_box, colWidths=[480])
    t_ans.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#FEF3C7")),
        ('BOX', (0,0), (-1,-1), 1.5, colors.HexColor("#D97706")),
        ('TOPPADDING', (0,0), (-1,-1), 8),
        ('BOTTOMPADDING', (0,0), (-1,-1), 8),
        ('LEFTPADDING', (0,0), (-1,-1), 10),
        ('RIGHTPADDING', (0,0), (-1,-1), 10),
    ]))
    story.append(t_ans)
    story.append(Spacer(1, 10))

    story.append(Paragraph("4.4 ¿Por qué usamos la Submatriz K<sub>21</sub> para hallar Reacciones?", h2_style))
    story.append(Paragraph(
        "Al desarrollar la <b>segunda ecuación matricial</b> del sistema particionado:<br/>"
        "<center><b>{R<sub>2</sub>} = [K<sub>21</sub>] &middot; {D<sub>1</sub>} + [K<sub>22</sub>] &middot; {D<sub>2</sub>}</b></center><br/>"
        "Nuevamente, como {D<sub>2</sub>} = 0, el término [K<sub>22</sub>]&middot;{D<sub>2</sub>} se anula por completo, obteniendo la ecuación exacta de reacciones:",
        body_style
    ))

    r_box = [[
        Paragraph(
            "<b>{R<sub>2</sub>} = [K<sub>21</sub>] &middot; {D<sub>1</sub>}</b><br/>"
            "&bull; <b>[K<sub>21</sub>]</b>: Submatriz de rigidez de acoplamiento elástico (Filas de Apoyos &times; Columnas de Grados Libres).<br/>"
            "&bull; <b>Físicamente:</b> Representa cómo las barras transmiten las deformaciones elásticas de los nudos libres hacia los apoyos rígidos para generar las fuerzas de reacción.",
            formula_style
        )
    ]]
    t_rbox = Table(r_box, colWidths=[480])
    t_rbox.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#EDEDFA")),
        ('BOX', (0,0), (-1,-1), 1.5, colors.HexColor("#6366F1")),
        ('TOPPADDING', (0,0), (-1,-1), 8),
        ('BOTTOMPADDING', (0,0), (-1,-1), 8),
        ('LEFTPADDING', (0,0), (-1,-1), 12),
    ]))
    story.append(t_rbox)

    story.append(PageBreak())

    # -------------------------------------------------------------------------
    # CAPÍTULO 5: CÓMO CONSTRUIR LA PLANTILLA EN EXCEL PASO A PASO
    # -------------------------------------------------------------------------
    story.append(Paragraph("Capítulo 5: Guía de Construcción en Excel Paso a Paso desde Cero", h1_style))
    story.append(HRFlowable(width="100%", thickness=1, color=c_teal, spaceAfter=10))

    story.append(Paragraph(
        "Si el docente te solicita abrir una hoja en blanco en Excel y programar la solución frente a él, sigue este orden metódico exacto:",
        body_style
    ))

    # -------------------------------------------------------------------------
    # CAPÍTULO 5: DESGLOSE UNIVERSAL CUADRO POR CUADRO (DE PRINCIPIO A FIN)
    # -------------------------------------------------------------------------
    story.append(Paragraph("Capítulo 5: Desglose Universal Cuadro por Cuadro (De Principio a Fin)", h1_style))
    story.append(HRFlowable(width="100%", thickness=1, color=c_teal, spaceAfter=10))

    story.append(Paragraph(
        "A continuación se detalla el significado físico, matemático y operativo de <b>cada uno de los cuadros, tablas, vectores y matrices</b> que componen la plantilla, aplicable con total generalidad a <b>cualquier armadura plana</b> (isostática o hiperestática, de 2 a 6 nudos y hasta 8 barras):",
        body_style
    ))

    # Table breakdown entries
    tbl_details = [
        [
            Paragraph("<b>CUADRO 1:<br/>Coordenadas, Apoyos y Cargas<br/>(Cols P a W)</b>", table_cell),
            Paragraph(
                "<b>¿Qué es y qué significa?</b> Es la base de datos nodal del problema. Aquí defines la geometría, las condiciones de frontera y las fuerzas externas.<br/>"
                "&bull; <b>NUDO (Col P):</b> Identificador entero del nudo (1 a 6).<br/>"
                "&bull; <b>X, Y (Cols Q, R):</b> Coordenadas cartesianas en cm con respecto a un origen común (0, 0).<br/>"
                "&bull; <b>TIPO APOYO (Col S):</b> Tipo de restricción: <i>Fijo</i> (pasador en X e Y), <i>Móvil Y</i> (rodillo horizontal que permite rodar en X pero no en Y), <i>Móvil X</i> (rodillo vertical) o <i>Libre</i> (sin apoyo).<br/>"
                "&bull; <b>Rx, Ry (Cols T, U):</b> Fórmulas automáticas que colocan <b>1</b> si el grado está impedido (apoyo) o <b>0</b> si puede moverse libremente.<br/>"
                "&bull; <b>Px, Py (Cols V, W):</b> Fuerzas concentradas externas aplicadas en cada nudo en Kgf (positivas hacia la derecha / arriba; negativas hacia la izquierda / abajo).",
                table_cell
            )
        ],
        [
            Paragraph("<b>CUADRO 2:<br/>Conectividad y GDL<br/>(Tabla 2, Filas 17 a 24)</b>", table_cell),
            Paragraph(
                "<b>¿Qué es y qué significa?</b> Define la topología de la estructura: qué nudo se une con qué nudo.<br/>"
                "&bull; <b>NUDO INICIO (Col C) y FIN (Col F):</b> Define el vector director de la barra (de Inicio &rarr; Fin).<br/>"
                "&bull; <b>u_ini_x, u_ini_y, u_fin_x, u_fin_y (Cols D, E, G, H):</b> Fórmulas que colocan automáticamente los 4 grados de libertad asociados (ej. U1X, U1Y, U3X, U3Y). Si una barra no existe, quedan en blanco.",
                table_cell
            )
        ],
        [
            Paragraph("<b>CUADRO 3:<br/>Geometría y Rigidez<br/>(Tabla 1, Filas 6 a 13)</b>", table_cell),
            Paragraph(
                "<b>¿Qué es y qué significa?</b> Calcula las propiedades mecánicas y cinemáticas de cada barra.<br/>"
                "&bull; <b>Coordenadas Inicio/Fin:</b> Buscadas automáticamente con <code>VLOOKUP</code> desde el Cuadro 1.<br/>"
                "&bull; <b>DX = Xfin - Xini</b> , <b>DY = Yfin - Yini</b>: Proyecciones en los ejes globales.<br/>"
                "&bull; <b>Longitud L:</b> <code>=SQRT(DX^2 + DY^2)</code> (longitud real en cm).<br/>"
                "&bull; <b>Cosenos Directores:</b> Cx = DX/L , Cy = DY/L (cumplen Cx&sup2; + Cy&sup2; = 1).<br/>"
                "&bull; <b>A, E:</b> Área transversal (cm&sup2;) y Módulo de Elasticidad (Kgf/cm&sup2;).<br/>"
                "&bull; <b>AE/L (Kgf/cm):</b> Rigidez axial de la barra. Actúa como la constante de resorte k del elemento.",
                table_cell
            )
        ],
        [
            Paragraph("<b>CUADRO 4:<br/>Matrices Locales km (4x4)<br/>(Filas 26+)</b>", table_cell),
            Paragraph(
                "<b>¿Qué es y qué significa?</b> La matriz de rigidez elástica de cada barra proyectada en el plano global.<br/>"
                "&bull; Posee 4 filas y 4 columnas rotuladas con los GDL de la barra (ej. U1X, U1Y, U3X, U3Y).<br/>"
                "&bull; Cada celda calcula: <code>&plusmn;(AE/L) &middot; Cx &middot; Cy</code> según la fórmula clásica.<br/>"
                "&bull; Tiene un color pastel distintivo para cada barra que permite su seguimiento visual.",
                table_cell
            )
        ],
        [
            Paragraph("<b>CUADRO 5:<br/>Matrices Expandidas Km (12x12)<br/>(Con Rastreo de Color)</b>", table_cell),
            Paragraph(
                "<b>¿Qué es y qué significa?</b> Expansión de cada barra a la dimensión global total (hasta 6 nodos = 12 GDL).<br/>"
                "&bull; Las 16 rigideces locales de 4x4 se ubican con <code>INDEX/MATCH</code> en las intersecciones globales exactas de sus nudos.<br/>"
                "&bull; <b>Rastreo de Color Dinámico:</b> Mediante formato condicional, las celdas no nulas se pintan automáticamente del color de la barra, permitiendo ver qué cuadrante del sistema ocupa cada barra.",
                table_cell
            )
        ],
        [
            Paragraph("<b>CUADRO 6:<br/>Karmadura Global (12x12)<br/>(Diagonal Verde Pastel)</b>", table_cell),
            Paragraph(
                "<b>¿Qué es y qué significa?</b> La matriz de rigidez global de toda la armadura ensayada.<br/>"
                "&bull; Se obtiene sumando celda a celda las 8 matrices expandidas: <code>=K1 + K2 + ... + K8</code>.<br/>"
                "&bull; <b>Diagonal Principal (Verde Pastel #D1FAE5):</b> Representa la rigidez directa de cada nudo (resistencia al desplazamiento en su propio punto de aplicación). Siempre es positiva.<br/>"
                "&bull; <b>Fuera de la diagonal:</b> Representa la interacción mutua entre nudos conectados por barras.",
                table_cell
            )
        ],
        [
            Paragraph("<b>CUADRO 7:<br/>Vectores {C} y {D}<br/>(Cargas y Desplazamientos)</b>", table_cell),
            Paragraph(
                "<b>¿Qué es y qué significa?</b> Define qué magnitudes son datos y cuáles son incógnitas:<br/>"
                "&bull; <b>Vector {C} (Cargas):</b> Si hay apoyo (Rx=1), pone el nombre de la reacción incógnita (ej. 'C1Y'). Si está libre (Rx=0), pone la carga conocida Px.<br/>"
                "&bull; <b>Vector {D} (Desplazamientos):</b> Si hay apoyo (Rx=1), pone <b>0</b> (restringido). Si está libre (Rx=0), pone la incógnita (ej. 'D1X').<br/>"
                "&bull; <b>Col F (Auxiliar):</b> Enumera 1, 2, ... los grados libres reales.<br/>"
                "&bull; <b>Col G (Auxiliar):</b> Enumera 1, 2, ... las reacciones reales.",
                table_cell
            )
        ],
        [
            Paragraph("<b>CUADRO 8:<br/>Submatriz K11 e Inversión<br/>(Cálculo de Desplazamientos)</b>", table_cell),
            Paragraph(
                "<b>¿Qué es y qué significa?</b> Extrae únicamente las filas y columnas de los grados libres mediante <code>INDEX/MATCH</code> sobre la Col F.<br/>"
                "&bull; <b>Regularización Identidad:</b> Las posiciones vacías (cuando hay menos de 6 nodos) reciben un 1 en la diagonal y 0 fuera, evitando cualquier error #¡NUM!.<br/>"
                "&bull; <b>Inversión con =MINVERSA(K11):</b> Obtiene la matriz de flexibilidad nodal.<br/>"
                "&bull; <b>Desplazamientos reales con =MMULT(MIN, C):</b> Obtiene {D_libres} en centímetros exactos.",
                table_cell
            )
        ],
        [
            Paragraph("<b>CUADRO 9:<br/>Submatriz K21 y Reacciones<br/>(Cálculo de Apoyos)</b>", table_cell),
            Paragraph(
                "<b>¿Qué es y qué significa?</b> Extrae las filas de los apoyos (Col G) y las columnas de los grados libres.<br/>"
                "&bull; <b>Cálculo con =MMULT(K21, D_libres):</b> Multiplica la matriz de rigidez de acoplamiento por los desplazamientos libres calculados, arrojando las reacciones de apoyo en Kgf con equilibrio estático riguroso.",
                table_cell
            )
        ],
        [
            Paragraph("<b>CUADRO 10:<br/>Desplazamientos Totales y<br/>Fuerzas en las Barras</b>", table_cell),
            Paragraph(
                "<b>¿Qué es y qué significa?</b> Reúne todos los desplazamientos (libres calculados y ceros en apoyos) en un solo vector de 12 filas.<br/>"
                "&bull; <b>Cálculo de Fuerza Axial:</b> Aplica para cada barra:<br/>"
                "<code>F_m = (AE/L) &middot; MMULT([-Cx, -Cy, Cx, Cy], {D_nodo_ini; D_nodo_fin})</code><br/>"
                "&bull; <b>Diagnóstico:</b> Si F &gt; 0 &implies; <b>TRACCIÓN (+)</b>; si F &lt; 0 &implies; <b>COMPRESIÓN (-)</b>; si F = 0 &implies; <b>FUERZA NULA</b>.",
                table_cell
            )
        ],
        [
            Paragraph("<b>CUADRO 11:<br/>Resumen General y<br/>Equilibrio Estático</b>", table_cell),
            Paragraph(
                "<b>¿Qué es y qué significa?</b> Cuadro consolidado final con Barra #, Nudo Ini, Nudo Fin, Longitud L, Área A, Fuerza Axial N y Estado Estructural.<br/>"
                "&bull; Permite verificar al instante el equilibrio estático global (&sum; Fx = 0, &sum; Fy = 0, &sum; M = 0).",
                table_cell
            )
        ],
    ]

    t_tbldet = Table(tbl_details, colWidths=[120, 360])
    t_tbldet.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (0,-1), colors.HexColor("#F1F5F9")),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor("#CBD5E1")),
        ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor("#E2E8F0")),
        ('TOPPADDING', (0,0), (-1,-1), 5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 5),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
    ]))
    story.append(t_tbldet)
    story.append(Spacer(1, 10))

    story.append(PageBreak())

    # -------------------------------------------------------------------------
    # CAPÍTULO 6: CASO PRÁCTICO RESUELTO Y VALIDADO
    # -------------------------------------------------------------------------
    story.append(Spacer(1, 10))
    story.append(Paragraph("Capítulo 6: Caso Práctico Resuelto y Validado (3 Nudos, 3 Barras)", h1_style))
    story.append(HRFlowable(width="100%", thickness=1, color=c_teal, spaceAfter=10))

    story.append(Paragraph(
        "A continuación se presenta el ejercicio exacto del examen resuelto en nuestra plantilla:<br/>"
        "&bull; <b>Nudo 1:</b> (0, 0) cm | <b>Apoyo Móvil Y</b> (Rx=0, Ry=1) &implies; 1 sola reacción vertical R<sub>1Y</sub>, U<sub>1X</sub> libre.<br/>"
        "&bull; <b>Nudo 2:</b> (-700, 0) cm | <b>Apoyo Fijo</b> (Rx=1, Ry=1) &implies; 2 reacciones R<sub>2X</sub> y R<sub>2Y</sub>, D<sub>2X</sub>=0, D<sub>2Y</sub>=0.<br/>"
        "&bull; <b>Nudo 3:</b> (-400, 500) cm | <b>Nudo Libre</b> (Rx=0, Ry=0) con carga P = (+4000 Kgf, -5000 Kgf).<br/>"
        "&bull; <b>Propiedades:</b> A = 10 cm&sup2;, E = 2,100,000 Kgf/cm&sup2;.",
        body_style
    ))

    # Results Table
    res_data = [
        [Paragraph("VARIABLE", table_hdr), Paragraph("VALOR OBTENIDO", table_hdr), Paragraph("ESTADO / INTERPRETACIÓN FÍSICA", table_hdr)],
        [Paragraph("D<sub>1X</sub> (Nudo 1)", table_cell), Paragraph("<b>+0.13333333 cm</b>", table_cell), Paragraph("El rodillo rueda libremente hacia la derecha (+X)", table_cell)],
        [Paragraph("D<sub>1Y</sub> (Nudo 1)", table_cell), Paragraph("<b>0.00000000 cm</b>", table_cell), Paragraph("Restringido por contacto con el suelo", table_cell)],
        [Paragraph("D<sub>2X</sub> (Nudo 2)", table_cell), Paragraph("<b>0.00000000 cm</b>", table_cell), Paragraph("Bloqueado por pasador fijo articulado (¡CERO!)", table_cell)],
        [Paragraph("D<sub>2Y</sub> (Nudo 2)", table_cell), Paragraph("<b>0.00000000 cm</b>", table_cell), Paragraph("Bloqueado por pasador fijo articulado (¡CERO!)", table_cell)],
        [Paragraph("D<sub>3X</sub> (Nudo 3)", table_cell), Paragraph("<b>+0.25478102 cm</b>", table_cell), Paragraph("Desplazamiento horizontal del nudo de carga", table_cell)],
        [Paragraph("D<sub>3Y</sub> (Nudo 3)", table_cell), Paragraph("<b>-0.15286861 cm</b>", table_cell), Paragraph("Desplazamiento vertical hacia abajo por carga Py", table_cell)],
        [Paragraph("R<sub>1Y</sub> (Nudo 1)", table_cell), Paragraph("<b>+5000.00 Kgf</b>", table_cell), Paragraph("Única reacción vertical en el apoyo móvil", table_cell)],
        [Paragraph("R<sub>2X</sub> (Nudo 2)", table_cell), Paragraph("<b>-4000.00 Kgf</b>", table_cell), Paragraph("Reacción horizontal que equilibra Px = +4000 Kgf", table_cell)],
        [Paragraph("R<sub>2Y</sub> (Nudo 2)", table_cell), Paragraph("<b>0.00 Kgf</b>", table_cell), Paragraph("Reacción vertical nula por equilibrio estático", table_cell)],
        [Paragraph("Barra 1 (1 &rarr; 3)", table_cell), Paragraph("<b>-6403.12 Kgf</b>", table_cell), Paragraph("<b>BARRA A COMPRESIÓN (-)</b> | L = 640.31 cm", table_cell)],
        [Paragraph("Barra 2 (2 &rarr; 3)", table_cell), Paragraph("<b>0.00 Kgf</b>", table_cell), Paragraph("<b>BARRA DE FUERZA NULA</b> | L = 583.10 cm", table_cell)],
        [Paragraph("Barra 3 (2 &rarr; 1)", table_cell), Paragraph("<b>+4000.00 Kgf</b>", table_cell), Paragraph("<b>BARRA A TRACCIÓN (+)</b> | L = 700.00 cm", table_cell)],
    ]
    t_res = Table(res_data, colWidths=[120, 120, 240])
    t_res.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), c_teal),
        ('BACKGROUND', (0,1), (-1,6), colors.HexColor("#F8FAFC")),
        ('BACKGROUND', (0,7), (-1,9), colors.HexColor("#EDEDFA")),
        ('BACKGROUND', (0,10), (-1,-1), colors.HexColor("#FEF3C7")),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor("#94A3B8")),
        ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor("#CBD5E1")),
        ('TOPPADDING', (0,0), (-1,-1), 3.5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 3.5),
    ]))
    story.append(t_res)
    story.append(Spacer(1, 10))

    # Static equilibrium proof
    eq_box = [[
        Paragraph(
            "<b>VERIFICACIÓN DE EQUILIBRIO ESTÁTICO GLOBAL:</b><br/>"
            "&bull; &sum; F<sub>X</sub> = P<sub>3X</sub> + R<sub>2X</sub> = +4000.00 + (-4000.00) = <b>0.00 Kgf &check;</b><br/>"
            "&bull; &sum; F<sub>Y</sub> = P<sub>3Y</sub> + R<sub>1Y</sub> + R<sub>2Y</sub> = -5000.00 + 5000.00 + 0.00 = <b>0.00 Kgf &check;</b><br/>"
            "&bull; &sum; M<sub>(Nudo 2)</sub> = R<sub>1Y</sub>&middot;(700) + P<sub>3X</sub>&middot;(500) + P<sub>3Y</sub>&middot;(300) = 3,500,000 + 2,000,000 - 1,500,000 - 4,000,000 = <b>0.00 Kgf&middot;cm &check;</b>",
            box_text
        )
    ]]
    t_eq = Table(eq_box, colWidths=[480])
    t_eq.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#DCFCE7")),
        ('BOX', (0,0), (-1,-1), 1.5, colors.HexColor("#10B981")),
        ('TOPPADDING', (0,0), (-1,-1), 8),
        ('BOTTOMPADDING', (0,0), (-1,-1), 8),
        ('LEFTPADDING', (0,0), (-1,-1), 12),
    ]))
    story.append(t_eq)

    doc.build(story, canvasmaker=NumberedCanvas)
    print(f"PDF successfully built: {PDF_PATH}")
    import shutil
    shutil.copy2(PDF_PATH, PDF_PATH_ANA2)
    print(f"PDF copied to: {PDF_PATH_ANA2}")

if __name__ == "__main__":
    build_pdf()
