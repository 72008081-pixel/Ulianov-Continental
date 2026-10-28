"""
=============================================================================
MCDX TOOLKIT - PTC MATHCAD PRIME 11 AUTOMATION & TEMPLATE BUILDER
=============================================================================
Herramienta de automatización local para generar, editar, recalcular y 
exportar plantillas de cálculo estructural en formato nativo .mcdx de 
PTC Mathcad Prime 11.0.0.
"""

import os
import sys
import argparse
import subprocess

WORK_DIR = os.path.dirname(os.path.abspath(__file__))
MCDX_PATH = os.path.join(WORK_DIR, "PLANTILLA_MAESTRA_10_TRAMOS_VIGAS.mcdx")
PDF_PATH = os.path.join(WORK_DIR, "PLANTILLA_MAESTRA_10_TRAMOS_VIGAS.pdf")
MATHCAD_EXE = r"C:\Program Files\PTC\Mathcad Prime 11.0.0.0\MathcadPrime.exe"

def build():
    """Ejecuta el generador de la plantilla de 10 tramos."""
    print("[1/3] Generando plantilla nativa .mcdx...")
    import build_template
    build_template.build_template()
    print("[OK] Plantilla generada con exito.")

def sync():
    """Sincroniza y recalcula todas las ecuaciones y graficos usando COM."""
    print("[2/3] Sincronizando con PTC Mathcad Prime 11 (Motor COM)...")
    try:
        import win32com.client
        mc = win32com.client.Dispatch('MathcadPrime.Application')
        mc.Visible = False
        ws = mc.Open(os.path.abspath(MCDX_PATH))
        if ws:
            ws.Synchronize()
            ws.Save()
            ws.Close(0)
        mc.CloseAll(0)
        print("[OK] Todas las regiones, funciones y graficos fueron recalculados y guardados.")
    except Exception as e:
        print(f"[ERROR] No se pudo sincronizar por COM: {e}")

def export_pdf():
    """Exporta el archivo de cálculo a PDF vectorial oficial."""
    print("[3/3] Exportando documento a PDF...")
    try:
        import win32com.client
        mc = win32com.client.Dispatch('MathcadPrime.Application')
        mc.Visible = False
        ws = mc.Open(os.path.abspath(MCDX_PATH))
        if ws:
            ws.SaveAs(os.path.abspath(PDF_PATH))
            ws.Close(0)
        mc.CloseAll(0)
        print(f"[OK] PDF generado exitosamente: {PDF_PATH}")
    except Exception as e:
        print(f"[ERROR] Error al exportar PDF: {e}")

def open_gui():
    """Abre el archivo en la interfaz grafica de Mathcad Prime 11."""
    if os.path.exists(MATHCAD_EXE):
        print(f"Iniciando PTC Mathcad Prime 11 con {MCDX_PATH}...")
        subprocess.Popen([MATHCAD_EXE, MCDX_PATH])
    else:
        print(f"[ERROR] No se encontro el ejecutable en {MATHCAD_EXE}")

def main():
    parser = argparse.ArgumentParser(description="MCDX Toolkit para Mathcad Prime 11")
    parser.add_argument('action', choices=['build', 'sync', 'pdf', 'open', 'all'], help="Accion a ejecutar")
    args = parser.parse_args()

    if args.action == 'build':
        build()
    elif args.action == 'sync':
        sync()
    elif args.action == 'pdf':
        export_pdf()
    elif args.action == 'open':
        open_gui()
    elif args.action == 'all':
        build()
        sync()
        export_pdf()
        print("Proceso completo finalizado exitosamente.")

if __name__ == '__main__':
    if len(sys.argv) == 1:
        print("Uso: python mcdx_toolkit.py [build | sync | pdf | open | all]")
    else:
        main()
