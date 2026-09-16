module.exports = [
"[externals]/next/dist/compiled/next-server/app-page-turbo.runtime.dev.js [external] (next/dist/compiled/next-server/app-page-turbo.runtime.dev.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/compiled/next-server/app-page-turbo.runtime.dev.js", () => require("next/dist/compiled/next-server/app-page-turbo.runtime.dev.js"));

module.exports = mod;
}),
"[externals]/util [external] (util, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("util", () => require("util"));

module.exports = mod;
}),
"[externals]/crypto [external] (crypto, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("crypto", () => require("crypto"));

module.exports = mod;
}),
"[externals]/process [external] (process, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("process", () => require("process"));

module.exports = mod;
}),
"[externals]/tls [external] (tls, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("tls", () => require("tls"));

module.exports = mod;
}),
"[externals]/fs [external] (fs, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("fs", () => require("fs"));

module.exports = mod;
}),
"[externals]/os [external] (os, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("os", () => require("os"));

module.exports = mod;
}),
"[externals]/net [external] (net, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("net", () => require("net"));

module.exports = mod;
}),
"[externals]/events [external] (events, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("events", () => require("events"));

module.exports = mod;
}),
"[externals]/stream [external] (stream, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("stream", () => require("stream"));

module.exports = mod;
}),
"[externals]/path [external] (path, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("path", () => require("path"));

module.exports = mod;
}),
"[externals]/http2 [external] (http2, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("http2", () => require("http2"));

module.exports = mod;
}),
"[externals]/http [external] (http, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("http", () => require("http"));

module.exports = mod;
}),
"[externals]/url [external] (url, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("url", () => require("url"));

module.exports = mod;
}),
"[externals]/dns [external] (dns, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("dns", () => require("dns"));

module.exports = mod;
}),
"[externals]/zlib [external] (zlib, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("zlib", () => require("zlib"));

module.exports = mod;
}),
"[project]/src/lib/firebase.ts [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "analytics",
    ()=>analytics,
    "auth",
    ()=>auth,
    "canUseAnalytics",
    ()=>canUseAnalytics,
    "canWriteAdminNotifications",
    ()=>canWriteAdminNotifications,
    "db",
    ()=>db,
    "default",
    ()=>__TURBOPACK__default__export__,
    "isFirebaseConfigured",
    ()=>isFirebaseConfigured,
    "storage",
    ()=>storage
]);
// Firebase Configuration
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$firebase$2f$app$2f$dist$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/node_modules/firebase/app/dist/index.mjs [app-ssr] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$firebase$2f$app$2f$dist$2f$esm$2f$index$2e$esm$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@firebase/app/dist/esm/index.esm.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$firebase$2f$auth$2f$dist$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/node_modules/firebase/auth/dist/index.mjs [app-ssr] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$firebase$2f$auth$2f$dist$2f$node$2d$esm$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@firebase/auth/dist/node-esm/index.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$firebase$2f$firestore$2f$dist$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/node_modules/firebase/firestore/dist/index.mjs [app-ssr] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$firebase$2f$firestore$2f$dist$2f$index$2e$node$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@firebase/firestore/dist/index.node.mjs [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$firebase$2f$storage$2f$dist$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/node_modules/firebase/storage/dist/index.mjs [app-ssr] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$firebase$2f$storage$2f$dist$2f$node$2d$esm$2f$index$2e$node$2e$esm$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@firebase/storage/dist/node-esm/index.node.esm.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$firebase$2f$analytics$2f$dist$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/node_modules/firebase/analytics/dist/index.mjs [app-ssr] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$firebase$2f$analytics$2f$dist$2f$esm$2f$index$2e$esm$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@firebase/analytics/dist/esm/index.esm.js [app-ssr] (ecmascript)");
;
;
;
;
;
const firebaseConfig = {
    apiKey: ("TURBOPACK compile-time value", "AIzaSyC2YAKVh5RP6vTmd2lel-yjH9okQGCKpGw"),
    // Firebase owns the OAuth helper endpoint on this domain. A custom auth
    // domain is safe only when its /__/auth/* routes are configured and verified
    // to proxy to Firebase Hosting, so never substitute the product domain
    // automatically.
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_CUSTOM_AUTH_DOMAIN || ("TURBOPACK compile-time value", "snowd-6ca54.firebaseapp.com"),
    databaseURL: ("TURBOPACK compile-time value", "https://snowd-6ca54-default-rtdb.firebaseio.com"),
    projectId: ("TURBOPACK compile-time value", "snowd-6ca54"),
    storageBucket: ("TURBOPACK compile-time value", "snowd-6ca54.firebasestorage.app"),
    messagingSenderId: ("TURBOPACK compile-time value", "119102068229"),
    appId: ("TURBOPACK compile-time value", "1:119102068229:web:6d1701662dd2bd0a88ae6c"),
    measurementId: ("TURBOPACK compile-time value", "G-JPWKPNY8VK")
};
const isPlaceholderValue = (value)=>{
    if (!value) return true;
    const normalized = value.trim().toLowerCase();
    return normalized.startsWith("your_") || normalized.startsWith("example") || normalized.includes("your_app_id") || normalized.includes("your_project_id") || normalized.includes("your_measurement_id") || normalized.includes("your_api_key") || normalized.includes("your_auth_domain");
};
// Check if Firebase config is valid
const hasRequiredConfig = !!(firebaseConfig.apiKey && firebaseConfig.authDomain && firebaseConfig.projectId && firebaseConfig.appId);
const isFirebaseConfigured = !!(hasRequiredConfig && !isPlaceholderValue(firebaseConfig.apiKey) && !isPlaceholderValue(firebaseConfig.authDomain) && !isPlaceholderValue(firebaseConfig.projectId) && !isPlaceholderValue(firebaseConfig.appId));
const canUseAnalytics = !!(isFirebaseConfigured && firebaseConfig.measurementId && !isPlaceholderValue(firebaseConfig.measurementId));
const canWriteAdminNotifications = isFirebaseConfigured;
// Initialize Firebase (only on client side with valid config)
let app;
let authInstance;
let dbInstance;
let storageInstance;
if (("TURBOPACK compile-time value", "undefined") !== 'undefined' && isFirebaseConfigured) {
    // Only initialize on client side where environment variables are available
    app = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$firebase$2f$app$2f$dist$2f$esm$2f$index$2e$esm$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["getApps"])().length === 0 ? (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$firebase$2f$app$2f$dist$2f$esm$2f$index$2e$esm$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["initializeApp"])(firebaseConfig) : (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$firebase$2f$app$2f$dist$2f$esm$2f$index$2e$esm$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["getApps"])()[0];
    authInstance = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$firebase$2f$auth$2f$dist$2f$node$2d$esm$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["getAuth"])(app);
    dbInstance = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$firebase$2f$firestore$2f$dist$2f$index$2e$node$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["getFirestore"])(app);
    storageInstance = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$firebase$2f$storage$2f$dist$2f$node$2d$esm$2f$index$2e$node$2e$esm$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["getStorage"])(app);
    // Explicit local-only QA mode. Never connect a hosted application to emulators.
    if (("TURBOPACK compile-time value", "true") === "true" && [
        "localhost",
        "127.0.0.1"
    ].includes(window.location.hostname)) {
        const marker = window;
        if (!marker.snowdEmulatorsConnected) {
            (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$firebase$2f$auth$2f$dist$2f$node$2d$esm$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["connectAuthEmulator"])(authInstance, "http://127.0.0.1:9099", {
                disableWarnings: true
            });
            (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$firebase$2f$firestore$2f$dist$2f$index$2e$node$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["connectFirestoreEmulator"])(dbInstance, "127.0.0.1", 8080);
            marker.snowdEmulatorsConnected = true;
        }
    }
}
const auth = authInstance;
const db = dbInstance;
const storage = storageInstance;
const analytics = ("TURBOPACK compile-time value", "undefined") !== 'undefined' && app && canUseAnalytics ? (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$firebase$2f$analytics$2f$dist$2f$esm$2f$index$2e$esm$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["isSupported"])().then((yes)=>yes ? (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$firebase$2f$analytics$2f$dist$2f$esm$2f$index$2e$esm$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["getAnalytics"])(app) : null) : null;
const __TURBOPACK__default__export__ = app;
}),
"[project]/src/lib/adminNotifications.ts [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "sendAdminNotif",
    ()=>sendAdminNotif
]);
/**
 * Admin Notification helpers
 * Writes lightweight events to `adminNotifications` so the admin
 * dashboard can show real-time alerts for new signups and site visits.
 * These writes are allowed by Firestore rules for all users (including
 * unauthenticated visitors) and are read-only for admin/employee roles.
 */ var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$firebase$2f$firestore$2f$dist$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/node_modules/firebase/firestore/dist/index.mjs [app-ssr] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$firebase$2f$firestore$2f$dist$2f$index$2e$node$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@firebase/firestore/dist/index.node.mjs [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$firebase$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/firebase.ts [app-ssr] (ecmascript)");
;
;
async function sendAdminNotif(payload) {
    try {
        if (!__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$firebase$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["canWriteAdminNotifications"] || !__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$firebase$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["db"]) {
            console.warn("[adminNotifications] Skipped write: Firebase is not configured.", payload.type);
            return;
        }
        await (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$firebase$2f$firestore$2f$dist$2f$index$2e$node$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["addDoc"])((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$firebase$2f$firestore$2f$dist$2f$index$2e$node$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["collection"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$firebase$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["db"], "adminNotifications"), {
            ...payload,
            createdAt: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$firebase$2f$firestore$2f$dist$2f$index$2e$node$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["serverTimestamp"])(),
            read: false
        });
    } catch (error) {
        console.error("[adminNotifications] Failed to write admin notification", {
            type: payload.type,
            error
        });
    }
}
}),
"[project]/src/context/AuthContext.tsx [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "AuthProvider",
    ()=>AuthProvider,
    "useAuth",
    ()=>useAuth
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-dev-runtime.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$firebase$2f$auth$2f$dist$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/node_modules/firebase/auth/dist/index.mjs [app-ssr] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$firebase$2f$auth$2f$dist$2f$node$2d$esm$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@firebase/auth/dist/node-esm/index.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$firebase$2f$firestore$2f$dist$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/node_modules/firebase/firestore/dist/index.mjs [app-ssr] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$firebase$2f$firestore$2f$dist$2f$index$2e$node$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@firebase/firestore/dist/index.node.mjs [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$firebase$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/firebase.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$adminNotifications$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/adminNotifications.ts [app-ssr] (ecmascript)");
"use client";
;
;
;
;
;
;
const AuthContext = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["createContext"])(undefined);
function AuthProvider({ children }) {
    const [user, setUser] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(null);
    const [profile, setProfile] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(null);
    const [loading, setLoading] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$firebase$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["isFirebaseConfigured"]);
    const fetchProfile = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useCallback"])(async (uid)=>{
        try {
            const docRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$firebase$2f$firestore$2f$dist$2f$index$2e$node$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["doc"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$firebase$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["db"], "users", uid);
            const docSnap = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$firebase$2f$firestore$2f$dist$2f$index$2e$node$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["getDoc"])(docRef);
            if (docSnap.exists()) {
                setProfile(docSnap.data());
            } else {
                setProfile(null);
            }
        } catch (error) {
            console.error("Error fetching profile:", error);
            setProfile(null);
        }
    }, []);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        if (!__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$firebase$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["isFirebaseConfigured"] || !__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$firebase$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["auth"] || !__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$firebase$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["db"]) {
            return;
        }
        let profileUnsubscribe = null;
        const unsubscribe = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$firebase$2f$auth$2f$dist$2f$node$2d$esm$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["onAuthStateChanged"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$firebase$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["auth"], async (firebaseUser)=>{
            setUser(firebaseUser);
            // Clean up previous profile listener
            if (profileUnsubscribe) {
                profileUnsubscribe();
            }
            if (firebaseUser) {
                const docRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$firebase$2f$firestore$2f$dist$2f$index$2e$node$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["doc"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$firebase$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["db"], "users", firebaseUser.uid);
                // Gate watch setup behind a readable one-time fetch to avoid repeating
                // watch-stream permission errors when Firestore rules are stale/deployed incorrectly.
                try {
                    const initialSnap = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$firebase$2f$firestore$2f$dist$2f$index$2e$node$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["getDoc"])(docRef);
                    if (initialSnap.exists()) {
                        setProfile(initialSnap.data());
                        if (initialSnap.data().isOnline !== true) {
                            void (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$firebase$2f$firestore$2f$dist$2f$index$2e$node$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["updateDoc"])(docRef, {
                                isOnline: true
                            }).catch((error)=>console.error("Could not update presence", error));
                        }
                    } else {
                        setProfile(null);
                    }
                    profileUnsubscribe = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$firebase$2f$firestore$2f$dist$2f$index$2e$node$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["onSnapshot"])(docRef, (docSnap)=>{
                        if (docSnap.exists()) {
                            setProfile(docSnap.data());
                        } else {
                            setProfile(null);
                        }
                        setLoading(false);
                    }, (error)=>{
                        const code = error.code || "";
                        if (code === "permission-denied") {
                            console.warn("Profile realtime listener disabled due to Firestore permission-denied.");
                        } else {
                            console.error("Error listening to profile:", error);
                        }
                        setLoading(false);
                    });
                } catch (error) {
                    const code = error.code || "";
                    if (code === "permission-denied") {
                        console.warn("Profile read denied by Firestore rules. Falling back to auth-only session state.");
                    } else {
                        console.error("Error fetching initial profile:", error);
                    }
                    setProfile(null);
                    setLoading(false);
                }
            } else {
                setProfile(null);
                setLoading(false);
            }
        });
        return ()=>{
            unsubscribe();
            if (profileUnsubscribe) {
                profileUnsubscribe();
            }
        };
    }, []);
    const signInWithGoogle = async ()=>{
        if (!__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$firebase$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["isFirebaseConfigured"] || !__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$firebase$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["auth"]) {
            throw new Error("Firebase is not configured. Add valid NEXT_PUBLIC_FIREBASE_* values in .env.local");
        }
        const provider = new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$firebase$2f$auth$2f$dist$2f$node$2d$esm$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["GoogleAuthProvider"]();
        const cred = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$firebase$2f$auth$2f$dist$2f$node$2d$esm$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["signInWithPopup"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$firebase$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["auth"], provider);
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$adminNotifications$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["sendAdminNotif"])({
            type: "login",
            message: `User logged in: ${cred.user.email ?? "Google user"}`,
            uid: cred.user.uid,
            meta: {
                email: cred.user.email ?? ""
            }
        });
        // Notify admin if this is a first-time Google signup
        if (cred.user.metadata.creationTime === cred.user.metadata.lastSignInTime) {
            (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$adminNotifications$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["sendAdminNotif"])({
                type: "signup",
                message: `New Google signup: ${cred.user.email}`,
                uid: cred.user.uid,
                meta: {
                    email: cred.user.email ?? ""
                }
            });
        }
        return cred.user;
    };
    const signInWithEmailPassword = async (email, password)=>{
        if (!__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$firebase$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["isFirebaseConfigured"] || !__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$firebase$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["auth"]) {
            throw new Error("Firebase is not configured. Add valid NEXT_PUBLIC_FIREBASE_* values in .env.local");
        }
        const cred = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$firebase$2f$auth$2f$dist$2f$node$2d$esm$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["signInWithEmailAndPassword"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$firebase$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["auth"], email, password);
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$adminNotifications$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["sendAdminNotif"])({
            type: "login",
            message: `User logged in: ${cred.user.email ?? "email user"}`,
            uid: cred.user.uid,
            meta: {
                email: cred.user.email ?? ""
            }
        });
        return cred.user;
    };
    const signOut = async ()=>{
        if (!__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$firebase$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["isFirebaseConfigured"] || !__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$firebase$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["auth"]) return;
        // Clear state immediately so UI responds before the async call finishes
        setUser(null);
        setProfile(null);
        await (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$firebase$2f$auth$2f$dist$2f$node$2d$esm$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["signOut"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$firebase$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["auth"]);
    };
    const deleteAccount = async ()=>{
        if (!__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$firebase$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["isFirebaseConfigured"] || !__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$firebase$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["auth"] || !__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$firebase$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["db"]) {
            throw new Error("Firebase is not configured. Add valid NEXT_PUBLIC_FIREBASE_* values in .env.local");
        }
        if (!user) throw new Error("No user logged in");
        const accountHistoryRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$firebase$2f$firestore$2f$dist$2f$index$2e$node$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["doc"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$firebase$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["db"], "accountHistory", encodeURIComponent((user.email || "").trim().toLowerCase()));
        await (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$firebase$2f$firestore$2f$dist$2f$index$2e$node$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["setDoc"])(accountHistoryRef, {
            email: (user.email || "").trim().toLowerCase(),
            deletedAccountIds: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$firebase$2f$firestore$2f$dist$2f$index$2e$node$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["arrayUnion"])(user.uid),
            updatedAt: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$firebase$2f$firestore$2f$dist$2f$index$2e$node$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["serverTimestamp"])()
        }, {
            merge: true
        });
        // Remove the private profile before Auth deletion while the user's credentials
        // still authorize the Firestore delete.
        await (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$firebase$2f$firestore$2f$dist$2f$index$2e$node$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["deleteDoc"])((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$firebase$2f$firestore$2f$dist$2f$index$2e$node$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["doc"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$firebase$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["db"], "users", user.uid));
        await (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$firebase$2f$auth$2f$dist$2f$node$2d$esm$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["deleteUser"])(user);
        setUser(null);
        setProfile(null);
    };
    const refreshProfile = async ()=>{
        if (user) {
            await fetchProfile(user.uid);
        }
    };
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(AuthContext.Provider, {
        value: {
            user,
            profile,
            loading,
            signInWithGoogle,
            signInWithEmailPassword,
            signOut,
            refreshProfile,
            deleteAccount
        },
        children: children
    }, void 0, false, {
        fileName: "[project]/src/context/AuthContext.tsx",
        lineNumber: 208,
        columnNumber: 5
    }, this);
}
function useAuth() {
    const ctx = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useContext"])(AuthContext);
    if (!ctx) throw new Error("useAuth must be used within AuthProvider");
    return ctx;
}
}),
"[externals]/next/dist/server/app-render/action-async-storage.external.js [external] (next/dist/server/app-render/action-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/server/app-render/action-async-storage.external.js", () => require("next/dist/server/app-render/action-async-storage.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/app-render/work-unit-async-storage.external.js [external] (next/dist/server/app-render/work-unit-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/server/app-render/work-unit-async-storage.external.js", () => require("next/dist/server/app-render/work-unit-async-storage.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/app-render/work-async-storage.external.js [external] (next/dist/server/app-render/work-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/server/app-render/work-async-storage.external.js", () => require("next/dist/server/app-render/work-async-storage.external.js"));

module.exports = mod;
}),
"[project]/src/components/support/browser-support.module.css [app-ssr] (css module)", ((__turbopack_context__) => {

__turbopack_context__.v({
  "actions": "browser-support-module__T6_vAq__actions",
  "clicked": "browser-support-module__T6_vAq__clicked",
  "consent": "browser-support-module__T6_vAq__consent",
  "controls": "browser-support-module__T6_vAq__controls",
  "end": "browser-support-module__T6_vAq__end",
  "error": "browser-support-module__T6_vAq__error",
  "incoming": "browser-support-module__T6_vAq__incoming",
  "panel": "browser-support-module__T6_vAq__panel",
  "pointer": "browser-support-module__T6_vAq__pointer",
  "preview": "browser-support-module__T6_vAq__preview",
  "video": "browser-support-module__T6_vAq__video",
  "wide": "browser-support-module__T6_vAq__wide",
});
}),
"[project]/src/components/support/BrowserSupport.tsx [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>BrowserSupport,
    "useBrowserSupport",
    ()=>useBrowserSupport
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-dev-runtime.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/navigation.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$dom$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-dom.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$context$2f$AuthContext$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/context/AuthContext.tsx [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$support$2f$browser$2d$support$2e$module$2e$css__$5b$app$2d$ssr$5d$__$28$css__module$29$__ = __turbopack_context__.i("[project]/src/components/support/browser-support.module.css [app-ssr] (css module)");
"use client";
;
;
;
;
;
;
const SupportContext = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["createContext"])({
    start: ()=>{},
    busy: false
});
const useBrowserSupport = ()=>(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useContext"])(SupportContext);
function Media({ stream, muted = false, video = true, onPointer }) {
    const ref = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useRef"])(null);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        if (ref.current) {
            ref.current.srcObject = stream;
            void ref.current.play().catch(()=>{});
        }
    }, [
        stream
    ]);
    if (!video) return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("audio", {
        ref: ref,
        autoPlay: true,
        controls: true,
        "aria-label": "Call audio"
    }, void 0, false, {
        fileName: "[project]/src/components/support/BrowserSupport.tsx",
        lineNumber: 18,
        columnNumber: 22
    }, this);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("video", {
        ref: ref,
        autoPlay: true,
        playsInline: true,
        muted: muted,
        className: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$support$2f$browser$2d$support$2e$module$2e$css__$5b$app$2d$ssr$5d$__$28$css__module$29$__["default"].video,
        onPointerLeave: ()=>onPointer?.(null),
        onPointerMove: (event)=>{
            const el = event.currentTarget, rect = el.getBoundingClientRect();
            if (!el.videoWidth || !el.videoHeight) return;
            const scale = Math.min(rect.width / el.videoWidth, rect.height / el.videoHeight);
            const width = el.videoWidth * scale, height = el.videoHeight * scale;
            const x = (event.clientX - rect.left - (rect.width - width) / 2) / width;
            const y = (event.clientY - rect.top - (rect.height - height) / 2) / height;
            onPointer?.(x >= 0 && x <= 1 && y >= 0 && y <= 1 ? {
                x,
                y,
                click: false
            } : null);
        },
        onClick: (event)=>{
            const el = event.currentTarget, rect = el.getBoundingClientRect();
            if (!el.videoWidth || !el.videoHeight) return;
            const scale = Math.min(rect.width / el.videoWidth, rect.height / el.videoHeight);
            const width = el.videoWidth * scale, height = el.videoHeight * scale;
            const x = (event.clientX - rect.left - (rect.width - width) / 2) / width;
            const y = (event.clientY - rect.top - (rect.height - height) / 2) / height;
            if (x >= 0 && x <= 1 && y >= 0 && y <= 1) onPointer?.({
                x,
                y,
                click: true
            });
        }
    }, void 0, false, {
        fileName: "[project]/src/components/support/BrowserSupport.tsx",
        lineNumber: 19,
        columnNumber: 10
    }, this);
}
async function localDescription(pc, type) {
    await pc.setLocalDescription(type === "offer" ? await pc.createOffer() : await pc.createAnswer());
    if (pc.iceGatheringState !== "complete") await new Promise((resolve, reject)=>{
        const timeout = setTimeout(()=>{
            pc.removeEventListener("icegatheringstatechange", listener);
            reject(new Error("Connection setup timed out. Please try again."));
        }, 15000);
        const listener = ()=>{
            if (pc.iceGatheringState === "complete") {
                clearTimeout(timeout);
                pc.removeEventListener("icegatheringstatechange", listener);
                resolve();
            }
        };
        pc.addEventListener("icegatheringstatechange", listener);
        listener();
    });
    return pc.localDescription?.toJSON();
}
function BrowserSupport({ children }) {
    const { user, profile } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$context$2f$AuthContext$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useAuth"])();
    const pathname = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["usePathname"])();
    const staff = profile?.role === "admin" || profile?.role === "employee";
    const [incoming, setIncoming] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])([]);
    const [call, setCall] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(null);
    const [busy, setBusy] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(false);
    const [status, setStatus] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])("");
    const [error, setError] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])("");
    const [connected, setConnected] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(false);
    const [muted, setMuted] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(false);
    const [camera, setCamera] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(null);
    const [screen, setScreen] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(null);
    const [audio, setAudio] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(null);
    const [remoteCamera, setRemoteCamera] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(null);
    const [remoteScreen, setRemoteScreen] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(null);
    const [remoteSharing, setRemoteSharing] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])({
        camera: false,
        screen: false,
        guidance: false
    });
    const [guidance, setGuidance] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(false);
    const [pointer, setPointer] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(null);
    const [expanded, setExpanded] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(true);
    const [mediaBusy, setMediaBusy] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(false);
    const pcRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useRef"])(null);
    const channel = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useRef"])(null);
    const streams = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useRef"])([]);
    const activeId = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useRef"])(null);
    const generation = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useRef"])(0);
    const busyRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useRef"])(false);
    const pointerTimer = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useRef"])(null);
    const sharing = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useRef"])({
        camera: false,
        screen: false,
        guidance: false
    });
    const lastPoint = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useRef"])(0);
    const ringtone = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useRef"])(null);
    const connectionTimer = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useRef"])(null);
    const api = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useCallback"])(async (params)=>{
        if (!user) throw new Error("Please sign in to call support.");
        const res = await fetch(`/api/support-calls${typeof params === "string" ? params : ""}`, {
            method: typeof params === "string" ? "GET" : "POST",
            headers: {
                Authorization: `Bearer ${await user.getIdToken()}`,
                "Content-Type": "application/json"
            },
            ...typeof params === "string" ? {} : {
                body: JSON.stringify(params)
            }
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Call unavailable.");
        return data;
    }, [
        user
    ]);
    const send = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useCallback"])((data)=>{
        if (channel.current?.readyState === "open") channel.current.send(JSON.stringify(data));
    }, []);
    const clean = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useCallback"])(()=>{
        generation.current++;
        if (connectionTimer.current) clearTimeout(connectionTimer.current);
        setMediaBusy(false);
        streams.current.forEach((stream)=>stream.getTracks().forEach((track)=>track.stop()));
        streams.current = [];
        if (pcRef.current) {
            pcRef.current.onconnectionstatechange = null;
            pcRef.current.close();
        }
        pcRef.current = null;
        channel.current = null;
        activeId.current = null;
        busyRef.current = false;
        sharing.current = {
            camera: false,
            screen: false,
            guidance: false
        };
        if (pointerTimer.current) clearTimeout(pointerTimer.current);
        setCall(null);
        setBusy(false);
        setConnected(false);
        setCamera(null);
        setScreen(null);
        setAudio(null);
        setRemoteCamera(null);
        setRemoteScreen(null);
        setPointer(null);
        setGuidance(false);
        setMuted(false);
        setRemoteSharing({
            camera: false,
            screen: false,
            guidance: false
        });
    }, []);
    const end = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useCallback"])(async ()=>{
        const id = activeId.current;
        send({
            type: "end"
        });
        clean();
        setStatus("");
        if (id) try {
            await api({
                action: "end",
                id
            });
        } catch (e) {
            setError(e.message);
        }
    }, [
        api,
        clean,
        send
    ]);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        return ()=>{
            const id = activeId.current;
            if (id) void api({
                action: "end",
                id
            }).catch(()=>{});
            clean();
        };
    }, [
        api,
        clean
    ]);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        if (!user || !staff || !pathname.startsWith("/admin") || busy) return;
        let cancelled = false, timer;
        const poll = async ()=>{
            try {
                const result = await api("");
                if (!cancelled) setIncoming(result.calls);
            } catch  {
                if (!cancelled) setIncoming([]);
            }
            if (!cancelled) timer = setTimeout(poll, 4000);
        };
        void poll();
        return ()=>{
            cancelled = true;
            clearTimeout(timer);
        };
    }, [
        api,
        user,
        staff,
        pathname,
        busy
    ]);
    const ringingId = !busy && staff && pathname.startsWith("/admin") ? incoming[0]?.id : undefined;
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        if (!ringingId) return;
        const title = document.title;
        document.title = "Incoming support call · SNOWD";
        const context = new AudioContext();
        ringtone.current = context;
        const ring = ()=>{
            if (context.state !== "running") return;
            for (const offset of [
                0,
                0.35
            ]){
                const tone = context.createOscillator(), gain = context.createGain();
                tone.frequency.value = 660;
                gain.gain.value = 0.035;
                tone.connect(gain);
                gain.connect(context.destination);
                tone.start(context.currentTime + offset);
                tone.stop(context.currentTime + offset + 0.18);
            }
        };
        ring();
        const timer = setInterval(ring, 4000);
        return ()=>{
            clearInterval(timer);
            void context.close();
            ringtone.current = null;
            document.title = title;
        };
    }, [
        ringingId
    ]);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        if (!call) return;
        let cancelled = false, timer, lastHeartbeat = 0, lastSuccess = Date.now();
        const poll = async ()=>{
            try {
                const data = await api(`?id=${call.id}`);
                if (cancelled) return;
                lastSuccess = Date.now();
                if (data.status === "ended") {
                    clean();
                    setStatus("Call ended or was not answered. You can try again or call 437-922-3895.");
                    return;
                }
                const pc = pcRef.current;
                if (!staff && data.answer && pc && !pc.currentRemoteDescription) await pc.setRemoteDescription(data.answer);
                if (data.status === "active" && Date.now() - lastHeartbeat > 30000) {
                    await api({
                        action: "heartbeat",
                        id: call.id
                    });
                    lastHeartbeat = Date.now();
                }
            } catch (e) {
                if (!cancelled) {
                    setError(e.message);
                    if (Date.now() - lastSuccess > 30000) {
                        clean();
                        setStatus("Call ended after losing the support connection.");
                        return;
                    }
                }
            }
            if (!cancelled) timer = setTimeout(poll, 2000);
        };
        void poll();
        return ()=>{
            cancelled = true;
            clearTimeout(timer);
        };
    }, [
        call,
        api,
        staff,
        clean
    ]);
    const wireChannel = (dc)=>{
        channel.current = dc;
        dc.onopen = ()=>send({
                type: "sharing",
                ...sharing.current
            });
        dc.onmessage = (event)=>{
            try {
                const data = JSON.parse(event.data);
                if (data.type === "end") {
                    const id = activeId.current;
                    clean();
                    setStatus("Call ended.");
                    if (id) void api({
                        action: "end",
                        id
                    }).catch(()=>{});
                }
                if (staff && data.type === "sharing") setRemoteSharing({
                    camera: data.camera === true,
                    screen: data.screen === true,
                    guidance: data.guidance === true
                });
                if (!staff && data.type === "pointer" && sharing.current.screen && sharing.current.guidance) {
                    if (pointerTimer.current) clearTimeout(pointerTimer.current);
                    if (Number.isFinite(data.x) && Number.isFinite(data.y) && data.x >= 0 && data.x <= 1 && data.y >= 0 && data.y <= 1) {
                        setPointer({
                            x: data.x,
                            y: data.y,
                            click: data.click === true
                        });
                        pointerTimer.current = setTimeout(()=>setPointer(null), 1500);
                    } else setPointer(null);
                }
            } catch  {}
        };
    };
    const begin = async (incomingCall)=>{
        if (busyRef.current) return;
        busyRef.current = true;
        setBusy(true);
        setExpanded(true);
        setError("");
        setStatus(incomingCall ? "Answering…" : "Starting browser call…");
        const attempt = ++generation.current;
        try {
            if (!navigator.mediaDevices?.getUserMedia || !window.RTCPeerConnection) throw new Error("Browser calling requires HTTPS and a browser with microphone support.");
            const mic = await navigator.mediaDevices.getUserMedia({
                audio: true,
                video: false
            });
            if (attempt !== generation.current) {
                mic.getTracks().forEach((track)=>track.stop());
                return;
            }
            streams.current.push(mic);
            const config = await api("?config=1");
            if (attempt !== generation.current) return;
            const pc = new RTCPeerConnection(config);
            pcRef.current = pc;
            pc.onconnectionstatechange = ()=>{
                if (connectionTimer.current) clearTimeout(connectionTimer.current);
                if ([
                    "connecting",
                    "disconnected"
                ].includes(pc.connectionState)) connectionTimer.current = setTimeout(()=>{
                    setError("Connection lost. Please call again.");
                    void end();
                }, 30000);
                if (pc.connectionState === "connected") {
                    setConnected(true);
                    setStatus("Connected to support");
                    setError("");
                }
                if (pc.connectionState === "disconnected") setStatus("Connection interrupted. Reconnecting…");
                if (pc.connectionState === "failed") {
                    setError("The call could not connect. Try another network or call 437-922-3895.");
                    void end();
                }
            };
            pc.ontrack = (event)=>{
                const stream = new MediaStream([
                    event.track
                ]);
                if (event.track.kind === "audio") setAudio(stream);
                else if (pc.getTransceivers().indexOf(event.transceiver) === 1) setRemoteCamera(stream);
                else setRemoteScreen(stream);
            };
            if (incomingCall) {
                const data = await api(`?id=${incomingCall.id}`);
                if (attempt !== generation.current) return;
                if (data.status !== "ringing" || !data.offer) throw new Error("This call is no longer ringing.");
                pc.ondatachannel = (event)=>wireChannel(event.channel);
                await pc.setRemoteDescription(data.offer);
                const audioTransceiver = pc.getTransceivers()[0];
                await audioTransceiver.sender.replaceTrack(mic.getAudioTracks()[0]);
                audioTransceiver.direction = "sendrecv";
                pc.getTransceivers().slice(1).forEach((transceiver)=>{
                    transceiver.direction = "recvonly";
                });
                const answer = await localDescription(pc, "answer");
                if (attempt !== generation.current) return;
                await api({
                    action: "answer",
                    id: incomingCall.id,
                    answer
                });
                if (attempt !== generation.current) {
                    void api({
                        action: "end",
                        id: incomingCall.id
                    }).catch(()=>{});
                    return;
                }
                activeId.current = incomingCall.id;
                setCall(incomingCall);
                setIncoming([]);
                setStatus("Connecting…");
            } else {
                pc.addTransceiver(mic.getAudioTracks()[0], {
                    direction: "sendrecv",
                    streams: [
                        mic
                    ]
                });
                pc.addTransceiver("video", {
                    direction: "sendonly"
                });
                pc.addTransceiver("video", {
                    direction: "sendonly"
                });
                wireChannel(pc.createDataChannel("support-guidance"));
                const offer = await localDescription(pc, "offer");
                if (attempt !== generation.current) return;
                const result = await api({
                    action: "start",
                    offer
                });
                if (attempt !== generation.current) {
                    void api({
                        action: "end",
                        id: result.id
                    }).catch(()=>{});
                    return;
                }
                activeId.current = result.id;
                setCall({
                    id: result.id,
                    callerName: "SNOWD Support"
                });
                setStatus("Calling support… Waiting for an admin to answer.");
            }
        } catch (e) {
            if (attempt === generation.current) {
                clean();
                setStatus("");
                setError(e.message);
            }
        }
    };
    const toggleMedia = async (kind)=>{
        if (mediaBusy || !connected) return;
        setMediaBusy(true);
        setError("");
        const pc = pcRef.current;
        const existing = kind === "camera" ? camera : screen;
        const update = (stream)=>{
            if (kind === "camera") setCamera(stream);
            else {
                setScreen(stream);
                setGuidance(false);
                setPointer(null);
                sharing.current.guidance = false;
            }
            sharing.current[kind] = Boolean(stream);
            send({
                type: "sharing",
                ...sharing.current
            });
        };
        try {
            const sender = pc?.getTransceivers()[kind === "camera" ? 1 : 2]?.sender;
            if (!sender) return;
            if (existing) {
                await sender.replaceTrack(null);
                existing.getTracks().forEach((track)=>track.stop());
                update(null);
                return;
            }
            if (kind === "screen" && !navigator.mediaDevices.getDisplayMedia) throw new Error("Screen sharing is unavailable in this browser. Try a desktop browser.");
            const stream = kind === "camera" ? await navigator.mediaDevices.getUserMedia({
                video: true,
                audio: false
            }) : await navigator.mediaDevices.getDisplayMedia({
                video: true,
                audio: false,
                preferCurrentTab: true
            });
            if (pc !== pcRef.current) {
                stream.getTracks().forEach((track)=>track.stop());
                return;
            }
            streams.current.push(stream);
            try {
                await sender.replaceTrack(stream.getVideoTracks()[0]);
            } catch (e) {
                stream.getTracks().forEach((track)=>track.stop());
                throw e;
            }
            update(stream);
            stream.getVideoTracks()[0].onended = ()=>{
                if (pc === pcRef.current) {
                    void sender.replaceTrack(null).catch(()=>{});
                    update(null);
                }
            };
        } catch (e) {
            setError(e.message);
        } finally{
            setMediaBusy(false);
        }
    };
    const sendPointer = (point)=>{
        if (!remoteSharing.screen || !remoteSharing.guidance) return;
        if (point && !point.click && Date.now() - lastPoint.current < 50) return;
        lastPoint.current = Date.now();
        send({
            type: "pointer",
            ...point
        });
    };
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(SupportContext.Provider, {
        value: {
            start: ()=>{
                void begin();
            },
            busy
        },
        children: [
            children,
            typeof document !== "undefined" && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$dom$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["createPortal"])(/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Fragment"], {
                children: [
                    pointer && !staff && screen && guidance && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: `${__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$support$2f$browser$2d$support$2e$module$2e$css__$5b$app$2d$ssr$5d$__$28$css__module$29$__["default"].pointer} ${pointer.click ? __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$support$2f$browser$2d$support$2e$module$2e$css__$5b$app$2d$ssr$5d$__$28$css__module$29$__["default"].clicked : ""}`,
                        style: {
                            left: `${pointer.x * 100}vw`,
                            top: `${pointer.y * 100}vh`
                        },
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                children: "↖"
                            }, void 0, false, {
                                fileName: "[project]/src/components/support/BrowserSupport.tsx",
                                lineNumber: 283,
                                columnNumber: 197
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("b", {
                                children: [
                                    "Support",
                                    pointer.click ? " · click" : ""
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/components/support/BrowserSupport.tsx",
                                lineNumber: 283,
                                columnNumber: 211
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/components/support/BrowserSupport.tsx",
                        lineNumber: 283,
                        columnNumber: 51
                    }, this),
                    (busy || error || status || staff && pathname.startsWith("/admin") && incoming.length > 0) && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("section", {
                        className: `${__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$support$2f$browser$2d$support$2e$module$2e$css__$5b$app$2d$ssr$5d$__$28$css__module$29$__["default"].panel} ${staff && expanded && remoteSharing.screen ? __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$support$2f$browser$2d$support$2e$module$2e$css__$5b$app$2d$ssr$5d$__$28$css__module$29$__["default"].wide : ""}`,
                        "aria-label": "Browser support call",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("header", {
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("strong", {
                                        children: busy ? staff ? `Call with ${call?.callerName || "caller"}` : "SNOWD browser support" : "Support calls"
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/support/BrowserSupport.tsx",
                                        lineNumber: 285,
                                        columnNumber: 17
                                    }, this),
                                    busy && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                        onClick: ()=>setExpanded(!expanded),
                                        children: expanded ? "Minimize" : "Expand"
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/support/BrowserSupport.tsx",
                                        lineNumber: 285,
                                        columnNumber: 149
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/components/support/BrowserSupport.tsx",
                                lineNumber: 285,
                                columnNumber: 9
                            }, this),
                            status && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                role: "status",
                                children: status
                            }, void 0, false, {
                                fileName: "[project]/src/components/support/BrowserSupport.tsx",
                                lineNumber: 286,
                                columnNumber: 20
                            }, this),
                            error && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                role: "alert",
                                className: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$support$2f$browser$2d$support$2e$module$2e$css__$5b$app$2d$ssr$5d$__$28$css__module$29$__["default"].error,
                                children: error
                            }, void 0, false, {
                                fileName: "[project]/src/components/support/BrowserSupport.tsx",
                                lineNumber: 287,
                                columnNumber: 19
                            }, this),
                            !busy && staff && pathname.startsWith("/admin") && incoming.map((item)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$support$2f$browser$2d$support$2e$module$2e$css__$5b$app$2d$ssr$5d$__$28$css__module$29$__["default"].incoming,
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("strong", {
                                                    children: item.callerName
                                                }, void 0, false, {
                                                    fileName: "[project]/src/components/support/BrowserSupport.tsx",
                                                    lineNumber: 288,
                                                    columnNumber: 132
                                                }, this),
                                                " is calling support"
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/src/components/support/BrowserSupport.tsx",
                                            lineNumber: 288,
                                            columnNumber: 129
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$support$2f$browser$2d$support$2e$module$2e$css__$5b$app$2d$ssr$5d$__$28$css__module$29$__["default"].actions,
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                    onClick: ()=>void begin(item),
                                                    children: "Answer with microphone"
                                                }, void 0, false, {
                                                    fileName: "[project]/src/components/support/BrowserSupport.tsx",
                                                    lineNumber: 288,
                                                    columnNumber: 221
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                    onClick: ()=>{
                                                        void api({
                                                            action: "end",
                                                            id: item.id
                                                        }).then(()=>setIncoming((list)=>list.filter((call)=>call.id !== item.id))).catch((e)=>setError(e.message));
                                                    },
                                                    children: "Decline"
                                                }, void 0, false, {
                                                    fileName: "[project]/src/components/support/BrowserSupport.tsx",
                                                    lineNumber: 288,
                                                    columnNumber: 293
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/src/components/support/BrowserSupport.tsx",
                                            lineNumber: 288,
                                            columnNumber: 189
                                        }, this)
                                    ]
                                }, item.id, true, {
                                    fileName: "[project]/src/components/support/BrowserSupport.tsx",
                                    lineNumber: 288,
                                    columnNumber: 82
                                }, this)),
                            ringingId && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                onClick: ()=>{
                                    void ringtone.current?.resume();
                                },
                                children: "Enable ringtone sound"
                            }, void 0, false, {
                                fileName: "[project]/src/components/support/BrowserSupport.tsx",
                                lineNumber: 289,
                                columnNumber: 23
                            }, this),
                            audio && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(Media, {
                                stream: audio,
                                video: false
                            }, void 0, false, {
                                fileName: "[project]/src/components/support/BrowserSupport.tsx",
                                lineNumber: 290,
                                columnNumber: 19
                            }, this),
                            busy && expanded && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Fragment"], {
                                children: staff ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Fragment"], {
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                            children: "Your camera is off. Only your microphone is shared."
                                        }, void 0, false, {
                                            fileName: "[project]/src/components/support/BrowserSupport.tsx",
                                            lineNumber: 293,
                                            columnNumber: 13
                                        }, this),
                                        remoteSharing.camera && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$support$2f$browser$2d$support$2e$module$2e$css__$5b$app$2d$ssr$5d$__$28$css__module$29$__["default"].preview,
                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(Media, {
                                                stream: remoteCamera
                                            }, void 0, false, {
                                                fileName: "[project]/src/components/support/BrowserSupport.tsx",
                                                lineNumber: 294,
                                                columnNumber: 70
                                            }, this)
                                        }, void 0, false, {
                                            fileName: "[project]/src/components/support/BrowserSupport.tsx",
                                            lineNumber: 294,
                                            columnNumber: 38
                                        }, this),
                                        remoteSharing.screen && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Fragment"], {
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                    children: remoteSharing.guidance ? "Move or click on the shared screen to point things out to the caller." : "Screen shared. The caller can enable pointer guidance for this SNOWD tab."
                                                }, void 0, false, {
                                                    fileName: "[project]/src/components/support/BrowserSupport.tsx",
                                                    lineNumber: 295,
                                                    columnNumber: 40
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(Media, {
                                                    stream: remoteScreen,
                                                    onPointer: sendPointer
                                                }, void 0, false, {
                                                    fileName: "[project]/src/components/support/BrowserSupport.tsx",
                                                    lineNumber: 295,
                                                    columnNumber: 223
                                                }, this)
                                            ]
                                        }, void 0, true)
                                    ]
                                }, void 0, true) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Fragment"], {
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                            children: "Camera and screen sharing are optional. You can stop either at any time."
                                        }, void 0, false, {
                                            fileName: "[project]/src/components/support/BrowserSupport.tsx",
                                            lineNumber: 297,
                                            columnNumber: 13
                                        }, this),
                                        camera && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$support$2f$browser$2d$support$2e$module$2e$css__$5b$app$2d$ssr$5d$__$28$css__module$29$__["default"].preview,
                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(Media, {
                                                stream: camera,
                                                muted: true
                                            }, void 0, false, {
                                                fileName: "[project]/src/components/support/BrowserSupport.tsx",
                                                lineNumber: 298,
                                                columnNumber: 56
                                            }, this)
                                        }, void 0, false, {
                                            fileName: "[project]/src/components/support/BrowserSupport.tsx",
                                            lineNumber: 298,
                                            columnNumber: 24
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$support$2f$browser$2d$support$2e$module$2e$css__$5b$app$2d$ssr$5d$__$28$css__module$29$__["default"].actions,
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                    disabled: !connected || mediaBusy,
                                                    onClick: ()=>void toggleMedia("camera"),
                                                    children: camera ? "Stop camera" : "Share camera"
                                                }, void 0, false, {
                                                    fileName: "[project]/src/components/support/BrowserSupport.tsx",
                                                    lineNumber: 300,
                                                    columnNumber: 15
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                    disabled: !connected || mediaBusy,
                                                    onClick: ()=>void toggleMedia("screen"),
                                                    children: screen ? "Stop sharing screen" : "Share screen"
                                                }, void 0, false, {
                                                    fileName: "[project]/src/components/support/BrowserSupport.tsx",
                                                    lineNumber: 301,
                                                    columnNumber: 15
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/src/components/support/BrowserSupport.tsx",
                                            lineNumber: 299,
                                            columnNumber: 13
                                        }, this),
                                        screen && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                            className: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$support$2f$browser$2d$support$2e$module$2e$css__$5b$app$2d$ssr$5d$__$28$css__module$29$__["default"].consent,
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                    type: "checkbox",
                                                    checked: guidance,
                                                    disabled: !!screen.getVideoTracks()[0]?.getSettings().displaySurface && screen.getVideoTracks()[0]?.getSettings().displaySurface !== "browser",
                                                    onChange: (event)=>{
                                                        const enabled = event.target.checked;
                                                        setGuidance(enabled);
                                                        setPointer(null);
                                                        sharing.current.guidance = enabled;
                                                        send({
                                                            type: "sharing",
                                                            ...sharing.current
                                                        });
                                                    }
                                                }, void 0, false, {
                                                    fileName: "[project]/src/components/support/BrowserSupport.tsx",
                                                    lineNumber: 303,
                                                    columnNumber: 58
                                                }, this),
                                                " I am sharing this SNOWD tab. Show support’s pointer on my page."
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/src/components/support/BrowserSupport.tsx",
                                            lineNumber: 303,
                                            columnNumber: 24
                                        }, this),
                                        screen && !guidance && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                            children: "To use the pointer, select this browser tab in the screen-sharing picker and enable the checkbox above."
                                        }, void 0, false, {
                                            fileName: "[project]/src/components/support/BrowserSupport.tsx",
                                            lineNumber: 304,
                                            columnNumber: 37
                                        }, this),
                                        guidance && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                            children: "Support clicks show a marker. You stay in control of buttons and forms."
                                        }, void 0, false, {
                                            fileName: "[project]/src/components/support/BrowserSupport.tsx",
                                            lineNumber: 305,
                                            columnNumber: 26
                                        }, this)
                                    ]
                                }, void 0, true)
                            }, void 0, false),
                            busy ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: `${__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$support$2f$browser$2d$support$2e$module$2e$css__$5b$app$2d$ssr$5d$__$28$css__module$29$__["default"].actions} ${__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$support$2f$browser$2d$support$2e$module$2e$css__$5b$app$2d$ssr$5d$__$28$css__module$29$__["default"].controls}`,
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                        onClick: ()=>{
                                            const next = !muted;
                                            setMuted(next);
                                            streams.current.flatMap((stream)=>stream.getAudioTracks()).forEach((track)=>{
                                                track.enabled = !next;
                                            });
                                        },
                                        children: muted ? "Unmute" : "Mute"
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/support/BrowserSupport.tsx",
                                        lineNumber: 308,
                                        columnNumber: 73
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                        className: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$support$2f$browser$2d$support$2e$module$2e$css__$5b$app$2d$ssr$5d$__$28$css__module$29$__["default"].end,
                                        onClick: ()=>void end(),
                                        children: connected ? "End call" : "Cancel call"
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/support/BrowserSupport.tsx",
                                        lineNumber: 308,
                                        columnNumber: 279
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/components/support/BrowserSupport.tsx",
                                lineNumber: 308,
                                columnNumber: 17
                            }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                onClick: ()=>{
                                    setError("");
                                    setStatus("");
                                },
                                children: "Dismiss"
                            }, void 0, false, {
                                fileName: "[project]/src/components/support/BrowserSupport.tsx",
                                lineNumber: 308,
                                columnNumber: 395
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/components/support/BrowserSupport.tsx",
                        lineNumber: 284,
                        columnNumber: 104
                    }, this)
                ]
            }, void 0, true), document.body)
        ]
    }, void 0, true, {
        fileName: "[project]/src/components/support/BrowserSupport.tsx",
        lineNumber: 280,
        columnNumber: 10
    }, this);
}
}),
"[project]/src/components/PageVisitTracker.tsx [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>PageVisitTracker
]);
/**
 * PageVisitTracker
 * Fires once per browser session per page change and writes a lightweight
 * site-visit record to `adminNotifications`.
 * Renders nothing — purely a side-effect component.
 */ var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/navigation.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$adminNotifications$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/adminNotifications.ts [app-ssr] (ecmascript)");
"use client";
;
;
;
// Pages that are boring/internal and shouldn't spam the feed
const IGNORED_PREFIXES = [
    "/admin",
    "/api",
    "/_next"
];
function PageVisitTracker() {
    const pathname = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["usePathname"])();
    // Track which paths we've already reported this session
    const reportedRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useRef"])(new Set());
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        if (!pathname) return;
        if (IGNORED_PREFIXES.some((p)=>pathname.startsWith(p))) return;
        if (reportedRef.current.has(pathname)) return;
        reportedRef.current.add(pathname);
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$adminNotifications$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["sendAdminNotif"])({
            type: "visit",
            message: `Page visit: ${pathname}`,
            uid: null,
            meta: {
                path: pathname,
                referrer: typeof document !== "undefined" ? document.referrer || "" : "",
                userAgent: typeof navigator !== "undefined" ? navigator.userAgent.slice(0, 120) : ""
            }
        });
    }, [
        pathname
    ]);
    return null;
}
}),
];

//# sourceMappingURL=%5Broot-of-the-server%5D__78b051a2._.js.map