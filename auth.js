/**
 * auth.js - CEREBRO ESTRUCTURAL v2.1
 * Sistema de Control de Acceso Estudiantil con Google Sign-In Real,
 * Detección Automática de Cuentas en el Navegador, Pasarela Yape S/ 5.00,
 * Control de Sesión Única por Dispositivo, Gestión de Proyectos Multi-Usuario,
 * Control de Licencias VIP para Descarga de Plantillas Excel (.xlsx) y
 * Panel de Desarrollador Maestro.
 *
 * Desarrollado por Ingeniero Ulianov Cuba Valencia
 * Contraseña Maestra de Desarrollador: Vayolett1404
 */

(function() {
    'use strict';

    // ── CONSTANTES GLOBALES Y SEGURIDAD ─────────────────────────
    const MASTER_PASSWORDS = ['Vayolett1404', 'vayolett1404'];
    const CRYPTO_SALT = 'CYBORG_ULIANOV_V21_MASTER_SALT_2026';
    const NOTIFICATION_EMAIL = 'ulianov.continental@gmail.com';

    // Claves de almacenamiento local
    const KEY_SESSION = 'cerebro_auth_session_v21';
    const KEY_WHITELIST = 'cerebro_authorized_users_v21';
    const KEY_PENDING = 'cerebro_pending_requests_v21';
    const KEY_BANNED = 'cerebro_banned_users_v21';
    const KEY_PROJECTS = 'cerebro_global_projects_v21';
    const KEY_GOOGLE_ACCOUNTS = 'cerebro_real_google_accounts_v21';
    const KEY_DEVICE_ID = 'cerebro_device_id_v21';
    const KEY_EXCEL_WHITELIST = 'cerebro_excel_authorized_users_v21';
    const KEY_EXCEL_REQUESTS  = 'cerebro_excel_requests_v21';

    // Identificador único persistente de este dispositivo/navegador
    let myDeviceId = localStorage.getItem(KEY_DEVICE_ID);
    if (!myDeviceId) {
        myDeviceId = 'dev_' + Math.random().toString(36).substring(2) + Date.now();
        localStorage.setItem(KEY_DEVICE_ID, myDeviceId);
    }

    // Canal de sincronización entre ventanas/dispositivos
    const sessionChannel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('cerebro_session_sync') : null;

    // ── MOTOR CRIPTOGRÁFICO SHA-256 ──────────────────────────────
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

    // ── CÁLCULO CRIPTOGRÁFICO DETERMINISTA DE CLAVES EN LÍNEA ───
    // Permite que el creador conozca la contraseña exacta de CUALQUIER correo
    // desde cualquier parte del mundo sin depender de base de datos compartida.
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

    // Generar código para verificación Yape (100% determinista y predecible por el creador)
    function generateRandomAccessCode(email) {
        return computeAccessCode(email);
    }

    // Comprobar clave de acceso para un usuario
    function verifyAccessCode(email, code) {
        if (!code) return false;
        const cleanCode = code.trim().toUpperCase();

        // 1. Clave maestra de desarrollador / dueño (Vayolett1404)
        if (MASTER_PASSWORDS.includes(cleanCode)) return true;

        const cleanEmail = (email || '').trim().toLowerCase();
        if (!cleanEmail) return false;

        // 2. Clave criptográfica determinista vinculada a este correo (CYB-XXXX-XXXX)
        const expectedCode = computeAccessCode(cleanEmail);
        if (cleanCode === expectedCode) return true;

        // 3. Clave directa ULI de respaldo
        const directKey = 'ULI-' + sha256(cleanEmail + CRYPTO_SALT).substring(0, 8).toUpperCase();
        if (cleanCode === directKey) return true;

        // 4. Claves registradas en solicitudes pendientes locales
        const pending = getPendingRequests();
        const found = pending.find(p => p.email === cleanEmail && p.code === cleanCode);
        if (found) return true;

        return false;
    }

    // Comprobar clave VIP de Excel para un usuario
    function verifyExcelVipCode(email, code) {
        if (!code) return false;
        const cleanCode = code.trim().toUpperCase();

        if (MASTER_PASSWORDS.includes(cleanCode)) return true;

        const cleanEmail = (email || (getSession() ? getSession().email : '') || '').trim().toLowerCase();
        if (!cleanEmail) return false;

        const expectedVip = computeExcelVipCode(cleanEmail);
        if (cleanCode === expectedVip) return true;

        return false;
    }

    // ── COPIADO SEGURO AL PORTAPAPELES CON FALLBACK ──────────────
    function copyToClipboard(text, successMessage) {
        if (!text) return;
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(text).then(() => {
                if (successMessage) alert(successMessage);
            }).catch(() => {
                fallbackCopyText(text, successMessage);
            });
        } else {
            fallbackCopyText(text, successMessage);
        }
    }

    function fallbackCopyText(text, successMessage) {
        try {
            const textArea = document.createElement("textarea");
            textArea.value = text;
            textArea.style.position = "fixed";
            textArea.style.left = "-999999px";
            textArea.style.top = "-999999px";
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            if (successMessage) alert(successMessage);
        } catch (e) {
            if (successMessage) alert(successMessage);
        }
    }

    // ── GESTIÓN DE ALMACENAMIENTO JSON ───────────────────────────
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
            console.error("Error al guardar en localStorage:", e);
        }
    }

    // ── CUENTAS REALES DETECTADAS EN ESTE DISPOSITIVO ────────────
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
    }

    // ── WHITELIST DE ALUMNOS, BANEO Y SOLICITUDES ────────────────
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
        revokeExcelPermission(clean);
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

    // ── CONTROL DE LICENCIAS VIP PARA DESCARGA DE EXCEL (.XLSX) ──
    function getExcelAuthorizedUsers() { return getStoredJSON(KEY_EXCEL_WHITELIST, []); }

    function hasExcelPermission(email) {
        const session = getSession();
        if (session && session.role === 'owner') return true; // Creador/Dueño siempre puede descargar Excel
        const target = email || (session ? session.email : '');
        if (!target) return false;
        return getExcelAuthorizedUsers().includes(target.toLowerCase().trim());
    }

    function grantExcelPermission(email) {
        const clean = (email || '').toLowerCase().trim();
        if (!clean) return;
        const list = getExcelAuthorizedUsers();
        if (!list.includes(clean)) {
            list.push(clean);
            setStoredJSON(KEY_EXCEL_WHITELIST, list);
        }
        const reqs = getExcelRequests();
        const found = reqs.find(r => r.email === clean);
        if (found) {
            found.status = 'APPROVED';
            setStoredJSON(KEY_EXCEL_REQUESTS, reqs);
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

        // Notificar al correo del creador vía FormSubmit
        const payload = {
            _subject: `⭐ Solicitud de Plantilla Excel (.xlsx): ${targetEmail}`,
            email: targetEmail,
            mensaje: `El alumno ${targetEmail} ha solicitado la plantilla maestra editable en Excel (.xlsx) con fórmulas dinámicas.`,
            fecha: new Date().toLocaleString()
        };

        try {
            fetch(`https://formsubmit.co/ajax/${NOTIFICATION_EMAIL}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                body: JSON.stringify(payload)
            }).catch(() => {});
        } catch (e) {}
    }

    // ── SESIÓN PERSISTENTE Y SIN REPETICIÓN DE PROMPTS ────────────
    function getSession() { return getStoredJSON(KEY_SESSION, null); }

    function isAuthorized() {
        const session = getSession();
        if (!session) return false;
        if (session.role === 'owner') return true;
        if (session.role === 'student') {
            if (isUserBanned(session.email)) return false;
            if (isUserAuthorized(session.email)) return true;
            if (localStorage.getItem('cerebro_unlocked') === 'true') return true;
        }
        return false;
    }

    function saveSession(sessionObj) {
        setStoredJSON(KEY_SESSION, sessionObj);
        localStorage.setItem('cerebro_unlocked', 'true');
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
        localStorage.removeItem('cerebro_unlocked');
        showModal();
        updateAppHeader();
    }

    // Escuchar mensajes para control de sesión única entre distintos dispositivos
    if (sessionChannel) {
        sessionChannel.onmessage = (event) => {
            const data = event.data;
            if (!data) return;

            const mySession = getSession();
            if (mySession && mySession.role === 'student' && mySession.email === data.email) {
                if (data.type === 'SESSION_STARTED' && data.deviceId && data.deviceId !== myDeviceId) {
                    logoutSession();
                    alert("⚠ SESIÓN CERRADA AUTOMÁTICAMENTE:\n\nTu cuenta ha sido abierta en otro dispositivo o ventana externa. Por seguridad académica se permite 1 sesión activa a la vez.");
                } else if (data.type === 'USER_BANNED') {
                    logoutSession();
                    alert("🚫 ACCESO DENEGADO:\n\nTu cuenta ha sido suspendida o bloqueada por el desarrollador.");
                }
            }
        };
    }

    // ── PROYECTOS / ARMADURAS MULTI-USUARIO Y EVALUACIÓN ──────────
    function getAllProjects() { return getStoredJSON(KEY_PROJECTS, []); }

    // Codificación segura UTF-8 Base64 para Enlace Mágico
    function encodeTrussPayload(data) {
        const json = JSON.stringify(data);
        const bytes = new TextEncoder().encode(json);
        let bin = '';
        for (let i = 0; i < bytes.length; i++) {
            bin += String.fromCharCode(bytes[i]);
        }
        return btoa(bin);
    }

    // Decodificación universal: URL (#armadura=...), texto base64 o JSON crudo
    function decodeTrussPayload(input) {
        if (!input) throw new Error("Entrada vacía");
        if (typeof input === 'object' && input.nodes && input.bars) return input;
        let str = String(input).trim();
        if (str.startsWith('{') && str.endsWith('}')) {
            try { return JSON.parse(str); } catch (e) {}
        }
        if (str.includes('armadura=')) {
            str = str.split('armadura=')[1];
        }
        str = str.split('&')[0].split('#')[0].trim();
        const bin = atob(str);
        const bytes = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) {
            bytes[i] = bin.charCodeAt(i);
        }
        const jsonStr = new TextDecoder('utf-8').decode(bytes);
        return JSON.parse(jsonStr);
    }

    // Genera URL directa y portable para compartir armadura (#armadura=...)
    function generateTrussShareUrl(proj) {
        const enc = encodeTrussPayload({
            id: proj.id,
            name: proj.name,
            authorEmail: proj.authorEmail,
            createdAt: proj.createdAt,
            nodes: proj.nodes,
            bars: proj.bars
        });
        const base = window.location.origin + window.location.pathname;
        return `${base}#armadura=${enc}`;
    }

    // Evaluador Automático de Estabilidad y Resolución Estructural (determina si la armadura "sirve o no")
    function evaluateTrussHealth(nodes, bars) {
        if (!window.TrussSolver || !window.TrussSolver.solveTruss) {
            return { ok: true, status: "DISPONIBLE", badgeColor: "#38bdf8", errorMsg: null, summary: "Estructura cargada." };
        }
        try {
            const res = window.TrussSolver.solveTruss(nodes, bars);
            if (!res.success) {
                return {
                    ok: false,
                    status: "🔴 NO SIRVE (INESTABLE)",
                    badgeColor: "#ef4444",
                    errorMsg: res.error,
                    summary: `Inestable / Falla: ${res.error}`
                };
            }
            const nN = res.activeNodes ? res.activeNodes.length : 0;
            const nB = res.activeBars ? res.activeBars.length : 0;
            const nR = res.degreesOfFreedom ? res.degreesOfFreedom.restrained : 0;
            const gh = (nB + nR) - (2 * nN);
            const ghStr = gh === 0 ? "Isostática (GH = 0)" : (gh > 0 ? `Hiperestática (GH = +${gh})` : `Hipostática (GH = ${gh})`);
            return {
                ok: true,
                status: "🟢 SIRVE (ESTABLE)",
                badgeColor: "#10b981",
                gh: gh,
                ghStr: ghStr,
                errorMsg: null,
                summary: `Estructura Estable (${ghStr}): ${nN} Nudos, ${nB} Barras, ${nR} Reacciones. Equilibrio verificado con éxito.`
            };
        } catch (err) {
            return {
                ok: false,
                status: "🔴 NO SIRVE (ERROR)",
                badgeColor: "#ef4444",
                errorMsg: err.message,
                summary: `Error de análisis: ${err.message}`
            };
        }
    }

    // Notificación flotante de evaluación al cargar armadura
    function showTrussEvaluationBanner(projData, health) {
        let b = document.getElementById('trussEvaluationBanner');
        if (!b) {
            b = document.createElement('div');
            b.id = 'trussEvaluationBanner';
            b.style.position = 'fixed';
            b.style.top = '72px';
            b.style.left = '50%';
            b.style.transform = 'translateX(-50%)';
            b.style.zIndex = '999999';
            b.style.maxWidth = '92%';
            b.style.width = '560px';
            b.style.boxShadow = '0 10px 30px rgba(0,0,0,0.65)';
            b.style.borderRadius = '14px';
            b.style.padding = '12px 18px';
            b.style.backdropFilter = 'blur(16px)';
            b.style.border = '1.5px solid rgba(255,255,255,0.2)';
            b.style.transition = 'all 0.3s ease';
            document.body.appendChild(b);
        }

        const isOk = health.ok;
        b.style.background = isOk ? 'rgba(6, 44, 30, 0.94)' : 'rgba(50, 10, 20, 0.94)';
        b.style.borderColor = isOk ? '#10b981' : '#f43f5e';
        b.style.display = 'block';

        b.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 10px;">
                <div>
                    <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
                        <span style="font-size: 16px;">${isOk ? '📐' : '⚠️'}</span>
                        <strong style="color: #ffffff; font-size: 13px;">${projData.name || 'Armadura'}</strong>
                        <span style="font-size: 10.5px; color: ${health.badgeColor}; font-weight: 800; background: rgba(0,0,0,0.3); padding: 2px 7px; border-radius: 6px; border: 1px solid ${health.badgeColor};">
                            ${health.status}
                        </span>
                    </div>
                    <div style="font-size: 11px; color: #cbd5e1; margin-bottom: 4px;">
                        Autor: <strong style="color: #38bdf8;">${projData.authorEmail || 'Alumno'}</strong> • ${projData.createdAt || 'Fecha actual'}
                    </div>
                    <div style="font-size: 11px; color: ${isOk ? '#a7f3d0' : '#fca5a5'}; line-height: 1.4;">
                        ${health.summary}
                    </div>
                </div>
                <button id="btnCloseTrussBanner" style="background: none; border: none; color: #94a3b8; font-size: 18px; cursor: pointer; padding: 0 4px;">✕</button>
            </div>
        `;

        const btnClose = document.getElementById('btnCloseTrussBanner');
        if (btnClose) {
            btnClose.onclick = () => { b.style.display = 'none'; };
        }

        setTimeout(() => {
            if (b && b.style.display !== 'none') {
                b.style.display = 'none';
            }
        }, 9000);
    }

    // Descargar armadura en archivo portable .armadura (.json)
    function downloadTrussFile(proj) {
        const jsonStr = JSON.stringify(proj, null, 2);
        const blob = new Blob([jsonStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${(proj.name || 'armadura').replace(/[^a-zA-Z0-9_-]/g, '_')}.armadura`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    // Importar armadura desde enlace, código o JSON y cargar en pantalla
    function importAndLoadTruss(payloadOrUrl, options = {}) {
        try {
            const proj = decodeTrussPayload(payloadOrUrl);
            if (!proj || !proj.nodes || !proj.bars) {
                throw new Error("El código o enlace no contiene una estructura de armadura válida.");
            }

            if (!proj.id) proj.id = 'proj_' + Math.random().toString(36).substring(2, 9) + Date.now();
            if (!proj.name) proj.name = 'Armadura de Alumno';
            if (!proj.authorEmail) proj.authorEmail = 'Alumno (Compartido)';
            if (!proj.createdAt) proj.createdAt = new Date().toLocaleString();

            const list = getAllProjects();
            const existingIdx = list.findIndex(p => p.id === proj.id || (p.name === proj.name && p.authorEmail === proj.authorEmail));
            if (existingIdx >= 0) {
                list[existingIdx] = proj;
            } else {
                list.unshift(proj);
            }
            setStoredJSON(KEY_PROJECTS, list);

            if (window.CerebroApp && window.CerebroApp.loadProjectData) {
                window.CerebroApp.loadProjectData(proj.nodes, proj.bars);
            }

            const health = evaluateTrussHealth(proj.nodes, proj.bars);
            showTrussEvaluationBanner(proj, health);

            renderUserProjects();
            renderDevGlobalProjects();

            return { success: true, project: proj, health: health };
        } catch (err) {
            console.error("Error al importar armadura:", err);
            if (!options.silent) {
                alert("❌ No se pudo cargar la armadura:\n\n" + err.message);
            }
            return { success: false, error: err.message };
        }
    }

    // Notificación automática al creador cuando un alumno guarda armadura
    async function sendProjectSavedNotificationEmail(project, shareUrl) {
        const activeNodes = (project.nodes || []).filter(n => n && n.x !== null && n.x !== undefined && n.x !== "").length;
        const activeBars = (project.bars || []).filter(b => b && b.start && b.end).length;
        const payload = {
            _subject: `📐 Armadura Guardada: "${project.name}" (${project.authorEmail})`,
            alumno: project.authorEmail,
            nombre_armadura: project.name,
            nodos: activeNodes,
            barras: activeBars,
            fecha: project.createdAt,
            enlace_evaluacion_1_clic: shareUrl,
            mensaje: `El alumno ${project.authorEmail} ha guardado la armadura "${project.name}". Haz clic en el enlace para abrirla y evaluarla directamente en la web.`
        };

        try {
            await fetch(`https://formsubmit.co/ajax/${NOTIFICATION_EMAIL}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                body: JSON.stringify(payload)
            });
        } catch (e) {
            console.warn("No se pudo enviar notificación de proyecto:", e);
        }
    }

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

        const shareUrl = generateTrussShareUrl(newProject);
        newProject.shareUrl = shareUrl;

        if (session.role !== 'owner') {
            sendProjectSavedNotificationEmail(newProject, shareUrl);
        }

        return newProject;
    }

    function getUserProjects() {
        const session = getSession();
        if (!session) return [];
        const all = getAllProjects();
        if (session.role === 'owner') return all;
        return all.filter(p => p.authorEmail === session.email);
    }

    function deleteProject(projectId) {
        const session = getSession();
        let all = getAllProjects();
        if (session && session.role === 'owner') {
            all = all.filter(p => p.id !== projectId);
        } else if (session) {
            all = all.filter(p => p.id !== projectId || p.authorEmail === session.email);
        }
        setStoredJSON(KEY_PROJECTS, all);
    }

    // Detección y retención de armadura compartida desde URL (#armadura=...)
    let pendingSharedTruss = null;
    function checkUrlForSharedTruss() {
        let hash = window.location.hash || '';
        let search = window.location.search || '';
        let raw = '';

        if (hash.includes('armadura=')) {
            raw = hash.split('armadura=')[1];
        } else if (search.includes('armadura=')) {
            raw = search.split('armadura=')[1];
        }

        if (raw) {
            raw = raw.split('&')[0];
            try {
                const proj = decodeTrussPayload(raw);
                if (isAuthorized()) {
                    setTimeout(() => {
                        importAndLoadTruss(proj, { silent: true });
                    }, 400);
                } else {
                    pendingSharedTruss = proj;
                }
            } catch (err) {
                console.warn("No se pudo decodificar armadura de la URL:", err);
            }
        }
    }
    window.addEventListener('hashchange', checkUrlForSharedTruss);

    // ── NOTIFICACIÓN AUTOMÁTICA POR CORREO AL CREADOR ───────────
    async function sendNotificationEmail(studentEmail, studentName, generatedCode) {
        const payload = {
            _subject: `🔔 Solicitud Yape S/ 5.00: ${studentEmail} - CEREBRO ESTRUCTURAL v2.1`,
            email: studentEmail,
            nombre: studentName,
            codigo_acceso_generado: generatedCode,
            mensaje: `El alumno ${studentEmail} ha iniciado sesión con Google y solicita validación Yape (S/ 5.00).`,
            fecha: new Date().toLocaleString(),
            _template: 'table'
        };

        try {
            await fetch(`https://formsubmit.co/ajax/${NOTIFICATION_EMAIL}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                body: JSON.stringify(payload)
            });
        } catch (e) {
            console.warn("Nota de red en notificación:", e);
        }
    }

    // ── ESTILOS "LIQUID GLASS" VIDRIOSO Y ULTRA-MODERNO ─────────
    const styleSheet = document.createElement('style');
    styleSheet.id = 'cerebro-liquid-glass-styles';
    styleSheet.textContent = `
        /* Overlay Vidrioso Liquid Glass */
        #accessLockModal, #ownerControlModal, #projectsManagerModal, #modalExcelVipNotice {
            position: fixed;
            inset: 0;
            z-index: 999999;
            background: rgba(3, 7, 18, 0.78);
            backdrop-filter: blur(28px) saturate(190%);
            -webkit-backdrop-filter: blur(28px) saturate(190%);
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 16px;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            transition: opacity 0.22s cubic-bezier(0.16, 1, 0.3, 1), visibility 0.22s;
        }

        .modal-hidden {
            opacity: 0 !important;
            visibility: hidden !important;
            pointer-events: none !important;
            display: none !important;
        }

        /* Tarjeta Liquid Glass */
        .liquid-glass-card {
            background: rgba(17, 24, 39, 0.75);
            background-image: radial-gradient(at 100% 0%, rgba(116, 34, 132, 0.25) 0px, transparent 50%),
                              radial-gradient(at 0% 100%, rgba(0, 210, 181, 0.18) 0px, transparent 50%);
            border: 1px solid rgba(255, 255, 255, 0.14);
            border-top: 1px solid rgba(255, 255, 255, 0.28);
            border-radius: 24px;
            max-width: 490px;
            width: 100%;
            padding: 26px 24px;
            box-shadow: 0 30px 80px rgba(0, 0, 0, 0.75),
                        inset 0 1px 1px rgba(255, 255, 255, 0.25),
                        0 0 40px rgba(116, 34, 132, 0.25);
            color: #f8fafc;
            text-align: center;
            position: relative;
            animation: liquidGlassPop 0.25s cubic-bezier(0.16, 1, 0.3, 1);
            max-height: 92vh;
            overflow-y: auto;
        }

        @keyframes liquidGlassPop {
            0% { transform: scale(0.94) translateY(8px); opacity: 0; }
            100% { transform: scale(1) translateY(0); opacity: 1; }
        }

        /* Cuentas Detectadas en este Dispositivo */
        .detected-accounts-container {
            margin: 12px 0 8px;
            text-align: left;
        }

        .detected-accounts-label {
            font-size: 11.5px;
            font-weight: 700;
            color: #cbd5e1;
            margin-bottom: 6px;
            display: flex;
            align-items: center;
            gap: 6px;
        }

        .detected-account-card {
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 10px 14px;
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid rgba(255, 255, 255, 0.12);
            border-radius: 14px;
            cursor: pointer;
            transition: all 0.18s ease;
            margin-bottom: 6px;
        }

        .detected-account-card:hover {
            background: rgba(255, 255, 255, 0.1);
            border-color: #38bdf8;
            transform: translateY(-1px);
        }

        .google-avatar-circle {
            width: 38px;
            height: 38px;
            border-radius: 50%;
            background: linear-gradient(135deg, #4285F4, #34A853);
            color: #ffffff;
            font-weight: 800;
            font-size: 16px;
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
        }

        .detected-account-details {
            display: flex;
            flex-direction: column;
            overflow: hidden;
            flex: 1;
        }

        .detected-account-name {
            font-size: 13px;
            font-weight: 700;
            color: #ffffff;
        }

        .detected-account-email {
            font-size: 11.5px;
            color: #38bdf8;
            font-family: monospace;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }

        /* Chips de Dominio Rápido */
        .domain-chips-row {
            display: flex;
            gap: 6px;
            margin-top: 6px;
            margin-bottom: 10px;
            justify-content: center;
        }

        .domain-chip {
            background: rgba(255, 255, 255, 0.06);
            border: 1px solid rgba(255, 255, 255, 0.12);
            border-radius: 99px;
            padding: 4px 10px;
            font-size: 11px;
            font-weight: 600;
            color: #94a3b8;
            cursor: pointer;
            transition: all 0.15s ease;
        }

        .domain-chip:hover {
            background: rgba(56, 189, 248, 0.15);
            border-color: #38bdf8;
            color: #38bdf8;
        }

        /* Checkbox Términos */
        .terms-checkbox-wrap {
            display: flex;
            align-items: flex-start;
            gap: 8px;
            text-align: left;
            font-size: 11px;
            color: #cbd5e1;
            margin: 12px 0 10px;
            line-height: 1.4;
            padding: 8px 10px;
            background: rgba(0, 0, 0, 0.25);
            border-radius: 8px;
            border: 1px solid rgba(255, 255, 255, 0.06);
        }

        .terms-checkbox-wrap input[type="checkbox"] {
            margin-top: 2px;
            accent-color: #00D2B5;
            cursor: pointer;
            width: 15px;
            height: 15px;
        }

        /* Botón Continuar con Google */
        .btn-google-continue {
            width: 100%;
            background: #ffffff;
            color: #1f2937;
            font-size: 13.5px;
            font-weight: 700;
            padding: 12px 16px;
            border: none;
            border-radius: 12px;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 10px;
            box-shadow: 0 4px 14px rgba(0, 0, 0, 0.35);
            transition: all 0.15s ease;
            box-sizing: border-box;
            margin-top: 6px;
        }

        .btn-google-continue:hover {
            background: #f1f5f9;
            transform: translateY(-1px);
            box-shadow: 0 6px 20px rgba(255, 255, 255, 0.2);
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
            border: 1.5px solid rgba(255, 255, 255, 0.15);
            border-radius: 12px;
            padding: 12px 14px;
            font-size: 13.5px;
            color: #ffffff;
            font-family: inherit;
            outline: none;
            transition: all 0.2s ease;
            box-sizing: border-box;
            margin-bottom: 4px;
        }

        .liquid-input:focus {
            border-color: #38bdf8;
            box-shadow: 0 0 16px rgba(56, 189, 248, 0.35);
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
    let currentSelectedAccount = null;

    function buildModals() {
        if (document.getElementById('accessLockModal')) return;

        // 1. MODAL PRINCIPAL DE ACCESO CON GOOGLE SIGN-IN REAL
        const mainModal = document.createElement('div');
        mainModal.id = 'accessLockModal';
        mainModal.className = 'modal-hidden';

        mainModal.innerHTML = `
            <div class="liquid-glass-card">
                
                <!-- ══ VISTA 1: INICIO DE SESIÓN CON GOOGLE (DETECCIÓN REAL) ══ -->
                <div id="viewGoogleChooser" style="display: block;">
                    <div style="display: inline-flex; align-items: center; gap: 8px; margin-bottom: 6px;">
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

                    <!-- Lista de Cuentas Reales Detectadas en este Dispositivo (si existen) -->
                    <div id="detectedAccountsWrap" class="detected-accounts-container" style="display: none;">
                        <span class="detected-accounts-label">
                            <span style="color: #38bdf8;">👤</span> Cuentas vinculadas a este navegador:
                        </span>
                        <div id="detectedAccountsList"></div>
                    </div>

                    <!-- Input para Ingreso Directo de la Cuenta Google del Usuario -->
                    <div style="text-align: left; margin: 8px 0 4px;">
                        <label style="font-size: 11.5px; font-weight: 700; color: #cbd5e1; display: block; margin-bottom: 4px;">
                            Ingresa tu cuenta de Google del usuario:
                        </label>
                        <input type="email" id="userGoogleEmailInput" class="liquid-input" placeholder="tu.correo@gmail.com o @continental.edu.pe" autocomplete="email">
                        
                        <!-- Chips de autocompletado rápido -->
                        <div class="domain-chips-row">
                            <span style="font-size: 10.5px; color: #64748b; align-self: center;">Completar:</span>
                            <button type="button" class="domain-chip" data-domain="@gmail.com">@gmail.com</button>
                            <button type="button" class="domain-chip" data-domain="@continental.edu.pe">@continental.edu.pe</button>
                        </div>
                    </div>

                    <!-- Contenedor Oficial Google GIS One Tap si está activo -->
                    <div id="googleOfficialBtnWrap" style="margin: 6px 0; display: flex; justify-content: center;"></div>

                    <!-- Términos y Condiciones Obligatorios -->
                    <label class="terms-checkbox-wrap">
                        <input type="checkbox" id="chkTermsAndConditions" checked>
                        <span>He leído y acepto los <strong>Términos y Condiciones de Licencia Académica</strong> y la política de acceso intransferible y de sesión única.</span>
                    </label>

                    <div id="termsErrorMsg" style="display:none; color:#f43f5e; font-size:11px; font-weight:700; margin-bottom:8px;">
                        ⚠ Debes aceptar los Términos y Condiciones para continuar.
                    </div>

                    <!-- Botón Principal: Continuar con Google -->
                    <button id="btnConfirmGoogleAccount" class="btn-google-continue">
                        <svg width="18" height="18" viewBox="0 0 48 48">
                            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                            <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.28-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.79l7.97-6.2z"/>
                            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                        </svg>
                        <span>Continuar con cuenta de Google</span>
                    </button>

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
                        <div id="lblActiveStudentEmail" style="font-size: 13px; font-family: monospace; font-weight: 700; color: #38bdf8; margin-top: 3px; word-break: break-all;"></div>
                    </div>

                    <div style="background: rgba(116, 34, 132, 0.15); border: 1px dashed rgba(116, 34, 132, 0.6); border-radius: 12px; padding: 12px; font-size: 11.5px; text-align: left; color: #cbd5e1; line-height: 1.5; margin-bottom: 12px;">
                        <strong style="color: #ffffff;">Pasos para activar tu cuenta de por vida:</strong>
                        <ol style="margin-left: 16px; margin-top: 4px; padding-left: 0;">
                            <li>Yapea <strong>S/ 5.00</strong> al creador <strong>Ulianov Cuba Valencia</strong>.</li>
                            <li>Envía tu captura de pago por WhatsApp o Google Meet indicando tu correo vinculado.</li>
                            <li>El Ing. Ulianov verificará tu comprobante y te brindará tu <strong>Código de Acceso (CYB-XXXX-XXXX)</strong>.</li>
                        </ol>
                    </div>

                    <a id="btnYapeWhatsAppLink" href="https://api.whatsapp.com/send?text=Hola%20Ing.%20Ulianov,%20he%20realizado%20mi%20pago%20de%20Yape%20de%20S/%205.00%20para%20activar%20mi%20cuenta" target="_blank" rel="noopener noreferrer" style="display: flex; align-items: center; justify-content: center; gap: 8px; background: #25D366; color: #ffffff; text-decoration: none; font-size: 12px; font-weight: 800; padding: 10px; border-radius: 10px; margin-bottom: 12px; box-shadow: 0 4px 12px rgba(37, 211, 102, 0.3);">
                        <span>📲 Enviar Comprobante por WhatsApp a Ulianov</span>
                    </a>

                    <input type="text" id="accessPassInput" class="liquid-input" placeholder="Ingresa tu código (Ej. CYB-XXXX-XXXX)" autocomplete="off" style="text-align: center; font-family: monospace; font-size: 14.5px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase;">
                    <button id="btnUnlockAccess" class="liquid-btn-primary">
                        🔓 Activar Licencia Permanente
                    </button>

                    <div id="passErrorMsg" style="display:none; color:#f43f5e; font-size:11px; font-weight:700; margin-top:6px; background:rgba(244,63,94,0.1); border:1px solid rgba(244,63,94,0.3); padding:6px; border-radius:8px;"></div>

                    <div style="margin-top: 12px; display: flex; justify-content: space-between; align-items: center;">
                        <span id="linkBackToChooser" style="color: #94a3b8; font-size: 11px; text-decoration: underline; cursor: pointer;">⬅ Cambiar de Cuenta de Google</span>
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
            <div class="liquid-glass-card" style="max-width: 600px; text-align: left;">
                <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 10px; margin-bottom: 14px;">
                    <div>
                        <h3 style="font-size: 16px; font-weight: 800; color: #c084fc;">👑 Panel del Desarrollador — v2.1</h3>
                        <span style="font-size: 11px; color: #94a3b8;">Monitoreo en Tiempo Real, Solicitudes Yape, Permisos Excel y Baneo</span>
                    </div>
                    <button id="btnCloseDevPanel" style="background: none; border: none; color: #94a3b8; font-size: 20px; cursor: pointer;">✕</button>
                </div>

                <!-- ══ GENERADOR Y CONSULTOR MAESTRO DE CLAVES EN VIVO ══ -->
                <div style="background: rgba(116, 34, 132, 0.2); border: 1.5px solid rgba(0, 210, 181, 0.5); border-radius: 14px; padding: 12px 14px; margin-bottom: 14px; box-shadow: 0 4px 20px rgba(0,0,0,0.4);">
                    <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px;">
                        <span style="font-size: 12px; font-weight: 800; color: #00D2B5; display: flex; align-items: center; gap: 6px;">
                            <span>🔑</span> GENERADOR Y CONSULTOR DE CONTRASEÑAS EN LÍNEA
                        </span>
                        <span style="font-size: 10px; color: #cbd5e1; background: rgba(0,0,0,0.4); padding: 2px 7px; border-radius: 6px; font-family: monospace;">SHA-256 Activo</span>
                    </div>
                    <div style="font-size: 11px; color: #94a3b8; margin-bottom: 8px;">
                        Escribe o busca el correo de cualquier alumno (ej: <strong>76185411@continental.edu.pe</strong>) para ver y copiar sus contraseñas al instante:
                    </div>
                    <div style="display: flex; gap: 6px; margin-bottom: 8px;">
                        <input type="text" id="devKeyFinderInput" class="liquid-input" placeholder="Escribe el correo aquí (ej: 76185411@continental.edu.pe)..." style="margin: 0; font-size: 12px; text-align: left; padding: 8px 12px;">
                        <button id="btnDevKeyFinderClear" type="button" style="background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.15); color: #cbd5e1; border-radius: 10px; padding: 8px 12px; font-size: 11px; cursor: pointer; white-space: nowrap;">
                            Limpiar
                        </button>
                    </div>

                    <!-- Tarjeta con Resultados de Claves en Tiempo Real -->
                    <div id="devKeyFinderResults" style="background: rgba(0,0,0,0.45); border: 1px solid rgba(255,255,255,0.1); border-radius: 10px; padding: 10px;">
                    </div>
                </div>

                <!-- Pestañas del Panel de Desarrollador -->
                <div style="display: flex; gap: 4px; border-bottom: 1px solid rgba(255,255,255,0.1); margin-bottom: 12px; overflow-x: auto;">
                    <button class="dev-tab-btn active" data-tab="tabDevPending" style="background:none; border:none; border-bottom:2px solid #00D2B5; color:#00D2B5; font-size:11.5px; font-weight:700; padding:6px 10px; cursor:pointer;">📬 Solicitudes Yape</button>
                    <button class="dev-tab-btn" data-tab="tabDevUsers" style="background:none; border:none; border-bottom:2px solid transparent; color:#94a3b8; font-size:11.5px; font-weight:700; padding:6px 10px; cursor:pointer;">👥 Alumnos Activos / Baneo</button>
                    <button class="dev-tab-btn" data-tab="tabDevExcel" style="background:none; border:none; border-bottom:2px solid transparent; color:#94a3b8; font-size:11.5px; font-weight:700; padding:6px 10px; cursor:pointer;">⭐ Licencias Excel (.xlsx)</button>
                    <button class="dev-tab-btn" data-tab="tabDevProjects" style="background:none; border:none; border-bottom:2px solid transparent; color:#94a3b8; font-size:11.5px; font-weight:700; padding:6px 10px; cursor:pointer;">🌐 Armaduras & Evaluador</button>
                </div>

                <!-- Pestaña 1: Solicitudes Pendientes Yape -->
                <div id="tabDevPending" class="dev-tab-pane" style="display: block;">
                    <div style="font-size: 11.5px; color: #94a3b8; margin-bottom: 8px;">
                        Alumnos que han ingresado su cuenta Google y requieren verificación de pago de S/ 5.00:
                    </div>
                    <div id="devPendingListContainer" style="max-height: 220px; overflow-y: auto; background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; padding: 6px;"></div>
                </div>

                <!-- Pestaña 2: Alumnos Activos y Baneo -->
                <div id="tabDevUsers" class="dev-tab-pane" style="display: none;">
                    <div style="display: flex; gap: 6px; margin-bottom: 4px;">
                        <input type="email" id="devQuickAuthorizeInput" class="liquid-input" placeholder="Activar correo directamente..." style="margin: 0; font-size: 11.5px; text-align: left;">
                        <button id="btnDevQuickAuthorize" class="liquid-btn-primary" style="width: auto; padding: 6px 14px; font-size: 11.5px; white-space: nowrap;">
                            Autorizar
                        </button>
                    </div>
                    <div id="devQuickAuthHint" style="font-size: 11px; color: #38bdf8; margin-bottom: 8px; font-family: monospace; display: none;"></div>
                    <div id="devAuthorizedUsersList" style="max-height: 200px; overflow-y: auto; background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; padding: 6px;"></div>
                </div>

                <!-- Pestaña 3: Licencias y Permisos de Plantilla Excel (.xlsx) -->
                <div id="tabDevExcel" class="dev-tab-pane" style="display: none;">
                    <div style="font-size: 11.5px; color: #94a3b8; margin-bottom: 8px;">
                        Control de Fórmulas VIP: Por defecto los alumnos descargan el informe en PDF no editable. Aquí puedes autorizar la descarga de la plantilla Excel (.xlsx) con fórmulas dinámicas tras verificar su pago adicional.
                    </div>
                    <div style="display: flex; gap: 6px; margin-bottom: 4px;">
                        <input type="email" id="devQuickExcelAuthInput" class="liquid-input" placeholder="Habilitar permiso Excel a correo..." style="margin: 0; font-size: 11.5px; text-align: left;">
                        <button id="btnDevQuickExcelAuth" class="liquid-btn-primary" style="width: auto; padding: 6px 14px; font-size: 11.5px; white-space: nowrap; background: linear-gradient(135deg, #059669, #10b981);">
                            ⭐ Conceder Excel
                        </button>
                    </div>
                    <div id="devQuickExcelHint" style="font-size: 11px; color: #10b981; margin-bottom: 8px; font-family: monospace; display: none;"></div>
                    <div style="font-size: 11px; font-weight: 700; color: #f59e0b; margin-bottom: 4px;">📬 Solicitudes de Alumnos para Plantilla Excel:</div>
                    <div id="devExcelRequestsContainer" style="max-height: 120px; overflow-y: auto; background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.08); border-radius: 10px; padding: 6px; margin-bottom: 10px;"></div>
                    <div style="font-size: 11px; font-weight: 700; color: #38bdf8; margin-bottom: 4px;">👥 Alumnos con Permiso VIP de Excel (.xlsx) Activo:</div>
                    <div id="devExcelAuthorizedList" style="max-height: 120px; overflow-y: auto; background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.08); border-radius: 10px; padding: 6px;"></div>
                </div>

                <!-- Pestaña 4: Todas las Armaduras Guardadas y Centro Evaluador Maestro -->
                <div id="tabDevProjects" class="dev-tab-pane" style="display: none;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                        <span style="font-size: 12px; font-weight: 800; color: #38bdf8;">
                            🌐 CENTRO DE EVALUACIÓN DE ARMADURAS DE ALUMNOS
                        </span>
                        <span style="font-size: 10.5px; color: #10b981; background: rgba(16,185,129,0.15); padding: 2px 7px; border-radius: 6px; border: 1px solid rgba(16,185,129,0.3); font-weight: 700;">
                            ✔ Diagnóstico: Sirve / No Sirve
                        </span>
                    </div>
                    <div style="font-size: 11px; color: #94a3b8; margin-bottom: 10px; line-height: 1.4;">
                        Revisa, comprueba estabilidad cinemática ($b + r \ge 2j$), verifica si la matriz de rigidez $[K]$ es invertible ($\det(K) \ne 0$) y corre el cálculo completo de los alumnos al instante:
                    </div>

                    <!-- Caja de Evaluación / Importación Rápida -->
                    <div style="background: rgba(0,0,0,0.35); border: 1px solid rgba(56, 189, 248, 0.3); border-radius: 12px; padding: 10px; margin-bottom: 12px;">
                        <label style="font-size: 11px; font-weight: 700; color: #38bdf8; display: block; margin-bottom: 4px;">
                            ⚡ Evaluar Armadura Enviada por Alumno (WhatsApp, Correo o Enlace):
                        </label>
                        <div style="display: flex; gap: 6px; margin-bottom: 6px;">
                            <input type="text" id="devQuickImportInput" class="liquid-input" placeholder="Pega aquí el enlace #armadura=... o código base64 del alumno..." style="margin: 0; font-size: 11.5px; text-align: left; padding: 7px 10px;">
                            <button id="btnDevQuickImport" class="liquid-btn-primary" style="width: auto; padding: 6px 14px; font-size: 11.5px; white-space: nowrap; background: linear-gradient(135deg, #0284c7, #38bdf8);">
                                ⚡ Evaluar y Cargar
                            </button>
                        </div>
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <span style="font-size: 10.5px; color: #64748b;">¿El alumno te envió un archivo de cálculo?</span>
                            <label style="background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.12); color: #cbd5e1; border-radius: 6px; padding: 3px 8px; font-size: 10.5px; cursor: pointer;">
                                📂 Subir Archivo .armadura
                                <input type="file" id="devFileInputTruss" accept=".armadura,.json" style="display: none;">
                            </label>
                        </div>
                    </div>

                    <!-- Lista de Armaduras de Alumnos Registradas -->
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                        <span style="font-size: 11px; font-weight: 700; color: #cbd5e1;">Armaduras Recibidas y Guardadas:</span>
                        <button id="btnDevLoadDemoTrusses" type="button" style="background: none; border: none; color: #38bdf8; font-size: 10.5px; text-decoration: underline; cursor: pointer;">
                            + Cargar Ejemplos de Prueba
                        </button>
                    </div>
                    <div id="devGlobalProjectsList" style="max-height: 240px; overflow-y: auto; background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; padding: 6px;"></div>
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

        // 3. MODAL DE GESTIÓN DE PROYECTOS Y EVALUADOR (MIS ARMADURAS)
        const projModal = document.createElement('div');
        projModal.id = 'projectsManagerModal';
        projModal.className = 'modal-hidden';

        projModal.innerHTML = `
            <div class="liquid-glass-card" style="max-width: 580px; text-align: left;">
                <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 10px; margin-bottom: 12px;">
                    <div>
                        <h3 style="font-size: 15px; font-weight: 800; color: #38bdf8;">📂 Gestor de Armaduras y Evaluación</h3>
                        <span style="font-size: 11px; color: #94a3b8;">Guarda, comparte por WhatsApp o importa cálculos de alumnos</span>
                    </div>
                    <button id="btnCloseProjModal" style="background: none; border: none; color: #94a3b8; font-size: 20px; cursor: pointer;">✕</button>
                </div>

                <!-- Pestañas del Modal de Proyectos -->
                <div style="display: flex; gap: 4px; border-bottom: 1px solid rgba(255,255,255,0.1); margin-bottom: 12px;">
                    <button id="tabBtnMyProj" class="proj-tab-btn active" style="background:none; border:none; border-bottom:2px solid #38bdf8; color:#38bdf8; font-size:11.5px; font-weight:700; padding:6px 10px; cursor:pointer;">
                        📁 Mis Armaduras Guardadas
                    </button>
                    <button id="tabBtnImportProj" class="proj-tab-btn" style="background:none; border:none; border-bottom:2px solid transparent; color:#94a3b8; font-size:11.5px; font-weight:700; padding:6px 10px; cursor:pointer;">
                        📥 Importar / Evaluar Armadura
                    </button>
                </div>

                <!-- Vista 1: Lista de Armaduras Guardadas -->
                <div id="viewMyProjectsTab" style="display: block;">
                    <div id="myProjectsListContainer" style="max-height: 280px; overflow-y: auto; background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; padding: 6px; margin-bottom: 12px;"></div>
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <span style="font-size: 11px; color: #94a3b8;">Incluye enlace mágico y envío directo por WhatsApp.</span>
                        <button id="btnNewProjectSavePrompt" class="liquid-btn-primary" style="width: auto; padding: 7px 16px; font-size: 12px;">
                            💾 Guardar Armadura Actual
                        </button>
                    </div>
                </div>

                <!-- Vista 2: Importar y Evaluar Armadura de Alumno -->
                <div id="viewImportProjectsTab" style="display: none;">
                    <div style="background: rgba(116, 34, 132, 0.15); border: 1px dashed rgba(116, 34, 132, 0.5); border-radius: 10px; padding: 10px; font-size: 11.5px; color: #cbd5e1; margin-bottom: 12px; line-height: 1.4;">
                        <strong style="color: #ffffff;">⚡ Evaluador Directo:</strong> Pega el enlace de WhatsApp, Teams o código que te envió un alumno para visualizar su estructura y verificar si es estable o tiene fallas.
                    </div>

                    <label style="font-size: 11.5px; font-weight: 700; color: #38bdf8; display: block; margin-bottom: 4px;">
                        Pega aquí el enlace mágico (#armadura=...) o código de la armadura:
                    </label>
                    <textarea id="inputImportTrussCode" class="liquid-input" rows="3" placeholder="Pega el enlace https://...#armadura=... o código base64..." style="font-size: 11.5px; font-family: monospace; resize: none; margin-bottom: 8px;"></textarea>

                    <button id="btnExecuteTrussImport" class="liquid-btn-primary" style="margin-bottom: 14px; background: linear-gradient(135deg, #0284c7, #38bdf8);">
                        ⚡ Cargar y Evaluar Armadura
                    </button>

                    <div style="border-top: 1px solid rgba(255,255,255,0.1); padding-top: 10px;">
                        <label style="font-size: 11.5px; font-weight: 700; color: #cbd5e1; display: block; margin-bottom: 6px;">
                            O sube un archivo de cálculo (.armadura / .json):
                        </label>
                        <div style="display: flex; gap: 8px; align-items: center;">
                            <input type="file" id="inputFileTrussUpload" accept=".armadura,.json" style="font-size: 11px; color: #94a3b8; flex: 1;">
                            <button id="btnUploadTrussFile" class="liquid-btn-primary" style="width: auto; padding: 6px 14px; font-size: 11.5px; white-space: nowrap;">
                                📂 Subir Archivo
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(projModal);

        // 4. MODAL DE AVISO DE DESCARGA PDF Y LICENCIA VIP EXCEL (.XLSX)
        const vipModal = document.createElement('div');
        vipModal.id = 'modalExcelVipNotice';
        vipModal.className = 'modal-hidden';

        vipModal.innerHTML = `
            <div class="liquid-glass-card" style="max-width: 480px; text-align: center;">
                <div style="font-size: 38px; margin-bottom: 4px;">📄🔒</div>
                <h3 style="font-size: 16px; font-weight: 800; color: #ffffff; margin-bottom: 4px;">
                    Informe Técnico en PDF Descargado
                </h3>
                <p style="font-size: 11.5px; color: #10b981; font-weight: 700; margin-bottom: 10px;">
                    ✔ Tu informe oficial de cálculo estructural ha sido generado con éxito en PDF.
                </p>
                <div style="background: rgba(116, 34, 132, 0.15); border: 1px dashed rgba(116, 34, 132, 0.6); border-radius: 12px; padding: 12px; font-size: 11.5px; text-align: left; color: #cbd5e1; line-height: 1.5; margin-bottom: 14px;">
                    <strong style="color: #f8fafc;">Plantilla Maestra en Excel (.xlsx) Protegida:</strong><br>
                    El archivo Excel original con fórmulas matriciales dinámicas completas (<code style="color:#38bdf8;">=MINVERSE</code>, <code style="color:#34d399;">=MMULT</code>) y tablas pedagógicas automatizadas es de propiedad intelectual del <strong>Ing. Ulianov Cuba Valencia</strong>.<br><br>
                    Para obtener el archivo Excel (.xlsx) editable, solicita tu <strong>Licencia VIP</strong> al creador con un aporte adicional.
                </div>
                <div style="background: rgba(0,0,0,0.35); border: 1px solid rgba(255, 255, 255, 0.12); border-radius: 12px; padding: 10px 12px; margin-bottom: 12px; text-align: left;">
                    <label style="font-size: 11px; font-weight: 700; color: #38bdf8; display: block; margin-bottom: 4px;">
                        ¿Ya adquiriste tu Código VIP de Excel con el Ing. Ulianov?
                    </label>
                    <div style="display: flex; gap: 6px;">
                        <input type="text" id="inputExcelVipCode" class="liquid-input" placeholder="Código VIP (VIP-XXXX-XXXX)" style="margin: 0; font-size: 12px; text-align: center; text-transform: uppercase; font-family: monospace;">
                        <button id="btnUnlockExcelWithVipCode" class="liquid-btn-primary" style="width: auto; padding: 6px 14px; font-size: 11.5px; white-space: nowrap; background: linear-gradient(135deg, #059669, #10b981);">
                            🔓 Canjear VIP
                        </button>
                    </div>
                    <div id="vipCodeErrorMsg" style="display:none; color:#f43f5e; font-size:10.5px; font-weight:700; margin-top:4px;"></div>
                </div>
                <div style="display: flex; gap: 8px; justify-content: center;">
                    <button id="btnRequestExcelVip" class="liquid-btn-primary" style="background: linear-gradient(135deg, #059669, #10b981); font-size: 12px; padding: 10px 16px;">
                        📩 Solicitar Plantilla Excel (.xlsx)
                    </button>
                    <button id="btnCloseExcelVipNotice" style="background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.15); color: #cbd5e1; border-radius: 10px; padding: 10px 14px; font-size: 12px; font-weight: 700; cursor: pointer;">
                        Entendido
                    </button>
                </div>
                <div id="excelVipConfirmMsg" style="display:none; color:#10b981; font-size:11.5px; font-weight:700; margin-top:10px;">
                    ✔ ¡Solicitud enviada al Ing. Ulianov Cuba Valencia! Una vez verificado tu pago adicional en el panel de desarrollador, se habilitará la descarga en Excel (.xlsx).
                </div>
            </div>
        `;
        document.body.appendChild(vipModal);

        // ── EVENTOS Y CONTROLADORES DE VISTAS ──────────────────────
        const viewGoogle = document.getElementById('viewGoogleChooser');
        const viewYape   = document.getElementById('viewYapePaywall');
        const viewDev    = document.getElementById('viewDeveloperAccess');

        function switchView(name) {
            viewGoogle.style.display = (name === 'google') ? 'block' : 'none';
            viewYape.style.display   = (name === 'yape') ? 'block' : 'none';
            viewDev.style.display    = (name === 'dev') ? 'block' : 'none';
        }

        // Navegación entre vistas
        document.getElementById('linkDevAccess').onclick = () => switchView('dev');
        document.getElementById('linkDevAccess2').onclick = () => switchView('dev');
        document.getElementById('linkBackFromDev').onclick = () => switchView('google');
        document.getElementById('linkBackToChooser').onclick = () => switchView('google');

        // Renderizar cuentas previamente usadas en este navegador (si existen)
        renderDetectedAccounts();

        // Controladores para los chips de autocompletado (@gmail.com, @continental.edu.pe)
        document.querySelectorAll('.domain-chip').forEach(chip => {
            chip.onclick = () => {
                const input = document.getElementById('userGoogleEmailInput');
                const domain = chip.dataset.domain;
                let val = (input.value || '').trim();
                if (!val) {
                    input.value = domain;
                } else if (val.includes('@')) {
                    val = val.split('@')[0] + domain;
                    input.value = val;
                } else {
                    input.value = val + domain;
                }
                input.focus();
            };
        });

        // Botón Principal: "Continuar con cuenta de Google"
        document.getElementById('btnConfirmGoogleAccount').onclick = () => {
            const chkTerms = document.getElementById('chkTermsAndConditions');
            const errTerms = document.getElementById('termsErrorMsg');
            if (!chkTerms.checked) {
                errTerms.style.display = 'block';
                return;
            }
            errTerms.style.display = 'none';

            const input = document.getElementById('userGoogleEmailInput');
            const entered = (input.value || '').trim();

            if (MASTER_PASSWORDS.includes(entered)) {
                grantDeveloperAccess();
                return;
            }

            if (!entered || !entered.includes('@')) {
                alert("Por favor ingresa tu correo de Google (@gmail.com o @continental.edu.pe).");
                input.focus();
                return;
            }

            const cleanEmail = entered.toLowerCase().trim();
            const cleanName = cleanEmail.split('@')[0];

            saveGoogleAccount(cleanEmail, cleanName);
            processStudentLogin(cleanEmail, cleanName);
        };

        // Procesar login del estudiante
        function processStudentLogin(email, name) {
            const cleanEmail = email.toLowerCase().trim();
            currentSelectedAccount = { email: cleanEmail, name: name };

            if (isUserAuthorized(cleanEmail)) {
                saveSession({ role: 'student', email: cleanEmail, name: name });
                hideModal();
                alert(`✔ ¡Bienvenido de nuevo, ${cleanEmail}!\nTu sesión personal de CEREBRO ESTRUCTURAL v2.1 está activa.`);
                return;
            }

            const accessCode = generateRandomAccessCode(cleanEmail);
            addPendingRequest(cleanEmail, accessCode, name);

            sendNotificationEmail(cleanEmail, name, accessCode);

            const lblEmail = document.getElementById('lblActiveStudentEmail');
            if (lblEmail) lblEmail.textContent = cleanEmail;

            const waLink = document.getElementById('btnYapeWhatsAppLink');
            if (waLink) {
                const textMsg = encodeURIComponent(`Hola Ing. Ulianov Cuba Valencia, he realizado mi pago de Yape (S/ 5.00) para activar mi cuenta: ${cleanEmail}. Por favor indícame mi código de acceso.`);
                waLink.href = `https://api.whatsapp.com/send?text=${textMsg}`;
            }

            switchView('yape');
            document.getElementById('accessPassInput').focus();
        }

        // Validar clave en la pantalla Yape
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
                authorizeUser(currentSelectedAccount.email);
                saveSession({ role: 'student', email: currentSelectedAccount.email, name: currentSelectedAccount.name });
                hideModal();
                updateAppHeader();
                alert(`🎉 ¡Licencia activada con éxito para ${currentSelectedAccount.email}!\nAcceso permanente desbloqueado.`);
            } else {
                errEl.innerHTML = `❌ Código incorrecto para <strong>${currentSelectedAccount.email}</strong>.<br>El creador te brindará tu código en cuanto verifique tu Yape de S/ 5.00.`;
                errEl.style.display = 'block';
            }
        }

        // Login de Desarrollador Maestro
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

        // Consultor Maestro de Claves en Vivo
        const devKeyInput = document.getElementById('devKeyFinderInput');
        if (devKeyInput) {
            devKeyInput.addEventListener('input', () => {
                updateDevKeyFinder(devKeyInput.value);
            });
        }
        const btnClearKey = document.getElementById('btnDevKeyFinderClear');
        if (btnClearKey) {
            btnClearKey.onclick = () => {
                if (devKeyInput) devKeyInput.value = '';
                updateDevKeyFinder('');
            };
        }

        // Hint dinámico al escribir correo en Autorización Rápida
        const devQuickAuthInput = document.getElementById('devQuickAuthorizeInput');
        if (devQuickAuthInput) {
            devQuickAuthInput.addEventListener('input', () => {
                const em = (devQuickAuthInput.value || '').trim().toLowerCase();
                const hint = document.getElementById('devQuickAuthHint');
                if (!hint) return;
                if (em && em.includes('@')) {
                    hint.style.display = 'block';
                    hint.innerHTML = `🔑 Clave asignada: <strong style="color:#00D2B5;">${computeAccessCode(em)}</strong> | VIP: <strong style="color:#38bdf8;">${computeExcelVipCode(em)}</strong>`;
                } else {
                    hint.style.display = 'none';
                }
            });
        }

        // Autorizar rápido alumno en panel
        document.getElementById('btnDevQuickAuthorize').onclick = () => {
            const em = (document.getElementById('devQuickAuthorizeInput').value || '').trim();
            if (em) {
                authorizeUser(em);
                renderDevUsers();
                updateDevKeyFinder(em);
                const code = computeAccessCode(em);
                const vip = computeExcelVipCode(em);
                alert(`✔ Alumno ${em} autorizado con éxito.\n\n🔑 SU CLAVE DE ACCESO ES:\n${code}\n\n⭐ SU CLAVE VIP EXCEL ES:\n${vip}\n\n(Puedes copiar y enviarle esta clave por WhatsApp o Meet para que active su plataforma).`);
            }
        };

        // Hint dinámico al escribir correo en Autorización VIP Excel
        const devQuickExcelInput = document.getElementById('devQuickExcelAuthInput');
        if (devQuickExcelInput) {
            devQuickExcelInput.addEventListener('input', () => {
                const em = (devQuickExcelInput.value || '').trim().toLowerCase();
                const hint = document.getElementById('devQuickExcelHint');
                if (!hint) return;
                if (em && em.includes('@')) {
                    hint.style.display = 'block';
                    hint.innerHTML = `⭐ Clave VIP asignada: <strong style="color:#10b981;">${computeExcelVipCode(em)}</strong>`;
                } else {
                    hint.style.display = 'none';
                }
            });
        }

        // Autorizar permiso Excel VIP rápido en panel
        const btnQuickExcel = document.getElementById('btnDevQuickExcelAuth');
        if (btnQuickExcel) {
            btnQuickExcel.onclick = () => {
                const em = (document.getElementById('devQuickExcelAuthInput').value || '').trim();
                if (em) {
                    grantExcelPermission(em);
                    renderDevExcelAuthorized();
                    renderDevExcelRequests();
                    renderDevUsers();
                    updateDevKeyFinder(em);
                    const vip = computeExcelVipCode(em);
                    alert(`✔ Permiso VIP de descarga Excel (.xlsx) concedido a ${em}.\n\n⭐ SU CÓDIGO VIP ES:\n${vip}`);
                }
            };
        }

        // Eventos de Proyectos Modal (Mis Armaduras & Evaluador)
        document.getElementById('btnCloseProjModal').onclick = () => {
            document.getElementById('projectsManagerModal').classList.add('modal-hidden');
        };

        document.getElementById('btnNewProjectSavePrompt').onclick = promptSaveProject;

        // Pestañas del Modal de Proyectos (Mis Armaduras vs Importar/Evaluar)
        const tabBtnMyProj = document.getElementById('tabBtnMyProj');
        const tabBtnImportProj = document.getElementById('tabBtnImportProj');
        const viewMyProjectsTab = document.getElementById('viewMyProjectsTab');
        const viewImportProjectsTab = document.getElementById('viewImportProjectsTab');

        if (tabBtnMyProj && tabBtnImportProj) {
            tabBtnMyProj.onclick = () => {
                tabBtnMyProj.style.borderBottom = '2px solid #38bdf8';
                tabBtnMyProj.style.color = '#38bdf8';
                tabBtnImportProj.style.borderBottom = '2px solid transparent';
                tabBtnImportProj.style.color = '#94a3b8';
                if (viewMyProjectsTab) viewMyProjectsTab.style.display = 'block';
                if (viewImportProjectsTab) viewImportProjectsTab.style.display = 'none';
                renderUserProjects();
            };
            tabBtnImportProj.onclick = () => {
                tabBtnImportProj.style.borderBottom = '2px solid #38bdf8';
                tabBtnImportProj.style.color = '#38bdf8';
                tabBtnMyProj.style.borderBottom = '2px solid transparent';
                tabBtnMyProj.style.color = '#94a3b8';
                if (viewMyProjectsTab) viewMyProjectsTab.style.display = 'none';
                if (viewImportProjectsTab) viewImportProjectsTab.style.display = 'block';
            };
        }

        // Botón Importar y Evaluar en modal de alumno
        const btnExecImport = document.getElementById('btnExecuteTrussImport');
        if (btnExecImport) {
            btnExecImport.onclick = () => {
                const code = (document.getElementById('inputImportTrussCode').value || '').trim();
                if (!code) {
                    alert("Por favor pega el enlace mágico (#armadura=...) o código de la armadura.");
                    return;
                }
                const res = importAndLoadTruss(code);
                if (res.success) {
                    document.getElementById('projectsManagerModal').classList.add('modal-hidden');
                }
            };
        }

        // Subir archivo .armadura en modal de alumno
        const fileInputModal = document.getElementById('inputFileTrussUpload');
        const btnUploadModal = document.getElementById('btnUploadTrussFile');
        if (fileInputModal && btnUploadModal) {
            btnUploadModal.onclick = () => fileInputModal.click();
            fileInputModal.onchange = (e) => {
                const file = e.target.files && e.target.files[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = (evt) => {
                    const res = importAndLoadTruss(evt.target.result);
                    if (res.success) {
                        document.getElementById('projectsManagerModal').classList.add('modal-hidden');
                    }
                };
                reader.readAsText(file);
            };
        }

        // Botón Importar y Evaluar Rápido en Panel de Desarrollador (Pestaña 4)
        const btnDevQuickImport = document.getElementById('btnDevQuickImport');
        if (btnDevQuickImport) {
            btnDevQuickImport.onclick = () => {
                const val = (document.getElementById('devQuickImportInput').value || '').trim();
                if (!val) {
                    alert("Por favor ingresa el enlace o código enviado por el alumno.");
                    return;
                }
                const res = importAndLoadTruss(val);
                if (res.success) {
                    hideDevPanel();
                }
            };
        }

        // Subir archivo .armadura en Panel de Desarrollador (Pestaña 4)
        const devFileInput = document.getElementById('devFileInputTruss');
        if (devFileInput) {
            devFileInput.onchange = (e) => {
                const file = e.target.files && e.target.files[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = (evt) => {
                    const res = importAndLoadTruss(evt.target.result);
                    if (res.success) {
                        hideDevPanel();
                    }
                };
                reader.readAsText(file);
            };
        }

        // Cargar Ejemplos de Demostración en Panel de Desarrollador
        const btnDemoTrusses = document.getElementById('btnDevLoadDemoTrusses');
        if (btnDemoTrusses) {
            btnDemoTrusses.onclick = loadDemoTrusses;
        }

        // Eventos de Modal Aviso Excel VIP
        const btnUnlockVip = document.getElementById('btnUnlockExcelWithVipCode');
        if (btnUnlockVip) {
            btnUnlockVip.onclick = () => {
                const code = (document.getElementById('inputExcelVipCode').value || '').trim();
                const session = getSession();
                const targetEmail = session ? session.email : (currentSelectedAccount ? currentSelectedAccount.email : '');
                const errVip = document.getElementById('vipCodeErrorMsg');

                if (verifyExcelVipCode(targetEmail, code)) {
                    grantExcelPermission(targetEmail);
                    hideExcelVipNotice();
                    const btnDl = document.getElementById('btnDownloadExcel');
                    if (btnDl) {
                        btnDl.disabled = false;
                        btnDl.click();
                    }
                } else {
                    if (errVip) {
                        errVip.textContent = '❌ Código VIP no válido para este correo. Solicítalo al Ing. Ulianov Cuba.';
                        errVip.style.display = 'block';
                    }
                }
            };
        }

        const btnReqExcel = document.getElementById('btnRequestExcelVip');
        if (btnReqExcel) {
            btnReqExcel.onclick = () => {
                requestExcelPermission();
                btnReqExcel.disabled = true;
                btnReqExcel.innerHTML = "✔ Solicitud Registrada";
                btnReqExcel.style.background = "#334155";
                const msg = document.getElementById('excelVipConfirmMsg');
                if (msg) msg.style.display = 'block';
            };
        }

        const btnCloseVip = document.getElementById('btnCloseExcelVipNotice');
        if (btnCloseVip) {
            btnCloseVip.onclick = hideExcelVipNotice;
        }

        // Intentar inicializar Google Identity Services si está configurado
        initGoogleGIS();
    }

    // Renderizar cuentas previamente usadas en este navegador
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
        let html = '';
        accounts.forEach(acc => {
            html += `
                <div class="detected-account-card" data-email="${acc.email}" data-name="${acc.name}">
                    <div class="google-avatar-circle">${acc.avatar || acc.email.charAt(0).toUpperCase()}</div>
                    <div class="detected-account-details">
                        <span class="detected-account-name">${acc.name}</span>
                        <span class="detected-account-email">${acc.email}</span>
                    </div>
                    <span style="font-size: 11px; color: #10b981; font-weight: 700;">Continuar ➔</span>
                </div>
            `;
        });
        listEl.innerHTML = html;

        listEl.querySelectorAll('.detected-account-card').forEach(card => {
            card.onclick = () => {
                const em = card.dataset.email;
                const input = document.getElementById('userGoogleEmailInput');
                if (input) input.value = em;
                document.getElementById('btnConfirmGoogleAccount').click();
            };
        });
    }

    // Inicializar Google Identity Services (GIS) oficial si está configurado
    function initGoogleGIS() {
        const clientId = window.GOOGLE_CLIENT_ID || localStorage.getItem('cerebro_google_client_id');
        if (clientId && typeof google !== 'undefined' && google.accounts && google.accounts.id) {
            try {
                google.accounts.id.initialize({
                    client_id: clientId,
                    callback: (response) => {
                        if (!response || !response.credential) return;
                        try {
                            const base64Url = response.credential.split('.')[1];
                            const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
                            const jsonPayload = decodeURIComponent(atob(base64).split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join(''));
                            const data = JSON.parse(jsonPayload);
                            if (data.email) {
                                saveGoogleAccount(data.email, data.name, data.picture);
                                const input = document.getElementById('userGoogleEmailInput');
                                if (input) input.value = data.email;
                                document.getElementById('btnConfirmGoogleAccount').click();
                            }
                        } catch (e) {
                            console.warn("GIS decode note:", e);
                        }
                    },
                    auto_select: false
                });

                const btnWrap = document.getElementById('googleOfficialBtnWrap');
                if (btnWrap) {
                    google.accounts.id.renderButton(btnWrap, {
                        theme: 'outline',
                        size: 'large',
                        type: 'standard',
                        shape: 'pill',
                        text: 'continue_with',
                        logo_alignment: 'left',
                        width: 340
                    });
                }
            } catch (err) {
                console.log("GIS init note:", err);
            }
        }
    }

    // ── CONSULTOR Y GENERADOR MAESTRO DE CLAVES EN VIVO ────────
    function updateDevKeyFinder(query) {
        const resultsEl = document.getElementById('devKeyFinderResults');
        if (!resultsEl) return;

        const inputEl = document.getElementById('devKeyFinderInput');
        const email = (query !== undefined ? query : (inputEl ? inputEl.value : '')).trim();

        if (!email) {
            const recent = getStoredGoogleAccounts();
            let quickHtml = '';
            if (recent.length > 0) {
                quickHtml = '<div style="margin-top:6px; display:flex; gap:6px; justify-content:center; flex-wrap:wrap;"><span style="font-size:10px; color:#94a3b8;">Recientes:</span>' +
                    recent.slice(0, 3).map(a => `<button type="button" class="btn-quick-key-suggest" data-email="${a.email}" style="background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.15); border-radius:99px; padding:2px 8px; font-size:10px; color:#38bdf8; cursor:pointer;">${a.email}</button>`).join('') +
                    '</div>';
            } else {
                quickHtml = '<div style="margin-top:6px; display:flex; gap:6px; justify-content:center; flex-wrap:wrap;"><span style="font-size:10px; color:#94a3b8;">Prueba rápida (Google Meet):</span><button type="button" class="btn-quick-key-suggest" data-email="76185411@continental.edu.pe" style="background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.15); border-radius:99px; padding:2px 8px; font-size:10px; color:#38bdf8; cursor:pointer;">76185411@continental.edu.pe (Yoder)</button></div>';
            }

            resultsEl.innerHTML = `
                <div style="text-align:center; padding:10px 8px; color:#94a3b8; font-size:11.5px; line-height:1.5;">
                    💡 Escribe o pega cualquier correo para calcular al instante su <strong>Código de Acceso</strong> y su <strong>Código VIP Excel</strong>.
                    ${quickHtml}
                </div>
            `;

            resultsEl.querySelectorAll('.btn-quick-key-suggest').forEach(b => {
                b.onclick = () => {
                    if (inputEl) inputEl.value = b.dataset.email;
                    updateDevKeyFinder(b.dataset.email);
                };
            });
            return;
        }

        const cleanEmail = email.toLowerCase().trim();
        const accessKey = computeAccessCode(cleanEmail);
        const vipKey = computeExcelVipCode(cleanEmail);
        const isAuth = isUserAuthorized(cleanEmail);
        const hasVip = hasExcelPermission(cleanEmail);

        resultsEl.innerHTML = `
            <div style="text-align:left;">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px; border-bottom:1px solid rgba(255,255,255,0.08); padding-bottom:6px;">
                    <div style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap; max-width:70%;">
                        <span style="font-size:12px; font-weight:800; color:#ffffff; font-family:monospace;">${cleanEmail}</span>
                    </div>
                    <div style="display:flex; gap:4px; flex-shrink:0;">
                        <span style="font-size:10px; padding:1px 6px; border-radius:99px; background:${isAuth ? 'rgba(16,185,129,0.15)' : 'rgba(245,158,11,0.15)'}; color:${isAuth ? '#10b981' : '#f59e0b'}; font-weight:700;">
                            ${isAuth ? '✔ Plataforma Activa' : '⏳ Sin Activar'}
                        </span>
                        <span style="font-size:10px; padding:1px 6px; border-radius:99px; background:${hasVip ? 'rgba(16,185,129,0.15)' : 'rgba(148,163,184,0.1)'}; color:${hasVip ? '#10b981' : '#94a3b8'}; font-weight:700;">
                            ${hasVip ? '⭐ VIP Excel' : '📄 Solo PDF'}
                        </span>
                    </div>
                </div>

                <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-bottom:8px;">
                    <!-- Tarjeta Clave Plataforma -->
                    <div style="background:rgba(0,210,181,0.08); border:1px solid rgba(0,210,181,0.35); border-radius:8px; padding:8px; text-align:center;">
                        <div style="font-size:10px; color:#94a3b8; font-weight:700; margin-bottom:2px;">🔑 Clave Plataforma (Yape S/ 5)</div>
                        <div style="font-family:monospace; font-size:15px; font-weight:900; color:#00D2B5; letter-spacing:1px; margin-bottom:4px;">
                            ${accessKey}
                        </div>
                        <button type="button" class="btn-copy-calc-key" style="background:#00D2B5; color:#0f172a; border:none; border-radius:6px; padding:3px 10px; font-size:10.5px; font-weight:800; cursor:pointer; width:100%;">
                            📋 Copiar Clave
                        </button>
                    </div>

                    <!-- Tarjeta Clave VIP Excel -->
                    <div style="background:rgba(56,189,248,0.08); border:1px solid rgba(56,189,248,0.35); border-radius:8px; padding:8px; text-align:center;">
                        <div style="font-size:10px; color:#94a3b8; font-weight:700; margin-bottom:2px;">⭐ Clave VIP Excel (.xlsx)</div>
                        <div style="font-family:monospace; font-size:15px; font-weight:900; color:#38bdf8; letter-spacing:1px; margin-bottom:4px;">
                            ${vipKey}
                        </div>
                        <button type="button" class="btn-copy-calc-vip" style="background:#0284c7; color:#ffffff; border:none; border-radius:6px; padding:3px 10px; font-size:10.5px; font-weight:800; cursor:pointer; width:100%;">
                            📋 Copiar VIP
                        </button>
                    </div>
                </div>

                <!-- Botón Copiar Mensaje Formateado para WhatsApp / Meet -->
                <button type="button" class="btn-copy-calc-wa" style="width:100%; background:#25D366; color:#ffffff; border:none; border-radius:8px; padding:7px 10px; font-size:11px; font-weight:800; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:6px; margin-bottom:6px; box-shadow:0 2px 8px rgba(37,211,102,0.25);">
                    <span>📲 Copiar Mensaje para WhatsApp / Google Meet</span>
                </button>

                <!-- Acciones Directas en este Navegador -->
                <div style="display:flex; gap:6px;">
                    <button type="button" class="btn-calc-direct-auth" style="flex:1; background:${isAuth ? '#334155' : 'linear-gradient(135deg, #742284, #9333ea)'}; color:#fff; border:none; border-radius:6px; padding:4px 8px; font-size:10.5px; font-weight:700; cursor:pointer;">
                        ${isAuth ? '✔ Autorizado en este Navegador' : '⚡ Autorizar en este Navegador'}
                    </button>
                    <button type="button" class="btn-calc-direct-vip" style="flex:1; background:${hasVip ? '#334155' : 'linear-gradient(135deg, #059669, #10b981)'}; color:#fff; border:none; border-radius:6px; padding:4px 8px; font-size:10.5px; font-weight:700; cursor:pointer;">
                        ${hasVip ? '✔ VIP Concedido' : '⭐ Conceder VIP Excel'}
                    </button>
                </div>
            </div>
        `;

        resultsEl.querySelector('.btn-copy-calc-key').onclick = () => {
            copyToClipboard(accessKey, `✔ Clave de acceso copiada:\n${accessKey}`);
        };

        resultsEl.querySelector('.btn-copy-calc-vip').onclick = () => {
            copyToClipboard(vipKey, `✔ Clave VIP de Excel copiada:\n${vipKey}`);
        };

        resultsEl.querySelector('.btn-copy-calc-wa').onclick = () => {
            const waMsg = `Hola! Tu código de acceso personal para CEREBRO ESTRUCTURAL v2.1 es:
🔑 CÓDIGO: ${accessKey}
(Vinculado a tu correo: ${cleanEmail})

Ingrésalo en la pantalla de Yape para activar tu licencia permanente y acceder a todas las funciones.
Ing. Ulianov Cuba Valencia`;
            copyToClipboard(waMsg, `✔ Mensaje listo para WhatsApp / Meet copiado al portapapeles:\n\n${waMsg}`);
        };

        resultsEl.querySelector('.btn-calc-direct-auth').onclick = () => {
            authorizeUser(cleanEmail);
            renderDevUsers();
            updateDevKeyFinder(cleanEmail);
            alert(`✔ Alumno ${cleanEmail} autorizado con éxito en este navegador.`);
        };

        resultsEl.querySelector('.btn-calc-direct-vip').onclick = () => {
            grantExcelPermission(cleanEmail);
            renderDevExcelAuthorized();
            renderDevUsers();
            updateDevKeyFinder(cleanEmail);
            alert(`✔ Licencia VIP Excel concedida a ${cleanEmail}.`);
        };
    }

    // ── RENDERIZADO EN PANEL DE DESARROLLADOR ────────────────────
    function renderDevPending() {
        const c = document.getElementById('devPendingListContainer');
        if (!c) return;
        const list = getPendingRequests();

        if (list.length === 0) {
            c.innerHTML = `
                <div style="padding:16px; text-align:center; color:#94a3b8; font-size:11.5px; line-height:1.6;">
                    <div style="font-size:24px; margin-bottom:4px;">🌐</div>
                    <strong style="color:#ffffff;">Activación en Línea para Compañeros en Remoto:</strong><br>
                    Cuando un compañero en Google Meet ingrese su correo en su propia laptop,<br>
                    <strong>escribe su correo en el Generador de Claves de arriba</strong> (ej: <code style="color:#00D2B5;">76185411@continental.edu.pe</code>), copia su código y envíaselo por chat o WhatsApp. ¡Se activará de inmediato en su máquina!
                </div>
            `;
            return;
        }

        let html = '';
        list.forEach(item => {
            const code = computeAccessCode(item.email);
            html += `
                <div style="background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.07); border-radius:10px; padding:10px; margin-bottom:6px;">
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <strong style="color:#ffffff; font-size:12px;">${item.email}</strong>
                        <span style="font-size:10px; color:#94a3b8;">${item.requestedAt}</span>
                    </div>
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-top:6px;">
                        <span style="font-family:monospace; font-weight:800; color:#00D2B5; font-size:14px; background:rgba(0,210,181,0.1); padding:2px 8px; border-radius:6px; border:1px solid rgba(0,210,181,0.3);">
                            ${code}
                        </span>
                        <div style="display:flex; gap:6px;">
                            <button data-code="${code}" class="btn-copy-code" style="background:#334155; color:#fff; border:none; border-radius:6px; padding:4px 8px; font-size:11px; cursor:pointer;">📋 Copiar</button>
                            <button data-email="${item.email}" class="btn-approve-pending" style="background:#10b981; color:#fff; border:none; border-radius:6px; padding:4px 8px; font-size:11px; font-weight:700; cursor:pointer;">✔ Aprobar Yape</button>
                        </div>
                    </div>
                </div>
            `;
        });
        c.innerHTML = html;

        c.querySelectorAll('.btn-copy-code').forEach(b => {
            b.onclick = () => {
                copyToClipboard(b.dataset.code, `Código ${b.dataset.code} copiado al portapapeles.`);
            };
        });

        c.querySelectorAll('.btn-approve-pending').forEach(b => {
            b.onclick = () => {
                const em = b.dataset.email;
                authorizeUser(em);
                renderDevPending();
                renderDevUsers();
                updateDevKeyFinder(em);
                alert(`✔ Alumno ${em} aprobado y activado permanentemente.`);
            };
        });
    }

    function renderDevUsers() {
        const c = document.getElementById('devAuthorizedUsersList');
        if (!c) return;
        const list = getAuthorizedUsers();

        if (list.length === 0) {
            c.innerHTML = `<div style="padding:16px; text-align:center; color:#64748b; font-size:11px;">No hay alumnos registrados aún en este navegador. Escribe el correo arriba para autorizarlo.</div>`;
            return;
        }

        let html = '';
        list.forEach(email => {
            const hasVip = hasExcelPermission(email);
            const accessKey = computeAccessCode(email);
            const vipKey = computeExcelVipCode(email);
            html += `
                <div style="display:flex; justify-content:space-between; align-items:center; padding:8px 10px; border-bottom:1px solid rgba(255,255,255,0.06); font-size:11.5px;">
                    <div>
                        <div style="color:#e2e8f0; font-family:monospace; font-weight:700;">🟢 ${email}</div>
                        <div style="display:flex; gap:6px; align-items:center; margin-top:3px; flex-wrap:wrap;">
                            <span style="font-size:10.5px; color:#00D2B5; font-family:monospace; background:rgba(0,210,181,0.12); padding:1px 6px; border-radius:4px; border:1px solid rgba(0,210,181,0.25);">
                                🔑 ${accessKey}
                            </span>
                            <button data-code="${accessKey}" class="btn-copy-user-code" style="background:#334155; color:#cbd5e1; border:none; border-radius:4px; padding:1px 6px; font-size:10px; cursor:pointer;" title="Copiar código de acceso">📋 Copiar</button>
                            ${hasVip ? 
                                `<span style="font-size:10px; color:#10b981; background:rgba(16,185,129,0.15); padding:1px 6px; border-radius:4px; font-family:monospace;">⭐ VIP: ${vipKey}</span>` : 
                                `<span style="font-size:10px; color:#94a3b8; background:rgba(255,255,255,0.05); padding:1px 6px; border-radius:4px;">📄 Solo PDF</span>`
                            }
                        </div>
                    </div>
                    <div style="display:flex; gap:6px;">
                        <button data-email="${email}" class="btn-inspect-user" style="background:#6366f1; color:#fff; border:none; border-radius:6px; padding:3px 8px; font-size:10.5px; font-weight:700; cursor:pointer;" title="Cargar en el Generador">🔍 Ver Claves</button>
                        <button data-email="${email}" class="btn-ban-user" style="background:#dc2626; color:#fff; border:none; border-radius:6px; padding:3px 8px; font-size:10.5px; font-weight:700; cursor:pointer;" title="Bloquear y desconectar inmediatamente">🚫 Banear</button>
                    </div>
                </div>
            `;
        });
        c.innerHTML = html;

        c.querySelectorAll('.btn-copy-user-code').forEach(b => {
            b.onclick = () => {
                copyToClipboard(b.dataset.code, `Código ${b.dataset.code} copiado al portapapeles.`);
            };
        });

        c.querySelectorAll('.btn-inspect-user').forEach(b => {
            b.onclick = () => {
                const em = b.dataset.email;
                const input = document.getElementById('devKeyFinderInput');
                if (input) {
                    input.value = em;
                    updateDevKeyFinder(em);
                    input.scrollIntoView({ behavior: 'smooth' });
                }
            };
        });

        c.querySelectorAll('.btn-ban-user').forEach(b => {
            b.onclick = () => {
                const em = b.dataset.email;
                if (confirm(`¿Estás seguro de banear y desconectar a ${em}?`)) {
                    banUser(em);
                    renderDevUsers();
                    renderDevExcelAuthorized();
                    updateDevKeyFinder();
                }
            };
        });
    }

    function renderDevExcelRequests() {
        const c = document.getElementById('devExcelRequestsContainer');
        if (!c) return;
        const list = getExcelRequests().filter(r => r.status === 'PENDING');

        if (list.length === 0) {
            c.innerHTML = `<div style="padding:12px; text-align:center; color:#64748b; font-size:11px;">No hay solicitudes de plantilla Excel pendientes.</div>`;
            return;
        }

        let html = '';
        list.forEach(r => {
            html += `
                <div style="display:flex; justify-content:space-between; align-items:center; padding:6px 8px; border-bottom:1px solid rgba(255,255,255,0.05); font-size:11px;">
                    <div>
                        <strong style="color:#ffffff;">${r.email}</strong>
                        <span style="font-size:10px; color:#94a3b8; margin-left:6px;">(${r.requestedAt})</span>
                    </div>
                    <button data-email="${r.email}" class="btn-grant-excel-vip" style="background:#059669; color:#fff; border:none; border-radius:6px; padding:3px 8px; font-size:11px; font-weight:700; cursor:pointer;">
                        ⭐ Habilitar Excel
                    </button>
                </div>
            `;
        });
        c.innerHTML = html;

        c.querySelectorAll('.btn-grant-excel-vip').forEach(b => {
            b.onclick = () => {
                const em = b.dataset.email;
                grantExcelPermission(em);
                renderDevExcelRequests();
                renderDevExcelAuthorized();
                renderDevUsers();
                updateDevKeyFinder(em);
                alert(`✔ Permiso de descarga de plantilla Excel (.xlsx) concedido a ${em}.`);
            };
        });
    }

    function renderDevExcelAuthorized() {
        const c = document.getElementById('devExcelAuthorizedList');
        if (!c) return;
        const list = getExcelAuthorizedUsers();

        if (list.length === 0) {
            c.innerHTML = `<div style="padding:12px; text-align:center; color:#64748b; font-size:11px;">Aún ningún alumno tiene permiso VIP para Excel.</div>`;
            return;
        }

        let html = '';
        list.forEach(email => {
            const vipKey = computeExcelVipCode(email);
            html += `
                <div style="display:flex; justify-content:space-between; align-items:center; padding:6px 8px; border-bottom:1px solid rgba(255,255,255,0.05); font-size:11px;">
                    <div>
                        <span style="color:#38bdf8; font-family:monospace; font-weight:700;">⭐ ${email}</span>
                        <span style="color:#10b981; font-family:monospace; font-size:10px; margin-left:6px; background:rgba(16,185,129,0.1); padding:1px 5px; border-radius:4px;">${vipKey}</span>
                        <button data-code="${vipKey}" class="btn-copy-vip-item" style="background:#334155; color:#cbd5e1; border:none; border-radius:4px; padding:1px 5px; font-size:9.5px; cursor:pointer; margin-left:4px;">Copiar</button>
                    </div>
                    <button data-email="${email}" class="btn-revoke-excel-vip" style="background:#dc2626; color:#fff; border:none; border-radius:6px; padding:2px 6px; font-size:10px; cursor:pointer;" title="Revocar a Solo PDF">
                        ✕ Quitar
                    </button>
                </div>
            `;
        });
        c.innerHTML = html;

        c.querySelectorAll('.btn-copy-vip-item').forEach(b => {
            b.onclick = () => {
                copyToClipboard(b.dataset.code, `Código VIP ${b.dataset.code} copiado al portapapeles.`);
            };
        });

        c.querySelectorAll('.btn-revoke-excel-vip').forEach(b => {
            b.onclick = () => {
                const em = b.dataset.email;
                if (confirm(`¿Revocar permiso Excel a ${em}? Solo podrá descargar PDF.`)) {
                    revokeExcelPermission(em);
                    renderDevExcelAuthorized();
                    renderDevUsers();
                    updateDevKeyFinder();
                }
            };
        });
    }

    function loadDemoTrusses() {
        const list = getAllProjects();
        const demo1 = {
            id: 'demo_iso_3n',
            name: 'Caso Alumno 1: Isostática 3N (Aprobada)',
            authorEmail: 'alumno1@continental.edu.pe',
            role: 'student',
            createdAt: new Date().toLocaleString(),
            nodes: [
                { id: 1, x: 0, y: 0, support: "Móvil Y", px: 0, py: 0 },
                { id: 2, x: -700, y: 0, support: "Fijo", px: 0, py: 0 },
                { id: 3, x: -400, y: 500, support: "Libre", px: 4000, py: -5000 }
            ],
            bars: [
                { id: 1, start: 1, end: 3, a: 10, e: 2100000 },
                { id: 2, start: 2, end: 3, a: 10, e: 2100000 },
                { id: 3, start: 2, end: 1, a: 10, e: 2100000 }
            ]
        };
        const demo2 = {
            id: 'demo_unstable_mecanismo',
            name: 'Caso Alumno 2: Incompleta (Mecanismo Inestable)',
            authorEmail: 'alumno2@continental.edu.pe',
            role: 'student',
            createdAt: new Date().toLocaleString(),
            nodes: [
                { id: 1, x: 0, y: 0, support: "Libre", px: 0, py: 0 },
                { id: 2, x: 500, y: 0, support: "Móvil Y", px: 0, py: 0 },
                { id: 3, x: 250, y: 300, support: "Libre", px: 1000, py: -2000 }
            ],
            bars: [
                { id: 1, start: 1, end: 3, a: 10, e: 2100000 }
            ]
        };
        const demo3 = {
            id: 'demo_yoder_warren',
            name: 'Caso Yoder: Warren 5N (Hiperestática)',
            authorEmail: '76185411@continental.edu.pe',
            role: 'student',
            createdAt: new Date().toLocaleString(),
            nodes: [
                { id: 1, x: 0, y: 0, support: "Fijo", px: 0, py: 0 },
                { id: 2, x: 300, y: 250, support: "Libre", px: 0, py: -6000 },
                { id: 3, x: 600, y: 0, support: "Móvil Y", px: 0, py: 0 },
                { id: 4, x: 150, y: 125, support: "Libre", px: 0, py: 0 },
                { id: 5, x: 450, y: 125, support: "Libre", px: 0, py: 0 }
            ],
            bars: [
                { id: 1, start: 1, end: 4, a: 15, e: 2100000 },
                { id: 2, start: 4, end: 2, a: 15, e: 2100000 },
                { id: 3, start: 2, end: 5, a: 15, e: 2100000 },
                { id: 4, start: 5, end: 3, a: 15, e: 2100000 },
                { id: 5, start: 1, end: 3, a: 15, e: 2100000 },
                { id: 6, start: 4, end: 5, a: 15, e: 2100000 }
            ]
        };

        [demo1, demo2, demo3].forEach(demo => {
            if (!list.find(p => p.id === demo.id)) {
                list.unshift(demo);
            }
        });
        setStoredJSON(KEY_PROJECTS, list);
        renderDevGlobalProjects();
        renderUserProjects();
        alert("✔ Se cargaron 3 ejemplos de armaduras de alumnos en la lista.\nObserva el diagnóstico que indica automáticamente cuáles sirven y cuáles no.");
    }

    function renderDevGlobalProjects() {
        const c = document.getElementById('devGlobalProjectsList');
        if (!c) return;
        const list = getAllProjects();

        if (list.length === 0) {
            c.innerHTML = `
                <div style="padding:18px; text-align:center; color:#94a3b8; font-size:11.5px; line-height:1.5;">
                    <span style="font-size:22px; display:block; margin-bottom:4px;">📂</span>
                    Aún no tienes armaduras de alumnos importadas en este navegador.<br>
                    <span style="color:#64748b; font-size:11px;">Pega arriba el enlace o código que te envió el alumno por WhatsApp o haz clic en "Cargar Ejemplos de Prueba".</span>
                </div>
            `;
            return;
        }

        let html = '';
        list.forEach(p => {
            const health = evaluateTrussHealth(p.nodes, p.bars);
            const activeNodes = (p.nodes || []).filter(n => n && n.x !== null && n.x !== undefined && n.x !== "").length;
            const activeBars = (p.bars || []).filter(b => b && b.start && b.end).length;

            html += `
                <div style="background:rgba(255,255,255,0.03); border:1px solid ${health.ok ? 'rgba(16,185,129,0.25)' : 'rgba(239,68,68,0.25)'}; border-radius:10px; padding:9px 12px; margin-bottom:8px;">
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <div style="display:flex; align-items:center; gap:8px;">
                            <strong style="color:#ffffff; font-size:12.5px;">${p.name}</strong>
                            <span style="font-size:10px; font-weight:800; color:${health.badgeColor}; background:${health.ok ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)'}; border:1px solid ${health.badgeColor}; padding:2px 6px; border-radius:4px;">
                                ${health.status}
                            </span>
                        </div>
                        <span style="font-size:10.5px; color:#94a3b8;">${p.createdAt || ''}</span>
                    </div>
                    
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-top:5px; font-size:11px;">
                        <span style="color:#38bdf8; font-family:monospace;">👤 ${p.authorEmail}</span>
                        <span style="color:#94a3b8;">${activeNodes} Nudos • ${activeBars} Barras</span>
                    </div>

                    <div style="font-size:10.5px; color:${health.ok ? '#94a3b8' : '#f87171'}; margin-top:4px; line-height:1.3;">
                        ${health.summary}
                    </div>

                    <div style="display:flex; justify-content:flex-end; gap:6px; margin-top:8px; border-top:1px solid rgba(255,255,255,0.05); padding-top:6px;">
                        <button data-id="${p.id}" class="btn-dev-load-proj" style="background:#0284c7; color:#fff; border:none; border-radius:6px; padding:4px 10px; font-size:11px; font-weight:700; cursor:pointer;">
                            ⚡ Cargar en Pantalla
                        </button>
                        <button data-id="${p.id}" class="btn-dev-copy-proj" style="background:rgba(255,255,255,0.08); color:#cbd5e1; border:1px solid rgba(255,255,255,0.15); border-radius:6px; padding:4px 8px; font-size:11px; cursor:pointer;" title="Copiar Enlace Mágico">
                            🔗 Enlace
                        </button>
                        <button data-id="${p.id}" class="btn-dev-dl-proj" style="background:rgba(255,255,255,0.08); color:#cbd5e1; border:1px solid rgba(255,255,255,0.15); border-radius:6px; padding:4px 8px; font-size:11px; cursor:pointer;" title="Descargar .armadura">
                            💾 Archivo
                        </button>
                        <button data-id="${p.id}" class="btn-dev-del-proj" style="background:#dc2626; color:#fff; border:none; border-radius:6px; padding:4px 8px; font-size:11px; cursor:pointer;" title="Eliminar">
                            ✕
                        </button>
                    </div>
                </div>
            `;
        });
        c.innerHTML = html;

        c.querySelectorAll('.btn-dev-load-proj').forEach(b => {
            b.onclick = () => {
                const proj = list.find(p => p.id === b.dataset.id);
                if (proj && window.CerebroApp && window.CerebroApp.loadProjectData) {
                    window.CerebroApp.loadProjectData(proj.nodes, proj.bars);
                    const health = evaluateTrussHealth(proj.nodes, proj.bars);
                    showTrussEvaluationBanner(proj, health);
                    hideDevPanel();
                }
            };
        });

        c.querySelectorAll('.btn-dev-copy-proj').forEach(b => {
            b.onclick = () => {
                const proj = list.find(p => p.id === b.dataset.id);
                if (proj) {
                    const url = generateTrussShareUrl(proj);
                    copyToClipboard(url, "Enlace Mágico de armadura copiado.");
                }
            };
        });

        c.querySelectorAll('.btn-dev-dl-proj').forEach(b => {
            b.onclick = () => {
                const proj = list.find(p => p.id === b.dataset.id);
                if (proj) {
                    downloadTrussFile(proj);
                }
            };
        });

        c.querySelectorAll('.btn-dev-del-proj').forEach(b => {
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
            c.innerHTML = `
                <div style="padding:22px; text-align:center; color:#94a3b8; font-size:11.5px; line-height:1.5;">
                    <span style="font-size:22px; display:block; margin-bottom:4px;">📐</span>
                    No tienes armaduras guardadas todavía.<br>
                    <span style="color:#64748b; font-size:11px;">Haz clic en <strong>'Guardar Armadura Actual'</strong> para guardar tu cálculo y generar tu enlace de WhatsApp para el Ing. Ulianov.</span>
                </div>
            `;
            return;
        }

        let html = '';
        list.forEach(p => {
            const health = evaluateTrussHealth(p.nodes, p.bars);
            const activeNodes = (p.nodes || []).filter(n => n && n.x !== null && n.x !== undefined && n.x !== "").length;
            const activeBars = (p.bars || []).filter(b => b && b.start && b.end).length;
            const shareUrl = generateTrussShareUrl(p);
            const waMsg = encodeURIComponent(`Hola Ing. Ulianov, le envío mi cálculo de armadura "${p.name}" para revisión: ${shareUrl}`);

            html += `
                <div style="background:rgba(255,255,255,0.03); border:1px solid ${health.ok ? 'rgba(16,185,129,0.25)' : 'rgba(239,68,68,0.25)'}; border-radius:10px; padding:9px 12px; margin-bottom:8px;">
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <div style="display:flex; align-items:center; gap:8px;">
                            <strong style="color:#ffffff; font-size:12.5px;">${p.name}</strong>
                            <span style="font-size:10px; font-weight:800; color:${health.badgeColor}; background:${health.ok ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)'}; border:1px solid ${health.badgeColor}; padding:2px 6px; border-radius:4px;">
                                ${health.status}
                            </span>
                        </div>
                        <span style="font-size:10.5px; color:#94a3b8;">${p.createdAt || ''}</span>
                    </div>

                    <div style="display:flex; justify-content:space-between; align-items:center; margin-top:5px; font-size:11px;">
                        <span style="color:#cbd5e1;">${activeNodes} Nudos • ${activeBars} Barras</span>
                        <span style="font-size:10.5px; color:#94a3b8;">${health.ghStr || ''}</span>
                    </div>

                    <div style="display:flex; justify-content:flex-end; gap:6px; margin-top:8px; border-top:1px solid rgba(255,255,255,0.05); padding-top:6px; flex-wrap:wrap;">
                        <button data-id="${p.id}" class="btn-load-my-proj" style="background:#0284c7; color:#fff; border:none; border-radius:6px; padding:4px 10px; font-size:11px; font-weight:700; cursor:pointer;">
                            ⚡ Cargar
                        </button>
                        <a href="https://api.whatsapp.com/send?text=${waMsg}" target="_blank" rel="noopener noreferrer" style="background:#25D366; color:#ffffff; text-decoration:none; border-radius:6px; padding:4px 9px; font-size:11px; font-weight:700; display:inline-flex; align-items:center; gap:4px;">
                            📲 WhatsApp al Ing. Ulianov
                        </a>
                        <button data-id="${p.id}" class="btn-copy-my-proj" style="background:rgba(255,255,255,0.08); color:#cbd5e1; border:1px solid rgba(255,255,255,0.15); border-radius:6px; padding:4px 8px; font-size:11px; cursor:pointer;" title="Copiar Enlace Mágico">
                            🔗 Enlace
                        </button>
                        <button data-id="${p.id}" class="btn-dl-my-proj" style="background:rgba(255,255,255,0.08); color:#cbd5e1; border:1px solid rgba(255,255,255,0.15); border-radius:6px; padding:4px 8px; font-size:11px; cursor:pointer;" title="Descargar .armadura">
                            💾 Archivo
                        </button>
                        <button data-id="${p.id}" class="btn-del-my-proj" style="background:#334155; color:#f43f5e; border:none; border-radius:6px; padding:4px 8px; font-size:11px; cursor:pointer;" title="Eliminar">
                            ✕
                        </button>
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
                    const health = evaluateTrussHealth(proj.nodes, proj.bars);
                    showTrussEvaluationBanner(proj, health);
                    document.getElementById('projectsManagerModal').classList.add('modal-hidden');
                }
            };
        });

        c.querySelectorAll('.btn-copy-my-proj').forEach(b => {
            b.onclick = () => {
                const proj = list.find(p => p.id === b.dataset.id);
                if (proj) {
                    const url = generateTrussShareUrl(proj);
                    copyToClipboard(url, "Enlace Mágico copiado al portapapeles. ¡Listo para enviar!");
                }
            };
        });

        c.querySelectorAll('.btn-dl-my-proj').forEach(b => {
            b.onclick = () => {
                const proj = list.find(p => p.id === b.dataset.id);
                if (proj) {
                    downloadTrussFile(proj);
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
            const saved = saveProject(name.trim(), data.nodes, data.bars);
            renderUserProjects();
            renderDevGlobalProjects();
            const shareUrl = generateTrussShareUrl(saved);
            if (confirm(`✔ Armadura '${name.trim()}' guardada con éxito.\n\n¿Deseas copiar el Enlace Mágico para enviarlo al Ing. Ulianov por WhatsApp?`)) {
                copyToClipboard(shareUrl, "Enlace copiado al portapapeles. Puedes pegarlo en WhatsApp para el Ing. Ulianov.");
            }
        }
    }

    // ── CONTROL DE VISIBILIDAD DE MODALES ───────────────────────
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

        if (pendingSharedTruss) {
            const p = pendingSharedTruss;
            pendingSharedTruss = null;
            setTimeout(() => {
                importAndLoadTruss(p, { silent: true });
            }, 400);
        }
    }

    function showDevPanel() {
        buildModals();
        updateDevKeyFinder();
        renderDevPending();
        renderDevUsers();
        renderDevExcelRequests();
        renderDevExcelAuthorized();
        renderDevGlobalProjects();
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
                btn.innerHTML = "📩 Solicitar Plantilla Excel (.xlsx)";
                btn.style.background = "linear-gradient(135deg, #059669, #10b981)";
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

    // ── INTEGRACIÓN Y BOTONES EN HEADER ─────────────────────────
    function updateAppHeader() {
        const session = getSession();
        const authOk = isAuthorized();

        // Botón Bloquear / Salir
        const btnRelock = document.getElementById('btnRelock');
        if (btnRelock) {
            btnRelock.style.display = authOk ? 'inline-flex' : 'none';
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
            btnOwnerPanel.style.display = (authOk && session && session.role === 'owner') ? 'inline-flex' : 'none';
        }

        // Botones de Guardar y Ver Proyectos
        const btnSave = document.getElementById('btnSaveProject');
        if (btnSave) {
            btnSave.onclick = promptSaveProject;
            btnSave.style.display = authOk ? 'inline-flex' : 'none';
        }

        const btnMyProj = document.getElementById('btnMyProjects');
        if (btnMyProj) {
            btnMyProj.onclick = showProjectsModal;
            btnMyProj.style.display = authOk ? 'inline-flex' : 'none';
        }
    }

    // ── INICIALIZACIÓN ──────────────────────────────────────────
    function init() {
        buildModals();
        updateAppHeader();

        if (isAuthorized()) {
            hideModal();
        } else {
            showModal();
        }

        checkUrlForSharedTruss();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // API Global
    window.CerebroAuth = {
        isAuthorized: isAuthorized,
        hasExcelPermission: hasExcelPermission,
        grantExcelPermission: grantExcelPermission,
        revokeExcelPermission: revokeExcelPermission,
        requestExcelPermission: requestExcelPermission,
        computeAccessCode: computeAccessCode,
        computeExcelVipCode: computeExcelVipCode,
        verifyAccessCode: verifyAccessCode,
        verifyExcelVipCode: verifyExcelVipCode,
        generateTrussShareUrl: generateTrussShareUrl,
        importAndLoadTruss: importAndLoadTruss,
        evaluateTrussHealth: evaluateTrussHealth,
        downloadTrussFile: downloadTrussFile,
        showExcelVipNotice: showExcelVipNotice,
        hideExcelVipNotice: hideExcelVipNotice,
        getSession: getSession,
        openDevPanel: showDevPanel,
        openProjects: showProjectsModal,
        saveProject: saveProject,
        lock: logoutSession
    };

})();
