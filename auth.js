/**
 * auth.js — CEREBRO ESTRUCTURAL v9.0
 * Sistema de Autenticación Unificado sin Pasarela de Pago
 * Clave Única de Acceso: MIAU
 * Cátedra: Análisis Estructural II — Ing. Ulianov Cuba Valencia
 * Cobertura: Armaduras, Vigas, Pórticos y Mathcad Prime
 */
(function () {
    'use strict';

    // ── CONSTANTES Y CLAVE MAESTRA ───────────────────────────────
    const MASTER_PASSWORD = 'MIAU';
    const SESSION_KEY = 'cb_auth_session_miau_v1';
    const COUNTER_KEY = 'cb_user_counter_miau';
    const RESET_FLAG  = 'cb_miau_reset_done_v90';

    // Control de visibilidad del modal de contraseña:
    // false = Modal oculto, todo el mundo entra libremente sin pedir contraseña.
    // true  = Modal activo solicitando contraseña 'MIAU'.
    const GATE_ENABLED = false;

    // ── REINICIO COMPLETO Y ELIMINACIÓN DE USUARIOS PREVIOS ─────
    // Se eliminan todas las sesiones anteriores y se reinicia el conteo desde cero.
    (function resetPreviousUsers() {
        if (!localStorage.getItem(RESET_FLAG)) {
            const oldKeys = [
                'cb_session_v81', 'cb_user_v81', 'cb_students_v81', 'cb_excel_v81',
                'cb_lockdown_v81', 'cb_admin_perm_v81', 'cb_admin_session',
                'cb_session_v80', 'cb_students_v80', 'cb_session_v70',
                'cb_user', 'cb_students', 'cb_session', 'cb_users',
                'registered_users', 'user_count', 'cerebro_users'
            ];
            oldKeys.forEach(k => {
                try { localStorage.removeItem(k); } catch (e) {}
                try { sessionStorage.removeItem(k); } catch (e) {}
            });
            try {
                localStorage.setItem(COUNTER_KEY, '0');
                localStorage.setItem(RESET_FLAG, 'true');
            } catch (e) {}
        }
    })();

    // ── COMPROBACIÓN DE SESIÓN ACTIVA ────────────────────────────
    function isUnlocked() {
        if (!GATE_ENABLED) return true;
        try {
            return sessionStorage.getItem(SESSION_KEY) === 'true' ||
                   localStorage.getItem(SESSION_KEY) === 'true';
        } catch (e) {
            return true;
        }
    }

    function setUnlocked() {
        try {
            sessionStorage.setItem(SESSION_KEY, 'true');
            localStorage.setItem(SESSION_KEY, 'true');
            let count = parseInt(localStorage.getItem(COUNTER_KEY) || '0', 10) + 1;
            localStorage.setItem(COUNTER_KEY, String(count));
        } catch (e) {}
    }

    // ── INYECCIÓN DE ESTILOS CSS DEL MODAL ──────────────────────
    function injectStyles() {
        if (document.getElementById('cb-miau-styles')) return;
        const style = document.createElement('style');
        style.id = 'cb-miau-styles';
        style.textContent = `
            #cb-miau-overlay {
                position: fixed;
                inset: 0;
                z-index: 9999999;
                background: radial-gradient(circle at center, rgba(15, 23, 42, 0.96), rgba(7, 13, 25, 0.99));
                backdrop-filter: blur(14px);
                -webkit-backdrop-filter: blur(14px);
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 1.25rem;
                font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
                opacity: 1;
                transition: opacity 0.3s ease, visibility 0.3s ease;
            }
            #cb-miau-overlay.cb-hidden {
                opacity: 0;
                visibility: hidden;
                pointer-events: none;
            }
            .cb-miau-card {
                background: rgba(30, 41, 59, 0.75);
                border: 1px solid rgba(56, 189, 248, 0.35);
                border-radius: 1.25rem;
                box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.7), 0 0 45px rgba(56, 189, 248, 0.2);
                padding: 2.5rem 2rem;
                max-width: 440px;
                width: 100%;
                text-align: center;
                color: #f8fafc;
                position: relative;
                transform: scale(1);
                transition: transform 0.3s ease;
            }
            .cb-miau-badge {
                display: inline-flex;
                align-items: center;
                gap: 0.5rem;
                background: rgba(56, 189, 248, 0.12);
                border: 1px solid rgba(56, 189, 248, 0.4);
                color: #38bdf8;
                font-size: 0.72rem;
                font-weight: 700;
                letter-spacing: 0.05em;
                text-transform: uppercase;
                padding: 0.35rem 0.85rem;
                border-radius: 9999px;
                margin-bottom: 1.25rem;
            }
            .cb-miau-icon-box {
                width: 60px;
                height: 60px;
                margin: 0 auto 1.25rem;
                background: linear-gradient(135deg, rgba(56, 189, 248, 0.2), rgba(14, 165, 233, 0.05));
                border: 1px solid rgba(56, 189, 248, 0.4);
                border-radius: 1rem;
                display: flex;
                align-items: center;
                justify-content: center;
                box-shadow: 0 10px 20px -5px rgba(56, 189, 248, 0.3);
            }
            .cb-miau-icon-box svg {
                width: 30px;
                height: 30px;
                stroke: #38bdf8;
                fill: none;
                stroke-width: 2;
                stroke-linecap: round;
                stroke-linejoin: round;
            }
            .cb-miau-title {
                font-size: 1.35rem;
                font-weight: 800;
                letter-spacing: -0.02em;
                color: #ffffff;
                margin-bottom: 0.4rem;
            }
            .cb-miau-sub {
                font-size: 0.85rem;
                color: #94a3b8;
                line-height: 1.45;
                margin-bottom: 1.75rem;
            }
            .cb-miau-input-group {
                position: relative;
                margin-bottom: 1rem;
            }
            .cb-miau-input {
                width: 100%;
                background: #0f172a;
                border: 1.5px solid #475569;
                border-radius: 0.65rem;
                color: #f8fafc;
                font-size: 1.25rem;
                font-weight: 700;
                text-align: center;
                letter-spacing: 0.25em;
                padding: 0.85rem 1rem;
                outline: none;
                transition: border-color 0.2s, box-shadow 0.2s;
                box-sizing: border-box;
            }
            .cb-miau-input:focus {
                border-color: #38bdf8;
                box-shadow: 0 0 0 3px rgba(56, 189, 248, 0.25);
            }
            .cb-miau-err {
                color: #f43f5e;
                font-size: 0.8rem;
                font-weight: 600;
                margin-bottom: 1rem;
                display: none;
            }
            .cb-miau-btn {
                width: 100%;
                background: linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%);
                color: #ffffff;
                border: none;
                border-radius: 0.65rem;
                font-size: 0.95rem;
                font-weight: 800;
                letter-spacing: 0.03em;
                padding: 0.85rem 1.25rem;
                cursor: pointer;
                box-shadow: 0 10px 20px -5px rgba(14, 165, 233, 0.45);
                transition: transform 0.15s, box-shadow 0.15s, background 0.2s;
            }
            .cb-miau-btn:hover {
                background: linear-gradient(135deg, #38bdf8 0%, #0ea5e9 100%);
                box-shadow: 0 12px 24px -5px rgba(56, 189, 248, 0.55);
                transform: translateY(-1px);
            }
            .cb-miau-btn:active {
                transform: translateY(0);
            }
            .cb-miau-footer {
                margin-top: 1.5rem;
                font-size: 0.72rem;
                color: #64748b;
                border-top: 1px solid rgba(71, 85, 105, 0.4);
                padding-top: 1rem;
            }
            @keyframes cb-shake {
                0%, 100% { transform: translateX(0); }
                20%, 60% { transform: translateX(-8px); }
                40%, 80% { transform: translateX(8px); }
            }
            .cb-shake {
                animation: cb-shake 0.4s ease-in-out;
            }
        `;
        document.head.appendChild(style);
    }

    // ── CONSTRUCCIÓN DEL MODAL DE ACCESO ─────────────────────────
    function buildGate() {
        if (!GATE_ENABLED) return;
        if (document.getElementById('cb-miau-overlay')) return;
        injectStyles();

        const overlay = document.createElement('div');
        overlay.id = 'cb-miau-overlay';
        overlay.innerHTML = `
            <div class="cb-miau-card" id="cb-miau-card">
                <div class="cb-miau-badge">
                    <span>🔒 Acceso Privado • Cátedra Ulianov Cuba</span>
                </div>
                <div class="cb-miau-icon-box">
                    <svg viewBox="0 0 24 24">
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                        <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                    </svg>
                </div>
                <h2 class="cb-miau-title">Cerebro Estructural</h2>
                <p class="cb-miau-sub">
                    Ingrese la contraseña autorizada para desbloquear el sistema de cálculo y generadores:
                </p>
                <div class="cb-miau-input-group">
                    <input type="password" id="cb-miau-pass" class="cb-miau-input" placeholder="••••" autocomplete="off" autofocus />
                </div>
                <div class="cb-miau-err" id="cb-miau-err">
                    Contraseña incorrecta. Verifique e intente nuevamente.
                </div>
                <button type="button" id="cb-miau-btn" class="cb-miau-btn">
                    DESBLOQUEAR ACCESO
                </button>
                <div class="cb-miau-footer">
                    Análisis Estructural II — Universidad Continental
                </div>
            </div>
        `;
        document.body.appendChild(overlay);

        const input = document.getElementById('cb-miau-pass');
        const btn = document.getElementById('cb-miau-btn');
        const err = document.getElementById('cb-miau-err');
        const card = document.getElementById('cb-miau-card');

        function submitPass() {
            const val = (input.value || '').trim();
            if (val.toUpperCase() === MASTER_PASSWORD) {
                // Correcto: Desbloquear
                err.style.display = 'none';
                setUnlocked();
                overlay.style.opacity = '0';
                card.style.transform = 'scale(0.95)';
                setTimeout(() => {
                    overlay.classList.add('cb-hidden');
                    document.body.style.overflow = '';
                    if (window.dispatchEvent) {
                        window.dispatchEvent(new Event('resize'));
                    }
                }, 300);
            } else {
                // Incorrecto: Alerta visual y vibración
                err.style.display = 'block';
                card.classList.remove('cb-shake');
                void card.offsetWidth; // Force reflow
                card.classList.add('cb-shake');
                input.value = '';
                input.focus();
            }
        }

        btn.addEventListener('click', submitPass);
        input.addEventListener('keydown', function (e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                submitPass();
            }
        });

        setTimeout(() => input && input.focus(), 200);
    }

    // ── APLICACIÓN DEL BLOQUEO SEGÚN ESTADO ──────────────────────
    function enforceGate() {
        if (!GATE_ENABLED || isUnlocked()) {
            const ov = document.getElementById('cb-miau-overlay');
            if (ov) {
                ov.classList.add('cb-hidden');
                ov.style.display = 'none';
            }
            document.body.style.overflow = '';
            return;
        }
        document.body.style.overflow = 'hidden';
        buildGate();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', enforceGate);
    } else {
        enforceGate();
    }

    // ── COMPATIBILIDAD CON SISTEMAS PREVIOS DE LA APLICACIÓN ─────
    window.CerebroAuth = {
        isAuthorized: () => true,
        isAdmin: () => true,
        hasExcelPermission: () => true,
        showExcelVipNotice: () => {},
        showAuthModal: () => {
            if (GATE_ENABLED) {
                sessionStorage.removeItem(SESSION_KEY);
                localStorage.removeItem(SESSION_KEY);
                enforceGate();
            }
        },
        openAuthModal: () => {
            if (GATE_ENABLED) {
                sessionStorage.removeItem(SESSION_KEY);
                localStorage.removeItem(SESSION_KEY);
                enforceGate();
            }
        },
        lock: () => {
            if (GATE_ENABLED) {
                sessionStorage.removeItem(SESSION_KEY);
                localStorage.removeItem(SESSION_KEY);
                enforceGate();
            }
        },
        showAdminPanel: () => {},
        openAdminWorkflow: () => {}
    };

    window.CerebroDB = {
        saveProject: function (type, name, data) {
            const k = (type === 'beam') ? 'cb_saved_beams_v90' : 'cb_saved_trusses_v90';
            let list = [];
            try { list = JSON.parse(localStorage.getItem(k) || '[]'); } catch (e) {}
            const projId = 'proj_' + Date.now();
            const projName = name || (type === 'beam' ? 'Viga Continua ' : 'Armadura 2D ') + (list.length + 1);
            list.push({ id: projId, name: projName, type: type, date: new Date().toLocaleString(), data: data });
            try { localStorage.setItem(k, JSON.stringify(list)); } catch (e) {}
            return projId;
        },
        getProjects: function (type) {
            const k = (type === 'beam') ? 'cb_saved_beams_v90' : 'cb_saved_trusses_v90';
            try { return JSON.parse(localStorage.getItem(k) || '[]'); } catch (e) { return []; }
        }
    };

})();
