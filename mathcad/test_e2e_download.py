import os, sys, time, threading
from http.server import SimpleHTTPRequestHandler
import socketserver
from playwright.sync_api import sync_playwright
import zipfile, xml.etree.ElementTree as ET
from validate_mcdx_schema import validate_mcdx

sys.stdout.reconfigure(encoding='utf-8')

class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=os.path.abspath('.'), **kwargs)

def start_server(port=8101):
    socketserver.TCPServer.allow_reuse_address = True
    httpd = socketserver.TCPServer(("", port), Handler)
    thread = threading.Thread(target=httpd.serve_forever, daemon=True)
    thread.start()
    return httpd

def test_all_web_downloads():
    port = 8101
    httpd = start_server(port)
    url = f"http://127.0.0.1:{port}/index.html"
    
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(accept_downloads=True)
        page = context.new_page()
        page.goto(url)
        page.wait_for_load_state('domcontentloaded')
        time.sleep(1)
        
        # Test 1: Default state download (exact scenario of user's (2) file)
        print("Testing Case 1: Default Web Download...")
        with page.expect_download(timeout=10000) as d_info:
            page.locator("#btnDownloadMcdx").click()
        f1 = os.path.abspath("test_outputs/TEST_WEB_DEFAULT.mcdx")
        d_info.value.save_as(f1)
        assert validate_mcdx(f1), "Default download validation failed!"
        
        # Test 2: Preset 3 Tramos q=500
        print("Testing Case 2: Preset 3 Tramos q=500...")
        page.locator("button:has-text('Examen 3 Tramos')").first.click()
        time.sleep(0.5)
        with page.expect_download(timeout=10000) as d_info:
            page.locator("#btnDownloadMcdx").click()
        f2 = os.path.abspath("test_outputs/TEST_WEB_3TRAMOS.mcdx")
        d_info.value.save_as(f2)
        assert validate_mcdx(f2), "Preset 3 Tramos validation failed!"

        # Test 3: Preset Oficial 4 Tramos
        print("Testing Case 3: Preset Oficial 4 Tramos...")
        page.locator("button:has-text('Examen Oficial')").first.click()
        time.sleep(0.5)
        with page.expect_download(timeout=10000) as d_info:
            page.locator("#btnDownloadMcdx").click()
        f3 = os.path.abspath("test_outputs/TEST_WEB_OFICIAL.mcdx")
        d_info.value.save_as(f3)
        assert validate_mcdx(f3), "Preset Oficial validation failed!"

        browser.close()
        print("\n🏆 ALL 3 WEB DOWNLOAD TEST CASES PASSED WITH 100% VALIDATION!")

if __name__ == '__main__':
    test_all_web_downloads()
