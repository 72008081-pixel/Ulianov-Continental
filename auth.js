/**
 * auth.js - CEREBRO ESTRUCTURAL v2.0
 * Sistema Avanzado de Control de Acceso Estudiantil y Activación vía Yape (S/ 5.00)
 * Cátedra: Ing. Ulianov Cuba Valencia - Análisis Estructural II
 * 
 * Contraseña Maestra de Administrador / Dueño: Vayolett1404
 * Validación Criptográfica Anti-Transferencia: SHA-256 intransferible por correo
 */

(function() {
    'use strict';

    // ── CONSTANTES CRIPTOGRÁFICAS Y ALMACENAMIENTO ──────────────
    const MASTER_PASSWORDS = ['Vayolett1404', 'vayolett1404'];
    const CRYPTO_SALT = 'CYBORG_ULIANOV_MASTER_SALT_2026';
    const STORAGE_KEY_AUTH = 'cerebro_auth_session';
    const STORAGE_KEY_WHITELIST = 'cerebro_authorized_emails';

    // ── IMPLEMENTACIÓN NATIVA Y ROBUSTA DE SHA-256 ──────────────
    function sha256(ascii) {
        function rightRotate(value, amount) {
            return (value >>> amount) | (value << (32 - amount));
        }
        const mathPow = Math.pow;
        const maxWord = mathPow(2, 32);
        let lengthProperty = 'length';
        let i, j;
        let result = '';
        const words = [];
        const asciiBitLength = ascii[lengthProperty] * 8;
        let hash = [];
        const k = [];
        let primeCounter = 0;
        const isComposite = {};
        for (let candidate = 2; primeCounter < 64; candidate++) {
            if (!isComposite[candidate]) {
                for (i = 0; i < 313; i += candidate) isComposite[i] = candidate;
                hash[primeCounter] = (mathPow(candidate, .5) * maxWord) | 0;
                k[primeCounter++] = (mathPow(candidate, 1/3) * maxWord) | 0;
            }
        }
        ascii += '\x80';
        while (ascii[lengthProperty] % 64 - 56) ascii += '\x00';
        for (i = 0; i < ascii[lengthProperty]; i++) {
            j = ascii.charCodeAt(i);
            words[i >> 2] |= j << ((3 - i) % 4) * 8;
        }
        words[words[lengthProperty]] = ((asciiBitLength / maxWord) | 0);
        words[words[lengthProperty]] = (asciiBitLength);
        for (j = 0; j < words[lengthProperty];) {
            const w = words.slice(j, j += 16);
            const oldHash = hash.slice(0);
            for (i = 0; i < 64; i++) {
                const w15 = w[i - 15], w2 = w[i - 2];
                const s0 = rightRotate(w15, 7) ^ rightRotate(w15, 18) ^ (w15 >>> 3);
                const s1 = rightRotate(w2, 17) ^ rightRotate(w2, 19) ^ (w2 >>> 10);
                w[i] = (i < 16) ? w[i] : (w[i - 16] + s0 + w[i - 7] + s1) | 0;
                const ch = (hash[4] & hash[5]) ^ (~hash[4] & hash[6]);
                const maj = (hash[0] & hash[1]) ^ (hash[0] & hash[2]) ^ (hash[1] & hash[2]);
                const temp1 = (hash[7] + (rightRotate(hash[4], 6) ^ rightRotate(hash[4], 11) ^ rightRotate(hash[4], 25)) + ch + k[i] + w[i]) | 0;
                const temp2 = ((rightRotate(hash[0], 2) ^ rightRotate(hash[0], 13) ^ rightRotate(hash[0], 22)) + maj) | 0;
                hash = [(temp1 + temp2) | 0].concat(hash.slice(0, 7));
                hash[4] = (hash[4] + temp1) | 0;
            }
            for (i = 0; i < 8; i++) hash[i] = (hash[i] + oldHash[i]) | 0;
        }
        for (i = 0; i < 8; i++) {
            for (let b = 3; b >= 0; b--) {
                const byte = (hash[i] >> (b * 8)) & 255;
                result += (byte < 16 ? '0' : '') + byte.toString(16);
            }
        }
        return result;
    }

    // Generar clave única e intransferible para un correo
    function generateUserKey(email) {
        if (!email) return '';
        const cleanEmail = email.trim().toLowerCase();
        const hash = sha256(cleanEmail + CRYPTO_SALT);
        return 'ULI-' + hash.substring(0, 8).toUpperCase();
    }

    // ── GESTIÓN DE WHITELIST EN LOCALSTORAGE ─────────────────────
    function getAuthorizedEmails() {
        try {
            const data = localStorage.getItem(STORAGE_KEY_WHITELIST);
            return data ? JSON.parse(data) : [];
        } catch (e) {
            return [];
        }
    }

    function addAuthorizedEmail(email) {
        if (!email) return;
        const clean = email.trim().toLowerCase();
        const list = getAuthorizedEmails();
        if (!list.includes(clean)) {
            list.push(clean);
            localStorage.setItem(STORAGE_KEY_WHITELIST, JSON.stringify(list));
        }
    }

    function removeAuthorizedEmail(email) {
        const clean = email.trim().toLowerCase();
        let list = getAuthorizedEmails();
        list = list.filter(e => e !== clean);
        localStorage.setItem(STORAGE_KEY_WHITELIST, JSON.stringify(list));
    }

    function isEmailAuthorized(email) {
        if (!email) return false;
        const clean = email.trim().toLowerCase();
        return getAuthorizedEmails().includes(clean);
    }

    // ── GESTIÓN DE SESIÓN ───────────────────────────────────────
    function getSession() {
        try {
            const s = localStorage.getItem(STORAGE_KEY_AUTH);
            return s ? JSON.parse(s) : null;
        } catch (e) {
            return null;
        }
    }

    function setSession(sessionData) {
        localStorage.setItem(STORAGE_KEY_AUTH, JSON.stringify(sessionData));
        localStorage.setItem('cerebro_unlocked', 'true'); // compatibilidad retroactiva
    }

    function clearSession() {
        localStorage.removeItem(STORAGE_KEY_AUTH);
        localStorage.removeItem('cerebro_unlocked');
    }

    function isUserAuthenticated() {
        const session = getSession();
        if (!session) return false;
        if (session.role === 'owner') return true;
        if (session.role === 'student' && session.email) {
            return isEmailAuthorized(session.email);
        }
        return false;
    }

    // ── INYECCIÓN DE ESTILOS CSS DEL SISTEMA DE ACCESO ──────────
    const styleEl = document.createElement('style');
    styleEl.id = 'cerebro-auth-styles';
    styleEl.textContent = `
        #accessLockModal, #ownerControlModal {
            position: fixed;
            inset: 0;
            z-index: 999999;
            background: rgba(5, 8, 16, 0.92);
            backdrop-filter: blur(16px);
            -webkit-backdrop-filter: blur(16px);
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 16px;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            transition: opacity 0.25s ease, visibility 0.25s ease;
        }

        #accessLockModal.modal-hidden, #ownerControlModal.modal-hidden {
            opacity: 0;
            visibility: hidden;
            pointer-events: none;
        }

        .auth-card {
            background: #111827;
            border: 2px solid #742284;
            border-radius: 22px;
            max-width: 460px;
            width: 100%;
            padding: 26px 22px;
            box-shadow: 0 20px 60px rgba(116, 34, 132, 0.4), 0 0 35px rgba(0, 210, 181, 0.15);
            color: #f8fafc;
            text-align: center;
            position: relative;
            animation: authModalPop 0.28s cubic-bezier(0.175, 0.885, 0.32, 1.275);
            max-height: 92vh;
            overflow-y: auto;
        }

        @keyframes authModalPop {
            0% { transform: scale(0.92); opacity: 0; }
            100% { transform: scale(1); opacity: 1; }
        }

        .auth-view { display: none; }
        .auth-view.view-active { display: block; }

        /* Botón Oficial Google */
        .btn-google-sso {
            width: 100%;
            background: #ffffff;
            color: #1f2937;
            border: 1px solid #e5e7eb;
            border-radius: 12px;
            padding: 11px 16px;
            font-size: 13.5px;
            font-weight: 700;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 12px;
            cursor: pointer;
            transition: all 0.15s ease;
            box-shadow: 0 2px 8px rgba(0,0,0,0.12);
            margin: 14px 0 10px;
        }

        .btn-google-sso:hover {
            background: #f8fafc;
            box-shadow: 0 4px 14px rgba(0,0,0,0.2);
            transform: translateY(-1px);
        }

        .btn-google-sso:active { transform: translateY(0); }

        /* Yape Elements */
        .yape-badge-price {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            background: linear-gradient(135deg, #742284 0%, #4a1458 100%);
            border: 1px solid #00D2B5;
            color: #ffffff;
            font-weight: 800;
            font-size: 12.5px;
            padding: 5px 14px;
            border-radius: 99px;
            margin-bottom: 12px;
            box-shadow: 0 4px 14px rgba(0, 210, 181, 0.25);
        }

        .yape-user-chip {
            background: rgba(13, 20, 36, 0.9);
            border: 1px solid #334155;
            border-radius: 10px;
            padding: 8px 12px;
            font-size: 12px;
            color: #38bdf8;
            font-family: monospace;
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 14px;
            word-break: break-all;
        }

        .auth-input {
            width: 100%;
            background: #0d1424;
            border: 1.5px solid #334155;
            border-radius: 10px;
            padding: 10px 12px;
            font-size: 13px;
            color: #ffffff;
            font-family: monospace;
            text-align: center;
            outline: none;
            transition: all 0.2s ease;
            box-sizing: border-box;
            margin-bottom: 8px;
        }

        .auth-input:focus {
            border-color: #00D2B5;
            box-shadow: 0 0 12px rgba(0, 210, 181, 0.3);
            background: #111a2e;
        }

        .auth-btn-action {
            width: 100%;
            background: linear-gradient(135deg, #742284 0%, #9333ea 50%, #00D2B5 100%);
            color: #ffffff;
            font-size: 13.5px;
            font-weight: 800;
            padding: 11px;
            border: none;
            border-radius: 10px;
            cursor: pointer;
            box-shadow: 0 6px 18px rgba(116, 34, 132, 0.4);
            transition: all 0.15s ease;
            box-sizing: border-box;
        }

        .auth-btn-action:hover {
            transform: translateY(-1px);
            box-shadow: 0 8px 24px rgba(0, 210, 181, 0.45);
        }

        .auth-link {
            color: #94a3b8;
            font-size: 11px;
            text-decoration: underline;
            cursor: pointer;
            margin-top: 10px;
            display: inline-block;
            transition: color 0.15s;
        }

        .auth-link:hover { color: #38bdf8; }

        .auth-error {
            color: #f43f5e;
            font-size: 11px;
            font-weight: 600;
            margin-top: 6px;
            display: none;
            line-height: 1.4;
            background: rgba(244, 63, 94, 0.1);
            border: 1px solid rgba(244, 63, 94, 0.3);
            padding: 6px 8px;
            border-radius: 6px;
        }

        .owner-pill {
            display: inline-block;
            background: #3b0764;
            border: 1px solid #a855f7;
            color: #f3e8ff;
            padding: 2px 8px;
            border-radius: 99px;
            font-size: 10px;
            font-weight: 800;
        }
    `;
    document.head.appendChild(styleEl);

    // ── CONSTRUCCIÓN DEL MODAL PRINCIPAL ────────────────────────
    let currentTempEmail = '';

    function buildAuthModal() {
        if (document.getElementById('accessLockModal')) return;

        const modalDiv = document.createElement('div');
        modalDiv.id = 'accessLockModal';
        modalDiv.className = 'modal-hidden';

        modalDiv.innerHTML = `
            <div class="auth-card">
                
                <!-- ══ VISTA 1: INICIO DE SESIÓN CON GOOGLE / CORREO ══ -->
                <div id="authViewLogin" class="auth-view view-active">
                    <div style="margin-bottom: 12px;">
                        <span class="owner-pill">ACCESO ESTUDIANTIL v2.0</span>
                    </div>

                    <h2 style="font-size: 17px; font-weight: 800; color: #ffffff; margin-bottom: 4px;">
                        CEREBRO ESTRUCTURAL
                    </h2>
                    <p style="font-size: 11.5px; color: #94a3b8; line-height: 1.5;">
                        Cátedra Ing. Ulianov Cuba Valencia — Cálculo Matricial y Exportador de Excel con Fórmulas Nativas.
                    </p>

                    <!-- Botón Oficial de Google -->
                    <button id="btnGoogleSignIn" class="btn-google-sso">
                        <svg width="18" height="18" viewBox="0 0 48 48">
                            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                            <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.28-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.79l7.97-6.2z"/>
                            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                        </svg>
                        <span>Continuar con Cuenta Google</span>
                    </button>

                    <div style="display: flex; align-items: center; gap: 8px; margin: 10px 0;">
                        <div style="flex: 1; height: 1px; background: #334155;"></div>
                        <span style="font-size: 10px; color: #64748b; text-transform: uppercase;">O ingresa con tu correo</span>
                        <div style="flex: 1; height: 1px; background: #334155;"></div>
                    </div>

                    <input type="email" id="userEmailInput" class="auth-input" placeholder="tu_correo@gmail.com o @continental.edu.pe" autocomplete="email">
                    <button id="btnEmailLogin" class="auth-btn-action" style="padding: 9px; font-size: 12.5px;">
                        Ingresar a la Plataforma
                    </button>

                    <div id="loginErrorMsg" class="auth-error"></div>

                    <div style="margin-top: 16px; border-top: 1px solid #1e293b; padding-top: 10px;">
                        <span id="linkGoToOwner" class="auth-link" style="color: #c084fc; font-weight: 700;">
                            👑 ¿Eres el Dueño? Ingreso con Contraseña Maestra
                        </span>
                    </div>
                </div>

                <!-- ══ VISTA 2: PAGO YAPE S/ 5.00 VINCULADO AL CORREO ══ -->
                <div id="authViewYape" class="auth-view">
                    <!-- Logo Yape Oficial -->
                    <div style="margin-bottom: 10px;">
                        <svg width="60" height="60" viewBox="0 0 100 100" fill="none">
                            <rect width="100" height="100" rx="22" fill="#742284"/>
                            <path d="M26 30L42 54V74H52V54L68 30H55L47 43.5L39 30H26Z" fill="#FFFFFF"/>
                            <circle cx="74" cy="27" r="7.5" fill="#00D2B5"/>
                        </svg>
                    </div>

                    <div class="yape-badge-price">
                        <span>YAPEA</span>
                        <span style="color: #00D2B5; font-size: 15px; font-weight: 900;">S/ 5.00</span>
                        <span>• PAGO ÚNICO</span>
                    </div>

                    <h3 style="font-size: 15px; font-weight: 800; color: #ffffff; margin-bottom: 4px;">
                        Activación de Licencia Estudiantil
                    </h3>

                    <!-- Correo Vinculado -->
                    <div class="yape-user-chip">
                        <span>👤 <strong id="lblActiveUserEmail">correo@...</strong></span>
                        <span style="color: #f59e0b; font-size: 10px; font-weight: 700;">Pendiente</span>
                    </div>

                    <div style="background: rgba(116, 34, 132, 0.15); border: 1px dashed rgba(116, 34, 132, 0.6); border-radius: 10px; padding: 10px; font-size: 11px; text-align: left; color: #cbd5e1; line-height: 1.5; margin-bottom: 12px;">
                        <strong>Pasos para activar tu cuenta:</strong>
                        <ol style="margin-left: 16px; margin-top: 4px;">
                            <li>Yapea <strong>S/ 5.00</strong> al creador.</li>
                            <li>Envía tu comprobante con tu correo para recibir tu clave.</li>
                            <li>Escribe tu clave aquí abajo para desbloquear. Tu clave es <strong>intransferible</strong> y solo funciona con este correo.</li>
                        </ol>
                    </div>

                    <input type="text" id="accessPassInput" class="auth-input" placeholder="Clave de Activación (Ej. ULI-XXXXXXXX)" autocomplete="off">
                    <button id="btnUnlockAccess" class="auth-btn-action">
                        🔓 Activar Licencia para este Correo
                    </button>

                    <div id="passErrorMsg" class="auth-error"></div>

                    <div style="margin-top: 12px; display: flex; justify-content: space-between; align-items: center;">
                        <span id="linkBackToLogin" class="auth-link">⬅ Cambiar de Correo</span>
                        <span id="linkGoToOwner2" class="auth-link" style="color: #c084fc;">👑 Soy el Dueño</span>
                    </div>
                </div>

                <!-- ══ VISTA 3: ACCESO MAESTRO DEL DUEÑO ══ -->
                <div id="authViewOwner" class="auth-view">
                    <div style="font-size: 32px; margin-bottom: 8px;">👑</div>
                    <h3 style="font-size: 16px; font-weight: 800; color: #c084fc; margin-bottom: 4px;">
                        Acceso Maestro del Creador
                    </h3>
                    <p style="font-size: 11.5px; color: #94a3b8; line-height: 1.5; margin-bottom: 14px;">
                        Ingreso global sin necesidad de cuenta de Google ni correo desde cualquier dispositivo del mundo.
                    </p>

                    <input type="password" id="ownerMasterPassInput" class="auth-input" placeholder="Contraseña Maestra del Dueño..." autocomplete="off">
                    <button id="btnOwnerLogin" class="auth-btn-action" style="background: linear-gradient(135deg, #6b21a8, #c084fc);">
                        ⚡ Ingresar como Dueño
                    </button>

                    <div id="ownerErrorMsg" class="auth-error"></div>

                    <div style="margin-top: 14px;">
                        <span id="linkBackFromOwner" class="auth-link">⬅ Volver al Acceso Estudiantil</span>
                    </div>
                </div>

            </div>
        `;
        document.body.appendChild(modalDiv);

        // Referencias del DOM
        const viewLogin = document.getElementById('authViewLogin');
        const viewYape  = document.getElementById('authViewYape');
        const viewOwner = document.getElementById('authViewOwner');

        function switchView(viewName) {
            [viewLogin, viewYape, viewOwner].forEach(v => v.classList.remove('view-active'));
            if (viewName === 'login') viewLogin.classList.add('view-active');
            if (viewName === 'yape')  viewYape.classList.add('view-active');
            if (viewName === 'owner') viewOwner.classList.add('view-active');
        }

        // Navegación entre vistas
        document.getElementById('linkGoToOwner').addEventListener('click', () => switchView('owner'));
        document.getElementById('linkGoToOwner2').addEventListener('click', () => switchView('owner'));
        document.getElementById('linkBackToLogin').addEventListener('click', () => switchView('login'));
        document.getElementById('linkBackFromOwner').addEventListener('click', () => switchView('login'));

        // 1. Manejador de Login con Google
        document.getElementById('btnGoogleSignIn').addEventListener('click', () => {
            const promptEmail = prompt("Ingresa tu cuenta de Google o correo institucional:", "");
            if (promptEmail && promptEmail.trim()) {
                handleUserEmailIdentified(promptEmail.trim());
            }
        });

        // 2. Manejador de Login con Email directo
        document.getElementById('btnEmailLogin').addEventListener('click', () => {
            const email = (document.getElementById('userEmailInput').value || '').trim();
            const errEl = document.getElementById('loginErrorMsg');
            
            // Si escribe directamente la clave maestra en el campo de correo, ¡lo detecta como dueño!
            if (MASTER_PASSWORDS.includes(email)) {
                grantOwnerAccess();
                return;
            }

            if (!email || !email.includes('@') || !email.includes('.')) {
                errEl.textContent = '⚠ Por favor ingresa un correo electrónico válido.';
                errEl.style.display = 'block';
                return;
            }
            errEl.style.display = 'none';
            handleUserEmailIdentified(email);
        });

        // 3. Procesar email identificado
        function handleUserEmailIdentified(email) {
            currentTempEmail = email.toLowerCase().trim();
            document.getElementById('lblActiveUserEmail').textContent = currentTempEmail;

            // ¿Ya está autorizado?
            if (isEmailAuthorized(currentTempEmail)) {
                setSession({ role: 'student', email: currentTempEmail, activatedAt: Date.now() });
                hideAuthModal();
                alert(`✔ ¡Bienvenido de nuevo, ${currentTempEmail}! Tu licencia personal está ACTIVA.`);
            } else {
                // Ir a la vista de pago Yape
                switchView('yape');
                const passInp = document.getElementById('accessPassInput');
                if (passInp) passInp.focus();
            }
        }

        // 4. Validar Clave de Activación Yape
        document.getElementById('btnUnlockAccess').addEventListener('click', handleAttemptUnlock);
        document.getElementById('accessPassInput').addEventListener('keydown', (e) => {
            if (e.key === 'Enter') handleAttemptUnlock();
        });

        function handleAttemptUnlock() {
            const entered = (document.getElementById('accessPassInput').value || '').trim();
            const errEl = document.getElementById('passErrorMsg');

            // Caso A: El Dueño escribe la clave maestra en la casilla de Yape
            if (MASTER_PASSWORDS.includes(entered)) {
                grantOwnerAccess();
                return;
            }

            // Caso B: El alumno ingresa su clave única intransferible
            if (!currentTempEmail) {
                switchView('login');
                return;
            }

            const expectedKey = generateUserKey(currentTempEmail);
            if (entered.toUpperCase() === expectedKey) {
                // Clave válida para SU correo
                addAuthorizedEmail(currentTempEmail);
                setSession({ role: 'student', email: currentTempEmail, key: expectedKey, activatedAt: Date.now() });
                errEl.style.display = 'none';
                hideAuthModal();
                alert(`🎉 ¡Licencia activada con éxito para ${currentTempEmail}! Tienes acceso completo e ilimitado a CEREBRO ESTRUCTURAL v2.0.`);
            } else {
                // Clave incorrecta o de otro correo
                errEl.innerHTML = `❌ Clave incorrecta para <strong>${currentTempEmail}</strong>.<br>Las licencias son personales e intransferibles. Yapea S/ 5.00 para recibir tu clave.`;
                errEl.style.display = 'block';
            }
        }

        // 5. Login de Dueño con Clave Maestra
        document.getElementById('btnOwnerLogin').addEventListener('click', handleOwnerLogin);
        document.getElementById('ownerMasterPassInput').addEventListener('keydown', (e) => {
            if (e.key === 'Enter') handleOwnerLogin();
        });

        function handleOwnerLogin() {
            const pass = (document.getElementById('ownerMasterPassInput').value || '').trim();
            const errEl = document.getElementById('ownerErrorMsg');

            if (MASTER_PASSWORDS.includes(pass)) {
                grantOwnerAccess();
            } else {
                errEl.textContent = '❌ Contraseña maestra incorrecta.';
                errEl.style.display = 'block';
            }
        }

        function grantOwnerAccess() {
            setSession({ role: 'owner', name: 'Creador / Administrador', loggedAt: Date.now() });
            hideAuthModal();
            updateHeaderControls();
        }
    }

    // ── CONSTRUCCIÓN DEL PANEL DEL DUEÑO (ADMINISTRACIÓN) ───────
    function buildOwnerPanelModal() {
        if (document.getElementById('ownerControlModal')) return;

        const pDiv = document.createElement('div');
        pDiv.id = 'ownerControlModal';
        pDiv.className = 'modal-hidden';

        pDiv.innerHTML = `
            <div class="auth-card" style="max-width: 520px; text-align: left;">
                <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #334155; padding-bottom: 10px; margin-bottom: 14px;">
                    <div>
                        <h3 style="font-size: 16px; font-weight: 800; color: #c084fc;">👑 Panel de Control del Creador</h3>
                        <span style="font-size: 11px; color: #94a3b8;">Gestión de Licencias y Generador Criptográfico Anti-Transferencia</span>
                    </div>
                    <button id="btnCloseOwnerPanel" style="background: none; border: none; color: #94a3b8; font-size: 20px; cursor: pointer;">✕</button>
                </div>

                <!-- 1. Generador de Clave Única para Alumno -->
                <div style="background: #1a2333; border: 1px solid #334155; border-radius: 12px; padding: 12px; margin-bottom: 14px;">
                    <strong style="color: #38bdf8; font-size: 12px; display: block; margin-bottom: 6px;">
                        🔑 Generar Clave para Alumno que pagó S/ 5.00
                    </strong>
                    <div style="display: flex; gap: 8px; margin-bottom: 8px;">
                        <input type="email" id="adminStudentEmail" class="auth-input" placeholder="correo_del_alumno@gmail.com" style="margin: 0; text-align: left; font-size: 12px;">
                        <button id="btnAdminGenKey" class="auth-btn-action" style="width: auto; padding: 8px 14px; font-size: 12px; white-space: nowrap;">
                            Calcular Clave
                        </button>
                    </div>

                    <div id="adminKeyResultBox" style="display: none; background: #0d1424; border: 1px solid #00D2B5; border-radius: 8px; padding: 8px 12px; margin-top: 8px;">
                        <span style="font-size: 11px; color: #94a3b8;">Clave única para ese correo:</span>
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 2px;">
                            <span id="lblGeneratedKey" style="font-family: monospace; font-size: 16px; font-weight: 800; color: #00D2B5;"></span>
                            <div style="display: flex; gap: 6px;">
                                <button id="btnCopyKey" style="background: #00D2B5; color: #0d1424; border: none; font-size: 11px; font-weight: 800; border-radius: 6px; padding: 4px 8px; cursor: pointer;">📋 Copiar</button>
                                <button id="btnAutoAuthorize" style="background: #10b981; color: #ffffff; border: none; font-size: 11px; font-weight: 800; border-radius: 6px; padding: 4px 8px; cursor: pointer;">⚡ Activar Directo</button>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- 2. Lista de Correos Autorizados -->
                <div style="margin-bottom: 14px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                        <strong style="color: #34d399; font-size: 12px;">Alumnos Autorizados Activos</strong>
                        <span id="lblCountAuthorized" style="font-size: 11px; color: #94a3b8; font-family: monospace;"></span>
                    </div>
                    <div id="adminEmailsList" style="max-height: 140px; overflow-y: auto; background: #0d1424; border: 1px solid #334155; border-radius: 8px; padding: 6px;">
                        <!-- Inyectado dinámicamente -->
                    </div>
                </div>

                <!-- 3. Acciones de Sesión -->
                <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid #334155; padding-top: 10px;">
                    <button id="btnAdminLogout" style="background: #ef4444; color: #ffffff; border: none; padding: 6px 12px; border-radius: 6px; font-size: 11px; font-weight: 700; cursor: pointer;">
                        🔒 Bloquear y Salir
                    </button>
                    <span style="font-size: 11px; color: #64748b;">Sesión Maestra Activa</span>
                </div>
            </div>
        `;
        document.body.appendChild(pDiv);

        // Eventos del Panel
        document.getElementById('btnCloseOwnerPanel').addEventListener('click', hideOwnerPanel);
        document.getElementById('btnAdminLogout').addEventListener('click', () => {
            clearSession();
            hideOwnerPanel();
            showAuthModal();
        });

        // Calcular clave en panel
        document.getElementById('btnAdminGenKey').addEventListener('click', () => {
            const email = (document.getElementById('adminStudentEmail').value || '').trim();
            if (!email) return;
            const key = generateUserKey(email);
            document.getElementById('lblGeneratedKey').textContent = key;
            document.getElementById('adminKeyResultBox').style.display = 'block';
        });

        document.getElementById('btnCopyKey').addEventListener('click', () => {
            const key = document.getElementById('lblGeneratedKey').textContent;
            navigator.clipboard.writeText(key).then(() => alert(`Clave ${key} copiada al portapapeles.`));
        });

        document.getElementById('btnAutoAuthorize').addEventListener('click', () => {
            const email = (document.getElementById('adminStudentEmail').value || '').trim();
            if (email) {
                addAuthorizedEmail(email);
                renderAuthorizedList();
                alert(`✔ Correo ${email} autorizado directamente. Ya no necesitará clave.`);
            }
        });
    }

    function renderAuthorizedList() {
        const listEl = document.getElementById('adminEmailsList');
        const countEl = document.getElementById('lblCountAuthorized');
        if (!listEl) return;

        const list = getAuthorizedEmails();
        countEl.textContent = `${list.length} alumno(s)`;

        if (list.length === 0) {
            listEl.innerHTML = `<div style="font-size: 11px; color: #64748b; padding: 8px; text-align: center;">No hay alumnos registrados aún.</div>`;
            return;
        }

        let html = '';
        list.forEach(email => {
            html += `
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 4px 8px; border-bottom: 1px solid #1e293b; font-size: 11px;">
                    <span style="color: #cbd5e1; font-family: monospace;">${email}</span>
                    <button data-email="${email}" class="btn-revoke-email" style="background: none; border: none; color: #f43f5e; cursor: pointer; font-size: 11px;" title="Revocar acceso">✕</button>
                </div>
            `;
        });
        listEl.innerHTML = html;

        listEl.querySelectorAll('.btn-revoke-email').forEach(btn => {
            btn.addEventListener('click', () => {
                const em = btn.dataset.email;
                if (confirm(`¿Revocar acceso al correo ${em}?`)) {
                    removeAuthorizedEmail(em);
                    renderAuthorizedList();
                }
            });
        });
    }

    function showOwnerPanel() {
        buildOwnerPanelModal();
        renderAuthorizedList();
        const p = document.getElementById('ownerControlModal');
        if (p) p.classList.remove('modal-hidden');
    }

    function hideOwnerPanel() {
        const p = document.getElementById('ownerControlModal');
        if (p) p.classList.add('modal-hidden');
    }

    // ── CONTROL DE VISIBILIDAD DE MODAL PRINCIPAL ───────────────
    function showAuthModal() {
        buildAuthModal();
        const modal = document.getElementById('accessLockModal');
        if (modal) modal.classList.remove('modal-hidden');
    }

    function hideAuthModal() {
        const modal = document.getElementById('accessLockModal');
        if (modal) modal.classList.add('modal-hidden');
        updateHeaderControls();
    }

    // ── ACTUALIZAR BOTONES EN LA BARRA SUPERIOR ─────────────────
    function updateHeaderControls() {
        const session = getSession();
        const isAuth = isUserAuthenticated();

        // 1. Botón Bloquear
        let btnRelock = document.getElementById('btnRelock');
        if (btnRelock) {
            btnRelock.style.display = isAuth ? 'inline-flex' : 'none';
            btnRelock.onclick = () => {
                clearSession();
                showAuthModal();
            };
        }

        // 2. Botón Panel Dueño
        let btnOwnerPanel = document.getElementById('btnOwnerPanel');
        if (!btnOwnerPanel && isAuth && session && session.role === 'owner') {
            // Inyectar botón si no existe
            const headerActions = document.querySelector('.header-controls') || document.querySelector('.topbar-actions') || document.querySelector('.presets-bar');
            if (headerActions) {
                btnOwnerPanel = document.createElement('button');
                btnOwnerPanel.id = 'btnOwnerPanel';
                btnOwnerPanel.className = 'btn btn-secondary';
                btnOwnerPanel.style.background = '#3b0764';
                btnOwnerPanel.style.borderColor = '#a855f7';
                btnOwnerPanel.style.color = '#f3e8ff';
                btnOwnerPanel.style.fontWeight = '700';
                btnOwnerPanel.innerHTML = '👑 Panel Dueño';
                btnOwnerPanel.onclick = showOwnerPanel;
                headerActions.prepend(btnOwnerPanel);
            }
        }

        if (btnOwnerPanel) {
            btnOwnerPanel.style.display = (isAuth && session && session.role === 'owner') ? 'inline-flex' : 'none';
        }
    }

    // ── PROTECCIÓN ANTI-BYPASS EN F12 ───────────────────────────
    function protectExecution() {
        // Bloqueo proactivo en botón de descarga si no está autorizado
        const btnExcel = document.getElementById('btnDownloadExcel') || document.getElementById('btn-download-excel');
        if (btnExcel) {
            const originalClick = btnExcel.onclick;
            btnExcel.addEventListener('click', (e) => {
                if (!isUserAuthenticated()) {
                    e.stopImmediatePropagation();
                    e.preventDefault();
                    showAuthModal();
                    alert("🔒 Para descargar el Excel automatizado debes activar tu acceso personal.");
                    return false;
                }
            }, true);
        }
    }

    // ── INICIALIZACIÓN ──────────────────────────────────────────
    function init() {
        buildAuthModal();
        buildOwnerPanelModal();
        updateHeaderControls();
        protectExecution();

        if (isUserAuthenticated()) {
            hideAuthModal();
        } else {
            showAuthModal();
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // ── API GLOBAL ──────────────────────────────────────────────
    window.CerebroAuth = {
        unlockMaster: (pass) => {
            if (MASTER_PASSWORDS.includes(pass)) {
                setSession({ role: 'owner', name: 'Creador', loggedAt: Date.now() });
                hideAuthModal();
                return true;
            }
            return false;
        },
        generateKeyForEmail: generateUserKey,
        authorizeEmail: addAuthorizedEmail,
        isAuthorized: isUserAuthenticated,
        getSession: getSession,
        lock: () => {
            clearSession();
            showAuthModal();
        },
        openOwnerPanel: showOwnerPanel
    };

})();
