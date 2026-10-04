/**
 * auth.js
 * Sistema de Control de Acceso y Activación vía Yape (S/ 5.00)
 * CEREBRO ESTRUCTURAL v2.0 — Cátedra Ing. Ulianov Cuba Valencia
 * Contraseña Maestra de Administrador / Dueño: Vayolett1404
 */

(function() {
    'use strict';

    const MASTER_PASSWORDS = ['Vayolett1404', 'vayolett1404'];
    const STORAGE_KEY = 'cerebro_unlocked';

    // 1. Inyectar Estilos del Modal de Bloqueo Yape
    const style = document.createElement('style');
    style.id = 'yape-auth-styles';
    style.textContent = `
        #accessLockModal {
            position: fixed;
            inset: 0;
            z-index: 999999;
            background: rgba(5, 8, 16, 0.88);
            backdrop-filter: blur(14px);
            -webkit-backdrop-filter: blur(14px);
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 16px;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            transition: opacity 0.3s ease, visibility 0.3s ease;
        }

        #accessLockModal.modal-hidden {
            opacity: 0;
            visibility: hidden;
            pointer-events: none;
        }

        .yape-card {
            background: #111827;
            border: 2px solid #742284;
            border-radius: 20px;
            max-width: 440px;
            width: 100%;
            padding: 28px 24px;
            box-shadow: 0 20px 60px rgba(116, 34, 132, 0.45), 0 0 30px rgba(0, 210, 181, 0.15);
            color: #f8fafc;
            text-align: center;
            position: relative;
            animation: yapeModalPop 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        }

        @keyframes yapeModalPop {
            0% { transform: scale(0.92); opacity: 0; }
            100% { transform: scale(1); opacity: 1; }
        }

        .yape-logo-header {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            margin-bottom: 12px;
        }

        .yape-badge-price {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            background: linear-gradient(135deg, #742284 0%, #4a1458 100%);
            border: 1px solid #00D2B5;
            color: #ffffff;
            font-weight: 800;
            font-size: 13px;
            padding: 5px 14px;
            border-radius: 99px;
            margin-bottom: 14px;
            box-shadow: 0 4px 14px rgba(0, 210, 181, 0.25);
        }

        .yape-badge-price span.price-tag {
            color: #00D2B5;
            font-size: 16px;
            font-weight: 900;
        }

        .yape-title {
            font-size: 17px;
            font-weight: 800;
            letter-spacing: -0.3px;
            color: #ffffff;
            margin-bottom: 6px;
        }

        .yape-desc {
            font-size: 12px;
            color: #94a3b8;
            line-height: 1.5;
            margin-bottom: 18px;
        }

        .yape-highlight {
            color: #00D2B5;
            font-weight: 700;
        }

        .yape-instructions-box {
            background: rgba(116, 34, 132, 0.15);
            border: 1px dashed rgba(116, 34, 132, 0.6);
            border-radius: 12px;
            padding: 12px;
            margin-bottom: 18px;
            text-align: left;
            font-size: 11.5px;
            color: #cbd5e1;
        }

        .yape-instructions-box ol {
            margin-left: 18px;
            margin-top: 4px;
            line-height: 1.6;
        }

        .yape-input-group {
            display: flex;
            flex-direction: column;
            gap: 10px;
            margin-bottom: 10px;
        }

        .yape-input {
            width: 100%;
            background: #0d1424;
            border: 1.5px solid #334155;
            border-radius: 10px;
            padding: 11px 14px;
            font-size: 14px;
            color: #ffffff;
            font-family: monospace;
            text-align: center;
            letter-spacing: 2px;
            outline: none;
            transition: all 0.2s ease;
            box-sizing: border-box;
        }

        .yape-input:focus {
            border-color: #00D2B5;
            box-shadow: 0 0 12px rgba(0, 210, 181, 0.3);
            background: #111a2e;
        }

        .yape-btn-unlock {
            width: 100%;
            background: linear-gradient(135deg, #742284 0%, #8e24aa 50%, #00D2B5 100%);
            color: #ffffff;
            font-size: 13.5px;
            font-weight: 800;
            padding: 12px;
            border: none;
            border-radius: 10px;
            cursor: pointer;
            box-shadow: 0 6px 20px rgba(116, 34, 132, 0.4);
            transition: all 0.15s ease;
            box-sizing: border-box;
        }

        .yape-btn-unlock:hover {
            transform: translateY(-1px);
            box-shadow: 0 8px 24px rgba(0, 210, 181, 0.45);
        }

        .yape-btn-unlock:active {
            transform: translateY(0);
        }

        .yape-error {
            color: #f43f5e;
            font-size: 11.5px;
            font-weight: 600;
            margin-top: 6px;
            display: none;
        }

        .yape-footer-hint {
            font-size: 11px;
            color: #64748b;
            margin-top: 14px;
        }
    `;
    document.head.appendChild(style);

    // 2. Construir el HTML del Modal
    function injectModal() {
        if (document.getElementById('accessLockModal')) return;

        const modalDiv = document.createElement('div');
        modalDiv.id = 'accessLockModal';
        modalDiv.className = 'modal-hidden'; // inicializado oculto hasta chequear localStorage

        modalDiv.innerHTML = `
            <div class="yape-card">
                <!-- Logo Oficial de Yape Vectorial -->
                <div class="yape-logo-header">
                    <svg width="68" height="68" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <rect width="100" height="100" rx="22" fill="#742284"/>
                        <!-- Tipografía Yape estilizada con signo de exclamación -->
                        <path d="M26 30L42 54V74H52V54L68 30H55L47 43.5L39 30H26Z" fill="#FFFFFF"/>
                        <circle cx="74" cy="27" r="7.5" fill="#00D2B5"/>
                    </svg>
                </div>

                <div class="yape-badge-price">
                    <span>YAPEA</span>
                    <span class="price-tag">S/ 5.00</span>
                    <span>• ACCESO TOTAL</span>
                </div>

                <h2 class="yape-title">Acceso a CEREBRO ESTRUCTURAL v2.0</h2>
                <p class="yape-desc">
                    Plataforma especializada de cálculo matricial para armaduras planas 2D con
                    <span class="yape-highlight">descarga de plantillas Excel (.xlsx) con fórmulas 100% nativas</span>.
                </p>

                <div class="yape-instructions-box">
                    <strong>Pasos para activar tu acceso:</strong>
                    <ol>
                        <li>Realiza un Yape de <strong>S/ 5.00</strong> al autor.</li>
                        <li>Envía la captura de tu Yape para recibir tu contraseña.</li>
                        <li>Ingresa tu clave aquí abajo para desbloquear la plataforma de inmediato.</li>
                    </ol>
                </div>

                <div class="yape-input-group">
                    <input type="password" id="accessPassInput" class="yape-input" placeholder="Contraseña de activación..." autocomplete="off">
                    <button id="btnUnlockAccess" class="yape-btn-unlock">🔓 Activar y Desbloquear Plataforma</button>
                    <div id="passErrorMsg" class="yape-error">⚠ Contraseña incorrecta. Contacta al creador para obtenerla.</div>
                </div>

                <p class="yape-footer-hint">
                    🔒 Activación permanente en este navegador • Cátedra Ing. Ulianov Cuba Valencia
                </p>
            </div>
        `;
        document.body.appendChild(modalDiv);

        // Eventos
        const btnUnlock = document.getElementById('btnUnlockAccess');
        const passInput = document.getElementById('accessPassInput');
        const errorMsg  = document.getElementById('passErrorMsg');

        function attemptUnlock() {
            const entered = (passInput.value || '').trim();
            if (MASTER_PASSWORDS.includes(entered)) {
                errorMsg.style.display = 'none';
                localStorage.setItem(STORAGE_KEY, 'true');
                modalDiv.classList.add('modal-hidden');
                passInput.value = '';
                updateRelockButton(true);
            } else {
                errorMsg.style.display = 'block';
                passInput.focus();
                passInput.select();
                // Animación shake sutil
                passInput.style.borderColor = '#f43f5e';
                setTimeout(() => { passInput.style.borderColor = ''; }, 1000);
            }
        }

        btnUnlock.addEventListener('click', attemptUnlock);
        passInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') attemptUnlock();
        });
    }

    // 3. Botón de Bloqueo en Header (para el Dueño / Administrador)
    function setupRelockButton() {
        const btnRelock = document.getElementById('btnRelock');
        if (btnRelock) {
            btnRelock.addEventListener('click', () => {
                localStorage.removeItem(STORAGE_KEY);
                showModal();
            });
        }
    }

    function updateRelockButton(isUnlocked) {
        const btnRelock = document.getElementById('btnRelock');
        if (btnRelock) {
            btnRelock.style.display = isUnlocked ? 'inline-flex' : 'none';
        }
    }

    function showModal() {
        const modal = document.getElementById('accessLockModal');
        if (modal) {
            modal.classList.remove('modal-hidden');
            const passInput = document.getElementById('accessPassInput');
            if (passInput) setTimeout(() => passInput.focus(), 150);
        }
        updateRelockButton(false);
    }

    function hideModal() {
        const modal = document.getElementById('accessLockModal');
        if (modal) modal.classList.add('modal-hidden');
        updateRelockButton(true);
    }

    // 4. Inicializar al cargar el DOM
    function init() {
        injectModal();
        setupRelockButton();

        const isUnlocked = localStorage.getItem(STORAGE_KEY) === 'true';
        if (isUnlocked) {
            hideModal();
        } else {
            showModal();
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // Exponer API global
    window.CerebroAuth = {
        unlock: (pass) => {
            if (MASTER_PASSWORDS.includes(pass)) {
                localStorage.setItem(STORAGE_KEY, 'true');
                hideModal();
                return true;
            }
            return false;
        },
        lock: () => {
            localStorage.removeItem(STORAGE_KEY);
            showModal();
        },
        isUnlocked: () => localStorage.getItem(STORAGE_KEY) === 'true'
    };
})();
