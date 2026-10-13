/**
 * auth.js — CEREBRO ESTRUCTURAL PRO (Suite Unificada: Armaduras + Vigas)
 * Control de Acceso Estudiantil, Pasarela Yape S/ 15.00 con QR Oficial y Panel Maestro Ulianov
 *
 * POLÍTICA DE SEGURIDAD Y PRIVACIDAD:
 * 1. Los estudiantes y visitantes comunes NO pueden ver el directorio de integrantes.
 * 2. Solo ven la pantalla de ingreso con correo de Google o la pasarela Yape S/ 15.00 con QR oficial.
 * 3. ÚNICAMENTE el Desarrollador (Ing. Ulianov Cuba Valencia - Vayolett1404) puede:
 *    - Ver a todos los alumnos registrados y pendientes.
 *    - Aprobar acceso a la plataforma en 1 clic.
 *    - Habilitar descarga de plantilla Excel (.xlsx) con fórmulas nativas.
 *    - Botar / Expulsar / Banear a cualquier usuario en cualquier momento.
 *    - Generar códigos deterministas CYB-XXXX-XXXX para WhatsApp.
 *
 * Titular Yape: Ulianov Sabath Cuba Valencia (933 685 462)
 * QR Oficial: assets/yape_qr_ulianov.png
 */

(function () {
    'use strict';

    // ── CONSTANTES GLOBALES Y SEGURIDAD ─────────────────────────
    const MASTER_PASSWORDS = ['Vayolett1404', 'vayolett1404', 'VAYOLETT1404'];
    const CRYPTO_SALT = 'CYBORG_ULIANOV_V40_MASTER_SALT_2026';
    const NOTIFICATION_EMAIL = 'ulianov.continental@gmail.com';

    // Datos oficiales de Yape v4.0
    const YAPE_AMOUNT = 'S/ 15.00';
    const YAPE_NUMBER = '933685462';
    const YAPE_NUMBER_FMT = '933 685 462';
    const YAPE_HOLDER = 'Ulianov Sabath Cuba Valencia';
    const YAPE_QR_PATH = 'assets/yape_qr_ulianov.png';
    const YAPE_CONCEPT = 'Apoyo al Proyecto de Revisión de Ejercicios (Armaduras y Vigas)';

    // Claves persistentes en localStorage
    const KEY_SESSION         = 'cerebro_auth_session_v40';
    const KEY_WHITELIST       = 'cerebro_authorized_users_v40';
    const KEY_PENDING         = 'cerebro_pending_requests_v40';
    const KEY_BANNED          = 'cerebro_banned_users_v40';
    const KEY_EXCEL_WHITELIST = 'cerebro_excel_authorized_users_v40';
    const KEY_EXCEL_REQUESTS  = 'cerebro_excel_requests_v40';
    const KEY_STUDENTS_META   = 'cerebro_registered_students_v40';
    const KEY_DEVICE_ID       = 'cerebro_device_id_v40';

    // Acceso VIP para el Docente / Ingeniero
    const KEY_VIP_GUEST_ENABLED = 'cerebro_vip_guest_enabled_v40';
    const KEY_VIP_GUEST_TOKEN   = 'cerebro_vip_guest_token_v40';
    const KEY_VIP_GUEST_NAME    = 'cerebro_vip_guest_name_v40';
    const KEY_VIP_GUEST_EMAIL   = 'cerebro_vip_guest_email_v40';

    const DEFAULT_VIP_TOKEN = 'DOCENTE_VIP_ULIANOV';
    const DEFAULT_VIP_NAME  = 'Ing. Ulianov Cuba (Docente Invitado VIP)';
    const DEFAULT_VIP_EMAIL = 'docente.vip@continental.edu.pe';

    let myDeviceId = localStorage.getItem(KEY_DEVICE_ID);
    if (!myDeviceId) {
        myDeviceId = 'dev_' + Math.random().toString(36).substring(2) + Date.now();
        localStorage.setItem(KEY_DEVICE_ID, myDeviceId);
    }

    const sessionChannel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('cerebro_session_sync_v40') : null;

    // ── MOTOR CRIPTOGRÁFICO SHA-256 ──────────────────────────────
    function sha256(ascii) {
        function rightRotate(value, amount) { return (value >>> amount) | (value << (32 - amount)); }
        const mathPow = Math.pow;
        const maxWord = mathPow(2, 32);
        let i, j;
        let result = '';
        const words = [];
        const asciiBitLength = ascii.length * 8;
        let hash = [];
        const k = [];
        let primeCounter = 0;
        const isComposite = {};
        for (let candidate = 2; primeCounter < 64; candidate++) {
            if (!isComposite[candidate]) {
                for (i = 0; i < 313; i += candidate) isComposite[i] = candidate;
                hash[primeCounter] = (mathPow(candidate, 0.5) * maxWord) | 0;
                k[primeCounter++] = (mathPow(candidate, 1 / 3) * maxWord) | 0;
            }
        }
        ascii += '\x80';
        while (ascii.length % 64 - 56) ascii += '\x00';
        for (i = 0; i < ascii.length; i++) {
            j = ascii.charCodeAt(i);
            words[i >> 2] |= j << ((3 - i) % 4) * 8;
        }
        words[words.length] = ((asciiBitLength / maxWord) | 0);
        words[words.length] = (asciiBitLength);
        for (j = 0; j < words.length;) {
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

    function computeAccessCode(email) {
        if (!email) return '';
        const clean = email.trim().toLowerCase();
        const hash = sha256(clean + CRYPTO_SALT + '_ACCESS_KEY').toUpperCase();
        return `CYB-${hash.substring(0, 4)}-${hash.substring(4, 8)}`;
    }

    function computeExcelVipCode(email) {
        if (!email) return '';
        const clean = email.trim().toLowerCase();
        const hash = sha256(clean + CRYPTO_SALT + '_VIP_EXCEL').toUpperCase();
        return `VIP-${hash.substring(0, 4)}-${hash.substring(4, 8)}`;
    }

    function verifyAccessCode(email, code) {
        if (!code) return false;
        const cleanCode = code.trim();
        if (MASTER_PASSWORDS.includes(cleanCode) || MASTER_PASSWORDS.includes(cleanCode.toUpperCase())) return true;

        const upperCode = cleanCode.toUpperCase();
        const cleanEmail = (email || '').trim().toLowerCase();
        if (!cleanEmail) return false;

        if (upperCode === computeAccessCode(cleanEmail)) return true;
        if (upperCode === computeExcelVipCode(cleanEmail)) return true;

        const directKey = 'ULI-' + sha256(cleanEmail + CRYPTO_SALT).substring(0, 8).toUpperCase();
        if (upperCode === directKey) return true;

        const pending = getPendingRequests();
        const found = pending.find(p => p.email === cleanEmail && p.code === upperCode);
        return !!found;
    }

    function verifyExcelVipCode(email, code) {
        if (!code) return false;
        const cleanCode = code.trim();
        if (MASTER_PASSWORDS.includes(cleanCode) || MASTER_PASSWORDS.includes(cleanCode.toUpperCase())) return true;
        const cleanEmail = (email || (getSession() ? getSession().email : '') || '').trim().toLowerCase();
        if (!cleanEmail) return false;
        return cleanCode.toUpperCase() === computeExcelVipCode(cleanEmail) || cleanCode.toUpperCase() === computeAccessCode(cleanEmail);
    }

    function copyToClipboard(text, successMessage) {
        if (!text) return;
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(text).then(() => {
                if (successMessage) alert(successMessage);
            }).catch(() => fallbackCopyText(text, successMessage));
        } else {
            fallbackCopyText(text, successMessage);
        }
    }

    function fallbackCopyText(text, successMessage) {
        try {
            const ta = document.createElement('textarea');
            ta.value = text;
            ta.style.position = 'fixed';
            ta.style.left = '-999999px';
            document.body.appendChild(ta);
            ta.select();
            document.execCommand('copy');
            document.body.removeChild(ta);
            if (successMessage) alert(successMessage);
        } catch (e) {
            if (successMessage) alert(successMessage);
        }
    }

    function getStoredJSON(key, defaultVal) {
        try {
            const item = localStorage.getItem(key);
            return item ? JSON.parse(item) : defaultVal;
        } catch (e) {
            return defaultVal;
        }
    }

    function setStoredJSON(key, val) {
        try {
            localStorage.setItem(key, JSON.stringify(val));
        } catch (e) {
            console.error('Error guardando en localStorage:', e);
        }
    }

    // ── WHITELIST, SOLICITUDES Y BANEO (PRIVACIDAD ESTRICTA) ────
    function getAuthorizedUsers() { return getStoredJSON(KEY_WHITELIST, []); }
    function isUserAuthorized(email) {
        if (!email) return false;
        const clean = email.trim().toLowerCase();
        if (isUserBanned(clean)) return false;
        return getAuthorizedUsers().includes(clean);
    }

    function authorizeUser(email, name, grantExcel = true) {
        const clean = (email || '').trim().toLowerCase();
        if (!clean) return;
        unbanUser(clean, true);

        const list = getAuthorizedUsers();
        if (!list.includes(clean)) {
            list.push(clean);
            setStoredJSON(KEY_WHITELIST, list);
        }
        if (grantExcel) {
            grantExcelPermission(clean);
        }
        removePendingRequest(clean);
        saveStudentMetadata(clean, name, 'ACTIVE');
    }

    function revokeUser(email) {
        const clean = (email || '').trim().toLowerCase();
        const list = getAuthorizedUsers().filter(e => e !== clean);
        setStoredJSON(KEY_WHITELIST, list);
        revokeExcelPermission(clean);
    }

    function getBannedUsers() { return getStoredJSON(KEY_BANNED, []); }
    function isUserBanned(email) {
        return getBannedUsers().includes((email || '').trim().toLowerCase());
    }

    function banUser(email) {
        const clean = (email || '').trim().toLowerCase();
        if (!clean || clean === 'ulianov.continental@gmail.com') return;
        const list = getBannedUsers();
        if (!list.includes(clean)) {
            list.push(clean);
            setStoredJSON(KEY_BANNED, list);
        }
        revokeUser(clean);
        saveStudentMetadata(clean, null, 'BANNED');

        if (sessionChannel) {
            sessionChannel.postMessage({ type: 'USER_BANNED', email: clean });
        }

        const cur = getSession();
        if (cur && cur.email && cur.email.toLowerCase() === clean && cur.role !== 'owner') {
            logoutSession();
        }
    }

    function unbanUser(email, silent) {
        const clean = (email || '').trim().toLowerCase();
        const list = getBannedUsers().filter(e => e !== clean);
        setStoredJSON(KEY_BANNED, list);
        saveStudentMetadata(clean, null, 'ACTIVE');
        if (!silent) {
            authorizeUser(clean, null, true);
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
            requestedAt: new Date().toLocaleString()
        });
        setStoredJSON(KEY_PENDING, list);
        saveStudentMetadata(clean, accountName, 'PENDING');
    }

    function removePendingRequest(email) {
        const clean = (email || '').trim().toLowerCase();
        const list = getPendingRequests().filter(p => p.email !== clean);
        setStoredJSON(KEY_PENDING, list);
    }

    // ── DIRECTORIO MAESTRO DE ALUMNOS (SOLO VISIBLE PARA ULIANOV) ──
    function getRegisteredStudents() { return getStoredJSON(KEY_STUDENTS_META, []); }
    function saveStudentMetadata(email, name, status = 'PENDING') {
        if (!email) return;
        const clean = email.trim().toLowerCase();
        const list = getRegisteredStudents();
        const found = list.find(s => s.email === clean);
        if (found) {
            if (name) found.name = name;
            if (status) found.status = status;
            found.lastSeen = new Date().toLocaleString();
        } else {
            list.unshift({
                email: clean,
                name: name || clean.split('@')[0].toUpperCase(),
                status: status,
                joinedAt: new Date().toLocaleString(),
                lastSeen: new Date().toLocaleString()
            });
        }
        setStoredJSON(KEY_STUDENTS_META, list);
    }

    // ── PERMISOS DE DESCARGA EXCEL (.XLSX) ───────────────────────
    function getExcelAuthorizedUsers() { return getStoredJSON(KEY_EXCEL_WHITELIST, []); }
    function hasExcelPermission(email) {
        const session = getSession();
        if (session && (session.role === 'owner' || session.role === 'vip_guest')) return true;
        const target = (email || (session ? session.email : '') || '').toLowerCase().trim();
        if (!target) return false;
        return isUserAuthorized(target) && getExcelAuthorizedUsers().includes(target);
    }

    function grantExcelPermission(email) {
        const clean = (email || '').toLowerCase().trim();
        if (!clean) return;
        const list = getExcelAuthorizedUsers();
        if (!list.includes(clean)) {
            list.push(clean);
            setStoredJSON(KEY_EXCEL_WHITELIST, list);
        }
    }

    function revokeExcelPermission(email) {
        const clean = (email || '').toLowerCase().trim();
        const list = getExcelAuthorizedUsers().filter(e => e !== clean);
        setStoredJSON(KEY_EXCEL_WHITELIST, list);
    }

    function getExcelRequests() { return getStoredJSON(KEY_EXCEL_REQUESTS, []); }
    function requestExcelPermission(email, name) {
        const session = getSession();
        const targetEmail = (email || (session ? session.email : '')).toLowerCase().trim();
        if (!targetEmail) return;
        const reqs = getExcelRequests().filter(r => r.email !== targetEmail);
        reqs.unshift({
            email: targetEmail,
            name: name || (session ? session.name : targetEmail.split('@')[0]),
            requestedAt: new Date().toLocaleString(),
            status: 'PENDING'
        });
        setStoredJSON(KEY_EXCEL_REQUESTS, reqs);
    }

    // ── SESIÓN PERSISTENTE ──────────────────────────────────────
    function getSession() { return getStoredJSON(KEY_SESSION, null); }

    function isAuthorized() {
        const session = getSession();
        if (!session) return false;
        if (session.role === 'owner') return true;
        if (session.role === 'vip_guest') return isVipGuestEnabled();
        if (session.role === 'student') {
            if (isUserBanned(session.email)) return false;
            if (isUserAuthorized(session.email)) return true;
            if (localStorage.getItem('cerebro_unlocked_v40') === 'true') return true;
        }
        return false;
    }

    function saveSession(sessionObj) {
        setStoredJSON(KEY_SESSION, sessionObj);
        localStorage.setItem('cerebro_unlocked_v40', 'true');
        if (sessionObj.email) {
            saveStudentMetadata(sessionObj.email, sessionObj.name, sessionObj.role === 'owner' ? 'OWNER' : 'ACTIVE');
        }
        if (sessionChannel) {
            sessionChannel.postMessage({
                type: 'SESSION_STARTED',
                email: sessionObj.email,
                deviceId: myDeviceId
            });
        }
    }

    function logoutSession() {
        localStorage.removeItem(KEY_SESSION);
        localStorage.removeItem('cerebro_unlocked_v40');
        showModal();
        updateAppHeader();
    }

    // ── GESTIÓN DE ACCESO VIP DOCENTE ────────────────────────────
    function isVipGuestEnabled() {
        const val = localStorage.getItem(KEY_VIP_GUEST_ENABLED);
        return val === null ? true : val === 'true';
    }

    function setVipGuestEnabled(enabled) {
        localStorage.setItem(KEY_VIP_GUEST_ENABLED, enabled ? 'true' : 'false');
        if (sessionChannel) {
            sessionChannel.postMessage({ type: 'VIP_GUEST_TOGGLED', enabled: !!enabled });
        }
    }

    function getVipGuestToken() { return localStorage.getItem(KEY_VIP_GUEST_TOKEN) || DEFAULT_VIP_TOKEN; }
    function setVipGuestToken(token) { localStorage.setItem(KEY_VIP_GUEST_TOKEN, (token || DEFAULT_VIP_TOKEN).trim()); }
    function getVipGuestName() { return localStorage.getItem(KEY_VIP_GUEST_NAME) || DEFAULT_VIP_NAME; }
    function getVipGuestEmail() { return localStorage.getItem(KEY_VIP_GUEST_EMAIL) || DEFAULT_VIP_EMAIL; }

    function loginAsVipGuest() {
        const sessionObj = {
            role: 'vip_guest',
            email: getVipGuestEmail(),
            name: getVipGuestName(),
            avatar: '👨‍🏫',
            isVipGuest: true,
            hasExcelVip: true,
            loginAt: new Date().toLocaleString()
        };
        saveSession(sessionObj);
        grantExcelPermission(sessionObj.email);
        authorizeUser(sessionObj.email, sessionObj.name, true);
        return sessionObj;
    }

    function generateVipGuestShareUrl() {
        let base = window.location.origin + window.location.pathname;
        if (!base.startsWith('http')) {
            base = 'https://72008081-pixel.github.io/Ulianov-Continental/';
        }
        const token = getVipGuestToken();
        return `${base}?vip=${encodeURIComponent(token)}`;
    }

    // ── DETECCIÓN DE PARÁMETROS EN URL Y REDIRECCIÓN ─────────────
    function getUrlParameter(name) {
        const n = name.toLowerCase();
        const checkPart = (str) => {
            if (!str) return null;
            const pairs = str.replace(/^[?#]/, '').split('&');
            for (const p of pairs) {
                if (!p) continue;
                const parts = p.split('=');
                if (decodeURIComponent(parts[0] || '').toLowerCase() === n) {
                    return decodeURIComponent(parts.slice(1).join('=') || '');
                }
            }
            return null;
        };
        return checkPart(window.location.search) || checkPart(window.location.hash);
    }

    function checkVipGuestUrl() {
        const vipVal = getUrlParameter('vip') || getUrlParameter('vip_guest') || getUrlParameter('token');
        if (!vipVal) return false;
        const validTokens = [getVipGuestToken().toUpperCase(), DEFAULT_VIP_TOKEN.toUpperCase(), 'DOCENTE_VIP', 'VIP_DOCENTE'];
        if (validTokens.includes(vipVal.trim().toUpperCase())) {
            if (!isVipGuestEnabled()) {
                alert('🔒 El enlace de Invitado VIP se encuentra temporalmente pausado.');
                return false;
            }
            loginAsVipGuest();
            return true;
        }
        return false;
    }

    // Redirección inteligente de enlaces compartidos
    function checkUrlForSharedPayloads() {
        const hash = window.location.hash || '';
        const search = window.location.search || '';
        const curPath = window.location.pathname.toLowerCase();

        if ((hash.includes('armadura=') || search.includes('armadura=')) && !curPath.endsWith('armaduras.html')) {
            window.location.href = 'armaduras.html' + hash;
            return;
        }
        if ((hash.includes('viga=') || search.includes('viga=')) && !curPath.endsWith('vigas.html')) {
            window.location.href = 'vigas.html' + hash;
            return;
        }
    }

    async function sendNotificationEmail(studentEmail, studentName, generatedCode) {
        const payload = {
            _subject: `🔔 Solicitud Yape ${YAPE_AMOUNT}: ${studentEmail} (Cerebro Estructural)`,
            email: studentEmail,
            nombre: studentName,
            codigo_acceso_generado: generatedCode,
            concepto: `${YAPE_CONCEPT} (${YAPE_AMOUNT} al ${YAPE_NUMBER} - ${YAPE_HOLDER})`,
            fecha: new Date().toLocaleString()
        };
        try {
            await fetch(`https://formsubmit.co/ajax/${NOTIFICATION_EMAIL}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                body: JSON.stringify(payload)
            });
        } catch (e) {}
    }

    // ── ESTILOS OSCUROS LIQUID-GLASS DE ALTA CALIDAD ─────────────
    const styleSheet = document.createElement('style');
    styleSheet.id = 'cerebro-auth-dark-styles-v4';
    styleSheet.textContent = `
        /* Overlay Vidrioso Oscuro */
        #accessLockModal, #ownerControlModal, #modalExcelVipNotice {
            position: fixed;
            inset: 0;
            z-index: 999999;
            background: rgba(3, 7, 18, 0.82);
            backdrop-filter: blur(28px) saturate(190%);
            -webkit-backdrop-filter: blur(28px) saturate(190%);
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 16px;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            color: #f8fafc;
            transition: opacity 0.22s ease, visibility 0.22s ease;
        }

        .modal-hidden {
            opacity: 0 !important;
            visibility: hidden !important;
            pointer-events: none !important;
            display: none !important;
        }

        /* Tarjeta Oscura Liquid Glass */
        .liquid-glass-card-dark {
            background: rgba(15, 23, 42, 0.88);
            background-image: radial-gradient(at 100% 0%, rgba(116, 34, 132, 0.32) 0px, transparent 50%),
                              radial-gradient(at 0% 100%, rgba(14, 165, 233, 0.22) 0px, transparent 50%);
            border: 1.5px solid rgba(255, 255, 255, 0.16);
            border-top: 1.5px solid rgba(255, 255, 255, 0.32);
            border-radius: 22px;
            max-width: 480px;
            width: 100%;
            padding: 24px;
            box-shadow: 0 30px 80px rgba(0, 0, 0, 0.75), inset 0 1px 1px rgba(255, 255, 255, 0.25);
            color: #f8fafc;
            text-align: center;
            position: relative;
            max-height: 94vh;
            overflow-y: auto;
            animation: liquidPop 0.24s cubic-bezier(0.16, 1, 0.3, 1);
        }

        @keyframes liquidPop {
            0% { transform: scale(0.95) translateY(10px); opacity: 0; }
            100% { transform: scale(1) translateY(0); opacity: 1; }
        }

        .liquid-input-dark {
            width: 100%;
            background: rgba(13, 20, 36, 0.90);
            border: 1.5px solid rgba(255, 255, 255, 0.18);
            border-radius: 10px;
            padding: 11px 14px;
            font-size: 13.5px;
            color: #ffffff;
            font-weight: 700;
            font-family: inherit;
            outline: none;
            transition: all 0.18s ease;
            box-sizing: border-box;
            margin-bottom: 6px;
        }

        .liquid-input-dark:focus {
            border-color: #38bdf8;
            box-shadow: 0 0 14px rgba(56, 189, 248, 0.35);
            background: rgba(15, 23, 42, 0.98);
        }

        .liquid-btn-primary-dark {
            width: 100%;
            background: linear-gradient(135deg, #742284 0%, #2563eb 100%);
            color: #ffffff;
            font-size: 13.5px;
            font-weight: 800;
            padding: 12px;
            border: none;
            border-radius: 10px;
            cursor: pointer;
            box-shadow: 0 6px 20px rgba(116, 34, 132, 0.45);
            transition: all 0.15s ease;
            box-sizing: border-box;
        }

        .liquid-btn-primary-dark:hover {
            transform: translateY(-1px);
            box-shadow: 0 8px 24px rgba(37, 99, 235, 0.45);
        }

        .btn-google-dark {
            width: 100%;
            background: #ffffff;
            color: #0f172a;
            font-size: 13.5px;
            font-weight: 800;
            padding: 11px 16px;
            border: none;
            border-radius: 10px;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 10px;
            box-shadow: 0 4px 14px rgba(0, 0, 0, 0.35);
            transition: all 0.15s ease;
            box-sizing: border-box;
            margin-top: 8px;
        }

        .btn-google-dark:hover {
            background: #f1f5f9;
            transform: translateY(-1px);
        }

        .qr-card-dark {
            background: rgba(116, 34, 132, 0.18);
            border: 1.5px solid rgba(116, 34, 132, 0.65);
            border-radius: 14px;
            padding: 12px;
            margin: 10px 0 12px;
            text-align: center;
        }

        .qr-image-display-dark {
            width: 220px;
            max-width: 90%;
            height: auto;
            border-radius: 12px;
            border: 2px solid #00D2B5;
            box-shadow: 0 8px 22px rgba(0, 210, 181, 0.25);
            margin: 6px auto;
            display: block;
        }

        .domain-chip-dark {
            background: rgba(255, 255, 255, 0.08);
            border: 1px solid rgba(255, 255, 255, 0.16);
            border-radius: 99px;
            padding: 3px 9px;
            font-size: 11px;
            font-weight: 700;
            color: #cbd5e1;
            cursor: pointer;
        }

        .domain-chip-dark:hover {
            background: rgba(56, 189, 248, 0.20);
            border-color: #38bdf8;
            color: #38bdf8;
        }
    `;
    document.head.appendChild(styleSheet);

    let currentSelectedAccount = null;

    // ── CONSTRUCCIÓN DE MODALES (PRIVACIDAD Y CONTROL TOTAL) ─────
    function buildModals() {
        if (document.getElementById('accessLockModal')) return;

        // 1. MODAL DE ACCESO ALUMNOS / INVITADOS
        const mainModal = document.createElement('div');
        mainModal.id = 'accessLockModal';
        mainModal.className = 'modal-hidden';
        mainModal.innerHTML = `
            <div class="liquid-glass-card-dark">
                <!-- ══ VISTA 1: REGISTRO CON CORREO DE GOOGLE ══ -->
                <div id="viewGoogleChooser" style="display: block;">
                    <div style="display: inline-flex; align-items: center; gap: 8px; background: rgba(56, 189, 248, 0.15); border: 1px solid rgba(56, 189, 248, 0.4); padding: 4px 14px; border-radius: 99px; margin-bottom: 8px;">
                        <svg width="18" height="18" viewBox="0 0 48 48">
                            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                            <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.28-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.79l7.97-6.2z"/>
                            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                        </svg>
                        <span style="font-size: 12px; font-weight: 800; color: #38bdf8;">Acceso Académico a la Plataforma</span>
                    </div>

                    <h2 style="font-size: 19px; font-weight: 900; color: #ffffff; margin: 0 0 3px;">
                        CEREBRO ESTRUCTURAL <span style="color: #38bdf8; font-size: 14px;">PRO</span>
                    </h2>
                    <p style="font-size: 11.5px; color: #94a3b8; font-weight: 600; margin: 0 0 12px;">
                        Armaduras 2D + Vigas (Plantilla Ulianov) • Ing. Ulianov Cuba Valencia
                    </p>

                    <div style="text-align: left; margin-bottom: 8px;">
                        <label style="font-size: 11.5px; font-weight: 800; color: #cbd5e1; display: block; margin-bottom: 4px;">
                            Ingresa tu correo institucional o de Google:
                        </label>
                        <input type="email" id="userGoogleEmailInput" class="liquid-input-dark" placeholder="tu.correo@continental.edu.pe o @gmail.com" autocomplete="email">
                        <div style="display: flex; gap: 6px; margin-top: 4px; justify-content: center; align-items: center;">
                            <span style="font-size: 10.5px; color: #64748b; font-weight: 600;">Completar:</span>
                            <button type="button" class="domain-chip-dark" data-domain="@continental.edu.pe">@continental.edu.pe</button>
                            <button type="button" class="domain-chip-dark" data-domain="@gmail.com">@gmail.com</button>
                        </div>
                    </div>

                    <div style="text-align: left; margin-bottom: 8px;">
                        <label style="font-size: 11.5px; font-weight: 800; color: #cbd5e1; display: block; margin-bottom: 4px;">
                            Nombre completo del alumno (Opcional):
                        </label>
                        <input type="text" id="userFullNameInput" class="liquid-input-dark" placeholder="Tu Nombre y Apellido">
                    </div>

                    <label style="display: flex; align-items: flex-start; gap: 8px; text-align: left; font-size: 11px; color: #cbd5e1; background: rgba(0, 0, 0, 0.25); padding: 8px 10px; border-radius: 8px; border: 1px solid rgba(255, 255, 255, 0.08); margin-bottom: 10px; cursor: pointer;">
                        <input type="checkbox" id="chkTermsAndConditions" checked style="margin-top: 2px; width: 15px; height: 15px; accent-color: #00D2B5;">
                        <span>He leído y acepto los <strong>Términos de Licencia Académica</strong> y la política de sesión única por alumno.</span>
                    </label>

                    <div id="termsErrorMsg" style="display:none; color:#f43f5e; font-size:11px; font-weight:800; margin-bottom:8px;">
                        ⚠ Debes aceptar los términos para continuar.
                    </div>

                    <button id="btnConfirmGoogleAccount" class="btn-google-dark">
                        <svg width="18" height="18" viewBox="0 0 48 48">
                            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                            <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.28-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.79l7.97-6.2z"/>
                            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                        </svg>
                        <span>Continuar con cuenta de Google</span>
                    </button>

                    <div style="margin-top: 14px; border-top: 1px solid rgba(255, 255, 255, 0.08); padding-top: 10px;">
                        <span id="linkDevAccess" style="font-size: 11px; color: #64748b; cursor: pointer; text-decoration: none;">
                            ⚙️ ¿Eres el Administrador? Ingresa con tu clave maestra
                        </span>
                    </div>
                </div>

                <!-- ══ VISTA 2: PASARELA YAPE S/ 15.00 CON QR OFICIAL ══ -->
                <div id="viewYapePaywall" style="display: none;">
                    <div style="display: inline-flex; align-items: center; gap: 8px; background: linear-gradient(135deg, #742284 0%, #4a1458 100%); border: 1px solid #00D2B5; color: #ffffff; padding: 4px 14px; border-radius: 99px; font-weight: 900; font-size: 12px; margin-bottom: 6px;">
                        <span>YAPEA</span>
                        <span style="color: #00D2B5; font-size: 14px;">${YAPE_AMOUNT}</span>
                        <span>• APOYO AL PROYECTO</span>
                    </div>

                    <h3 style="font-size: 15.5px; font-weight: 800; color: #ffffff; margin: 0 0 2px;">
                        Activación de Licencia Académica
                    </h3>
                    <p style="font-size: 11px; color: #cbd5e1; margin: 0 0 8px;">
                        Acceso a la Suite completa de <strong>Armaduras 2D y Vigas (Plantilla Ulianov)</strong>, informe PDF y descarga Excel (.xlsx).
                    </p>

                    <div style="background: rgba(13, 20, 36, 0.85); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 8px; padding: 6px 10px; margin-bottom: 8px; font-size: 11.5px; text-align: left;">
                        <span style="color: #94a3b8;">Cuenta vinculada:</span>
                        <strong id="lblActiveStudentEmail" style="color: #38bdf8; font-family: monospace; margin-left: 4px;"></strong>
                    </div>

                    <!-- TARJETA DEL QR OFICIAL DE YAPE -->
                    <div class="qr-card-dark">
                        <div style="font-size: 11.5px; font-weight: 800; color: #00D2B5; margin-bottom: 4px;">
                            📲 ESCANEA EL CÓDIGO QR O YAPEA AL NÚMERO DIRECTO:
                        </div>

                        <img src="${YAPE_QR_PATH}" alt="QR Yape Ulianov Sabath Cuba Valencia" class="qr-image-display-dark">

                        <div style="margin-top: 6px;">
                            <div style="font-size: 13px; font-weight: 900; color: #ffffff;">
                                Titular: <strong style="color: #00D2B5;">${YAPE_HOLDER}</strong>
                            </div>
                            <div style="font-size: 17px; font-weight: 900; color: #38bdf8; font-family: monospace; margin: 2px 0;">
                                ${YAPE_NUMBER_FMT}
                            </div>
                        </div>

                        <button type="button" id="btnCopyYapeNumber" style="background: #742284; border: 1px solid #00D2B5; color: #ffffff; border-radius: 6px; padding: 5px 12px; font-size: 11px; font-weight: 800; cursor: pointer; margin-top: 4px;">
                            📋 Copiar Número 933685462
                        </button>
                    </div>

                    <a id="btnYapeWhatsAppLink" href="https://api.whatsapp.com/send?phone=51${YAPE_NUMBER}" target="_blank" rel="noopener noreferrer" style="display: flex; align-items: center; justify-content: center; gap: 8px; background: #25D366; color: #ffffff; text-decoration: none; font-size: 12px; font-weight: 800; padding: 9px; border-radius: 8px; margin-bottom: 10px; box-shadow: 0 4px 12px rgba(37, 211, 102, 0.3);">
                        <span>📲 Enviar Comprobante por WhatsApp al Ing. Ulianov (${YAPE_NUMBER_FMT})</span>
                    </a>

                    <div style="text-align: left; margin-bottom: 4px;">
                        <label style="font-size: 11px; font-weight: 700; color: #cbd5e1; display: block; margin-bottom: 3px;">
                            Ingresa tu Código de Activación brindado por el Ing. Ulianov:
                        </label>
                        <input type="text" id="accessPassInput" class="liquid-input-dark" placeholder="CYB-XXXX-XXXX" autocomplete="off" style="text-align: center; font-family: monospace; font-size: 14.5px; font-weight: 800; letter-spacing: 1px; text-transform: uppercase;">
                    </div>

                    <button id="btnUnlockAccess" class="liquid-btn-primary-dark">
                        🔓 Validar Código y Entrar a la Suite
                    </button>

                    <div id="passErrorMsg" style="display:none; color:#f43f5e; font-size:11px; font-weight:700; margin-top:6px; background:rgba(244,63,94,0.1); border:1px solid rgba(244,63,94,0.3); padding:6px; border-radius:6px;"></div>

                    <div style="margin-top: 12px; display: flex; justify-content: space-between; align-items: center;">
                        <span id="linkBackToChooser" style="color: #94a3b8; font-size: 11px; text-decoration: underline; cursor: pointer;">⬅ Cambiar correo</span>
                        <span id="linkDevAccess2" style="color: #64748b; font-size: 11px; cursor: pointer;">⚙️ Admin Ulianov</span>
                    </div>
                </div>

                <!-- ══ VISTA 3: INGRESO DE DESARROLLADOR / ADMINISTRADOR ══ -->
                <div id="viewDeveloperAccess" style="display: none;">
                    <div style="font-size: 32px; margin-bottom: 4px;">👑</div>
                    <h3 style="font-size: 16px; font-weight: 800; color: #c084fc; margin: 0 0 4px;">
                        Panel de Administración — Ing. Ulianov Cuba
                    </h3>
                    <p style="font-size: 11.5px; color: #94a3b8; margin-bottom: 12px;">
                        Ingresa la contraseña maestra para abrir tu panel de control, ver alumnos registrados, autorizar accesos y descargar la plantilla Excel sin restricciones.
                    </p>
                    <input type="password" id="ownerMasterPassInput" class="liquid-input-dark" placeholder="Contraseña maestra de Ulianov..." autocomplete="off">
                    <button id="btnOwnerLogin" class="liquid-btn-primary-dark" style="background: linear-gradient(135deg, #581c87, #9333ea);">
                        ⚡ Iniciar Sesión de Administrador
                    </button>
                    <div id="ownerErrorMsg" style="display:none; color:#f43f5e; font-size:11.5px; font-weight:700; margin-top:6px;"></div>
                    <div style="margin-top: 12px;">
                        <span id="linkBackFromDev" style="color: #38bdf8; font-size: 11px; text-decoration: underline; cursor: pointer;">⬅ Volver al inicio</span>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(mainModal);

        // 2. PANEL EXCLUSIVO DEL DESARROLLADOR (ULIANOV CUBA)
        const devModal = document.createElement('div');
        devModal.id = 'ownerControlModal';
        devModal.className = 'modal-hidden';
        devModal.innerHTML = `
            <div class="liquid-glass-card-dark" style="max-width: 660px; text-align: left;">
                <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(255,255,255,0.12); padding-bottom: 8px; margin-bottom: 12px;">
                    <div>
                        <h3 style="font-size: 16px; font-weight: 800; color: #c084fc; margin: 0;">👑 Panel de Control Maestro — Ing. Ulianov Cuba</h3>
                        <span style="font-size: 11px; color: #94a3b8;">Aprobación Yape, Gestión de Alumnos, Códigos Deterministas y Permisos Excel</span>
                    </div>
                    <button id="btnCloseDevPanel" style="background: none; border: none; color: #94a3b8; font-size: 20px; cursor: pointer;">✕</button>
                </div>

                <!-- GENERADOR Y CONSULTOR DE CLAVES EN VIVO -->
                <div style="background: rgba(116, 34, 132, 0.2); border: 1.5px solid rgba(0, 210, 181, 0.5); border-radius: 12px; padding: 10px 12px; margin-bottom: 12px;">
                    <div style="font-size: 11.5px; font-weight: 800; color: #00D2B5; margin-bottom: 4px;">
                        🔑 GENERADOR RÁPIDO DE CÓDIGOS PARA WHATSAPP
                    </div>
                    <div style="display: flex; gap: 6px; margin-bottom: 6px;">
                        <input type="text" id="devKeyFinderInput" class="liquid-input-dark" placeholder="Escribe el correo del alumno (ej: 76185411@continental.edu.pe)..." style="margin: 0; font-size: 11.5px;">
                        <button id="btnDevKeyFinderClear" type="button" style="background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.15); color: #cbd5e1; border-radius: 8px; padding: 6px 12px; font-size: 11px; cursor: pointer;">
                            Limpiar
                        </button>
                    </div>
                    <div id="devKeyFinderResults" style="background: rgba(0,0,0,0.45); border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; padding: 8px;"></div>
                </div>

                <!-- CONTROL DE ENLACE VIP DOCENTE -->
                <div style="background: linear-gradient(135deg, rgba(16, 185, 129, 0.18), rgba(6, 78, 59, 0.35)); border: 1.5px solid #10b981; border-radius: 12px; padding: 10px 12px; margin-bottom: 12px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;">
                    <div>
                        <div style="font-size: 11.5px; font-weight: 800; color: #34d399;">👨‍🏫 Enlace Gratuito Directo para el Docente (Ingeniero)</div>
                        <input type="text" id="devVipShareLinkInput" readonly style="width: 280px; font-size: 10.5px; font-family: monospace; border: 1px solid #10b981; border-radius: 6px; padding: 4px 6px; background: rgba(0,0,0,0.6); color: #38bdf8;">
                    </div>
                    <div style="display: flex; gap: 6px;">
                        <button id="btnCopyVipShareLink" type="button" class="liquid-btn-primary-dark" style="width: auto; padding: 6px 12px; font-size: 11px; background: #059669;">
                            📋 Copiar Link VIP
                        </button>
                        <button id="btnToggleVipGuest" type="button" style="padding: 6px 12px; border-radius: 6px; font-size: 11px; font-weight: 800; cursor: pointer; border: none;"></button>
                    </div>
                </div>

                <!-- AUTORIZACIÓN MANUAL DIRECTA -->
                <div style="background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; padding: 10px 12px; margin-bottom: 12px;">
                    <div style="font-size: 11.5px; font-weight: 800; color: #cbd5e1; margin-bottom: 6px;">
                        ➕ Autorizar Alumno Directamente en este Navegador:
                    </div>
                    <div style="display: flex; gap: 6px; flex-wrap: wrap;">
                        <input type="email" id="devQuickAuthorizeInput" class="liquid-input-dark" placeholder="correo@continental.edu.pe" style="flex: 1; min-width: 200px; margin: 0; font-size: 11.5px;">
                        <button id="btnDevQuickAuthorize" class="liquid-btn-primary-dark" style="width: auto; padding: 7px 14px; font-size: 11.5px; background: linear-gradient(135deg, #0284c7, #38bdf8); white-space: nowrap;">
                            ✔ Autorizar y Dar Excel
                        </button>
                    </div>
                </div>

                <!-- LISTA COMPLETA DE ALUMNOS REGISTRADOS (SOLO VISIBLE PARA ULIANOV) -->
                <div style="font-size: 12px; font-weight: 800; color: #ffffff; margin-bottom: 6px; display: flex; justify-content: space-between; align-items: center;">
                    <span>📋 Alumnos Registrados y Estado de Acceso (<span id="devTotalStudentsCount">0</span>):</span>
                </div>
                <div id="devStudentsListContainer" style="max-height: 250px; overflow-y: auto; background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.08); border-radius: 10px; padding: 6px;"></div>

                <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid rgba(255,255,255,0.1); margin-top: 12px; padding-top: 10px;">
                    <button id="btnDevLogout" style="background: #ef4444; color: #ffffff; border: none; border-radius: 6px; padding: 7px 14px; font-size: 11px; font-weight: 800; cursor: pointer;">
                        🔒 Salir del Modo Administrador
                    </button>
                    <span style="font-size: 11px; color: #64748b;">Panel Privado Ulianov • Control de Acceso y Licencias</span>
                </div>
            </div>
        `;
        document.body.appendChild(devModal);

        // 3. MODAL DE AVISO DE LICENCIA VIP DE EXCEL (PARA ALUMNOS SIN PERMISO EXCEL)
        const excelModal = document.createElement('div');
        excelModal.id = 'modalExcelVipNotice';
        excelModal.className = 'modal-hidden';
        excelModal.innerHTML = `
            <div class="liquid-glass-card-dark" style="max-width: 460px;">
                <div style="font-size: 36px; margin-bottom: 4px;">📊🔒</div>
                <h3 style="font-size: 16px; font-weight: 800; color: #ffffff; margin: 0 0 4px;">
                    Descarga de Plantilla Maestra en Excel (.xlsx)
                </h3>
                <p style="font-size: 11.5px; color: #cbd5e1; margin-bottom: 12px;">
                    El archivo Excel oficial con fórmulas dinámicas (<code style="color:#38bdf8;">=MINVERSE</code>, <code style="color:#34d399;">=MMULT</code>) y pre-cálculo sin errores requiere autorización del Ing. Ulianov Cuba Valencia.
                </p>

                <div style="background: rgba(0,0,0,0.35); border: 1px solid rgba(255,255,255,0.12); border-radius: 10px; padding: 10px; margin-bottom: 12px; text-align: left;">
                    <label style="font-size: 11px; font-weight: 700; color: #38bdf8; display: block; margin-bottom: 4px;">
                        ¿Ya tienes tu Código VIP de Excel?
                    </label>
                    <div style="display: flex; gap: 6px;">
                        <input type="text" id="inputExcelVipCode" class="liquid-input-dark" placeholder="VIP-XXXX-XXXX" style="margin: 0; font-size: 12px; text-align: center; text-transform: uppercase; font-family: monospace;">
                        <button id="btnUnlockExcelWithVipCode" class="liquid-btn-primary-dark" style="width: auto; padding: 6px 14px; font-size: 11.5px; background: #059669; white-space: nowrap;">
                            🔓 Canjear VIP
                        </button>
                    </div>
                    <div id="vipCodeErrorMsg" style="display:none; color:#f43f5e; font-size:10.5px; font-weight:700; margin-top:4px;"></div>
                </div>

                <div style="display: flex; gap: 8px; justify-content: center;">
                    <button id="btnRequestExcelVip" class="liquid-btn-primary-dark" style="background: #0284c7; font-size: 11.5px; padding: 9px 14px; width: auto;">
                        📩 Solicitar Permiso de Excel al Ing. Ulianov
                    </button>
                    <button id="btnCloseExcelVipNotice" style="background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.15); color: #cbd5e1; border-radius: 8px; padding: 9px 14px; font-size: 11.5px; font-weight: 700; cursor: pointer;">
                        Cerrar
                    </button>
                </div>
                <div id="excelVipConfirmMsg" style="display:none; color:#10b981; font-size:11.5px; font-weight:700; margin-top:8px;">
                    ✔ ¡Solicitud registrada! En cuanto el Ing. Ulianov apruebe tu descarga podrás bajar el archivo .xlsx.
                </div>
            </div>
        `;
        document.body.appendChild(excelModal);

        // ── CONTROLADORES DE VISTAS Y NAVEGACIÓN ─────────────────────
        const viewGoogle = document.getElementById('viewGoogleChooser');
        const viewYape   = document.getElementById('viewYapePaywall');
        const viewDev    = document.getElementById('viewDeveloperAccess');

        function switchView(name) {
            viewGoogle.style.display = (name === 'google') ? 'block' : 'none';
            viewYape.style.display   = (name === 'yape')   ? 'block' : 'none';
            viewDev.style.display    = (name === 'dev')    ? 'block' : 'none';
        }

        document.getElementById('linkDevAccess').onclick = () => switchView('dev');
        document.getElementById('linkDevAccess2').onclick = () => switchView('dev');
        document.getElementById('linkBackFromDev').onclick = () => switchView('google');
        document.getElementById('linkBackToChooser').onclick = () => switchView('google');

        document.getElementById('btnCopyYapeNumber').onclick = () => {
            copyToClipboard(YAPE_NUMBER, `✔ Número copiado: ${YAPE_NUMBER}\nTitular: ${YAPE_HOLDER}\nMonto: ${YAPE_AMOUNT}`);
        };

        document.querySelectorAll('.domain-chip-dark').forEach(chip => {
            chip.onclick = () => {
                const input = document.getElementById('userGoogleEmailInput');
                const domain = chip.dataset.domain;
                let val = (input.value || '').trim();
                if (!val) input.value = domain;
                else if (val.includes('@')) input.value = val.split('@')[0] + domain;
                else input.value = val + domain;
                input.focus();
            };
        });

        // Continuar con cuenta de Google
        document.getElementById('btnConfirmGoogleAccount').onclick = () => {
            const chkTerms = document.getElementById('chkTermsAndConditions');
            const errTerms = document.getElementById('termsErrorMsg');
            if (!chkTerms.checked) {
                errTerms.style.display = 'block';
                return;
            }
            errTerms.style.display = 'none';

            const input = document.getElementById('userGoogleEmailInput');
            const nameInput = document.getElementById('userFullNameInput');
            const entered = (input.value || '').trim();

            if (MASTER_PASSWORDS.includes(entered)) {
                grantDeveloperAccess();
                return;
            }

            if (!entered || !entered.includes('@')) {
                alert('Por favor ingresa tu correo institucional o de Google (@continental.edu.pe o @gmail.com).');
                input.focus();
                return;
            }

            const cleanEmail = entered.toLowerCase().trim();
            if (isUserBanned(cleanEmail)) {
                alert('🚫 ACCESO DENEGADO:\n\nEsta cuenta se encuentra bloqueada por el Administrador.');
                return;
            }

            const cleanName = (nameInput && nameInput.value.trim()) ? nameInput.value.trim() : cleanEmail.split('@')[0].toUpperCase();
            saveStudentMetadata(cleanEmail, cleanName, isUserAuthorized(cleanEmail) ? 'ACTIVE' : 'PENDING');
            processStudentLogin(cleanEmail, cleanName);
        };

        function processStudentLogin(email, name) {
            const cleanEmail = email.toLowerCase().trim();
            currentSelectedAccount = { email: cleanEmail, name: name };

            // Si ya está autorizado en la lista por Ulianov, ingresa directamente
            if (isUserAuthorized(cleanEmail)) {
                saveSession({ role: 'student', email: cleanEmail, name: name });
                hideModal();
                alert(`✔ ¡Bienvenido de nuevo, ${name}!\nTu acceso a CEREBRO ESTRUCTURAL PRO está validado.`);
                return;
            }

            // Si es nuevo o no autorizado, mostrar la pantalla Yape S/ 15.00 con QR
            const accessCode = computeAccessCode(cleanEmail);
            addPendingRequest(cleanEmail, accessCode, name);
            sendNotificationEmail(cleanEmail, name, accessCode);

            const lblEmail = document.getElementById('lblActiveStudentEmail');
            if (lblEmail) lblEmail.textContent = `${name} (${cleanEmail})`;

            const waLink = document.getElementById('btnYapeWhatsAppLink');
            if (waLink) {
                const textMsg = encodeURIComponent(`Hola Ing. Ulianov Cuba, envío mi comprobante de Yape de ${YAPE_AMOUNT} al ${YAPE_NUMBER} (${YAPE_HOLDER}) para activar mi cuenta: ${cleanEmail}. Por favor indícame mi código de acceso.`);
                waLink.href = `https://api.whatsapp.com/send?phone=51${YAPE_NUMBER}&text=${textMsg}`;
            }

            switchView('yape');
            document.getElementById('accessPassInput').focus();
        }

        document.getElementById('btnUnlockAccess').onclick = attemptUnlockWithCode;
        document.getElementById('accessPassInput').onkeydown = (e) => {
            if (e.key === 'Enter') attemptUnlockWithCode();
        };

        function attemptUnlockWithCode() {
            const entered = (document.getElementById('accessPassInput').value || '').trim();
            const errEl = document.getElementById('passErrorMsg');

            if (MASTER_PASSWORDS.includes(entered)) {
                grantDeveloperAccess();
                return;
            }

            if (!currentSelectedAccount) {
                switchView('google');
                return;
            }

            if (verifyAccessCode(currentSelectedAccount.email, entered)) {
                authorizeUser(currentSelectedAccount.email, currentSelectedAccount.name, true);
                saveSession({ role: 'student', email: currentSelectedAccount.email, name: currentSelectedAccount.name });
                hideModal();
                updateAppHeader();
                alert(`🎉 ¡Licencia activada con éxito para ${currentSelectedAccount.name}!\nAcceso habilitado a la plataforma y descarga.`);
            } else {
                errEl.innerHTML = `❌ Código incorrecto para <strong>${currentSelectedAccount.email}</strong>.<br>Escribe al WhatsApp del Ing. Ulianov (${YAPE_NUMBER_FMT}) con tu comprobante de Yape para recibir tu código personal.`;
                errEl.style.display = 'block';
            }
        }

        document.getElementById('btnOwnerLogin').onclick = attemptDevLogin;
        document.getElementById('ownerMasterPassInput').onkeydown = (e) => {
            if (e.key === 'Enter') attemptDevLogin();
        };

        function attemptDevLogin() {
            const pass = (document.getElementById('ownerMasterPassInput').value || '').trim();
            const errEl = document.getElementById('ownerErrorMsg');
            if (MASTER_PASSWORDS.includes(pass)) {
                grantDeveloperAccess();
                showDevPanel();
            } else {
                errEl.textContent = '❌ Contraseña maestra incorrecta.';
                errEl.style.display = 'block';
            }
        }

        function grantDeveloperAccess() {
            saveSession({ role: 'owner', email: 'ulianov.continental@gmail.com', name: 'Ing. Ulianov Cuba (Desarrollador)' });
            hideModal();
            updateAppHeader();
        }

        // Controladores del Panel Desarrollador
        document.getElementById('btnCloseDevPanel').onclick = hideDevPanel;
        document.getElementById('btnDevLogout').onclick = () => {
            hideDevPanel();
            logoutSession();
        };

        const devKeyInput = document.getElementById('devKeyFinderInput');
        if (devKeyInput) {
            devKeyInput.addEventListener('input', () => updateDevKeyFinder(devKeyInput.value));
        }
        document.getElementById('btnDevKeyFinderClear').onclick = () => {
            if (devKeyInput) devKeyInput.value = '';
            updateDevKeyFinder('');
        };

        document.getElementById('btnToggleVipGuest').onclick = () => {
            setVipGuestEnabled(!isVipGuestEnabled());
            renderDevVipGuestCard();
        };

        document.getElementById('btnCopyVipShareLink').onclick = () => {
            const inp = document.getElementById('devVipShareLinkInput');
            if (inp && inp.value) copyToClipboard(inp.value, '📋 Enlace VIP copiado al portapapeles.');
        };

        document.getElementById('btnDevQuickAuthorize').onclick = () => {
            const em = (document.getElementById('devQuickAuthorizeInput').value || '').trim().toLowerCase();
            if (em && em.includes('@')) {
                authorizeUser(em, em.split('@')[0].toUpperCase(), true);
                document.getElementById('devQuickAuthorizeInput').value = '';
                renderDevStudentsList();
                updateDevKeyFinder(em);
                alert(`✔ Alumno ${em} autorizado con éxito.\nCódigo de acceso: ${computeAccessCode(em)}\nCódigo VIP Excel: ${computeExcelVipCode(em)}`);
            }
        };

        // Modal Excel VIP
        document.getElementById('btnCloseExcelVipNotice').onclick = hideExcelVipNotice;
        document.getElementById('btnUnlockExcelWithVipCode').onclick = () => {
            const code = (document.getElementById('inputExcelVipCode').value || '').trim();
            const session = getSession();
            const targetEmail = session ? session.email : '';
            const errVip = document.getElementById('vipCodeErrorMsg');
            if (verifyExcelVipCode(targetEmail, code)) {
                grantExcelPermission(targetEmail);
                hideExcelVipNotice();
                alert('✔ Permiso de descarga Excel (.xlsx) canjeado con éxito. Ya puedes descargar la plantilla.');
            } else {
                errVip.textContent = '❌ Código VIP no válido. Solicítalo al Ing. Ulianov Cuba.';
                errVip.style.display = 'block';
            }
        };
        document.getElementById('btnRequestExcelVip').onclick = () => {
            requestExcelPermission();
            const btn = document.getElementById('btnRequestExcelVip');
            btn.disabled = true;
            btn.textContent = '✔ Solicitud Enviada';
            document.getElementById('excelVipConfirmMsg').style.display = 'block';
        };
    }

    // ── RENDERIZADO PRIVADO EN PANEL DE DESARROLLADOR ────────────
    function renderDevStudentsList() {
        const container = document.getElementById('devStudentsListContainer');
        const countEl = document.getElementById('devTotalStudentsCount');
        if (!container) return;

        const students = getRegisteredStudents();
        if (countEl) countEl.textContent = String(students.length);

        if (students.length === 0) {
            container.innerHTML = `<div style="padding: 14px; text-align: center; color: #94a3b8; font-size: 11.5px;">Aún no hay alumnos registrados en este navegador.</div>`;
            return;
        }

        container.innerHTML = students.map((acc) => {
            const isOwner = acc.email === 'ulianov.continental@gmail.com';
            const banned = isUserBanned(acc.email);
            const auth = isUserAuthorized(acc.email) || isOwner;
            const hasExcel = hasExcelPermission(acc.email) || isOwner;
            const code = computeAccessCode(acc.email);
            const vip = computeExcelVipCode(acc.email);

            return `
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 7px 10px; border-bottom: 1px solid rgba(255,255,255,0.06); font-size: 11.5px; background: ${banned ? 'rgba(239,68,68,0.1)' : (auth ? 'rgba(16,185,129,0.1)' : 'rgba(245,158,11,0.1)')};">
                    <div style="flex: 1; overflow: hidden; margin-right: 8px;">
                        <div style="display: flex; align-items: center; gap: 6px;">
                            <strong style="color: #ffffff;">${acc.name || acc.email.split('@')[0]}</strong>
                            <span style="font-size: 10px; padding: 1px 6px; border-radius: 99px; font-weight: 800; background: ${banned ? 'rgba(239,68,68,0.2); color:#f87171;' : (auth ? 'rgba(16,185,129,0.2); color:#34d399;' : 'rgba(245,158,11,0.2); color:#fbbf24;')}">
                                ${banned ? '🚫 BANEADO' : (auth ? '🟢 ACTIVO' : '⏳ PENDIENTE')}
                            </span>
                            ${hasExcel ? `<span style="font-size: 10px; background:rgba(56,189,248,0.2); color:#38bdf8; padding:1px 5px; border-radius:4px; font-weight:800;">⭐ EXCEL ON</span>` : ''}
                        </div>
                        <div style="font-family: monospace; color: #38bdf8; font-size: 11px;">${acc.email}</div>
                        <div style="font-size: 10.5px; color: #94a3b8;">
                            🔑 Código: <strong style="color:#00D2B5;">${code}</strong> • VIP: <strong style="color:#38bdf8;">${vip}</strong>
                        </div>
                    </div>

                    ${!isOwner ? `
                        <div style="display: flex; gap: 4px; flex-shrink: 0; flex-wrap: wrap;">
                            ${!auth ? `
                                <button data-email="${acc.email}" class="btn-dev-auth" style="background: #10b981; color: #fff; border: none; border-radius: 5px; padding: 4px 8px; font-size: 10.5px; font-weight: 800; cursor: pointer;">✔ Dar Acceso</button>
                            ` : `
                                <button data-email="${acc.email}" class="btn-dev-revoke" style="background: #334155; color: #cbd5e1; border: none; border-radius: 5px; padding: 4px 8px; font-size: 10.5px; font-weight: 700; cursor: pointer;">Pausar</button>
                            `}
                            <button data-code="${code}" data-email="${acc.email}" class="btn-dev-copy-wa" style="background: #25D366; color: #fff; border: none; border-radius: 5px; padding: 4px 8px; font-size: 10.5px; font-weight: 800; cursor: pointer;" title="Copiar mensaje WhatsApp">📲 Copiar</button>
                            ${!banned ? `
                                <button data-email="${acc.email}" class="btn-dev-ban" style="background: #dc2626; color: #fff; border: none; border-radius: 5px; padding: 4px 8px; font-size: 10.5px; font-weight: 800; cursor: pointer;" title="Botar / Banear">🚫 Botar</button>
                            ` : `
                                <button data-email="${acc.email}" class="btn-dev-unban" style="background: #0284c7; color: #fff; border: none; border-radius: 5px; padding: 4px 8px; font-size: 10.5px; font-weight: 800; cursor: pointer;">🔄 Admitir</button>
                            `}
                        </div>
                    ` : `<span style="font-size: 10.5px; font-weight: 800; color: #10b981;">👑 Creador</span>`}
                </div>
            `;
        }).join('');

        container.querySelectorAll('.btn-dev-auth').forEach(b => {
            b.onclick = () => {
                authorizeUser(b.dataset.email, null, true);
                renderDevStudentsList();
                updateDevKeyFinder(b.dataset.email);
            };
        });
        container.querySelectorAll('.btn-dev-revoke').forEach(b => {
            b.onclick = () => {
                revokeUser(b.dataset.email);
                renderDevStudentsList();
            };
        });
        container.querySelectorAll('.btn-dev-copy-wa').forEach(b => {
            b.onclick = () => {
                const em = b.dataset.email;
                const cd = b.dataset.code;
                const msg = `Hola! Tu código personal para CEREBRO ESTRUCTURAL PRO (Armaduras y Vigas) es:\n🔑 CÓDIGO: ${cd}\n(Correo: ${em})\nIngrésalo en la web para ingresar y descargar la plantilla Excel. Ing. Ulianov Cuba`;
                copyToClipboard(msg, `✔ Mensaje copiado:\n\n${msg}`);
            };
        });
        container.querySelectorAll('.btn-dev-ban').forEach(b => {
            b.onclick = () => {
                if (confirm(`¿Botar / Banear a ${b.dataset.email}?`)) {
                    banUser(b.dataset.email);
                    renderDevStudentsList();
                }
            };
        });
        container.querySelectorAll('.btn-dev-unban').forEach(b => {
            b.onclick = () => {
                unbanUser(b.dataset.email);
                renderDevStudentsList();
            };
        });
    }

    function updateDevKeyFinder(query) {
        const resultsEl = document.getElementById('devKeyFinderResults');
        if (!resultsEl) return;
        const inputEl = document.getElementById('devKeyFinderInput');
        const email = (query !== undefined ? query : (inputEl ? inputEl.value : '')).trim().toLowerCase();

        if (!email) {
            resultsEl.innerHTML = `<div style="font-size: 11px; color: #94a3b8; text-align: center;">Escribe arriba el correo para consultar su código y copiar el mensaje para WhatsApp.</div>`;
            return;
        }

        const accessKey = computeAccessCode(email);
        const vipKey = computeExcelVipCode(email);
        const isAuth = isUserAuthorized(email);

        resultsEl.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 6px;">
                <div>
                    <div style="font-size: 11.5px; font-weight: 800; color: #ffffff; font-family: monospace;">${email}</div>
                    <div style="font-size: 13.5px; font-weight: 900; color: #38bdf8; font-family: monospace;">
                        🔑 Código: <span style="color:#00D2B5;">${accessKey}</span> &nbsp;|&nbsp; ⭐ VIP: ${vipKey}
                    </div>
                </div>
                <div style="display: flex; gap: 4px;">
                    <button type="button" id="btnCopyCalcKey" class="liquid-btn-primary-dark" style="width: auto; padding: 5px 10px; font-size: 10.5px; background: #25D366;">
                        📲 Copiar WhatsApp
                    </button>
                    <button type="button" id="btnDirectAuthCalc" class="liquid-btn-primary-dark" style="width: auto; padding: 5px 10px; font-size: 10.5px; background: #10b981;">
                        ${isAuth ? '✔ Ya Activo' : '⚡ Activar'}
                    </button>
                </div>
            </div>
        `;

        resultsEl.querySelector('#btnCopyCalcKey').onclick = () => {
            const msg = `Hola! Tu código personal para CEREBRO ESTRUCTURAL PRO (Armaduras y Vigas) es:\n🔑 CÓDIGO: ${accessKey}\n(Correo: ${email})\nIngrésalo en la web para ingresar y descargar la plantilla Excel. Ing. Ulianov Cuba`;
            copyToClipboard(msg, `✔ Mensaje copiado:\n\n${msg}`);
        };
        resultsEl.querySelector('#btnDirectAuthCalc').onclick = () => {
            authorizeUser(email, null, true);
            updateDevKeyFinder(email);
            renderDevStudentsList();
        };
    }

    function renderDevVipGuestCard() {
        const btnToggle = document.getElementById('btnToggleVipGuest');
        const linkInput = document.getElementById('devVipShareLinkInput');
        const isEnabled = isVipGuestEnabled();

        if (linkInput) linkInput.value = generateVipGuestShareUrl();
        if (btnToggle) {
            btnToggle.textContent = isEnabled ? '🔴 Pausar' : '🟢 Activar';
            btnToggle.style.background = isEnabled ? '#ef4444' : '#10b981';
            btnToggle.style.color = '#ffffff';
        }
    }

    // ── VISIBILIDAD DE MODALES ───────────────────────────────────
    function showModal() {
        buildModals();
        const m = document.getElementById('accessLockModal');
        if (m) {
            m.classList.remove('modal-hidden');
            m.style.display = 'flex';
        }
    }

    function hideModal() {
        const m = document.getElementById('accessLockModal');
        if (m) {
            m.classList.add('modal-hidden');
            m.style.display = 'none';
        }
        updateAppHeader();
    }

    function showDevPanel() {
        buildModals();
        renderDevVipGuestCard();
        updateDevKeyFinder('');
        renderDevStudentsList();
        const d = document.getElementById('ownerControlModal');
        if (d) {
            d.classList.remove('modal-hidden');
            d.style.display = 'flex';
        }
    }

    function hideDevPanel() {
        const d = document.getElementById('ownerControlModal');
        if (d) {
            d.classList.add('modal-hidden');
            d.style.display = 'none';
        }
    }

    function showExcelVipNotice() {
        buildModals();
        const v = document.getElementById('modalExcelVipNotice');
        if (v) {
            v.classList.remove('modal-hidden');
            v.style.display = 'flex';
            const msg = document.getElementById('excelVipConfirmMsg');
            if (msg) msg.style.display = 'none';
            const btn = document.getElementById('btnRequestExcelVip');
            if (btn) {
                btn.disabled = false;
                btn.textContent = '📩 Solicitar Permiso de Excel al Ing. Ulianov';
            }
        }
    }

    function hideExcelVipNotice() {
        const v = document.getElementById('modalExcelVipNotice');
        if (v) {
            v.classList.add('modal-hidden');
            v.style.display = 'none';
        }
    }

    function updateAppHeader() {
        const session = getSession();
        const authOk = isAuthorized();

        const btnOwnerPanel = document.getElementById('btnOwnerPanel');
        if (btnOwnerPanel) {
            btnOwnerPanel.style.display = (authOk && session && session.role === 'owner') ? 'inline-flex' : 'none';
            btnOwnerPanel.onclick = showDevPanel;
        }

        const btnRelock = document.getElementById('btnRelock');
        if (btnRelock) btnRelock.onclick = logoutSession;

        const userBadge = document.getElementById('activeUserHeaderBadge');
        if (userBadge) {
            if (authOk && session) {
                userBadge.textContent = session.role === 'owner'
                    ? '👑 Ing. Ulianov Cuba (Admin)'
                    : `👤 ${session.name || session.email}`;
            } else {
                userBadge.textContent = '🔒 Sin sesión';
            }
        }
    }

    function init() {
        checkVipGuestUrl();
        buildModals();
        updateAppHeader();
        if (isAuthorized()) {
            hideModal();
        } else {
            showModal();
        }
        checkUrlForSharedPayloads();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    window.CerebroAuth = {
        isAuthorized,
        hasExcelPermission,
        grantExcelPermission,
        revokeExcelPermission,
        computeAccessCode,
        computeExcelVipCode,
        verifyAccessCode,
        verifyExcelVipCode,
        authorizeUser,
        banUser,
        unbanUser,
        showExcelVipNotice,
        hideExcelVipNotice,
        openDevPanel: showDevPanel,
        getSession,
        lock: logoutSession
    };
})();
