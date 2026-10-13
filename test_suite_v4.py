# -*- coding: utf-8 -*-
"""
test_suite_v4.py
Autonomous Multi-Pass Verification Suite for CEREBRO ESTRUCTURAL PRO v4.0:
1. Hub Navigation & Cards (index.html)
2. Armaduras 2D Module & Cross-Navigation (armaduras.html)
3. Vigas Module, Canvas & Reactive Calculations (vigas.html)
4. Student Privacy & Real Yape QR Paywall Check (S/ 15.00, 933 685 462, Ulianov Sabath Cuba Valencia)
5. Developer Master Control Panel (Vayolett1404) & Student Management
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

print(f"=== TEST SUITE V4.0 RUNNING ON http://127.0.0.1:{PORT}/ ===")

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)

    # ── PASS 1: HUB TEST ─────────────────────────────────────────────
    print("\n--- PASS 1: CENTRAL HUB (index.html) ---")
    ctx1 = browser.new_context(viewport={'width': 1280, 'height': 800})
    page1 = ctx1.new_page()
    page1.on("console", lambda m: print(f"PAGE CONSOLE [{m.type}]: {m.text}") if m.type in ["error", "warning"] else None)
    def on_error(err):
        print(f"PAGE ERROR: {err}")
        try:
            print(f"PAGE ERROR STACK: {err.stack}")
        except Exception:
            pass
    page1.on("pageerror", on_error)
    page1.on("dialog", lambda dialog: dialog.accept())
    page1.goto(f"http://127.0.0.1:{PORT}/index.html")
    page1.wait_for_load_state("domcontentloaded")
    
    title = page1.title()
    print(f"  Hub Title: '{title}'")
    assert "CEREBRO ESTRUCTURAL PRO" in title, f"Unexpected title: {title}"

    # Check module cards
    armaduras_card = page1.locator("a[href='armaduras.html']")
    vigas_card = page1.locator("a[href='vigas.html']")
    assert armaduras_card.count() > 0, "Armaduras card not found!"
    assert vigas_card.count() > 0, "Vigas card not found!"
    print("  ✔ Both module cards ('Armaduras 2D' and 'Vigas') exist on Hub.")

    # ── PASS 2: ARMADURAS 2D MODULE ──────────────────────────────────
    print("\n--- PASS 2: ARMADURAS 2D (armaduras.html) ---")
    page1.goto(f"http://127.0.0.1:{PORT}/armaduras.html")
    page1.wait_for_load_state("domcontentloaded")
    time.sleep(0.8)

    # Verify auth modal opens
    modal = page1.locator("#accessLockModal")
    assert modal.is_visible(), "Auth modal should be visible on fresh armaduras visit!"
    print("  ✔ Auth modal appeared on armaduras.html.")

    # Enter Master Password
    page1.fill("#userGoogleEmailInput", "Vayolett1404")
    page1.click("#btnConfirmGoogleAccount")
    time.sleep(0.5)
    assert not modal.is_visible(), "Modal should close after master login!"
    print("  ✔ Master login 'Vayolett1404' granted access to Armaduras.")

    # Verify cross-navigation button
    nav_to_vigas = page1.locator("a:has-text('Ir a Vigas')")
    assert nav_to_vigas.count() > 0, "Navigation to Vigas button missing in armaduras!"
    print(f"  ✔ Cross-navigation button to Vigas exists: '{nav_to_vigas.first.inner_text().strip()}'.")

    # Verify canvas exists
    canvas = page1.locator("canvas")
    assert canvas.count() > 0, "Armaduras canvas not found!"
    print("  ✔ Armaduras canvas renders.")

    # ── PASS 3: VIGAS MODULE (vigas.html) ────────────────────────────
    print("\n--- PASS 3: VIGAS MODULE (vigas.html) ---")
    page1.goto(f"http://127.0.0.1:{PORT}/vigas.html")
    page1.wait_for_load_state("domcontentloaded")
    time.sleep(0.8)

    # Session is master, modal should be closed
    assert not page1.locator("#accessLockModal").is_visible(), "Session should persist as master in vigas.html!"
    print("  ✔ Master session persisted seamlessly into Vigas.")

    # Check cross navigation button to armaduras
    nav_to_arm = page1.locator("a:has-text('Ir a Armaduras 2D')")
    assert nav_to_arm.count() > 0, "Navigation to Armaduras button missing in vigas!"
    print(f"  ✔ Cross-navigation button to Armaduras exists: '{nav_to_arm.first.inner_text().strip()}'.")

    # Check Beam canvas
    beam_canvas = page1.locator("#canvasGraficaFinal")
    assert beam_canvas.count() > 0, "Beam canvas not found!"
    canvas_w = page1.evaluate("() => document.getElementById('canvasGraficaFinal').width")
    assert canvas_w > 0, "Beam canvas width is 0!"
    print(f"  ✔ Beam canvas renders with width {canvas_w}px.")

    # Check local bars pane
    local_bars_pane = page1.locator("#paneLocalBars")
    assert local_bars_pane.count() > 0, "Local bars pane missing!"
    bars_html = local_bars_pane.inner_html()
    assert len(bars_html) > 0, "Local bars pane empty!"
    print(f"  ✔ Matrix development rendered ({len(bars_html)} chars HTML).")

    # Check reactions tbody
    reac_tbody = page1.locator("#tbodySummaryReactions")
    assert reac_tbody.count() > 0, "Reactions tbody missing!"
    reac_text = reac_tbody.inner_text()
    assert len(reac_text) > 0, "Reactions table empty!"
    print(f"  ✔ Reactions table rendered: {reac_text.splitlines()[:2]}.")

    # ── PASS 4: STUDENT PRIVACY & YAPE PAYWALL (NO MEMBERS LIST) ─────
    print("\n--- PASS 4: STUDENT PRIVACY & REAL YAPE QR PAYWALL ---")
    ctx2 = browser.new_context(viewport={'width': 1280, 'height': 800})
    page2 = ctx2.new_page()
    page2.on("dialog", lambda dialog: dialog.accept())
    page2.goto(f"http://127.0.0.1:{PORT}/index.html")
    time.sleep(0.8)

    # Verify modal is shown
    assert page2.locator("#accessLockModal").is_visible(), "Lock modal should be visible."
    
    # Check that NO public member list exists in the DOM
    members_list = page2.locator("#communityMembersList, .members-list, #allMembersModal")
    assert members_list.count() == 0, "PRIVACY VIOLATION: Public member list found!"
    print("  ✔ Privacy verified: No public member list accessible to students.")

    # Fill student Google email
    page2.fill("#userGoogleEmailInput", "alumno.civil2026@continental.edu.pe")
    page2.fill("#userFullNameInput", "Carlos Ramirez")
    page2.click("#btnConfirmGoogleAccount")
    time.sleep(0.5)

    # Verify Yape paywall is shown
    yape_view = page2.locator("#viewYapePaywall")
    assert yape_view.is_visible(), "Yape paywall should be shown!"
    print("  ✔ Yape Paywall displayed to new student.")

    # Check QR code image loading
    qr_img = page2.locator("img.qr-image-display-dark")
    assert qr_img.count() > 0, "QR image element missing!"
    img_src = qr_img.get_attribute("src")
    assert "yape_qr_ulianov.png" in img_src, f"Wrong QR src: {img_src}"
    
    # Check natural dimensions of QR image to verify it actually loaded from disk
    is_img_loaded = page2.evaluate("() => document.querySelector('img.qr-image-display-dark').naturalWidth > 0")
    assert is_img_loaded, "QR image failed to load / 404!"
    print(f"  ✔ Official Yape QR Code ('{img_src}') loaded successfully from disk.")

    # Verify holder, number and amount
    paywall_text = yape_view.inner_text()
    assert "Ulianov Sabath Cuba Valencia" in paywall_text, "Yape holder name missing!"
    assert "933 685 462" in paywall_text or "933685462" in paywall_text, "Yape phone number missing!"
    assert "S/ 15.00" in paywall_text, "Yape amount S/ 15.00 missing!"
    print("  ✔ Paywall confirms: S/ 15.00 | Ulianov Sabath Cuba Valencia | 933 685 462.")

    # ── PASS 5: DEVELOPER MASTER CONTROL PANEL ───────────────────────
    print("\n--- PASS 5: DEVELOPER MASTER CONTROL PANEL ---")
    # Click on "Administrador" link
    page2.click("#linkDevAccess2")
    time.sleep(0.4)
    dev_view = page2.locator("#viewDeveloperAccess")
    assert dev_view.is_visible(), "Developer login view should be visible!"
    
    # Enter Master Password
    page2.fill("#ownerMasterPassInput", "Vayolett1404")
    page2.click("#btnOwnerLogin")
    time.sleep(0.5)

    dev_modal = page2.locator("#ownerControlModal")
    assert dev_modal.is_visible(), "Developer Master Panel modal should be open!"
    print("  ✔ Master Developer Control Panel successfully unlocked with 'Vayolett1404'.")

    # Developer can see the registered student Carlos Ramirez!
    dev_students_text = page2.locator("#devStudentsListContainer").inner_text()
    assert "alumno.civil2026@continental.edu.pe" in dev_students_text, "Registered student should appear in dev panel!"
    print(f"  ✔ Developer sees student in private list: {dev_students_text.splitlines()[:2]}.")

    # Developer has Excel toggle, Kick / Ban buttons
    btn_ban = page2.locator("button:has-text('🚫 Banear'), button:has-text('Botar')")
    assert btn_ban.count() > 0, "Developer kick/ban button missing!"
    print("  ✔ Developer has kick/ban and license controls.")

    page2.screenshot(path="screenshot_dev_panel_verified.png")
    print("  ✔ Saved verification screenshot: screenshot_dev_panel_verified.png")

    browser.close()

print("\n=======================================================")
print("✔ ALL 5 PASSES COMPLETED WITH 100% SUCCESS!")
print("=======================================================")
