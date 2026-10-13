/**
 * auth.js — CEREBRO ESTRUCTURAL v5.5
 * Sistema de Control de Acceso
 * - Muro de pago obligatorio (Yape S/ 15.00) para todo usuario nuevo
 * - Solo el admin (Vayolett1404) tiene panel de control
 * - 2 códigos por usuario: ACCESO + EXCEL
 * - Lista de inscritos solo visible para el admin
 * Ing. Ulianov Cuba Valencia — 933685462
 */
(function () {
    'use strict';

    // ── CONSTANTES ──────────────────────────────────────────────
    const MASTER = ['Vayolett1404', 'vayolett1404'];
    const SALT   = 'ULIANOV_CEREBRO_V55_SALT_2026';
    const YAPE   = { holder: 'Ulianov Sabath Cuba Valencia', phone: '933685462', display: '933 685 462', amount: 'S/ 15.00', qr: 'assets/yape_qr_ulianov.png' };

    const KEY = {
        session:   'cb_session_v55',
        whitelist: 'cb_access_v55',
        banned:    'cb_banned_v55',
        excel:     'cb_excel_v55',
        students:  'cb_students_v55',
        device:    'cb_device_v55'
    };

    // ── DEVICE ID ────────────────────────────────────────────────
    let deviceId = localStorage.getItem(KEY.device);
    if (!deviceId) {
        deviceId = 'D' + Math.random().toString(36).slice(2) + Date.now().toString(36);
        localStorage.setItem(KEY.device, deviceId);
    }

    // ── SHA-256 COMPACTO ─────────────────────────────────────────
    function sha256(s) {
        const rr = (v, a) => (v >>> a) | (v << (32 - a));
        const pw = Math.pow, mw = pw(2, 32);
        let i, j, r = '', w = [], h = [], k = [], pc = 0;
        const ic = {};
        for (let c = 2; pc < 64; c++) {
            if (!ic[c]) {
                for (i = 0; i < 313; i += c) ic[i] = c;
                h[pc] = (pw(c, .5) * mw) | 0;
                k[pc++] = (pw(c, 1 / 3) * mw) | 0;
            }
        }
        s += '\x80';
        while (s.length % 64 - 56) s += '\x00';
        for (i = 0; i < s.length; i++) { j = s.charCodeAt(i); w[i >> 2] |= j << ((3 - i) % 4) * 8; }
        const abl = s.length * 8 - 8;
        w[w.length] = (abl / mw) | 0;
        w[w.length] = abl;
        for (j = 0; j < w.length;) {
            const wd = w.slice(j, j += 16), oh = h.slice(0);
            for (i = 0; i < 64; i++) {
                const w15 = wd[i - 15], w2 = wd[i - 2];
                wd[i] = i < 16 ? wd[i] : (wd[i - 16] + (rr(w15, 7) ^ rr(w15, 18) ^ (w15 >>> 3)) + wd[i - 7] + (rr(w2, 17) ^ rr(w2, 19) ^ (w2 >>> 10))) | 0;
                const t1 = (h[7] + (rr(h[4], 6) ^ rr(h[4], 11) ^ rr(h[4], 25)) + ((h[4] & h[5]) ^ (~h[4] & h[6])) + k[i] + wd[i]) | 0;
                const t2 = ((rr(h[0], 2) ^ rr(h[0], 13) ^ rr(h[0], 22)) + ((h[0] & h[1]) ^ (h[0] & h[2]) ^ (h[1] & h[2]))) | 0;
                h = [t1 + t2 | 0, ...h.slice(0, 7)]; h[4] = (h[4] + t1) | 0;
            }
            for (i = 0; i < 8; i++) h[i] = (h[i] + oh[i]) | 0;
        }
        for (i = 0; i < 8; i++) for (let b = 3; b >= 0; b--) { const by = (h[i] >> (b * 8)) & 255; r += (by < 16 ? '0' : '') + by.toString(16); }
        return r;
    }

    // ── CÓDIGOS DETERMINISTAS POR USUARIO ───────────────────────
    function accessCode(email) {
        const h = sha256(email.toLowerCase().trim() + SALT + '_ACCESS').toUpperCase();
        return 'ACC-' + h.slice(0, 4) + '-' + h.slice(4, 8);
    }
    function excelCode(email) {
        const h = sha256(email.toLowerCase().trim() + SALT + '_EXCEL').toUpperCase();
        return 'XLS-' + h.slice(0, 4) + '-' + h.slice(4, 8);
    }

    // ── ALMACENAMIENTO ───────────────────────────────────────────
    function load(k) { try { return JSON.parse(localStorage.getItem(k)) || {}; } catch { return {}; } }
    function loadArr(k) { try { return JSON.parse(localStorage.getItem(k)) || []; } catch { return []; } }
    function save(k, v) { localStorage.setItem(k, JSON.stringify(v)); }

    function getSession() { try { return JSON.parse(localStorage.getItem(KEY.session)); } catch { return null; } }
    function setSession(s) { localStorage.setItem(KEY.session, JSON.stringify(s)); }
    function clearSession() { localStorage.removeItem(KEY.session); }

    function isAuthorized(email) { const w = load(KEY.whitelist); return !!w[email]; }
    function isBanned(email)     { const b = load(KEY.banned); return !!b[email]; }
    function hasExcel(email)     { const e = load(KEY.excel); return !!e[email]; }

    function authorizeUser(email, name) {
        const w = load(KEY.whitelist); w[email] = { email, name, ts: Date.now() }; save(KEY.whitelist, w);
        recordStudent(email, name);
    }
    function revokeUser(email)  { const w = load(KEY.whitelist); delete w[email]; save(KEY.whitelist, w); }
    function banUser(email)     { const b = load(KEY.banned); b[email] = true; save(KEY.banned, b); revokeUser(email); }
    function unbanUser(email)   { const b = load(KEY.banned); delete b[email]; save(KEY.banned, b); }
    function grantExcel(email)  { const e = load(KEY.excel); e[email] = true; save(KEY.excel, e); }
    function revokeExcel(email) { const e = load(KEY.excel); delete e[email]; save(KEY.excel, e); }

    function recordStudent(email, name) {
        const arr = loadArr(KEY.students);
        const idx = arr.findIndex(s => s.email === email);
        const entry = { email, name: name || email.split('@')[0], ts: Date.now() };
        if (idx >= 0) arr[idx] = { ...arr[idx], ...entry };
        else arr.push(entry);
        save(KEY.students, arr);
    }

    // ── LÓGICA DE AUTORIZACIÓN ───────────────────────────────────
    function checkAuthorized() {
        const s = getSession();
        if (!s) return false;
        if (s.role === 'admin') return true;
        if (s.role === 'student' && isAuthorized(s.email) && !isBanned(s.email)) return true;
        clearSession();
        return false;
    }

    // ── ESTILOS ──────────────────────────────────────────────────
    const css = document.createElement('style');
    css.textContent = `
#cb-overlay{position:fixed;inset:0;z-index:999999;background:rgba(3,7,18,.92);display:flex;align-items:center;justify-content:center;padding:16px;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
#cb-overlay.cb-hidden{display:none}
.cb-card{background:#0f172a;border:1.5px solid rgba(255,255,255,.15);border-top:1.5px solid rgba(255,255,255,.3);border-radius:18px;max-width:460px;width:100%;padding:22px;box-shadow:0 24px 64px rgba(0,0,0,.8);color:#f8fafc;position:relative;max-height:94vh;overflow-y:auto;animation:cbpop .2s ease}
.cb-card-wide{max-width:680px}
@keyframes cbpop{from{transform:scale(.95) translateY(8px);opacity:0}to{transform:scale(1) translateY(0);opacity:1}}
.cb-view{display:none}.cb-view.active{display:block}
.cb-logo{background:linear-gradient(135deg,#1e3a5f,#0f766e);color:#fff;font-weight:900;font-size:13px;padding:5px 12px;border-radius:8px;display:inline-block;margin-bottom:10px}
.cb-title{font-size:18px;font-weight:900;color:#fff;margin:0 0 3px}
.cb-sub{font-size:11.5px;color:#94a3b8;margin:0 0 14px}
.cb-input{width:100%;background:rgba(255,255,255,.07);border:1.5px solid rgba(255,255,255,.15);border-radius:9px;padding:10px 13px;font-size:13px;color:#fff;font-family:inherit;outline:none;box-sizing:border-box;margin-bottom:8px;transition:border .15s}
.cb-input:focus{border-color:#0d9488;background:rgba(255,255,255,.1)}
.cb-input::placeholder{color:#64748b}
.cb-btn{width:100%;padding:11px;border:none;border-radius:9px;font-size:13px;font-weight:800;cursor:pointer;transition:all .15s;box-sizing:border-box}
.cb-btn-primary{background:linear-gradient(135deg,#1e3a5f,#0f766e);color:#fff}
.cb-btn-primary:hover{opacity:.9}
.cb-btn-danger{background:#dc2626;color:#fff}
.cb-btn-success{background:#059669;color:#fff}
.cb-btn-gray{background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.15);color:#cbd5e1}
.cb-link{font-size:11px;color:#64748b;cursor:pointer;text-decoration:underline}
.cb-link:hover{color:#38bdf8}
.cb-err{display:none;color:#f43f5e;font-size:11px;font-weight:700;margin-top:4px}
.cb-qr-box{background:rgba(116,34,132,.15);border:1px solid rgba(116,34,132,.5);border-radius:12px;padding:12px;margin:10px 0;text-align:center}
.cb-qr-img{width:200px;max-width:90%;border-radius:10px;border:2px solid #0d9488;display:block;margin:6px auto}
.cb-chip{font-size:11px;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.15);border-radius:99px;padding:3px 9px;cursor:pointer;color:#94a3b8;transition:.15s}
.cb-chip:hover{background:rgba(13,148,136,.25);border-color:#0d9488;color:#34d399}
.cb-sep{border:none;border-top:1px solid rgba(255,255,255,.1);margin:12px 0}
/* Admin panel */
.cb-panel-header{display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid rgba(255,255,255,.1);padding-bottom:8px;margin-bottom:12px}
.cb-panel-title{font-size:15px;font-weight:900;color:#34d399;margin:0}
.cb-student-row{background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);border-radius:8px;padding:8px 10px;margin-bottom:6px;display:flex;justify-content:space-between;align-items:flex-start;gap:8px;flex-wrap:wrap}
.cb-student-info{flex:1;min-width:0}
.cb-student-email{font-size:12px;font-weight:700;color:#38bdf8;word-break:break-all}
.cb-student-codes{font-size:10.5px;color:#94a3b8;margin-top:2px;font-family:monospace}
.cb-student-actions{display:flex;gap:5px;flex-wrap:wrap}
.cb-sbtn{padding:3px 8px;border:none;border-radius:5px;font-size:10.5px;font-weight:800;cursor:pointer;white-space:nowrap}
.cb-sbtn-green{background:#059669;color:#fff}
.cb-sbtn-blue{background:#0284c7;color:#fff}
.cb-sbtn-yellow{background:#d97706;color:#fff}
.cb-sbtn-red{background:#dc2626;color:#fff}
.cb-sbtn-gray{background:#334155;color:#cbd5e1}
.cb-badge-ok{background:#064e3b;color:#34d399;padding:2px 7px;border-radius:99px;font-size:10px;font-weight:800}
.cb-badge-pend{background:#7c2d12;color:#fdba74;padding:2px 7px;border-radius:99px;font-size:10px;font-weight:800}
.cb-badge-ban{background:#450a0a;color:#fca5a5;padding:2px 7px;border-radius:99px;font-size:10px;font-weight:800}
.cb-badge-xls{background:#1e3a5f;color:#7dd3fc;padding:2px 7px;border-radius:99px;font-size:10px;font-weight:800;margin-left:4px}
/* Header button */
#cb-header-btn{padding:6px 13px;background:linear-gradient(135deg,#1e3a5f,#0f766e);color:#fff;border:none;border-radius:8px;font-size:12px;font-weight:800;cursor:pointer}
#cb-header-btn:hover{opacity:.85}
    `;
    document.head.appendChild(css);

    // ── MODAL HTML ───────────────────────────────────────────────
    function buildModal() {
        if (document.getElementById('cb-overlay')) return;

        const overlay = document.createElement('div');
        overlay.id = 'cb-overlay';
        overlay.className = 'cb-hidden';
        overlay.innerHTML = `
        <div class="cb-card" id="cb-card">
            <!-- VIEW 1: LOGIN -->
            <div class="cb-view active" id="cb-v-login">
                <div class="cb-logo">CEREBRO ESTRUCTURAL v5.5</div>
                <p class="cb-title">Herramienta Profesional de Análisis Estructural</p>
                <p class="cb-sub">Armaduras 2D + Vigas • Ing. Ulianov Cuba Valencia</p>

                <label style="font-size:11.5px;font-weight:700;color:#94a3b8;display:block;margin-bottom:4px">Tu correo institucional o Google:</label>
                <input id="cb-email" class="cb-input" type="email" placeholder="tu@continental.edu.pe o @gmail.com" autocomplete="email">
                <div style="display:flex;gap:6px;margin-bottom:10px;flex-wrap:wrap">
                    <span class="cb-chip" data-d="@continental.edu.pe">@continental.edu.pe</span>
                    <span class="cb-chip" data-d="@gmail.com">@gmail.com</span>
                    <span class="cb-chip" data-d="@hotmail.com">@hotmail.com</span>
                </div>
                <label style="font-size:11.5px;font-weight:700;color:#94a3b8;display:block;margin-bottom:4px">Tu nombre completo:</label>
                <input id="cb-name" class="cb-input" type="text" placeholder="Nombre y Apellido">
                <div id="cb-login-err" class="cb-err"></div>
                <button id="cb-btn-continue" class="cb-btn cb-btn-primary" style="margin-top:8px">Continuar →</button>
                <hr class="cb-sep">
                <div style="text-align:center"><span id="cb-link-admin" class="cb-link">⚙️ Administrador del sistema</span></div>
            </div>

            <!-- VIEW 2: YAPE PAYWALL -->
            <div class="cb-view" id="cb-v-yape">
                <div class="cb-logo" style="background:linear-gradient(135deg,#4a1942,#742284)">ACTIVAR ACCESO — ${YAPE.amount}</div>
                <p class="cb-title" style="margin-top:6px">Activación de Licencia</p>
                <p class="cb-sub">Realiza el pago y envía tu comprobante al Ing. Ulianov para que active tu cuenta.</p>

                <div style="background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);border-radius:8px;padding:7px 10px;margin-bottom:8px;font-size:11.5px">
                    Cuenta: <strong id="cb-yape-email" style="color:#38bdf8;font-family:monospace"></strong>
                </div>

                <div class="cb-qr-box">
                    <div style="font-size:11px;font-weight:800;color:#34d399;margin-bottom:4px">📲 ESCANEA O YAPEA AL NÚMERO:</div>
                    <img src="${YAPE.qr}" class="cb-qr-img" alt="QR Yape">
                    <div style="margin-top:6px;font-size:12px;font-weight:900;color:#fff">
                        Titular: <span style="color:#34d399">${YAPE.holder}</span>
                    </div>
                    <div style="font-size:18px;font-weight:900;color:#38bdf8;font-family:monospace;margin:2px 0">${YAPE.display}</div>
                    <div style="font-size:14px;font-weight:900;color:#fbbf24">${YAPE.amount}</div>
                    <button id="cb-copy-phone" style="margin-top:6px;background:#742284;border:1px solid #34d399;color:#fff;border-radius:6px;padding:4px 12px;font-size:11px;font-weight:800;cursor:pointer">📋 Copiar ${YAPE.phone}</button>
                </div>

                <a id="cb-wa-link" href="#" target="_blank" rel="noopener" style="display:flex;align-items:center;justify-content:center;gap:8px;background:#25D366;color:#fff;text-decoration:none;border-radius:9px;padding:10px;font-size:12.5px;font-weight:800;margin-bottom:10px">
                    📲 Enviar comprobante por WhatsApp al Ing. Ulianov
                </a>

                <hr class="cb-sep">
                <p style="font-size:11.5px;font-weight:700;color:#94a3b8;margin-bottom:6px">¿Ya tienes tu código de acceso?</p>
                <input id="cb-code-input" class="cb-input" type="text" placeholder="ACC-XXXX-XXXX" style="font-family:monospace;text-transform:uppercase;text-align:center">
                <div id="cb-code-err" class="cb-err"></div>
                <button id="cb-btn-activate" class="cb-btn cb-btn-primary">🔓 Activar con Código</button>
                <div style="margin-top:10px;text-align:center"><span id="cb-back-login" class="cb-link">← Cambiar correo</span></div>
            </div>

            <!-- VIEW 3: ADMIN LOGIN -->
            <div class="cb-view" id="cb-v-admin">
                <div class="cb-logo" style="background:linear-gradient(135deg,#1e3a5f,#1e293b)">👑 PANEL ADMINISTRADOR</div>
                <p class="cb-title" style="margin-top:6px">Ing. Ulianov Cuba Valencia</p>
                <p class="cb-sub">Ingresa la contraseña maestra para acceder al panel de control.</p>
                <input id="cb-admin-pass" class="cb-input" type="password" placeholder="Contraseña maestra...">
                <div id="cb-admin-err" class="cb-err"></div>
                <button id="cb-btn-admin-login" class="cb-btn cb-btn-primary">⚡ Ingresar como Administrador</button>
                <div style="margin-top:10px;text-align:center"><span id="cb-back-from-admin" class="cb-link">← Volver</span></div>
            </div>
        </div>`;
        document.body.appendChild(overlay);

        // VIEW 2 (wide) for admin panel — separate modal
        const adminPanel = document.createElement('div');
        adminPanel.id = 'cb-panel-overlay';
        adminPanel.className = 'cb-hidden';
        adminPanel.innerHTML = `
        <div class="cb-card cb-card-wide" id="cb-panel-card">
            <div class="cb-panel-header">
                <p class="cb-panel-title">👑 Panel de Control — Ing. Ulianov Cuba Valencia</p>
                <button id="cb-panel-close" class="cb-sbtn cb-sbtn-gray" style="padding:5px 10px;font-size:12px">✕ Cerrar</button>
            </div>
            <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px">
                <div style="flex:1;min-width:220px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.1);border-radius:8px;padding:10px">
                    <div style="font-size:11px;font-weight:800;color:#34d399;margin-bottom:6px">⚡ AUTORIZACIÓN RÁPIDA</div>
                    <input id="cb-quick-email" class="cb-input" type="email" placeholder="correo@alumno.edu.pe" style="font-size:12px;margin-bottom:6px">
                    <input id="cb-quick-name" class="cb-input" type="text" placeholder="Nombre del alumno" style="font-size:12px;margin-bottom:6px">
                    <div style="display:flex;gap:6px">
                        <button id="cb-quick-access" class="cb-sbtn cb-sbtn-green" style="flex:1;padding:7px">✔ Dar Acceso</button>
                        <button id="cb-quick-excel" class="cb-sbtn cb-sbtn-blue" style="flex:1;padding:7px">📊 + Excel</button>
                    </div>
                </div>
                <div style="flex:1;min-width:220px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.1);border-radius:8px;padding:10px">
                    <div style="font-size:11px;font-weight:800;color:#38bdf8;margin-bottom:6px">🔑 CONSULTAR CÓDIGO</div>
                    <input id="cb-lookup-email" class="cb-input" type="text" placeholder="correo@alumno.edu.pe" style="font-size:12px;margin-bottom:6px">
                    <div id="cb-lookup-result" style="font-size:11px;font-family:monospace;color:#34d399;min-height:30px;word-break:break-all"></div>
                </div>
            </div>

            <div style="font-size:12px;font-weight:800;color:#fff;margin-bottom:8px">
                📋 Alumnos Registrados (<span id="cb-count">0</span>):
                <button id="cb-refresh-list" style="margin-left:8px;background:rgba(255,255,255,.1);border:none;border-radius:4px;padding:2px 8px;font-size:10.5px;color:#94a3b8;cursor:pointer">↻ Actualizar</button>
            </div>
            <div id="cb-students-list" style="max-height:320px;overflow-y:auto"></div>

            <div style="margin-top:12px;text-align:right">
                <button id="cb-admin-logout" class="cb-sbtn cb-sbtn-red" style="padding:7px 14px;font-size:11.5px">🔒 Salir del Panel Admin</button>
            </div>
        </div>`;
        document.body.appendChild(adminPanel);

        // ── CSS for panel overlay ────────────────────────────────
        const css2 = document.createElement('style');
        css2.textContent = `#cb-panel-overlay{position:fixed;inset:0;z-index:999999;background:rgba(3,7,18,.92);display:flex;align-items:center;justify-content:center;padding:16px;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}#cb-panel-overlay.cb-hidden{display:none}`;
        document.head.appendChild(css2);

        bindEvents();
    }

    function switchView(id) {
        document.querySelectorAll('#cb-overlay .cb-view').forEach(v => v.classList.remove('active'));
        document.getElementById(id).classList.add('active');
    }

    // ── BINDINGS ─────────────────────────────────────────────────
    function bindEvents() {
        // Domain chips
        document.querySelectorAll('.cb-chip[data-d]').forEach(chip => {
            chip.onclick = () => {
                const inp = document.getElementById('cb-email');
                const d = chip.dataset.d;
                const v = (inp.value || '').trim();
                inp.value = v.includes('@') ? v.split('@')[0] + d : v + d;
                inp.focus();
            };
        });

        // Continue button
        document.getElementById('cb-btn-continue').onclick = handleContinue;
        document.getElementById('cb-email').onkeydown = e => { if (e.key === 'Enter') handleContinue(); };

        // Links
        document.getElementById('cb-link-admin').onclick = () => switchView('cb-v-admin');
        document.getElementById('cb-back-login').onclick = () => switchView('cb-v-login');
        document.getElementById('cb-back-from-admin').onclick = () => switchView('cb-v-login');

        // Copy phone
        document.getElementById('cb-copy-phone').onclick = () => {
            navigator.clipboard.writeText(YAPE.phone).then(() => alert('📋 Número copiado: ' + YAPE.phone)).catch(() => {});
        };

        // Activate with code
        document.getElementById('cb-btn-activate').onclick = handleCodeActivate;
        document.getElementById('cb-code-input').onkeydown = e => { if (e.key === 'Enter') handleCodeActivate(); };
        document.getElementById('cb-code-input').oninput = e => { e.target.value = e.target.value.toUpperCase(); };

        // Admin login
        document.getElementById('cb-btn-admin-login').onclick = handleAdminLogin;
        document.getElementById('cb-admin-pass').onkeydown = e => { if (e.key === 'Enter') handleAdminLogin(); };

        // Admin panel events
        document.getElementById('cb-panel-close').onclick = hidePanelModal;
        document.getElementById('cb-admin-logout').onclick = () => { hidePanelModal(); clearSession(); location.reload(); };
        document.getElementById('cb-quick-access').onclick = quickAccess;
        document.getElementById('cb-quick-excel').onclick = quickExcel;
        document.getElementById('cb-refresh-list').onclick = renderStudentList;

        document.getElementById('cb-lookup-email').oninput = function () {
            const email = this.value.trim().toLowerCase();
            const el = document.getElementById('cb-lookup-result');
            if (!email || !email.includes('@')) { el.textContent = ''; return; }
            el.innerHTML = `ACCESO: <strong>${accessCode(email)}</strong><br>EXCEL:&nbsp;&nbsp; <strong>${excelCode(email)}</strong>`;
        };
    }

    // ── HANDLERS ─────────────────────────────────────────────────
    let _pendingEmail = '', _pendingName = '';

    function handleContinue() {
        const email = (document.getElementById('cb-email').value || '').trim().toLowerCase();
        const name  = (document.getElementById('cb-name').value || '').trim() || email.split('@')[0];
        const errEl = document.getElementById('cb-login-err');
        errEl.style.display = 'none';

        // Master password check in email field
        if (MASTER.includes(document.getElementById('cb-email').value.trim())) {
            grantAdmin(); return;
        }

        if (!email || !email.includes('@')) {
            errEl.textContent = 'Por favor ingresa un correo válido.';
            errEl.style.display = 'block'; return;
        }
        if (isBanned(email)) {
            errEl.textContent = '🚫 Esta cuenta ha sido bloqueada por el administrador.';
            errEl.style.display = 'block'; return;
        }

        _pendingEmail = email; _pendingName = name;
        recordStudent(email, name);

        if (isAuthorized(email)) {
            setSession({ role: 'student', email, name });
            hideAuthModal(); updateHeader(); return;
        }

        // Show Yape paywall
        document.getElementById('cb-yape-email').textContent = `${name} (${email})`;
        const waMsg = encodeURIComponent(`Hola Ing. Ulianov, yapé ${YAPE.amount} al ${YAPE.phone} (${YAPE.holder}) para activar mi acceso: ${email} — ${name}. Por favor actívame.`);
        document.getElementById('cb-wa-link').href = `https://api.whatsapp.com/send?phone=51${YAPE.phone}&text=${waMsg}`;
        switchView('cb-v-yape');
    }

    function handleCodeActivate() {
        const code  = (document.getElementById('cb-code-input').value || '').trim().toUpperCase();
        const errEl = document.getElementById('cb-code-err');
        errEl.style.display = 'none';

        if (MASTER.some(m => m.toUpperCase() === code)) { grantAdmin(); return; }

        if (!_pendingEmail) { switchView('cb-v-login'); return; }

        const expected = accessCode(_pendingEmail);
        if (code === expected) {
            authorizeUser(_pendingEmail, _pendingName);
            setSession({ role: 'student', email: _pendingEmail, name: _pendingName });
            hideAuthModal(); updateHeader();
        } else {
            errEl.textContent = `Código incorrecto. Escribe al Ing. Ulianov por WhatsApp con tu comprobante.`;
            errEl.style.display = 'block';
        }
    }

    function handleAdminLogin() {
        const pass = (document.getElementById('cb-admin-pass').value || '').trim();
        const errEl = document.getElementById('cb-admin-err');
        if (MASTER.includes(pass)) {
            grantAdmin();
        } else {
            errEl.textContent = '❌ Contraseña incorrecta.';
            errEl.style.display = 'block';
        }
    }

    function grantAdmin() {
        setSession({ role: 'admin', email: 'ulianov.continental@gmail.com', name: 'Ing. Ulianov Cuba (Admin)' });
        hideAuthModal();
        showPanelModal();
        updateHeader();
    }

    // ── ADMIN PANEL ──────────────────────────────────────────────
    function quickAccess() {
        const email = (document.getElementById('cb-quick-email').value || '').trim().toLowerCase();
        const name  = (document.getElementById('cb-quick-name').value || '').trim() || email.split('@')[0];
        if (!email || !email.includes('@')) { alert('Ingresa un correo válido'); return; }
        authorizeUser(email, name);
        alert(`✔ Acceso otorgado a ${email}\nCódigo Acceso: ${accessCode(email)}\nCódigo Excel:  ${excelCode(email)}`);
        renderStudentList();
    }

    function quickExcel() {
        const email = (document.getElementById('cb-quick-email').value || '').trim().toLowerCase();
        if (!email || !email.includes('@')) { alert('Ingresa un correo válido'); return; }
        authorizeUser(email, (document.getElementById('cb-quick-name').value || '').trim() || email.split('@')[0]);
        grantExcel(email);
        alert(`✔ Acceso + Excel otorgados a ${email}\nCódigo Acceso: ${accessCode(email)}\nCódigo Excel:  ${excelCode(email)}`);
        renderStudentList();
    }

    function renderStudentList() {
        const list = document.getElementById('cb-students-list');
        const count = document.getElementById('cb-count');
        if (!list) return;
        const students = loadArr(KEY.students);
        count.textContent = students.length;
        if (students.length === 0) {
            list.innerHTML = '<div style="text-align:center;color:#64748b;font-size:11.5px;padding:20px">Aún no hay alumnos registrados.</div>';
            return;
        }
        list.innerHTML = students.map(s => {
            const auth = isAuthorized(s.email);
            const ban  = isBanned(s.email);
            const xls  = hasExcel(s.email);
            const badge = ban ? '<span class="cb-badge-ban">BANEADO</span>' : auth ? '<span class="cb-badge-ok">ACTIVO</span>' : '<span class="cb-badge-pend">PENDIENTE</span>';
            const xlsBadge = xls ? '<span class="cb-badge-xls">+EXCEL</span>' : '';
            const ac = accessCode(s.email);
            const ec = excelCode(s.email);
            return `<div class="cb-student-row" data-email="${s.email}">
                <div class="cb-student-info">
                    <div class="cb-student-email">${s.email} ${badge}${xlsBadge}</div>
                    <div style="font-size:11px;color:#cbd5e1;margin-top:1px">${s.name || ''} · Reg: ${new Date(s.ts || Date.now()).toLocaleDateString('es-PE')}</div>
                    <div class="cb-student-codes">ACC: ${ac} &nbsp;|&nbsp; XLS: ${ec}</div>
                </div>
                <div class="cb-student-actions">
                    ${auth ? `<button class="cb-sbtn cb-sbtn-yellow" data-action="revoke" data-email="${s.email}">Pausar</button>` : `<button class="cb-sbtn cb-sbtn-green" data-action="auth" data-email="${s.email}">✔ Acceso</button>`}
                    ${xls ? `<button class="cb-sbtn cb-sbtn-gray" data-action="revoke-xls" data-email="${s.email}">Quitar Excel</button>` : `<button class="cb-sbtn cb-sbtn-blue" data-action="grant-xls" data-email="${s.email}">📊 Excel</button>`}
                    ${ban ? `<button class="cb-sbtn cb-sbtn-green" data-action="unban" data-email="${s.email}">🔄 Des-banear</button>` : `<button class="cb-sbtn cb-sbtn-red" data-action="ban" data-email="${s.email}">🚫 Banear</button>`}
                    <button class="cb-sbtn cb-sbtn-gray" data-action="copy-codes" data-email="${s.email}" data-ac="${ac}" data-ec="${ec}" data-name="${s.name}">📋 WA</button>
                </div>
            </div>`;
        }).join('');

        list.querySelectorAll('[data-action]').forEach(btn => {
            btn.onclick = () => {
                const { action, email, ac, ec, name } = btn.dataset;
                if (action === 'auth')       { authorizeUser(email, name); }
                else if (action === 'revoke') { revokeUser(email); }
                else if (action === 'ban')    { banUser(email); }
                else if (action === 'unban')  { unbanUser(email); }
                else if (action === 'grant-xls')  { grantExcel(email); }
                else if (action === 'revoke-xls') { revokeExcel(email); }
                else if (action === 'copy-codes') {
                    const msg = `Hola ${name}, te confirmo tu acceso a CEREBRO ESTRUCTURAL PRO.\n✅ Código de Acceso: ${ac}\n📊 Código Excel: ${ec}\nEntra en: https://72008081-pixel.github.io/Ulianov-Continental/`;
                    navigator.clipboard.writeText(msg).then(() => alert('📋 Mensaje copiado para WhatsApp!')).catch(() => { alert(msg); });
                    return;
                }
                renderStudentList();
            };
        });
    }

    // ── VISIBILIDAD ──────────────────────────────────────────────
    function showAuthModal() { buildModal(); document.getElementById('cb-overlay').classList.remove('cb-hidden'); }
    function hideAuthModal() { const o = document.getElementById('cb-overlay'); if (o) o.classList.add('cb-hidden'); }
    function showPanelModal() {
        buildModal();
        const p = document.getElementById('cb-panel-overlay'); if (p) p.classList.remove('cb-hidden');
        renderStudentList();
    }
    function hidePanelModal() { const p = document.getElementById('cb-panel-overlay'); if (p) p.classList.add('cb-hidden'); }

    // ── HEADER ───────────────────────────────────────────────────
    function updateHeader() {
        const s = getSession();
        // Find or create header button
        let btn = document.getElementById('cb-header-btn');
        if (!btn) return;
        if (s && s.role === 'admin') {
            btn.textContent = '👑 Panel Admin';
            btn.onclick = showPanelModal;
        } else if (s && checkAuthorized()) {
            btn.textContent = '👤 ' + (s.name || s.email);
            btn.onclick = () => {
                if (confirm('¿Cerrar sesión?')) { clearSession(); location.reload(); }
            };
        } else {
            btn.textContent = '🔒 Iniciar Sesión';
            btn.onclick = showAuthModal;
        }
    }

    // ── API PÚBLICA ──────────────────────────────────────────────
    window.CerebroAuth = {
        isAuthorized: () => checkAuthorized(),
        isAdmin: () => { const s = getSession(); return s && s.role === 'admin'; },
        hasExcelPermission: () => {
            const s = getSession();
            if (!s) return false;
            if (s.role === 'admin') return true;
            return hasExcel(s.email);
        },
        showExcelVipNotice: () => {
            const s = getSession();
            if (!s) return;
            const ec = excelCode(s.email);
            alert(`📊 Para descargar el Excel (.xlsx) con fórmulas nativas necesitas el Código Excel.\n\nSolicita al Ing. Ulianov por WhatsApp (${YAPE.display}) enviando tu comprobante de Yape.\n\nCuando el Ing. te lo envíe, tu código será:\n${ec}`);
        },
        showAdminPanel: showPanelModal
    };

    // ── INIT ─────────────────────────────────────────────────────
    function init() {
        buildModal();
        updateHeader();

        // Check VIP token in URL
        const params = new URLSearchParams(location.search);
        const vipToken = params.get('vip');
        if (vipToken === 'DOCENTE_VIP_ULIANOV') {
            setSession({ role: 'student', email: 'docente.vip@continental.edu.pe', name: 'Ing. Ulianov Cuba (Docente VIP)' });
            const w = load(KEY.whitelist);
            w['docente.vip@continental.edu.pe'] = { email: 'docente.vip@continental.edu.pe', name: 'Ing. Ulianov (Docente VIP)', ts: Date.now() };
            save(KEY.whitelist, w);
            grantExcel('docente.vip@continental.edu.pe');
            updateHeader(); return;
        }

        if (checkAuthorized()) { updateHeader(); return; }
        showAuthModal();
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();
