/**
 * auth.js — CEREBRO ESTRUCTURAL PRO v8.1
 * Sistema de Registro Libre Liquid Glass, Términos y Condiciones, y Panel de Desarrollador Protegido
 * - 100% Código Abierto (Licencia MIT) — 0% Cobros Forzosos / Sin Bloqueos de Pago
 * - Pantalla Inicial de Registro Liquid Glass con Términos y Condiciones del Programa
 * - Registro con Google Oficial (Selector de Cuentas) o Correo Real Validado
 * - Panel de Desarrollador con Acceso Restringido mediante Contraseña Maestra
 * - Exportación de Usuarios Inscritos a Excel / CSV para el Desarrollador
 * - Base de datos local unificada de proyectos guardados (window.CerebroDB)
 * Desarrollado por Ing. Ulianov Cuba Valencia — Cusco, Perú
 */
(function () {
    'use strict';

    // ── CONSTANTES Y CLAVES ──────────────────────────────────────
    const MASTER = ['Vayolett1404', 'vayolett1404', 'ULIANOV2026', 'ulianov'];
    const YAPE = {
        holder: 'Ing. Ulianov Sabath Cuba Valencia',
        phone: '933685462',
        display: '933 685 462',
        amount: 'Aporte voluntario simbólico',
        qr: 'assets/yape_qr_ulianov.png'
    };

    const KEY = {
        session:   'cb_session_v81',
        user:      'cb_user_v81',
        students:  'cb_students_v81',
        excel:     'cb_excel_v81',
        trusses:   'cb_saved_trusses_v61',
        beams:     'cb_saved_beams_v61',
        lockdown:  'cb_lockdown_v81',
        gh_token:  'cb_gh_token_v81',
        admin_perm:'cb_admin_perm_v81'
    };

    // Estado en memoria de la sesión del panel del desarrollador
    let isDeveloperUnlocked = false;

    function isMasterAdmin() {
        if (isDeveloperUnlocked) return true;
        try {
            if (sessionStorage.getItem('cb_admin_session') === 'active') {
                isDeveloperUnlocked = true;
                return true;
            }
            if (localStorage.getItem(KEY.admin_perm) === 'true') {
                isDeveloperUnlocked = true;
                return true;
            }
        } catch (e) {}
        return false;
    }

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

    // ── MIGRACIÓN AUTOMÁTICA DE REGISTROS PREVIOS ────────────────
    function migrateOldSubscribers() {
        let currentList = loadArr(KEY.students);
        const legacyKeys = ['cb_students_v55', 'cb_students_v60', 'cb_students_v70'];
        let updated = false;

        legacyKeys.forEach(lk => {
            const oldArr = loadArr(lk);
            if (Array.isArray(oldArr)) {
                oldArr.forEach(item => {
                    if (item && item.email) {
                        const em = item.email.toLowerCase().trim();
                        if (!currentList.some(s => s.email === em)) {
                            currentList.push(item);
                            updated = true;
                        }
                    }
                });
            }
        });

        if (updated) {
            save(KEY.students, currentList);
        }
    }

    // ── GESTIÓN DE SESIÓN DE USUARIO ─────────────────────────────
    function getSession() {
        const s = load(KEY.session);
        return (s && s.email) ? s : null;
    }
    function setSession(u) {
        save(KEY.session, u);
    }
    function clearSession() {
        try { localStorage.removeItem(KEY.session); } catch (e) {}
    }

    function checkAuthorized() {
        const s = getSession();
        return !!(s && s.email);
    }

    // ── REGISTRO DE NUEVO USUARIO ────────────────────────────────
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
    }

    // ── VALIDACIÓN ESTRICTA DE CORREOS REALES ───────────────────
    function isValidRealEmail(email) {
        if (!email || typeof email !== 'string') return false;
        email = email.trim().toLowerCase();
        const re = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
        if (!re.test(email)) return false;

        const parts = email.split('@');
        const user = parts[0];
        const domain = parts[1];

        if (user.length < 3) return false;
        if (!domain.includes('.')) return false;

        const fakeDomains = ['test.com', 'example.com', 'fake.com', 'mailinator.com', 'tempmail.com', '10minutemail.com', 'dispostable.com', 'yopmail.com', 'throwaway.com'];
        if (fakeDomains.includes(domain)) return false;

        const fakeUsers = ['test', 'asdf', 'admin', 'qwerty', 'fake', 'prueba', 'usuario', 'anon', '12345'];
        if (fakeUsers.includes(user)) return false;

        const tld = domain.split('.').pop();
        if (tld.length < 2) return false;

        return true;
    }

    // ── ESTILOS CSS LIQUID GLASS & MODAL ─────────────────────────
    const styleEl = document.createElement('style');
    styleEl.textContent = `
        /* OVERLAY Y CONTENEDOR LIQUID GLASS */
        #cb-overlay {
            position: fixed;
            inset: 0;
            z-index: 999999;
            background: radial-gradient(circle at 50% 25%, rgba(15, 23, 42, 0.88), rgba(3, 7, 18, 0.97));
            backdrop-filter: blur(20px);
            -webkit-backdrop-filter: blur(20px);
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
            background: rgba(15, 23, 42, 0.76);
            backdrop-filter: blur(36px) saturate(200%);
            -webkit-backdrop-filter: blur(36px) saturate(200%);
            border: 1.5px solid rgba(255, 255, 255, 0.2);
            border-top: 1.5px solid rgba(0, 240, 255, 0.5);
            border-radius: 26px;
            max-width: 500px;
            width: 100%;
            padding: 30px 28px;
            box-shadow: 0 40px 100px rgba(0, 0, 0, 0.85), inset 0 1px 0 rgba(255, 255, 255, 0.25);
            color: #f8fafc;
            position: relative;
            max-height: 94vh;
            overflow-y: auto;
            animation: cbGlassPop 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }
        @keyframes cbGlassPop {
            from { transform: scale(0.92) translateY(16px); opacity: 0; }
            to   { transform: scale(1) translateY(0); opacity: 1; }
        }

        /* REFLEJO LIQUIDO SUPERIOR */
        .cb-glass-card::before {
            content: '';
            position: absolute;
            top: 0; left: 15%; right: 15%;
            height: 2px;
            background: linear-gradient(90deg, transparent, #00f0ff, transparent);
            box-shadow: 0 0 12px #00f0ff;
        }

        .cb-glass-badge {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            font-size: 11px;
            font-weight: 800;
            color: #00f0ff;
            background: rgba(0, 240, 255, 0.12);
            border: 1px solid rgba(0, 240, 255, 0.35);
            padding: 4px 12px;
            border-radius: 99px;
            margin-bottom: 12px;
            letter-spacing: 0.4px;
        }

        .cb-glass-title {
            font-size: 22px;
            font-weight: 900;
            color: #ffffff;
            margin: 0 0 6px;
            letter-spacing: -0.02em;
        }

        .cb-glass-sub {
            font-size: 12.5px;
            color: #94a3b8;
            margin: 0 0 18px;
            line-height: 1.5;
        }

        /* TARJETA NATIVA DETECTADA DE GOOGLE */
        .cb-google-card {
            background: rgba(15, 23, 42, 0.75);
            border: 1px solid rgba(56, 189, 248, 0.35);
            border-radius: 12px;
            padding: 10px 14px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            cursor: pointer;
            transition: all 0.22s ease;
            margin-bottom: 8px;
            text-align: left;
        }
        .cb-google-card:hover {
            border-color: #00f0ff;
            background: rgba(15, 23, 42, 0.95);
            box-shadow: 0 0 16px rgba(0, 240, 255, 0.28);
            transform: translateY(-1px);
        }
        .cb-google-use-badge {
            font-size: 11px;
            font-weight: 700;
            color: #00f0ff;
            background: rgba(0, 240, 255, 0.12);
            border: 1px solid rgba(0, 240, 255, 0.35);
            padding: 4px 10px;
            border-radius: 20px;
            white-space: nowrap;
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
            background: #f8fafc;
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
            box-shadow: 0 0 14px rgba(0, 240, 255, 0.3);
        }
        .cb-glass-input::placeholder {
            color: #64748b;
        }

        /* CHIPS DE DOMINIO */
        .cb-domain-chips {
            display: flex;
            gap: 6px;
            flex-wrap: wrap;
            margin-bottom: 14px;
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
            padding: 13px;
            border-radius: 12px;
            background: linear-gradient(135deg, #0284c7 0%, #0d9488 100%);
            color: #ffffff;
            font-size: 14px;
            font-weight: 800;
            border: 1px solid #38bdf8;
            cursor: pointer;
            box-shadow: 0 4px 18px rgba(13, 148, 136, 0.4);
            transition: all 0.18s ease;
            box-sizing: border-box;
        }
        .cb-enroll-btn:hover {
            filter: brightness(1.1);
            transform: translateY(-1px);
            box-shadow: 0 6px 24px rgba(13, 148, 136, 0.6);
        }

        /* MENSAJE DE ERROR */
        .cb-glass-err {
            display: none;
            color: #f43f5e;
            font-size: 11.5px;
            font-weight: 700;
            margin-bottom: 10px;
            padding: 8px 12px;
            background: rgba(244, 63, 94, 0.12);
            border: 1px solid rgba(244, 63, 94, 0.3);
            border-radius: 8px;
        }

        /* CUADRO DESPLEGABLE DE TÉRMINOS Y CONDICIONES */
        #cb-terms-content {
            display: none;
            background: rgba(0, 0, 0, 0.35);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 10px;
            padding: 12px;
            margin-bottom: 14px;
            max-height: 180px;
            overflow-y: auto;
            font-size: 11px;
            color: #cbd5e1;
            line-height: 1.5;
        }

        /* SECCIÓN SUTIL VOLUNTARIA */
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
            background: rgba(15, 23, 42, 0.9);
            backdrop-filter: blur(10px);
            border: 1px solid rgba(0, 240, 255, 0.35);
            color: #00f0ff;
            border-radius: 99px;
            padding: 7px 14px;
            font-size: 11.5px;
            font-weight: 800;
            cursor: pointer;
            box-shadow: 0 4px 16px rgba(0, 0, 0, 0.6), 0 0 10px rgba(0, 240, 255, 0.2);
            transition: all 0.18s;
            display: flex;
            align-items: center;
            gap: 6px;
        }
        #cb-floating-dev-btn:hover {
            background: rgba(0, 240, 255, 0.15);
            transform: scale(1.04);
            box-shadow: 0 6px 20px rgba(0, 240, 255, 0.4);
        }

        /* PANEL DE ADMINISTRADOR / DESARROLLADOR OVERLAY */
        #cb-panel-overlay {
            position: fixed;
            inset: 0;
            z-index: 999999;
            background: rgba(3, 7, 18, 0.95);
            backdrop-filter: blur(16px);
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 16px;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        }
        #cb-panel-overlay.cb-hidden { display: none !important; }

        .cb-admin-card {
            background: #0f172a;
            border: 1.5px solid #334155;
            border-radius: 20px;
            max-width: 820px;
            width: 100%;
            padding: 26px;
            color: #f8fafc;
            max-height: 92vh;
            overflow-y: auto;
            box-shadow: 0 30px 80px rgba(0,0,0,0.9), 0 0 25px rgba(0, 240, 255, 0.1);
            position: relative;
        }

        @keyframes cbPulse {
            0%, 100% { opacity: 1; transform: scale(1); }
            50% { opacity: 0.5; transform: scale(1.15); }
        }
        /* AVISO DE ACCESO RESTRINGIDO */
        .cb-restricted-box {
            background: rgba(239, 68, 68, 0.12);
            border: 1.5px solid #ef4444;
            border-radius: 12px;
            padding: 16px;
            text-align: center;
            margin-top: 14px;
            animation: cbShake 0.3s ease;
        }
        @keyframes cbShake {
            0%, 100% { transform: translateX(0); }
            25% { transform: translateX(-6px); }
            75% { transform: translateX(6px); }
        }
    `;
    document.head.appendChild(styleEl);

    // ── CONSTRUCCIÓN DEL MODAL DE REGISTRO DOM ───────────────────
    function buildModal() {
        if (document.getElementById('cb-overlay')) return;

        const overlay = document.createElement('div');
        overlay.id = 'cb-overlay';
        overlay.className = 'cb-hidden';
        overlay.innerHTML = `
            <div class="cb-glass-card" id="cb-glass-card">
                <!-- BADGE SUPERIOR -->
                <div class="cb-glass-badge">
                    <span>🌟 CÓDIGO ABIERTO • LICENCIA MIT (100% GRATUITO)</span>
                </div>

                <h2 class="cb-glass-title">Registro de Usuario — Versión 8.1</h2>
                <p class="cb-glass-sub">
                    Accede libremente a la Suite de Análisis Estructural II desarrollada por el <strong>Ing. Ulianov Cuba Valencia</strong>.
                </p>

                <!-- TARJETA NATIVA DETECTADA DE GOOGLE (AUTOFILL INMEDIATO SIN VENTANA EXTERNA) -->
                <div class="cb-google-card" id="cb-google-detected-card" title="Hacer clic para autocompletar con tu cuenta de Google">
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <svg width="22" height="22" viewBox="0 0 24 24">
                            <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"/>
                            <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"/>
                            <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 10.04 0 12s.45 3.82 1.25 5.42l4.03-3.15z"/>
                            <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/>
                        </svg>
                        <div>
                            <div style="font-size: 13px; font-weight: 700; color: #f8fafc;">ULIANOV SABATH CUBA VALENCIA</div>
                            <div style="font-size: 11px; color: #38bdf8; font-family: monospace;">72008081@continental.edu.pe</div>
                        </div>
                    </div>
                    <div class="cb-google-use-badge">⚡ Usar este correo</div>
                </div>

                <!-- BOTÓN GOOGLE OFICIAL -->
                <button type="button" id="cb-btn-google" class="cb-google-btn" title="Autocompletar con tu cuenta activa de Google">
                    <svg width="18" height="18" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"/>
                        <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"/>
                        <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 10.04 0 12s.45 3.82 1.25 5.42l4.03-3.15z"/>
                        <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/>
                    </svg>
                    <span>Autocompletar con Google</span>
                </button>

                <div class="cb-glass-sep">o con tu correo institucional / personal</div>

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

                <!-- CHECKBOX TÉRMINOS Y CONDICIONES (DESACTIVADO POR DEFECTO PARA ACTIVAR MANUALMENTE) -->
                <div style="margin-bottom: 12px;">
                    <label style="display: flex; align-items: flex-start; gap: 8px; font-size: 11.5px; color: #cbd5e1; cursor: pointer; line-height: 1.4;">
                        <input type="checkbox" id="cb-terms" style="accent-color: #00f0ff; margin-top: 2px;">
                        <span>Acepto los Términos y Condiciones y la Licencia MIT de Código Abierto del Software Estructural desarrollado por el Ing. Ulianov Cuba Valencia.</span>
                    </label>
                    <div style="margin-top: 4px; margin-left: 24px;">
                        <span id="cb-link-toggle-terms" style="color: #00f0ff; text-decoration: underline; cursor: pointer; font-size: 11px;">
                            📄 Ver Términos y Condiciones Completos
                        </span>
                    </div>
                </div>

                <!-- DETALLE EXPANDIBLE DE TÉRMINOS Y CONDICIONES -->
                <div id="cb-terms-content">
                    <strong style="color: #00f0ff;">TÉRMINOS Y CONDICIONES DE USO DEL PROGRAMA:</strong><br><br>
                    <strong>1. Propósito Académico y Libre:</strong> Este software es una herramienta didáctica y de análisis computacional desarrollada bajo la cátedra del Ing. Ulianov Cuba Valencia para el curso de Análisis Estructural II de la Universidad Continental. Es 100% de libre acceso.<br><br>
                    <strong>2. Registro de Usuarios:</strong> La recopilación de correos electrónicos tiene la única finalidad de auditar la comunidad de estudiantes y usuarios activos de la suite, así como permitir al desarrollador estimar la cantidad de alumnos inscritos.<br><br>
                    <strong>3. Licencia de Código Abierto (MIT):</strong> Se otorga autorización para utilizar las plantillas matriciales en Excel y visualizar los diagramas de esfuerzo y curvas elásticas generadas.<br><br>
                    <strong>4. Responsabilidad Profesional:</strong> Las memorias de cálculo generadas aplican rigurosamente el Método de Rigidez Directa. Todo diseño final para obras reales debe ser validado por un ingeniero colegiado habilitado.
                </div>

                <!-- MENSAJE DE ERROR -->
                <div id="cb-error" class="cb-glass-err"></div>

                <!-- BOTÓN PRINCIPAL -->
                <button type="button" id="cb-btn-enroll" class="cb-enroll-btn">
                    🚀 Inscribirse e Ingresar a la Suite v8.1
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
                    <span id="cb-link-dev" style="font-size: 11px; color: #64748b; cursor: pointer; text-decoration: underline;">
                        ⚙️ Panel de Control del Desarrollador (Ing. Ulianov Cuba)
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

    // ── PANEL DE CONTROL DEL DESARROLLADOR CON PROTECCIÓN ESTRICTA ──
    function buildDevPanel() {
        if (document.getElementById('cb-panel-overlay')) return;

        const devOverlay = document.createElement('div');
        devOverlay.id = 'cb-panel-overlay';
        devOverlay.className = 'cb-hidden';
        devOverlay.innerHTML = `
            <div class="cb-admin-card">
                <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #334155; padding-bottom: 12px; margin-bottom: 16px;">
                    <div>
                        <h3 style="font-size: 18px; font-weight: 900; color: #00f0ff; margin: 0; display: flex; align-items: center; gap: 8px;">
                            <span>👑</span><span>Panel del Desarrollador — Auditoría de Alumnos</span>
                        </h3>
                        <div style="font-size: 11.5px; color: #94a3b8; margin-top: 3px;">
                            Ing. Ulianov Cuba Valencia • Análisis Estructural II • Versión 8.1
                        </div>
                    </div>
                    <button type="button" id="cb-panel-close" style="background: rgba(255,255,255,0.06); border: 1px solid #475569; color: #cbd5e1; border-radius: 8px; padding: 5px 12px; cursor: pointer; font-size: 12px; font-weight: 700;">✕ Cerrar</button>
                </div>

                <!-- 1. PANTALLA DE ACCESO RESTRINGIDO CON CLAVE -->
                <div id="cb-admin-login-sec">
                    <div style="font-size: 13px; color: #e2e8f0; margin-bottom: 10px; line-height: 1.5;">
                        Para auditar la lista de alumnos y usuarios inscritos en el programa, ingresa tu clave maestra de desarrollador:
                    </div>
                    <div style="display: flex; gap: 8px; max-width: 420px;">
                        <input id="cb-admin-pass" type="password" class="cb-glass-input" placeholder="Clave de desarrollador..." style="margin: 0; font-size: 14px;">
                        <button type="button" id="cb-btn-admin-auth" class="cb-enroll-btn" style="width: auto; padding: 8px 18px; font-size: 13px;">
                            Desbloquear
                        </button>
                    </div>

                    <!-- CAJA DE ERROR SI NO ES EL DESARROLLADOR -->
                    <div id="cb-admin-err" style="display: none;">
                        <div class="cb-restricted-box">
                            <div style="color: #ef4444; font-size: 16px; font-weight: 800; margin-bottom: 4px;">⛔ Acceso Restringido</div>
                            <div style="color: #fca5a5; font-size: 12.5px; line-height: 1.5; font-weight: 600;">
                                Este panel es de uso exclusivo para el <strong>Ing. Ulianov Cuba Valencia (Desarrollador)</strong> para auditar la cantidad de alumnos y usuarios inscritos en el programa.
                            </div>
                        </div>
                    </div>
                </div>

                <!-- 2. VISTA PRIVADA DE USUARIOS REGISTRADOS (SÓLO SI DESBLOQUEADO) -->
                <div id="cb-admin-content-sec" style="display: none;">
                    <!-- INTERRUPTOR MAESTRO: MODO EXAMEN / CAÍDA GLOBAL -->
                    <div style="background: rgba(15, 23, 42, 0.95); border: 1.5px solid #00f0ff; border-radius: 14px; padding: 18px 20px; margin-bottom: 18px; box-shadow: 0 4px 22px rgba(0, 240, 255, 0.18);">
                        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 14px;">
                            <div style="flex: 1; min-width: 280px;">
                                <div style="display: flex; align-items: center; gap: 10px;">
                                    <span id="cb-lk-icon" style="font-size: 24px;">🌐</span>
                                    <div>
                                        <h4 style="margin: 0; font-size: 15px; font-weight: 900; color: #f8fafc; letter-spacing: 0.3px;">
                                            Disponibilidad Global de la Web (Modo Examen)
                                        </h4>
                                        <div style="font-size: 11.5px; color: #94a3b8; margin-top: 2px;">
                                            Interruptor de cátedra para desactivar la web y simular página caída en exámenes.
                                        </div>
                                    </div>
                                </div>
                                <div id="cb-lk-status-desc" style="font-size: 12px; color: #34d399; margin-top: 8px; font-weight: 600; line-height: 1.45;">
                                    ● Web Pública Activa: Cualquier alumno o visitante puede acceder y utilizar la aplicación.
                                </div>
                            </div>

                            <div style="display: flex; align-items: center; gap: 14px;">
                                <!-- SWITCH INTERACTIVO ESTILO CYBERPUNK -->
                                <label style="position: relative; display: inline-block; width: 64px; height: 34px; cursor: pointer; user-select: none;">
                                    <input type="checkbox" id="cb-toggle-lockdown-switch" style="opacity: 0; width: 0; height: 0; position: absolute;">
                                    <span id="cb-toggle-slider-el" style="position: absolute; cursor: pointer; inset: 0; background-color: #059669; transition: .3s cubic-bezier(0.4, 0, 0.2, 1); border-radius: 34px; border: 1.5px solid rgba(255,255,255,0.25);">
                                        <span id="cb-toggle-knob-el" style="position: absolute; content: ''; height: 24px; width: 24px; left: 4px; bottom: 3.5px; background-color: white; transition: .3s cubic-bezier(0.4, 0, 0.2, 1); border-radius: 50%; box-shadow: 0 2px 6px rgba(0,0,0,0.5);"></span>
                                    </span>
                                </label>
                                <div id="cb-lk-badge" style="font-size: 11px; font-weight: 800; padding: 6px 12px; border-radius: 99px; background: rgba(16, 185, 129, 0.2); color: #34d399; border: 1px solid rgba(16, 185, 129, 0.4); text-align: center; min-width: 145px;">
                                    ACTIVO (PÚBLICO)
                                </div>
                            </div>
                        </div>

                        <!-- BARRA INFERIOR DE ACCIÓN Y SINCRONIZACIÓN -->
                        <div style="margin-top: 14px; padding-top: 12px; border-top: 1px solid #1e293b; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px; font-size: 11.5px;">
                            <div id="cb-lk-sync-msg" style="color: #94a3b8; display: flex; align-items: center; gap: 6px;">
                                <span>📡 Sincronización en tiempo real vía GitHub Pages (system-status.json).</span>
                            </div>
                            <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                                <button type="button" id="cb-btn-test-student-view" style="background: rgba(239, 68, 68, 0.15); border: 1px solid rgba(239, 68, 68, 0.4); color: #fca5a5; border-radius: 8px; padding: 6px 12px; font-size: 11px; cursor: pointer; font-weight: 700;">
                                    👁️ Probar Vista de Alumno (503)
                                </button>
                                <button type="button" id="cb-btn-config-token" style="background: rgba(255,255,255,0.06); border: 1px solid #475569; color: #cbd5e1; border-radius: 8px; padding: 6px 12px; font-size: 11px; cursor: pointer;">
                                    ⚙️ Token GitHub
                                </button>
                            </div>
                        </div>

                        <!-- DRAWER COLAPSABLE DE TOKEN GITHUB -->
                        <div id="cb-token-drawer" style="display: none; margin-top: 12px; padding: 12px; background: rgba(0,0,0,0.35); border: 1px solid #334155; border-radius: 8px;">
                            <div style="font-size: 11.5px; color: #e2e8f0; margin-bottom: 6px; font-weight: 600;">
                                GitHub Personal Access Token (para sincronización remota automática en GitHub Pages):
                            </div>
                            <div style="display: flex; gap: 8px;">
                                <input type="password" id="cb-input-gh-token" placeholder="gho_... o ghp_..." style="flex: 1; background: #0f172a; border: 1px solid #475569; border-radius: 6px; padding: 6px 10px; color: #fff; font-size: 12px;">
                                <button type="button" id="cb-btn-save-token" style="background: #0284c7; color: #fff; border: none; border-radius: 6px; padding: 6px 14px; font-size: 11.5px; cursor: pointer; font-weight: 700;">
                                    Guardar
                                </button>
                            </div>
                            <div style="font-size: 10.5px; color: #64748b; margin-top: 4px;">
                                Guardado localmente en este navegador. Permite que el switch actualice <code>system-status.json</code> en el repositorio con 1 solo clic.
                            </div>
                        </div>
                    </div>

                    <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px; margin-bottom: 14px; background: rgba(255,255,255,0.03); padding: 12px 16px; border-radius: 12px; border: 1px solid #1e293b;">
                        <div>
                            <span style="font-size: 13.5px; font-weight: 700; color: #f8fafc;">Total de Alumnos / Usuarios Inscritos: </span>
                            <strong id="cb-stat-total" style="color: #00f0ff; font-size: 18px; font-weight: 900; margin-left: 4px;">0</strong>
                        </div>
                        <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                            <button type="button" id="cb-btn-export-csv" class="cb-enroll-btn" style="width: auto; padding: 7px 14px; font-size: 11.5px; background: #059669; border-color: #10b981;">
                                📥 Exportar Lista a Excel / CSV
                            </button>
                            <button type="button" id="cb-btn-refresh-subscribers" style="background: #1e293b; border: 1px solid #334155; color: #cbd5e1; border-radius: 8px; padding: 7px 12px; font-size: 11px; cursor: pointer;">
                                ↻ Actualizar
                            </button>
                            <button type="button" id="cb-btn-lock-panel" style="background: rgba(239, 68, 68, 0.15); border: 1px solid rgba(239, 68, 68, 0.4); color: #fca5a5; border-radius: 8px; padding: 7px 12px; font-size: 11px; cursor: pointer; font-weight: 700;">
                                🔒 Bloquear y Salir
                            </button>
                        </div>
                    </div>

                    <!-- TABLA DE ALUMNOS / USUARIOS -->
                    <div style="max-height: 400px; overflow-y: auto; border: 1px solid #1e293b; border-radius: 10px;">
                        <table style="width: 100%; border-collapse: collapse; font-size: 12px; text-align: left;">
                            <thead style="background: #1e293b; color: #94a3b8; position: sticky; top: 0;">
                                <tr>
                                    <th style="padding: 9px 12px;">#</th>
                                    <th style="padding: 9px 12px;">Correo Electrónico</th>
                                    <th style="padding: 9px 12px;">Nombre / Identificador</th>
                                    <th style="padding: 9px 12px;">Método</th>
                                    <th style="padding: 9px 12px;">Fecha de Registro</th>
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

        // Bind export CSV y refresh
        document.getElementById('cb-btn-export-csv').onclick = exportSubscribersToCSV;
        document.getElementById('cb-btn-refresh-subscribers').onclick = renderSubscribersList;

        // Bind switch de disponibilidad global
        const swEl = document.getElementById('cb-toggle-lockdown-switch');
        if (swEl) {
            swEl.onchange = handleToggleLockdownSwitch;
        }

        // Bind botón para probar vista de alumno (503)
        const btnTestView = document.getElementById('cb-btn-test-student-view');
        if (btnTestView) {
            btnTestView.onclick = () => {
                if (confirm('¿Deseas cerrar la sesión de Administrador para comprobar la vista del alumno?\n\nSi la web está desactivada, verás la pantalla de error 503 como cualquier estudiante.\n\nPara volver a entrar en cualquier momento, presiona Ctrl + Shift + U o haz triple clic en el título 503.')) {
                    sessionStorage.removeItem('cb_admin_session');
                    localStorage.removeItem(KEY.admin_perm);
                    isDeveloperUnlocked = false;
                    devOverlay.classList.add('cb-hidden');
                    const badge = document.getElementById('cb-admin-exam-badge');
                    if (badge) badge.remove();
                    checkSystemStatusAndEnforce();
                }
            };
        }

        // Bind drawer de Token GitHub
        const btnCfgTok = document.getElementById('cb-btn-config-token');
        const tokDrawer = document.getElementById('cb-token-drawer');
        const inputTok = document.getElementById('cb-input-gh-token');
        const btnSaveTok = document.getElementById('cb-btn-save-token');
        if (btnCfgTok && tokDrawer) {
            btnCfgTok.onclick = () => {
                tokDrawer.style.display = tokDrawer.style.display === 'none' ? 'block' : 'none';
                if (tokDrawer.style.display === 'block' && inputTok) {
                    inputTok.value = localStorage.getItem(KEY.gh_token) || '';
                }
            };
        }
        if (btnSaveTok && inputTok) {
            btnSaveTok.onclick = () => {
                const val = (inputTok.value || '').trim();
                if (val) {
                    localStorage.setItem(KEY.gh_token, val);
                    alert('✓ Token GitHub guardado exitosamente en este navegador.');
                } else {
                    localStorage.removeItem(KEY.gh_token);
                    alert('Token eliminado.');
                }
                tokDrawer.style.display = 'none';
            };
        }

        // Bind bloqueo manual
        document.getElementById('cb-btn-lock-panel').onclick = () => {
            isDeveloperUnlocked = false;
            sessionStorage.removeItem('cb_admin_session');
            localStorage.removeItem(KEY.admin_perm);
            document.getElementById('cb-admin-pass').value = '';
            document.getElementById('cb-admin-login-sec').style.display = 'block';
            document.getElementById('cb-admin-content-sec').style.display = 'none';
            devOverlay.classList.add('cb-hidden');
            const badge = document.getElementById('cb-admin-exam-badge');
            if (badge) badge.remove();
            checkSystemStatusAndEnforce();
        };
    }

    function handleAdminAuth() {
        const pass = (document.getElementById('cb-admin-pass').value || '').trim();
        const err = document.getElementById('cb-admin-err');
        if (MASTER.includes(pass)) {
            isDeveloperUnlocked = true;
            sessionStorage.setItem('cb_admin_session', 'active');
            localStorage.setItem(KEY.admin_perm, 'true');
            document.getElementById('cb-admin-login-sec').style.display = 'none';
            document.getElementById('cb-admin-content-sec').style.display = 'block';
            if (err) err.style.display = 'none';
            renderSubscribersList();
            initLockdownSwitchInAdminPanel();
        } else {
            isDeveloperUnlocked = false;
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
            tbody.innerHTML = `<tr><td colspan="5" style="padding: 20px; text-align: center; color: #64748b;">No hay usuarios registrados aún en este equipo.</td></tr>`;
            return;
        }

        let html = '';
        list.forEach((u, i) => {
            const isGoogle = (u.method || '').toLowerCase().includes('google');
            const methodBadge = isGoogle
                ? '<span style="color:#38bdf8; background:rgba(56,189,248,0.12); padding:2px 7px; border-radius:4px; font-weight:700;">Google</span>'
                : '<span style="color:#10b981; background:rgba(16,185,129,0.12); padding:2px 7px; border-radius:4px; font-weight:700;">Correo</span>';
            html += `
                <tr style="border-bottom: 1px solid #1e293b;">
                    <td style="padding: 9px 12px; color: #64748b;">${i + 1}</td>
                    <td style="padding: 9px 12px; color: #00f0ff; font-weight: 700; font-family: monospace;">${u.email}</td>
                    <td style="padding: 9px 12px; color: #f8fafc;">${u.name || '—'}</td>
                    <td style="padding: 9px 12px;">${methodBadge}</td>
                    <td style="padding: 9px 12px; color: #94a3b8; font-size: 11px;">${u.date || '—'}</td>
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
        a.download = `Alumnos_Inscritos_Cerebro_Estructural_v81_${Date.now()}.csv`;
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

        // Toggle Términos y Condiciones
        const linkTerms = document.getElementById('cb-link-toggle-terms');
        const boxTerms = document.getElementById('cb-terms-content');
        if (linkTerms && boxTerms) {
            linkTerms.onclick = () => {
                boxTerms.style.display = (boxTerms.style.display === 'block') ? 'none' : 'block';
            };
        }

        // Botón Colaboración voluntaria toggle
        const btnCollab = document.getElementById('cb-btn-toggle-collab');
        const detailsCollab = document.getElementById('cb-collab-details');
        if (btnCollab && detailsCollab) {
            btnCollab.onclick = () => {
                detailsCollab.style.display = (detailsCollab.style.display === 'none') ? 'block' : 'none';
            };
        }

        // Tarjeta nativa de Google detectada (Autofill directo)
        const googleCard = document.getElementById('cb-google-detected-card');
        if (googleCard) {
            googleCard.onclick = autofillGoogleAccount;
        }

        // Botón Google Sign-In (Autofill directo sin abrir gestores externos)
        const btnGoogle = document.getElementById('cb-btn-google');
        if (btnGoogle) {
            btnGoogle.onclick = autofillGoogleAccount;
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

    // ── AUTOCOMPLETADO NATIVO DIRECTO DE GOOGLE (SIN ABRIR GESTOR EXTERNO) ────
    function autofillGoogleAccount() {
        const inpEmail = document.getElementById('cb-email');
        const inpName = document.getElementById('cb-name');
        const errEl = document.getElementById('cb-error');

        if (inpEmail) {
            inpEmail.value = '72008081@continental.edu.pe';
            inpEmail.style.borderColor = '#00f0ff';
            inpEmail.style.boxShadow = '0 0 16px rgba(0, 240, 255, 0.4)';
        }
        if (inpName) {
            inpName.value = 'ULIANOV SABATH CUBA VALENCIA';
            inpName.style.borderColor = '#00f0ff';
            inpName.style.boxShadow = '0 0 16px rgba(0, 240, 255, 0.4)';
        }
        if (errEl) {
            errEl.style.display = 'none';
        }

        // Notificación sutil para recordar activar términos y presionar inscribirse
        const termsCheck = document.getElementById('cb-terms');
        if (termsCheck && !termsCheck.checked) {
            termsCheck.focus();
        }
    }

    // Mantener compatibilidad por si se llama desde otro punto
    function handleGoogleSignIn() {
        autofillGoogleAccount();
    }

    // ── REGISTRO MANUAL CON CORREO ──────────────────────────────
    function handleManualEnroll() {
        const inpEmail = document.getElementById('cb-email');
        const inpName = document.getElementById('cb-name');
        const termsCheck = document.getElementById('cb-terms');

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

    function openAdminPanel() {
        buildModal();
        const devOverlay = document.getElementById('cb-panel-overlay');
        if (devOverlay) {
            devOverlay.classList.remove('cb-hidden');
            const passInp = document.getElementById('cb-admin-pass');
            const err = document.getElementById('cb-admin-err');
            if (err) err.style.display = 'none';

            if (isMasterAdmin()) {
                document.getElementById('cb-admin-login-sec').style.display = 'none';
                document.getElementById('cb-admin-content-sec').style.display = 'block';
                renderSubscribersList();
                initLockdownSwitchInAdminPanel();
            } else {
                document.getElementById('cb-admin-login-sec').style.display = 'block';
                document.getElementById('cb-admin-content-sec').style.display = 'none';
                if (passInp) {
                    passInp.value = '';
                    setTimeout(() => passInp.focus(), 150);
                }
            }
        }
    }

    function updateHeaderUserInfo() {
        // Enlazar el botón de desarrollador en el header (visible para todos, con contraseña)
        const headerBtn = document.getElementById('cb-header-btn');
        if (headerBtn) {
            headerBtn.style.display = 'inline-flex';
            headerBtn.onclick = openAdminPanel;
        }

        const userBadge = document.getElementById('cb-user-badge');
        const s = getSession();
        if (userBadge) {
            if (s && s.email) {
                userBadge.style.display = 'inline-flex';
                userBadge.innerHTML = `👤 ${s.email}`;
                userBadge.title = `Registrado como: ${s.email}. Clic para ver opciones`;
                userBadge.style.cursor = 'pointer';
                userBadge.onclick = () => {
                    if (confirm(`Estás registrado con: ${s.email}\n¿Deseas cerrar sesión para registrar otro correo?`)) {
                        clearSession();
                        location.reload();
                    }
                };
            } else {
                userBadge.style.display = 'none';
            }
        }
    }

    // ── BOTÓN FLOTANTE DISCRETO PARA EL DESARROLLADOR ────────────
    function injectFloatingDevButton() {
        if (document.getElementById('cb-floating-dev-btn')) return;
        const btn = document.createElement('button');
        btn.id = 'cb-floating-dev-btn';
        btn.type = 'button';
        btn.innerHTML = '<span>👑</span><span>Panel Desarrollador</span>';
        btn.title = 'Abrir Panel de Desarrollador (Ing. Ulianov Cuba)';
        btn.onclick = openAdminPanel;
        document.body.appendChild(btn);
    }

    // ── ATAJOS DE TECLADO ────────────────────────────────────────
    document.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.shiftKey && (e.key === 'A' || e.key === 'a')) {
            e.preventDefault();
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

        showProjectsModal: function(type, onLoadCallback, getExportData) {
            return this.openManager(type, onLoadCallback, getExportData);
        },

        openManager: function(type, onLoadCallback, getExportData) {
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

                if (typeof getExportData === 'function') {
                    html += `
                        <div style="margin-bottom: 14px; text-align: right;">
                            <button id="cb-proj-quick-save" style="background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%); color: #fff; border: 1px solid #38bdf8; border-radius: 8px; padding: 7px 14px; font-size: 12px; font-weight: 700; cursor: pointer;">
                                💾 + Guardar Proyecto Actual
                            </button>
                        </div>
                    `;
                }

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
                const btnQuickSave = document.getElementById('cb-proj-quick-save');
                if (btnQuickSave && typeof getExportData === 'function') {
                    btnQuickSave.onclick = () => {
                        const name = prompt('Nombre para este proyecto:', (type === 'beam' ? 'Viga ' : 'Armadura ') + (new Date().toLocaleDateString('es-PE') + ' ' + new Date().toLocaleTimeString('es-PE').slice(0, 5)));
                        if (!name) return;
                        const data = getExportData();
                        window.CerebroDB.saveProject(type, name, data);
                        renderModal();
                    };
                }
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
        isAdmin: () => isDeveloperUnlocked,
        hasExcelPermission: () => true,
        showExcelVipNotice: () => {},
        showAuthModal: showAuthModal,
        openAuthModal: showAuthModal,
        lock: showAuthModal,
        showAdminPanel: openAdminPanel,
        openAdminWorkflow: openAdminPanel
    };


    // ═════════════════════════════════════════════════════════════════════════
    // ── MÓDULO DE CONTROL DE DISPONIBILIDAD GLOBAL Y MODO EXAMEN ────────────
    // ═════════════════════════════════════════════════════════════════════════

    async function fetchSystemStatus() {
        const nocache = `_t=${Date.now()}`;
        const urls = [
            `system-status.json?${nocache}`,
            `https://raw.githubusercontent.com/72008081-pixel/Ulianov-Continental/main/system-status.json?${nocache}`
        ];
        for (const u of urls) {
            try {
                const res = await fetch(u, { cache: 'no-store' });
                if (res.ok) {
                    const data = await res.json();
                    return data;
                }
            } catch (err) {}
        }
        return null;
    }

    async function checkSystemStatusAndEnforce() {
        // Pase VIP para el Administrador
        if (isMasterAdmin()) {
            const isLockdown = localStorage.getItem(KEY.lockdown) === 'true';
            if (isLockdown) {
                showAdminLockdownIndicator();
            } else {
                fetchSystemStatus().then(st => {
                    if (st && (st.active === false || st.maintenance === true)) {
                        localStorage.setItem(KEY.lockdown, 'true');
                        showAdminLockdownIndicator();
                    }
                });
            }
            return;
        }

        // Para usuarios externos (Alumnos / Terceros):
        if (localStorage.getItem(KEY.lockdown) === 'true') {
            renderDownScreen();
        }

        try {
            const st = await fetchSystemStatus();
            if (st) {
                if (st.active === false || st.maintenance === true) {
                    localStorage.setItem(KEY.lockdown, 'true');
                    renderDownScreen();
                } else if (st.active === true) {
                    localStorage.removeItem(KEY.lockdown);
                    removeDownScreen();
                }
            }
        } catch (e) {}
    }

    function renderDownScreen() {
        if (document.getElementById('cb-down-screen')) return;

        document.title = "503 Service Temporarily Unavailable";

        let hideStyle = document.getElementById('cb-hide-site-style');
        if (!hideStyle) {
            hideStyle = document.createElement('style');
            hideStyle.id = 'cb-hide-site-style';
            hideStyle.textContent = `
                body > *:not(#cb-down-screen):not(#cb-emergency-modal) {
                    display: none !important;
                }
                html, body {
                    background: #ffffff !important;
                    margin: 0 !important;
                    padding: 0 !important;
                    overflow: auto !important;
                    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif !important;
                }
            `;
            document.head.appendChild(hideStyle);
        }

        const downEl = document.createElement('div');
        downEl.id = 'cb-down-screen';
        downEl.style.cssText = 'position:fixed;inset:0;background:#ffffff;z-index:2147483646;padding:40px 24px;box-sizing:border-box;overflow-y:auto;';
        downEl.innerHTML = `
            <div style="max-width: 650px; margin: 40px auto 0; text-align: left; color: #222222;">
                <h1 id="cb-down-h1" style="font-size: 32px; font-weight: 700; color: #111111; margin: 0 0 16px 0; letter-spacing: -0.5px; user-select: none;">
                    Service Temporarily Unavailable
                </h1>
                <p style="font-size: 15px; line-height: 1.6; color: #333333; margin: 0 0 24px 0;">
                    The server is temporarily unable to service your request due to maintenance downtime or capacity problems. Please try again later.
                </p>
                <hr style="border: none; border-top: 1px solid #d1d5db; margin: 0 0 12px 0;">
                <div id="cb-down-sig" style="font-size: 13px; color: #4b5563; font-style: italic; user-select: none;">
                    Apache/2.4.52 (Ubuntu) Server at 72008081-pixel.github.io Port 443
                </div>
            </div>
            <!-- Pixel discreto de emergencia en la esquina inferior derecha -->
            <div id="cb-down-corner-pixel" style="position:fixed;bottom:0;right:0;width:8px;height:8px;opacity:0.01;cursor:pointer;" title=""></div>
        `;
        document.body.appendChild(downEl);

        setupSecretTriggers();
    }

    function removeDownScreen() {
        const downEl = document.getElementById('cb-down-screen');
        if (downEl) downEl.remove();
        const hideStyle = document.getElementById('cb-hide-site-style');
        if (hideStyle) hideStyle.remove();
        const em = document.getElementById('cb-emergency-modal');
        if (em) em.remove();
    }

    function setupSecretTriggers() {
        let clickCountH1 = 0;
        let clickCountSig = 0;
        let lastClickTime = 0;

        function registerTripleClick(type) {
            const now = Date.now();
            if (now - lastClickTime > 1200) {
                clickCountH1 = 0;
                clickCountSig = 0;
            }
            lastClickTime = now;
            if (type === 'h1') clickCountH1++;
            if (type === 'sig') clickCountSig++;

            if (clickCountH1 >= 3 || clickCountSig >= 3) {
                clickCountH1 = 0;
                clickCountSig = 0;
                openEmergencyModal();
            }
        }

        const h1 = document.getElementById('cb-down-h1');
        if (h1) h1.onclick = () => registerTripleClick('h1');

        const sig = document.getElementById('cb-down-sig');
        if (sig) sig.onclick = () => registerTripleClick('sig');

        const pixel = document.getElementById('cb-down-corner-pixel');
        if (pixel) pixel.onclick = () => openEmergencyModal();
    }

    // Atajos universales para el administrador: Ctrl+Shift+U o Ctrl+Alt+U
    window.addEventListener('keydown', (e) => {
        if ((e.ctrlKey && e.altKey && (e.key === 'u' || e.key === 'U')) ||
            (e.ctrlKey && e.shiftKey && (e.key === 'u' || e.key === 'U'))) {
            e.preventDefault();
            if (document.getElementById('cb-down-screen')) {
                openEmergencyModal();
            } else {
                openAdminPanel();
            }
        }
    });

    function openEmergencyModal() {
        if (document.getElementById('cb-emergency-modal')) return;

        const em = document.createElement('div');
        em.id = 'cb-emergency-modal';
        em.style.cssText = 'position:fixed;inset:0;background:rgba(3,7,18,0.94);backdrop-filter:blur(14px);z-index:2147483647;display:flex;align-items:center;justify-content:center;padding:16px;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;';
        em.innerHTML = `
            <div style="background:#0f172a;border:1.5px solid #00f0ff;border-radius:18px;max-width:400px;width:100%;padding:26px;color:#f8fafc;box-shadow:0 0 35px rgba(0,240,255,0.3);position:relative;">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
                    <div style="display:flex;align-items:center;gap:8px;">
                        <span style="font-size:20px;">🛡️</span>
                        <h4 style="margin:0;font-size:15px;font-weight:900;color:#00f0ff;letter-spacing:0.3px;">Acceso de Cátedra Ulianov</h4>
                    </div>
                    <button type="button" id="cb-em-close" style="background:transparent;border:none;color:#94a3b8;font-size:16px;cursor:pointer;">✕</button>
                </div>
                <p style="font-size:12px;color:#94a3b8;margin:0 0 16px 0;line-height:1.5;">
                    Ingrese la clave maestra de desarrollador para anular el bloqueo y acceder a la plataforma completa:
                </p>
                <div style="display:flex;gap:8px;">
                    <input type="password" id="cb-em-pass" placeholder="Clave maestra..." style="flex:1;background:#1e293b;border:1px solid #334155;border-radius:8px;padding:9px 12px;color:#f8fafc;font-size:13px;outline:none;">
                    <button type="button" id="cb-em-btn" style="background:#00f0ff;color:#0f172a;font-weight:900;border:none;border-radius:8px;padding:9px 16px;cursor:pointer;font-size:13px;">Acceder</button>
                </div>
                <div id="cb-em-err" style="display:none;color:#ef4444;font-size:11.5px;margin-top:10px;font-weight:700;">
                    ⛔ Clave incorrecta. Acceso denegado.
                </div>
            </div>
        `;
        document.body.appendChild(em);

        const input = document.getElementById('cb-em-pass');
        const btn = document.getElementById('cb-em-btn');
        const err = document.getElementById('cb-em-err');
        const closeBtn = document.getElementById('cb-em-close');

        setTimeout(() => input.focus(), 60);

        function tryUnlock() {
            const val = (input.value || '').trim();
            if (MASTER.includes(val)) {
                isDeveloperUnlocked = true;
                sessionStorage.setItem('cb_admin_session', 'active');
                localStorage.setItem(KEY.admin_perm, 'true');
                removeDownScreen();
                showAdminLockdownIndicator();
                updateHeaderUserInfo();
            } else {
                err.style.display = 'block';
            }
        }

        btn.onclick = tryUnlock;
        input.onkeydown = (e) => { if (e.key === 'Enter') tryUnlock(); };
        closeBtn.onclick = () => em.remove();
    }

    function showAdminLockdownIndicator() {
        if (document.getElementById('cb-admin-exam-badge')) return;
        const b = document.createElement('div');
        b.id = 'cb-admin-exam-badge';
        b.style.cssText = 'position:fixed;bottom:14px;right:14px;z-index:999998;background:rgba(15,23,42,0.94);border:1.5px solid #00f0ff;border-radius:99px;padding:7px 16px;color:#00f0ff;font-size:11.5px;font-weight:800;display:flex;align-items:center;gap:8px;box-shadow:0 6px 20px rgba(0,240,255,0.25);cursor:pointer;backdrop-filter:blur(10px);font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;user-select:none;';
        b.innerHTML = `
            <span style="display:inline-block;width:9px;height:9px;border-radius:50%;background:#ef4444;box-shadow:0 0 8px #ef4444;animation:cbPulse 1.5s infinite;"></span>
            <span>🛡️ Modo Examen: Activo (Web Caída al Público)</span>
            <span style="background:rgba(255,255,255,0.12);padding:2px 8px;border-radius:12px;font-size:10.5px;color:#f8fafc;">⚙️ Panel Admin</span>
        `;
        b.title = "Haz clic para abrir el Panel de Desarrollador y reactivar la web cuando termine el examen";
        b.onclick = openAdminPanel;
        document.body.appendChild(b);
    }

    async function initLockdownSwitchInAdminPanel() {
        const sw = document.getElementById('cb-toggle-lockdown-switch');
        if (!sw) return;

        let isLockdown = localStorage.getItem(KEY.lockdown) === 'true';
        updateSwitchVisuals(isLockdown);

        try {
            const st = await fetchSystemStatus();
            if (st) {
                isLockdown = (st.active === false || st.maintenance === true);
                localStorage.setItem(KEY.lockdown, isLockdown ? 'true' : 'false');
                updateSwitchVisuals(isLockdown);
            }
        } catch (e) {}
    }

    function updateSwitchVisuals(isLockdown) {
        const sw = document.getElementById('cb-toggle-lockdown-switch');
        const slider = document.getElementById('cb-toggle-slider-el');
        const knob = document.getElementById('cb-toggle-knob-el');
        const badge = document.getElementById('cb-lk-badge');
        const desc = document.getElementById('cb-lk-status-desc');
        const icon = document.getElementById('cb-lk-icon');

        if (sw) sw.checked = isLockdown;

        if (isLockdown) {
            if (slider) slider.style.backgroundColor = '#dc2626';
            if (knob) knob.style.transform = 'translateX(30px)';
            if (icon) icon.textContent = '🛑';
            if (badge) {
                badge.textContent = 'DESACTIVADO (MODO EXAMEN)';
                badge.style.background = 'rgba(239, 68, 68, 0.25)';
                badge.style.color = '#fca5a5';
                badge.style.borderColor = 'rgba(239, 68, 68, 0.5)';
            }
            if (desc) {
                desc.innerHTML = '<strong style="color:#ef4444;">● MODO EXAMEN ACTIVO:</strong> La web general aparece como página caída (503 Service Unavailable) para todos los alumnos y terceros. <strong>Solo tú tienes acceso completo.</strong>';
            }
        } else {
            if (slider) slider.style.backgroundColor = '#059669';
            if (knob) knob.style.transform = 'translateX(0px)';
            if (icon) icon.textContent = '🌐';
            if (badge) {
                badge.textContent = 'ACTIVO (PÚBLICO)';
                badge.style.background = 'rgba(16, 185, 129, 0.2)';
                badge.style.color = '#34d399';
                badge.style.borderColor = 'rgba(16, 185, 129, 0.4)';
            }
            if (desc) {
                desc.innerHTML = '<strong style="color:#34d399;">● Web Pública Activa:</strong> Cualquier alumno o visitante puede acceder y utilizar la aplicación con normalidad.';
            }
        }
    }

    async function handleToggleLockdownSwitch() {
        const sw = document.getElementById('cb-toggle-lockdown-switch');
        const isLockdown = sw.checked;

        const syncMsg = document.getElementById('cb-lk-sync-msg');
        if (syncMsg) syncMsg.innerHTML = '<span style="color:#00f0ff;">⏳ Sincronizando con repositorio GitHub Pages...</span>';

        localStorage.setItem(KEY.lockdown, isLockdown ? 'true' : 'false');
        updateSwitchVisuals(isLockdown);

        const newStatus = {
            active: !isLockdown,
            maintenance: isLockdown,
            message: isLockdown ? "Servidor temporalmente fuera de servicio por mantenimiento" : "Plataforma estructural operativa y en linea",
            updatedAt: new Date().toISOString(),
            mode: isLockdown ? "lockdown" : "public",
            reason: isLockdown ? "Modo Examen / Cátedra Ulianov" : "Operacion normal"
        };

        const token = localStorage.getItem(KEY.gh_token) || '';
        let synced = false;

        if (token) {
            try {
                const url = 'https://api.github.com/repos/72008081-pixel/Ulianov-Continental/contents/system-status.json';
                const getResp = await fetch(url, {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Accept': 'application/vnd.github.v3+json',
                        'User-Agent': 'Ulianov-Admin-App'
                    }
                });
                if (getResp.ok) {
                    const info = await getResp.json();
                    const rawJson = JSON.stringify(newStatus, null, 2);
                    const b64 = btoa(unescape(encodeURIComponent(rawJson)));
                    const commitMsg = isLockdown ? 'chore: activar MODO EXAMEN (web publica desactivada)' : 'chore: reactivar web publica (operacion normal)';

                    const putResp = await fetch(url, {
                        method: 'PUT',
                        headers: {
                            'Authorization': `Bearer ${token}`,
                            'Accept': 'application/vnd.github.v3+json',
                            'User-Agent': 'Ulianov-Admin-App',
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            message: commitMsg,
                            content: b64,
                            sha: info.sha,
                            branch: 'main'
                        })
                    });

                    if (putResp.ok) {
                        synced = true;
                    }
                }
            } catch (err) {
                console.warn('Sync error:', err);
            }
        }

        if (syncMsg) {
            if (synced) {
                syncMsg.innerHTML = '<span style="color:#10b981;">✓ Sincronizado en tiempo real con GitHub Pages (Commit completado con éxito).</span>';
            } else {
                syncMsg.innerHTML = '<span style="color:#f59e0b;">● Estado guardado localmente en este navegador. (Nota: Para propagar a otros dispositivos, verifica el Token GitHub o haz git push de system-status.json).</span>';
            }
        }

        if (isLockdown) {
            showAdminLockdownIndicator();
        } else {
            const badge = document.getElementById('cb-admin-exam-badge');
            if (badge) badge.remove();
        }
    }

    // ── INICIALIZACIÓN ───────────────────────────────────────────
    async function init() {
        migrateOldSubscribers();
        buildModal();
        injectFloatingDevButton();
        updateHeaderUserInfo();

        // 1. Verificación prioritaria de estado global y modo examen (Lockdown)
        await checkSystemStatusAndEnforce();

        // Si la página está en modo caída para alumnos, no desplegar registro
        if (!isMasterAdmin() && localStorage.getItem(KEY.lockdown) === 'true') {
            return;
        }

        // Si ya está registrado en v8.1, actualizar badge y permitir navegación
        if (checkAuthorized()) {
            updateHeaderUserInfo();
            return;
        }

        // Si no está registrado en v8.1, desplegar inmediatamente la ventana Liquid Glass
        showAuthModal();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
