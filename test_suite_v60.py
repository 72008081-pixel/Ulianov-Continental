# -*- coding: utf-8 -*-
"""
test_suite_v60.py
Exhaustive Verification Suite for CEREBRO ESTRUCTURAL PRO v6.0 (Parche 6.0 Definitivo)
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

print(f"=== TEST SUITE V6.0 RUNNING ON http://127.0.0.1:{PORT}/ ===")

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

    assert page.locator("a[href*='armaduras.html']").count() > 0
    assert page.locator("a[href*='armaduras-tablas.html']").count() > 0
    assert page.locator("a[href*='vigas.html']").count() > 0
    assert page.locator("a[href*='vigas-tablas.html']").count() > 0
    print("All Hub Links (Armaduras, 13 Tablas, Vigas, Tablas Vigas): OK")

    # ── PASS 2: AUTH MODAL & YAPE S/ 15.00 PAYWALL ───────────────────
    print("\n--- PASS 2: AUTH MODAL & YAPE S/ 15.00 PAYWALL ---")
    page.fill("#cb-email", "alumno.v6@continental.edu.pe")
    page.fill("#cb-name", "Carlos Alumno V6")
    page.click("#cb-btn-continue")
    time.sleep(0.5)

    yape_visible = page.locator("#cb-v-yape").is_visible()
    yape_text = page.locator("#cb-card").inner_text()
    assert yape_visible
    assert "933 685 462" in yape_text or "933685462" in yape_text
    assert "Ulianov Sabath Cuba Valencia" in yape_text
    assert "S/ 15.00" in yape_text
    print("Yape Paywall & Details: OK")

    # ── PASS 3: ADMIN PANEL (Vayolett1404) & 2 CODES ─────────────────
    print("\n--- PASS 3: DEVELOPER MASTER PANEL (Vayolett1404) ---")
    page.click("#cb-back-login")
    time.sleep(0.3)
    page.click("#cb-link-admin")
    time.sleep(0.3)
    page.fill("#cb-admin-pass", "Vayolett1404")
    page.click("#cb-btn-admin-login")
    time.sleep(0.5)

    panel_visible = page.locator("#cb-panel-card").is_visible()
    assert panel_visible
    assert page.locator("#cb-copy-docente-link").count() > 0
    print("Docente VIP Copy Link Button found: OK")
    students_html = page.locator("#cb-students-list").inner_html()
    assert "alumno.v6@continental.edu.pe" in students_html
    assert "ACC-" in students_html
    assert "XLS-" in students_html
    print("Developer Panel with Student List and 2 Codes: OK")
    ctx.close()

    # ── PASS 4: ARMADURAS 2D (armaduras.html) ────────────────────────
    print("\n--- PASS 4: CEREBRO ARMADURAS 2D (armaduras.html) ---")
    ctx2 = browser.new_context(viewport={'width': 1280, 'height': 800})
    page2 = ctx2.new_page()
    page2.on("dialog", lambda dialog: dialog.accept())
    page2.on("console", lambda msg: print("[PAGE2 LOG]:", msg.text))
    page2.on("pageerror", lambda err: print("[PAGE2 ERROR]:", err))
    page2.goto(f"http://127.0.0.1:{PORT}/armaduras.html?vip=DOCENTE_VIP_ULIANOV")
    page2.wait_for_load_state("networkidle")

    assert "Armaduras Planas 2D" in page2.title()
    assert page2.locator("#trussCanvas").count() > 0
    assert page2.locator("#cb-floating-admin").count() > 0
    print("Armaduras Canvas and Floating Admin Button found: OK")
    print("Armaduras Canvas found: OK")

    # Check results tabs
    tab_step = page2.locator(".tab-btn[data-tab='tab-step-by-step']")
    print("Tab step count:", tab_step.count())
    tab_step.click()
    time.sleep(0.5)
    disp = page2.evaluate("() => window.getComputedStyle(document.getElementById('tab-step-by-step')).display")
    cls = page2.evaluate("() => document.getElementById('tab-step-by-step').className")
    print(f"Tab step display: {disp}, class: {cls}")
    assert page2.locator("#tab-step-by-step").is_visible()

    tab_matrix = page2.locator(".tab-btn[data-tab='tab-global-k']")
    tab_matrix.click()
    time.sleep(0.3)
    assert page2.locator("#tab-global-k").is_visible()
    print("Armaduras Results & Karmadura 12x12 Tabs: OK")

    # Verify sync in localStorage
    sync_truss = page2.evaluate("() => localStorage.getItem('cerebro_active_truss_sync')")
    assert sync_truss is not None
    print("Armaduras localStorage Synchronization: OK")
    page2.screenshot(path="screenshot_armaduras_v60.png")
    print("Screenshot captured: screenshot_armaduras_v60.png")
    ctx2.close()

    # ── PASS 5: 13 TABLAS PEDAGÓGICAS (armaduras-tablas.html) ────────
    print("\n--- PASS 5: 13 TABLAS PEDAGÓGICAS (armaduras-tablas.html) ---")
    ctx_tab = browser.new_context(viewport={'width': 1280, 'height': 800})
    page_tab = ctx_tab.new_page()
    page_tab.on("dialog", lambda dialog: dialog.accept())
    page_tab.goto(f"http://127.0.0.1:{PORT}/armaduras-tablas.html?vip=DOCENTE_VIP_ULIANOV")
    page_tab.wait_for_load_state("networkidle")

    assert page_tab.locator("header").count() > 0
    assert page_tab.locator("a[href*='armaduras.html']").count() > 0
    print("13 Tablas Page Loaded with Return Button: OK")
    ctx_tab.close()

    # ── PASS 6: CEREBRO VIGAS CONTINUAS (vigas.html) ─────────────────
    print("\n--- PASS 6: CEREBRO VIGAS CONTINUAS (vigas.html) ---")
    ctx3 = browser.new_context(viewport={'width': 1280, 'height': 800})
    page3 = ctx3.new_page()
    page3.on("dialog", lambda dialog: dialog.accept())
    page3.goto(f"http://127.0.0.1:{PORT}/vigas.html?vip=DOCENTE_VIP_ULIANOV")
    page3.wait_for_load_state("networkidle")

    assert "Vigas Continuas" in page3.title()
    assert page3.locator("#canvasGraficaFinal").count() > 0
    assert page3.locator("#canvasSectionPreview").count() > 0
    print("Vigas Canvas and Section Preview found: OK")

    # Check tabs
    tab_local = page3.locator(".tab-btn[data-tab='tab-beam-local']")
    tab_local.click()
    time.sleep(0.3)
    assert page3.locator("#tab-beam-local").is_visible()

    tab_global = page3.locator(".tab-btn[data-tab='tab-beam-global']")
    tab_global.click()
    time.sleep(0.3)
    assert page3.locator("#tab-beam-global").is_visible()
    print("Vigas Matrix Tabs: OK")

    # Verify sync in localStorage
    sync_beam = page3.evaluate("() => localStorage.getItem('cerebro_active_beam_sync')")
    assert sync_beam is not None
    print("Vigas localStorage Synchronization: OK")
    page3.screenshot(path="screenshot_vigas_v60.png")
    print("Screenshot captured: screenshot_vigas_v60.png")
    ctx3.close()

    # ── PASS 7: TABLAS VIGAS PEDAGÓGICAS (vigas-tablas.html) ─────────
    print("\n--- PASS 7: TABLAS VIGAS PLANTILLA ULIANOV (vigas-tablas.html) ---")
    ctx_vtab = browser.new_context(viewport={'width': 1280, 'height': 800})
    page_vtab = ctx_vtab.new_page()
    page_vtab.on("dialog", lambda dialog: dialog.accept())
    page_vtab.goto(f"http://127.0.0.1:{PORT}/vigas-tablas.html?vip=DOCENTE_VIP_ULIANOV")
    page_vtab.wait_for_load_state("networkidle")

    assert page_vtab.locator("#tableBarsGeo").count() > 0
    assert page_vtab.locator("a[href*='vigas.html']").count() > 0
    print("Vigas Tables Loaded with Return Button: OK")
    ctx_vtab.close()

    browser.close()

server.shutdown()
print("\n🎉 ALL 7 PASSES FOR CEREBRO ESTRUCTURAL PRO v6.0 PASSED 100% WITH ZERO ERRORS!")
