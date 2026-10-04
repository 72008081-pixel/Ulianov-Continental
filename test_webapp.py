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
    page.on("dialog", lambda dialog: dialog.accept())
    page.on("requestfailed", lambda req: print(f"DEBUG REQUEST FAILED: {req.url} -> {req.failure}"))

    url = f"http://127.0.0.1:{PORT}/index.html"
    print(f"Navigating to {url}...")
    page.goto(url, wait_until="networkidle")
    time.sleep(1)

    print("Title:", page.title())
    assert "CEREBRO ESTRUCTURAL" in page.title(), "Title does not match!"

    # 1. Test Google Sign-In & Terms Acceptance (No fake default accounts)
    print("Testing Google Sign-In & Terms Acceptance...")
    lock_modal = page.locator("#accessLockModal")
    assert lock_modal.is_visible(), "Access Lock Modal should be visible on fresh load!"

    assert page.locator("#viewGoogleChooser").is_visible(), "Google Chooser should be visible!"
    terms_chk = page.locator("#chkTermsAndConditions")
    assert terms_chk.is_checked(), "Terms and Conditions checkbox should be present and checked!"

    # Verify input exists for user's Google account (No fake accounts displayed)
    email_input = page.locator("#userGoogleEmailInput")
    assert email_input.is_visible(), "Google email input should be visible for user's account!"

    # Fill student's real Google email
    print("Entering user's Google email: alumno@continental.edu.pe...")
    page.fill("#userGoogleEmailInput", "alumno@continental.edu.pe")
    time.sleep(0.3)

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

    # 4. Verify Developer Panel - Approve student Yape
    print("Developer approving student Yape in Panel...")
    page.click("#btnOwnerPanel")
    time.sleep(0.4)
    dev_modal = page.locator("#ownerControlModal")
    assert dev_modal.is_visible(), "Developer modal should be visible!"
    approve_btn = page.locator("button.btn-approve-pending[data-email='alumno@continental.edu.pe']")
    assert approve_btn.is_visible(), "Student pending approval button should be visible!"
    approve_btn.click()
    time.sleep(0.4)
    page.click("#btnCloseDevPanel")
    time.sleep(0.3)
    print("Student 'alumno@continental.edu.pe' approved for standard platform access!")

    # 5. TEST STUDENT DEFAULT FLOW: Standard student downloads PDF (NOT editable Excel)
    print("Switching session to regular student (No Excel VIP)...")
    page.evaluate("""() => {
        localStorage.setItem('cerebro_auth_session_v21', JSON.stringify({
            role: 'student',
            email: 'alumno@continental.edu.pe',
            name: 'alumno'
        }));
        location.reload();
    }""")
    page.wait_for_load_state("networkidle")
    time.sleep(1)

    assert not lock_modal.is_visible(), "Student session should be active and unlocked!"
    print("Student session loaded successfully!")

    # Student clicks 'Mis Armaduras' - no reprompts
    page.click("#btnMyProjects")
    time.sleep(0.4)
    proj_modal = page.locator("#projectsManagerModal")
    assert proj_modal.is_visible(), "Projects Manager Modal should open on click!"
    page.click("#btnCloseProjModal")
    time.sleep(0.3)
    print("Verified 'Mis Armaduras' opened smoothly without prompting for email!")

    # Student clicks 'Descargar Excel' -> MUST download PDF report by default!
    print("Testing student download: Expecting PDF report (protecting Excel IP)...")
    with page.expect_download() as download_info:
        page.click("#btnDownloadExcel")
    download = download_info.value
    download_filename = download.suggested_filename
    print(f"Downloaded filename: {download_filename}")
    assert download_filename.endswith(".pdf"), f"Expected .pdf file for non-VIP student, got: {download_filename}"
    pdf_file = os.path.join(BASE_DIR, "downloaded_test.pdf")
    download.save_as(pdf_file)
    pdf_size = os.path.getsize(pdf_file)
    print(f"Downloaded PDF size: {pdf_size} bytes")
    assert pdf_size > 5000, "Downloaded PDF is too small!"
    os.remove(pdf_file)
    print("VERIFIED: Standard student receives professional PDF report!")

    # Verify VIP Notice Modal appears informing about protected Excel formulas
    vip_modal = page.locator("#modalExcelVipNotice")
    assert vip_modal.is_visible(), "Excel VIP Notice modal should appear for standard student!"
    modal_text = vip_modal.inner_text()
    assert "Informe Técnico en PDF Descargado" in modal_text, "Modal header text mismatch!"
    assert "Ulianov Cuba Valencia" in modal_text, "Copyright creator text mismatch!"
    print("VERIFIED: Excel VIP Notice modal correctly displayed with IP protection notices!")

    # Student clicks 'Solicitar Plantilla Excel (.xlsx)'
    print("Student requesting VIP Excel permission from creator...")
    page.click("#btnRequestExcelVip")
    time.sleep(0.4)
    confirm_msg = page.locator("#excelVipConfirmMsg")
    assert confirm_msg.is_visible(), "Confirmation message should appear after requesting VIP Excel!"
    print("VIP request sent and confirmed!")

    page.click("#btnCloseExcelVipNotice")
    time.sleep(0.3)
    assert not vip_modal.is_visible(), "VIP modal should close on click!"

    # 6. DEVELOPER GRANTS EXCEL VIP PERMISSION TO STUDENT
    print("Developer granting VIP Excel permission to student...")
    page.evaluate("""() => {
        localStorage.setItem('cerebro_auth_session_v21', JSON.stringify({
            role: 'owner',
            name: 'Ing. Ulianov Cuba Valencia (Desarrollador)'
        }));
        location.reload();
    }""")
    page.wait_for_load_state("networkidle")
    time.sleep(1)

    page.click("#btnOwnerPanel")
    time.sleep(0.4)
    # Switch to Tab 3 (Licencias Excel .xlsx)
    page.click("button.dev-tab-btn[data-tab='tabDevExcel']")
    time.sleep(0.4)
    assert page.locator("#tabDevExcel").is_visible(), "Excel VIP tab should be visible!"

    grant_btn = page.locator("button.btn-grant-excel-vip[data-email='alumno@continental.edu.pe']")
    if grant_btn.is_visible():
        grant_btn.click()
    else:
        page.fill("#devQuickExcelAuthInput", "alumno@continental.edu.pe")
        page.click("#btnDevQuickExcelAuth")
    time.sleep(0.4)
    page.click("#btnCloseDevPanel")
    time.sleep(0.3)
    print("Developer successfully granted VIP Excel permission to alumno@continental.edu.pe!")

    # 7. VIP STUDENT DOWNLOADS NATIVE EXCEL (.xlsx) WITH PROTECTED WORKSHEETS
    print("Switching back to student session (now VIP authorized)...")
    page.evaluate("""() => {
        localStorage.setItem('cerebro_auth_session_v21', JSON.stringify({
            role: 'student',
            email: 'alumno@continental.edu.pe',
            name: 'alumno'
        }));
        location.reload();
    }""")
    page.wait_for_load_state("networkidle")
    time.sleep(1)

    print("Testing VIP student downloading Excel (.xlsx)...")
    with page.expect_download() as xlsx_download_info:
        page.click("#btnDownloadExcel")
    xlsx_download = xlsx_download_info.value
    xlsx_filename = xlsx_download.suggested_filename
    print(f"Downloaded filename: {xlsx_filename}")
    assert xlsx_filename.endswith(".xlsx"), f"Expected .xlsx file for VIP student, got: {xlsx_filename}"
    xlsx_file = os.path.join(BASE_DIR, "downloaded_vip.xlsx")
    xlsx_download.save_as(xlsx_file)
    assert os.path.getsize(xlsx_file) > 10000, "Downloaded Excel is too small!"

    # Inspect openpyxl workbook and verify worksheet protection
    wb = openpyxl.load_workbook(xlsx_file)
    assert "MANUAL_ISOSTATICA_3R" in wb.sheetnames, "Sheet MANUAL_ISOSTATICA_3R missing!"
    assert "MANUAL_HIPERESTATICA_4R" in wb.sheetnames, "Sheet MANUAL_HIPERESTATICA_4R missing!"

    # Verify worksheet protection (password-protected with Vayolett1404)
    ws_iso = wb["MANUAL_ISOSTATICA_3R"]
    ws_hip = wb["MANUAL_HIPERESTATICA_4R"]
    assert ws_iso.protection.sheet is True, "Worksheet MANUAL_ISOSTATICA_3R must be protected against editing formulas!"
    assert ws_hip.protection.sheet is True, "Worksheet MANUAL_HIPERESTATICA_4R must be protected against editing formulas!"
    print("VERIFIED: Excel worksheets are strictly password-protected against formula tampering!")
    wb.close()
    os.remove(xlsx_file)

    # 8. Check structural status badge & Presets
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

    # 9. Test seamless navigation to 'Ver 13 Tablas' (WEB_ARMADURAS_ULIANOV/index.html)
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
    sub_wb = openpyxl.load_workbook(sub_download_file)
    assert sub_wb["MANUAL_ISOSTATICA_3R"].protection.sheet is True, "Subfolder Excel sheet must also be protected!"
    sub_wb.close()
    os.remove(sub_download_file)
    assert not sub_lock_modal.is_visible(), "Subfolder app must NOT prompt for login when downloading Excel!"
    print("Verified subfolder Excel downloaded with zero reprompts and verified protection!")

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
