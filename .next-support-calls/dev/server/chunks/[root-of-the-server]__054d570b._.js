module.exports = [
"[externals]/next/dist/compiled/next-server/app-route-turbo.runtime.dev.js [external] (next/dist/compiled/next-server/app-route-turbo.runtime.dev.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/compiled/next-server/app-route-turbo.runtime.dev.js", () => require("next/dist/compiled/next-server/app-route-turbo.runtime.dev.js"));

module.exports = mod;
}),
"[externals]/next/dist/compiled/next-server/app-page-turbo.runtime.dev.js [external] (next/dist/compiled/next-server/app-page-turbo.runtime.dev.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/compiled/next-server/app-page-turbo.runtime.dev.js", () => require("next/dist/compiled/next-server/app-page-turbo.runtime.dev.js"));

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
"[externals]/next/dist/shared/lib/no-fallback-error.external.js [external] (next/dist/shared/lib/no-fallback-error.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/shared/lib/no-fallback-error.external.js", () => require("next/dist/shared/lib/no-fallback-error.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/app-render/after-task-async-storage.external.js [external] (next/dist/server/app-render/after-task-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/server/app-render/after-task-async-storage.external.js", () => require("next/dist/server/app-render/after-task-async-storage.external.js"));

module.exports = mod;
}),
"[externals]/node:crypto [external] (node:crypto, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("node:crypto", () => require("node:crypto"));

module.exports = mod;
}),
"[project]/src/lib/firebaseAdmin.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

return __turbopack_context__.a(async (__turbopack_handle_async_dependencies__, __turbopack_async_result__) => { try {

__turbopack_context__.s([
    "getAdminAuth",
    ()=>getAdminAuth,
    "getAdminDb",
    ()=>getAdminDb
]);
var __TURBOPACK__imported__module__$5b$externals$5d2f$firebase$2d$admin$2f$app__$5b$external$5d$__$28$firebase$2d$admin$2f$app$2c$__esm_import$2c$__$5b$project$5d2f$node_modules$2f$firebase$2d$admin$29$__ = __turbopack_context__.i("[externals]/firebase-admin/app [external] (firebase-admin/app, esm_import, [project]/node_modules/firebase-admin)");
var __TURBOPACK__imported__module__$5b$externals$5d2f$firebase$2d$admin$2f$auth__$5b$external$5d$__$28$firebase$2d$admin$2f$auth$2c$__esm_import$2c$__$5b$project$5d2f$node_modules$2f$firebase$2d$admin$29$__ = __turbopack_context__.i("[externals]/firebase-admin/auth [external] (firebase-admin/auth, esm_import, [project]/node_modules/firebase-admin)");
var __TURBOPACK__imported__module__$5b$externals$5d2f$firebase$2d$admin$2f$firestore__$5b$external$5d$__$28$firebase$2d$admin$2f$firestore$2c$__esm_import$2c$__$5b$project$5d2f$node_modules$2f$firebase$2d$admin$29$__ = __turbopack_context__.i("[externals]/firebase-admin/firestore [external] (firebase-admin/firestore, esm_import, [project]/node_modules/firebase-admin)");
var __turbopack_async_dependencies__ = __turbopack_handle_async_dependencies__([
    __TURBOPACK__imported__module__$5b$externals$5d2f$firebase$2d$admin$2f$app__$5b$external$5d$__$28$firebase$2d$admin$2f$app$2c$__esm_import$2c$__$5b$project$5d2f$node_modules$2f$firebase$2d$admin$29$__,
    __TURBOPACK__imported__module__$5b$externals$5d2f$firebase$2d$admin$2f$auth__$5b$external$5d$__$28$firebase$2d$admin$2f$auth$2c$__esm_import$2c$__$5b$project$5d2f$node_modules$2f$firebase$2d$admin$29$__,
    __TURBOPACK__imported__module__$5b$externals$5d2f$firebase$2d$admin$2f$firestore__$5b$external$5d$__$28$firebase$2d$admin$2f$firestore$2c$__esm_import$2c$__$5b$project$5d2f$node_modules$2f$firebase$2d$admin$29$__
]);
[__TURBOPACK__imported__module__$5b$externals$5d2f$firebase$2d$admin$2f$app__$5b$external$5d$__$28$firebase$2d$admin$2f$app$2c$__esm_import$2c$__$5b$project$5d2f$node_modules$2f$firebase$2d$admin$29$__, __TURBOPACK__imported__module__$5b$externals$5d2f$firebase$2d$admin$2f$auth__$5b$external$5d$__$28$firebase$2d$admin$2f$auth$2c$__esm_import$2c$__$5b$project$5d2f$node_modules$2f$firebase$2d$admin$29$__, __TURBOPACK__imported__module__$5b$externals$5d2f$firebase$2d$admin$2f$firestore__$5b$external$5d$__$28$firebase$2d$admin$2f$firestore$2c$__esm_import$2c$__$5b$project$5d2f$node_modules$2f$firebase$2d$admin$29$__] = __turbopack_async_dependencies__.then ? (await __turbopack_async_dependencies__)() : __turbopack_async_dependencies__;
;
;
;
function adminApp() {
    const existing = (0, __TURBOPACK__imported__module__$5b$externals$5d2f$firebase$2d$admin$2f$app__$5b$external$5d$__$28$firebase$2d$admin$2f$app$2c$__esm_import$2c$__$5b$project$5d2f$node_modules$2f$firebase$2d$admin$29$__["getApps"])().find((app)=>app.name === "snowd-server");
    if (existing) return existing;
    const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
    return (0, __TURBOPACK__imported__module__$5b$externals$5d2f$firebase$2d$admin$2f$app__$5b$external$5d$__$28$firebase$2d$admin$2f$app$2c$__esm_import$2c$__$5b$project$5d2f$node_modules$2f$firebase$2d$admin$29$__["initializeApp"])({
        credential: serviceAccount ? (0, __TURBOPACK__imported__module__$5b$externals$5d2f$firebase$2d$admin$2f$app__$5b$external$5d$__$28$firebase$2d$admin$2f$app$2c$__esm_import$2c$__$5b$project$5d2f$node_modules$2f$firebase$2d$admin$29$__["cert"])(JSON.parse(serviceAccount)) : (0, __TURBOPACK__imported__module__$5b$externals$5d2f$firebase$2d$admin$2f$app__$5b$external$5d$__$28$firebase$2d$admin$2f$app$2c$__esm_import$2c$__$5b$project$5d2f$node_modules$2f$firebase$2d$admin$29$__["applicationDefault"])(),
        projectId: ("TURBOPACK compile-time value", "snowd-6ca54")
    }, "snowd-server");
}
const getAdminDb = ()=>(0, __TURBOPACK__imported__module__$5b$externals$5d2f$firebase$2d$admin$2f$firestore__$5b$external$5d$__$28$firebase$2d$admin$2f$firestore$2c$__esm_import$2c$__$5b$project$5d2f$node_modules$2f$firebase$2d$admin$29$__["getFirestore"])(adminApp());
const getAdminAuth = ()=>(0, __TURBOPACK__imported__module__$5b$externals$5d2f$firebase$2d$admin$2f$auth__$5b$external$5d$__$28$firebase$2d$admin$2f$auth$2c$__esm_import$2c$__$5b$project$5d2f$node_modules$2f$firebase$2d$admin$29$__["getAuth"])(adminApp());
__turbopack_async_result__();
} catch(e) { __turbopack_async_result__(e); } }, false);}),
"[project]/src/app/api/support-calls/route.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

return __turbopack_context__.a(async (__turbopack_handle_async_dependencies__, __turbopack_async_result__) => { try {

__turbopack_context__.s([
    "GET",
    ()=>GET,
    "POST",
    ()=>POST
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/server.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$externals$5d2f$node$3a$crypto__$5b$external$5d$__$28$node$3a$crypto$2c$__cjs$29$__ = __turbopack_context__.i("[externals]/node:crypto [external] (node:crypto, cjs)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$firebaseAdmin$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/firebaseAdmin.ts [app-route] (ecmascript)");
var __turbopack_async_dependencies__ = __turbopack_handle_async_dependencies__([
    __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$firebaseAdmin$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__
]);
[__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$firebaseAdmin$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__] = __turbopack_async_dependencies__.then ? (await __turbopack_async_dependencies__)() : __turbopack_async_dependencies__;
;
;
;
class CallError extends Error {
    status;
    constructor(message, status = 400){
        super(message), this.status = status;
    }
}
async function identity(req) {
    let uid;
    try {
        uid = (await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$firebaseAdmin$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getAdminAuth"])().verifyIdToken(req.headers.get("authorization")?.replace(/^Bearer /, "") || "", true)).uid;
    } catch  {
        throw new CallError("Please sign in again.", 401);
    }
    const profile = (await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$firebaseAdmin$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getAdminDb"])().doc(`users/${uid}`).get()).data();
    if (!profile || profile.disabled) throw new CallError("Account unavailable.", 403);
    return {
        uid,
        staff: [
            "admin",
            "employee"
        ].includes(profile.role),
        name: String(profile.displayName || "SNOWD user")
    };
}
function failure(error) {
    return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
        error: error instanceof CallError ? error.message : "Support calling is unavailable. Please try again or call 437-922-3895."
    }, {
        status: error instanceof CallError ? error.status : 500
    });
}
function description(value, type) {
    const data = value;
    if (data?.type !== type || typeof data.sdp !== "string" || data.sdp.length > 100000 || !data.sdp.startsWith("v=0")) throw new CallError("Invalid call connection.");
    return {
        type,
        sdp: data.sdp
    };
}
async function GET(req) {
    try {
        const user = await identity(req), db = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$firebaseAdmin$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getAdminDb"])(), id = req.nextUrl.searchParams.get("id");
        if (req.nextUrl.searchParams.has("config")) {
            const iceServers = [
                {
                    urls: "stun:stun.l.google.com:19302"
                }
            ];
            if (process.env.SUPPORT_TURN_URLS && process.env.SUPPORT_TURN_SECRET) {
                const username = `${Math.floor(Date.now() / 1000) + 7200}:${user.uid}`;
                iceServers.push({
                    urls: process.env.SUPPORT_TURN_URLS.split(","),
                    username,
                    credential: (0, __TURBOPACK__imported__module__$5b$externals$5d2f$node$3a$crypto__$5b$external$5d$__$28$node$3a$crypto$2c$__cjs$29$__["createHmac"])("sha1", process.env.SUPPORT_TURN_SECRET).update(username).digest("base64")
                });
            }
            return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                iceServers
            });
        }
        if (id) {
            if (!/^[\w-]{1,150}$/.test(id)) throw new CallError("Invalid call.");
            const call = (await db.doc(`supportCalls/${id}`).get()).data();
            if (!call || call.callerId !== user.uid && !(user.staff && (!call.adminId || call.adminId === user.uid))) throw new CallError("Call unavailable.", 403);
            return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                ...call,
                id,
                status: call.expiresAt < Date.now() ? "ended" : call.status
            });
        }
        if (!user.staff) throw new CallError("Support access required.", 403);
        const calls = await db.collection("supportCalls").where("expiresAt", ">", Date.now()).get();
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            calls: calls.docs.filter((doc)=>doc.data().status === "ringing").map((doc)=>({
                    id: doc.id,
                    callerName: doc.data().callerName,
                    createdAt: doc.data().createdAt
                })).sort((a, b)=>a.createdAt - b.createdAt)
        });
    } catch (error) {
        return failure(error);
    }
}
async function POST(req) {
    try {
        const user = await identity(req), db = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$firebaseAdmin$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getAdminDb"])();
        const body = await req.json();
        if (body.action === "start") {
            if (user.staff) throw new CallError("Use the admin page to answer calls.");
            const offer = description(body.offer, "offer"), id = (0, __TURBOPACK__imported__module__$5b$externals$5d2f$node$3a$crypto__$5b$external$5d$__$28$node$3a$crypto$2c$__cjs$29$__["randomUUID"])(), now = Date.now();
            await db.runTransaction(async (tx)=>{
                const lock = db.doc(`supportCallLocks/${user.uid}`), existing = (await tx.get(lock)).data();
                if (existing && existing.expiresAt > now) throw new CallError("You already have a support call. End it or wait two minutes before retrying.", 409);
                tx.set(lock, {
                    id,
                    expiresAt: now + 120000
                });
                tx.create(db.doc(`supportCalls/${id}`), {
                    callerId: user.uid,
                    callerName: user.name,
                    adminId: null,
                    status: "ringing",
                    offer,
                    createdAt: now,
                    expiresAt: now + 120000
                });
            });
            return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                id
            });
        }
        if (typeof body.id !== "string" || !/^[\w-]{1,150}$/.test(body.id)) throw new CallError("Invalid call.");
        await db.runTransaction(async (tx)=>{
            const ref = db.doc(`supportCalls/${body.id}`), call = (await tx.get(ref)).data();
            if (!call) throw new CallError("Call no longer available.", 404);
            const owner = call.callerId === user.uid, assigned = user.staff && call.adminId === user.uid;
            if (body.action === "answer") {
                if (!user.staff || call.status !== "ringing" || call.expiresAt < Date.now()) throw new CallError("This call was already answered or ended.", 409);
                const lock = db.doc(`supportCallLocks/${user.uid}`), existing = (await tx.get(lock)).data();
                if (existing && existing.expiresAt > Date.now()) throw new CallError("You are already on a call.", 409);
                const expiresAt = Date.now() + 120000;
                tx.update(ref, {
                    adminId: user.uid,
                    answer: description(body.answer, "answer"),
                    status: "active",
                    expiresAt
                });
                tx.set(lock, {
                    id: body.id,
                    expiresAt
                });
                tx.set(db.doc(`supportCallLocks/${call.callerId}`), {
                    id: body.id,
                    expiresAt
                });
            } else if (body.action === "heartbeat") {
                if (!owner && !assigned) throw new CallError("Call access denied.", 403);
                if (call.status !== "active" || call.expiresAt < Date.now()) throw new CallError("Call ended.", 409);
                const expiresAt = Date.now() + 120000;
                tx.update(ref, {
                    expiresAt
                });
                tx.set(db.doc(`supportCallLocks/${user.uid}`), {
                    id: body.id,
                    expiresAt
                });
            } else if (body.action === "end") {
                if (!owner && !assigned && !(user.staff && call.status === "ringing")) throw new CallError("Call access denied.", 403);
                const ids = [
                    call.callerId,
                    call.adminId
                ].filter(Boolean);
                const locks = await Promise.all(ids.map((uid)=>tx.get(db.doc(`supportCallLocks/${uid}`))));
                tx.update(ref, {
                    status: "ended",
                    expiresAt: Date.now(),
                    offer: null,
                    answer: null
                });
                locks.forEach((lock)=>{
                    if (lock.data()?.id === body.id) tx.delete(lock.ref);
                });
            } else throw new CallError("Unknown call action.");
        });
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            ok: true
        });
    } catch (error) {
        return failure(error);
    }
}
__turbopack_async_result__();
} catch(e) { __turbopack_async_result__(e); } }, false);}),
];

//# sourceMappingURL=%5Broot-of-the-server%5D__054d570b._.js.map