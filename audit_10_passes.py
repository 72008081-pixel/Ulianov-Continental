import win32com.client as win32
import numpy as np
import os, sys, shutil
sys.stdout.reconfigure(encoding='utf-8')

path_local = os.path.abspath(r"c:\Users\CYBORG\.gemini\antigravity\AUTOMATIZACION\PLANTILLA_MAESTRA_VIGAS_12_NODOS_METODO_RIGIDEZ.xlsx")
path_user = r"D:\ANTIGRAVITY PRO\01. Análisis Estructural II\PLANTILLA_MAESTRA_VIGAS_12_NODOS_METODO_RIGIDEZ.xlsx"

def check_sheet_errors(ws):
    used = ws.UsedRange
    r0, c0 = used.Row, used.Column
    vals = used.Value
    errs = []
    if vals:
        for r_i, row in enumerate(vals):
            if row:
                for c_i, v in enumerate(row):
                    if isinstance(v, int) and v < -2146800000:
                        rr, cc = r0 + r_i, c0 + c_i
                        errs.append((rr, cc, ws.Cells(rr, cc).Address, ws.Cells(rr, cc).Text, ws.Cells(rr, cc).Formula))
                    elif isinstance(v, str) and (v.startswith("#¡") or v.startswith("#VALUE") or v.startswith("#DIV") or v.startswith("#REF") or v.startswith("#NAME") or v.startswith("#NUM") or v.startswith("Err:")):
                        rr, cc = r0 + r_i, c0 + c_i
                        errs.append((rr, cc, ws.Cells(rr, cc).Address, v, ws.Cells(rr, cc).Formula))
    return errs

xl = win32.Dispatch("Excel.Application")
xl.Visible = False
xl.DisplayAlerts = False

try:
    wb = xl.Workbooks.Open(path_local)
    xl.CalculateFullRebuild()

    print("=================================================================")
    print("PASS 1: AUDITORÍA GLOBAL DE ERRORES DE FÓRMULA EN LAS 5 PESTAÑAS")
    print("=================================================================")
    total_errs = 0
    for i in range(1, wb.Sheets.Count + 1):
        ws = wb.Sheets(i)
        errs = check_sheet_errors(ws)
        total_errs += len(errs)
        print(f"  Pestaña {i} [{ws.Name}]: {len(errs)} errores")
        for e in errs[:5]:
            print("    ->", e)
    assert total_errs == 0, f"Se encontraron {total_errs} errores!"

    print("\n=================================================================")
    print("PASS 2: VERIFICACIÓN NUMÉRICA DE 'PLANTILLA ULIANOV' Y 'EJEMPLO_PRESENTACION_PDF'")
    print("=================================================================")
    for sh_name in ["PLANTILLA ULIANOV", "EJEMPLO_PRESENTACION_PDF"]:
        ws = wb.Sheets(sh_name)
        print(f"--- Evaluando [{sh_name}] ---")
        print(f"  Barras activas (G6): {ws.Range('G6').Value} | Nudos activos (G7): {ws.Range('G7').Value}")
        print(f"  A_sec (G2): {ws.Range('G2').Value} cm2 | Y_CG (G3): {ws.Range('G3').Value} cm | I_sec (G4): {ws.Range('G4').Value} cm4")
        print("  Desplazamientos Calculados (Filas 445..458):")
        for r in range(445, 459):
            gdl = ws.Range(f"B{r}").Value
            lbl = ws.Range(f"C{r}").Value
            val = ws.Range(f"E{r}").Value
            unit = ws.Range(f"F{r}").Value
            print(f"    Fila {r-444:02d}: {lbl:5s} ({gdl}) = {val:14.9f} {unit}")
        # Comprobar D4Y = -0.155650140 cm (fila 452)
        d4y_lbl = ws.Range("C452").Value
        d4y_val = ws.Range("E452").Value
        assert d4y_lbl == "D4Y" and abs(d4y_val - (-0.155650140)) < 1e-6, f"Error en D4Y: {d4y_lbl}={d4y_val}"

        print("  Reacciones Calculadas en Apoyos (Filas 525..531):")
        expected_reac = [
            ("U1X", 500.0, 500.0),
            ("U1Y", 127.142857, 127.142857),
            ("U3Y", 2156.071429, 2156.071429),
            ("U5X", 1000.0, 1000.0),
            ("U5Y", 1001.928571, 1001.928571),
            ("U7X", 0.0, 0.0),
            ("U7Y", -85.142857, -85.142857),
        ]
        for idx, (exp_gdl, exp_prod, exp_r) in enumerate(expected_reac):
            r = 525 + idx
            gdl = ws.Range(f"B{r}").Value
            prod = ws.Range(f"E{r}").Value
            reac = ws.Range(f"G{r}").Value
            print(f"    Apoyo {idx+1}: GDL={gdl} | [K_RL]*[D]={prod:12.4f} | R_apoyo={reac:12.4f}")
            assert gdl == exp_gdl and abs(prod - exp_prod) < 1e-3 and abs(reac - exp_r) < 1e-3

    print("\n=================================================================")
    print("PASS 3: VERIFICACIÓN DE 'EJEMPLO_CUADERNO_DISTRIBUIDAS' (8 NUDOS, 7 BARRAS)")
    print("=================================================================")
    ws_cuad = wb.Sheets("EJEMPLO_CUADERNO_DISTRIBUIDAS")
    print(f"  Barras activas (G6): {ws_cuad.Range('G6').Value} | Nudos activos (G7): {ws_cuad.Range('G7').Value}")
    sum_fy_reac = 0.0
    for idx in range(10):
        r = 525 + idx
        gdl = ws_cuad.Range(f"B{r}").Value
        prod = ws_cuad.Range(f"E{r}").Value
        reac = ws_cuad.Range(f"G{r}").Value
        if isinstance(prod, float):
            print(f"    Apoyo {idx+1}: GDL={gdl} | [K_RL]*[D]={prod:12.4f} | R_apoyo={reac:12.4f}")
        if gdl and gdl.endswith("Y") and isinstance(reac, float):
            sum_fy_reac += reac
    print(f"  Suma vertical de reacciones R_y = {sum_fy_reac:.4f} kgf (Carga total vertical = 11000.0000 kgf)")
    assert abs(sum_fy_reac - 11000.0) < 1e-3

    print("\n=================================================================")
    print("PASS 4: VERIFICACIÓN DE 'EJEMPLO_INGENIERO_EJEMPLOS' (EJERCICIO 1 DE EJEMPLOS.XLSX)")
    print("=================================================================")
    ws_ej = wb.Sheets("EJEMPLO_INGENIERO_EJEMPLOS")
    for idx in range(6):
        r = 525 + idx
        gdl = ws_ej.Range(f"B{r}").Value
        prod = ws_ej.Range(f"E{r}").Value
        reac = ws_ej.Range(f"G{r}").Value
        print(f"    Apoyo {idx+1}: GDL={gdl} | [K_RL]*[D]={prod:12.4f} | R_apoyo={reac:12.4f}")
    assert abs(ws_ej.Range("E525").Value - 52.5926) < 1e-2
    assert abs(ws_ej.Range("E527").Value - 1915.6741) < 1e-2
    assert abs(ws_ej.Range("G527").Value - 5615.6741) < 1e-2
    assert abs(ws_ej.Range("E529").Value - 5931.7333) < 1e-2
    assert abs(ws_ej.Range("E530").Value - (-490088.8889)) < 1e-1
    sum_fy_ej = ws_ej.Range("G525").Value + ws_ej.Range("G527").Value + ws_ej.Range("G529").Value
    print(f"  Suma vertical de reacciones R_y = {sum_fy_ej:.4f} kgf (Carga vertical total = 11600.0000 kgf)")
    assert abs(sum_fy_ej - 11600.0) < 1e-3

    print("\n=================================================================")
    print("PASS 5: PRUEBA DINÁMICA DEL MENÚ DESPLEGABLE DE SECCIÓN TRANSVERSAL (8 TIPOS)")
    print("=================================================================")
    ws_u = wb.Sheets("PLANTILLA ULIANOV")
    sec_types = ["RECTANGULAR", "CIRCULAR", "TUBULAR_CIRCULAR", "TRAPEZOIDAL", "TRIANGULAR", "CAJON_HUECO", "STEINER_COMPUESTA", "DIRECTO_A_I"]
    ws_u.Range("C6").Value = 15.0
    ws_u.Range("C7").Value = 25.0
    for st in sec_types:
        if st == "TUBULAR_CIRCULAR":
            ws_u.Range("C4").Value = 40.0
            ws_u.Range("C5").Value = 20.0
        else:
            ws_u.Range("C4").Value = 25.0
            ws_u.Range("C5").Value = 45.0
        ws_u.Range("C3").Value = st
        xl.Calculate()
        errs = check_sheet_errors(ws_u)
        A_v = ws_u.Range("G2").Value
        Y_v = ws_u.Range("G3").Value
        I_v = ws_u.Range("G4").Value
        lbl1 = ws_u.Range("B4").Value
        print(f"  Sección [{st:17s}] -> {lbl1[:20]:20s} | A={A_v:10.2f} cm2 | I={I_v:12.2f} cm4 | Ycg={Y_v:6.2f} cm | Errores={len(errs)}")
        assert len(errs) == 0 and A_v > 0 and I_v > 0
    # Restaurar RECTANGULAR b=25, h=45, C6=0, C7=0
    ws_u.Range("C3").Value = "RECTANGULAR"
    ws_u.Range("C4").Value = 25.0
    ws_u.Range("C5").Value = 45.0
    ws_u.Range("C6").Value = 0.0
    ws_u.Range("C7").Value = 0.0
    xl.Calculate()

    print("\n=================================================================")
    print("PASS 6: PRUEBA DINÁMICA DE LA CALCULADORA UNIVERSAL DE STEINER")
    print("=================================================================")
    # Configurar una sección T: Alma 20x40 (y_base=0) + Ala superior 60x10 (y_base=40)
    ws_u.Range("L3").Value = "RECTANGULO"; ws_u.Range("M3").Value = 20.0; ws_u.Range("N3").Value = 0.0; ws_u.Range("O3").Value = 40.0; ws_u.Range("P3").Value = 0.0
    ws_u.Range("L4").Value = "RECTANGULO"; ws_u.Range("M4").Value = 60.0; ws_u.Range("N4").Value = 0.0; ws_u.Range("O4").Value = 10.0; ws_u.Range("P4").Value = 40.0
    ws_u.Range("C3").Value = "STEINER_COMPUESTA"
    xl.Calculate()
    A_t = ws_u.Range("G2").Value
    Y_t = ws_u.Range("G3").Value
    I_t = ws_u.Range("G4").Value
    print(f"  Sección T por Steiner: A={A_t:.2f} cm2 | Y_CG={Y_t:.4f} cm | I_xx={I_t:.3f} cm4")
    assert abs(A_t - 1400.0) < 1e-3 and abs(Y_t - 30.7142857) < 1e-4 and abs(I_t - 325952.381) < 1e-1
    # Restaurar Steiner por defecto (dos mitades de 25x22.5 que forman 25x45) y RECTANGULAR en C3
    ws_u.Range("L3").Value = "RECTANGULO"; ws_u.Range("M3").Value = 25.0; ws_u.Range("O3").Value = 22.5; ws_u.Range("P3").Value = 0.0
    ws_u.Range("L4").Value = "RECTANGULO"; ws_u.Range("M4").Value = 25.0; ws_u.Range("O4").Value = 22.5; ws_u.Range("P4").Value = 22.5
    ws_u.Range("C3").Value = "RECTANGULAR"
    xl.Calculate()

    print("\n=================================================================")
    print("PASS 7: PRUEBA DE DETECCIÓN AUTOMÁTICA DE BARRAS ACTIVAS (3 BARRAS)")
    print("=================================================================")
    saved_bars = ws_u.Range("C17:F19").Value
    ws_u.Range("C17:F19").ClearContents()
    xl.Calculate()
    errs_3b = check_sheet_errors(ws_u)
    print(f"  Con 3 barras activas -> G6={ws_u.Range('G6').Value} barras, G7={ws_u.Range('G7').Value} nudos | Errores={len(errs_3b)}")
    print(f"  Fila Barra 4 en Tabla 1 (G17): '{ws_u.Range('G17').Value}' | En Tabla 2 GDL (C31): '{ws_u.Range('C31').Value}' | Nudo 5 en Evaluación Nodal (D46): '{ws_u.Range('D46').Value}'")
    assert len(errs_3b) == 0 and ws_u.Range("G6").Value == 3 and ws_u.Range("G7").Value == 4
    assert ws_u.Range("G17").Value == "" and ws_u.Range("C31").Value == "" and ws_u.Range("D46").Value == ""
    ws_u.Range("C17:F19").Value = saved_bars
    xl.Calculate()

    print("\n=================================================================")
    print("PASS 8: PRUEBA DEL MENÚ DESPLEGABLE DE APOYOS Y CUADRO DE DESPLAZAMIENTOS")
    print("=================================================================")
    old_c42 = ws_u.Range("C42").Value
    for cond_test in ["FIJO", "RODILLO", "LIBRE", "EMPOTRADO", "RODILLO_V"]:
        ws_u.Range("C42").Value = cond_test
        xl.Calculate()
        dx, dy, dt = ws_u.Range("D42").Value, ws_u.Range("E42").Value, ws_u.Range("F42").Value
        gx, gy, gt = ws_u.Range("G42").Value, ws_u.Range("H42").Value, ws_u.Range("I42").Value
        errs_c = check_sheet_errors(ws_u)
        print(f"  Condición [{cond_test:9s}] -> ¿Hay Dx,Dy,Dθ?=({dx},{dy},{dt}) | Cuadro=({gx},{gy},{gt}) | Errores={len(errs_c)}")
        assert len(errs_c) == 0
    ws_u.Range("C42").Value = old_c42
    xl.Calculate()

    print("\n=================================================================")
    print("PASS 9: PRUEBA DEL DESCOMPONEDOR DE CARGAS PUNTUALES OBLICUAS")
    print("=================================================================")
    # Probar modo ANGULO_GRADOS en fila 30 (tercera fila oblicua) con P=2500, alpha=36.86989765° en nudo 2
    ws_u.Range("L30").Value = 2
    ws_u.Range("M30").Value = 2500.0
    ws_u.Range("N30").Value = "ANGULO_GRADOS"
    ws_u.Range("O30").Value = 36.86989765
    ws_u.Range("T30").Value = "-X (IZQ)"
    ws_u.Range("U30").Value = "-Y (ABAJO)"
    xl.Calculate()
    px_ob = ws_u.Range("V30").Value
    py_ob = ws_u.Range("W30").Value
    px_n2 = ws_u.Range("O43").Value
    print(f"  Oblicua por ángulo en Nudo 2: Px={px_ob:.2f}, Py={py_ob:.2f} -> Nudo 2 Px_total (O43)={px_n2:.2f}")
    assert abs(px_ob - (-2000.0)) < 1e-2 and abs(py_ob - (-1500.0)) < 1e-2 and abs(px_n2 - (-2000.0)) < 1e-2
    ws_u.Range("L30:M30").ClearContents()
    ws_u.Range("O30:P30").ClearContents()
    ws_u.Range("N30").Value = "PENDIENTE_dx_dy"
    xl.Calculate()

    print("\n=================================================================")
    print("PASS 10: GUARDADO FINAL CON CACHÉ DE FÓRMULAS 100% RECALCULADO EN EXCEL")
    print("=================================================================")
    xl.CalculateFullRebuild()
    for i in range(1, wb.Sheets.Count + 1):
        errs_final = check_sheet_errors(wb.Sheets(i))
        assert len(errs_final) == 0, f"Error final en hoja {i}: {errs_final}"
    wb.Save()
    wb.Close()
finally:
    xl.Quit()

shutil.copy2(path_local, path_user)
print("¡10 PASADAS DE AUDITORÍA COMPLETADAS CON 0 ERRORES Y ARCHIVOS SINCRONIZADOS!")
