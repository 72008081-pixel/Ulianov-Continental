# -*- coding: utf-8 -*-
"""
test_suite_v61.py
Exhaustive Verification Suite for CEREBRO ESTRUCTURAL PRO v6.1 (Parche 6.1 Definitivo)
- Strict Admin Panel Privacy (Regular students and Docente never see admin button)
- Dynamic Beam Cross-Section & Steiner Preview (T, I, Box, etc.)
- Saved Projects Database (CerebroDB)
- 13 Tablas return button and footers (Cusco, Perú)
"""
import os
import sys
import time
import socket
import http.server
import threading
from playwright.sync_api import sync_playwright

sys.stdout.reconfigure(encoding='utf-8')
sys.stderr.reconfigure(encoding='utf-8')

def find_free_port():
    s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    s.bind(('', 0))
    port = s.getsockname()[1]
    s.close()
    return port

PORT = find_free_port()
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=BASE_DIR, **kwargs)
    def log_message(self, format, *args):
        pass

server = http.server.ThreadingHTTPServer(('127.0.0.1', PORT), QuietHandler)
server_thread = threading.Thread(target=server.serve_forever, daemon=True)
server_thread.start()
time.sleep(0.5)

print(f"=== TEST SUITE V6.1 RUNNING ON http://127.0.0.1:{PORT}/ ===")

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)

    # ── PASS 1: HUB CENTRAL (index.html) ─────────────────────────────
    print("\n--- PASS 1: CENTRAL HUB (index.html) ---")
    ctx = browser.new_context(viewport={'width': 1280, 'height': 800})
    page = ctx.new_page()
    page.goto(f"http://127.0.0.1:{PORT}/index.html")
    page.wait_for_load_state("networkidle")

    title = page.title()
    print("Page Title:", title)
    assert "CEREBRO ESTRUCTURAL PRO" in title

    footer_text = page.locator("footer").inner_text()
    assert "Cusco, Perú" in footer_text
    print("Hub Footer 'Cusco, Perú': OK")

    assert page.locator("a[href*='armaduras.html']").count() > 0
    assert page.locator("a[href*='armaduras-tablas.html']").count() > 0
    assert page.locator("a[href*='vigas.html']").count() > 0
    assert page.locator("a[href*='vigas-tablas.html']").count() > 0
    print("All Hub Links: OK")

    # ── PASS 2: AUTH MODAL, PAYWALL & STRICT ADMIN PRIVACY ───────────
    print("\n--- PASS 2: AUTH MODAL & STRICT PRIVACY CHECK ---")
    page.fill("#cb-email", "alumno.v61@continental.edu.pe")
    page.fill("#cb-name", "Estudiante V61")
    page.click("#cb-btn-continue")
    time.sleep(0.5)

    yape_visible = page.locator("#cb-v-yape").is_visible()
    assert yape_visible
    print("Yape S/ 15.00 Paywall Displayed: OK")

    # Verify that regular student does NOT see floating admin button
    disp_floating = page.evaluate("() => { const el = document.getElementById('cb-floating-admin'); return el ? window.getComputedStyle(el).display : 'none'; }")
    print(f"Regular student floating admin button display: {disp_floating}")
    assert disp_floating == "none", "Floating admin button MUST be hidden for non-admin students!"
    print("Strict Privacy (Hidden for Students): OK")

    # ── PASS 3: DEVELOPER MASTER LOGIN & WHATSAPP ACTIVATOR ─────────
    print("\n--- PASS 3: DEVELOPER MASTER PANEL & WHATSAPP ACTIVATOR ---")
    page.click("#cb-back-login")
    time.sleep(0.3)
    page.click("#cb-link-admin")
    time.sleep(0.3)
    page.fill("#cb-admin-pass", "Vayolett1404")
    page.click("#cb-btn-admin-login")
    time.sleep(0.5)

    panel_visible = page.locator("#cb-panel-card").is_visible()
    assert panel_visible
    print("Developer Panel opened with master password: OK")

    # Floating button should now be visible for admin
    disp_floating_admin = page.evaluate("() => { const el = document.getElementById('cb-floating-admin'); return el ? window.getComputedStyle(el).display : 'none'; }")
    print(f"Admin floating button display: {disp_floating_admin}")
    assert disp_floating_admin == "flex"

    # Test WhatsApp input parser
    wa_msg = "Hola Ing. Ulianov, yapé S/ 15.00 al 933685462 para activar mi acceso: nuevo.whatsapp@continental.edu.pe — Maria Lopez."
    page.fill("#cb-wa-paste-input", wa_msg)
    page.click("#cb-wa-process-full")
    time.sleep(0.5)

    students_html = page.locator("#cb-students-list").inner_html()
    assert "nuevo.whatsapp@continental.edu.pe" in students_html
    assert "Maria Lopez" in students_html
    assert "+EXCEL" in students_html
    print("WhatsApp Fast Approver & Auto-Parser: OK")
    ctx.close()

    # ── PASS 4: DOCENTE PRIVACY CHECK ────────────────────────────────
    print("\n--- PASS 4: DOCENTE VIP ACCESS & STRICT PRIVACY ---")
    ctx_doc = browser.new_context(viewport={'width': 1280, 'height': 800})
    page_doc = ctx_doc.new_page()
    page_doc.on("dialog", lambda dialog: dialog.accept())
    page_doc.goto(f"http://127.0.0.1:{PORT}/armaduras.html?vip=DOCENTE_VIP_ULIANOV")
    page_doc.wait_for_load_state("networkidle")

    # Docente must NOT see floating admin button nor header admin button
    doc_fb_disp = page_doc.evaluate("() => { const el = document.getElementById('cb-floating-admin'); return el ? window.getComputedStyle(el).display : 'none'; }")
    doc_hdr_disp = page_doc.evaluate("() => { const el = document.getElementById('cb-header-btn'); return el ? window.getComputedStyle(el).display : 'none'; }")
    print(f"Docente floating button: {doc_fb_disp}, header button: {doc_hdr_disp}")
    assert doc_fb_disp == "none", "Docente must NOT see floating admin button!"
    assert doc_hdr_disp == "none", "Docente must NOT see header admin button!"
    print("Docente Strict Privacy: OK")

    # Check project save/open buttons
    assert page_doc.locator("#btnSaveTrussProject").count() > 0
    assert page_doc.locator("#btnOpenTrussProjects").count() > 0
    print("Mis Proyectos Buttons in Armaduras: OK")

    footer_arm = page_doc.locator("footer").inner_text()
    assert "Cusco, Perú" in footer_arm
    print("Armaduras Footer 'Cusco, Perú': OK")
    ctx_doc.close()

    # ── PASS 5: 13 TABLAS RETURN BUTTON ──────────────────────────────
    print("\n--- PASS 5: 13 TABLAS PEDAGÓGICAS (armaduras-tablas.html) ---")
    ctx_tab = browser.new_context(viewport={'width': 1280, 'height': 800})
    page_tab = ctx_tab.new_page()
    page_tab.on("dialog", lambda dialog: dialog.accept())
    page_tab.goto(f"http://127.0.0.1:{PORT}/armaduras-tablas.html?vip=DOCENTE_VIP_ULIANOV")
    page_tab.wait_for_load_state("networkidle")

    ret_link = page_tab.locator("a[href*='armaduras.html']").first
    assert ret_link.count() > 0
    print("Return Button pointing to armaduras.html: OK")

    footer_tab = page_tab.locator("footer").inner_text()
    assert "Cusco, Perú" in footer_tab
    print("13 Tablas Footer 'Cusco, Perú': OK")
    ctx_tab.close()

    # ── PASS 6: VIGAS CROSS-SECTION PREVIEW & STEINER CALCULATION ────
    print("\n--- PASS 6: CEREBRO VIGAS DYNAMIC SECTION & STEINER ---")
    ctx_vigas = browser.new_context(viewport={'width': 1280, 'height': 800})
    page_vigas = ctx_vigas.new_page()
    page_vigas.on("dialog", lambda dialog: dialog.accept())
    page_vigas.goto(f"http://127.0.0.1:{PORT}/vigas.html?vip=DOCENTE_VIP_ULIANOV")
    page_vigas.wait_for_load_state("networkidle")

    assert page_vigas.locator("#canvasGraficaFinal").count() > 0
    assert page_vigas.locator("#canvasSectionPreview").count() > 0
    assert page_vigas.locator("#btnSaveBeamProject").count() > 0
    assert page_vigas.locator("#btnOpenBeamProjects").count() > 0
    print("Vigas Canvas, Section Preview and Mis Proyectos Buttons: OK")

    # Test Section Selection: T_SECTION
    page_vigas.select_option("#inpSecType", "T_SECTION")
    time.sleep(0.4)
    out_A_T = page_vigas.locator("#outGlobalA").inner_text()
    out_Iz_T = page_vigas.locator("#outGlobalIz").inner_text()
    print(f"T-Section calculated properties: A={out_A_T}, Iz={out_Iz_T}")
    assert float(out_A_T) > 0
    assert float(out_Iz_T) > 0

    # Test Section Selection: I_SECTION
    page_vigas.select_option("#inpSecType", "I_SECTION")
    time.sleep(0.4)
    out_A_I = page_vigas.locator("#outGlobalA").inner_text()
    out_Iz_I = page_vigas.locator("#outGlobalIz").inner_text()
    print(f"I-Section calculated properties: A={out_A_I}, Iz={out_Iz_I}")
    assert float(out_A_I) > 0
    assert float(out_Iz_I) > 0

    # Test Section Selection: CAJON_HUECO (BOX)
    page_vigas.select_option("#inpSecType", "CAJON_HUECO")
    time.sleep(0.4)
    out_A_Box = page_vigas.locator("#outGlobalA").inner_text()
    print(f"Box-Section calculated properties: A={out_A_Box}")
    assert float(out_A_Box) > 0

    # Check footer in vigas
    footer_vig = page_vigas.locator("footer").inner_text()
    assert "Cusco, Perú" in footer_vig
    print("Vigas Footer 'Cusco, Perú': OK")
    page_vigas.screenshot(path="screenshot_vigas_v61.png")
    print("Screenshot captured: screenshot_vigas_v61.png")
    ctx_vigas.close()

    # ── PASS 7: VIGAS TABLAS PLANTILLA ULIANOV ──────────────────────
    print("\n--- PASS 7: TABLAS VIGAS (vigas-tablas.html) ---")
    ctx_vtab = browser.new_context(viewport={'width': 1280, 'height': 800})
    page_vtab = ctx_vtab.new_page()
    page_vtab.on("dialog", lambda dialog: dialog.accept())
    page_vtab.goto(f"http://127.0.0.1:{PORT}/vigas-tablas.html?vip=DOCENTE_VIP_ULIANOV")
    page_vtab.wait_for_load_state("networkidle")

    assert page_vtab.locator("#tableBarsGeo").count() > 0
    assert page_vtab.locator("a[href*='vigas.html']").count() > 0
    footer_vtab = page_vtab.locator("footer").inner_text()
    assert "Cusco, Perú" in footer_vtab
    print("Vigas Tables Loaded & Footer 'Cusco, Perú': OK")
    ctx_vtab.close()

    browser.close()

server.shutdown()
print("\n🎉 ALL 7 PASSES FOR CEREBRO ESTRUCTURAL PRO v6.1 PASSED 100% WITH ZERO ERRORS!")
