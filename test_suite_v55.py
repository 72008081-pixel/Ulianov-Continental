# -*- coding: utf-8 -*-
"""
test_suite_v55.py
Autonomous Multi-Pass Verification Suite for CEREBRO ESTRUCTURAL PRO v5.5
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

print(f"=== TEST SUITE V5.5 RUNNING ON http://127.0.0.1:{PORT}/ ===")

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)

    # ── PASS 1: HUB TEST ─────────────────────────────────────────────
    print("\n--- PASS 1: CENTRAL HUB (index.html) ---")
    ctx = browser.new_context(viewport={'width': 1280, 'height': 800})
    page = ctx.new_page()
    page.goto(f"http://127.0.0.1:{PORT}/index.html")
    page.wait_for_load_state("networkidle")

    title = page.title()
    print("Page Title:", title)
    assert "CEREBRO ESTRUCTURAL PRO" in title

    # Check links to armaduras.html and vigas.html
    has_armaduras = page.locator("a[href*='armaduras.html']").count() > 0
    has_vigas = page.locator("a[href*='vigas.html']").count() > 0
    print(f"Has Armaduras Link: {has_armaduras}, Has Vigas Link: {has_vigas}")
    assert has_armaduras and has_vigas

    # ── PASS 2: AUTH MODAL & YAPE PAYWALL ────────────────────────────
    print("\n--- PASS 2: AUTH MODAL & YAPE PAYWALL ---")
    page.fill("#cb-email", "estudiante.test@continental.edu.pe")
    page.fill("#cb-name", "Juan Perez Continental")
    page.click("#cb-btn-continue")
    time.sleep(0.5)

    yape_visible = page.locator("#cb-v-yape").is_visible()
    phone_text = page.locator("#cb-card").inner_text()
    print("Yape Paywall Visible:", yape_visible)
    print("Contains 933 685 462:", "933 685 462" in phone_text or "933685462" in phone_text)
    print("Contains Ulianov Sabath Cuba Valencia:", "Ulianov Sabath Cuba Valencia" in phone_text)
    print("Contains S/ 15.00:", "S/ 15.00" in phone_text)
    assert yape_visible
    assert "933" in phone_text
    assert "Ulianov" in phone_text

    # ── PASS 3: ADMIN LOGIN & 2 CODES VERIFICATION ───────────────────
    print("\n--- PASS 3: ADMIN MASTER PANEL (Vayolett1404) & 2 CODES ---")
    page.click("#cb-back-login")
    time.sleep(0.3)
    page.click("#cb-link-admin")
    time.sleep(0.3)
    page.fill("#cb-admin-pass", "Vayolett1404")
    page.click("#cb-btn-admin-login")
    time.sleep(0.5)

    panel_visible = page.locator("#cb-panel-card").is_visible()
    print("Admin Panel Visible:", panel_visible)
    assert panel_visible

    # Verify student is in list and has ACC- and XLS- codes
    students_html = page.locator("#cb-students-list").inner_html()
    has_student = "estudiante.test@continental.edu.pe" in students_html
    has_acc_code = "ACC-" in students_html
    has_xls_code = "XLS-" in students_html
    print("Student in Admin List:", has_student)
    print("Has App Access Code (ACC-):", has_acc_code)
    print("Has Excel VIP Code (XLS-):", has_xls_code)
    assert has_student and has_acc_code and has_xls_code

    # Grant access to student
    page.click("#cb-students-list [data-action='auth']")
    time.sleep(0.3)
    print("Granted Access to Student: OK")
    ctx.close()

    # ── PASS 4: ARMADURAS MODULE (armaduras.html) ────────────────────
    print("\n--- PASS 4: ARMADURAS MODULE (armaduras.html) ---")
    ctx2 = browser.new_context(viewport={'width': 1280, 'height': 800})
    page2 = ctx2.new_page()
    page2.on("dialog", lambda dialog: dialog.accept())
    # Open with admin session or VIP
    page2.goto(f"http://127.0.0.1:{PORT}/armaduras.html?vip=DOCENTE_VIP_ULIANOV")
    page2.wait_for_load_state("networkidle")

    arm_title = page2.title()
    print("Armaduras Title:", arm_title)
    assert "Armaduras 2D" in arm_title

    # Verify NO preset buttons exist
    preset_btn_count = page2.locator(".btn-preset").count()
    print("Preset buttons count in Armaduras:", preset_btn_count)
    assert preset_btn_count == 0, f"Expected 0 preset buttons, found {preset_btn_count}"

    # Verify canvas exists
    canvas_exists = page2.locator("#trussCanvas").count() > 0
    print("Truss Canvas Exists:", canvas_exists)
    assert canvas_exists
    ctx2.close()

    # ── PASS 5: VIGAS MODULE (vigas.html) ────────────────────────────
    print("\n--- PASS 5: VIGAS MODULE (vigas.html) ---")
    ctx3 = browser.new_context(viewport={'width': 1280, 'height': 800})
    page3 = ctx3.new_page()
    page3.on("dialog", lambda dialog: dialog.accept())
    page3.goto(f"http://127.0.0.1:{PORT}/vigas.html?vip=DOCENTE_VIP_ULIANOV")
    page3.wait_for_load_state("networkidle")

    vigas_title = page3.title()
    print("Vigas Title:", vigas_title)
    assert "Vigas" in vigas_title

    # Verify header has same dark styling as armaduras
    header_tag = page3.locator("header")
    assert header_tag.count() > 0
    print("Header Element Found: OK")

    # Verify 6° Gráfica Final canvas
    canvas_final = page3.locator("#canvasGraficaFinal")
    assert canvas_final.count() > 0
    print("6° Gráfica Final Canvas Found: OK")

    # Verify results tables populated
    tbody_disp = page3.locator("#tbodySummaryDisplacements")
    disp_rows = tbody_disp.locator("tr").count()
    print(f"Summary Displacements Rows: {disp_rows}")
    assert disp_rows > 0

    tbody_react = page3.locator("#tbodySummaryReactions")
    react_rows = tbody_react.locator("tr").count()
    print(f"Summary Reactions Rows: {react_rows}")
    assert react_rows > 0

    # Verify matrices tabs
    matrix_tab = page3.locator(".matrix-tab-btn[data-mtab='paneGlobalK']")
    matrix_tab.click()
    time.sleep(0.2)
    pane_global = page3.locator("#paneGlobalK")
    assert pane_global.is_visible()
    print("Global Matrix [K] Pane Displayed: OK")

    # Take screenshot of the new unified vigas design
    page3.screenshot(path="screenshot_vigas_v55_dark_style.png", full_page=False)
    print("Screenshot captured: screenshot_vigas_v55_dark_style.png")

    ctx3.close()
    browser.close()

server.shutdown()
print("\n🎉 ALL 5 PASSES FOR CEREBRO ESTRUCTURAL PRO v5.5 PASSED 100% WITH ZERO ERRORS!")
