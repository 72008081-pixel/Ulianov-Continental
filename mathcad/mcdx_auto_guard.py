"""
=============================================================================
MATHCAD AUTO-GUARD WATCHER (GUARDIÁN PERMANENTE DE DESCARGAS)
=============================================================================
Monitorea continuamente las carpetas de descargas del usuario
(D:\\Visitante\\Documents y C:\\Users\\CYBORG\\Downloads).
En el instante en que el navegador web o cualquier otra aplicación descarga
un archivo .mcdx, el guardián lo valida y sanea inmediatamente, garantizando
que NUNCA falle al ser abierto en PTC Mathcad Prime 11.
=============================================================================
"""

import os
import sys
import time
import glob
from mcdx_shield import sanitize_mcdx_file

WATCH_DIRS = [
    r"D:\Visitante\Documents",
    r"C:\Users\CYBORG\Downloads",
]

PROCESSED_FILES = {}

def scan_and_sanitize():
    for d in WATCH_DIRS:
        if not os.path.exists(d):
            continue
        files = glob.glob(os.path.join(d, "*.mcdx"))
        for f in files:
            try:
                mtime = os.path.getmtime(f)
                size = os.path.getsize(f)
                key = (f, mtime, size)
                if key not in PROCESSED_FILES:
                    # Esperar 200ms para asegurar que el navegador terminó de escribir el archivo
                    time.sleep(0.2)
                    repaired = sanitize_mcdx_file(f)
                    new_mtime = os.path.getmtime(f)
                    new_size = os.path.getsize(f)
                    PROCESSED_FILES[(f, new_mtime, new_size)] = True
                    PROCESSED_FILES[key] = True
                    print(f"[GUARD] Verificado y protegido: {os.path.basename(f)}", flush=True)
            except Exception as e:
                # Archivo en uso o bloqueado momentáneamente
                pass

def main():
    print("[GUARD] Guardián de descargas Mathcad Prime 11 iniciado.", flush=True)
    print(f"[GUARD] Monitoreando: {WATCH_DIRS}", flush=True)
    
    # Pase inicial completo sobre todos los archivos existentes
    scan_and_sanitize()
    
    # Loop continuo ligero (1 segundo)
    while True:
        try:
            scan_and_sanitize()
            time.sleep(1.0)
        except KeyboardInterrupt:
            print("\n[GUARD] Detenido por el usuario.", flush=True)
            break
        except Exception as e:
            time.sleep(2.0)

if __name__ == '__main__':
    main()
