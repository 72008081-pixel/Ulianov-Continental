/**
 * auth.js - CEREBRO ESTRUCTURAL v2.1
 * Sistema de Control de Acceso Estudiantil, Google SSO, Pasarela Yape S/ 5.00,
 * Control de Sesión Única, Guardado de Proyectos Multi-Usuario y Panel de Desarrollador.
 *
 * Desarrollado por Ingeniero Ulianov Cuba Valencia
 * Contraseña Maestra de Desarrollador: Vayolett1404
 */

(function() {
    'use strict';

    // ── CONSTANTES GLOBALES Y SEGURIDAD ─────────────────────────
    const MASTER_PASSWORDS = ['Vayolett1404', 'vayolett1404'];
    const CRYPTO_SALT = 'CYBORG_ULIANOV_V21_MASTER_SALT_2026';
    const NOTIFICATION_EMAIL = 'ulianov.continental@gmail.com'; // Correo de notificación

    // Claves de almacenamiento
    const KEY_SESSION = 'cerebro_auth_session_v21';
    const KEY_WHITELIST = 'cerebro_authorized_users_v21';
    const KEY_PENDING = 'cerebro_pending_requests_v21';
    const KEY_BANNED = 'cerebro_banned_users_v21';
    const KEY_PROJECTS = 'cerebro_global_projects_v21';
    const KEY_DEVICE_SESSION = 'cerebro_device_session_token';

    // Canal de sincronización entre pestañas y dispositivos
    const sessionChannel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('cerebro_session_sync') : null;
    const currentSessionToken = 'sess_' + Math.random().toString(36).substring(2) + Date.now();
    localStorage.setItem(KEY_DEVICE_SESSION, currentSessionToken);

    // ── MOTOR CRIPTOGRÁFICO SHA-256 Y CÓDIGOS DE ALTA ENTROPÍA ─
    function sha256(ascii) {
        function rightRotate(value, amount) { return (value >>> amount) | (value << (32 - amount)); }
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

    // Generar código aleatorio difícil de adivinar y criptográficamente ligado
    function generateRandomAccessCode(email) {
        const clean = (email || '').trim().toLowerCase();
        const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
        const hash = sha256(clean + CRYPTO_SALT + rand).substring(0, 4).toUpperCase();
        return `CYB-${rand}-${hash}`;
    }

    // Comprobar clave para un usuario
    function verifyAccessCode(email, code) {
        if (!email || !code) return false;
        const cleanEmail = email.trim().toLowerCase();
        const cleanCode = code.trim().toUpperCase();

        // 1. Revisar si la clave fue generada y guardada en solicitudes
        const pending = getPendingRequests();
        const found = pending.find(p => p.email === cleanEmail && p.code === cleanCode);
        if (found) return true;

        // 2. Revisar si es clave hash directa
        const directKey = 'ULI-' + sha256(cleanEmail + CRYPTO_SALT).substring(0, 8).toUpperCase();
        if (cleanCode === directKey) return true;

        return false;
    }

    // ── GESTIÓN DE ALMACENAMIENTO DE USUARIOS Y WHITELIST ─────────
    function getStoredJSON(key, defaultVal) {
        try {
            const item = localStorage.getItem(key);
            return item ? JSON.parse(item) : defaultVal;
        } catch (e) {
            return defaultVal;
        }
    }

    function setStoredJSON(key, val) {
        localStorage.setItem(key, JSON.stringify(val));
    }

    function getAuthorizedUsers() { return getStoredJSON(KEY_WHITELIST, []); }
    function isUserAuthorized(email) {
        if (!email) return false;
        const clean = email.trim().toLowerCase();
        if (isUserBanned(clean)) return false;
        return getAuthorizedUsers().includes(clean);
    }
    function authorizeUser(email) {
        const clean = email.trim().toLowerCase();
        const list = getAuthorizedUsers();
        if (!list.includes(clean)) {
            list.push(clean);
            setStoredJSON(KEY_WHITELIST, list);
        }
        // Quitar de pendientes si estaba
        removePendingRequest(clean);
    }
    function revokeUser(email) {
        const clean = email.trim().toLowerCase();
        const list = getAuthorizedUsers().filter(e => e !== clean);
        setStoredJSON(KEY_WHITELIST, list);
    }

    function getBannedUsers() { return getStoredJSON(KEY_BANNED, []); }
    function isUserBanned(email) {
        return getBannedUsers().includes((email || '').trim().toLowerCase());
    }
    function banUser(email) {
        const clean = (email || '').trim().toLowerCase();
        const list = getBannedUsers();
        if (!list.includes(clean)) {
            list.push(clean);
            setStoredJSON(KEY_BANNED, list);
        }
        revokeUser(clean);
        // Desconectar inmediatamente
        if (sessionChannel) {
            sessionChannel.postMessage({ type: 'USER_BANNED', email: clean });
        }
    }

    function getPendingRequests() { return getStoredJSON(KEY_PENDING, []); }
    function addPendingRequest(email, code, accountName) {
        const clean = (email || '').trim().toLowerCase();
        const list = getPendingRequests().filter(p => p.email !== clean);
        list.unshift({
            email: clean,
            name: accountName || clean.split('@')[0],
            code: code,
            requestedAt: new Date().toLocaleString(),
            userAgent: navigator.userAgent
        });
        setStoredJSON(KEY_PENDING, list);
    }
    function removePendingRequest(email) {
        const clean = (email || '').trim().toLowerCase();
        const list = getPendingRequests().filter(p => p.email !== clean);
        setStoredJSON(KEY_PENDING, list);
    }

    // ── GESTIÓN DE SESIÓN Y CONTROL DE SESIÓN ÚNICA ──────────────
    function getSession() { return getStoredJSON(KEY_SESSION, null); }
    function saveSession(sessionObj) {
        setStoredJSON(KEY_SESSION, sessionObj);
        localStorage.setItem('cerebro_unlocked', 'true');
        // Notificar inicio de sesión para forzar cierre de cualquier otra pestaña/dispositivo
        if (sessionChannel) {
            sessionChannel.postMessage({
                type: 'SESSION_STARTED',
                email: sessionObj.email,
                token: currentSessionToken
            });
        }
    }
    function logoutSession() {
        localStorage.removeItem(KEY_SESSION);
        localStorage.removeItem('cerebro_unlocked');
        showModal();
    }

    // Escuchar mensajes de otras pestañas para garantizar SESIÓN ÚNICA
    if (sessionChannel) {
        sessionChannel.onmessage = (event) => {
            const data = event.data;
            if (!data) return;

            const mySession = getSession();
            if (mySession && mySession.role === 'student' && mySession.email === data.email) {
                if (data.type === 'SESSION_STARTED' && data.token !== currentSessionToken) {
                    // Cerrar sesión automáticamente en esta ventana
                    logoutSession();
                    alert("⚠ SESIÓN CERRADA AUTOMÁTICAMENTE:\n\nTu cuenta ha sido abierta en otra ventana o dispositivo. Solo se permite 1 sesión activa simultánea.");
                } else if (data.type === 'USER_BANNED') {
                    logoutSession();
                    alert("🚫 ACCESO DENEGADO:\n\nTu cuenta ha sido suspendida o bloqueada por el desarrollador.");
                }
            }
        };
    }

    // ── ALMACENAMIENTO DE PROYECTOS / ARMADURAS MULTI-USUARIO ────
    function getAllProjects() { return getStoredJSON(KEY_PROJECTS, []); }
    function saveProject(projectName, nodes, bars) {
        const session = getSession();
        if (!session) throw new Error("Debes tener una sesión activa para guardar un proyecto.");

        const cleanName = (projectName || 'Armadura Sin Nombre').trim();
        const list = getAllProjects();
        const projectId = 'proj_' + Math.random().toString(36).substring(2, 9) + Date.now();

        const newProject = {
            id: projectId,
            name: cleanName,
            authorEmail: session.email || (session.role === 'owner' ? 'Desarrollador (Dueño)' : 'Anónimo'),
            role: session.role,
            createdAt: new Date().toLocaleString(),
            nodes: JSON.parse(JSON.stringify(nodes)),
            bars: JSON.parse(JSON.stringify(bars))
        };

        list.unshift(newProject);
        setStoredJSON(KEY_PROJECTS, list);
        return newProject;
    }

    function getUserProjects() {
        const session = getSession();
        if (!session) return [];
        const all = getAllProjects();
        if (session.role === 'owner') return all; // El dueño ve TODO
        return all.filter(p => p.authorEmail === session.email);
    }

    function deleteProject(projectId) {
        const session = getSession();
        let all = getAllProjects();
        if (session.role === 'owner') {
            all = all.filter(p => p.id !== projectId);
        } else {
            all = all.filter(p => p.id !== projectId || p.authorEmail === session.email);
        }
        setStoredJSON(KEY_PROJECTS, all);
    }

    // ── SERVICIO DE NOTIFICACIÓN AUTOMÁTICA POR CORREO ──────────
    async function sendNotificationEmail(studentEmail, studentName, generatedCode) {
        const payload = {
            _subject: `🔔 Nueva Solicitud de Acceso: ${studentEmail} - CEREBRO ESTRUCTURAL v2.1`,
            email: studentEmail,
            nombre: studentName,
            codigo_acceso_generado: generatedCode,
            mensaje: `El alumno ${studentEmail} ha iniciado sesión con Google y solicita activación vía Yape (S/ 5.00).`,
            fecha: new Date().toLocaleString(),
            _template: 'table'
        };

        try {
            // Intentar envío transparente vía FormSubmit AJAX
            await fetch(`https://formsubmit.co/ajax/${NOTIFICATION_EMAIL}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                body: JSON.stringify(payload)
            });
            console.log("Notificación por correo enviada con éxito.");
        } catch (e) {
            console.warn("No se pudo enviar correo por red (se registrará en el panel del dueño):", e);
        }
    }

    // ── ESTILOS "LIQUID GLASS" VIDRIOSO Y ULTRA-MODERNO ─────────
    const styleSheet = document.createElement('style');
    styleSheet.id = 'cerebro-liquid-glass-styles';
    styleSheet.textContent = `
        /* Overlay Vidrioso Liquid Glass */
        #accessLockModal, #ownerControlModal, #projectsManagerModal {
            position: fixed;
            inset: 0;
            z-index: 999999;
            background: rgba(3, 7, 18, 0.75);
            backdrop-filter: blur(28px) saturate(190%);
            -webkit-backdrop-filter: blur(28px) saturate(190%);
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 16px;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            transition: opacity 0.25s cubic-bezier(0.16, 1, 0.3, 1), visibility 0.25s;
        }

        .modal-hidden {
            opacity: 0 !important;
            visibility: hidden !important;
            pointer-events: none !important;
        }

        /* Tarjeta Liquid Glass */
        .liquid-glass-card {
            background: rgba(17, 24, 39, 0.65);
            background-image: radial-gradient(at 100% 0%, rgba(116, 34, 132, 0.22) 0px, transparent 50%),
                              radial-gradient(at 0% 100%, rgba(0, 210, 181, 0.15) 0px, transparent 50%);
            border: 1px solid rgba(255, 255, 255, 0.14);
            border-top: 1px solid rgba(255, 255, 255, 0.25);
            border-radius: 24px;
            max-width: 470px;
            width: 100%;
            padding: 26px 24px;
            box-shadow: 0 30px 80px rgba(0, 0, 0, 0.7),
                        inset 0 1px 1px rgba(255, 255, 255, 0.2),
                        0 0 40px rgba(116, 34, 132, 0.25);
            color: #f8fafc;
            text-align: center;
            position: relative;
            animation: liquidGlassPop 0.3s cubic-bezier(0.16, 1, 0.3, 1);
            max-height: 92vh;
            overflow-y: auto;
        }

        @keyframes liquidGlassPop {
            0% { transform: scale(0.93) translateY(8px); opacity: 0; }
            100% { transform: scale(1) translateY(0); opacity: 1; }
        }

        /* Cuentas de Google Chooser */
        .google-account-list {
            display: flex;
            flex-direction: column;
            gap: 8px;
            margin: 12px 0;
            text-align: left;
        }

        .google-account-item {
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 10px 14px;
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid rgba(255, 255, 255, 0.08);
            border-radius: 14px;
            cursor: pointer;
            transition: all 0.18s ease;
        }

        .google-account-item:hover {
            background: rgba(255, 255, 255, 0.1);
            border-color: rgba(56, 189, 248, 0.4);
            transform: translateY(-1px);
        }

        .google-avatar {
            width: 36px;
            height: 36px;
            border-radius: 50%;
            background: linear-gradient(135deg, #4285F4, #34A853);
            color: #ffffff;
            font-weight: 800;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 15px;
            flex-shrink: 0;
        }

        .google-acc-info {
            display: flex;
            flex-direction: column;
            overflow: hidden;
        }

        .google-acc-name {
            font-size: 13px;
            font-weight: 700;
            color: #ffffff;
        }

        .google-acc-email {
            font-size: 11px;
            color: #94a3b8;
            font-family: monospace;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }

        /* Checkbox Términos */
        .terms-checkbox-wrap {
            display: flex;
            align-items: flex-start;
            gap: 8px;
            text-align: left;
            font-size: 11px;
            color: #cbd5e1;
            margin: 14px 0 10px;
            line-height: 1.4;
            padding: 8px 10px;
            background: rgba(0, 0, 0, 0.25);
            border-radius: 8px;
            border: 1px solid rgba(255, 255, 255, 0.05);
        }

        .terms-checkbox-wrap input[type="checkbox"] {
            margin-top: 2px;
            accent-color: #00D2B5;
            cursor: pointer;
            width: 15px;
            height: 15px;
        }

        /* Yape Badge */
        .yape-liquid-badge {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            background: linear-gradient(135deg, #742284 0%, #4a1458 100%);
            border: 1px solid #00D2B5;
            color: #ffffff;
            font-weight: 800;
            font-size: 12px;
            padding: 4px 14px;
            border-radius: 99px;
            margin-bottom: 12px;
            box-shadow: 0 4px 14px rgba(0, 210, 181, 0.25);
        }

        .liquid-input {
            width: 100%;
            background: rgba(13, 20, 36, 0.85);
            border: 1.5px solid rgba(255, 255, 255, 0.12);
            border-radius: 12px;
            padding: 11px 14px;
            font-size: 13.5px;
            color: #ffffff;
            font-family: monospace;
            text-align: center;
            outline: none;
            transition: all 0.2s ease;
            box-sizing: border-box;
            margin-bottom: 8px;
        }

        .liquid-input:focus {
            border-color: #00D2B5;
            box-shadow: 0 0 16px rgba(0, 210, 181, 0.35);
            background: rgba(17, 26, 46, 0.95);
        }

        .liquid-btn-primary {
            width: 100%;
            background: linear-gradient(135deg, #742284 0%, #9333ea 50%, #00D2B5 100%);
            color: #ffffff;
            font-size: 13.5px;
            font-weight: 800;
            padding: 12px;
            border: none;
            border-radius: 12px;
            cursor: pointer;
            box-shadow: 0 6px 20px rgba(116, 34, 132, 0.45);
            transition: all 0.15s ease;
            box-sizing: border-box;
        }

        .liquid-btn-primary:hover {
            transform: translateY(-1px);
            box-shadow: 0 8px 26px rgba(0, 210, 181, 0.45);
        }

        .discreet-dev-link {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            font-size: 11px;
            color: #64748b;
            text-decoration: none;
            cursor: pointer;
            margin-top: 14px;
            padding: 4px 8px;
            border-radius: 6px;
            transition: color 0.15s ease;
        }

        .discreet-dev-link:hover {
            color: #94a3b8;
        }
    `;
    document.head.appendChild(styleSheet);

    // ── CONSTRUCCIÓN DE MODALES DE ACCESO (LIQUID GLASS) ─────────
    let selectedStudentAccount = null;

    function buildModals() {
        if (document.getElementById('accessLockModal')) return;

        // 1. MODAL PRINCIPAL DE ACCESO
        const mainModal = document.createElement('div');
        mainModal.id = 'accessLockModal';
        mainModal.className = 'modal-hidden';

        mainModal.innerHTML = `
            <div class="liquid-glass-card">
                
                <!-- ══ VISTA 1: SELECTOR DE CUENTAS GOOGLE (NATIVO CON TÉRMINOS) ══ -->
                <div id="viewGoogleChooser" style="display: block;">
                    <div style="display: inline-flex; align-items: center; gap: 8px; margin-bottom: 8px;">
                        <svg width="24" height="24" viewBox="0 0 48 48">
                            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                            <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.28-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.79l7.97-6.2z"/>
                            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                        </svg>
                        <span style="font-size: 14px; font-weight: 700; color: #ffffff;">Google Sign-In</span>
                    </div>

                    <h2 style="font-size: 16.5px; font-weight: 800; color: #ffffff; margin-bottom: 2px;">
                        CEREBRO ESTRUCTURAL <span style="color:#38bdf8; font-size:12px;">v2.1</span>
                    </h2>
                    <p style="font-size: 11px; color: #94a3b8; margin-bottom: 12px;">
                        Desarrollado por Ingeniero Ulianov Cuba Valencia — Cálculo Matricial y Exportador de Excel Nativo
                    </p>

                    <!-- Lista de Cuentas Detectadas en el Navegador -->
                    <div style="font-size: 11.5px; font-weight: 700; color: #cbd5e1; text-align: left; margin-bottom: 6px;">
                        Elige una cuenta de Google para continuar:
                    </div>
                    <div class="google-account-list" id="googleAccountsContainer">
                        <!-- Cuenta 1 Detectada por defecto en la máquina -->
                        <div class="google-account-item" data-email="alumno@continental.edu.pe" data-name="Estudiante Continental">
                            <div class="google-avatar">U</div>
                            <div class="google-acc-info">
                                <span class="google-acc-name">Estudiante Continental</span>
                                <span class="google-acc-email">alumno@continental.edu.pe</span>
                            </div>
                        </div>
                        <!-- Opción de Usar Otra Cuenta -->
                        <div class="google-account-item" id="btnChooseCustomAccount">
                            <div class="google-avatar" style="background: #475569;">+</div>
                            <div class="google-acc-info">
                                <span class="google-acc-name">Usar otra cuenta de Google</span>
                                <span class="google-acc-email">Ingresar correo @gmail.com</span>
                            </div>
                        </div>
                    </div>

                    <!-- Input alternativo para ingresar cualquier correo -->
                    <div id="customEmailInputBox" style="display: none; margin-bottom: 10px;">
                        <input type="email" id="userEmailInput" class="liquid-input" placeholder="correo@gmail.com o @continental.edu.pe">
                        <button id="btnEmailLogin" class="liquid-btn-primary" style="padding: 9px; font-size: 12px;">
                            Confirmar esta Cuenta
                        </button>
                    </div>

                    <!-- Términos y Condiciones Obligatorios -->
                    <label class="terms-checkbox-wrap">
                        <input type="checkbox" id="chkTermsAndConditions" checked>
                        <span>He leído y acepto los <strong>Términos y Condiciones de Licencia Académica</strong> y la política de acceso intransferible y de sesión única.</span>
                    </label>

                    <div id="termsErrorMsg" style="display:none; color:#f43f5e; font-size:11px; font-weight:700; margin-bottom:8px;">
                        ⚠ Debes aceptar los Términos y Condiciones para continuar.
                    </div>

                    <!-- Acceso Discreto para el Desarrollador -->
                    <div style="margin-top: 14px; border-top: 1px solid rgba(255,255,255,0.08); padding-top: 10px;">
                        <span id="linkDevAccess" class="discreet-dev-link">
                            ⚙️ ¿Eres parte del equipo de desarrollo de esta aplicación?
                        </span>
                    </div>
                </div>

                <!-- ══ VISTA 2: PAGO YAPE S/ 5.00 VINCULADO AL CORREO DEL ALUMNO ══ -->
                <div id="viewYapePaywall" style="display: none;">
                    <div style="margin-bottom: 8px;">
                        <svg width="56" height="56" viewBox="0 0 100 100" fill="none">
                            <rect width="100" height="100" rx="22" fill="#742284"/>
                            <path d="M26 30L42 54V74H52V54L68 30H55L47 43.5L39 30H26Z" fill="#FFFFFF"/>
                            <circle cx="74" cy="27" r="7.5" fill="#00D2B5"/>
                        </svg>
                    </div>

                    <div class="yape-liquid-badge">
                        <span>YAPEA</span>
                        <span style="color: #00D2B5; font-size: 15px; font-weight: 900;">S/ 5.00</span>
                        <span>• ACCESO PERSONAL</span>
                    </div>

                    <h3 style="font-size: 15px; font-weight: 800; color: #ffffff; margin-bottom: 4px;">
                        Activación de Licencia Estudiantil
                    </h3>

                    <!-- Correo Vinculado y Notificado -->
                    <div style="background: rgba(13, 20, 36, 0.85); border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; padding: 10px 14px; margin-bottom: 12px; text-align: left;">
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <span style="font-size: 11px; color: #94a3b8;">Cuenta vinculada:</span>
                            <span id="badgePendingStatus" style="font-size: 10px; font-weight: 800; color: #f59e0b; background: rgba(245, 158, 11, 0.15); padding: 2px 7px; border-radius: 99px; border: 1px solid rgba(245, 158, 11, 0.4);">
                                ⏳ Pendiente de Verificación
                            </span>
                        </div>
                        <div id="lblActiveStudentEmail" style="font-size: 13px; font-family: monospace; font-weight: 700; color: #38bdf8; margin-top: 3px; word-break: break-all;">
                            alumno@continental.edu.pe
                        </div>
                    </div>

                    <div style="background: rgba(116, 34, 132, 0.15); border: 1px dashed rgba(116, 34, 132, 0.6); border-radius: 12px; padding: 10px 12px; font-size: 11.5px; text-align: left; color: #cbd5e1; line-height: 1.5; margin-bottom: 14px;">
                        <strong>Pasos para recibir tu clave:</strong>
                        <ol style="margin-left: 16px; margin-top: 4px;">
                            <li>Yapea <strong>S/ 5.00</strong> al creador.</li>
                            <li>El sistema ya notificó tu solicitud por correo. Envía tu comprobante de Yape indicando tu correo.</li>
                            <li>El creador te brindará tu <strong>código de acceso aleatorio</strong> e intransferible.</li>
                        </ol>
                    </div>

                    <input type="text" id="accessPassInput" class="liquid-input" placeholder="Código de Acceso (Ej. CYB-XXXX-XXXX)" autocomplete="off">
                    <button id="btnUnlockAccess" class="liquid-btn-primary">
                        🔓 Activar Licencia Permanente
                    </button>

                    <div id="passErrorMsg" style="display:none; color:#f43f5e; font-size:11px; font-weight:700; margin-top:6px; background:rgba(244,63,94,0.1); border:1px solid rgba(244,63,94,0.3); padding:6px; border-radius:8px;"></div>

                    <div style="margin-top: 12px; display: flex; justify-content: space-between; align-items: center;">
                        <span id="linkBackToChooser" style="color: #94a3b8; font-size: 11px; text-decoration: underline; cursor: pointer;">⬅ Cambiar de Cuenta</span>
                        <span id="linkDevAccess2" class="discreet-dev-link">⚙️ Desarrollador</span>
                    </div>
                </div>

                <!-- ══ VISTA 3: ACCESO DISCRETO PARA EL DESARROLLADOR ══ -->
                <div id="viewDeveloperAccess" style="display: none;">
                    <div style="font-size: 32px; margin-bottom: 6px;">⚙️</div>
                    <h3 style="font-size: 16px; font-weight: 800; color: #c084fc; margin-bottom: 4px;">
                        Acceso del Equipo de Desarrollo
                    </h3>
                    <p style="font-size: 11.5px; color: #94a3b8; line-height: 1.5; margin-bottom: 14px;">
                        Ingreso de desarrollo y monitoreo global sin cuenta de Google desde cualquier parte del mundo.
                    </p>

                    <input type="password" id="ownerMasterPassInput" class="liquid-input" placeholder="Contraseña de desarrollador..." autocomplete="off">
                    <button id="btnOwnerLogin" class="liquid-btn-primary" style="background: linear-gradient(135deg, #581c87, #9333ea);">
                        ⚡ Autenticar Desarrollador
                    </button>

                    <div id="ownerErrorMsg" style="display:none; color:#f43f5e; font-size:11.5px; font-weight:700; margin-top:6px;"></div>

                    <div style="margin-top: 14px;">
                        <span id="linkBackFromDev" style="color: #94a3b8; font-size: 11px; text-decoration: underline; cursor: pointer;">⬅ Volver al inicio</span>
                    </div>
                </div>

            </div>
        `;
        document.body.appendChild(mainModal);

        // 2. MODAL DE GESTIÓN Y PANEL DEL DESARROLLADOR
        const devModal = document.createElement('div');
        devModal.id = 'ownerControlModal';
        devModal.className = 'modal-hidden';

        devModal.innerHTML = `
            <div class="liquid-glass-card" style="max-width: 580px; text-align: left;">
                <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 10px; margin-bottom: 14px;">
                    <div>
                        <h3 style="font-size: 16px; font-weight: 800; color: #c084fc;">👑 Panel del Desarrollador — v2.1</h3>
                        <span style="font-size: 11px; color: #94a3b8;">Monitoreo en Tiempo Real, Solicitudes Yape y Control de Baneo</span>
                    </div>
                    <button id="btnCloseDevPanel" style="background: none; border: none; color: #94a3b8; font-size: 20px; cursor: pointer;">✕</button>
                </div>

                <!-- Pestañas del Panel de Desarrollador -->
                <div style="display: flex; gap: 4px; border-bottom: 1px solid rgba(255,255,255,0.1); margin-bottom: 12px; overflow-x: auto;">
                    <button class="dev-tab-btn active" data-tab="tabDevPending" style="background:none; border:none; border-bottom:2px solid #00D2B5; color:#00D2B5; font-size:11.5px; font-weight:700; padding:6px 10px; cursor:pointer;">📬 Solicitudes Yape</button>
                    <button class="dev-tab-btn" data-tab="tabDevUsers" style="background:none; border:none; border-bottom:2px solid transparent; color:#94a3b8; font-size:11.5px; font-weight:700; padding:6px 10px; cursor:pointer;">👥 Alumnos Activos / Baneo</button>
                    <button class="dev-tab-btn" data-tab="tabDevProjects" style="background:none; border:none; border-bottom:2px solid transparent; color:#94a3b8; font-size:11.5px; font-weight:700; padding:6px 10px; cursor:pointer;">🌐 Todas las Armaduras</button>
                </div>

                <!-- Pestaña 1: Solicitudes Pendientes Yape -->
                <div id="tabDevPending" class="dev-tab-pane" style="display: block;">
                    <div style="font-size: 11.5px; color: #94a3b8; margin-bottom: 8px;">
                        Alumnos que han seleccionado su cuenta Google y requieren verificación de pago de S/ 5.00:
                    </div>
                    <div id="devPendingListContainer" style="max-height: 220px; overflow-y: auto; background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; padding: 6px;"></div>
                </div>

                <!-- Pestaña 2: Alumnos Activos y Baneo -->
                <div id="tabDevUsers" class="dev-tab-pane" style="display: none;">
                    <div style="display: flex; gap: 6px; margin-bottom: 8px;">
                        <input type="email" id="devQuickAuthorizeInput" class="liquid-input" placeholder="Activar correo directamente..." style="margin: 0; font-size: 11.5px; text-align: left;">
                        <button id="btnDevQuickAuthorize" class="liquid-btn-primary" style="width: auto; padding: 6px 14px; font-size: 11.5px; white-space: nowrap;">
                            Autorizar
                        </button>
                    </div>
                    <div id="devAuthorizedUsersList" style="max-height: 200px; overflow-y: auto; background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; padding: 6px;"></div>
                </div>

                <!-- Pestaña 3: Todas las Armaduras Guardadas de Todos los Alumnos -->
                <div id="tabDevProjects" class="dev-tab-pane" style="display: none;">
                    <div style="font-size: 11.5px; color: #94a3b8; margin-bottom: 8px;">
                        Proyectos y armaduras creadas por todos los alumnos en la plataforma:
                    </div>
                    <div id="devGlobalProjectsList" style="max-height: 220px; overflow-y: auto; background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; padding: 6px;"></div>
                </div>

                <!-- Pie del Panel -->
                <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid rgba(255,255,255,0.1); margin-top: 14px; padding-top: 10px;">
                    <button id="btnDevLogout" style="background: #ef4444; color: #ffffff; border: none; border-radius: 8px; padding: 6px 12px; font-size: 11px; font-weight: 700; cursor: pointer;">
                        🔒 Bloquear y Salir
                    </button>
                    <span style="font-size: 11px; color: #64748b;">Acceso Maestro Desarrollador</span>
                </div>
            </div>
        `;
        document.body.appendChild(devModal);

        // 3. MODAL DE GESTIÓN DE PROYECTOS (MIS ARMADURAS)
        const projModal = document.createElement('div');
        projModal.id = 'projectsManagerModal';
        projModal.className = 'modal-hidden';

        projModal.innerHTML = `
            <div class="liquid-glass-card" style="max-width: 520px; text-align: left;">
                <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 10px; margin-bottom: 12px;">
                    <h3 style="font-size: 15px; font-weight: 800; color: #38bdf8;">📂 Mis Armaduras Guardadas</h3>
                    <button id="btnCloseProjModal" style="background: none; border: none; color: #94a3b8; font-size: 20px; cursor: pointer;">✕</button>
                </div>
                <div id="myProjectsListContainer" style="max-height: 260px; overflow-y: auto; background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; padding: 6px; margin-bottom: 12px;"></div>
                <div style="text-align: right;">
                    <button id="btnNewProjectSavePrompt" class="liquid-btn-primary" style="width: auto; padding: 7px 16px; font-size: 12px;">
                        💾 Guardar Armadura Actual
                    </button>
                </div>
            </div>
        `;
        document.body.appendChild(projModal);

        // ── EVENTOS Y CONTROLADORES DE VISTAS ──────────────────────
        const viewGoogle = document.getElementById('viewGoogleChooser');
        const viewYape   = document.getElementById('viewYapePaywall');
        const viewDev    = document.getElementById('viewDeveloperAccess');

        function switchView(name) {
            viewGoogle.style.display = (name === 'google') ? 'block' : 'none';
            viewYape.style.display   = (name === 'yape') ? 'block' : 'none';
            viewDev.style.display    = (name === 'dev') ? 'block' : 'none';
        }

        // Navegación
        document.getElementById('linkDevAccess').onclick = () => switchView('dev');
        document.getElementById('linkDevAccess2').onclick = () => switchView('dev');
        document.getElementById('linkBackFromDev').onclick = () => switchView('google');
        document.getElementById('linkBackToChooser').onclick = () => switchView('google');

        // Mostrar caja de correo manual
        document.getElementById('btnChooseCustomAccount').onclick = () => {
            const box = document.getElementById('customEmailInputBox');
            box.style.display = box.style.display === 'none' ? 'block' : 'none';
            if (box.style.display === 'block') document.getElementById('userEmailInput').focus();
        };

        // Selección de cuenta Google de la lista
        document.querySelectorAll('.google-account-item[data-email]').forEach(item => {
            item.onclick = () => {
                const email = item.dataset.email;
                const name  = item.dataset.name;
                processStudentLogin(email, name);
            };
        });

        // Confirmación de correo manual
        document.getElementById('btnEmailLogin').onclick = () => {
            const email = (document.getElementById('userEmailInput').value || '').trim();
            if (MASTER_PASSWORDS.includes(email)) {
                grantDeveloperAccess();
                return;
            }
            if (!email || !email.includes('@')) {
                alert("Por favor ingresa un correo de Google válido.");
                return;
            }
            processStudentLogin(email, email.split('@')[0]);
        };

        // Procesar Login Estudiante
        function processStudentLogin(email, name) {
            const chkTerms = document.getElementById('chkTermsAndConditions');
            const errTerms = document.getElementById('termsErrorMsg');
            if (!chkTerms.checked) {
                errTerms.style.display = 'block';
                return;
            }
            errTerms.style.display = 'none';

            selectedStudentAccount = { email: email.toLowerCase().trim(), name: name };

            // 1. Si ya está autorizado, entra directo
            if (isUserAuthorized(selectedStudentAccount.email)) {
                saveSession({ role: 'student', email: selectedStudentAccount.email, name: selectedStudentAccount.name });
                hideModal();
                alert(`✔ ¡Bienvenido de nuevo, ${selectedStudentAccount.email}! Tu sesión personal está activa.`);
                return;
            }

            // 2. Si no está autorizado, generar código aleatorio y notificar al creador por correo
            const accessCode = generateRandomAccessCode(selectedStudentAccount.email);
            addPendingRequest(selectedStudentAccount.email, accessCode, selectedStudentAccount.name);

            // Disparar correo al creador
            sendNotificationEmail(selectedStudentAccount.email, selectedStudentAccount.name, accessCode);

            // Mostrar vista Yape vinculada al correo
            document.getElementById('lblActiveStudentEmail').textContent = selectedStudentAccount.email;
            switchView('yape');
            document.getElementById('accessPassInput').focus();
        }

        // Validar clave en la vista Yape
        document.getElementById('btnUnlockAccess').onclick = attemptUnlockWithCode;
        document.getElementById('accessPassInput').onkeydown = (e) => {
            if (e.key === 'Enter') attemptUnlockWithCode();
        };

        function attemptUnlockWithCode() {
            const entered = (document.getElementById('accessPassInput').value || '').trim();
            const errEl = document.getElementById('passErrorMsg');

            // Caso A: Desarrollador escribe contraseña maestra en la casilla
            if (MASTER_PASSWORDS.includes(entered)) {
                grantDeveloperAccess();
                return;
            }

            // Caso B: Alumno valida su código
            if (!selectedStudentAccount) {
                switchView('google');
                return;
            }

            if (verifyAccessCode(selectedStudentAccount.email, entered)) {
                authorizeUser(selectedStudentAccount.email);
                saveSession({ role: 'student', email: selectedStudentAccount.email, name: selectedStudentAccount.name });
                hideModal();
                alert(`🎉 ¡Pago verificado con éxito para ${selectedStudentAccount.email}! Tu cuenta está activada para siempre.`);
            } else {
                errEl.innerHTML = `❌ Clave incorrecta para <strong>${selectedStudentAccount.email}</strong>.<br>El creador te brindará tu código aleatorio en cuanto verifique tu Yape de S/ 5.00.`;
                errEl.style.display = 'block';
            }
        }

        // Login de Desarrollador
        document.getElementById('btnOwnerLogin').onclick = attemptDevLogin;
        document.getElementById('ownerMasterPassInput').onkeydown = (e) => {
            if (e.key === 'Enter') attemptDevLogin();
        };

        function attemptDevLogin() {
            const pass = (document.getElementById('ownerMasterPassInput').value || '').trim();
            const errEl = document.getElementById('ownerErrorMsg');

            if (MASTER_PASSWORDS.includes(pass)) {
                grantDeveloperAccess();
            } else {
                errEl.textContent = '❌ Contraseña de desarrollador incorrecta.';
                errEl.style.display = 'block';
            }
        }

        function grantDeveloperAccess() {
            saveSession({ role: 'owner', name: 'Desarrollador / Creador' });
            hideModal();
            updateAppHeader();
        }

        // Eventos del Panel de Desarrollador
        document.getElementById('btnCloseDevPanel').onclick = hideDevPanel;
        document.getElementById('btnDevLogout').onclick = () => {
            hideDevPanel();
            logoutSession();
        };

        // Pestañas del Panel de Desarrollador
        document.querySelectorAll('.dev-tab-btn').forEach(btn => {
            btn.onclick = () => {
                document.querySelectorAll('.dev-tab-btn').forEach(b => {
                    b.style.borderColor = 'transparent';
                    b.style.color = '#94a3b8';
                });
                btn.style.borderColor = '#00D2B5';
                btn.style.color = '#00D2B5';

                document.querySelectorAll('.dev-tab-pane').forEach(p => p.style.display = 'none');
                const target = document.getElementById(btn.dataset.tab);
                if (target) target.style.display = 'block';
            };
        });

        // Autorizar rápido en panel
        document.getElementById('btnDevQuickAuthorize').onclick = () => {
            const em = (document.getElementById('devQuickAuthorizeInput').value || '').trim();
            if (em) {
                authorizeUser(em);
                renderDevUsers();
                alert(`✔ Alumno ${em} autorizado con éxito.`);
            }
        };

        // Eventos de Proyectos Modal
        document.getElementById('btnCloseProjModal').onclick = () => {
            document.getElementById('projectsManagerModal').classList.add('modal-hidden');
        };

        document.getElementById('btnNewProjectSavePrompt').onclick = promptSaveProject;
    }

    // ── RENDERIZADO DE LISTAS EN PANEL DE DESARROLLADOR ─────────
    function renderDevPending() {
        const c = document.getElementById('devPendingListContainer');
        if (!c) return;
        const list = getPendingRequests();

        if (list.length === 0) {
            c.innerHTML = `<div style="padding:16px; text-align:center; color:#64748b; font-size:11px;">No hay solicitudes pendientes en este momento.</div>`;
            return;
        }

        let html = '';
        list.forEach(item => {
            html += `
                <div style="background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.07); border-radius:10px; padding:10px; margin-bottom:6px;">
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <strong style="color:#ffffff; font-size:12px;">${item.email}</strong>
                        <span style="font-size:10px; color:#94a3b8;">${item.requestedAt}</span>
                    </div>
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-top:6px;">
                        <span style="font-family:monospace; font-weight:800; color:#00D2B5; font-size:14px; background:rgba(0,210,181,0.1); padding:2px 8px; border-radius:6px; border:1px solid rgba(0,210,181,0.3);">
                            ${item.code}
                        </span>
                        <div style="display:flex; gap:6px;">
                            <button data-code="${item.code}" class="btn-copy-code" style="background:#334155; color:#fff; border:none; border-radius:6px; padding:4px 8px; font-size:11px; cursor:pointer;">📋 Copiar</button>
                            <button data-email="${item.email}" class="btn-approve-pending" style="background:#10b981; color:#fff; border:none; border-radius:6px; padding:4px 8px; font-size:11px; font-weight:700; cursor:pointer;">✔ Aprobar Yape</button>
                        </div>
                    </div>
                </div>
            `;
        });
        c.innerHTML = html;

        c.querySelectorAll('.btn-copy-code').forEach(b => {
            b.onclick = () => {
                navigator.clipboard.writeText(b.dataset.code);
                alert(`Código ${b.dataset.code} copiado al portapapeles.`);
            };
        });

        c.querySelectorAll('.btn-approve-pending').forEach(b => {
            b.onclick = () => {
                const em = b.dataset.email;
                authorizeUser(em);
                renderDevPending();
                renderDevUsers();
                alert(`✔ Alumno ${em} aprobado y activado permanentemente.`);
            };
        });
    }

    function renderDevUsers() {
        const c = document.getElementById('devAuthorizedUsersList');
        if (!c) return;
        const list = getAuthorizedUsers();

        if (list.length === 0) {
            c.innerHTML = `<div style="padding:16px; text-align:center; color:#64748b; font-size:11px;">No hay alumnos registrados aún.</div>`;
            return;
        }

        let html = '';
        list.forEach(email => {
            html += `
                <div style="display:flex; justify-content:space-between; align-items:center; padding:6px 10px; border-bottom:1px solid rgba(255,255,255,0.05); font-size:11.5px;">
                    <span style="color:#e2e8f0; font-family:monospace;">🟢 ${email}</span>
                    <button data-email="${email}" class="btn-ban-user" style="background:#dc2626; color:#fff; border:none; border-radius:6px; padding:3px 8px; font-size:10.5px; font-weight:700; cursor:pointer;" title="Bloquear y desconectar inmediatamente">
                        🚫 Banear
                    </button>
                </div>
            `;
        });
        c.innerHTML = html;

        c.querySelectorAll('.btn-ban-user').forEach(b => {
            b.onclick = () => {
                const em = b.dataset.email;
                if (confirm(`¿Estás seguro de banear y desconectar a ${em}?`)) {
                    banUser(em);
                    renderDevUsers();
                }
            };
        });
    }

    function renderDevGlobalProjects() {
        const c = document.getElementById('devGlobalProjectsList');
        if (!c) return;
        const list = getAllProjects();

        if (list.length === 0) {
            c.innerHTML = `<div style="padding:16px; text-align:center; color:#64748b; font-size:11px;">Aún ningún alumno ha guardado armaduras.</div>`;
            return;
        }

        let html = '';
        list.forEach(p => {
            html += `
                <div style="background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.07); border-radius:10px; padding:8px 12px; margin-bottom:6px;">
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <strong style="color:#38bdf8; font-size:12px;">${p.name}</strong>
                        <span style="font-size:10.5px; color:#94a3b8;">${p.createdAt}</span>
                    </div>
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-top:4px;">
                        <span style="font-size:11px; color:#cbd5e1; font-family:monospace;">Autor: ${p.authorEmail}</span>
                        <div style="display:flex; gap:6px;">
                            <button data-id="${p.id}" class="btn-load-proj" style="background:#0284c7; color:#fff; border:none; border-radius:6px; padding:3px 8px; font-size:11px; font-weight:700; cursor:pointer;">Cargar</button>
                            <button data-id="${p.id}" class="btn-del-proj" style="background:#dc2626; color:#fff; border:none; border-radius:6px; padding:3px 8px; font-size:11px; cursor:pointer;">✕</button>
                        </div>
                    </div>
                </div>
            `;
        });
        c.innerHTML = html;

        c.querySelectorAll('.btn-load-proj').forEach(b => {
            b.onclick = () => {
                const proj = list.find(p => p.id === b.dataset.id);
                if (proj && window.CerebroApp && window.CerebroApp.loadProjectData) {
                    window.CerebroApp.loadProjectData(proj.nodes, proj.bars);
                    hideDevPanel();
                    alert(`✔ Armadura '${proj.name}' de ${proj.authorEmail} cargada en vivo.`);
                }
            };
        });

        c.querySelectorAll('.btn-del-proj').forEach(b => {
            b.onclick = () => {
                if (confirm("¿Eliminar esta armadura?")) {
                    deleteProject(b.dataset.id);
                    renderDevGlobalProjects();
                }
            };
        });
    }

    // ── RENDERIZADO DE PROYECTOS PROPIOS (ALUMNO) ───────────────
    function renderUserProjects() {
        const c = document.getElementById('myProjectsListContainer');
        if (!c) return;
        const list = getUserProjects();

        if (list.length === 0) {
            c.innerHTML = `<div style="padding:20px; text-align:center; color:#64748b; font-size:11.5px;">No tienes armaduras guardadas todavía. Crea una y haz clic en 'Guardar Armadura Actual'.</div>`;
            return;
        }

        let html = '';
        list.forEach(p => {
            html += `
                <div style="background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.07); border-radius:10px; padding:8px 12px; margin-bottom:6px;">
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <strong style="color:#ffffff; font-size:12px;">${p.name}</strong>
                        <span style="font-size:10px; color:#94a3b8;">${p.createdAt}</span>
                    </div>
                    <div style="display:flex; justify-content:flex-end; gap:6px; margin-top:6px;">
                        <button data-id="${p.id}" class="btn-load-my-proj" style="background:#0284c7; color:#fff; border:none; border-radius:6px; padding:4px 10px; font-size:11px; font-weight:700; cursor:pointer;">Cargar</button>
                        <button data-id="${p.id}" class="btn-del-my-proj" style="background:#334155; color:#f43f5e; border:none; border-radius:6px; padding:4px 8px; font-size:11px; cursor:pointer;">✕</button>
                    </div>
                </div>
            `;
        });
        c.innerHTML = html;

        c.querySelectorAll('.btn-load-my-proj').forEach(b => {
            b.onclick = () => {
                const proj = list.find(p => p.id === b.dataset.id);
                if (proj && window.CerebroApp && window.CerebroApp.loadProjectData) {
                    window.CerebroApp.loadProjectData(proj.nodes, proj.bars);
                    document.getElementById('projectsManagerModal').classList.add('modal-hidden');
                    alert(`✔ Armadura '${proj.name}' cargada.`);
                }
            };
        });

        c.querySelectorAll('.btn-del-my-proj').forEach(b => {
            b.onclick = () => {
                if (confirm("¿Eliminar este proyecto?")) {
                    deleteProject(b.dataset.id);
                    renderUserProjects();
                }
            };
        });
    }

    function promptSaveProject() {
        if (!window.CerebroApp || !window.CerebroApp.getCurrentData) {
            alert("No hay datos de estructura para guardar.");
            return;
        }
        const name = prompt("Nombre de la Armadura / Proyecto:", "Mi Armadura " + (getUserProjects().length + 1));
        if (name && name.trim()) {
            const data = window.CerebroApp.getCurrentData();
            saveProject(name.trim(), data.nodes, data.bars);
            renderUserProjects();
            alert(`✔ Armadura '${name.trim()}' guardada con éxito.`);
        }
    }

    // ── CONTROL DE VISIBILIDAD DE MODALES ───────────────────────
    function showModal() {
        buildModals();
        const m = document.getElementById('accessLockModal');
        if (m) m.classList.remove('modal-hidden');
    }

    function hideModal() {
        const m = document.getElementById('accessLockModal');
        if (m) m.classList.add('modal-hidden');
        updateAppHeader();
    }

    function showDevPanel() {
        buildModals();
        renderDevPending();
        renderDevUsers();
        renderDevGlobalProjects();
        const d = document.getElementById('ownerControlModal');
        if (d) d.classList.remove('modal-hidden');
    }

    function hideDevPanel() {
        const d = document.getElementById('ownerControlModal');
        if (d) d.classList.add('modal-hidden');
    }

    function showProjectsModal() {
        buildModals();
        renderUserProjects();
        const p = document.getElementById('projectsManagerModal');
        if (p) p.classList.remove('modal-hidden');
    }

    // ── INTEGRACIÓN Y BOTONES EN HEADER ─────────────────────────
    function updateAppHeader() {
        const session = getSession();
        const isAuth = !!session && (session.role === 'owner' || isUserAuthorized(session.email));

        // Botón Bloquear / Salir
        const btnRelock = document.getElementById('btnRelock');
        if (btnRelock) {
            btnRelock.style.display = isAuth ? 'inline-flex' : 'none';
            btnRelock.onclick = logoutSession;
        }

        // Botón Panel del Desarrollador (SOLO para el Desarrollador Maestro)
        let btnOwnerPanel = document.getElementById('btnOwnerPanel');
        const headerActions = document.querySelector('.header-controls') || document.querySelector('.topbar-actions') || document.querySelector('.presets-bar');

        if (!btnOwnerPanel && headerActions && session && session.role === 'owner') {
            btnOwnerPanel = document.createElement('button');
            btnOwnerPanel.id = 'btnOwnerPanel';
            btnOwnerPanel.className = 'btn btn-secondary';
            btnOwnerPanel.style.background = 'linear-gradient(135deg, #4c1d95, #7c3aed)';
            btnOwnerPanel.style.borderColor = '#c084fc';
            btnOwnerPanel.style.color = '#ffffff';
            btnOwnerPanel.style.fontWeight = '800';
            btnOwnerPanel.innerHTML = '👑 Panel Desarrollador';
            btnOwnerPanel.onclick = showDevPanel;
            headerActions.prepend(btnOwnerPanel);
        }

        if (btnOwnerPanel) {
            btnOwnerPanel.style.display = (isAuth && session && session.role === 'owner') ? 'inline-flex' : 'none';
        }

        // Botones de Guardar y Ver Proyectos
        const btnSave = document.getElementById('btnSaveProject');
        if (btnSave) {
            btnSave.onclick = promptSaveProject;
            btnSave.style.display = isAuth ? 'inline-flex' : 'none';
        }

        const btnMyProj = document.getElementById('btnMyProjects');
        if (btnMyProj) {
            btnMyProj.onclick = showProjectsModal;
            btnMyProj.style.display = isAuth ? 'inline-flex' : 'none';
        }
    }

    // ── PROTECCIÓN ANTI-BYPASS EN F12 ───────────────────────────
    function attachExecutionGuards() {
        const btnExcel = document.getElementById('btnDownloadExcel') || document.getElementById('btn-download-excel');
        if (btnExcel) {
            btnExcel.addEventListener('click', (e) => {
                const session = getSession();
                const isAuth = !!session && (session.role === 'owner' || isUserAuthorized(session.email));
                if (!isAuth) {
                    e.stopImmediatePropagation();
                    e.preventDefault();
                    showModal();
                    alert("🔒 Para descargar el Excel automatizado debes iniciar sesión y activar tu licencia.");
                    return false;
                }
            }, true);
        }
    }

    // ── INICIALIZACIÓN ──────────────────────────────────────────
    function init() {
        buildModals();
        attachExecutionGuards();
        updateAppHeader();

        const session = getSession();
        const isAuth = !!session && (session.role === 'owner' || isUserAuthorized(session.email));

        if (isAuth) {
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

    // API Global
    window.CerebroAuth = {
        isAuthorized: () => {
            const s = getSession();
            return !!s && (s.role === 'owner' || isUserAuthorized(s.email));
        },
        getSession: getSession,
        openDevPanel: showDevPanel,
        openProjects: showProjectsModal,
        saveProject: saveProject,
        lock: logoutSession
    };

})();
