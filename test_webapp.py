# -*- coding: utf-8 -*-
"""
test_webapp.py
End-to-End automated validation of the Web Application using Playwright.
Validates:
1. Google Sign-In with Dropdown Chooser
2. Terms & Conditions acceptance
3. Yape Paywall with code binding
4. Developer Master Password 'Vayolett1404' worldwide access
5. NO re-prompting on clicks: Mis Armaduras, Descargar Excel, Presets
6. Seamless session persistence when navigating to 'Ver 13 Tablas' (WEB_ARMADURAS_ULIANOV/index.html)
"""
import os
import sys
import time
import socket
import http.server
import threading
import openpyxl

sys.stdout.reconfigure(encoding='utf-8')
sys.stderr.reconfigure(encoding='utf-8')
from playwright.sync_api import sync_playwright

def find_free_port():
    s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    s.bind(('', 0))
    port = s.getsockname()[1]
    s.close()
    return port

PORT = find_free_port()
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=BASE_DIR, **kwargs)
    def log_message(self, format, *args):
        pass

server = http.server.HTTPServer(('127.0.0.1', PORT), Handler)
server_thread = threading.Thread(target=server.serve_forever, daemon=True)
server_thread.start()
print(f"Local test server running at http://127.0.0.1:{PORT}/")

console_errors = []

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    context = browser.new_context(viewport={'width': 1366, 'height': 850})
    page = context.new_page()

    page.on("console", lambda msg: console_errors.append(msg.text) if msg.type == "error" else None)
    page.on("pageerror", lambda exc: console_errors.append(str(exc)))

    url = f"http://127.0.0.1:{PORT}/index.html"
    print(f"Navigating to {url}...")
    page.goto(url, wait_until="networkidle")
    time.sleep(1)

    print("Title:", page.title())
    assert "CEREBRO ESTRUCTURAL" in page.title(), "Title does not match!"

    # 1. Test Google SSO Dropdown Chooser & Terms Acceptance
    print("Testing Google Account Dropdown Chooser & Terms Acceptance...")
    lock_modal = page.locator("#accessLockModal")
    assert lock_modal.is_visible(), "Access Lock Modal should be visible on fresh load!"

    assert page.locator("#viewGoogleChooser").is_visible(), "Google Chooser should be visible!"
    terms_chk = page.locator("#chkTermsAndConditions")
    assert terms_chk.is_checked(), "Terms and Conditions checkbox should be present and checked!"

    # Verify Dropdown exists and has Google accounts
    google_dropdown = page.locator("#googleAccountDropdown")
    assert google_dropdown.is_visible(), "Google Account Dropdown should be visible!"
    dropdown_options = google_dropdown.locator("option").all_inner_texts()
    print("Dropdown Google accounts:", dropdown_options)
    assert any("alumno@continental.edu.pe" in opt for opt in dropdown_options), "Default student account missing from dropdown!"

    # Select student account from dropdown
    print("Selecting 'alumno@continental.edu.pe' from Google dropdown...")
    google_dropdown.select_option("alumno@continental.edu.pe")
    time.sleep(0.3)

    # Verify live preview card updated
    selected_email_text = page.locator("#selectedAccountEmail").inner_text()
    assert "alumno@continental.edu.pe" in selected_email_text, f"Unexpected email in preview: {selected_email_text}"

    # Click 'Continuar con cuenta de Google'
    print("Clicking 'Continuar con cuenta de Google'...")
    page.click("#btnConfirmGoogleAccount")
    time.sleep(0.4)

    # 2. Verify Yape paywall view appears with student email bound
    assert page.locator("#viewYapePaywall").is_visible(), "Yape view should be visible for unapproved student!"
    assert "alumno@continental.edu.pe" in page.locator("#lblActiveStudentEmail").inner_text()
    print("Student Google email successfully bound to Yape activation!")

    # Test invalid activation key rejection
    page.fill("#accessPassInput", "CYB-INVALIDO")
    page.click("#btnUnlockAccess")
    time.sleep(0.3)
    error_msg = page.locator("#passErrorMsg")
    assert error_msg.is_visible(), "Error message should be visible on invalid key!"
    print("Anti-tamper: Invalid key correctly rejected!")

    # 3. Test Discreet Developer Master Login (no Google account, no email needed)
    print("Testing Developer Master Login with 'Vayolett1404'...")
    page.click("#linkDevAccess2")
    time.sleep(0.3)
    assert page.locator("#viewDeveloperAccess").is_visible(), "Developer view should be visible!"

    page.fill("#ownerMasterPassInput", "Vayolett1404")
    page.click("#btnOwnerLogin")
    time.sleep(0.5)

    assert not lock_modal.is_visible(), "Access Lock Modal should be hidden after Developer Master Password!"
    print("Developer Master Password 'Vayolett1404' accepted and full platform unlocked worldwide!")

    # Verify Developer Panel button exists in header
    assert page.locator("#btnOwnerPanel").is_visible(), "Developer Panel button should be visible for Developer!"
    print("Developer Panel button verified!")

    # 4. Verify Persistent Session - NO RE-PROMPTING ON CLICKS:
    # A. Click 'Mis Armaduras'
    print("Testing 'Mis Armaduras' button click without reprompting...")
    page.click("#btnMyProjects")
    time.sleep(0.4)
    proj_modal = page.locator("#projectsManagerModal")
    assert proj_modal.is_visible(), "Projects Manager Modal should open on click!"
    assert not lock_modal.is_visible(), "Access Lock Modal must NOT appear when clicking Mis Armaduras!"
    page.click("#btnCloseProjModal")
    time.sleep(0.3)
    assert not proj_modal.is_visible(), "Projects Manager Modal closed!"
    print("Verified 'Mis Armaduras' opened smoothly without prompting for email!")

    # B. Test downloading Excel
    print("Testing 'Descargar Excel' button without reprompting...")
    with page.expect_download() as download_info:
        page.click("#btnDownloadExcel")
    download = download_info.value
    download_file = os.path.join(BASE_DIR, "downloaded_test.xlsx")
    download.save_as(download_file)
    print(f"Downloaded file: {download_file}, size: {os.path.getsize(download_file)} bytes")
    assert os.path.getsize(download_file) > 10000, "Downloaded file is too small!"
    assert not lock_modal.is_visible(), "Access Lock Modal must NOT appear when downloading Excel!"

    wb = openpyxl.load_workbook(download_file, read_only=True)
    assert "MANUAL_ISOSTATICA_3R" in wb.sheetnames, "Sheet MANUAL_ISOSTATICA_3R missing!"
    wb.close()
    os.remove(download_file)
    print("Verified downloaded Excel generated smoothly with zero login reprompts!")

    # 5. Check structural status badge & Presets
    status_text = page.locator("#structuralStatusBadge").inner_text()
    print("Status Badge:", status_text)
    assert "Isostática" in status_text, f"Unexpected status: {status_text}"

    # Switch Presets
    print("Testing Preset 2: Hiperestático...")
    page.select_option("#presetSelect", "hyperstatic_4n")
    time.sleep(0.5)
    assert not lock_modal.is_visible(), "Modal must not appear on preset change!"
    status_text_2 = page.locator("#structuralStatusBadge").inner_text()
    assert "Hiperestática de Grado 2" in status_text_2

    # 6. Test seamless navigation to 'Ver 13 Tablas' (WEB_ARMADURAS_ULIANOV/index.html)
    print("Testing navigation to 'Ver 13 Tablas' (subfolder app)...")
    page.goto(f"http://127.0.0.1:{PORT}/WEB_ARMADURAS_ULIANOV/index.html", wait_until="networkidle")
    time.sleep(1)

    sub_lock_modal = page.locator("#accessLockModal")
    assert not sub_lock_modal.is_visible(), "Subfolder app should inherit active session and NOT ask for login again!"
    print("Session seamlessly inherited in WEB_ARMADURAS_ULIANOV/index.html!")

    # Test downloading Excel in subfolder without prompt
    print("Testing download Excel in subfolder without reprompt...")
    with page.expect_download() as sub_download_info:
        page.click("#btn-download-excel")
    sub_download = sub_download_info.value
    sub_download_file = os.path.join(BASE_DIR, "sub_downloaded_test.xlsx")
    sub_download.save_as(sub_download_file)
    assert os.path.getsize(sub_download_file) > 10000
    os.remove(sub_download_file)
    assert not sub_lock_modal.is_visible(), "Subfolder app must NOT prompt for login when downloading Excel!"
    print("Verified subfolder Excel downloaded with zero reprompts!")

    # Take screenshot of benchmark
    screenshot_path = os.path.join(BASE_DIR, "app_benchmark_screenshot.png")
    page.screenshot(path=screenshot_path, full_page=True)
    print(f"Screenshot saved to: {screenshot_path}")

    browser.close()

server.shutdown()

print("Console errors count:", len(console_errors))
if console_errors:
    print("Errors:", console_errors)
assert len(console_errors) == 0, f"There were console errors: {console_errors}"

print("\n=============================================")
print(" ALL TESTS PASSED WITH 100% SUCCESS! ")
print("=============================================\n")
