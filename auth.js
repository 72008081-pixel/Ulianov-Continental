/**
 * auth.js — CEREBRO ESTRUCTURAL PRO v6.1
 * Sistema de Control de Acceso, Privacidad Estricta de Licencias y Base de Proyectos
 * - Solicitud de aporte voluntario por Yape para todo usuario nuevo
 * - PRIVACIDAD ESTRICTA: El panel y botones de admin NUNCA son visibles para alumnos ni docente
 * - Solo el administrador (Vayolett1404) activa el panel y botones de control
 * - 2 códigos independientes por usuario: ACCESO + EXCEL
 * - Herramienta de activación rápida de WhatsApp (procesa mensaje o correo y copia respuesta)
 * - Base de datos local unificada de proyectos guardados (window.CerebroDB)
 * Desarrollado por Ing. Ulianov Cuba Valencia — Cusco, Perú • 933 685 462
 */
(function () {
    'use strict';

    // ── CONSTANTES ──────────────────────────────────────────────
    const MASTER = ['Vayolett1404', 'vayolett1404'];
    const SALT   = 'ULIANOV_CEREBRO_V55_SALT_2026';
    const YAPE   = {
        holder: 'Ulianov Sabath Cuba Valencia',
        phone: '933685462',
        display: '933 685 462',
        amount: 'Aporte voluntario',
        qr: 'assets/yape_qr_ulianov.png'
    };

    const KEY = {
        session:   'cb_session_v55',
        whitelist: 'cb_access_v55',
        banned:    'cb_banned_v55',
        excel:     'cb_excel_v55',
        students:  'cb_students_v55',
        device:    'cb_device_v55',
        trusses:   'cb_saved_trusses_v61',
        beams:     'cb_saved_beams_v61'
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
        if (!email) return 'ACC-0000-0000';
        const h = sha256(email.toLowerCase().trim() + SALT + '_ACCESS').toUpperCase();
        return 'ACC-' + h.slice(0, 4) + '-' + h.slice(4, 8);
    }
    function excelCode(email) {
        if (!email) return 'XLS-0000-0000';
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
        if (!email) return;
        email = email.toLowerCase().trim();
        const w = load(KEY.whitelist); w[email] = { email, name, ts: Date.now() }; save(KEY.whitelist, w);
        recordStudent(email, name);
    }
    function revokeUser(email)  { if (!email) return; email = email.toLowerCase().trim(); const w = load(KEY.whitelist); delete w[email]; save(KEY.whitelist, w); }
    function banUser(email)     { if (!email) return; email = email.toLowerCase().trim(); const b = load(KEY.banned); b[email] = true; save(KEY.banned, b); revokeUser(email); }
    function unbanUser(email)   { if (!email) return; email = email.toLowerCase().trim(); const b = load(KEY.banned); delete b[email]; save(KEY.banned, b); }
    function grantExcel(email)  { if (!email) return; email = email.toLowerCase().trim(); const e = load(KEY.excel); e[email] = true; save(KEY.excel, e); }
    function revokeExcel(email) { if (!email) return; email = email.toLowerCase().trim(); const e = load(KEY.excel); delete e[email]; save(KEY.excel, e); }

    function recordStudent(email, name) {
        if (!email) return;
        email = email.toLowerCase().trim();
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
        if (s.role === 'admin' || s.role === 'docente') return true;
        if (s.role === 'student' && isAuthorized(s.email) && !isBanned(s.email)) return true;
        clearSession();
        return false;
    }

    function isAdmin() {
        const s = getSession();
        return !!(s && s.role === 'admin');
    }

    // ── ESTILOS ──────────────────────────────────────────────────
    const css = document.createElement('style');
    css.textContent = `
#cb-overlay{position:fixed;inset:0;z-index:999999;background:rgba(3,7,18,.92);display:flex;align-items:center;justify-content:center;padding:16px;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
#cb-overlay.cb-hidden{display:none}
.cb-card{background:#0f172a;border:1.5px solid rgba(255,255,255,.15);border-top:1.5px solid rgba(255,255,255,.3);border-radius:18px;max-width:460px;width:100%;padding:22px;box-shadow:0 24px 64px rgba(0,0,0,.8);color:#f8fafc;position:relative;max-height:94vh;overflow-y:auto;animation:cbpop .2s ease}
.cb-card-wide{max-width:760px}
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
.cb-sbtn{padding:4px 8px;border:none;border-radius:5px;font-size:10.5px;font-weight:800;cursor:pointer;white-space:nowrap;transition:all .15s}
.cb-sbtn-green{background:#059669;color:#fff}
.cb-sbtn-blue{background:#0284c7;color:#fff}
.cb-sbtn-yellow{background:#d97706;color:#fff}
.cb-sbtn-red{background:#dc2626;color:#fff}
.cb-sbtn-gray{background:rgba(255,255,255,.12);border:1px solid rgba(255,255,255,.15);color:#cbd5e1}
.cb-badge-ok{background:#059669;color:#fff;font-size:9.5px;font-weight:800;padding:1px 6px;border-radius:99px}
.cb-badge-ban{background:#dc2626;color:#fff;font-size:9.5px;font-weight:800;padding:1px 6px;border-radius:99px}
.cb-badge-pend{background:#d97706;color:#fff;font-size:9.5px;font-weight:800;padding:1px 6px;border-radius:99px}
.cb-badge-xls{background:#7c3aed;color:#fff;font-size:9.5px;font-weight:800;padding:1px 6px;border-radius:99px;margin-left:4px}
#cb-floating-admin{position:fixed;bottom:16px;right:16px;z-index:999990;padding:8px 16px;background:#fbcfe8;color:#000000;border:1.5px solid #f472b6;border-radius:99px;font-size:12px;font-weight:900;box-shadow:0 4px 16px rgba(0,0,0,0.6);cursor:pointer;transition:transform 0.15s;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;letter-spacing:0.3px;display:none;align-items:center;gap:6px}
#cb-floating-admin:hover{transform:scale(1.05)}
`;
    document.head.appendChild(css);

    // ── MODAL DOM ────────────────────────────────────────────────
    function buildModal() {
        if (document.getElementById('cb-overlay')) return;

        const overlay = document.createElement('div');
        overlay.id = 'cb-overlay';
        overlay.className = 'cb-hidden';
        overlay.innerHTML = `
        <div class="cb-card" id="cb-card">
            <!-- VIEW 1: REGISTRO / LOGIN -->
            <div class="cb-view active" id="cb-v-login">
                <div class="cb-logo">CEREBRO ESTRUCTURAL PRO v6.1</div>
                <p class="cb-title">Acceso de Estudiante</p>
                <p class="cb-sub">Ingresa tu correo institucional o personal para iniciar.</p>

                <input id="cb-email" class="cb-input" type="email" placeholder="tu.correo@continental.edu.pe" autocomplete="email">
                <input id="cb-name"  class="cb-input" type="text"  placeholder="Tu nombre y apellido (opcional)">

                <div style="display:flex;gap:5px;flex-wrap:wrap;margin-bottom:10px">
                    <span class="cb-chip" data-d="@continental.edu.pe">@continental.edu.pe</span>
                    <span class="cb-chip" data-d="@gmail.com">@gmail.com</span>
                    <span class="cb-chip" data-d="@hotmail.com">@hotmail.com</span>
                </div>

                <div id="cb-login-err" class="cb-err"></div>

                <button id="cb-btn-continue" class="cb-btn cb-btn-primary" style="margin-top:4px">
                    Continuar ➔
                </button>

                <p style="font-size:11px;color:#64748b;margin-top:12px;line-height:1.4;text-align:center">
                    Cálculo Matricial de Armaduras 2D y Vigas Continuas con la Plantilla Oficial del Ing. Ulianov Cuba Valencia.
                </p>

                <hr class="cb-sep">
                <div style="text-align:center"><span id="cb-link-admin" class="cb-link">⚙️ Administrador del sistema</span></div>
            </div>

            <!-- VIEW 2: YAPE PAYWALL -->
            <div class="cb-view" id="cb-v-yape">
                <div class="cb-logo" style="background:linear-gradient(135deg,#4a1942,#742284)">ACTIVAR ACCESO — ${YAPE.amount}</div>
                <p class="cb-title" style="margin-top:6px">Activación de Licencia</p>
                <p class="cb-sub">Aporta el monto que puedas y envía tu comprobante al Ing. Ulianov para que active tu cuenta.</p>

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
                <div>
                    <p class="cb-panel-title">👑 Panel de Control — Ing. Ulianov Cuba Valencia</p>
                    <div style="font-size:11px;color:#94a3b8;margin-top:2px">Gestión Maestra de Licencias, Códigos y Base de Proyectos • Cusco, Perú</div>
                </div>
                <button id="cb-panel-close" class="cb-sbtn cb-sbtn-gray" style="padding:5px 12px;font-size:12px">✕ Cerrar</button>
            </div>

            <!-- ENLACE VIP DOCENTE / INGENIERO -->
            <div style="background: rgba(13, 148, 136, 0.15); border: 1.5px solid #0d9488; border-radius: 9px; padding: 10px 14px; margin-bottom: 12px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;">
                <div>
                    <div style="font-size: 11.5px; font-weight: 800; color: #2dd4bf; display: flex; align-items: center; gap: 6px;">
                        👨‍🏫 ENLACE DIRECTO PARA EL INGENIERO / DOCENTE
                    </div>
                    <div style="font-size: 10.5px; color: #94a3b8; margin-top: 2px;">
                        Acceso directo sin muro de pago con rol de Docente y descarga de Excel habilitada.
                    </div>
                </div>
                <div style="display: flex; gap: 6px;">
                    <button id="cb-copy-docente-link" class="cb-sbtn cb-sbtn-green" style="padding: 6px 13px; font-size: 11px; font-weight: 800;">
                        📋 Copiar Link Docente
                    </button>
                    <button id="cb-open-docente-link" class="cb-sbtn cb-sbtn-blue" style="padding: 6px 11px; font-size: 11px; font-weight: 800;">
                        🔗 Abrir
                    </button>
                </div>
            </div>

            <!-- ACTIVACIÓN RÁPIDA DESDE WHATSAPP O CORREO -->
            <div style="background: rgba(30, 41, 59, 0.7); border: 1px solid rgba(255, 255, 255, 0.12); border-radius: 10px; padding: 12px; margin-bottom: 12px;">
                <div style="font-size: 11.5px; font-weight: 800; color: #34d399; margin-bottom: 6px; display: flex; align-items: center; gap: 6px;">
                    📥 ACTIVAR ALUMNO DESDE WHATSAPP / CORREO
                </div>
                <div style="font-size: 10.5px; color: #94a3b8; margin-bottom: 8px;">
                    Pega el texto del WhatsApp que te envió el alumno o escribe directamente su correo y nombre. El sistema extraerá los datos, activará la cuenta y copiará el mensaje de confirmación con sus 2 códigos al portapapeles.
                </div>
                <textarea id="cb-wa-paste-input" class="cb-input" rows="2" placeholder="Ej: Hola Ing. Ulianov, yapé S/ 15.00 al 933685462 para activar mi acceso: alumno@continental.edu.pe — Juan Pérez." style="font-size: 12px; margin-bottom: 8px; resize: vertical;"></textarea>
                <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                    <button id="cb-wa-process-access" class="cb-sbtn cb-sbtn-green" style="padding: 7px 14px; font-size: 11.5px;">
                        ⚡ Activar Acceso + Copiar WA
                    </button>
                    <button id="cb-wa-process-full" class="cb-sbtn cb-sbtn-blue" style="padding: 7px 14px; font-size: 11.5px;">
                        📊 Activar Acceso + Excel + Copiar WA
                    </button>
                    <button id="cb-backup-export" class="cb-sbtn cb-sbtn-gray" style="padding: 7px 12px; font-size: 11px;" title="Descargar copia de seguridad de alumnos en JSON">
                        📥 Exportar Base (JSON)
                    </button>
                    <button id="cb-backup-import" class="cb-sbtn cb-sbtn-gray" style="padding: 7px 12px; font-size: 11px;" title="Importar base de alumnos desde JSON">
                        📤 Importar Base
                    </button>
                    <input type="file" id="cb-backup-file" accept=".json" style="display: none;">
                </div>
            </div>

            <!-- BÚSQUEDA Y CONSULTA DIRECTA -->
            <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px">
                <div style="flex:1;min-width:240px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.1);border-radius:8px;padding:10px">
                    <div style="font-size:11px;font-weight:800;color:#38bdf8;margin-bottom:6px">🔑 CONSULTAR CÓDIGOS DE UN CORREO</div>
                    <input id="cb-lookup-email" class="cb-input" type="text" placeholder="correo@alumno.edu.pe" style="font-size:12px;margin-bottom:6px">
                    <div id="cb-lookup-result" style="font-size:11px;font-family:monospace;color:#34d399;min-height:30px;word-break:break-all"></div>
                </div>
                <div style="flex:1;min-width:240px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.1);border-radius:8px;padding:10px">
                    <div style="font-size:11px;font-weight:800;color:#f472b6;margin-bottom:6px">📁 RESUMEN DE PROYECTOS GUARDADOS</div>
                    <div id="cb-projects-summary" style="font-size:11px;color:#cbd5e1;line-height:1.6">
                        Cargando estadísticas de proyectos...
                    </div>
                </div>
            </div>

            <div style="font-size:12px;font-weight:800;color:#fff;margin-bottom:8px;display:flex;justify-content:space-between;align-items:center">
                <div>
                    📋 Alumnos Registrados (<span id="cb-count">0</span>):
                    <button id="cb-refresh-list" style="margin-left:8px;background:rgba(255,255,255,.1);border:none;border-radius:4px;padding:2px 8px;font-size:10.5px;color:#94a3b8;cursor:pointer">↻ Actualizar</button>
                </div>
                <div style="font-size:10.5px;color:#94a3b8">
                    Total activos: <strong id="cb-count-active" style="color:#34d399">0</strong> | Con Excel: <strong id="cb-count-excel" style="color:#c084fc">0</strong>
                </div>
            </div>
            <div id="cb-students-list" style="max-height:280px;overflow-y:auto"></div>

            <div style="margin-top:14px;display:flex;justify-content:space-between;align-items:center;border-top:1px solid rgba(255,255,255,.1);padding-top:10px">
                <div style="font-size:11px;color:#64748b">
                    Ing. Ulianov Cuba Valencia • Cusco, Perú • Repositorio GitHub
                </div>
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
        const el = document.getElementById(id);
        if (el) el.classList.add('active');
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
        document.getElementById('cb-back-from-admin').onclick = () => {
            if (checkAuthorized()) {
                hideAuthModal();
            } else {
                switchView('cb-v-login');
            }
        };

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
        document.getElementById('cb-refresh-list').onclick = renderStudentList;

        // WhatsApp fast approval processing
        const btnWaAcc = document.getElementById('cb-wa-process-access');
        if (btnWaAcc) btnWaAcc.onclick = () => processWaInput(false);
        const btnWaFull = document.getElementById('cb-wa-process-full');
        if (btnWaFull) btnWaFull.onclick = () => processWaInput(true);

        // JSON Backup Export / Import
        const btnExp = document.getElementById('cb-backup-export');
        if (btnExp) {
            btnExp.onclick = () => {
                const data = {
                    date: new Date().toISOString(),
                    students: loadArr(KEY.students),
                    whitelist: load(KEY.whitelist),
                    excel: load(KEY.excel),
                    banned: load(KEY.banned)
                };
                const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `CEREBRO_ALUMNOS_${new Date().toISOString().slice(0, 10)}.json`;
                a.click();
                URL.revokeObjectURL(url);
            };
        }
        const btnImp = document.getElementById('cb-backup-import');
        const fileImp = document.getElementById('cb-backup-file');
        if (btnImp && fileImp) {
            btnImp.onclick = () => fileImp.click();
            fileImp.onchange = (e) => {
                const file = e.target.files[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = (evt) => {
                    try {
                        const parsed = JSON.parse(evt.target.result);
                        if (parsed.students && Array.isArray(parsed.students)) {
                            save(KEY.students, parsed.students);
                            if (parsed.whitelist) save(KEY.whitelist, parsed.whitelist);
                            if (parsed.excel) save(KEY.excel, parsed.excel);
                            if (parsed.banned) save(KEY.banned, parsed.banned);
                            alert(`✔ Base de datos importada exitosamente con ${parsed.students.length} alumnos.`);
                            renderStudentList();
                        } else {
                            alert('El archivo no tiene el formato esperado.');
                        }
                    } catch (err) {
                        alert('Error al leer el archivo JSON: ' + err.message);
                    }
                };
                reader.readAsText(file);
            };
        }

        // Docente VIP link copy & open
        const copyDocBtn = document.getElementById('cb-copy-docente-link');
        if (copyDocBtn) {
            copyDocBtn.onclick = () => {
                const url = new URL(location.href);
                url.searchParams.set('vip', 'DOCENTE_VIP_ULIANOV');
                const finalUrl = url.toString();
                navigator.clipboard.writeText(finalUrl).then(() => {
                    alert('✔ ¡Enlace VIP de Docente copiado al portapapeles!\n\n' + finalUrl + '\n\nEnvíalo al Ingeniero para acceso directo sin muro de pago.');
                }).catch(() => {
                    prompt('Copia este enlace para el Ingeniero:', finalUrl);
                });
            };
        }
        const openDocBtn = document.getElementById('cb-open-docente-link');
        if (openDocBtn) {
            openDocBtn.onclick = () => {
                const url = new URL(location.href);
                url.searchParams.set('vip', 'DOCENTE_VIP_ULIANOV');
                window.open(url.toString(), '_blank');
            };
        }

        document.getElementById('cb-lookup-email').oninput = function () {
            const email = this.value.trim().toLowerCase();
            const el = document.getElementById('cb-lookup-result');
            if (!email || !email.includes('@')) { el.textContent = ''; return; }
            el.innerHTML = `ACCESO: <strong>${accessCode(email)}</strong><br>EXCEL:&nbsp;&nbsp; <strong>${excelCode(email)}</strong>`;
        };
    }

    // ── PARSEO DE WHATSAPP / CORREO RÁPIDO ───────────────────────
    function processWaInput(withExcel) {
        const input = document.getElementById('cb-wa-paste-input');
        if (!input) return;
        const raw = (input.value || '').trim();
        if (!raw) {
            alert('Por favor pega el mensaje de WhatsApp o escribe el correo del alumno.');
            return;
        }

        // Intentar extraer email
        const emailMatch = raw.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
        if (!emailMatch) {
            alert('No se detectó ningún correo válido en el texto ingresado.');
            return;
        }
        const email = emailMatch[0].toLowerCase().trim();

        // Intentar extraer nombre
        let name = '';
        const idx = raw.indexOf(emailMatch[0]);
        const afterEmail = idx >= 0 ? raw.slice(idx + emailMatch[0].length) : raw;
        const dashMatch = afterEmail.match(/[—\-]\s*([^.,\n\r]+)/) || raw.match(/[—\-]\s*([^.,\n\r]+)/);
        if (dashMatch && dashMatch[1].trim().length > 1) {
            name = dashMatch[1].trim();
        } else {
            name = email.split('@')[0];
        }

        // Autorizar
        authorizeUser(email, name);
        if (withExcel) {
            grantExcel(email);
        }

        const ac = accessCode(email);
        const ec = excelCode(email);

        const replyMsg = `Hola ${name}, te confirmo la activación de tu licencia en CEREBRO ESTRUCTURAL PRO v6.1:\n\n` +
            `✅ Código de Acceso: ${ac}\n` +
            (withExcel ? `📊 Código de Descarga Excel: ${ec}\n` : '') +
            `🌐 Ingresa aquí: https://72008081-pixel.github.io/Ulianov-Continental/\n\n` +
            `¡Muchos éxitos en tu cátedra de Análisis Estructural II!\n— Ing. Ulianov Cuba Valencia`;

        navigator.clipboard.writeText(replyMsg).then(() => {
            alert(`✔ ¡ALUMNO ACTIVADO CON ÉXITO!\n\nEmail: ${email}\nNombre: ${name}\nAcceso: ${ac}\nExcel: ${ec}\n\n📋 ¡El mensaje de respuesta para WhatsApp ha sido COPIADO a tu portapapeles! Solo ve a WhatsApp y dale Pegar (Ctrl+V).`);
        }).catch(() => {
            prompt('Copia esta respuesta para enviarla por WhatsApp al alumno:', replyMsg);
        });

        input.value = '';
        renderStudentList();
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
        updateHeader();
        showPanelModal();
    }

    // ── ADMIN PANEL ──────────────────────────────────────────────
    function renderStudentList() {
        const list = document.getElementById('cb-students-list');
        const count = document.getElementById('cb-count');
        const countActive = document.getElementById('cb-count-active');
        const countExcel = document.getElementById('cb-count-excel');
        const projSummary = document.getElementById('cb-projects-summary');

        if (!list) return;
        const students = loadArr(KEY.students);
        count.textContent = students.length;

        let activeNum = 0, excelNum = 0;

        if (projSummary && window.CerebroDB) {
            const allProj = window.CerebroDB.getAllProjects();
            projSummary.innerHTML = `🏗️ Armaduras guardadas: <strong>${allProj.trusses.length}</strong><br>📐 Vigas guardadas: <strong>${allProj.beams.length}</strong><br><span style="color:#94a3b8;font-size:10px">Disponibles en el menú de cada módulo.</span>`;
        }

        if (students.length === 0) {
            list.innerHTML = '<div style="text-align:center;color:#64748b;font-size:11.5px;padding:20px">Aún no hay alumnos registrados. Puedes registrarlos pegando sus datos en el cuadro superior.</div>';
            if (countActive) countActive.textContent = '0';
            if (countExcel) countExcel.textContent = '0';
            return;
        }

        list.innerHTML = students.map(s => {
            const auth = isAuthorized(s.email);
            const ban  = isBanned(s.email);
            const xls  = hasExcel(s.email);
            if (auth && !ban) activeNum++;
            if (xls) excelNum++;

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

        if (countActive) countActive.textContent = activeNum;
        if (countExcel) countExcel.textContent = excelNum;

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
                    const msg = `Hola ${name}, te confirmo tu acceso a CEREBRO ESTRUCTURAL PRO v6.1.\n✅ Código de Acceso: ${ac}\n📊 Código Excel: ${ec}\nEntra en: https://72008081-pixel.github.io/Ulianov-Continental/`;
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

    // ── GESTIÓN DE ACCESO AL PANEL ADMIN ─────────────────────────
    function openAdminWorkflow() {
        if (isAdmin()) {
            showPanelModal();
        } else {
            buildModal();
            switchView('cb-v-admin');
            showAuthModal();
            setTimeout(() => {
                const passInput = document.getElementById('cb-admin-pass');
                if (passInput) {
                    passInput.value = '';
                    passInput.focus();
                }
            }, 100);
        }
    }

    // ── BOTÓN FLOTANTE: ESTRICTAMENTE SOLO PARA ADMIN ────────────
    function injectFloatingAdminButton() {
        let fb = document.getElementById('cb-floating-admin');
        if (!fb) {
            fb = document.createElement('button');
            fb.id = 'cb-floating-admin';
            fb.innerHTML = '👑 Panel Licencias';
            fb.title = 'Panel Maestro de Licencias y Alumnos (Ing. Ulianov Cuba)';
            fb.style.display = 'none'; // oculto por defecto
            fb.onclick = () => openAdminWorkflow();
            document.body.appendChild(fb);
        }
    }

    // ── HEADER: PRIVACIDAD ESTRICTA ──────────────────────────────
    function updateHeader() {
        const s = getSession();
        const adminMode = isAdmin();

        // 1. Botones admin en navbar: VISIBLES SOLO PARA EL ADMIN
        document.querySelectorAll('#cb-header-btn, .btn-dev-btn, [data-admin-trigger]').forEach(b => {
            b.style.display = adminMode ? '' : 'none';
            b.onclick = () => openAdminWorkflow();
        });

        // 2. Botón flotante: VISIBLE SOLO PARA EL ADMIN
        const fb = document.getElementById('cb-floating-admin');
        if (fb) {
            fb.style.display = adminMode ? 'flex' : 'none';
        }

        // 3. Crear o actualizar píldora de cuenta de usuario
        let userPill = document.getElementById('cb-user-pill');
        if (!userPill) {
            userPill = document.createElement('div');
            userPill.id = 'cb-user-pill';
            userPill.style.cssText = 'display:inline-flex;align-items:center;gap:6px;font-size:11px;font-weight:700;padding:5px 12px;border-radius:8px;background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.15);color:#cbd5e1;cursor:pointer;transition:all 0.15s;white-space:nowrap;';
            const navRight = document.querySelector('.header-right') || document.querySelector('.header-controls') || document.querySelector('.header-actions') || document.querySelector('.status-strip-inner');
            if (navRight) {
                navRight.prepend(userPill);
            }
        }

        if (adminMode) {
            userPill.innerHTML = '👑 Admin: <strong>Ing. Ulianov Cuba</strong> <span style="font-size:10px;color:#f472b6;">(Salir)</span>';
            userPill.title = 'Sesión de Administrador activa. Clic para salir.';
            userPill.onclick = () => { if (confirm('¿Cerrar sesión de Administrador?')) { clearSession(); location.reload(); } };
        } else if (s && s.role === 'docente') {
            userPill.innerHTML = '👨‍🏫 Docente: <strong>Ing. Ulianov Cuba</strong> <span style="font-size:10px;color:#38bdf8;">(Salir)</span>';
            userPill.title = 'Sesión de Docente activa. Clic para salir.';
            userPill.onclick = () => { if (confirm('¿Cerrar sesión docente?')) { clearSession(); location.reload(); } };
        } else if (s && checkAuthorized()) {
            userPill.innerHTML = `👤 <strong>${s.name || s.email.split('@')[0]}</strong> <span style="font-size:10px;color:#94a3b8;">(Salir)</span>`;
            userPill.title = `Sesión de ${s.email}. Clic para salir.`;
            userPill.onclick = () => { if (confirm('¿Cerrar sesión de usuario?')) { clearSession(); location.reload(); } };
        } else {
            userPill.innerHTML = '🔒 Iniciar Sesión';
            userPill.onclick = () => showAuthModal();
        }
    }

    // ── BASE DE DATOS LOCAL DE PROYECTOS (CerebroDB) ────────────
    window.CerebroDB = {
        saveProject: function(type, name, data) {
            const k = (type === 'beam') ? KEY.beams : KEY.trusses;
            const list = loadArr(k);
            const projId = 'proj_' + Date.now();
            const projName = name || (type === 'beam' ? 'Viga Continua ' : 'Armadura 2D ') + (list.length + 1);
            let summary = '';
            if (type === 'beam') {
                const spans = (data && data.spans) ? data.spans.length : (data && data.bars) ? data.bars.length : 0;
                const nodes = (data && data.nodes) ? data.nodes.length : 0;
                summary = `${spans} tramos, ${nodes} nudos`;
            } else {
                const members = (data && data.members) ? data.members.length : (data && data.bars) ? data.bars.length : 0;
                const nodes = (data && data.nodes) ? data.nodes.length : 0;
                summary = `${members} barras, ${nodes} nudos`;
            }
            const record = {
                id: projId,
                name: projName,
                type: type,
                summary: summary,
                date: new Date().toLocaleString('es-PE'),
                ts: Date.now(),
                data: data
            };
            list.unshift(record);
            save(k, list);
            return record;
        },

        getProjects: function(type) {
            const k = (type === 'beam') ? KEY.beams : KEY.trusses;
            return loadArr(k);
        },

        deleteProject: function(type, id) {
            const k = (type === 'beam') ? KEY.beams : KEY.trusses;
            let list = loadArr(k);
            list = list.filter(p => p.id !== id);
            save(k, list);
        },

        getAllProjects: function() {
            return {
                trusses: loadArr(KEY.trusses),
                beams: loadArr(KEY.beams)
            };
        },

        showProjectsModal: function(type, onLoadCallback, getCurrentDataCallback) {
            const isBeam = (type === 'beam');
            const typeLabel = isBeam ? 'Vigas Continuas' : 'Armaduras 2D';
            const k = isBeam ? KEY.beams : KEY.trusses;

            let modal = document.getElementById('cb-projects-modal');
            if (!modal) {
                modal = document.createElement('div');
                modal.id = 'cb-projects-modal';
                modal.style.cssText = 'position:fixed;inset:0;z-index:999998;background:rgba(3,7,18,0.92);display:flex;align-items:center;justify-content:center;padding:16px;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;';
                document.body.appendChild(modal);
            }

            function renderModal() {
                const projects = loadArr(k);
                modal.innerHTML = `
                <div class="cb-card cb-card-wide" style="max-width:680px">
                    <div class="cb-panel-header">
                        <div>
                            <p class="cb-panel-title">📁 Mis Proyectos Guardados — ${typeLabel}</p>
                            <div style="font-size:11px;color:#94a3b8;margin-top:2px">Guarda tus modelos, cárgalos en pantalla o expórtalos en JSON para respaldar tu trabajo.</div>
                        </div>
                        <button id="cb-proj-modal-close" class="cb-sbtn cb-sbtn-gray" style="padding:5px 12px;font-size:12px">✕ Cerrar</button>
                    </div>

                    <div style="display:flex;gap:8px;margin-bottom:14px;flex-wrap:wrap">
                        <button id="cb-proj-save-current" class="cb-sbtn cb-sbtn-green" style="padding:8px 14px;font-size:12px">
                            💾 Guardar Modelo Actual en Pantalla
                        </button>
                        <button id="cb-proj-import-json" class="cb-sbtn cb-sbtn-blue" style="padding:8px 14px;font-size:12px">
                            📥 Cargar Archivo JSON
                        </button>
                        <input type="file" id="cb-proj-file-input" accept=".json" style="display:none">
                    </div>

                    <div style="font-size:12px;font-weight:800;color:#fff;margin-bottom:8px">
                        Modelos Guardados (${projects.length}):
                    </div>

                    <div id="cb-proj-items-list" style="max-height:360px;overflow-y:auto;display:flex;flex-direction:column;gap:8px">
                        ${projects.length === 0 ? `
                            <div style="text-align:center;padding:30px;color:#64748b;font-size:12px;background:rgba(255,255,255,0.02);border-radius:8px">
                                No tienes proyectos guardados aún.<br>Haz clic en "Guardar Modelo Actual" para registrar tu primer ejercicio.
                            </div>
                        ` : projects.map(p => `
                            <div style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.09);border-radius:10px;padding:12px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px">
                                <div>
                                    <div style="font-size:13px;font-weight:800;color:#38bdf8">${p.name}</div>
                                    <div style="font-size:11px;color:#94a3b8;margin-top:2px">📅 ${p.date} • <span style="color:#a7f3d0">${p.summary}</span></div>
                                </div>
                                <div style="display:flex;gap:6px">
                                    <button class="cb-sbtn cb-sbtn-green cb-proj-load-btn" data-id="${p.id}" style="padding:5px 12px;font-size:11px">📂 Cargar</button>
                                    <button class="cb-sbtn cb-sbtn-blue cb-proj-export-btn" data-id="${p.id}" style="padding:5px 10px;font-size:11px">📥 JSON</button>
                                    <button class="cb-sbtn cb-sbtn-red cb-proj-delete-btn" data-id="${p.id}" style="padding:5px 10px;font-size:11px">🗑️</button>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>`;

                modal.style.display = 'flex';

                // Close
                document.getElementById('cb-proj-modal-close').onclick = () => {
                    modal.style.display = 'none';
                };

                // Save current
                document.getElementById('cb-proj-save-current').onclick = () => {
                    const name = prompt('Nombre para este proyecto:', (isBeam ? 'Viga Continua ' : 'Armadura 2D ') + (loadArr(k).length + 1));
                    if (!name) return;
                    let currentData = null;
                    if (typeof getCurrentDataCallback === 'function') {
                        currentData = getCurrentDataCallback();
                    } else if (isBeam && window.BeamApp && typeof window.BeamApp.getCurrentData === 'function') {
                        currentData = window.BeamApp.getCurrentData();
                    } else if (!isBeam && window.TrussApp && typeof window.TrussApp.getCurrentData === 'function') {
                        currentData = window.TrussApp.getCurrentData();
                    }
                    if (!currentData) {
                        alert('No se pudo capturar los datos actuales del modelo.');
                        return;
                    }
                    window.CerebroDB.saveProject(type, name, currentData);
                    alert('✔ ¡Proyecto guardado exitosamente en Mis Proyectos!');
                    renderModal();
                };

                // Import JSON
                const fileInp = document.getElementById('cb-proj-file-input');
                document.getElementById('cb-proj-import-json').onclick = () => fileInp.click();
                fileInp.onchange = (e) => {
                    const file = e.target.files[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onload = (evt) => {
                        try {
                            const parsed = JSON.parse(evt.target.result);
                            const name = parsed.name || file.name.replace('.json', '');
                            const data = parsed.data || parsed;
                            window.CerebroDB.saveProject(type, name, data);
                            alert('✔ ¡Proyecto importado exitosamente!');
                            renderModal();
                        } catch (err) {
                            alert('Error al leer archivo JSON: ' + err.message);
                        }
                    };
                    reader.readAsText(file);
                };

                // Load buttons
                modal.querySelectorAll('.cb-proj-load-btn').forEach(btn => {
                    btn.onclick = () => {
                        const id = btn.dataset.id;
                        const p = loadArr(k).find(item => item.id === id);
                        if (!p) return;
                        if (confirm(`¿Cargar el proyecto "${p.name}" en pantalla? Reemplazará los datos actuales.`)) {
                            modal.style.display = 'none';
                            if (typeof onLoadCallback === 'function') {
                                onLoadCallback(p.data);
                            } else if (isBeam && window.BeamApp && typeof window.BeamApp.loadProjectData === 'function') {
                                window.BeamApp.loadProjectData(p.data);
                            } else if (!isBeam && window.TrussApp && typeof window.TrussApp.loadProjectData === 'function') {
                                window.TrussApp.loadProjectData(p.data);
                            }
                        }
                    };
                });

                // Export individual
                modal.querySelectorAll('.cb-proj-export-btn').forEach(btn => {
                    btn.onclick = () => {
                        const id = btn.dataset.id;
                        const p = loadArr(k).find(item => item.id === id);
                        if (!p) return;
                        const blob = new Blob([JSON.stringify(p, null, 2)], { type: 'application/json' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `${p.name.replace(/\s+/g, '_')}.json`;
                        a.click();
                        URL.revokeObjectURL(url);
                    };
                });

                // Delete buttons
                modal.querySelectorAll('.cb-proj-delete-btn').forEach(btn => {
                    btn.onclick = () => {
                        const id = btn.dataset.id;
                        const p = loadArr(k).find(item => item.id === id);
                        if (!p) return;
                        if (confirm(`¿Eliminar definitivamente el proyecto "${p.name}"?`)) {
                            window.CerebroDB.deleteProject(type, id);
                            renderModal();
                        }
                    };
                });
            }

            renderModal();
        }
    };

    // ── API PÚBLICA ──────────────────────────────────────────────
    window.CerebroAuth = {
        isAuthorized: () => checkAuthorized(),
        isAdmin: () => isAdmin(),
        hasExcelPermission: () => {
            const s = getSession();
            if (!s) return false;
            if (s.role === 'admin' || s.role === 'docente') return true;
            return hasExcel(s.email);
        },
        showExcelVipNotice: () => {
            const s = getSession();
            if (!s) return;
            const ec = excelCode(s.email);
            alert(`📊 Para descargar el Excel (.xlsx) con fórmulas nativas necesitas el Código Excel.\n\nSolicita al Ing. Ulianov por WhatsApp (${YAPE.display}) enviando tu comprobante de Yape.\n\nCuando el Ing. te lo envíe, tu código será:\n${ec}`);
        },
        showAuthModal: showAuthModal,
        openAuthModal: showAuthModal,
        lock: showAuthModal,
        showAdminPanel: showPanelModal,
        openAdminWorkflow: openAdminWorkflow
    };

    // ── ATAJOS DE TECLADO Y PARÁMETROS EN URL ────────────────────
    document.addEventListener('keydown', (e) => {
        // Ctrl + Shift + A  o  Alt + A abre panel / prompt de administrador
        if ((e.ctrlKey && e.shiftKey && (e.key === 'A' || e.key === 'a')) ||
            (e.altKey && (e.key === 'A' || e.key === 'a'))) {
            e.preventDefault();
            openAdminWorkflow();
        }
    });

    // ── INIT ─────────────────────────────────────────────────────
    function init() {
        buildModal();
        injectFloatingAdminButton();
        updateHeader();

        // Check VIP token in URL
        const params = new URLSearchParams(location.search);
        const vipToken = params.get('vip');
        if (vipToken === 'DOCENTE_VIP_ULIANOV') {
            setSession({ role: 'docente', email: 'docente.vip@continental.edu.pe', name: 'Ing. Ulianov Cuba (Docente)' });
            const w = load(KEY.whitelist);
            w['docente.vip@continental.edu.pe'] = { email: 'docente.vip@continental.edu.pe', name: 'Ing. Ulianov Cuba (Docente)', ts: Date.now() };
            save(KEY.whitelist, w);
            grantExcel('docente.vip@continental.edu.pe');
            updateHeader();
            return;
        }

        // Check ?admin=1 in URL
        if (params.get('admin') === '1' || location.hash === '#admin') {
            setTimeout(openAdminWorkflow, 200);
            return;
        }

        if (checkAuthorized()) { updateHeader(); return; }
        showAuthModal();
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();
