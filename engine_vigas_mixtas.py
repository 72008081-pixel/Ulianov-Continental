"""
engine_vigas_mixtas.py
Generador Maestro de Plantillas Excel Dinamicas en Formato '3.1 CUBA VALENCIA - MIXTAS'
para Análisis Estructural II (Cátedra Ing. Ulianov Cuba Valencia).

Incorpora:
1. Paleta Oficial de 7 Colores de Cátedra para Matrices de Rigidez Locales (km) y de Colocación (Km,global)
   (Verde X-X, Celeste X-Y, Salmón Y-Y, Amarillo θ-X, Rojo θ-Y, Morado 4EI/L, Cian 2EI/L).
2. Tabla de Descomposición de Cargas en Tramos: Acciones de Empotramiento Perfecto (FEM) y Cargas Nodales Equivalentes.
3. Construcción Oficial de los Vectores {C} y {D} con etiquetas GDL en Rojo Negrita Cursiva y suma viva de cargas directas + equivalentes.
4. Matriz de Rigidez Global del Ensamble [Kviga] (3N x 3N) por suma directa:
   [Kviga](r, c) = SUM_{m=1..M} Km,global(r, c)
5. Matriz Solver [K_SOLVER], Vector de Desplazamientos {D} y Reacciones {R}.
"""

import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter

# Paleta oficial de cátedra Ing. Ulianov Cuba Valencia
PALETTE = {
    # 7 Colores oficiales para la matriz 6x6 (Imagen de cátedra)
    'GREEN_XX':       '92D050', # Verde vibrante: términos (EA/L)*Cx^2 + (12EI/L^3)*Cy^2
    'BLUE_XY':        'BDD7EE', # Celeste suave: términos (EA/L - 12EI/L^3)*Cx*Cy
    'ORANGE_YY':      'F8CBAD', # Salmón/Durazno: términos (EA/L)*Cy^2 + (12EI/L^3)*Cx^2
    'YELLOW_THETA_X': 'FFFF00', # Amarillo puro: términos (6EI/L^2)*Cy
    'RED_THETA_Y':    'FF0000', # Rojo intenso: términos (6EI/L^2)*Cx
    'PURPLE_4EI':     '7030A0', # Morado: término 4EI/L
    'CYAN_2EI':       '00B0F0', # Azul cian eléctrico: término 2EI/L

    # Colores estructurales complementarios
    'HDR_NAVY':       '1F497D', # Azul marino oscuro institucional
    'HDR_BLUE_MED':   '2F5597',
    'BANNER_BG':      'D9E1F2', # Azul lavanda suave
    'VECTOR_BLUE':    'D9E1F2', # Fondo de columnas de vectores C y D
    'TABLE_ORANGE':   'FCE4D6', # Durazno encabezados tablas
    'RESTRICTED_BG':  'FCE4D6', # Rosa/durazno para grados restringidos
    'FREE_BG':        'E2EFDA', # Verde pastel para grados libres
    'WHITE':          'FFFFFF',
    'TEXT_BLACK':     '000000',
    'TEXT_WHITE':     'FFFFFF',
    'TEXT_RED':       'C00000', # Rojo oficial de etiquetas GDL
    'BORDER_DARK':    '000000',
    'BORDER_NAVY':    '1F497D',
    'BORDER_GRAY':    'D9D9D9'
}

# Mapa de colores para las 36 celdas de la matriz local 6x6 (Filas 0..5, Cols 0..5)
MATRIX_6X6_COLOR_MAP = [
    # Fila 0 (UiX)
    ['GREEN_XX', 'BLUE_XY',   'YELLOW_THETA_X', 'GREEN_XX', 'BLUE_XY',   'YELLOW_THETA_X'],
    # Fila 1 (UiY)
    ['BLUE_XY',  'ORANGE_YY', 'RED_THETA_Y',    'BLUE_XY',  'ORANGE_YY', 'RED_THETA_Y'],
    # Fila 2 (θi)
    ['YELLOW_THETA_X', 'RED_THETA_Y', 'PURPLE_4EI', 'YELLOW_THETA_X', 'RED_THETA_Y', 'CYAN_2EI'],
    # Fila 3 (UfX)
    ['GREEN_XX', 'BLUE_XY',   'YELLOW_THETA_X', 'GREEN_XX', 'BLUE_XY',   'YELLOW_THETA_X'],
    # Fila 4 (UfY)
    ['BLUE_XY',  'ORANGE_YY', 'RED_THETA_Y',    'BLUE_XY',  'ORANGE_YY', 'RED_THETA_Y'],
    # Fila 5 (θf)
    ['YELLOW_THETA_X', 'RED_THETA_Y', 'CYAN_2EI',   'YELLOW_THETA_X', 'RED_THETA_Y', 'PURPLE_4EI']
]

# Celdas que llevan texto blanco por contraste (Rojo, Morado, Cian)
WHITE_TEXT_CELLS = {
    (1, 2), (1, 5),
    (2, 1), (2, 2), (2, 5),
    (4, 2), (4, 5),
    (5, 1), (5, 2), (5, 5)
}

def thin_border(color='000000'):
    s = Side(style='thin', color=color)
    return Border(top=s, bottom=s, left=s, right=s)

def medium_border(color='1F497D'):
    s = Side(style='medium', color=color)
    return Border(top=s, bottom=s, left=s, right=s)

def build_mixtas_workbook(bars_data, nodes_data, sec_props, output_path):
    """
    bars_data: list of dicts: [
        {'barNum': 1, 'xi': 0, 'yi': 0, 'xf': 200, 'yf': 0, 'q': 400, 'q_unit': 'kgf/m', 'q_input': 400, 'P_tramo': 0, 'a_dist': 0, 'L_dist': 200}, ...
    ]
    nodes_data: list of dicts: [
        {'nodeNum': 1, 'cond': 'FIJO', 'Px': 0, 'Py': 0, 'Mz': 0}, ...
    ]
    sec_props: dict: {'E': 200000, 'b': 25.4, 'h': 25.4}
    """
    num_bars = len(bars_data)
    num_nodes = num_bars + 1
    total_dofs = num_nodes * 3

    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "3.1 CUBA VALENCIA - MIXTAS"
    ws.views.sheetView[0].showGridLines = True

    # Anchos de columna optimizados
    ws.column_dimensions['A'].width = 12
    ws.column_dimensions['B'].width = 14
    for c in range(3, 45):
        col_letter = get_column_letter(c)
        ws.column_dimensions[col_letter].width = 13

    # ─────────────────────────────────────────────────────────────────────────
    # 1. BLOQUE DE PROPIEDADES DEL MATERIAL Y SECCIÓN
    # ─────────────────────────────────────────────────────────────────────────
    ws.merge_cells("B1:I1")
    ws['B1'] = f"PROPIEDADES DEL MATERIAL Y SECCIÓN ({num_bars} TRAMOS / {num_nodes} NODOS)"
    ws['B1'].font = Font(name='Calibri', size=11, bold=True, color='FFFFFF')
    ws['B1'].fill = PatternFill(start_color=PALETTE['HDR_NAVY'], end_color=PALETTE['HDR_NAVY'], fill_type='solid')
    ws['B1'].alignment = Alignment(horizontal='center', vertical='center')

    ws['B2'] = "E (Elasticidad) ="
    ws['C2'] = float(sec_props.get('E', 200000))
    ws['D2'] = "kgf/cm²"

    ws['B3'] = "b (Base) ="
    ws['C3'] = float(sec_props.get('b', 25.4))
    ws['D3'] = "cm"
    ws['F3'] = "Tramos Utilizados ="
    ws['G3'] = f"=COUNT(I9:I{8 + num_bars})"

    ws['B4'] = "h (Altura) ="
    ws['C4'] = float(sec_props.get('h', 25.4))
    ws['D4'] = "cm"
    ws['F4'] = "Nodos Utilizados ="
    ws['G4'] = "=IF(G3>0, G3+1, 0)"

    ws['B5'] = "Área ="
    ws['C5'] = "=C3*C4"
    ws['D5'] = "cm2"
    ws['E5'] = "Inercia ="
    ws['F5'] = "=(C3*(C4^3))/12"
    ws['G5'] = "cm4"

    for r in range(2, 6):
        for c in range(2, 8):
            cell = ws.cell(r, c)
            if cell.value:
                cell.font = Font(name='Calibri', size=10, bold=(c in [2, 5, 6]))
                cell.border = thin_border('D9D9D9')

    # ─────────────────────────────────────────────────────────────────────────
    # 2. TABLA DE BARRAS (Filas 7 a 8 + num_bars)
    # ─────────────────────────────────────────────────────────────────────────
    headers_r7 = [
        (2, "Barra"), (3, "INICIO"), (5, "FIN"), (7, "ΔX"), (8, "ΔY"),
        (9, "L (cm)"), (10, "Cosx"), (11, "Cosy"), (12, "E"), (13, "A"),
        (14, "I"), (15, "EA/L"), (16, "12EI/L³"), (17, "6EI/L²"),
        (18, "4EI/L"), (19, "2EI/L")
    ]
    for col, text in headers_r7:
        ws.cell(7, col, text)

    sub_r8 = [(3, "Xi"), (4, "Yi"), (5, "Xf"), (6, "Yf")]
    for col, text in sub_r8:
        ws.cell(8, col, text)

    ws.merge_cells("C7:D7")
    ws.merge_cells("E7:F7")

    orange_fill = PatternFill(start_color=PALETTE['TABLE_ORANGE'], end_color=PALETTE['TABLE_ORANGE'], fill_type='solid')

    for c in range(2, 20):
        for r in [7, 8]:
            cell = ws.cell(r, c)
            cell.font = Font(name='Calibri', size=10, bold=True)
            cell.alignment = Alignment(horizontal='center', vertical='center')
            cell.border = thin_border()
            cell.fill = orange_fill

    for idx, b in enumerate(bars_data):
        row = 9 + idx
        ws.cell(row, 2, b.get('barNum', idx + 1))
        ws.cell(row, 3, b.get('xi', 0))
        ws.cell(row, 4, b.get('yi', 0))
        ws.cell(row, 5, b.get('xf', 0))
        ws.cell(row, 6, b.get('yf', 0))

        ws.cell(row, 7, f'=IF(OR(C{row}="",E{row}=""),"", E{row}-C{row})')
        ws.cell(row, 8, f'=IF(OR(D{row}="",F{row}=""),"", F{row}-D{row})')
        ws.cell(row, 9, f'=IF(OR(G{row}="",H{row}=""),"", SQRT(G{row}*G{row}+H{row}*H{row}))')
        ws.cell(row, 10, f'=IF(OR(I{row}="",I{row}=0),"", G{row}/I{row})')
        ws.cell(row, 11, f'=IF(OR(I{row}="",I{row}=0),"", H{row}/I{row})')
        ws.cell(row, 12, f'=IF(I{row}="","", $C$2)')
        ws.cell(row, 13, f'=IF(I{row}="","", $C$5)')
        ws.cell(row, 14, f'=IF(I{row}="","", $F$5)')
        ws.cell(row, 15, f'=IF(OR(I{row}="",I{row}=0),"", L{row}*M{row}/I{row})')
        ws.cell(row, 16, f'=IF(OR(I{row}="",I{row}=0),"", 12*L{row}*N{row}/(I{row}^3))')
        ws.cell(row, 17, f'=IF(OR(I{row}="",I{row}=0),"", 6*L{row}*N{row}/(I{row}^2))')
        ws.cell(row, 18, f'=IF(OR(I{row}="",I{row}=0),"", 4*L{row}*N{row}/I{row})')
        ws.cell(row, 19, f'=IF(OR(I{row}="",I{row}=0),"", 2*L{row}*N{row}/I{row})')

        for c in range(2, 20):
            cell = ws.cell(row, c)
            cell.font = Font(name='Calibri', size=10)
            cell.alignment = Alignment(horizontal='center', vertical='center')
            cell.border = thin_border()
            if c >= 15:
                cell.fill = PatternFill(start_color='FFFFF2CC', end_color='FFFFF2CC', fill_type='solid')

    # ─────────────────────────────────────────────────────────────────────────
    # 2B. TABLA DE DESCOMPOSICIÓN DE CARGAS EN TRAMOS (FEM / ACCIONES EQUIVALENTES)
    # ─────────────────────────────────────────────────────────────────────────
    fem_hdr_banner = 9 + num_bars + 2
    ws.merge_cells(start_row=fem_hdr_banner, start_column=2, end_row=fem_hdr_banner, end_column=11)
    ws.cell(fem_hdr_banner, 2, "DESCOMPOSICIÓN DE CARGAS EN TRAMOS: ACCIONES DE EMPOTRAMIENTO PERFECTO (FEM) Y CARGAS NODALES EQUIVALENTES")
    ws.cell(fem_hdr_banner, 2).font = Font(name='Calibri', size=11, bold=True, color='FFFFFF')
    ws.cell(fem_hdr_banner, 2).fill = PatternFill(start_color=PALETTE['HDR_NAVY'], end_color=PALETTE['HDR_NAVY'], fill_type='solid')
    ws.cell(fem_hdr_banner, 2).alignment = Alignment(horizontal='center', vertical='center')

    fem_hdr_cols = [
        (2, "Barra"), (3, "q (kgf/cm)"), (4, "P_tramo (kgf)"), (5, "a (cm)"), (6, "L (cm)"),
        (7, "Vi_fij (kgf)"), (8, "Mi_fij (kgf·cm)"), (9, "Vj_fij (kgf)"), (10, "Mj_fij (kgf·cm)"), (11, "Nodo I → J")
    ]
    fem_sub_row = fem_hdr_banner + 1
    for col, text in fem_hdr_cols:
        ws.cell(fem_sub_row, col, text)
        cell = ws.cell(fem_sub_row, col)
        cell.font = Font(name='Calibri', size=9, bold=True)
        cell.alignment = Alignment(horizontal='center', vertical='center')
        cell.border = thin_border()
        cell.fill = PatternFill(start_color=PALETTE['BANNER_BG'], end_color=PALETTE['BANNER_BG'], fill_type='solid')

    fem_start_row = fem_sub_row + 1
    for idx, b in enumerate(bars_data):
        row = fem_start_row + idx
        b_ref_row = 9 + idx

        # Conversión de q a kgf/cm
        q_raw = float(b.get('q_input', b.get('q', 0)))
        q_unit = b.get('q_unit', 'kgf/cm')
        q_cm = (q_raw / 100.0) if q_unit == 'kgf/m' else q_raw
        p_tramo = float(b.get('P_tramo', 0))
        a_dist = float(b.get('a_dist', 0))

        ws.cell(row, 2, idx + 1)
        ws.cell(row, 3, q_cm)
        ws.cell(row, 4, p_tramo)
        ws.cell(row, 5, a_dist)
        ws.cell(row, 6, f'=I{b_ref_row}')

        # Fórmulas de empotramiento perfecto:
        # Vi_fij = (q*L)/2 + P*(b^2)*(3a+b)/L^3
        # Mi_fij = (q*L^2)/12 + P*a*b^2/L^2
        # Vj_fij = (q*L)/2 + P*(a^2)*(a+3b)/L^3
        # Mj_fij = -(q*L^2)/12 - P*a^2*b/L^2
        ws.cell(row, 7, f'=(C{row}*F{row})/2 + IF(D{row}=0, 0, D{row}*((F{row}-E{row})^2)*(3*E{row}+(F{row}-E{row}))/(F{row}^3))')
        ws.cell(row, 8, f'=(C{row}*(F{row}^2))/12 + IF(D{row}=0, 0, D{row}*E{row}*((F{row}-E{row})^2)/(F{row}^2))')
        ws.cell(row, 9, f'=(C{row}*F{row})/2 + IF(D{row}=0, 0, D{row}*(E{row}^2)*(E{row}+3*(F{row}-E{row}))/(F{row}^3))')
        ws.cell(row, 10, f'=-(C{row}*(F{row}^2))/12 - IF(D{row}=0, 0, D{row}*(E{row}^2)*(F{row}-E{row})/(F{row}^2))')
        ws.cell(row, 11, f'{idx+1} → {idx+2}')

        for c in range(2, 12):
            cell = ws.cell(row, c)
            cell.font = Font(name='Calibri', size=9)
            cell.alignment = Alignment(horizontal='center', vertical='center')
            cell.border = thin_border()
            if c in [7, 8, 9, 10]:
                cell.fill = PatternFill(start_color='FFFFF2CC', end_color='FFFFF2CC', fill_type='solid')

    # ─────────────────────────────────────────────────────────────────────────
    # 3. TABLA DE GRADOS DE LIBERTAD (DOFs)
    # ─────────────────────────────────────────────────────────────────────────
    dof_hdr_row = fem_start_row + num_bars + 2
    ws.cell(dof_hdr_row, 2, "Barra")
    ws.cell(dof_hdr_row, 3, "INICIO")
    ws.cell(dof_hdr_row, 6, "FIN")
    ws.merge_cells(start_row=dof_hdr_row, start_column=3, end_row=dof_hdr_row, end_column=5)
    ws.merge_cells(start_row=dof_hdr_row, start_column=6, end_row=dof_hdr_row, end_column=8)

    dof_sub_row = dof_hdr_row + 1
    for c, sym in [(3, 'X'), (4, 'Y'), (5, 'θ'), (6, 'X'), (7, 'Y'), (8, 'θ')]:
        ws.cell(dof_sub_row, c, sym)

    for c in range(2, 9):
        for r in [dof_hdr_row, dof_sub_row]:
            cell = ws.cell(r, c)
            cell.font = Font(name='Calibri', size=10, bold=True)
            cell.alignment = Alignment(horizontal='center', vertical='center')
            cell.border = thin_border()
            cell.fill = orange_fill

    dof_start_row = dof_sub_row + 1
    for idx in range(num_bars):
        r = dof_start_row + idx
        b_row = 9 + idx
        ws.cell(r, 2, idx + 1)
        n_ini = idx + 1
        n_fin = idx + 2
        ws.cell(r, 3, f'=IF(I{b_row}="","", {n_ini})')
        ws.cell(r, 4, f'=IF(I{b_row}="","", {n_ini})')
        ws.cell(r, 5, f'=IF(I{b_row}="","", {n_ini})')
        ws.cell(r, 6, f'=IF(I{b_row}="","", {n_fin})')
        ws.cell(r, 7, f'=IF(I{b_row}="","", {n_fin})')
        ws.cell(r, 8, f'=IF(I{b_row}="","", {n_fin})')

        for c in range(2, 9):
            cell = ws.cell(r, c)
            cell.font = Font(name='Calibri', size=10)
            cell.alignment = Alignment(horizontal='center', vertical='center')
            cell.border = thin_border()

    # ─────────────────────────────────────────────────────────────────────────
    # 4. MATRICES DE RIGIDEZ LOCALES (km) Y DE COLOCACIÓN GLOBAL (Km,global)
    #    CON LA PALETA DE 7 COLORES OFICIAL DE CÁTEDRA (IMAGEN 3)
    # ─────────────────────────────────────────────────────────────────────────
    current_row = dof_start_row + num_bars + 2
    local_k_ranges = []
    global_k_ranges = []

    for m in range(1, num_bars + 1):
        bar_idx = m - 1
        b_row = 9 + bar_idx
        d_row = dof_start_row + bar_idx
        sub_dof_row = dof_sub_row

        # Encabezado de la matriz local: Título de barra
        ws.merge_cells(start_row=current_row, start_column=2, end_row=current_row, end_column=8)
        ws.cell(current_row, 2, f"6° Construir la matriz de rigideces de cada barra — Matriz de rigidez de la barra {m}")
        ws.cell(current_row, 2).font = Font(name='Calibri', size=11, bold=True, color='FFFFFF')
        ws.cell(current_row, 2).fill = PatternFill(start_color=PALETTE['HDR_NAVY'], end_color=PALETTE['HDR_NAVY'], fill_type='solid')
        ws.cell(current_row, 2).alignment = Alignment(horizontal='left', vertical='center')

        hdr_k_row = current_row + 1
        dof_labels = ['UiX', 'UiY', 'θi', 'UfX', 'UfY', 'θf']
        for i_col, d_lbl in enumerate(dof_labels):
            col_target = 2 + i_col
            ws.cell(hdr_k_row, col_target, d_lbl)
            cell = ws.cell(hdr_k_row, col_target)
            cell.font = Font(name='Calibri', size=9, bold=True)
            cell.alignment = Alignment(horizontal='center', vertical='center')
            cell.border = thin_border()
            cell.fill = PatternFill(start_color='F2F2F2', end_color='F2F2F2', fill_type='solid')

        k_local_start = hdr_k_row + 1
        r1 = k_local_start
        ws.cell(r1, 2, f'=IF(I{b_row}="", 0, O{b_row}*J{b_row}*J{b_row}+P{b_row}*K{b_row}*K{b_row})')
        ws.cell(r1, 3, f'=IF(I{b_row}="", 0, (O{b_row}-P{b_row})*(J{b_row}*K{b_row}))')
        ws.cell(r1, 4, f'=IF(I{b_row}="", 0, -Q{b_row}*K{b_row})')
        ws.cell(r1, 5, f'=-B{r1}')
        ws.cell(r1, 6, f'=-C{r1}')
        ws.cell(r1, 7, f'=D{r1}')
        ws.cell(r1, 8, 'UiX')

        r2 = r1 + 1
        ws.cell(r2, 2, f'=C{r1}')
        ws.cell(r2, 3, f'=IF(I{b_row}="", 0, O{b_row}*K{b_row}*K{b_row}+P{b_row}*J{b_row}*J{b_row})')
        ws.cell(r2, 4, f'=IF(I{b_row}="", 0, Q{b_row}*J{b_row})')
        ws.cell(r2, 5, f'=-B{r2}')
        ws.cell(r2, 6, f'=-C{r2}')
        ws.cell(r2, 7, f'=D{r2}')
        ws.cell(r2, 8, 'UiY')

        r3 = r2 + 1
        ws.cell(r3, 1, f'K{m} =')
        ws.cell(r3, 1).font = Font(name='Calibri', size=11, bold=True)
        ws.cell(r3, 2, f'=D{r1}')
        ws.cell(r3, 3, f'=D{r2}')
        ws.cell(r3, 4, f'=IF(I{b_row}="", 0, R{b_row})')
        ws.cell(r3, 5, f'=-B{r3}')
        ws.cell(r3, 6, f'=-C{r3}')
        ws.cell(r3, 7, f'=IF(I{b_row}="", 0, S{b_row})')
        ws.cell(r3, 8, 'θi')

        r4 = r3 + 1
        ws.cell(r4, 2, f'=E{r1}')
        ws.cell(r4, 3, f'=E{r2}')
        ws.cell(r4, 4, f'=E{r3}')
        ws.cell(r4, 5, f'=B{r1}')
        ws.cell(r4, 6, f'=C{r1}')
        ws.cell(r4, 7, f'=-D{r1}')
        ws.cell(r4, 8, 'UfX')

        r5 = r4 + 1
        ws.cell(r5, 2, f'=F{r1}')
        ws.cell(r5, 3, f'=F{r2}')
        ws.cell(r5, 4, f'=F{r3}')
        ws.cell(r5, 5, f'=F{r4}')
        ws.cell(r5, 6, f'=C{r2}')
        ws.cell(r5, 7, f'=-D{r2}')
        ws.cell(r5, 8, 'UfY')

        r6 = r5 + 1
        ws.cell(r6, 2, f'=G{r1}')
        ws.cell(r6, 3, f'=G{r2}')
        ws.cell(r6, 4, f'=G{r3}')
        ws.cell(r6, 5, f'=G{r4}')
        ws.cell(r6, 6, f'=G{r5}')
        ws.cell(r6, 7, f'=D{r3}')
        ws.cell(r6, 8, 'θf')

        local_k_ranges.append((r1, r6))

        # APLICAR LOS 7 COLORES OFICIALES A LAS 36 CELDAS DE km (IMAGEN 3)
        for loc_r in range(6):
            curr_row = r1 + loc_r
            # Etiqueta DOF de la fila en columna 8
            ws.cell(curr_row, 8).font = Font(name='Calibri', size=9, bold=True)
            ws.cell(curr_row, 8).alignment = Alignment(horizontal='center', vertical='center')
            ws.cell(curr_row, 8).border = thin_border()
            ws.cell(curr_row, 8).fill = PatternFill(start_color='F2F2F2', end_color='F2F2F2', fill_type='solid')

            for loc_c in range(6):
                col_num = 2 + loc_c
                cell = ws.cell(curr_row, col_num)
                color_key = MATRIX_6X6_COLOR_MAP[loc_r][loc_c]
                hex_color = PALETTE[color_key]

                is_white_text = (loc_r, loc_c) in WHITE_TEXT_CELLS
                cell.font = Font(name='Calibri', size=9, bold=True, color='FFFFFF' if is_white_text else '000000')
                cell.fill = PatternFill(start_color=hex_color, end_color=hex_color, fill_type='solid')
                cell.alignment = Alignment(horizontal='right', vertical='center')
                cell.border = thin_border()

        # ── MATRIZ DE COLOCACIÓN GLOBAL Km,global (3N x 3N) ──────────────────
        k_glob_banner = r6 + 2
        ws.merge_cells(start_row=k_glob_banner, start_column=2, end_row=k_glob_banner, end_column=1 + total_dofs)
        ws.cell(k_glob_banner, 2, f"Matriz de Colocación Expandida K{m},global ({total_dofs} x {total_dofs}) — Barra {m} (Nodos {m} → {m+1})")
        ws.cell(k_glob_banner, 2).font = Font(name='Calibri', size=10, bold=True, color='FFFFFF')
        ws.cell(k_glob_banner, 2).fill = PatternFill(start_color=PALETTE['HDR_BLUE_MED'], end_color=PALETTE['HDR_BLUE_MED'], fill_type='solid')
        ws.cell(k_glob_banner, 2).alignment = Alignment(horizontal='left', vertical='center')

        k_glob_hdr_row = k_glob_banner + 1
        for n in range(1, num_nodes + 1):
            base_col = 2 + (n - 1) * 3
            ws.cell(k_glob_hdr_row, base_col, f'U{n}X')
            ws.cell(k_glob_hdr_row, base_col + 1, f'U{n}Y')
            ws.cell(k_glob_hdr_row, base_col + 2, f'U{n}θ')
            for bc in range(base_col, base_col + 3):
                cell = ws.cell(k_glob_hdr_row, bc)
                cell.font = Font(name='Calibri', size=9, bold=True, italic=True, color=PALETTE['TEXT_RED'])
                cell.alignment = Alignment(horizontal='center', vertical='center')
                cell.border = thin_border()
                cell.fill = PatternFill(start_color=PALETTE['BANNER_BG'], end_color=PALETTE['BANNER_BG'], fill_type='solid')

        k_glob_start = k_glob_hdr_row + 1
        node_i = m
        node_j = m + 1
        dof_indices = [
            (node_i - 1) * 3 + 1,
            (node_i - 1) * 3 + 2,
            (node_i - 1) * 3 + 3,
            (node_j - 1) * 3 + 1,
            (node_j - 1) * 3 + 2,
            (node_j - 1) * 3 + 3
        ]

        mid_r = k_glob_start + total_dofs // 2
        ws.cell(mid_r, 1, f'K{m} =')
        ws.cell(mid_r, 1).font = Font(name='Calibri', size=11, bold=True)

        for r_idx in range(1, total_dofs + 1):
            row_num = k_glob_start + r_idx - 1
            n_lbl = (r_idx - 1) // 3 + 1
            axis_lbl = ['X', 'Y', 'θ'][(r_idx - 1) % 3]
            end_col = 2 + total_dofs
            ws.cell(row_num, end_col, f'U{n_lbl}{axis_lbl}')
            ws.cell(row_num, end_col).font = Font(name='Calibri', size=9, bold=True, italic=True, color=PALETTE['TEXT_RED'])
            ws.cell(row_num, end_col).border = thin_border()
            ws.cell(row_num, end_col).fill = PatternFill(start_color=PALETTE['BANNER_BG'], end_color=PALETTE['BANNER_BG'], fill_type='solid')

            for c_idx in range(1, total_dofs + 1):
                col_num = 1 + c_idx
                cell = ws.cell(row_num, col_num)
                cell.font = Font(name='Calibri', size=9)
                cell.border = thin_border()

                if r_idx in dof_indices and c_idx in dof_indices:
                    loc_r_idx = dof_indices.index(r_idx)
                    loc_c_idx = dof_indices.index(c_idx)
                    loc_row_cell = r1 + loc_r_idx
                    loc_col_letter = get_column_letter(2 + loc_c_idx)
                    cell.value = f'={loc_col_letter}{loc_row_cell}'
                    cell.alignment = Alignment(horizontal='right', vertical='center')

                    # HEREDAR EL COLOR OFICIAL DEL BLOQUE 6x6 (IMAGEN 3)
                    color_key = MATRIX_6X6_COLOR_MAP[loc_r_idx][loc_c_idx]
                    hex_color = PALETTE[color_key]
                    is_white = (loc_r_idx, loc_c_idx) in WHITE_TEXT_CELLS
                    cell.font = Font(name='Calibri', size=9, bold=True, color='FFFFFF' if is_white else '000000')
                    cell.fill = PatternFill(start_color=hex_color, end_color=hex_color, fill_type='solid')

        global_k_ranges.append((k_glob_start, k_glob_start + total_dofs - 1))
        current_row = k_glob_start + total_dofs + 2

    # ─────────────────────────────────────────────────────────────────────────
    # 5. MATRIZ DE RIGIDEZ GLOBAL DE LA VIGA [Kviga] (ENSAMBLE COMPLETO)
    # ─────────────────────────────────────────────────────────────────────────
    k_viga_banner = current_row
    ws.merge_cells(start_row=k_viga_banner, start_column=2, end_row=k_viga_banner, end_column=1 + total_dofs)
    ws.cell(k_viga_banner, 2, f"MATRIZ DE RIGIDEZ GLOBAL DE LA VIGA [Kviga] (ENSAMBLE COMPLETO {num_bars} TRAMOS / {num_nodes} NODOS / {total_dofs} GDL)")
    ws.cell(k_viga_banner, 2).font = Font(name='Calibri', size=11, bold=True, color='FFFFFF')
    ws.cell(k_viga_banner, 2).fill = PatternFill(start_color=PALETTE['HDR_NAVY'], end_color=PALETTE['HDR_NAVY'], fill_type='solid')
    ws.cell(k_viga_banner, 2).alignment = Alignment(horizontal='center', vertical='center')

    k_viga_hdr = k_viga_banner + 1
    for n in range(1, num_nodes + 1):
        base_col = 2 + (n - 1) * 3
        ws.cell(k_viga_hdr, base_col, f'U{n}X')
        ws.cell(k_viga_hdr, base_col + 1, f'U{n}Y')
        ws.cell(k_viga_hdr, base_col + 2, f'U{n}θ')
        for bc in range(base_col, base_col + 3):
            cell = ws.cell(k_viga_hdr, bc)
            cell.font = Font(name='Calibri', size=9, bold=True, italic=True, color=PALETTE['TEXT_RED'])
            cell.alignment = Alignment(horizontal='center', vertical='center')
            cell.border = thin_border()
            cell.fill = PatternFill(start_color=PALETTE['BANNER_BG'], end_color=PALETTE['BANNER_BG'], fill_type='solid')

    k_viga_start = k_viga_hdr + 1
    mid_kviga = k_viga_start + total_dofs // 2
    ws.cell(mid_kviga, 1, "Kviga =")
    ws.cell(mid_kviga, 1).font = Font(name='Calibri', size=12, bold=True)

    for r_idx in range(1, total_dofs + 1):
        row_num = k_viga_start + r_idx - 1
        n_lbl = (r_idx - 1) // 3 + 1
        axis_lbl = ['X', 'Y', 'θ'][(r_idx - 1) % 3]
        end_col = 2 + total_dofs
        ws.cell(row_num, end_col, f'U{n_lbl}{axis_lbl}')
        ws.cell(row_num, end_col).font = Font(name='Calibri', size=9, bold=True, italic=True, color=PALETTE['TEXT_RED'])
        ws.cell(row_num, end_col).border = thin_border()
        ws.cell(row_num, end_col).fill = PatternFill(start_color=PALETTE['BANNER_BG'], end_color=PALETTE['BANNER_BG'], fill_type='solid')

        for c_idx in range(1, total_dofs + 1):
            col_num = 1 + c_idx
            col_let = get_column_letter(col_num)

            sum_terms = [f'{col_let}{g_start + r_idx - 1}' for g_start, _ in global_k_ranges]
            cell = ws.cell(row_num, col_num)
            cell.value = '=' + '+'.join(sum_terms)
            cell.font = Font(name='Calibri', size=9)
            cell.alignment = Alignment(horizontal='right', vertical='center')
            cell.border = thin_border()
            if r_idx == c_idx:
                cell.fill = PatternFill(start_color='FFFF00', end_color='FFFF00', fill_type='solid')
                cell.font = Font(name='Calibri', size=9, bold=True)

    current_row = k_viga_start + total_dofs + 2

    # ─────────────────────────────────────────────────────────────────────────
    # 6. CONSTRUCCIÓN DE MATRIZ DE CARGAS {C} (ESTILO CÁTEDRA - IMAGEN 4)
    #    SUMA VIVA: CARGA DIRECTA + ACCIONES EQUIVALENTES DE TRAMOS ADYACENTES
    # ─────────────────────────────────────────────────────────────────────────
    vec_banner = current_row
    ws.merge_cells(start_row=vec_banner, start_column=2, end_row=vec_banner, end_column=7)
    ws.cell(vec_banner, 2, "CONSTRUCCIÓN DE MATRIZ DE CARGAS {C}")
    ws.cell(vec_banner, 2).font = Font(name='Calibri', size=11, bold=True, color='FFFFFF')
    ws.cell(vec_banner, 2).fill = PatternFill(start_color=PALETTE['HDR_NAVY'], end_color=PALETTE['HDR_NAVY'], fill_type='solid')
    ws.cell(vec_banner, 2).alignment = Alignment(horizontal='center', vertical='center')

    hdr_vec_r = vec_banner + 1
    ws.cell(hdr_vec_r, 2, "Símbolo")
    ws.cell(hdr_vec_r, 3, "G.D.L.")
    ws.cell(hdr_vec_r, 4, "=")
    ws.cell(hdr_vec_r, 5, "Carga {C} (Directa + Eq. Tramos)")
    ws.cell(hdr_vec_r, 6, "G.D.L.")
    ws.cell(hdr_vec_r, 7, "Unidad")

    for c in [2, 3, 4, 5, 6, 7]:
        cell = ws.cell(hdr_vec_r, c)
        cell.font = Font(name='Calibri', size=9, bold=True)
        cell.alignment = Alignment(horizontal='center', vertical='center')
        cell.border = thin_border()
        cell.fill = PatternFill(start_color=PALETTE['BANNER_BG'], end_color=PALETTE['BANNER_BG'], fill_type='solid')

    vec_start_row = hdr_vec_r + 1
    for r_idx in range(1, total_dofs + 1):
        row_num = vec_start_row + r_idx - 1
        n_lbl = (r_idx - 1) // 3 + 1
        axis_idx = (r_idx - 1) % 3
        axis_lbl = ['X', 'Y', 'θ'][axis_idx]
        unit_lbl = ['kgf', 'kgf', 'kgf·cm'][axis_idx]

        node_info = nodes_data[n_lbl - 1] if n_lbl - 1 < len(nodes_data) else {}
        val_direct = 0.0
        if axis_idx == 0: val_direct = float(node_info.get('Px', 0.0))
        elif axis_idx == 1: val_direct = float(node_info.get('Py', 0.0))
        elif axis_idx == 2: val_direct = float(node_info.get('Mz', 0.0))

        # FÓRMULA DE CARGA EQUIVALENTE SUMADA DE LOS TRAMOS CONECTADOS:
        # Si axis_idx == 1 (Y): Suma -Vj_fij del tramo izquierdo y -Vi_fij del tramo derecho
        # Si axis_idx == 2 (θ): Suma -Mj_fij del tramo izquierdo y -Mi_fij del tramo derecho
        c_terms = [str(val_direct)] if abs(val_direct) > 1e-9 else []
        left_bar_idx = n_lbl - 2  # Tramo que termina en n_lbl (barra n_lbl - 1)
        right_bar_idx = n_lbl - 1 # Tramo que inicia en n_lbl (barra n_lbl)

        if left_bar_idx >= 0 and left_bar_idx < num_bars:
            fem_r = fem_start_row + left_bar_idx
            if axis_idx == 1:
                # -Vj_fij (Col I)
                c_terms.append(f'-I{fem_r}')
            elif axis_idx == 2:
                # -Mj_fij (Col J)
                c_terms.append(f'-J{fem_r}')

        if right_bar_idx >= 0 and right_bar_idx < num_bars:
            fem_r = fem_start_row + right_bar_idx
            if axis_idx == 1:
                # -Vi_fij (Col G)
                c_terms.append(f'-G{fem_r}')
            elif axis_idx == 2:
                # -Mi_fij (Col H)
                c_terms.append(f'-H{fem_r}')

        c_formula_val = ('=' + '+'.join(c_terms).replace('+-', '-')) if c_terms else 0.0

        ws.cell(row_num, 2, f'C{n_lbl}{axis_lbl}')
        ws.cell(row_num, 2).font = Font(name='Calibri', size=9, bold=True)
        ws.cell(row_num, 3, f'U{n_lbl}{axis_lbl}')
        ws.cell(row_num, 3).font = Font(name='Calibri', size=9, bold=True, italic=True, color=PALETTE['TEXT_RED'])
        ws.cell(row_num, 4, "=")

        cell_c = ws.cell(row_num, 5)
        cell_c.value = c_formula_val
        cell_c.font = Font(name='Calibri', size=9, bold=True)
        cell_c.alignment = Alignment(horizontal='right', vertical='center')

        ws.cell(row_num, 6, f'U{n_lbl}{axis_lbl}')
        ws.cell(row_num, 6).font = Font(name='Calibri', size=9, bold=True, italic=True, color=PALETTE['TEXT_RED'])
        ws.cell(row_num, 7, unit_lbl)

        for c in [2, 3, 4, 5, 6, 7]:
            cell = ws.cell(row_num, c)
            cell.border = thin_border()
            if c in [2, 3, 4, 6, 7]:
                cell.alignment = Alignment(horizontal='center', vertical='center')
                cell.fill = PatternFill(start_color=PALETTE['BANNER_BG'], end_color=PALETTE['BANNER_BG'], fill_type='solid')

    current_row = vec_start_row + total_dofs + 2

    # ─────────────────────────────────────────────────────────────────────────
    # 7. CONSTRUCCIÓN DE MATRIZ DE DESPLAZAMIENTOS {D} (ESTILO CÁTEDRA - IMAGEN 5)
    # ─────────────────────────────────────────────────────────────────────────
    disp_banner = current_row
    ws.merge_cells(start_row=disp_banner, start_column=2, end_row=disp_banner, end_column=7)
    ws.cell(disp_banner, 2, "CONSTRUCCIÓN DE MATRIZ DE DESPLAZAMIENTOS {D}")
    ws.cell(disp_banner, 2).font = Font(name='Calibri', size=11, bold=True, color='FFFFFF')
    ws.cell(disp_banner, 2).fill = PatternFill(start_color=PALETTE['HDR_NAVY'], end_color=PALETTE['HDR_NAVY'], fill_type='solid')
    ws.cell(disp_banner, 2).alignment = Alignment(horizontal='center', vertical='center')

    hdr_disp_r = disp_banner + 1
    ws.cell(hdr_disp_r, 2, "Símbolo")
    ws.cell(hdr_disp_r, 3, "G.D.L.")
    ws.cell(hdr_disp_r, 4, "=")
    ws.cell(hdr_disp_r, 5, "Condición / Valor {D}")
    ws.cell(hdr_disp_r, 6, "G.D.L.")
    ws.cell(hdr_disp_r, 7, "Estado")

    for c in [2, 3, 4, 5, 6, 7]:
        cell = ws.cell(hdr_disp_r, c)
        cell.font = Font(name='Calibri', size=9, bold=True)
        cell.alignment = Alignment(horizontal='center', vertical='center')
        cell.border = thin_border()
        cell.fill = PatternFill(start_color=PALETTE['BANNER_BG'], end_color=PALETTE['BANNER_BG'], fill_type='solid')

    disp_start_row = hdr_disp_r + 1
    for r_idx in range(1, total_dofs + 1):
        row_num = disp_start_row + r_idx - 1
        n_lbl = (r_idx - 1) // 3 + 1
        axis_idx = (r_idx - 1) % 3
        axis_lbl = ['X', 'Y', 'θ'][axis_idx]

        node_info = nodes_data[n_lbl - 1] if n_lbl - 1 < len(nodes_data) else {}
        cond = node_info.get('cond', 'LIBRE')

        is_restricted = False
        if cond == 'EMPOTRADO':
            is_restricted = True
        elif cond == 'FIJO':
            is_restricted = (axis_idx in [0, 1])
        elif cond == 'RODILLO':
            is_restricted = (axis_idx == 1)

        ws.cell(row_num, 2, f'D{n_lbl}{axis_lbl}')
        ws.cell(row_num, 2).font = Font(name='Calibri', size=9, bold=True)
        ws.cell(row_num, 3, f'U{n_lbl}{axis_lbl}')
        ws.cell(row_num, 3).font = Font(name='Calibri', size=9, bold=True, italic=True, color=PALETTE['TEXT_RED'])
        ws.cell(row_num, 4, "=")

        cell_d = ws.cell(row_num, 5)
        if is_restricted:
            cell_d.value = 0
            cell_d.font = Font(name='Calibri', size=9, bold=True)
            cell_d.fill = PatternFill(start_color=PALETTE['RESTRICTED_BG'], end_color=PALETTE['RESTRICTED_BG'], fill_type='solid')
        else:
            cell_d.value = f'D{n_lbl}{axis_lbl}'
            cell_d.font = Font(name='Calibri', size=9, italic=True)
            cell_d.fill = PatternFill(start_color=PALETTE['FREE_BG'], end_color=PALETTE['FREE_BG'], fill_type='solid')

        ws.cell(row_num, 6, f'U{n_lbl}{axis_lbl}')
        ws.cell(row_num, 6).font = Font(name='Calibri', size=9, bold=True, italic=True, color=PALETTE['TEXT_RED'])
        ws.cell(row_num, 7, "RESTRINGIDO" if is_restricted else "LIBRE")
        ws.cell(row_num, 7).font = Font(name='Calibri', size=9, bold=True, color='C00000' if is_restricted else '385723')

        for c in [2, 3, 4, 5, 6, 7]:
            cell = ws.cell(row_num, c)
            cell.border = thin_border()
            if c != 5:
                cell.alignment = Alignment(horizontal='center', vertical='center')
                cell.fill = PatternFill(start_color=PALETTE['BANNER_BG'], end_color=PALETTE['BANNER_BG'], fill_type='solid')
            else:
                cell.alignment = Alignment(horizontal='center', vertical='center')

    current_row = disp_start_row + total_dofs + 2

    # ─────────────────────────────────────────────────────────────────────────
    # 8. ECUACIÓN MATRICIAL DEL SISTEMA: {C} = [Kviga] * {D}
    # ─────────────────────────────────────────────────────────────────────────
    eq_banner = current_row
    ws.merge_cells(start_row=eq_banner, start_column=2, end_row=eq_banner, end_column=2 + total_dofs + 2)
    ws.cell(eq_banner, 2, "ECUACIÓN MATRICIAL COMPLETA DEL SISTEMA: {C} = [Kviga] * {D}")
    ws.cell(eq_banner, 2).font = Font(name='Calibri', size=11, bold=True, color='FFFFFF')
    ws.cell(eq_banner, 2).fill = PatternFill(start_color=PALETTE['HDR_NAVY'], end_color=PALETTE['HDR_NAVY'], fill_type='solid')
    ws.cell(eq_banner, 2).alignment = Alignment(horizontal='center', vertical='center')

    eq_start = eq_banner + 2
    for r_idx in range(1, total_dofs + 1):
        row_num = eq_start + r_idx - 1
        c_src_row = vec_start_row + r_idx - 1
        d_src_row = disp_start_row + r_idx - 1
        k_src_row = k_viga_start + r_idx - 1

        ws.cell(row_num, 1, f'=E{c_src_row}')
        ws.cell(row_num, 1).font = Font(name='Calibri', size=9, bold=True)
        ws.cell(row_num, 1).alignment = Alignment(horizontal='right', vertical='center')

        ws.cell(row_num, 2, "=")
        ws.cell(row_num, 2).alignment = Alignment(horizontal='center', vertical='center')

        for c_idx in range(1, total_dofs + 1):
            col_num = 2 + c_idx
            col_let = get_column_letter(col_num)
            cell = ws.cell(row_num, col_num)
            cell.value = f'={col_let}{k_src_row}'
            cell.font = Font(name='Calibri', size=9)
            cell.alignment = Alignment(horizontal='right', vertical='center')
            cell.border = thin_border()
            if r_idx == c_idx:
                cell.fill = PatternFill(start_color='FFFF00', end_color='FFFF00', fill_type='solid')

        mult_col = 3 + total_dofs
        ws.cell(row_num, mult_col, "*")
        ws.cell(row_num, mult_col).alignment = Alignment(horizontal='center', vertical='center')

        d_col = mult_col + 1
        ws.cell(row_num, d_col, f'=E{d_src_row}')
        ws.cell(row_num, d_col).font = Font(name='Calibri', size=9, bold=True)
        ws.cell(row_num, d_col).border = thin_border()
        ws.cell(row_num, d_col).alignment = Alignment(horizontal='center', vertical='center')

    current_row = eq_start + total_dofs + 2

    # ─────────────────────────────────────────────────────────────────────────
    # 9. BLOQUE TÉCNICO DE RESOLUCIÓN AUTOMÁTICA [K_SOLVER]
    # ─────────────────────────────────────────────────────────────────────────
    solv_banner = current_row
    ws.merge_cells(start_row=solv_banner, start_column=2, end_row=solv_banner, end_column=1 + total_dofs)
    ws.cell(solv_banner, 2, "BLOQUE TÉCNICO DE RESOLUCIÓN AUTOMÁTICA [K_SOLVER] (INVERSIÓN POR PENALIZACIÓN/IDENTIDAD)")
    ws.cell(solv_banner, 2).font = Font(name='Calibri', size=11, bold=True, color='FFFFFF')
    ws.cell(solv_banner, 2).fill = PatternFill(start_color=PALETTE['HDR_NAVY'], end_color=PALETTE['HDR_NAVY'], fill_type='solid')
    ws.cell(solv_banner, 2).alignment = Alignment(horizontal='center', vertical='center')

    solv_start = solv_banner + 2
    for r_idx in range(1, total_dofs + 1):
        row_num = solv_start + r_idx - 1
        cond_row_r = disp_start_row + r_idx - 1
        k_src_row = k_viga_start + r_idx - 1

        for c_idx in range(1, total_dofs + 1):
            col_num = 1 + c_idx
            col_let = get_column_letter(col_num)
            cond_row_c = disp_start_row + c_idx - 1

            cell = ws.cell(row_num, col_num)
            cell.font = Font(name='Calibri', size=9)
            cell.alignment = Alignment(horizontal='right', vertical='center')
            cell.border = thin_border()

            if r_idx == c_idx:
                cell.value = f'=IF(G{cond_row_r}="RESTRINGIDO", 1, {col_let}{k_src_row})'
                cell.fill = PatternFill(start_color='FFD9E1F2', end_color='FFD9E1F2', fill_type='solid')
            else:
                cell.value = f'=IF(OR(G{cond_row_r}="RESTRINGIDO", G{cond_row_c}="RESTRINGIDO"), 0, {col_let}{k_src_row})'

    current_row = solv_start + total_dofs + 2

    # ─────────────────────────────────────────────────────────────────────────
    # 10. RESUMEN DE DESPLAZAMIENTOS Y REACCIONES
    # ─────────────────────────────────────────────────────────────────────────
    res_banner = current_row
    ws.merge_cells(start_row=res_banner, start_column=2, end_row=res_banner, end_column=5)
    ws.cell(res_banner, 2, "RESUMEN DE DESPLAZAMIENTOS Y GIROS CALCULADOS {D}")
    ws.cell(res_banner, 2).font = Font(name='Calibri', size=11, bold=True, color='FFFFFF')
    ws.cell(res_banner, 2).fill = PatternFill(start_color=PALETTE['HDR_NAVY'], end_color=PALETTE['HDR_NAVY'], fill_type='solid')
    ws.cell(res_banner, 2).alignment = Alignment(horizontal='center', vertical='center')

    res_hdr = res_banner + 1
    for c, t in [(2, "Símbolo"), (3, "G.D.L."), (4, "Desplazamiento Calculado"), (5, "Unidad")]:
        ws.cell(res_hdr, c, t)
        cell = ws.cell(res_hdr, c)
        cell.font = Font(name='Calibri', size=9, bold=True)
        cell.alignment = Alignment(horizontal='center', vertical='center')
        cell.border = thin_border()
        cell.fill = PatternFill(start_color=PALETTE['BANNER_BG'], end_color=PALETTE['BANNER_BG'], fill_type='solid')

    res_start = res_hdr + 1
    end_col_let = get_column_letter(1 + total_dofs)
    solv_end_row = solv_start + total_dofs - 1
    k_inv_range = f"MINVERSE(B{solv_start}:{end_col_let}{solv_end_row})"
    c_vec_range = f"E{vec_start_row}:E{vec_start_row + total_dofs - 1}"

    for r_idx in range(1, total_dofs + 1):
        row_num = res_start + r_idx - 1
        n_lbl = (r_idx - 1) // 3 + 1
        axis_idx = (r_idx - 1) % 3
        axis_lbl = ['X', 'Y', 'θ'][axis_idx]
        unit_lbl = ['cm', 'cm', 'rad'][axis_idx]
        cond_row = disp_start_row + r_idx - 1

        ws.cell(row_num, 2, f'D{n_lbl}{axis_lbl}')
        ws.cell(row_num, 3, f'U{n_lbl}{axis_lbl}')
        ws.cell(row_num, 3).font = Font(name='Calibri', size=9, bold=True, italic=True, color=PALETTE['TEXT_RED'])
        ws.cell(row_num, 4, f'=IF(G{cond_row}="RESTRINGIDO", 0, INDEX(MMULT({k_inv_range}, {c_vec_range}), {r_idx}, 1))')
        ws.cell(row_num, 5, unit_lbl)

        for c in [2, 3, 4, 5]:
            cell = ws.cell(row_num, c)
            cell.font = Font(name='Calibri', size=9)
            cell.alignment = Alignment(horizontal='center', vertical='center')
            cell.border = thin_border()
            if c == 4:
                cell.fill = PatternFill(start_color='FFFF00', end_color='FFFF00', fill_type='solid')
                cell.font = Font(name='Calibri', size=9, bold=True)

    current_row = res_start + total_dofs + 2

    # 11. REACCIONES EN LOS APOYOS {R}
    reac_banner = current_row
    ws.merge_cells(start_row=reac_banner, start_column=2, end_row=reac_banner, end_column=5)
    ws.cell(reac_banner, 2, "RESUMEN DE REACCIONES EN LOS APOYOS {R}")
    ws.cell(reac_banner, 2).font = Font(name='Calibri', size=11, bold=True, color='FFFFFF')
    ws.cell(reac_banner, 2).fill = PatternFill(start_color=PALETTE['HDR_NAVY'], end_color=PALETTE['HDR_NAVY'], fill_type='solid')
    ws.cell(reac_banner, 2).alignment = Alignment(horizontal='center', vertical='center')

    reac_hdr = reac_banner + 1
    for c, t in [(2, "Símbolo"), (3, "G.D.L."), (4, "Reacción Final {R}"), (5, "Unidad")]:
        ws.cell(reac_hdr, c, t)
        cell = ws.cell(reac_hdr, c)
        cell.font = Font(name='Calibri', size=9, bold=True)
        cell.alignment = Alignment(horizontal='center', vertical='center')
        cell.border = thin_border()
        cell.fill = PatternFill(start_color=PALETTE['TABLE_ORANGE'], end_color=PALETTE['TABLE_ORANGE'], fill_type='solid')

    reac_start = reac_hdr + 1
    d_vec_range = f"D{res_start}:D{res_start + total_dofs - 1}"
    kviga_range = f"B{k_viga_start}:{end_col_let}{k_viga_start + total_dofs - 1}"

    for r_idx in range(1, total_dofs + 1):
        row_num = reac_start + r_idx - 1
        n_lbl = (r_idx - 1) // 3 + 1
        axis_idx = (r_idx - 1) % 3
        axis_lbl = ['X', 'Y', 'θ'][axis_idx]
        unit_lbl = ['kgf', 'kgf', 'kgf·cm'][axis_idx]
        cond_row = disp_start_row + r_idx - 1
        c_row = vec_start_row + r_idx - 1

        ws.cell(row_num, 2, f'R{n_lbl}{axis_lbl}')
        ws.cell(row_num, 3, f'U{n_lbl}{axis_lbl}')
        ws.cell(row_num, 3).font = Font(name='Calibri', size=9, bold=True, italic=True, color=PALETTE['TEXT_RED'])
        ws.cell(row_num, 4, f'=IF(G{cond_row}="RESTRINGIDO", INDEX(MMULT({kviga_range}, {d_vec_range}), {r_idx}, 1) - E{c_row}, 0)')
        ws.cell(row_num, 5, unit_lbl)

        for c in [2, 3, 4, 5]:
            cell = ws.cell(row_num, c)
            cell.font = Font(name='Calibri', size=9)
            cell.alignment = Alignment(horizontal='center', vertical='center')
            cell.border = thin_border()
            if c == 4:
                cell.fill = PatternFill(start_color='C6EFCE', end_color='C6EFCE', fill_type='solid')
                cell.font = Font(name='Calibri', size=9, bold=True)

    wb.save(output_path)
    print(f"[OK] Libro Excel generado con éxito con la paleta de cátedra y FEM en: {output_path}")
    return output_path

if __name__ == '__main__':
    # Test con viga de pizarra (5 tramos, cargas distribuidas q=400 kgf/m = 4 kgf/cm en tramos 1 y 2, cargas puntuales -1000, -2000, -3000)
    bars_pizarra = [
        {'barNum': 1, 'xi': 0, 'yi': 0, 'xf': 200, 'yf': 0, 'q': 4, 'q_unit': 'kgf/cm', 'q_input': 400},
        {'barNum': 2, 'xi': 200, 'yi': 0, 'xf': 500, 'yf': 0, 'q': 4, 'q_unit': 'kgf/cm', 'q_input': 400},
        {'barNum': 3, 'xi': 500, 'yi': 0, 'xf': 600, 'yf': 0, 'q': 0, 'q_unit': 'kgf/cm', 'q_input': 0},
        {'barNum': 4, 'xi': 600, 'yi': 0, 'xf': 800, 'yf': 0, 'q': 0, 'q_unit': 'kgf/cm', 'q_input': 0},
        {'barNum': 5, 'xi': 800, 'yi': 0, 'xf': 1100, 'yf': 0, 'q': 0, 'q_unit': 'kgf/cm', 'q_input': 0},
    ]
    nodes_pizarra = [
        {'nodeNum': 1, 'cond': 'FIJO', 'Px': 0, 'Py': 0, 'Mz': 0},
        {'nodeNum': 2, 'cond': 'LIBRE', 'Px': 0, 'Py': -1000, 'Mz': 0},
        {'nodeNum': 3, 'cond': 'RODILLO', 'Px': 0, 'Py': 0, 'Mz': 0},
        {'nodeNum': 4, 'cond': 'LIBRE', 'Px': 0, 'Py': -2000, 'Mz': 0},
        {'nodeNum': 5, 'cond': 'LIBRE', 'Px': 0, 'Py': -3000, 'Mz': 0},
        {'nodeNum': 6, 'cond': 'RODILLO', 'Px': 0, 'Py': 0, 'Mz': 0},
    ]
    props = {'E': 200000, 'b': 25.4, 'h': 25.4}

    build_mixtas_workbook(bars_pizarra, nodes_pizarra, props, 'test_mixtas_catedra_colors.xlsx')
