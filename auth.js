/**
 * auth.js - CEREBRO ESTRUCTURAL v4.0 (Edición Vigas — Plantilla Ulianov)
 * Entorno Claro (Fondo Claro y Letras Negras Nítidas)
 * - Control de Acceso con Google Sign-In
 * - Apoyo al Proyecto de Revisión de Ejercicios vía Yape S/ 15.00 al 933 685 462 (ULIANOV CUBA)
 * - Directorio Público de Integrantes Registrados: Todos pueden ver a todos los miembros,
 *   votar en tiempo real, y Ulianov puede botar/banear a quien quiera cuando le dé la gana.
 * - Gestor y Evaluador de Proyectos de Vigas (#viga=...) y Control Maestro del Desarrollador.
 *
 * Desarrollado por: Ing. Ulianov Cuba Valencia
 * Contraseña Maestra: Vayolett1404
 */

(function () {
    'use strict';

    // ── CONSTANTES GLOBALES Y SEGURIDAD ─────────────────────────
    const MASTER_PASSWORDS = ['Vayolett1404', 'vayolett1404', 'VAYOLETT1404'];
    const CRYPTO_SALT = 'CYBORG_ULIANOV_V21_MASTER_SALT_2026';
    const NOTIFICATION_EMAIL = 'ulianov.continental@gmail.com';

    // Datos oficiales de Yape v4.0
    const YAPE_AMOUNT = 'S/ 15.00';
    const YAPE_NUMBER = '933685462';
    const YAPE_NUMBER_FMT = '933 685 462';
    const YAPE_HOLDER = 'ULIANOV CUBA';
    const YAPE_CONCEPT = 'Apoyo al Proyecto de Revisión de Ejercicios';

    // Claves de almacenamiento local (compatibles y extendidas para v4.0)
    const KEY_SESSION         = 'cerebro_auth_session_v40';
    const KEY_WHITELIST       = 'cerebro_authorized_users_v21';
    const KEY_PENDING         = 'cerebro_pending_requests_v21';
    const KEY_BANNED          = 'cerebro_banned_users_v21';
    const KEY_PROJECTS        = 'cerebro_beam_projects_v40';
    const KEY_GOOGLE_ACCOUNTS = 'cerebro_real_google_accounts_v21';
    const KEY_DEVICE_ID       = 'cerebro_device_id_v21';
    const KEY_EXCEL_WHITELIST = 'cerebro_excel_authorized_users_v21';
    const KEY_EXCEL_REQUESTS  = 'cerebro_excel_requests_v21';
    const KEY_COMMUNITY       = 'cerebro_community_members_v40';
    const KEY_VOTES           = 'cerebro_community_votes_v40';

    // Control de Acceso de Invitado VIP para el Docente / Ingeniero
    const KEY_VIP_GUEST_ENABLED = 'cerebro_vip_guest_enabled_v21';
    const KEY_VIP_GUEST_TOKEN   = 'cerebro_vip_guest_token_v21';
    const KEY_VIP_GUEST_NAME    = 'cerebro_vip_guest_name_v21';
    const KEY_VIP_GUEST_EMAIL   = 'cerebro_vip_guest_email_v21';

    const DEFAULT_VIP_TOKEN = 'DOCENTE_VIP_ULIANOV';
    const DEFAULT_VIP_NAME  = 'Ing. Ulianov Cuba (Docente Invitado VIP)';
    const DEFAULT_VIP_EMAIL = 'docente.vip@continental.edu.pe';

    let myDeviceId = localStorage.getItem(KEY_DEVICE_ID);
    if (!myDeviceId) {
        myDeviceId = 'dev_' + Math.random().toString(36).substring(2) + Date.now();
        localStorage.setItem(KEY_DEVICE_ID, myDeviceId);
    }

    const sessionChannel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('cerebro_session_sync_v4') : null;

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

    // ── DIRECTORIO COMUNITARIO DE INTEGRANTES Y VOTACIÓN / EXPULSIÓN ──
    function getCommunityMembers() {
        let members = getStoredJSON(KEY_COMMUNITY, null);
        if (!members || !Array.isArray(members)) {
            members = [
                {
                    email: 'ulianov.continental@gmail.com',
                    name: 'Ing. Ulianov Cuba Valencia (Creador)',
                    role: 'owner',
                    joinedAt: 'Fundador del Proyecto',
                    status: 'ACTIVE',
                    votesAgainst: []
                }
            ];
            setStoredJSON(KEY_COMMUNITY, members);
        }
        // Sincronizar con usuarios autorizados y cuentas de Google detectadas
        const authList = getAuthorizedUsers();
        const bannedList = getBannedUsers();
        let changed = false;

        authList.forEach(em => {
            const clean = em.trim().toLowerCase();
            if (!members.find(m => m.email === clean)) {
                members.push({
                    email: clean,
                    name: clean.split('@')[0].toUpperCase(),
                    role: 'student',
                    joinedAt: new Date().toLocaleString(),
                    status: bannedList.includes(clean) ? 'BANNED' : 'ACTIVE',
                    votesAgainst: []
                });
                changed = true;
            }
        });

        members.forEach(m => {
            if (bannedList.includes(m.email) && m.status !== 'BANNED') {
                m.status = 'BANNED';
                changed = true;
            } else if (!bannedList.includes(m.email) && m.status === 'BANNED') {
                m.status = 'ACTIVE';
                changed = true;
            }
            if (!Array.isArray(m.votesAgainst)) m.votesAgainst = [];
        });

        if (changed) setStoredJSON(KEY_COMMUNITY, members);
        return members;
    }

    function registerCommunityMember(email, name, role = 'student', status = 'ACTIVE') {
        if (!email) return;
        const clean = email.trim().toLowerCase();
        const members = getCommunityMembers();
        const existing = members.find(m => m.email === clean);
        if (existing) {
            if (name) existing.name = name;
            if (status) existing.status = status;
            existing.lastSeen = new Date().toLocaleString();
        } else {
            members.push({
                email: clean,
                name: name || clean.split('@')[0].toUpperCase(),
                role: role,
                joinedAt: new Date().toLocaleString(),
                lastSeen: new Date().toLocaleString(),
                status: status,
                votesAgainst: []
            });
        }
        setStoredJSON(KEY_COMMUNITY, members);
    }

    function voteAgainstMember(targetEmail, voterEmail) {
        const cleanTarget = (targetEmail || '').trim().toLowerCase();
        const cleanVoter = (voterEmail || 'anonimo').trim().toLowerCase();
        if (!cleanTarget || cleanTarget === 'ulianov.continental@gmail.com') return { error: 'No se puede votar contra el creador del proyecto.' };

        const members = getCommunityMembers();
        const target = members.find(m => m.email === cleanTarget);
        if (!target) return { error: 'Integrante no encontrado.' };
        if (!Array.isArray(target.votesAgainst)) target.votesAgainst = [];

        const idx = target.votesAgainst.indexOf(cleanVoter);
        let action = 'added';
        if (idx >= 0) {
            target.votesAgainst.splice(idx, 1);
            action = 'removed';
        } else {
            target.votesAgainst.push(cleanVoter);
        }

        setStoredJSON(KEY_COMMUNITY, members);
        return { success: true, action, votesCount: target.votesAgainst.length, target };
    }

    // ── CUENTAS GOOGLE GUARDADAS ─────────────────────────────────
    function getStoredGoogleAccounts() {
        return getStoredJSON(KEY_GOOGLE_ACCOUNTS, []);
    }

    function saveGoogleAccount(email, name, photo) {
        if (!email) return;
        const cleanEmail = email.trim().toLowerCase();
        const cleanName = name || cleanEmail.split('@')[0];
        const avatar = cleanName.charAt(0).toUpperCase();

        const current = getStoredGoogleAccounts();
        const filtered = current.filter(a => a.email.toLowerCase() !== cleanEmail);
        filtered.unshift({
            email: cleanEmail,
            name: cleanName,
            avatar: avatar,
            photo: photo || '',
            lastUsed: new Date().toLocaleString()
        });
        setStoredJSON(KEY_GOOGLE_ACCOUNTS, filtered);
        registerCommunityMember(cleanEmail, cleanName, 'student', isUserBanned(cleanEmail) ? 'BANNED' : (isUserAuthorized(cleanEmail) ? 'ACTIVE' : 'PENDING'));
    }

    // ── WHITELIST, BANEO Y SOLICITUDES ───────────────────────────
    function getAuthorizedUsers() { return getStoredJSON(KEY_WHITELIST, []); }
    function isUserAuthorized(email) {
        if (!email) return false;
        const clean = email.trim().toLowerCase();
        if (isUserBanned(clean)) return false;
        return getAuthorizedUsers().includes(clean);
    }

    function authorizeUser(email, name) {
        const clean = (email || '').trim().toLowerCase();
        if (!clean) return;
        // Quitar de baneados si estaba baneado
        unbanUser(clean, true);
        const list = getAuthorizedUsers();
        if (!list.includes(clean)) {
            list.push(clean);
            setStoredJSON(KEY_WHITELIST, list);
        }
        // En v4.0, al autorizar el acceso con Yape S/ 15.00 también se habilita Excel automáticamente
        grantExcelPermission(clean);
        removePendingRequest(clean);
        registerCommunityMember(clean, name || clean.split('@')[0], 'student', 'ACTIVE');
    }

    function revokeUser(email) {
        const clean = (email || '').trim().toLowerCase();
        const list = getAuthorizedUsers().filter(e => e !== clean);
        setStoredJSON(KEY_WHITELIST, list);
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
        revokeExcelPermission(clean);

        const members = getCommunityMembers();
        const m = members.find(x => x.email === clean);
        if (m) {
            m.status = 'BANNED';
            setStoredJSON(KEY_COMMUNITY, members);
        }

        if (sessionChannel) {
            sessionChannel.postMessage({ type: 'USER_BANNED', email: clean });
        }

        // Si el usuario baneado es el que tiene sesión abierta aquí, cerrarla de inmediato
        const cur = getSession();
        if (cur && cur.email && cur.email.toLowerCase() === clean && cur.role !== 'owner') {
            logoutSession();
        }
    }

    function unbanUser(email, silent) {
        const clean = (email || '').trim().toLowerCase();
        const list = getBannedUsers().filter(e => e !== clean);
        setStoredJSON(KEY_BANNED, list);

        const members = getCommunityMembers();
        const m = members.find(x => x.email === clean);
        if (m) {
            m.status = 'ACTIVE';
            m.votesAgainst = [];
            setStoredJSON(KEY_COMMUNITY, members);
        }
        if (!silent) {
            const authList = getAuthorizedUsers();
            if (!authList.includes(clean)) {
                authList.push(clean);
                setStoredJSON(KEY_WHITELIST, authList);
            }
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
        registerCommunityMember(clean, accountName || clean.split('@')[0], 'student', 'PENDING');
    }

    function removePendingRequest(email) {
        const clean = (email || '').trim().toLowerCase();
        const list = getPendingRequests().filter(p => p.email !== clean);
        setStoredJSON(KEY_PENDING, list);
    }

    // ── PERMISOS DE DESCARGA DE PLANTILLA EXCEL (.XLSX) ──────────
    function getExcelAuthorizedUsers() { return getStoredJSON(KEY_EXCEL_WHITELIST, []); }

    function hasExcelPermission(email) {
        const session = getSession();
        if (session && (session.role === 'owner' || session.role === 'vip_guest')) return true;
        const target = (email || (session ? session.email : '') || '').toLowerCase().trim();
        if (!target) return false;
        // En v4.0 todo usuario autorizado con su aporte de S/ 15.00 tiene derecho a descargar la PLANTILLA ULIANOV (.xlsx)
        if (isUserAuthorized(target)) return true;
        return getExcelAuthorizedUsers().includes(target);
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

    // ── SESIÓN Y ACCESO VIP DOCENTE ──────────────────────────────
    function getSession() {
        return getStoredJSON(KEY_SESSION, null) || getStoredJSON('cerebro_auth_session_v21', null);
    }

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

    function getVipGuestToken() {
        return localStorage.getItem(KEY_VIP_GUEST_TOKEN) || DEFAULT_VIP_TOKEN;
    }

    function setVipGuestToken(token) {
        localStorage.setItem(KEY_VIP_GUEST_TOKEN, (token || DEFAULT_VIP_TOKEN).trim());
    }

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
        authorizeUser(sessionObj.email, sessionObj.name);
        return sessionObj;
    }

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
        setStoredJSON('cerebro_auth_session_v21', sessionObj);
        localStorage.setItem('cerebro_unlocked_v40', 'true');
        if (sessionObj.email) {
            registerCommunityMember(sessionObj.email, sessionObj.name, sessionObj.role || 'student', 'ACTIVE');
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
        localStorage.removeItem('cerebro_auth_session_v21');
        localStorage.removeItem('cerebro_unlocked_v40');
        showModal();
        updateAppHeader();
    }

    if (sessionChannel) {
        sessionChannel.onmessage = (event) => {
            const data = event.data;
            if (!data) return;
            if (data.type === 'VIP_GUEST_TOGGLED') {
                const mySession = getSession();
                if (mySession && mySession.role === 'vip_guest' && !data.enabled) {
                    logoutSession();
                    alert('🔒 El acceso de Invitado VIP ha sido pausado por el Administrador.');
                }
                return;
            }
            const mySession = getSession();
            if (mySession && mySession.role === 'student' && mySession.email === data.email) {
                if (data.type === 'SESSION_STARTED' && data.deviceId && data.deviceId !== myDeviceId) {
                    logoutSession();
                    alert('⚠ SESIÓN CERRADA AUTOMÁTICAMENTE:\n\nTu cuenta ha sido abierta en otro dispositivo o ventana.');
                } else if (data.type === 'USER_BANNED') {
                    logoutSession();
                    alert('🚫 ACCESO REVOCADO:\n\nHas sido expulsado / baneado del proyecto por Ulianov o por votación de la comunidad.');
                }
            }
        };
    }

    // ── GESTIÓN Y EVALUACIÓN DE PROYECTOS DE VIGAS (#viga=...) ───
    function getAllProjects() { return getStoredJSON(KEY_PROJECTS, []); }

    function encodeBeamPayload(data) {
        const json = JSON.stringify(data);
        const bytes = new TextEncoder().encode(json);
        let bin = '';
        for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
        return btoa(bin);
    }

    function decodeBeamPayload(input) {
        if (!input) throw new Error('Entrada vacía');
        if (typeof input === 'object' && (input.bars || input.state)) return input;
        let str = String(input).trim();
        if (str.startsWith('{') && str.endsWith('}')) {
            try { return JSON.parse(str); } catch (e) {}
        }
        if (str.includes('viga=')) str = str.split('viga=')[1];
        else if (str.includes('armadura=')) str = str.split('armadura=')[1];
        str = str.split('&')[0].split('#')[0].trim();
        const bin = atob(str);
        const bytes = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
        const jsonStr = new TextDecoder('utf-8').decode(bytes);
        return JSON.parse(jsonStr);
    }

    function generateBeamShareUrl(proj) {
        const enc = encodeBeamPayload(proj);
        const base = window.location.origin + window.location.pathname;
        return `${base}#viga=${enc}`;
    }

    function generateVipGuestShareUrl(proj) {
        let payload = proj;
        if (!payload && window.CerebroApp && window.CerebroApp.getCurrentState) {
            payload = {
                id: 'viga_vip_' + Date.now().toString(36),
                name: 'Viga Cátedra Ulianov',
                authorEmail: getVipGuestEmail(),
                createdAt: new Date().toLocaleString(),
                state: window.CerebroApp.getCurrentState()
            };
        }
        let base = window.location.origin + window.location.pathname;
        if (!base.startsWith('http')) {
            base = 'https://72008081-pixel.github.io/Ulianov-Continental/';
        }
        const token = getVipGuestToken();
        if (payload) {
            const enc = encodeBeamPayload(payload);
            return `${base}?vip=${encodeURIComponent(token)}#viga=${enc}`;
        }
        return `${base}?vip=${encodeURIComponent(token)}`;
    }

    function evaluateBeamHealth(stateOrProj) {
        const st = (stateOrProj && stateOrProj.state) ? stateOrProj.state : stateOrProj;
        if (!window.BeamSolver || !window.BeamSolver.solveBeam || !st) {
            return { ok: true, status: '🟢 VIGA VÁLIDA', badgeColor: '#16a34a', summary: 'Estructura de viga lista para cálculo.' };
        }
        try {
            const res = window.BeamSolver.solveBeam(st);
            if (!res.success) {
                return {
                    ok: false,
                    status: '🔴 INESTABLE / ERROR',
                    badgeColor: '#dc2626',
                    summary: res.error || 'Falla de estabilidad en apoyos o tramos.'
                };
            }
            const nB = res.numActiveBars || 0;
            const nN = res.numActiveNodes || 0;
            const nFree = res.freeDofs ? res.freeDofs.length : 0;
            const nRest = res.restDofs ? res.restDofs.length : 0;
            return {
                ok: true,
                status: '🟢 SIRVE (ESTABLE)',
                badgeColor: '#16a34a',
                summary: `Viga Estable: ${nN} Nudos, ${nB} Tramos, ${nFree} GDL Libres y ${nRest} Reacciones despejadas sin errores.`
            };
        } catch (e) {
            return {
                ok: false,
                status: '🔴 ERROR DE DATOS',
                badgeColor: '#dc2626',
                summary: e.message
            };
        }
    }

    function saveProject(projectName, stateData) {
        const session = getSession();
        if (!session) throw new Error('Debes iniciar sesión para guardar un ejercicio.');
        const cleanName = (projectName || 'Viga Sin Nombre').trim();
        const list = getAllProjects();
        const newProj = {
            id: 'viga_' + Math.random().toString(36).substring(2, 8) + Date.now(),
            name: cleanName,
            authorEmail: session.email || 'ulianov.continental@gmail.com',
            createdAt: new Date().toLocaleString(),
            state: JSON.parse(JSON.stringify(stateData))
        };
        list.unshift(newProj);
        setStoredJSON(KEY_PROJECTS, list);
        return newProj;
    }

    function getUserProjects() {
        const session = getSession();
        if (!session) return [];
        const all = getAllProjects();
        if (session.role === 'owner' || session.role === 'vip_guest') return all;
        return all.filter(p => p.authorEmail === session.email);
    }

    function deleteProject(projectId) {
        const all = getAllProjects().filter(p => p.id !== projectId);
        setStoredJSON(KEY_PROJECTS, all);
    }

    function importAndLoadBeam(payloadOrUrl, options = {}) {
        try {
            const decoded = decodeBeamPayload(payloadOrUrl);
            const stateObj = decoded.state || decoded;
            if (!stateObj || !Array.isArray(stateObj.bars)) {
                throw new Error('El enlace o archivo no contiene una viga válida.');
            }
            const proj = decoded.state ? decoded : {
                id: 'viga_' + Date.now(),
                name: stateObj.name || 'Viga Importada',
                authorEmail: 'Alumno (Compartido)',
                createdAt: new Date().toLocaleString(),
                state: stateObj
            };

            const list = getAllProjects();
            if (!list.find(p => p.id === proj.id)) {
                list.unshift(proj);
                setStoredJSON(KEY_PROJECTS, list);
            }

            if (window.CerebroApp && window.CerebroApp.loadState) {
                window.CerebroApp.loadState(proj.state);
            }
            if (!options.silent) {
                const health = evaluateBeamHealth(proj.state);
                alert(`📐 Viga Cargada: "${proj.name}"\nEstado: ${health.status}\n${health.summary}`);
            }
            return { success: true, project: proj };
        } catch (err) {
            if (!options.silent) alert('❌ Error al importar viga:\n' + err.message);
            return { success: false, error: err.message };
        }
    }

    // ── DETECCIÓN DE URL VIP Y VIGA COMPARTIDA ───────────────────
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
                alert('🔒 El enlace de Invitado VIP se encuentra temporalmente pausado por el Administrador.');
                return false;
            }
            loginAsVipGuest();
            return true;
        }
        return false;
    }

    function checkUrlForSharedBeam() {
        const raw = getUrlParameter('viga') || getUrlParameter('armadura');
        if (raw) {
            setTimeout(() => {
                try {
                    const proj = decodeBeamPayload(raw);
                    if (proj && (proj.state || proj.bars)) {
                        importAndLoadBeam(proj, { silent: true });
                    }
                } catch (e) {}
            }, 350);
        }
    }

    async function sendNotificationEmail(studentEmail, studentName, generatedCode) {
        const payload = {
            _subject: `🔔 Apoyo Yape ${YAPE_AMOUNT}: ${studentEmail} - CEREBRO ESTRUCTURAL v4.0 (Vigas)`,
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

    // ── ESTILOS EN ENTORNO CLARO (FONDO CLARO Y LETRAS NEGRAS) ──
    const styleSheet = document.createElement('style');
    styleSheet.id = 'cerebro-light-auth-styles-v4';
    styleSheet.textContent = `
        #accessLockModal, #ownerControlModal, #projectsManagerModal, #communityMembersModal, #modalExcelVipNotice {
            position: fixed;
            inset: 0;
            z-index: 999999;
            background: rgba(241, 245, 249, 0.88);
            backdrop-filter: blur(14px);
            -webkit-backdrop-filter: blur(14px);
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 16px;
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            color: #0f172a;
        }

        .modal-hidden {
            opacity: 0 !important;
            visibility: hidden !important;
            pointer-events: none !important;
            display: none !important;
        }

        .light-modal-card {
            background: #ffffff;
            border: 2px solid #cbd5e1;
            border-radius: 20px;
            max-width: 510px;
            width: 100%;
            padding: 26px 24px;
            box-shadow: 0 20px 50px rgba(15, 23, 42, 0.14), 0 4px 12px rgba(15, 23, 42, 0.06);
            color: #0f172a;
            text-align: center;
            position: relative;
            max-height: 92vh;
            overflow-y: auto;
        }

        .light-input {
            width: 100%;
            background: #f8fafc;
            border: 1.5px solid #94a3b8;
            border-radius: 10px;
            padding: 11px 14px;
            font-size: 13.5px;
            color: #0f172a;
            font-weight: 600;
            font-family: inherit;
            outline: none;
            transition: all 0.18s ease;
            box-sizing: border-box;
            margin-bottom: 6px;
        }

        .light-input:focus {
            background: #ffffff;
            border-color: #2563eb;
            box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.18);
        }

        .light-btn-primary {
            width: 100%;
            background: #2563eb;
            color: #ffffff;
            font-size: 13.5px;
            font-weight: 800;
            padding: 12px 16px;
            border: none;
            border-radius: 10px;
            cursor: pointer;
            box-shadow: 0 4px 12px rgba(37, 99, 235, 0.25);
            transition: all 0.15s ease;
            box-sizing: border-box;
        }

        .light-btn-primary:hover {
            background: #1d4ed8;
            transform: translateY(-1px);
        }

        .btn-google-light {
            width: 100%;
            background: #ffffff;
            color: #0f172a;
            font-size: 14px;
            font-weight: 800;
            padding: 12px 16px;
            border: 2px solid #cbd5e1;
            border-radius: 12px;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 10px;
            box-shadow: 0 2px 6px rgba(15, 23, 42, 0.06);
            transition: all 0.15s ease;
            box-sizing: border-box;
            margin-top: 8px;
        }

        .btn-google-light:hover {
            background: #f1f5f9;
            border-color: #2563eb;
        }

        .detected-account-card-light {
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 9px 12px;
            background: #f8fafc;
            border: 1.5px solid #cbd5e1;
            border-radius: 12px;
            cursor: pointer;
            transition: all 0.15s ease;
            margin-bottom: 6px;
            text-align: left;
        }

        .detected-account-card-light:hover {
            background: #eff6ff;
            border-color: #2563eb;
        }

        .domain-chip-light {
            background: #f1f5f9;
            border: 1px solid #cbd5e1;
            border-radius: 99px;
            padding: 4px 10px;
            font-size: 11px;
            font-weight: 700;
            color: #334155;
            cursor: pointer;
        }

        .domain-chip-light:hover {
            background: #dbeafe;
            border-color: #2563eb;
            color: #1d4ed8;
        }

        .yape-box-light {
            background: #faf5ff;
            border: 2px solid #9333ea;
            border-radius: 14px;
            padding: 14px;
            margin-bottom: 12px;
            text-align: left;
            color: #1e1b4b;
        }

        .member-row-light {
            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: 10px;
            padding: 10px 12px;
            background: #f8fafc;
            border: 1.5px solid #cbd5e1;
            border-radius: 12px;
            margin-bottom: 8px;
            flex-wrap: wrap;
        }
    `;
    document.head.appendChild(styleSheet);

    let currentSelectedAccount = null;

    function buildModals() {
        if (document.getElementById('accessLockModal')) return;

        // 1. MODAL DE ACCESO (FONDO CLARO + YAPE S/ 15.00 AL 933685462 ULIANOV CUBA)
        const mainModal = document.createElement('div');
        mainModal.id = 'accessLockModal';
        mainModal.className = 'modal-hidden';
        mainModal.innerHTML = `
            <div class="light-modal-card">
                <!-- ══ VISTA 1: INICIO CON CUENTA GOOGLE ══ -->
                <div id="viewGoogleChooser" style="display: block;">
                    <div style="display: inline-flex; align-items: center; gap: 8px; background: #eff6ff; border: 1px solid #bfdbfe; padding: 5px 14px; border-radius: 99px; margin-bottom: 10px;">
                        <svg width="20" height="20" viewBox="0 0 48 48">
                            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                            <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.28-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.79l7.97-6.2z"/>
                            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                        </svg>
                        <span style="font-size: 12.5px; font-weight: 800; color: #1e40af;">Acceso Académico con Google</span>
                    </div>

                    <h2 style="font-size: 19px; font-weight: 900; color: #0f172a; margin: 0 0 4px;">
                        CEREBRO ESTRUCTURAL <span style="background: #fef08a; color: #0f172a; padding: 2px 8px; border-radius: 6px; font-size: 13px; border: 1px solid #eab308;">v4.0 VIGAS</span>
                    </h2>
                    <p style="font-size: 12px; color: #334155; font-weight: 600; margin: 0 0 14px;">
                        Plantilla Maestra de Vigas (12 Nudos y 11 Barras) — Ing. Ulianov Cuba
                    </p>

                    <div id="detectedAccountsWrap" style="display: none; margin-bottom: 10px; text-align: left;">
                        <div style="font-size: 11.5px; font-weight: 800; color: #334155; margin-bottom: 6px;">
                            👤 Cuentas registradas en este navegador:
                        </div>
                        <div id="detectedAccountsList"></div>
                    </div>

                    <div style="text-align: left; margin-bottom: 8px;">
                        <label style="font-size: 12px; font-weight: 800; color: #0f172a; display: block; margin-bottom: 4px;">
                            Correo de Google o Institucional:
                        </label>
                        <input type="email" id="userGoogleEmailInput" class="light-input" placeholder="ejemplo@continental.edu.pe o @gmail.com" autocomplete="email">
                        <div style="display: flex; gap: 6px; margin-top: 4px; justify-content: center; align-items: center;">
                            <span style="font-size: 11px; color: #475569; font-weight: 600;">Autocompletar:</span>
                            <button type="button" class="domain-chip-light" data-domain="@continental.edu.pe">@continental.edu.pe</button>
                            <button type="button" class="domain-chip-light" data-domain="@gmail.com">@gmail.com</button>
                        </div>
                    </div>

                    <div style="text-align: left; margin-bottom: 8px;">
                        <label style="font-size: 12px; font-weight: 800; color: #0f172a; display: block; margin-bottom: 4px;">
                            Nombre y Apellido (visible en la lista de integrantes):
                        </label>
                        <input type="text" id="userFullNameInput" class="light-input" placeholder="Tu Nombre y Apellido (Opcional)">
                    </div>

                    <label style="display: flex; align-items: flex-start; gap: 8px; text-align: left; font-size: 11.5px; color: #334155; background: #f8fafc; padding: 8px 10px; border-radius: 8px; border: 1px solid #cbd5e1; margin-bottom: 8px; cursor: pointer;">
                        <input type="checkbox" id="chkTermsAndConditions" checked style="margin-top: 2px; width: 16px; height: 16px; accent-color: #2563eb;">
                        <span>Acepto participar en el <strong>Proyecto de Revisión de Ejercicios de Vigas</strong> y figurar en el directorio de integrantes.</span>
                    </label>

                    <div id="termsErrorMsg" style="display:none; color:#dc2626; font-size:11.5px; font-weight:800; margin-bottom:8px;">
                        ⚠ Debes aceptar las condiciones para continuar.
                    </div>

                    <button id="btnConfirmGoogleAccount" class="btn-google-light">
                        <svg width="20" height="20" viewBox="0 0 48 48">
                            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                            <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.28-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.79l7.97-6.2z"/>
                            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                        </svg>
                        <span>Continuar con cuenta de Google</span>
                    </button>

                    <div style="margin-top: 14px; border-top: 1px solid #e2e8f0; padding-top: 10px; display: flex; justify-content: space-between; align-items: center;">
                        <span id="linkOpenMembersFromLogin" style="font-size: 11.5px; font-weight: 700; color: #2563eb; cursor: pointer; text-decoration: underline;">
                            👥 Ver Integrantes Registrados
                        </span>
                        <span id="linkDevAccess" style="font-size: 11.5px; font-weight: 700; color: #475569; cursor: pointer;">
                            ⚙️ Acceso Ulianov (Admin)
                        </span>
                    </div>
                </div>

                <!-- ══ VISTA 2: APOYO YAPE S/ 15.00 AL 933685462 (ULIANOV CUBA) ══ -->
                <div id="viewYapePaywall" style="display: none;">
                    <div style="display: inline-flex; align-items: center; gap: 8px; background: #742284; color: #ffffff; padding: 6px 16px; border-radius: 99px; font-weight: 900; font-size: 13px; margin-bottom: 8px;">
                        <span>💜 APOYO YAPE:</span>
                        <span style="background: #00D2B5; color: #0f172a; padding: 2px 8px; border-radius: 99px; font-size: 14px;">S/ 15.00</span>
                    </div>

                    <h3 style="font-size: 16px; font-weight: 900; color: #0f172a; margin: 0 0 4px;">
                        Apoyo al Proyecto de Revisión de Ejercicios
                    </h3>
                    <p style="font-size: 11.5px; color: #334155; margin: 0 0 10px;">
                        Incluye resolución matricial de vigas, <strong>6° Gráfica Final en PNG</strong> y descarga de la <strong>PLANTILLA ULIANOV en Excel (.xlsx)</strong>.
                    </p>

                    <div style="background: #f1f5f9; border: 1.5px solid #cbd5e1; border-radius: 10px; padding: 8px 12px; margin-bottom: 10px; text-align: left; display: flex; justify-content: space-between; align-items: center;">
                        <div>
                            <div style="font-size: 10.5px; color: #475569; font-weight: 700;">Cuenta de participante:</div>
                            <div id="lblActiveStudentEmail" style="font-size: 12.5px; font-family: monospace; font-weight: 800; color: #1d4ed8;"></div>
                        </div>
                        <span style="font-size: 10.5px; font-weight: 800; color: #b45309; background: #fef3c7; padding: 3px 8px; border-radius: 99px; border: 1px solid #f59e0b;">
                            ⏳ Por Activar
                        </span>
                    </div>

                    <div class="yape-box-light">
                        <div style="font-size: 12px; font-weight: 900; color: #581c87; margin-bottom: 6px;">
                            📲 DATOS OFICIALES DE YAPE (APOYO AL PROYECTO):
                        </div>
                        <div style="display: grid; grid-template-columns: 1fr auto; gap: 6px; align-items: center; background: #ffffff; border: 1.5px solid #d8b4fe; border-radius: 10px; padding: 8px 12px; margin-bottom: 8px;">
                            <div>
                                <div style="font-size: 11px; color: #6b21a8; font-weight: 700;">Número Yape:</div>
                                <div style="font-size: 18px; font-weight: 900; color: #0f172a; font-family: monospace; letter-spacing: 0.5px;">933 685 462</div>
                                <div style="font-size: 11.5px; font-weight: 800; color: #15803d;">A nombre de: <strong>ULIANOV CUBA</strong></div>
                                <div style="font-size: 11px; font-weight: 700; color: #7e22ce;">Monto único de apoyo: <strong>S/ 15.00 (15 soles)</strong></div>
                            </div>
                            <button type="button" id="btnCopyYapeNumber" style="background: #742284; color: #ffffff; border: none; border-radius: 8px; padding: 8px 10px; font-size: 11px; font-weight: 800; cursor: pointer;">
                                📋 Copiar<br>933685462
                            </button>
                        </div>
                        <div style="font-size: 11px; color: #334155; line-height: 1.45;">
                            1. Realiza tu apoyo de <strong>S/ 15.00</strong> por Yape al <strong>933 685 462</strong> (<strong>ULIANOV CUBA</strong>).<br>
                            2. Envía tu captura por WhatsApp con el botón verde de abajo y recibe tu código personal <strong>CYB-XXXX-XXXX</strong>.
                        </div>
                    </div>

                    <a id="btnYapeWhatsAppLink" href="https://api.whatsapp.com/send?phone=51933685462" target="_blank" rel="noopener noreferrer" style="display: flex; align-items: center; justify-content: center; gap: 8px; background: #16a34a; color: #ffffff; text-decoration: none; font-size: 12.5px; font-weight: 800; padding: 11px; border-radius: 10px; margin-bottom: 10px; box-shadow: 0 4px 10px rgba(22, 163, 74, 0.25);">
                        <span>📲 Enviar Comprobante Yape (S/ 15.00) al 933 685 462</span>
                    </a>

                    <input type="text" id="accessPassInput" class="light-input" placeholder="Ingresa tu código (Ej. CYB-XXXX-XXXX)" autocomplete="off" style="text-align: center; font-family: monospace; font-size: 15px; font-weight: 900; letter-spacing: 1px; text-transform: uppercase; background: #fef9c3; border-color: #eab308;">
                    <button id="btnUnlockAccess" class="light-btn-primary" style="background: #742284;">
                        🔓 Validar Apoyo y Entrar a la Plataforma
                    </button>

                    <div id="passErrorMsg" style="display:none; color:#b91c1c; font-size:11.5px; font-weight:800; margin-top:8px; background:#fef2f2; border:1.5px solid #f87171; padding:8px; border-radius:8px;"></div>

                    <div style="margin-top: 12px; display: flex; justify-content: space-between; align-items: center;">
                        <span id="linkBackToChooser" style="color: #334155; font-size: 11.5px; font-weight: 700; text-decoration: underline; cursor: pointer;">⬅ Cambiar correo</span>
                        <span id="linkDevAccess2" style="color: #475569; font-size: 11.5px; font-weight: 700; cursor: pointer;">⚙️ Ulianov Admin</span>
                    </div>
                </div>

                <!-- ══ VISTA 3: ACCESO ADMINISTRADOR ULIANOV ══ -->
                <div id="viewDeveloperAccess" style="display: none;">
                    <div style="font-size: 32px; margin-bottom: 4px;">👑</div>
                    <h3 style="font-size: 17px; font-weight: 900; color: #0f172a; margin: 0 0 4px;">
                        Acceso Maestro — Ing. Ulianov Cuba
                    </h3>
                    <p style="font-size: 12px; color: #475569; margin-bottom: 12px;">
                        Ingresa tu clave maestra para gestionar integrantes, generar códigos CYB/VIP y expulsar/banear en cualquier momento.
                    </p>
                    <input type="password" id="ownerMasterPassInput" class="light-input" placeholder="Contraseña maestra de Ulianov..." autocomplete="off">
                    <button id="btnOwnerLogin" class="light-btn-primary">
                        ⚡ Ingresar como Ulianov (Administrador)
                    </button>
                    <div id="ownerErrorMsg" style="display:none; color:#dc2626; font-size:12px; font-weight:800; margin-top:6px;"></div>
                    <div style="margin-top: 12px;">
                        <span id="linkBackFromDev" style="color: #2563eb; font-size: 12px; font-weight: 700; text-decoration: underline; cursor: pointer;">⬅ Volver al inicio</span>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(mainModal);

        // 2. MODAL DE COMUNIDAD E INTEGRANTES (VER A TODOS Y VOTAR / BOTAR A QUIEN QUIERA)
        const commModal = document.createElement('div');
        commModal.id = 'communityMembersModal';
        commModal.className = 'modal-hidden';
        commModal.innerHTML = `
            <div class="light-modal-card" style="max-width: 660px; text-align: left;">
                <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px; margin-bottom: 12px;">
                    <div>
                        <h3 style="font-size: 17px; font-weight: 900; color: #0f172a; margin: 0;">
                            👥 Directorio de Integrantes y Votación / Expulsión
                        </h3>
                        <span style="font-size: 11.5px; color: #475569; font-weight: 600;">
                            Todos los registrados pueden verse aquí. Vota o expulsa/banea integrantes en cualquier momento.
                        </span>
                    </div>
                    <button id="btnCloseCommunityModal" style="background: #f1f5f9; border: 1px solid #cbd5e1; color: #0f172a; border-radius: 8px; width: 32px; height: 32px; font-size: 16px; font-weight: 900; cursor: pointer;">✕</button>
                </div>

                <!-- Barra para añadir o buscar participante rápidamente -->
                <div style="background: #f8fafc; border: 1.5px solid #cbd5e1; border-radius: 12px; padding: 10px 12px; margin-bottom: 12px;">
                    <div style="font-size: 11.5px; font-weight: 800; color: #0f172a; margin-bottom: 6px;">
                        ➕ Añadir / Registrar Integrante al Directorio:
                    </div>
                    <div style="display: flex; gap: 6px; flex-wrap: wrap;">
                        <input type="email" id="commAddEmailInput" class="light-input" placeholder="correo@continental.edu.pe" style="flex: 1; min-width: 180px; margin: 0; padding: 8px 10px; font-size: 12px;">
                        <input type="text" id="commAddNameInput" class="light-input" placeholder="Nombre del integrante" style="flex: 1; min-width: 140px; margin: 0; padding: 8px 10px; font-size: 12px;">
                        <button type="button" id="btnCommAddMember" class="light-btn-primary" style="width: auto; padding: 8px 14px; font-size: 12px;">
                            + Añadir a la Lista
                        </button>
                    </div>
                </div>

                <!-- Lista de todos los integrantes -->
                <div style="font-size: 12px; font-weight: 800; color: #1e40af; margin-bottom: 6px; display: flex; justify-content: space-between; align-items: center;">
                    <span>📋 Lista Completa de Integrantes (<span id="commTotalCount">0</span>):</span>
                    <span id="commAdminModeBadge" style="font-size: 11px; padding: 2px 8px; border-radius: 99px; background: #fef08a; color: #854d0e; border: 1px solid #eab308;"></span>
                </div>
                <div id="communityMembersListContainer" style="max-height: 340px; overflow-y: auto; padding-right: 4px;"></div>

                <div style="margin-top: 12px; border-top: 1.5px solid #e2e8f0; padding-top: 10px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;">
                    <span style="font-size: 11px; color: #475569;">
                        💡 Con <strong>🗳️ Votar</strong> sumas votos de expulsión. Con <strong>🚫 Botar / Banear</strong> lo expulsas de inmediato.
                    </span>
                    <button type="button" id="btnCommOpenAdminPanel" style="background: #0f172a; color: #ffffff; border: none; border-radius: 8px; padding: 6px 12px; font-size: 11.5px; font-weight: 800; cursor: pointer;">
                        👑 Panel Maestro Ulianov
                    </button>
                </div>
            </div>
        `;
        document.body.appendChild(commModal);

        // 3. MODAL DEL PANEL DE DESARROLLADOR (MODO CLARO)
        const devModal = document.createElement('div');
        devModal.id = 'ownerControlModal';
        devModal.className = 'modal-hidden';
        devModal.innerHTML = `
            <div class="light-modal-card" style="max-width: 650px; text-align: left;">
                <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px; margin-bottom: 12px;">
                    <div>
                        <h3 style="font-size: 17px; font-weight: 900; color: #0f172a; margin: 0;">👑 Panel Maestro — Ing. Ulianov Cuba (v4.0)</h3>
                        <span style="font-size: 11.5px; color: #475569; font-weight: 600;">Generador de Códigos Yape (S/ 15.00), Enlace VIP Docente y Expulsión Directa</span>
                    </div>
                    <button id="btnCloseDevPanel" style="background: #f1f5f9; border: 1px solid #cbd5e1; color: #0f172a; border-radius: 8px; width: 32px; height: 32px; font-size: 16px; font-weight: 900; cursor: pointer;">✕</button>
                </div>

                <!-- Generador de Claves en Vivo -->
                <div style="background: #eff6ff; border: 2px solid #3b82f6; border-radius: 12px; padding: 12px; margin-bottom: 12px;">
                    <div style="font-size: 12.5px; font-weight: 900; color: #1e40af; margin-bottom: 4px;">
                        🔑 GENERADOR INSTANTÁNEO DE CÓDIGOS DE ACCESO (YAPE S/ 15.00 — 933 685 462)
                    </div>
                    <div style="font-size: 11.5px; color: #334155; margin-bottom: 8px;">
                        Escribe el correo de cualquier compañero para obtener su código exacto <strong>CYB-XXXX-XXXX</strong>:
                    </div>
                    <div style="display: flex; gap: 6px; margin-bottom: 8px;">
                        <input type="text" id="devKeyFinderInput" class="light-input" placeholder="Correo del participante (ej. 76185411@continental.edu.pe)..." style="margin: 0; font-size: 12.5px;">
                        <button id="btnDevKeyFinderClear" type="button" style="background: #ffffff; border: 1.5px solid #cbd5e1; color: #0f172a; border-radius: 8px; padding: 8px 12px; font-size: 11.5px; font-weight: 700; cursor: pointer;">
                            Limpiar
                        </button>
                    </div>
                    <div id="devKeyFinderResults" style="background: #ffffff; border: 1.5px solid #bfdbfe; border-radius: 10px; padding: 10px;"></div>
                </div>

                <!-- Enlace VIP Docente -->
                <div style="background: #f0fdf4; border: 2px solid #16a34a; border-radius: 12px; padding: 12px; margin-bottom: 12px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                        <span style="font-size: 12.5px; font-weight: 900; color: #15803d;">👨‍🏫 ENLACE DIRECTO VIP PARA EL DOCENTE / INGENIERO</span>
                        <span id="devVipStatusBadge" style="font-size: 10.5px; font-weight: 800; padding: 2px 8px; border-radius: 99px;"></span>
                    </div>
                    <div style="display: flex; gap: 6px; margin-bottom: 6px;">
                        <input type="text" id="devVipShareLinkInput" readonly class="light-input" style="margin: 0; font-size: 11px; font-family: monospace; background: #ffffff;">
                        <button id="btnCopyVipShareLink" type="button" class="light-btn-primary" style="width: auto; padding: 8px 12px; font-size: 11.5px; background: #16a34a; white-space: nowrap;">
                            📋 Copiar Link VIP
                        </button>
                        <button id="btnToggleVipGuest" type="button" style="padding: 8px 12px; border-radius: 8px; font-size: 11.5px; font-weight: 800; cursor: pointer; border: none; white-space: nowrap;"></button>
                    </div>
                </div>

                <!-- Autorización rápida y lista de usuarios -->
                <div style="display: flex; gap: 6px; margin-bottom: 8px;">
                    <input type="email" id="devQuickAuthorizeInput" class="light-input" placeholder="Autorizar correo directamente..." style="margin: 0; font-size: 12px;">
                    <button id="btnDevQuickAuthorize" class="light-btn-primary" style="width: auto; padding: 8px 14px; font-size: 12px; white-space: nowrap;">
                        ✔ Autorizar Correo
                    </button>
                </div>
                <div id="devAuthorizedUsersList" style="max-height: 220px; overflow-y: auto; background: #f8fafc; border: 1.5px solid #cbd5e1; border-radius: 10px; padding: 8px;"></div>

                <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1.5px solid #e2e8f0; margin-top: 12px; padding-top: 10px;">
                    <button id="btnDevLogout" style="background: #dc2626; color: #ffffff; border: none; border-radius: 8px; padding: 7px 14px; font-size: 12px; font-weight: 800; cursor: pointer;">
                        🔒 Cerrar Sesión Actual
                    </button>
                    <button id="btnDevOpenCommunity" style="background: #2563eb; color: #ffffff; border: none; border-radius: 8px; padding: 7px 14px; font-size: 12px; font-weight: 800; cursor: pointer;">
                        👥 Ver Todos y Votar / Botar
                    </button>
                </div>
            </div>
        `;
        document.body.appendChild(devModal);

        // 4. MODAL DE PROYECTOS DE VIGAS GUARDADOS
        const projModal = document.createElement('div');
        projModal.id = 'projectsManagerModal';
        projModal.className = 'modal-hidden';
        projModal.innerHTML = `
            <div class="light-modal-card" style="max-width: 580px; text-align: left;">
                <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px; margin-bottom: 12px;">
                    <div>
                        <h3 style="font-size: 16px; font-weight: 900; color: #0f172a; margin: 0;">📂 Ejercicios de Vigas Guardados y Enlaces</h3>
                        <span style="font-size: 11.5px; color: #475569;">Guarda tu viga actual o carga el enlace de un compañero para revisarlo</span>
                    </div>
                    <button id="btnCloseProjModal" style="background: #f1f5f9; border: 1px solid #cbd5e1; color: #0f172a; border-radius: 8px; width: 32px; height: 32px; font-size: 16px; font-weight: 900; cursor: pointer;">✕</button>
                </div>

                <div style="display: flex; gap: 6px; margin-bottom: 10px;">
                    <input type="text" id="inputImportBeamCode" class="light-input" placeholder="Pega aquí un enlace #viga=... para cargarlo y revisarlo" style="margin: 0; font-size: 12px;">
                    <button id="btnExecuteBeamImport" class="light-btn-primary" style="width: auto; padding: 8px 14px; font-size: 12px; white-space: nowrap;">
                        ⚡ Cargar Viga
                    </button>
                </div>

                <div id="myProjectsListContainer" style="max-height: 260px; overflow-y: auto; background: #f8fafc; border: 1.5px solid #cbd5e1; border-radius: 10px; padding: 8px; margin-bottom: 10px;"></div>

                <div style="display: flex; justify-content: flex-end;">
                    <button id="btnNewProjectSavePrompt" class="light-btn-primary" style="width: auto; padding: 8px 16px; font-size: 12.5px; background: #16a34a;">
                        💾 Guardar Ejercicio de Viga Actual
                    </button>
                </div>
            </div>
        `;
        document.body.appendChild(projModal);

        // ── VINCULAR EVENTOS DE MODALES ──────────────────────────────
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
        document.getElementById('linkOpenMembersFromLogin').onclick = () => showCommunityModal();

        document.getElementById('btnCopyYapeNumber').onclick = () => {
            copyToClipboard(YAPE_NUMBER, `✔ Número de Yape copiado: ${YAPE_NUMBER}\nTitular: ${YAPE_HOLDER}\nMonto: ${YAPE_AMOUNT} (${YAPE_CONCEPT})`);
        };

        renderDetectedAccounts();

        document.querySelectorAll('.domain-chip-light').forEach(chip => {
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
                alert('Por favor ingresa tu correo de Google (@continental.edu.pe o @gmail.com).');
                input.focus();
                return;
            }

            const cleanEmail = entered.toLowerCase().trim();
            if (isUserBanned(cleanEmail)) {
                alert('🚫 ACCESO BLOQUEADO:\n\nEsta cuenta ha sido expulsada / baneada del proyecto por Ulianov Cuba o por votación de los integrantes.');
                return;
            }

            const cleanName = (nameInput && nameInput.value.trim()) ? nameInput.value.trim() : cleanEmail.split('@')[0].toUpperCase();
            saveGoogleAccount(cleanEmail, cleanName);
            processStudentLogin(cleanEmail, cleanName);
        };

        function processStudentLogin(email, name) {
            const cleanEmail = email.toLowerCase().trim();
            currentSelectedAccount = { email: cleanEmail, name: name };

            if (isUserAuthorized(cleanEmail)) {
                saveSession({ role: 'student', email: cleanEmail, name: name });
                hideModal();
                return;
            }

            const accessCode = computeAccessCode(cleanEmail);
            addPendingRequest(cleanEmail, accessCode, name);
            sendNotificationEmail(cleanEmail, name, accessCode);

            const lblEmail = document.getElementById('lblActiveStudentEmail');
            if (lblEmail) lblEmail.textContent = `${name} (${cleanEmail})`;

            const waLink = document.getElementById('btnYapeWhatsAppLink');
            if (waLink) {
                const textMsg = encodeURIComponent(`Hola ULIANOV CUBA, envío mi comprobante de Yape de ${YAPE_AMOUNT} al ${YAPE_NUMBER} como Apoyo al Proyecto de Revisión de Ejercicios (Vigas v4.0). Mi correo es: ${cleanEmail}. Por favor bríndame mi código de activación.`);
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
                authorizeUser(currentSelectedAccount.email, currentSelectedAccount.name);
                saveSession({ role: 'student', email: currentSelectedAccount.email, name: currentSelectedAccount.name });
                hideModal();
                updateAppHeader();
                alert(`🎉 ¡Bienvenido, ${currentSelectedAccount.name}!\nTu apoyo al Proyecto de Revisión de Ejercicios fue validado. Tienes acceso total a la gráfica PNG y descarga de la PLANTILLA ULIANOV en Excel (.xlsx).`);
            } else {
                errEl.innerHTML = `❌ Código inválido para <strong>${currentSelectedAccount.email}</strong>.<br>Realiza el apoyo de <strong>${YAPE_AMOUNT}</strong> por Yape al <strong>${YAPE_NUMBER_FMT} (${YAPE_HOLDER})</strong> para recibir tu código.`;
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
            } else {
                errEl.textContent = '❌ Contraseña maestra incorrecta.';
                errEl.style.display = 'block';
            }
        }

        function grantDeveloperAccess() {
            saveSession({ role: 'owner', email: 'ulianov.continental@gmail.com', name: 'Ing. Ulianov Cuba (Creador)' });
            hideModal();
            updateAppHeader();
        }

        // Eventos del Modal de Comunidad / Votación / Expulsión
        document.getElementById('btnCloseCommunityModal').onclick = () => {
            document.getElementById('communityMembersModal').classList.add('modal-hidden');
        };

        document.getElementById('btnCommAddMember').onclick = () => {
            const em = (document.getElementById('commAddEmailInput').value || '').trim().toLowerCase();
            const nm = (document.getElementById('commAddNameInput').value || '').trim();
            if (!em || !em.includes('@')) {
                alert('Ingresa un correo válido para añadir al integrante.');
                return;
            }
            authorizeUser(em, nm || em.split('@')[0].toUpperCase());
            document.getElementById('commAddEmailInput').value = '';
            document.getElementById('commAddNameInput').value = '';
            renderCommunityMembers();
            renderDevUsers();
        };

        document.getElementById('btnCommOpenAdminPanel').onclick = () => {
            const session = getSession();
            if (session && session.role === 'owner') {
                document.getElementById('communityMembersModal').classList.add('modal-hidden');
                showDevPanel();
            } else {
                const pwd = prompt('Ingresa la contraseña maestra de Ulianov Cuba para abrir el Panel Maestro:');
                if (pwd && MASTER_PASSWORDS.includes(pwd.trim())) {
                    saveSession({ role: 'owner', email: 'ulianov.continental@gmail.com', name: 'Ing. Ulianov Cuba (Creador)' });
                    updateAppHeader();
                    document.getElementById('communityMembersModal').classList.add('modal-hidden');
                    showDevPanel();
                } else if (pwd !== null) {
                    alert('❌ Contraseña incorrecta.');
                }
            }
        };

        // Eventos del Panel Desarrollador
        document.getElementById('btnCloseDevPanel').onclick = hideDevPanel;
        document.getElementById('btnDevLogout').onclick = () => {
            hideDevPanel();
            logoutSession();
        };
        document.getElementById('btnDevOpenCommunity').onclick = () => {
            hideDevPanel();
            showCommunityModal();
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
            if (inp && inp.value) copyToClipboard(inp.value, '📋 Enlace VIP para el Docente copiado al portapapeles.');
        };

        document.getElementById('btnDevQuickAuthorize').onclick = () => {
            const em = (document.getElementById('devQuickAuthorizeInput').value || '').trim().toLowerCase();
            if (em && em.includes('@')) {
                authorizeUser(em);
                document.getElementById('devQuickAuthorizeInput').value = '';
                renderDevUsers();
                renderCommunityMembers();
                updateDevKeyFinder(em);
                alert(`✔ Integrante ${em} autorizado.\nCódigo de acceso: ${computeAccessCode(em)}`);
            }
        };

        // Eventos de Proyectos
        document.getElementById('btnCloseProjModal').onclick = () => {
            document.getElementById('projectsManagerModal').classList.add('modal-hidden');
        };
        document.getElementById('btnNewProjectSavePrompt').onclick = promptSaveProject;
        document.getElementById('btnExecuteBeamImport').onclick = () => {
            const code = (document.getElementById('inputImportBeamCode').value || '').trim();
            if (!code) return;
            const res = importAndLoadBeam(code);
            if (res.success) {
                document.getElementById('projectsManagerModal').classList.add('modal-hidden');
            }
        };
    }

    function renderDetectedAccounts() {
        const wrap = document.getElementById('detectedAccountsWrap');
        const listEl = document.getElementById('detectedAccountsList');
        if (!wrap || !listEl) return;

        const accounts = getStoredGoogleAccounts();
        if (accounts.length === 0) {
            wrap.style.display = 'none';
            return;
        }
        wrap.style.display = 'block';
        listEl.innerHTML = accounts.map(acc => {
            const banned = isUserBanned(acc.email);
            const auth = isUserAuthorized(acc.email);
            return `
                <div class="detected-account-card-light" data-email="${acc.email}" data-name="${acc.name}">
                    <div style="width: 34px; height: 34px; border-radius: 50%; background: ${banned ? '#dc2626' : '#2563eb'}; color: #fff; font-weight: 900; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                        ${(acc.name || acc.email).charAt(0).toUpperCase()}
                    </div>
                    <div style="flex: 1; overflow: hidden;">
                        <div style="font-size: 13px; font-weight: 800; color: #0f172a;">${acc.name}</div>
                        <div style="font-size: 11.5px; color: #2563eb; font-family: monospace;">${acc.email}</div>
                    </div>
                    <span style="font-size: 11px; font-weight: 800; color: ${banned ? '#dc2626' : (auth ? '#16a34a' : '#d97706')};">
                        ${banned ? '🚫 Baneado' : (auth ? '✔ Activo ➔' : '⏳ Activar ➔')}
                    </span>
                </div>
            `;
        }).join('');

        listEl.querySelectorAll('.detected-account-card-light').forEach(card => {
            card.onclick = () => {
                document.getElementById('userGoogleEmailInput').value = card.dataset.email;
                const nameInp = document.getElementById('userFullNameInput');
                if (nameInp) nameInp.value = card.dataset.name || '';
                document.getElementById('btnConfirmGoogleAccount').click();
            };
        });
    }

    // ── RENDERIZADO DEL DIRECTORIO DE INTEGRANTES Y VOTACIÓN / EXPULSIÓN ──
    function renderCommunityMembers() {
        const container = document.getElementById('communityMembersListContainer');
        const countEl = document.getElementById('commTotalCount');
        const badgeEl = document.getElementById('commAdminModeBadge');
        if (!container) return;

        const members = getCommunityMembers();
        if (countEl) countEl.textContent = String(members.length);

        const session = getSession();
        const isOwner = session && session.role === 'owner';
        const myEmail = (session && session.email) ? session.email.toLowerCase() : 'visitante';

        if (badgeEl) {
            badgeEl.textContent = isOwner
                ? '👑 Modo Ulianov Activo: Expulsión en 1 Clic'
                : '🗳️ Modo Comunidad: Todos pueden ver y votar / expulsar';
        }

        if (members.length === 0) {
            container.innerHTML = `<div style="padding: 18px; text-align: center; color: #64748b; font-size: 12px;">No hay integrantes registrados aún.</div>`;
            return;
        }

        container.innerHTML = members.map((m, idx) => {
            const isCreator = m.email === 'ulianov.continental@gmail.com' || m.role === 'owner';
            const isBanned = m.status === 'BANNED' || isUserBanned(m.email);
            const isAuth = isUserAuthorized(m.email) || isCreator;
            const votes = Array.isArray(m.votesAgainst) ? m.votesAgainst : [];
            const iVoted = votes.includes(myEmail);

            const statusBadge = isCreator
                ? `<span style="background:#fef08a; color:#854d0e; border:1px solid #eab308; padding:2px 8px; border-radius:99px; font-size:10.5px; font-weight:900;">👑 CREADOR ULIANOV</span>`
                : isBanned
                    ? `<span style="background:#fee2e2; color:#991b1b; border:1px solid #f87171; padding:2px 8px; border-radius:99px; font-size:10.5px; font-weight:900;">🚫 EXPULSADO / BANEADO</span>`
                    : isAuth
                        ? `<span style="background:#dcfce7; color:#166534; border:1px solid #4ade80; padding:2px 8px; border-radius:99px; font-size:10.5px; font-weight:900;">🟢 INTEGRANTE ACTIVO</span>`
                        : `<span style="background:#fef3c7; color:#92400e; border:1px solid #fbbf24; padding:2px 8px; border-radius:99px; font-size:10.5px; font-weight:900;">⏳ PENDIENTE YAPE</span>`;

            return `
                <div class="member-row-light" style="background: ${isBanned ? '#fff1f2' : '#f8fafc'}; border-color: ${isBanned ? '#fda4af' : '#cbd5e1'};">
                    <div style="display: flex; align-items: center; gap: 10px; flex: 1; min-width: 220px;">
                        <div style="width: 36px; height: 36px; border-radius: 50%; background: ${isCreator ? '#eab308' : (isBanned ? '#dc2626' : '#2563eb')}; color: #ffffff; font-weight: 900; font-size: 14px; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                            ${idx + 1}
                        </div>
                        <div style="overflow: hidden;">
                            <div style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
                                <strong style="font-size: 13px; color: #0f172a;">${m.name || m.email.split('@')[0]}</strong>
                                ${statusBadge}
                            </div>
                            <div style="font-size: 11.5px; color: #1d4ed8; font-family: monospace; font-weight: 700;">${m.email}</div>
                            <div style="font-size: 10.5px; color: #64748b;">
                                Registro: ${m.joinedAt || 'Reciente'} • Votos para botar: <strong style="color: ${votes.length > 0 ? '#dc2626' : '#475569'};">${votes.length}</strong>
                            </div>
                        </div>
                    </div>

                    ${!isCreator ? `
                        <div style="display: flex; gap: 6px; align-items: center; flex-wrap: wrap;">
                            <button type="button" class="btn-comm-vote" data-email="${m.email}" style="background: ${iVoted ? '#f97316' : '#fff7ed'}; color: ${iVoted ? '#ffffff' : '#c2410c'}; border: 1.5px solid #fb923c; border-radius: 8px; padding: 6px 10px; font-size: 11px; font-weight: 800; cursor: pointer;">
                                🗳️ ${iVoted ? 'Quitar Voto' : 'Votar'} (${votes.length})
                            </button>
                            ${!isBanned ? `
                                <button type="button" class="btn-comm-kick" data-email="${m.email}" style="background: #dc2626; color: #ffffff; border: none; border-radius: 8px; padding: 6px 11px; font-size: 11px; font-weight: 800; cursor: pointer;" title="Botar / Expulsar inmediatamente">
                                    🚫 Botar / Banear
                                </button>
                            ` : `
                                <button type="button" class="btn-comm-unban" data-email="${m.email}" style="background: #16a34a; color: #ffffff; border: none; border-radius: 8px; padding: 6px 11px; font-size: 11px; font-weight: 800; cursor: pointer;" title="Restaurar acceso al integrante">
                                    🔄 Admitir de Nuevo
                                </button>
                            `}
                        </div>
                    ` : ''}
                </div>
            `;
        }).join('');

        // Eventos de Votar
        container.querySelectorAll('.btn-comm-vote').forEach(btn => {
            btn.onclick = () => {
                const targetEm = btn.dataset.email;
                const res = voteAgainstMember(targetEm, myEmail);
                if (res.error) {
                    alert(res.error);
                    return;
                }
                // Si acumula 2 o más votos o si el usuario desea expulsarlo
                if (res.votesCount >= 2 && !isUserBanned(targetEm)) {
                    if (confirm(`🗳️ El integrante ${targetEm} ha alcanzado ${res.votesCount} votos en contra.\n¿Deseas expulsarlo / banearlo ahora mismo de la plataforma?`)) {
                        banUser(targetEm);
                    }
                }
                renderCommunityMembers();
                renderDevUsers();
            };
        });

        // Eventos de Botar / Banear directo ("votar a los que yo quiera cuando me de la gana")
        container.querySelectorAll('.btn-comm-kick').forEach(btn => {
            btn.onclick = () => {
                const targetEm = btn.dataset.email;
                if (confirm(`🚫 ¿Confirmas que deseas BOTAR / EXPULSAR a ${targetEm} de la plataforma inmediatamente?`)) {
                    banUser(targetEm);
                    renderCommunityMembers();
                    renderDevUsers();
                    renderDetectedAccounts();
                }
            };
        });

        // Eventos de Restaurar / Desbanear
        container.querySelectorAll('.btn-comm-unban').forEach(btn => {
            btn.onclick = () => {
                const targetEm = btn.dataset.email;
                authorizeUser(targetEm);
                renderCommunityMembers();
                renderDevUsers();
                renderDetectedAccounts();
            };
        });
    }

    function updateDevKeyFinder(query) {
        const resultsEl = document.getElementById('devKeyFinderResults');
        if (!resultsEl) return;
        const inputEl = document.getElementById('devKeyFinderInput');
        const email = (query !== undefined ? query : (inputEl ? inputEl.value : '')).trim().toLowerCase();

        if (!email) {
            resultsEl.innerHTML = `<div style="font-size: 11.5px; color: #475569; text-align: center;">Escribe arriba el correo del alumno para ver su código <strong>CYB-XXXX-XXXX</strong> y copiarlo para WhatsApp.</div>`;
            return;
        }

        const accessKey = computeAccessCode(email);
        const vipKey = computeExcelVipCode(email);
        const isAuth = isUserAuthorized(email);

        resultsEl.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;">
                <div>
                    <div style="font-size: 12px; font-weight: 800; color: #0f172a; font-family: monospace;">${email}</div>
                    <div style="font-size: 15px; font-weight: 900; color: #1d4ed8; font-family: monospace; margin-top: 2px;">
                        🔑 Código: ${accessKey} &nbsp;|&nbsp; ⭐ VIP: ${vipKey}
                    </div>
                </div>
                <div style="display: flex; gap: 6px;">
                    <button type="button" id="btnCopyCalcKey" style="background: #2563eb; color: #fff; border: none; border-radius: 6px; padding: 6px 10px; font-size: 11px; font-weight: 800; cursor: pointer;">
                        📋 Copiar Código
                    </button>
                    <button type="button" id="btnDirectAuthCalc" style="background: #16a34a; color: #fff; border: none; border-radius: 6px; padding: 6px 10px; font-size: 11px; font-weight: 800; cursor: pointer;">
                        ${isAuth ? '✔ Ya Activo' : '⚡ Activar Aquí'}
                    </button>
                </div>
            </div>
        `;

        resultsEl.querySelector('#btnCopyCalcKey').onclick = () => {
            const msg = `Hola! Tu código de acceso para CEREBRO ESTRUCTURAL v4.0 (Edición Vigas - Plantilla Ulianov) es:\n🔑 CÓDIGO: ${accessKey}\n(Correo: ${email})`;
            copyToClipboard(msg, `✔ Código copiado para WhatsApp:\n\n${msg}`);
        };
        resultsEl.querySelector('#btnDirectAuthCalc').onclick = () => {
            authorizeUser(email);
            updateDevKeyFinder(email);
            renderDevUsers();
            renderCommunityMembers();
        };
    }

    function renderDevVipGuestCard() {
        const badge = document.getElementById('devVipStatusBadge');
        const btnToggle = document.getElementById('btnToggleVipGuest');
        const linkInput = document.getElementById('devVipShareLinkInput');
        const isEnabled = isVipGuestEnabled();

        if (linkInput) linkInput.value = generateVipGuestShareUrl();
        if (badge) {
            badge.textContent = isEnabled ? '🟢 ACTIVO' : '🔴 PAUSADO';
            badge.style.background = isEnabled ? '#dcfce7' : '#fee2e2';
            badge.style.color = isEnabled ? '#166534' : '#991b1b';
        }
        if (btnToggle) {
            btnToggle.textContent = isEnabled ? '🔴 Pausar VIP' : '🟢 Activar VIP';
            btnToggle.style.background = isEnabled ? '#dc2626' : '#16a34a';
            btnToggle.style.color = '#ffffff';
        }
    }

    function renderDevUsers() {
        const c = document.getElementById('devAuthorizedUsersList');
        if (!c) return;
        const members = getCommunityMembers();
        if (members.length === 0) {
            c.innerHTML = `<div style="padding: 12px; text-align: center; color: #64748b; font-size: 11.5px;">Sin integrantes registrados.</div>`;
            return;
        }
        c.innerHTML = members.map(m => {
            const isCreator = m.email === 'ulianov.continental@gmail.com';
            const banned = isUserBanned(m.email);
            const code = computeAccessCode(m.email);
            return `
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 7px 10px; border-bottom: 1px solid #e2e8f0; font-size: 12px;">
                    <div>
                        <strong style="color: #0f172a;">${m.name}</strong>
                        <span style="color: #2563eb; font-family: monospace; margin-left: 6px;">${m.email}</span>
                        <span style="background: #fef9c3; color: #854d0e; font-family: monospace; font-size: 11px; padding: 1px 6px; border-radius: 4px; border: 1px solid #eab308; margin-left: 6px;">${code}</span>
                    </div>
                    ${!isCreator ? `
                        <div style="display: flex; gap: 6px;">
                            ${!banned ? `
                                <button data-email="${m.email}" class="btn-dev-ban" style="background: #dc2626; color: #fff; border: none; border-radius: 6px; padding: 4px 10px; font-size: 11px; font-weight: 800; cursor: pointer;">🚫 Botar / Banear</button>
                            ` : `
                                <button data-email="${m.email}" class="btn-dev-unban" style="background: #16a34a; color: #fff; border: none; border-radius: 6px; padding: 4px 10px; font-size: 11px; font-weight: 800; cursor: pointer;">🔄 Desbanear</button>
                            `}
                        </div>
                    ` : `<span style="font-size: 11px; font-weight: 800; color: #15803d;">👑 Creador</span>`}
                </div>
            `;
        }).join('');

        c.querySelectorAll('.btn-dev-ban').forEach(b => {
            b.onclick = () => {
                banUser(b.dataset.email);
                renderDevUsers();
                renderCommunityMembers();
            };
        });
        c.querySelectorAll('.btn-dev-unban').forEach(b => {
            b.onclick = () => {
                authorizeUser(b.dataset.email);
                renderDevUsers();
                renderCommunityMembers();
            };
        });
    }

    function renderUserProjects() {
        const c = document.getElementById('myProjectsListContainer');
        if (!c) return;
        const list = getUserProjects();
        if (list.length === 0) {
            c.innerHTML = `<div style="padding: 18px; text-align: center; color: #64748b; font-size: 12px;">Aún no has guardado ejercicios de vigas. Usa el botón verde de abajo para guardar tu viga actual.</div>`;
            return;
        }
        c.innerHTML = list.map(p => {
            const health = evaluateBeamHealth(p.state);
            const shareUrl = generateBeamShareUrl(p);
            const waMsg = encodeURIComponent(`Hola Ing. Ulianov Cuba, envío mi ejercicio de viga "${p.name}" para revisión: ${shareUrl}`);
            return `
                <div style="background: #ffffff; border: 1.5px solid #cbd5e1; border-radius: 10px; padding: 10px; margin-bottom: 8px;">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <strong style="font-size: 13px; color: #0f172a;">${p.name}</strong>
                        <span style="font-size: 10.5px; font-weight: 800; color: ${health.badgeColor};">${health.status}</span>
                    </div>
                    <div style="font-size: 11px; color: #475569; margin: 3px 0 8px;">${health.summary}</div>
                    <div style="display: flex; gap: 6px; justify-content: flex-end; flex-wrap: wrap;">
                        <button data-id="${p.id}" class="btn-load-beam-proj" style="background: #2563eb; color: #fff; border: none; border-radius: 6px; padding: 4px 10px; font-size: 11px; font-weight: 800; cursor: pointer;">⚡ Cargar</button>
                        <button data-id="${p.id}" class="btn-copy-beam-proj" style="background: #f1f5f9; color: #0f172a; border: 1px solid #cbd5e1; border-radius: 6px; padding: 4px 10px; font-size: 11px; font-weight: 700; cursor: pointer;">🔗 Copiar Link</button>
                        <a href="https://api.whatsapp.com/send?phone=51${YAPE_NUMBER}&text=${waMsg}" target="_blank" rel="noopener noreferrer" style="background: #16a34a; color: #fff; text-decoration: none; border-radius: 6px; padding: 4px 10px; font-size: 11px; font-weight: 800;">📲 Enviar a Ulianov</a>
                        <button data-id="${p.id}" class="btn-del-beam-proj" style="background: #fee2e2; color: #991b1b; border: none; border-radius: 6px; padding: 4px 8px; font-size: 11px; font-weight: 800; cursor: pointer;">✕</button>
                    </div>
                </div>
            `;
        }).join('');

        c.querySelectorAll('.btn-load-beam-proj').forEach(b => {
            b.onclick = () => {
                const proj = list.find(x => x.id === b.dataset.id);
                if (proj && window.CerebroApp && window.CerebroApp.loadState) {
                    window.CerebroApp.loadState(proj.state);
                    document.getElementById('projectsManagerModal').classList.add('modal-hidden');
                }
            };
        });
        c.querySelectorAll('.btn-copy-beam-proj').forEach(b => {
            b.onclick = () => {
                const proj = list.find(x => x.id === b.dataset.id);
                if (proj) copyToClipboard(generateBeamShareUrl(proj), '🔗 Enlace del ejercicio de viga copiado al portapapeles.');
            };
        });
        c.querySelectorAll('.btn-del-beam-proj').forEach(b => {
            b.onclick = () => {
                deleteProject(b.dataset.id);
                renderUserProjects();
            };
        });
    }

    function promptSaveProject() {
        if (!window.CerebroApp || !window.CerebroApp.getCurrentState) return;
        const name = prompt('Nombre del Ejercicio de Viga:', 'Viga Ejercicio ' + (getUserProjects().length + 1));
        if (name && name.trim()) {
            const st = window.CerebroApp.getCurrentState();
            const saved = saveProject(name.trim(), st);
            renderUserProjects();
            const url = generateBeamShareUrl(saved);
            copyToClipboard(url, `✔ Ejercicio "${saved.name}" guardado y enlace copiado al portapapeles.`);
        }
    }

    // ── VISIBILIDAD DE MODALES ───────────────────────────────────
    function showModal() {
        buildModals();
        renderDetectedAccounts();
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

    function showCommunityModal() {
        buildModals();
        renderCommunityMembers();
        const c = document.getElementById('communityMembersModal');
        if (c) {
            c.classList.remove('modal-hidden');
            c.style.display = 'flex';
        }
    }

    function showDevPanel() {
        buildModals();
        renderDevVipGuestCard();
        updateDevKeyFinder('');
        renderDevUsers();
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

    function showProjectsModal() {
        buildModals();
        renderUserProjects();
        const p = document.getElementById('projectsManagerModal');
        if (p) {
            p.classList.remove('modal-hidden');
            p.style.display = 'flex';
        }
    }

    function updateAppHeader() {
        const session = getSession();
        const authOk = isAuthorized();

        const btnCommunity = document.getElementById('btnCommunityMembers');
        if (btnCommunity) {
            btnCommunity.onclick = showCommunityModal;
            const total = getCommunityMembers().length;
            const badge = document.getElementById('badgeCommunityCount');
            if (badge) badge.textContent = String(total);
        }

        const btnOwnerPanel = document.getElementById('btnOwnerPanel');
        if (btnOwnerPanel) {
            btnOwnerPanel.style.display = (authOk && session && session.role === 'owner') ? 'inline-flex' : 'none';
            btnOwnerPanel.onclick = showDevPanel;
        }

        const btnMyProj = document.getElementById('btnMyProjects');
        if (btnMyProj) {
            btnMyProj.onclick = showProjectsModal;
        }

        const btnSaveProj = document.getElementById('btnSaveProject');
        if (btnSaveProj) {
            btnSaveProj.onclick = promptSaveProject;
        }

        const btnRelock = document.getElementById('btnRelock');
        if (btnRelock) {
            btnRelock.onclick = logoutSession;
        }

        const userBadge = document.getElementById('activeUserHeaderBadge');
        if (userBadge) {
            if (authOk && session) {
                userBadge.textContent = session.role === 'owner'
                    ? '👑 Ing. Ulianov Cuba'
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
        checkUrlForSharedBeam();
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
        getCommunityMembers,
        registerCommunityMember,
        voteAgainstMember,
        banUser,
        unbanUser,
        authorizeUser,
        openCommunityModal: showCommunityModal,
        openDevPanel: showDevPanel,
        openProjects: showProjectsModal,
        saveProject,
        importAndLoadBeam,
        generateBeamShareUrl,
        generateVipGuestShareUrl,
        getSession,
        lock: logoutSession
    };
})();
