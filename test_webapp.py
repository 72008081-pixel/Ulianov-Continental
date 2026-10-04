# -*- coding: utf-8 -*-
"""
test_webapp.py
End-to-End automated validation of the Web Application using Playwright.
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

    # 1. Test Yape Lock Modal & Password Authentication
    print("Testing Yape Lock Modal...")
    lock_modal = page.locator("#accessLockModal")
    assert lock_modal.is_visible(), "Yape Access Lock Modal should be visible on fresh load!"

    # Test invalid password rejection
    page.fill("#accessPassInput", "clave_invalida_123")
    page.click("#btnUnlockAccess")
    time.sleep(0.3)
    error_msg = page.locator("#passErrorMsg")
    assert error_msg.is_visible(), "Error message should be visible on incorrect password!"
    print("Invalid password correctly rejected!")

    # Test master password unlock with Vayolett1404
    print("Unlocking with Master Password: Vayolett1404...")
    page.fill("#accessPassInput", "Vayolett1404")
    page.click("#btnUnlockAccess")
    time.sleep(0.5)
    assert not lock_modal.is_visible(), "Yape Access Lock Modal should be hidden after correct password!"
    print("Master Password 'Vayolett1404' accepted and platform successfully unlocked!")

    # Check structural status badge
    status_text = page.locator("#structuralStatusBadge").inner_text()
    print("Status Badge:", status_text)
    assert "Isostática" in status_text, f"Unexpected status: {status_text}"

    # Check equilibrium badge
    eq_text = page.locator("#equilibriumBadge").inner_text()
    print("Equilibrium Badge:", eq_text)
    assert "Equilibrio Exacto" in eq_text, f"Unexpected equilibrium: {eq_text}"

    # Verify canvas presence
    canvas = page.locator("#trussCanvas")
    assert canvas.is_visible(), "Canvas is not visible!"

    # Take screenshot of benchmark
    screenshot_path = os.path.join(BASE_DIR, "app_benchmark_screenshot.png")
    page.screenshot(path=screenshot_path, full_page=True)
    print(f"Screenshot saved to: {screenshot_path}")

    # Test downloading Excel
    print("Testing 'Descargar Excel' button...")
    with page.expect_download() as download_info:
        page.click("#btnDownloadExcel")
    download = download_info.value
    download_file = os.path.join(BASE_DIR, "downloaded_test.xlsx")
    download.save_as(download_file)
    print(f"Downloaded file: {download_file}, size: {os.path.getsize(download_file)} bytes")
    assert os.path.getsize(download_file) > 10000, "Downloaded file is too small!"

    # Inspect downloaded workbook with openpyxl
    wb = openpyxl.load_workbook(download_file, read_only=True)
    print("Downloaded Workbook Sheets:", wb.sheetnames)
    assert "MANUAL_ISOSTATICA_3R" in wb.sheetnames, "Sheet MANUAL_ISOSTATICA_3R missing!"
    wb.close()
    os.remove(download_file)
    print("Verified downloaded Excel file successfully!")

    # Switch to Preset 2 (Hyperstatic)
    print("Testing Preset 2: Hiperestático...")
    page.select_option("#presetSelect", "hyperstatic_4n")
    time.sleep(0.5)
    status_text_2 = page.locator("#structuralStatusBadge").inner_text()
    print("Preset 2 Status:", status_text_2)
    assert "Hiperestática de Grado 2" in status_text_2, f"Unexpected status: {status_text_2}"

    # Switch to Preset 3 (Warren)
    print("Testing Preset 3: Warren...")
    page.select_option("#presetSelect", "warren_5n")
    time.sleep(0.5)
    status_text_3 = page.locator("#structuralStatusBadge").inner_text()
    print("Preset 3 Status:", status_text_3)
    assert "Isostática" in status_text_3 or "Hiperestática" in status_text_3

    # Switch to Preset 4 (Roof Howe)
    print("Testing Preset 4: Techo Howe...")
    page.select_option("#presetSelect", "roof_5n")
    time.sleep(0.5)
    status_text_4 = page.locator("#structuralStatusBadge").inner_text()
    print("Preset 4 Status:", status_text_4)
    assert "Isostática" in status_text_4, f"Unexpected status: {status_text_4}"

    # Check tab switching
    print("Testing tab switching...")
    page.click("button[data-tab='tab-pedagogical']")
    time.sleep(0.3)
    assert page.locator("#tab-pedagogical").is_visible(), "Pedagogical tab not visible!"

    page.click("button[data-tab='tab-global-matrix']")
    time.sleep(0.3)
    assert page.locator("#tab-global-matrix").is_visible(), "Global matrix tab not visible!"

    page.click("button[data-tab='tab-theory']")
    time.sleep(0.3)
    assert page.locator("#tab-theory").is_visible(), "Theory tab not visible!"

    browser.close()

server.shutdown()

print("Console errors count:", len(console_errors))
if console_errors:
    print("Errors:", console_errors)
assert len(console_errors) == 0, f"There were console errors: {console_errors}"

print("\n=============================================")
print(" ALL TESTS PASSED WITH 100% SUCCESS! ")
print("=============================================\n")
