# -*- coding: utf-8 -*-
"""
server.py
Servidor local ultraligero y ejecutor de la aplicación web CEREBRO ESTRUCTURAL.
Ejecuta un servidor HTTP local y abre automáticamente el navegador en http://localhost:8000/
"""

import os
import sys
import webbrowser
import http.server
import socketserver

PORT = 8000
DIRECTORY = os.path.dirname(os.path.abspath(__file__))

class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

    def end_headers(self):
        # Desactivar cache para desarrollo en caliente
        self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        super().end_headers()

def main():
    os.chdir(DIRECTORY)
    port = PORT
    while port < 8050:
        try:
            with socketserver.TCPServer(("", port), Handler) as httpd:
                url = f"http://localhost:{port}/index.html"
                print("==================================================================")
                print("  ⚡ CEREBRO ESTRUCTURAL v2.0 - Servidor Local Iniciado")
                print("  Cátedra: Ing. Ulianov Cuba Valencia - Análisis Estructural II")
                print(f"  Accede en tu navegador a: {url}")
                print("  Presiona Ctrl+C en esta consola para detener el servidor.")
                print("==================================================================")
                
                try:
                    webbrowser.open(url)
                except Exception:
                    pass

                httpd.serve_forever()
                break
        except OSError:
            port += 1

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\nServidor detenido correctamente.")
        sys.exit(0)
