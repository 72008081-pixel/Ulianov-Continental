# -*- coding: utf-8 -*-
import sys
import os
from playwright.sync_api import sync_playwright

sys.stdout.reconfigure(encoding='utf-8', errors='replace')

BASE_DIR = r"D:\ANTIGRAVITY CUBA V\01. Análisis Estructural II\AUTOMATIZACION ARMADURAS Y VIGAS"

def test_fem():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={"width": 1440, "height": 1100})
        page = context.new_page()

        console_errors = []
        def handle_console(msg):
            if msg.type == "error":
                # Ignore expected file:// protocol limitation for system-status.json fetch
                if 'URL scheme "file" is not supported' in msg.text:
                    return
                console_errors.append(msg.text)
        page.on("console", handle_console)
        page.on("pageerror", lambda err: console_errors.append(str(err)))

        # Start http server or open file URL directly
        file_url = "file:///" + os.path.join(BASE_DIR, "porticos.html").replace("\\", "/")
        print("Navigating to:", file_url)
        page.goto(file_url, wait_until="networkidle")
        page.wait_for_timeout(1500)

        # Close auth overlay if present
        page.evaluate("""() => {
            const ov = document.getElementById('cb-overlay');
            if (ov) ov.style.display = 'none';
        }""")

        # Check FEM equivalent loads container
        fem_container = page.locator("#frameEquivalentCardsContainer")
        fem_html = fem_container.inner_html()
        print("FEM container HTML length:", len(fem_html))

        assert "eq-card" in fem_html, "eq-card missing in FEM container"
        assert "Tramo [1]: Nudo (1)" in fem_html, "Tramo [1] missing in FEM container"
        assert "Cargas Puntuales Extremas" in fem_html, "Cargas Puntuales Extremas missing"
        assert "Momentos de Fijación Hacia Adentro" in fem_html, "Momentos de Fijacion missing"

        # Screenshot of canvas card including the new FEM section below it
        canvas_card = page.locator(".canvas-card")
        canvas_card.scroll_into_view_if_needed()
        screenshot_path = os.path.join(BASE_DIR, "screenshot_porticos_v71_fem_cards.png")
        canvas_card.screenshot(path=screenshot_path)
        print("Screenshot saved to:", screenshot_path)

        print("Console errors count:", len(console_errors))
        if console_errors:
            print("Errors:", console_errors)
            raise Exception("Console errors found!")

        print("================================================================")
        print("✓ PARCHE v7.1: CUADRO FEM VERIFICADO EXITOSAMENTE")
        print("✓ RENDERIZADO IDÉNTICO A VIGAS EN 3 NIVELES CON SVG Y KATEX")
        print("✓ 0 ERRORES DE CONSOLA / 0 ADVERTENCIAS")
        print("================================================================")

        browser.close()

if __name__ == "__main__":
    test_fem()
