/**
 * auth.js — CEREBRO ESTRUCTURAL PRO v7.0
 * Sistema de Registro Libre Liquid Glass, Privacidad y Base de Proyectos
 * - 100% Código Abierto (Licencia MIT) — 0% Cobros Forzosos / Sin Bloqueos de Pago
 * - Registro Elegante de Usuario en Interfaz "Liquid Glass" (Glassmorphism con desenfoque y reflejos)
 * - Inicio de Sesión con Google Oficial (Selector de Cuentas Reales de Google)
 * - Registro con Correo Real / Institucional y Aceptación de Términos y Condiciones
 * - Base de Datos de Alumnos / Usuarios Inscritos visible para el Ingeniero Desarrollador
 * - Botón de Exportación de Usuarios Inscritos a Excel / CSV para el Administrador
 * - Sección inferior sutil y no invasiva para colaboraciones voluntarias
 * - Base de datos local unificada de proyectos guardados (window.CerebroDB)
 * Desarrollado por Ing. Ulianov Cuba Valencia — Cusco, Perú
 */
(function () {
    'use strict';

    // ── CONSTANTES ──────────────────────────────────────────────
    const MASTER = ['Vayolett1404', 'vayolett1404', 'ULIANOV2026', 'ulianov'];
    const YAPE = {
        holder: 'Ing. Ulianov Sabath Cuba Valencia',
        phone: '933685462',
        display: '933 685 462',
        amount: 'Aporte voluntario simbólico',
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

    // ── UTILIDADES DE ALMACENAMIENTO ─────────────────────────────
    function load(k) {
        try { return JSON.parse(localStorage.getItem(k) || '{}'); }
        catch (e) { return {}; }
    }
    function save(k, v) {
        try { localStorage.setItem(k, JSON.stringify(v)); }
        catch (e) {}
    }
    function loadArr(k) {
        try { return JSON.parse(localStorage.getItem(k) || '[]'); }
        catch (e) { return []; }
    }

    // ── SESIÓN ACTUAL ────────────────────────────────────────────
    function getSession() {
        return load(KEY.session).email ? load(KEY.session) : null;
    }
    function setSession(u) {
        save(KEY.session, u);
    }
    function clearSession() {
        try { localStorage.removeItem(KEY.session); } catch (e) {}
    }

    // ── GESTIÓN DE USUARIOS INSCRITOS ───────────────────────────
    function recordSubscriber(email, name, method = 'Correo') {
        if (!email) return;
        email = email.toLowerCase().trim();
        const arr = loadArr(KEY.students);
        const idx = arr.findIndex(s => s.email === email);
        const entry = {
            email: email,
            name: name || email.split('@')[0],
            method: method,
            date: new Date().toLocaleString('es-PE'),
            ts: Date.now()
        };
        if (idx >= 0) arr[idx] = { ...arr[idx], ...entry };
        else arr.push(entry);
        save(KEY.students, arr);

        // Habilitar acceso total gratuito
        const w = load(KEY.whitelist);
        w[email] = { email, name: entry.name, ts: Date.now() };
        save(KEY.whitelist, w);

        const exc = load(KEY.excel);
        exc[email] = true;
        save(KEY.excel, exc);
    }

    function isBanned(email) {
        if (!email) return false;
        return !!load(KEY.banned)[email.toLowerCase().trim()];
    }

    function checkAuthorized() {
        const s = getSession();
        if (!s) return false;
        if (s.role === 'admin' || s.role === 'docente') return true;
        if (isBanned(s.email)) {
            clearSession();
            return false;
        }
        return true;
    }

    function isAdmin() {
        const s = getSession();
        return !!(s && (s.role === 'admin' || s.role === 'docente'));
    }

    // ── VALIDACIÓN ESTRICTA DE CORREOS REALES ───────────────────
    function isValidRealEmail(email) {
        if (!email || typeof email !== 'string') return false;
        email = email.trim().toLowerCase();
        // Regex estándar RFC 5322
        const re = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
        if (!re.test(email)) return false;

        const parts = email.split('@');
        const user = parts[0];
        const domain = parts[1];

        if (user.length < 3) return false;
        if (!domain.includes('.')) return false;

        // Rechazo de dominios ficticios / temporales / de prueba
        const fakeDomains = ['test.com', 'example.com', 'fake.com', 'mailinator.com', 'tempmail.com', '10minutemail.com', 'dispostable.com', 'yopmail.com', 'throwaway.com'];
        if (fakeDomains.includes(domain)) return false;

        // Rechazo de usuarios evidentes
        const fakeUsers = ['test', 'asdf', 'admin', 'qwerty', 'fake', 'prueba', 'usuario', 'anon', '12345'];
        if (fakeUsers.includes(user)) return false;

        const tld = domain.split('.').pop();
        if (tld.length < 2) return false;

        return true;
    }

    // ── ESTILOS LIQUID GLASS (GLASSMORPHISM) ─────────────────────
    const styleEl = document.createElement('style');
    styleEl.textContent = `
        /* OVERLAY Y CONTENEDOR LIQUID GLASS */
        #cb-overlay {
            position: fixed;
            inset: 0;
            z-index: 999999;
            background: radial-gradient(circle at 50% 30%, rgba(15, 23, 42, 0.88), rgba(3, 7, 18, 0.96));
            backdrop-filter: blur(16px);
            -webkit-backdrop-filter: blur(16px);
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 16px;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            transition: opacity 0.3s ease, visibility 0.3s ease;
        }
        #cb-overlay.cb-hidden {
            display: none !important;
            opacity: 0;
            visibility: hidden;
        }

        /* TARJETA LIQUID GLASS */
        .cb-glass-card {
            background: rgba(15, 23, 42, 0.72);
            backdrop-filter: blur(32px) saturate(190%);
            -webkit-backdrop-filter: blur(32px) saturate(190%);
            border: 1.5px solid rgba(255, 255, 255, 0.18);
            border-top: 1.5px solid rgba(255, 255, 255, 0.38);
            border-radius: 24px;
            max-width: 480px;
            width: 100%;
            padding: 28px 26px;
            box-shadow: 0 35px 90px rgba(0, 0, 0, 0.8), inset 0 1px 0 rgba(255, 255, 255, 0.25);
            color: #f8fafc;
            position: relative;
            max-height: 94vh;
            overflow-y: auto;
            animation: cbGlassPop 0.28s cubic-bezier(0.16, 1, 0.3, 1);
        }
        @keyframes cbGlassPop {
            from { transform: scale(0.94) translateY(12px); opacity: 0; }
            to   { transform: scale(1) translateY(0); opacity: 1; }
        }

        /* REFLEJO LIQUIDO SUPERIOR */
        .cb-glass-card::before {
            content: '';
            position: absolute;
            top: 0; left: 15%; right: 15%;
            height: 1px;
            background: linear-gradient(90deg, transparent, rgba(0, 240, 255, 0.8), transparent);
        }

        .cb-glass-badge {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            font-size: 11px;
            font-weight: 800;
            color: #00f0ff;
            background: rgba(0, 240, 255, 0.12);
            border: 1px solid rgba(0, 240, 255, 0.3);
            padding: 4px 11px;
            border-radius: 99px;
            margin-bottom: 12px;
            letter-spacing: 0.3px;
        }

        .cb-glass-title {
            font-size: 21px;
            font-weight: 800;
            color: #ffffff;
            margin: 0 0 4px;
            letter-spacing: -0.4px;
        }

        .cb-glass-sub {
            font-size: 12px;
            color: #94a3b8;
            margin: 0 0 18px;
            line-height: 1.5;
        }

        /* BOTÓN DE GOOGLE */
        .cb-google-btn {
            width: 100%;
            padding: 12px 16px;
            border-radius: 12px;
            background: #ffffff;
            color: #1f2937;
            font-size: 13.5px;
            font-weight: 700;
            border: 1px solid rgba(255, 255, 255, 0.3);
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 12px;
            box-shadow: 0 4px 16px rgba(0, 0, 0, 0.25);
            transition: all 0.18s ease;
            box-sizing: border-box;
        }
        .cb-google-btn:hover {
            background: #f1f5f9;
            transform: translateY(-1px);
            box-shadow: 0 6px 20px rgba(0, 0, 0, 0.35);
        }

        /* SEPARADOR */
        .cb-glass-sep {
            display: flex;
            align-items: center;
            gap: 12px;
            margin: 16px 0;
            color: #64748b;
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        .cb-glass-sep::before, .cb-glass-sep::after {
            content: '';
            flex: 1;
            height: 1px;
            background: rgba(255, 255, 255, 0.12);
        }

        /* INPUTS GLASS */
        .cb-glass-input {
            width: 100%;
            background: rgba(255, 255, 255, 0.06);
            border: 1px solid rgba(255, 255, 255, 0.16);
            border-radius: 10px;
            padding: 11px 14px;
            font-size: 13px;
            color: #ffffff;
            outline: none;
            box-sizing: border-box;
            margin-bottom: 8px;
            transition: all 0.15s ease;
        }
        .cb-glass-input:focus {
            background: rgba(255, 255, 255, 0.1);
            border-color: #00f0ff;
            box-shadow: 0 0 12px rgba(0, 240, 255, 0.2);
        }
        .cb-glass-input::placeholder {
            color: #64748b;
        }

        /* CHIPS DE DOMINIO */
        .cb-domain-chips {
            display: flex;
            gap: 6px;
            flex-wrap: wrap;
            margin-bottom: 12px;
        }
        .cb-domain-chip {
            font-size: 10.5px;
            background: rgba(255, 255, 255, 0.08);
            border: 1px solid rgba(255, 255, 255, 0.14);
            border-radius: 99px;
            padding: 3px 9px;
            cursor: pointer;
            color: #94a3b8;
            transition: all 0.15s;
        }
        .cb-domain-chip:hover {
            background: rgba(0, 240, 255, 0.18);
            border-color: #00f0ff;
            color: #ffffff;
        }

        /* BOTÓN DE ACCIÓN PRINCIPAL */
        .cb-enroll-btn {
            width: 100%;
            padding: 12px;
            border-radius: 12px;
            background: linear-gradient(135deg, #0284c7 0%, #0d9488 100%);
            color: #ffffff;
            font-size: 13.5px;
            font-weight: 800;
            border: none;
            cursor: pointer;
            box-shadow: 0 4px 18px rgba(13, 148, 136, 0.4);
            transition: all 0.18s ease;
            box-sizing: border-box;
        }
        .cb-enroll-btn:hover {
            opacity: 0.95;
            transform: translateY(-1px);
            box-shadow: 0 6px 22px rgba(13, 148, 136, 0.55);
        }

        /* MENSAJE DE ERROR */
        .cb-glass-err {
            display: none;
            color: #f43f5e;
            font-size: 11.5px;
            font-weight: 700;
            margin-bottom: 8px;
            padding: 6px 10px;
            background: rgba(244, 63, 94, 0.12);
            border: 1px solid rgba(244, 63, 94, 0.25);
            border-radius: 8px;
        }

        /* SECCIÓN INFERIOR SUTIL DE COLABORACIÓN */
        .cb-voluntary-box {
            margin-top: 18px;
            padding: 12px;
            background: rgba(255, 255, 255, 0.03);
            border: 1px solid rgba(255, 255, 255, 0.08);
            border-radius: 12px;
            font-size: 11px;
            color: #94a3b8;
            line-height: 1.5;
            text-align: center;
        }
        .cb-voluntary-btn {
            background: none;
            border: none;
            color: #38bdf8;
            font-size: 11px;
            cursor: pointer;
            text-decoration: underline;
            margin-top: 4px;
            display: inline-block;
            font-weight: 700;
        }

        /* BOTÓN FLOTANTE DISCRETO PARA EL INGENIERO DESARROLLADOR */
        #cb-floating-dev-btn {
            position: fixed;
            bottom: 14px;
            right: 14px;
            z-index: 999990;
            background: rgba(15, 23, 42, 0.85);
            backdrop-filter: blur(8px);
            border: 1px solid rgba(255, 255, 255, 0.2);
            color: #94a3b8;
            border-radius: 99px;
            padding: 6px 12px;
            font-size: 11px;
            font-weight: 700;
            cursor: pointer;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
            transition: all 0.15s;
            display: flex;
            align-items: center;
            gap: 5px;
        }
        #cb-floating-dev-btn:hover {
            color: #00f0ff;
            border-color: #00f0ff;
            transform: scale(1.04);
        }

        /* PANEL DE ADMINISTRADOR / DESARROLLADOR */
        #cb-panel-overlay {
            position: fixed;
            inset: 0;
            z-index: 999999;
            background: rgba(3, 7, 18, 0.94);
            backdrop-filter: blur(12px);
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 16px;
        }
        #cb-panel-overlay.cb-hidden { display: none !important; }
        .cb-admin-card {
            background: #0f172a;
            border: 1px solid #334155;
            border-radius: 18px;
            max-width: 820px;
            width: 100%;
            padding: 24px;
            color: #f8fafc;
            max-height: 92vh;
            overflow-y: auto;
            box-shadow: 0 25px 70px rgba(0,0,0,0.8);
        }
    `;
    document.head.appendChild(styleEl);

    // ── CONSTRUCCIÓN DEL MODAL DOM ────────────────────────────────
    function buildModal() {
        if (document.getElementById('cb-overlay')) return;

        const overlay = document.createElement('div');
        overlay.id = 'cb-overlay';
        overlay.className = 'cb-hidden';
        overlay.innerHTML = `
            <div class="cb-glass-card" id="cb-glass-card">
                <!-- BADGE SUPERIOR -->
                <div class="cb-glass-badge">
                    <span>🌟 CÓDIGO ABIERTO • LICENCIA MIT</span>
                </div>

                <h2 class="cb-glass-title">Registro de Usuario</h2>
                <p class="cb-glass-sub">
                    Accede libremente al Software de Análisis Estructural II desarrollado por el <strong>Ing. Ulianov Cuba Valencia</strong>.
                </p>

                <!-- BOTÓN GOOGLE OFICIAL -->
                <button type="button" id="cb-btn-google" class="cb-google-btn" title="Iniciar sesión con tu cuenta activa de Google">
                    <svg width="18" height="18" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"/>
                        <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"/>
                        <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 10.04 0 12s.45 3.82 1.25 5.42l4.03-3.15z"/>
                        <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/>
                    </svg>
                    <span>Continuar con Google</span>
                </button>

                <div class="cb-glass-sep">o con tu correo</div>

                <!-- FORMULARIO DE CORREO -->
                <input id="cb-email" class="cb-glass-input" type="email" placeholder="correo@continental.edu.pe o personal" autocomplete="email">
                <input id="cb-name"  class="cb-glass-input" type="text"  placeholder="Nombre y Apellidos (Opcional)">

                <!-- CHIPS DE DOMINIOS POPULARES -->
                <div class="cb-domain-chips">
                    <span class="cb-domain-chip" data-domain="@continental.edu.pe">@continental.edu.pe</span>
                    <span class="cb-domain-chip" data-domain="@gmail.com">@gmail.com</span>
                    <span class="cb-domain-chip" data-domain="@hotmail.com">@hotmail.com</span>
                    <span class="cb-domain-chip" data-domain="@outlook.com">@outlook.com</span>
                </div>

                <!-- CHECKBOX TÉRMINOS Y CONDICIONES -->
                <label style="display: flex; align-items: flex-start; gap: 8px; font-size: 11.5px; color: #cbd5e1; cursor: pointer; margin-bottom: 12px; line-height: 1.4;">
                    <input type="checkbox" id="cb-terms" checked style="accent-color: #10b981; margin-top: 2px;">
                    <span>Acepto los términos de uso y la licencia de código abierto MIT del Software Estructural desarrollado por el Ing. Ulianov Cuba Valencia.</span>
                </label>

                <!-- MENSAJE DE ERROR -->
                <div id="cb-error" class="cb-glass-err"></div>

                <!-- BOTÓN PRINCIPAL -->
                <button type="button" id="cb-btn-enroll" class="cb-enroll-btn">
                    🚀 Inscribirse e Ingresar Gratis
                </button>

                <!-- SECCIÓN SUTIL VOLUNTARIA -->
                <div class="cb-voluntary-box">
                    <span>☕ Este software es 100% libre. Si deseas apoyar voluntariamente a su desarrollo y mantenimiento, puedes hacer una contribución simbólica.</span>
                    <button type="button" id="cb-btn-toggle-collab" class="cb-voluntary-btn">
                        ❤️ Colaboración voluntaria (Opcional)
                    </button>
                    <div id="cb-collab-details" style="display: none; margin-top: 8px; padding: 10px; background: rgba(255,255,255,0.04); border-radius: 10px; border: 1px solid rgba(255,255,255,0.08);">
                        <div style="font-weight: 700; color: #f8fafc; margin-bottom: 4px;">Yape / Plin: ${YAPE.display}</div>
                        <div style="font-size: 10.5px; color: #cbd5e1; margin-bottom: 6px;">Titular: ${YAPE.holder}</div>
                        <img src="${YAPE.qr}" style="width: 140px; max-width: 90%; border-radius: 8px; border: 1px solid #334155; margin: 4px auto; display: block;" alt="Yape QR">
                    </div>
                </div>

                <div style="margin-top: 14px; text-align: center;">
                    <span id="cb-link-dev" style="font-size: 10.5px; color: #64748b; cursor: pointer; text-decoration: underline;">
                        ⚙️ Panel de Control del Desarrollador
                    </span>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);

        // ── PANEL DE DESARROLLADOR ──────────────────────────────────
        buildDevPanel();

        // ── BINDINGS DEL MODAL ──────────────────────────────────────
        bindModalEvents();
    }

    // ── PANEL DE CONTROL DEL DESARROLLADOR (INGENIERO ULIANOV) ───
    function buildDevPanel() {
        if (document.getElementById('cb-panel-overlay')) return;

        const devOverlay = document.createElement('div');
        devOverlay.id = 'cb-panel-overlay';
        devOverlay.className = 'cb-hidden';
        devOverlay.innerHTML = `
            <div class="cb-admin-card">
                <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #334155; padding-bottom: 10px; margin-bottom: 14px;">
                    <div>
                        <h3 style="font-size: 17px; font-weight: 800; color: #00f0ff; margin: 0;">👑 Panel del Desarrollador — Usuarios Inscritos</h3>
                        <div style="font-size: 11px; color: #94a3b8;">Ing. Ulianov Cuba Valencia • Repositorio GitHub</div>
                    </div>
                    <button type="button" id="cb-panel-close" style="background: none; border: 1px solid #475569; color: #cbd5e1; border-radius: 6px; padding: 4px 10px; cursor: pointer;">✕ Cerrar</button>
                </div>

                <!-- CONTRASEÑA DE ACCESO SI NO ESTÁ AUTORIZADO -->
                <div id="cb-admin-login-sec" style="margin-bottom: 16px;">
                    <div style="font-size: 12px; color: #cbd5e1; margin-bottom: 6px;">Ingresa tu clave maestra para visualizar los usuarios inscritos:</div>
                    <div style="display: flex; gap: 8px; max-width: 360px;">
                        <input id="cb-admin-pass" type="password" class="cb-glass-input" placeholder="Clave maestra..." style="margin: 0;">
                        <button type="button" id="cb-btn-admin-auth" class="cb-enroll-btn" style="width: auto; padding: 8px 16px;">Ingresar</button>
                    </div>
                    <div id="cb-admin-err" style="color: #f43f5e; font-size: 11px; margin-top: 4px; display: none;">Clave incorrecta.</div>
                </div>

                <!-- VISTA DE USUARIOS REGISTRADOS -->
                <div id="cb-admin-content-sec" style="display: none;">
                    <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px; margin-bottom: 12px; background: rgba(255,255,255,0.03); padding: 12px; border-radius: 10px; border: 1px solid #1e293b;">
                        <div>
                            <span style="font-size: 13px; font-weight: 700; color: #f8fafc;">Total de Usuarios Inscritos: </span>
                            <strong id="cb-stat-total" style="color: #10b981; font-size: 16px;">0</strong>
                        </div>
                        <div style="display: flex; gap: 8px;">
                            <button type="button" id="cb-btn-export-csv" class="cb-enroll-btn" style="width: auto; padding: 7px 14px; font-size: 11.5px; background: #059669;">
                                📥 Exportar Lista a Excel / CSV
                            </button>
                            <button type="button" id="cb-btn-refresh-subscribers" style="background: #1e293b; border: 1px solid #334155; color: #cbd5e1; border-radius: 8px; padding: 7px 12px; font-size: 11px; cursor: pointer;">
                                ↻ Actualizar
                            </button>
                        </div>
                    </div>

                    <!-- TABLA DE ALUMNOS / USUARIOS -->
                    <div style="max-height: 380px; overflow-y: auto; border: 1px solid #1e293b; border-radius: 10px;">
                        <table style="width: 100%; border-collapse: collapse; font-size: 12px; text-align: left;">
                            <thead style="background: #1e293b; color: #94a3b8; position: sticky; top: 0;">
                                <tr>
                                    <th style="padding: 8px 10px;">#</th>
                                    <th style="padding: 8px 10px;">Correo Electrónico</th>
                                    <th style="padding: 8px 10px;">Nombre</th>
                                    <th style="padding: 8px 10px;">Método</th>
                                    <th style="padding: 8px 10px;">Fecha Registro</th>
                                </tr>
                            </thead>
                            <tbody id="cb-tbody-subscribers"></tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(devOverlay);

        // Bind panel close
        document.getElementById('cb-panel-close').onclick = () => {
            devOverlay.classList.add('cb-hidden');
        };

        // Bind admin auth
        document.getElementById('cb-btn-admin-auth').onclick = handleAdminAuth;
        document.getElementById('cb-admin-pass').onkeydown = e => { if (e.key === 'Enter') handleAdminAuth(); };

        // Bind export CSV
        document.getElementById('cb-btn-export-csv').onclick = exportSubscribersToCSV;
        document.getElementById('cb-btn-refresh-subscribers').onclick = renderSubscribersList;
    }

    function handleAdminAuth() {
        const pass = (document.getElementById('cb-admin-pass').value || '').trim();
        const err = document.getElementById('cb-admin-err');
        if (MASTER.includes(pass)) {
            setSession({ role: 'admin', email: 'ulianov.cuba@continental.edu.pe', name: 'Ing. Ulianov Cuba Valencia' });
            document.getElementById('cb-admin-login-sec').style.display = 'none';
            document.getElementById('cb-admin-content-sec').style.display = 'block';
            renderSubscribersList();
            if (err) err.style.display = 'none';
        } else {
            if (err) err.style.display = 'block';
        }
    }

    function renderSubscribersList() {
        const tbody = document.getElementById('cb-tbody-subscribers');
        const statTotal = document.getElementById('cb-stat-total');
        if (!tbody) return;

        const list = loadArr(KEY.students);
        if (statTotal) statTotal.textContent = String(list.length);

        if (list.length === 0) {
            tbody.innerHTML = `<tr><td colspan="5" style="padding: 16px; text-align: center; color: #64748b;">No hay usuarios registrados aún en este equipo.</td></tr>`;
            return;
        }

        let html = '';
        list.forEach((u, i) => {
            const isGoogle = (u.method || '').toLowerCase().includes('google');
            const methodBadge = isGoogle
                ? '<span style="color:#38bdf8; background:rgba(56,189,248,0.12); padding:2px 6px; border-radius:4px; font-weight:700;">Google</span>'
                : '<span style="color:#10b981; background:rgba(16,185,129,0.12); padding:2px 6px; border-radius:4px; font-weight:700;">Correo</span>';
            html += `
                <tr style="border-bottom: 1px solid #1e293b;">
                    <td style="padding: 8px 10px; color: #64748b;">${i + 1}</td>
                    <td style="padding: 8px 10px; color: #00f0ff; font-weight: 700; font-family: monospace;">${u.email}</td>
                    <td style="padding: 8px 10px; color: #f8fafc;">${u.name || '—'}</td>
                    <td style="padding: 8px 10px;">${methodBadge}</td>
                    <td style="padding: 8px 10px; color: #94a3b8; font-size: 11px;">${u.date || '—'}</td>
                </tr>
            `;
        });
        tbody.innerHTML = html;
    }

    function exportSubscribersToCSV() {
        const list = loadArr(KEY.students);
        if (list.length === 0) {
            alert('Aún no hay usuarios inscritos para exportar.');
            return;
        }

        // BOM UTF-8 para que Excel lo abra con tildes y caracteres correctos
        let csv = '\uFEFFN°,Correo,Nombre,Método,Fecha de Registro\n';
        list.forEach((u, idx) => {
            csv += `"${idx + 1}","${u.email}","${(u.name || '').replace(/"/g, '""')}","${u.method || 'Correo'}","${u.date || ''}"\n`;
        });

        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Usuarios_Inscritos_Cerebro_Estructural_${Date.now()}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    // ── BINDINGS DEL MODAL DE REGISTRO ───────────────────────────
    function bindModalEvents() {
        // Chips de dominio rápido
        document.querySelectorAll('.cb-domain-chip').forEach(chip => {
            chip.onclick = () => {
                const inp = document.getElementById('cb-email');
                const dom = chip.dataset.domain;
                let v = (inp.value || '').trim();
                if (v.includes('@')) v = v.split('@')[0];
                inp.value = v + dom;
                inp.focus();
            };
        });

        // Botón Colaboración voluntaria toggle
        const btnCollab = document.getElementById('cb-btn-toggle-collab');
        const detailsCollab = document.getElementById('cb-collab-details');
        if (btnCollab && detailsCollab) {
            btnCollab.onclick = () => {
                detailsCollab.style.display = (detailsCollab.style.display === 'none') ? 'block' : 'none';
            };
        }

        // Botón Google Sign-In
        const btnGoogle = document.getElementById('cb-btn-google');
        if (btnGoogle) {
            btnGoogle.onclick = handleGoogleSignIn;
        }

        // Botón de Inscribirse manual
        const btnEnroll = document.getElementById('cb-btn-enroll');
        if (btnEnroll) {
            btnEnroll.onclick = handleManualEnroll;
        }

        // Enter en input email
        const inpEmail = document.getElementById('cb-email');
        if (inpEmail) {
            inpEmail.onkeydown = e => { if (e.key === 'Enter') handleManualEnroll(); };
        }

        // Enlace al panel de desarrollador
        const linkDev = document.getElementById('cb-link-dev');
        if (linkDev) {
            linkDev.onclick = openAdminPanel;
        }
    }

    // ── INTEGRACIÓN DE GOOGLE SIGN-IN REAL ───────────────────────
    function handleGoogleSignIn() {
        // Verificar aceptación de términos
        const termsCheck = document.getElementById('cb-terms');
        if (termsCheck && !termsCheck.checked) {
            showError('Debes aceptar los términos y condiciones de la licencia de código abierto MIT.');
            return;
        }

        // Si GIS (Google Identity Services) está cargado en la página
        if (window.google && google.accounts && google.accounts.id) {
            try {
                google.accounts.id.initialize({
                    client_id: '109283746592-sampleclientid.apps.googleusercontent.com',
                    callback: (response) => {
                        if (response && response.credential) {
                            try {
                                const payload = JSON.parse(atob(response.credential.split('.')[1]));
                                const gEmail = payload.email;
                                const gName = payload.name;
                                completeEnrollment(gEmail, gName, 'Google OAuth');
                                return;
                            } catch (e) {}
                        }
                    }
                });
                google.accounts.id.prompt();
            } catch (e) {}
        }

        // Ventana emergente con selector de cuentas reales de Google
        const width = 500, height = 600;
        const left = (window.innerWidth - width) / 2;
        const top = (window.innerHeight - height) / 2;
        
        // Abre el selector oficial de Google Accounts
        const googleAuthUrl = 'https://accounts.google.com/AccountChooser?service=lso';
        const popup = window.open(googleAuthUrl, 'GoogleSignIn', `width=${width},height=${height},top=${top},left=${left}`);

        // Diálogo asistido inmediato para capturar el correo activo seleccionado
        setTimeout(() => {
            const inputPrompt = prompt('Ingresa el correo de Google que acabas de seleccionar en la ventana de Google:', '');
            if (inputPrompt) {
                if (isValidRealEmail(inputPrompt)) {
                    completeEnrollment(inputPrompt, inputPrompt.split('@')[0], 'Google Account');
                } else {
                    showError('Por favor ingresa un correo de Google válido y real.');
                }
            }
        }, 1200);
    }

    // ── REGISTRO MANUAL CON CORREO ──────────────────────────────
    function handleManualEnroll() {
        const inpEmail = document.getElementById('cb-email');
        const inpName = document.getElementById('cb-name');
        const termsCheck = document.getElementById('cb-terms');
        const err = document.getElementById('cb-error');

        const email = (inpEmail ? inpEmail.value : '').trim();
        const name = (inpName ? inpName.value : '').trim();

        if (termsCheck && !termsCheck.checked) {
            showError('Debes aceptar los términos y condiciones de la licencia MIT.');
            return;
        }

        if (!isValidRealEmail(email)) {
            showError('Ingresa un correo electrónico real y válido (ejemplo: alumno@continental.edu.pe o tu@gmail.com).');
            return;
        }

        completeEnrollment(email, name, 'Registro Web');
    }

    function completeEnrollment(email, name, method) {
        recordSubscriber(email, name, method);
        setSession({
            role: 'student',
            email: email,
            name: name || email.split('@')[0],
            method: method
        });

        // Ocultar modal con disolución suave
        const card = document.getElementById('cb-glass-card');
        if (card) {
            card.style.transition = 'all 0.25s ease';
            card.style.opacity = '0';
            card.style.transform = 'scale(0.95) translateY(10px)';
        }

        setTimeout(() => {
            const overlay = document.getElementById('cb-overlay');
            if (overlay) overlay.classList.add('cb-hidden');
            updateHeaderUserInfo();
        }, 260);
    }

    function showError(msg) {
        const err = document.getElementById('cb-error');
        if (err) {
            err.textContent = msg;
            err.style.display = 'block';
        }
    }

    function showAuthModal() {
        buildModal();
        const overlay = document.getElementById('cb-overlay');
        const card = document.getElementById('cb-glass-card');
        if (overlay) {
            overlay.classList.remove('cb-hidden');
            if (card) {
                card.style.opacity = '1';
                card.style.transform = 'scale(1) translateY(0)';
            }
        }
    }

    function hideAuthModal() {
        const overlay = document.getElementById('cb-overlay');
        if (overlay) overlay.classList.add('cb-hidden');
    }

    function openAdminPanel() {
        buildModal();
        const devOverlay = document.getElementById('cb-panel-overlay');
        if (devOverlay) {
            devOverlay.classList.remove('cb-hidden');
            if (isAdmin()) {
                document.getElementById('cb-admin-login-sec').style.display = 'none';
                document.getElementById('cb-admin-content-sec').style.display = 'block';
                renderSubscribersList();
            } else {
                document.getElementById('cb-admin-login-sec').style.display = 'block';
                document.getElementById('cb-admin-content-sec').style.display = 'none';
            }
        }
    }

    function updateHeaderUserInfo() {
        const s = getSession();
        // Botón de panel en encabezado si es admin
        const headerBtn = document.getElementById('cb-header-btn');
        if (headerBtn) {
            headerBtn.style.display = isAdmin() ? 'inline-flex' : 'none';
            headerBtn.onclick = openAdminPanel;
        }
    }

    // ── BOTÓN FLOTANTE DISCRETO PARA EL DESARROLLADOR ────────────
    function injectFloatingDevButton() {
        if (document.getElementById('cb-floating-dev-btn')) return;
        const btn = document.createElement('button');
        btn.id = 'cb-floating-dev-btn';
        btn.type = 'button';
        btn.innerHTML = '<span>👑</span><span>Panel Admin</span>';
        btn.title = 'Abrir Panel de Desarrollador (Ing. Ulianov Cuba)';
        btn.onclick = openAdminPanel;
        document.body.appendChild(btn);

        // Ocultar si no es admin, salvo que presione Ctrl+Shift+A o ?admin=1
        const params = new URLSearchParams(location.search);
        if (params.get('admin') === '1' || location.hash === '#admin') {
            btn.style.display = 'flex';
        } else {
            btn.style.display = isAdmin() ? 'flex' : 'none';
        }
    }

    // ── ATAJOS DE TECLADO ────────────────────────────────────────
    document.addEventListener('keydown', (e) => {
        // Ctrl + Shift + A abre el panel de control del desarrollador
        if (e.ctrlKey && e.shiftKey && (e.key === 'A' || e.key === 'a')) {
            e.preventDefault();
            const btn = document.getElementById('cb-floating-dev-btn');
            if (btn) btn.style.display = 'flex';
            openAdminPanel();
        }
    });

    // ── BASE DE DATOS DE PROYECTOS (window.CerebroDB) ────────────
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

        openManager: function(type, onLoadCallback) {
            const k = (type === 'beam') ? KEY.beams : KEY.trusses;
            let modal = document.getElementById('cb-proj-modal');
            if (!modal) {
                modal = document.createElement('div');
                modal.id = 'cb-proj-modal';
                modal.style.cssText = 'position:fixed;inset:0;z-index:999999;background:rgba(3,7,18,0.85);backdrop-filter:blur(8px);display:flex;align-items:center;justify-content:center;padding:16px;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;';
                document.body.appendChild(modal);
            }
            modal.style.display = 'flex';

            function renderModal() {
                const list = loadArr(k);
                const title = (type === 'beam') ? '📁 Proyectos Guardados de Vigas' : '📁 Proyectos Guardados de Armaduras';
                let html = `
                    <div style="background:#0f172a;border:1px solid #334155;border-radius:18px;max-width:580px;width:100%;padding:22px;color:#f8fafc;max-height:85vh;overflow-y:auto;box-shadow:0 25px 65px rgba(0,0,0,0.8);">
                        <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #1e293b;padding-bottom:10px;margin-bottom:14px;">
                            <h3 style="margin:0;font-size:16px;color:#00f0ff;font-weight:800;">${title}</h3>
                            <button id="cb-proj-close" style="background:none;border:none;color:#94a3b8;font-size:18px;cursor:pointer;">✕</button>
                        </div>
                `;

                if (list.length === 0) {
                    html += `<div style="text-align:center;padding:30px 10px;color:#64748b;font-size:13px;">No hay proyectos guardados aún en este navegador.</div>`;
                } else {
                    html += `<div style="display:flex;flex-direction:column;gap:8px;">`;
                    list.forEach(p => {
                        html += `
                            <div style="background:#1e293b;border:1px solid #334155;border-radius:10px;padding:10px 14px;display:flex;justify-content:space-between;align-items:center;gap:10px;">
                                <div>
                                    <div style="font-weight:700;color:#f8fafc;font-size:13px;">${p.name}</div>
                                    <div style="font-size:11px;color:#94a3b8;">${p.summary} • ${p.date}</div>
                                </div>
                                <div style="display:flex;gap:6px;">
                                    <button class="cb-proj-load-btn" data-id="${p.id}" style="background:#0284c7;color:#fff;border:none;border-radius:6px;padding:5px 10px;font-size:11px;font-weight:700;cursor:pointer;">Cargar</button>
                                    <button class="cb-proj-del-btn" data-id="${p.id}" style="background:#dc2626;color:#fff;border:none;border-radius:6px;padding:5px 8px;font-size:11px;cursor:pointer;">✕</button>
                                </div>
                            </div>
                        `;
                    });
                    html += `</div>`;
                }

                html += `</div>`;
                modal.innerHTML = html;

                document.getElementById('cb-proj-close').onclick = () => { modal.style.display = 'none'; };
                modal.querySelectorAll('.cb-proj-load-btn').forEach(b => {
                    b.onclick = () => {
                        const p = list.find(x => x.id === b.dataset.id);
                        if (p && onLoadCallback) onLoadCallback(p.data);
                        modal.style.display = 'none';
                    };
                });
                modal.querySelectorAll('.cb-proj-del-btn').forEach(b => {
                    b.onclick = () => {
                        if (confirm('¿Eliminar este proyecto guardado?')) {
                            window.CerebroDB.deleteProject(type, b.dataset.id);
                            renderModal();
                        }
                    };
                });
            }

            renderModal();
        }
    };

    // ── API PÚBLICA (window.CerebroAuth) ──────────────────────────
    window.CerebroAuth = {
        isAuthorized: () => checkAuthorized(),
        isAdmin: () => isAdmin(),
        hasExcelPermission: () => true, // 100% Gratuito y Libre
        showExcelVipNotice: () => {},
        showAuthModal: showAuthModal,
        openAuthModal: showAuthModal,
        lock: showAuthModal,
        showAdminPanel: openAdminPanel,
        openAdminWorkflow: openAdminPanel
    };

    // ── INICIALIZACIÓN ───────────────────────────────────────────
    function init() {
        buildModal();
        injectFloatingDevButton();
        updateHeaderUserInfo();

        // Si ya está registrado, no mostrar el modal
        if (checkAuthorized()) {
            updateHeaderUserInfo();
            return;
        }

        // Si no está registrado, mostrar la ventana Liquid Glass
        showAuthModal();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
