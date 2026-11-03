"""
engine_vigas_mixtas.py
Generador de Plantillas Excel Dinamicas en Formato '3.1 CUBA VALENCIA - MIXTAS'
para Análisis Estructural II (Cátedra Ing. Ulianov Cuba Valencia).

Genera exactamente el número de tramos M y nodos N = M + 1 requeridos por el problema:
- Tabla de Propiedades de Sección y Material
- Tabla de Barras (M filas)
- Tabla de Grados de Libertad (M filas)
- M Bloques de Matrices:
    * Matriz local km (6 x 6)
    * Matriz de colocación global Km,global (3N x 3N)
- Matriz de Rigidez Global del Ensamble [Kviga] (3N x 3N) por suma directa:
    [Kviga](r, c) = SUM_{m=1..M} Km,global(r, c)
- Vector de Cargas {C} (3N x 1)
- Matriz Solver [K_solver] por identidad/penalización (3N x 3N)
- Vector de Desplazamientos {D} (3N x 1)
- Vector de Reacciones {R} (3N x 1)
"""

import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter

# Paleta de colores oficial estilo Ing. Ulianov
PALETTE = {
    'WHITE': 'FFFFFFFF',
    'HEADER_ORANGE': 'FFFCE4D6',   # Durazno encabezados tabla barras
    'HEADER_YELLOW': 'FFFFFF99',   # Amarillo datos calculados
    'LOCAL_K_HDR': 'FFFFF2CC',     # Amarillo claro GDL local
    'GLOBAL_K_HDR': 'FFFCE4D6',    # Durazno claro GDL global
    'MATRIX_DIAG': 'FFFFFF00',     # Amarillo brillante diagonal
    'SUM_ROW': 'FFE2EFDA',         # Verde suave ensamble
    'SOLVER_HDR': 'FFD9E1F2',      # Azul suave solver
    'GRAY_LABEL': 'FFF2F2F2',
    'TEXT_BLACK': '000000',
    'BORDER_DARK': '000000',
    'BORDER_LIGHT': 'D9D9D9'
}

def thin_border():
    s = Side(style='thin', color=PALETTE['BORDER_DARK'])
    return Border(top=s, bottom=s, left=s, right=s)

def medium_border():
    s = Side(style='medium', color=PALETTE['BORDER_DARK'])
    return Border(top=s, bottom=s, left=s, right=s)

def build_mixtas_workbook(bars_data, nodes_data, sec_props, output_path):
    """
    bars_data: list of dicts: [
        {'barNum': 1, 'xi': 0, 'yi': 0, 'xf': 0, 'yf': 300, 'q': 0, 'P': 0}, ...
    ]
    nodes_data: list of dicts: [
        {'nodeNum': 1, 'cond': 'FIJO', 'Px': 0, 'Py': 0, 'Mz': 0}, ...
    ]
    sec_props: dict: {
        'E': 200000, 'b': 25.4, 'h': 25.4
    }
    """
    num_bars = len(bars_data)
    num_nodes = num_bars + 1
    total_dofs = num_nodes * 3

    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "3.1 CUBA VALENCIA - MIXTAS"
    ws.views.sheetView[0].showGridLines = True

    # Configuración de anchos de columna
    ws.column_dimensions['A'].width = 10
    ws.column_dimensions['B'].width = 12
    for c in range(3, 40):
        col_letter = get_column_letter(c)
        ws.column_dimensions[col_letter].width = 12

    # ─────────────────────────────────────────────────────────────────────────
    # 1. BLOQUE DE PROPIEDADES DEL MATERIAL Y SECCIÓN
    # ─────────────────────────────────────────────────────────────────────────
    ws['B1'] = f"PROPIEDADES DEL MATERIAL Y SECCIÓN ({num_bars} TRAMOS)"
    ws['B1'].font = Font(name='Calibri', size=11, bold=True)

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
                cell.font = Font(name='Calibri', size=10, bold=(c in [2, 6]))

    # ─────────────────────────────────────────────────────────────────────────
    # 2. TABLA DE BARRAS (Filas 7 a 8 + num_bars)
    # ─────────────────────────────────────────────────────────────────────────
    # Fila 7: Encabezados principales
    headers_r7 = [
        (2, "Barra"), (3, "INICIO"), (5, "FIN"), (7, "ΔX"), (8, "ΔY"),
        (9, "L (cm)"), (10, "Cosx"), (11, "Cosy"), (12, "E"), (13, "A"),
        (14, "I"), (15, "EA/L"), (16, "12EI/L³"), (17, "6EI/L²"),
        (18, "4EI/L"), (19, "2EI/L")
    ]
    for col, text in headers_r7:
        ws.cell(7, col, text)

    # Fila 8: Sub-encabezados Xi, Yi, Xf, Yf
    sub_r8 = [(3, "Xi"), (4, "Yi"), (5, "Xf"), (6, "Yf")]
    for col, text in sub_r8:
        ws.cell(8, col, text)

    ws.merge_cells("C7:D7")
    ws.merge_cells("E7:F7")

    orange_fill = PatternFill(start_color=PALETTE['HEADER_ORANGE'], end_color=PALETTE['HEADER_ORANGE'], fill_type='solid')
    yellow_fill = PatternFill(start_color=PALETTE['HEADER_YELLOW'], end_color=PALETTE['HEADER_YELLOW'], fill_type='solid')

    for c in range(2, 20):
        for r in [7, 8]:
            cell = ws.cell(r, c)
            cell.font = Font(name='Calibri', size=10, bold=True)
            cell.alignment = Alignment(horizontal='center', vertical='center')
            cell.border = thin_border()
            cell.fill = orange_fill

    # Llenado de filas de barras
    for idx, b in enumerate(bars_data):
        row = 9 + idx
        ws.cell(row, 2, b['barNum'])
        ws.cell(row, 3, b['xi'])
        ws.cell(row, 4, b['yi'])
        ws.cell(row, 5, b['xf'])
        ws.cell(row, 6, b['yf'])

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
                cell.fill = yellow_fill

    # ─────────────────────────────────────────────────────────────────────────
    # 3. TABLA DE GRADOS DE LIBERTAD (DOFs)
    # ─────────────────────────────────────────────────────────────────────────
    dof_hdr_row = 9 + num_bars + 2
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
        # Nodos inicio y fin
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
    # ─────────────────────────────────────────────────────────────────────────
    current_row = dof_start_row + num_bars + 2
    local_k_ranges = []
    global_k_ranges = []

    for m in range(1, num_bars + 1):
        bar_idx = m - 1
        b_row = 9 + bar_idx
        d_row = dof_start_row + bar_idx
        sub_dof_row = dof_sub_row

        # Encabezado GDL local (Col B..G)
        hdr_k_row = current_row
        for i_col, dof_c in enumerate(['C', 'D', 'E', 'F', 'G', 'H']):
            col_target = 2 + i_col
            ws.cell(hdr_k_row, col_target, f'=IF({dof_c}{d_row}="","", CONCATENATE("U",{dof_c}{d_row},{dof_c}${sub_dof_row}))')
            cell = ws.cell(hdr_k_row, col_target)
            cell.font = Font(name='Calibri', size=9, bold=True)
            cell.alignment = Alignment(horizontal='center', vertical='center')
            cell.border = thin_border()
            cell.fill = PatternFill(start_color=PALETTE['LOCAL_K_HDR'], end_color=PALETTE['LOCAL_K_HDR'], fill_type='solid')

        k_local_start = hdr_k_row + 1
        # Fila 1 local
        r1 = k_local_start
        ws.cell(r1, 2, f'=IF(I{b_row}="", 0, O{b_row}*J{b_row}*J{b_row}+P{b_row}*K{b_row}*K{b_row})')
        ws.cell(r1, 3, f'=IF(I{b_row}="", 0, (O{b_row}-P{b_row})*(J{b_row}*K{b_row}))')
        ws.cell(r1, 4, f'=IF(I{b_row}="", 0, -Q{b_row}*K{b_row})')
        ws.cell(r1, 5, f'=-B{r1}')
        ws.cell(r1, 6, f'=-C{r1}')
        ws.cell(r1, 7, f'=D{r1}')
        ws.cell(r1, 8, f'=B{hdr_k_row}')

        # Fila 2 local
        r2 = r1 + 1
        ws.cell(r2, 2, f'=C{r1}')
        ws.cell(r2, 3, f'=IF(I{b_row}="", 0, O{b_row}*K{b_row}*K{b_row}+P{b_row}*J{b_row}*J{b_row})')
        ws.cell(r2, 4, f'=IF(I{b_row}="", 0, Q{b_row}*J{b_row})')
        ws.cell(r2, 5, f'=-B{r2}')
        ws.cell(r2, 6, f'=-C{r2}')
        ws.cell(r2, 7, f'=D{r2}')
        ws.cell(r2, 8, f'=C{hdr_k_row}')

        # Fila 3 local
        r3 = r2 + 1
        ws.cell(r3, 1, f'K{m} =')
        ws.cell(r3, 1).font = Font(name='Calibri', size=11, bold=True)
        ws.cell(r3, 2, f'=D{r1}')
        ws.cell(r3, 3, f'=D{r2}')
        ws.cell(r3, 4, f'=IF(I{b_row}="", 0, R{b_row})')
        ws.cell(r3, 5, f'=-B{r3}')
        ws.cell(r3, 6, f'=-C{r3}')
        ws.cell(r3, 7, f'=IF(I{b_row}="", 0, S{b_row})')
        ws.cell(r3, 8, f'=D{hdr_k_row}')

        # Fila 4 local
        r4 = r3 + 1
        ws.cell(r4, 2, f'=E{r1}')
        ws.cell(r4, 3, f'=E{r2}')
        ws.cell(r4, 4, f'=E{r3}')
        ws.cell(r4, 5, f'=B{r1}')
        ws.cell(r4, 6, f'=C{r1}')
        ws.cell(r4, 7, f'=-D{r1}')
        ws.cell(r4, 8, f'=E{hdr_k_row}')

        # Fila 5 local
        r5 = r4 + 1
        ws.cell(r5, 2, f'=F{r1}')
        ws.cell(r5, 3, f'=F{r2}')
        ws.cell(r5, 4, f'=F{r3}')
        ws.cell(r5, 5, f'=F{r4}')
        ws.cell(r5, 6, f'=C{r2}')
        ws.cell(r5, 7, f'=-D{r2}')
        ws.cell(r5, 8, f'=F{hdr_k_row}')

        # Fila 6 local
        r6 = r5 + 1
        ws.cell(r6, 2, f'=G{r1}')
        ws.cell(r6, 3, f'=G{r2}')
        ws.cell(r6, 4, f'=G{r3}')
        ws.cell(r6, 5, f'=G{r4}')
        ws.cell(r6, 6, f'=G{r5}')
        ws.cell(r6, 7, f'=D{r3}')
        ws.cell(r6, 8, f'=G{hdr_k_row}')

        local_k_ranges.append((r1, r6))

        for r in range(r1, r6 + 1):
            for c in range(2, 9):
                cell = ws.cell(r, c)
                cell.font = Font(name='Calibri', size=9)
                cell.alignment = Alignment(horizontal='right', vertical='center')
                cell.border = thin_border()
                # Diagonal resaltada
                diag_col = 2 + (r - r1)
                if c == diag_col:
                    cell.fill = yellow_fill

        # ── Matriz de Colocación Global Km,global (3N x 3N) ──────────────────
        k_glob_hdr_row = r6 + 2
        # Encabezados de columnas globales: U1X, U1Y, U1θ, ... UNθ
        for n in range(1, num_nodes + 1):
            base_col = 2 + (n - 1) * 3
            ws.cell(k_glob_hdr_row, base_col, f'U{n}X')
            ws.cell(k_glob_hdr_row, base_col + 1, f'U{n}Y')
            ws.cell(k_glob_hdr_row, base_col + 2, f'U{n}θ')
            for bc in range(base_col, base_col + 3):
                cell = ws.cell(k_glob_hdr_row, bc)
                cell.font = Font(name='Calibri', size=9, bold=True)
                cell.alignment = Alignment(horizontal='center', vertical='center')
                cell.border = thin_border()
                cell.fill = PatternFill(start_color=PALETTE['GLOBAL_K_HDR'], end_color=PALETTE['GLOBAL_K_HDR'], fill_type='solid')

        k_glob_start = k_glob_hdr_row + 1
        # Determinar índices de filas y columnas para este tramo m (nodo m y nodo m+1)
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

        # Etiqueta K_m = a la izquierda en la fila media
        mid_r = k_glob_start + total_dofs // 2
        ws.cell(mid_r, 1, f'K{m} =')
        ws.cell(mid_r, 1).font = Font(name='Calibri', size=11, bold=True)

        # Crear filas vacías para la matriz de colocación
        for r_idx in range(1, total_dofs + 1):
            row_num = k_glob_start + r_idx - 1
            # Etiqueta DOF al final de la fila
            n_lbl = (r_idx - 1) // 3 + 1
            axis_lbl = ['X', 'Y', 'θ'][(r_idx - 1) % 3]
            end_col = 2 + total_dofs
            ws.cell(row_num, end_col, f'U{n_lbl}{axis_lbl}')
            ws.cell(row_num, end_col).font = Font(name='Calibri', size=9, bold=True)

            for c_idx in range(1, total_dofs + 1):
                col_num = 1 + c_idx
                cell = ws.cell(row_num, col_num)
                cell.font = Font(name='Calibri', size=9)
                cell.border = thin_border()

                # Si (r_idx, c_idx) coincide con los DOFs locales de la barra m
                if r_idx in dof_indices and c_idx in dof_indices:
                    loc_r_idx = dof_indices.index(r_idx)
                    loc_c_idx = dof_indices.index(c_idx)
                    loc_row_cell = r1 + loc_r_idx
                    loc_col_letter = get_column_letter(2 + loc_c_idx)
                    cell.value = f'={loc_col_letter}{loc_row_cell}'
                    cell.alignment = Alignment(horizontal='right', vertical='center')
                    if r_idx == c_idx:
                        cell.fill = yellow_fill

        global_k_ranges.append((k_glob_start, k_glob_start + total_dofs - 1))
        current_row = k_glob_start + total_dofs + 2

    # ─────────────────────────────────────────────────────────────────────────
    # 5. MATRIZ DE RIGIDEZ GLOBAL DE LA VIGA [Kviga]
    #    (Suma directa celda a celda de las M matrices de colocación Km,global)
    # ─────────────────────────────────────────────────────────────────────────
    k_viga_banner = current_row
    ws.cell(k_viga_banner, 2, f"MATRIZ DE RIGIDEZ GLOBAL DE LA VIGA [Kviga] (ENSAMBLE COMPLETO {num_bars} TRAMOS / {num_nodes} NODOS / {total_dofs} GDL)")
    ws.cell(k_viga_banner, 2).font = Font(name='Calibri', size=11, bold=True)

    k_viga_hdr = k_viga_banner + 1
    for n in range(1, num_nodes + 1):
        base_col = 2 + (n - 1) * 3
        ws.cell(k_viga_hdr, base_col, f'U{n}X')
        ws.cell(k_viga_hdr, base_col + 1, f'U{n}Y')
        ws.cell(k_viga_hdr, base_col + 2, f'U{n}θ')
        for bc in range(base_col, base_col + 3):
            cell = ws.cell(k_viga_hdr, bc)
            cell.font = Font(name='Calibri', size=9, bold=True)
            cell.alignment = Alignment(horizontal='center', vertical='center')
            cell.border = thin_border()
            cell.fill = PatternFill(start_color=PALETTE['SUM_ROW'], end_color=PALETTE['SUM_ROW'], fill_type='solid')

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
        ws.cell(row_num, end_col).font = Font(name='Calibri', size=9, bold=True)

        for c_idx in range(1, total_dofs + 1):
            col_num = 1 + c_idx
            col_let = get_column_letter(col_num)

            # Suma de cada una de las M matrices de colocación
            # ej. =B43+B86+B129...
            sum_terms = []
            for g_start, g_end in global_k_ranges:
                src_row = g_start + r_idx - 1
                sum_terms.append(f'{col_let}{src_row}')

            cell = ws.cell(row_num, col_num)
            cell.value = '=' + '+'.join(sum_terms)
            cell.font = Font(name='Calibri', size=9)
            cell.alignment = Alignment(horizontal='right', vertical='center')
            cell.border = thin_border()
            if r_idx == c_idx:
                cell.fill = yellow_fill

    current_row = k_viga_start + total_dofs + 2

    # ─────────────────────────────────────────────────────────────────────────
    # 6. VECTORES DE CARGAS {C} Y CONDICIONES DE FRONTERA / DESPLAZAMIENTOS {D}
    # ─────────────────────────────────────────────────────────────────────────
    vec_banner = current_row
    ws.cell(vec_banner, 2, "VECTORES DE CARGAS GLOBALES {C} Y CONDICIONES DE FRONTERA / DESPLAZAMIENTOS {D}")
    ws.cell(vec_banner, 2).font = Font(name='Calibri', size=11, bold=True)

    hdr_vec_r = vec_banner + 1
    ws.cell(hdr_vec_r, 2, "Símbolo")
    ws.cell(hdr_vec_r, 3, "G.D.L.")
    ws.cell(hdr_vec_r, 4, "Nodo")
    ws.cell(hdr_vec_r, 5, "Carga {C}")
    ws.cell(hdr_vec_r, 6, "Unidad")
    ws.cell(hdr_vec_r, 8, "Condición")
    ws.cell(hdr_vec_r, 9, "Desplazamiento {D}")

    for c in [2, 3, 4, 5, 6, 8, 9]:
        cell = ws.cell(hdr_vec_r, c)
        cell.font = Font(name='Calibri', size=9, bold=True)
        cell.alignment = Alignment(horizontal='center', vertical='center')
        cell.border = thin_border()
        cell.fill = PatternFill(start_color=PALETTE['HEADER_ORANGE'], end_color=PALETTE['HEADER_ORANGE'], fill_type='solid')

    vec_start_row = hdr_vec_r + 1
    for r_idx in range(1, total_dofs + 1):
        row_num = vec_start_row + r_idx - 1
        n_lbl = (r_idx - 1) // 3 + 1
        axis_idx = (r_idx - 1) % 3
        axis_lbl = ['X', 'Y', 'θ'][axis_idx]
        unit_lbl = ['kgf', 'kgf', 'kgf·cm'][axis_idx]

        node_info = nodes_data[n_lbl - 1] if n_lbl - 1 < len(nodes_data) else {}
        cond = node_info.get('cond', 'LIBRE')

        # Cargas directas en el nodo
        val_load = 0.0
        if axis_idx == 0: val_load = float(node_info.get('Px', 0.0))
        elif axis_idx == 1: val_load = float(node_info.get('Py', 0.0))
        elif axis_idx == 2: val_load = float(node_info.get('Mz', 0.0))

        # Restricción según condición
        is_restricted = False
        if cond == 'EMPOTRADO':
            is_restricted = True
        elif cond == 'FIJO':
            is_restricted = (axis_idx in [0, 1])
        elif cond == 'RODILLO':
            is_restricted = (axis_idx == 1)

        ws.cell(row_num, 2, f'C{n_lbl}{axis_lbl}')
        ws.cell(row_num, 3, f'U{n_lbl}{axis_lbl}')
        ws.cell(row_num, 4, n_lbl)
        ws.cell(row_num, 5, val_load)
        ws.cell(row_num, 6, unit_lbl)
        ws.cell(row_num, 8, "RESTRINGIDO" if is_restricted else "LIBRE")
        ws.cell(row_num, 9, 0.0 if is_restricted else f'=IF(H{row_num}="RESTRINGIDO",0,"CALC")')

        for c in [2, 3, 4, 5, 6, 8, 9]:
            cell = ws.cell(row_num, c)
            cell.font = Font(name='Calibri', size=9)
            cell.alignment = Alignment(horizontal='center', vertical='center')
            cell.border = thin_border()
            if c == 8 and is_restricted:
                cell.fill = PatternFill(start_color='FFFFC7CE', end_color='FFFFC7CE', fill_type='solid')

    current_row = vec_start_row + total_dofs + 2

    # ─────────────────────────────────────────────────────────────────────────
    # 7. ECUACIÓN MATRICIAL COMPLETA: {C} = [Kviga] * {D}
    # ─────────────────────────────────────────────────────────────────────────
    eq_banner = current_row
    ws.cell(eq_banner, 2, "ECUACIÓN MATRICIAL DEL SISTEMA: {C} = [Kviga] * {D}")
    ws.cell(eq_banner, 2).font = Font(name='Calibri', size=11, bold=True)

    eq_start = eq_banner + 2
    for r_idx in range(1, total_dofs + 1):
        row_num = eq_start + r_idx - 1
        c_src_row = vec_start_row + r_idx - 1
        k_src_row = k_viga_start + r_idx - 1

        # Vector {C}
        ws.cell(row_num, 1, f'=E{c_src_row}')
        ws.cell(row_num, 1).font = Font(name='Calibri', size=9, bold=True)
        ws.cell(row_num, 1).alignment = Alignment(horizontal='right', vertical='center')

        ws.cell(row_num, 2, "=")
        ws.cell(row_num, 2).alignment = Alignment(horizontal='center', vertical='center')

        # Matriz [Kviga]
        for c_idx in range(1, total_dofs + 1):
            col_num = 2 + c_idx
            col_let = get_column_letter(col_num)
            cell = ws.cell(row_num, col_num)
            cell.value = f'={col_let}{k_src_row}'
            cell.font = Font(name='Calibri', size=9)
            cell.alignment = Alignment(horizontal='right', vertical='center')
            cell.border = thin_border()
            if r_idx == c_idx:
                cell.fill = yellow_fill

        # Multiplicado por {D}
        mult_col = 3 + total_dofs
        ws.cell(row_num, mult_col, "*")
        ws.cell(row_num, mult_col).alignment = Alignment(horizontal='center', vertical='center')

        d_col = mult_col + 1
        ws.cell(row_num, d_col, f'=I{c_src_row}')
        ws.cell(row_num, d_col).font = Font(name='Calibri', size=9, bold=True)
        ws.cell(row_num, d_col).border = thin_border()

    current_row = eq_start + total_dofs + 2

    # ─────────────────────────────────────────────────────────────────────────
    # 8. BLOQUE TÉCNICO DE RESOLUCIÓN AUTOMÁTICA [K_SOLVER]
    # ─────────────────────────────────────────────────────────────────────────
    solv_banner = current_row
    ws.cell(solv_banner, 2, "BLOQUE TÉCNICO DE RESOLUCIÓN AUTOMÁTICA [K_SOLVER] (INVERSIÓN POR PENALIZACIÓN/IDENTIDAD)")
    ws.cell(solv_banner, 2).font = Font(name='Calibri', size=11, bold=True)

    solv_start = solv_banner + 2
    for r_idx in range(1, total_dofs + 1):
        row_num = solv_start + r_idx - 1
        cond_row_r = vec_start_row + r_idx - 1
        k_src_row = k_viga_start + r_idx - 1

        for c_idx in range(1, total_dofs + 1):
            col_num = 1 + c_idx
            col_let = get_column_letter(col_num)
            cond_row_c = vec_start_row + c_idx - 1

            cell = ws.cell(row_num, col_num)
            cell.font = Font(name='Calibri', size=9)
            cell.alignment = Alignment(horizontal='right', vertical='center')
            cell.border = thin_border()

            if r_idx == c_idx:
                cell.value = f'=IF(H{cond_row_r}="RESTRINGIDO", 1, {col_let}{k_src_row})'
                cell.fill = PatternFill(start_color=PALETTE['SOLVER_HDR'], end_color=PALETTE['SOLVER_HDR'], fill_type='solid')
            else:
                cell.value = f'=IF(OR(H{cond_row_r}="RESTRINGIDO", H{cond_row_c}="RESTRINGIDO"), 0, {col_let}{k_src_row})'

    current_row = solv_start + total_dofs + 2

    # ─────────────────────────────────────────────────────────────────────────
    # 9. RESUMEN DE DESPLAZAMIENTOS CALCULADOS {D} Y REACCIONES {R}
    # ─────────────────────────────────────────────────────────────────────────
    res_banner = current_row
    ws.cell(res_banner, 2, "RESUMEN DE DESPLAZAMIENTOS Y GIROS CALCULADOS {D}")
    ws.cell(res_banner, 2).font = Font(name='Calibri', size=11, bold=True)

    res_hdr = res_banner + 1
    ws.cell(res_hdr, 2, "Símbolo")
    ws.cell(res_hdr, 3, "G.D.L.")
    ws.cell(res_hdr, 4, "Desplazamiento")
    ws.cell(res_hdr, 5, "Unidad")

    for c in [2, 3, 4, 5]:
        cell = ws.cell(res_hdr, c)
        cell.font = Font(name='Calibri', size=9, bold=True)
        cell.alignment = Alignment(horizontal='center', vertical='center')
        cell.border = thin_border()
        cell.fill = PatternFill(start_color=PALETTE['SUM_ROW'], end_color=PALETTE['SUM_ROW'], fill_type='solid')

    res_start = res_hdr + 1
    # Matriz inversa K_inv de K_SOLVER: MINVERSE(B{solv_start}:...{end_col}{solv_end})
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
        cond_row = vec_start_row + r_idx - 1

        ws.cell(row_num, 2, f'D{n_lbl}{axis_lbl}')
        ws.cell(row_num, 3, f'U{n_lbl}{axis_lbl}')
        # INDEX(MMULT(MINVERSE(...), C), r_idx, 1)
        ws.cell(row_num, 4, f'=IF(H{cond_row}="RESTRINGIDO", 0, INDEX(MMULT({k_inv_range}, {c_vec_range}), {r_idx}, 1))')
        ws.cell(row_num, 5, unit_lbl)

        for c in [2, 3, 4, 5]:
            cell = ws.cell(row_num, c)
            cell.font = Font(name='Calibri', size=9)
            cell.alignment = Alignment(horizontal='center', vertical='center')
            cell.border = thin_border()
            if c == 4:
                cell.fill = yellow_fill

    current_row = res_start + total_dofs + 2

    # 10. REACCIONES EN LOS APOYOS {R}
    reac_banner = current_row
    ws.cell(reac_banner, 2, "RESUMEN DE REACCIONES EN LOS APOYOS {R}")
    ws.cell(reac_banner, 2).font = Font(name='Calibri', size=11, bold=True)

    reac_hdr = reac_banner + 1
    ws.cell(reac_hdr, 2, "Símbolo")
    ws.cell(reac_hdr, 3, "G.D.L.")
    ws.cell(reac_hdr, 4, "Reacción {R}")
    ws.cell(reac_hdr, 5, "Unidad")

    for c in [2, 3, 4, 5]:
        cell = ws.cell(reac_hdr, c)
        cell.font = Font(name='Calibri', size=9, bold=True)
        cell.alignment = Alignment(horizontal='center', vertical='center')
        cell.border = thin_border()
        cell.fill = PatternFill(start_color=PALETTE['HEADER_ORANGE'], end_color=PALETTE['HEADER_ORANGE'], fill_type='solid')

    reac_start = reac_hdr + 1
    d_vec_range = f"D{res_start}:D{res_start + total_dofs - 1}"
    kviga_range = f"B{k_viga_start}:{end_col_let}{k_viga_start + total_dofs - 1}"

    for r_idx in range(1, total_dofs + 1):
        row_num = reac_start + r_idx - 1
        n_lbl = (r_idx - 1) // 3 + 1
        axis_idx = (r_idx - 1) % 3
        axis_lbl = ['X', 'Y', 'θ'][axis_idx]
        unit_lbl = ['kgf', 'kgf', 'kgf·cm'][axis_idx]
        cond_row = vec_start_row + r_idx - 1
        c_row = vec_start_row + r_idx - 1

        ws.cell(row_num, 2, f'R{n_lbl}{axis_lbl}')
        ws.cell(row_num, 3, f'U{n_lbl}{axis_lbl}')
        # R = [Kviga]*{D} - {C}
        ws.cell(row_num, 4, f'=IF(H{cond_row}="RESTRINGIDO", INDEX(MMULT({kviga_range}, {d_vec_range}), {r_idx}, 1) - E{c_row}, 0)')
        ws.cell(row_num, 5, unit_lbl)

        for c in [2, 3, 4, 5]:
            cell = ws.cell(row_num, c)
            cell.font = Font(name='Calibri', size=9)
            cell.alignment = Alignment(horizontal='center', vertical='center')
            cell.border = thin_border()
            if c == 4:
                cell.fill = PatternFill(start_color='FFC6EFCE', end_color='FFC6EFCE', fill_type='solid')

    wb.save(output_path)
    print(f"[OK] Libro Excel generado exitosamente con {num_bars} tramos ({total_dofs} GDL) en: {output_path}")
    return output_path

if __name__ == '__main__':
    # Test rápido con 5 tramos (6 nodos = 18 GDL)
    bars_5 = [
        {'barNum': 1, 'xi': 0, 'yi': 0, 'xf': 0, 'yf': 300},
        {'barNum': 2, 'xi': 0, 'yi': 300, 'xf': 0, 'yf': 700},
        {'barNum': 3, 'xi': 0, 'yi': 700, 'xf': 0, 'yf': 1300},
        {'barNum': 4, 'xi': 0, 'yi': 1300, 'xf': 0, 'yf': 1600},
        {'barNum': 5, 'xi': 0, 'yi': 1600, 'xf': 0, 'yf': 2000},
    ]
    nodes_5 = [
        {'nodeNum': 1, 'cond': 'FIJO', 'Px': 0, 'Py': 0, 'Mz': 0},
        {'nodeNum': 2, 'cond': 'LIBRE', 'Px': 0, 'Py': -1000, 'Mz': 0},
        {'nodeNum': 3, 'cond': 'RODILLO', 'Px': 0, 'Py': 0, 'Mz': 0},
        {'nodeNum': 4, 'cond': 'LIBRE', 'Px': 0, 'Py': -1500, 'Mz': 0},
        {'nodeNum': 5, 'cond': 'RODILLO', 'Px': 0, 'Py': 0, 'Mz': 0},
        {'nodeNum': 6, 'cond': 'RODILLO', 'Px': 0, 'Py': 0, 'Mz': 0},
    ]
    props = {'E': 200000, 'b': 25.4, 'h': 25.4}

    build_mixtas_workbook(bars_5, nodes_5, props, 'test_5_tramos_mixtas.xlsx')
