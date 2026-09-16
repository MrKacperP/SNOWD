module.exports = [
"[project]/src/lib/marketplacePricing.ts [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/** All calculations use cents. Existing bookings retain their agreed price. */ __turbopack_context__.s([
    "calculateServicePrice",
    ()=>calculateServicePrice,
    "jobDisplayPrice",
    ()=>jobDisplayPrice,
    "quoteMarketplace",
    ()=>quoteMarketplace,
    "transactionDisplayAmount",
    ()=>transactionDisplayAmount
]);
function quoteMarketplace(operatorPrice, method) {
    const operatorAmount = Math.round(operatorPrice * 100);
    if (!Number.isSafeInteger(operatorAmount) || operatorAmount <= 0) throw new Error("Invalid service price");
    const clientAmount = method === "credit" ? Math.round(operatorAmount / 0.7) : operatorAmount;
    return {
        price: clientAmount / 100,
        operatorAmount,
        platformFeeAmount: clientAmount - operatorAmount,
        pricingVersion: 2
    };
}
function calculateServicePrice(pricing, services, size) {
    const selected = services?.length ? services : [
        "driveway"
    ];
    const total = selected.reduce((sum, service)=>{
        if (service === "driveway") return sum + (pricing?.driveway?.[size] || 0);
        if (service === "walkway") return sum + (pricing?.walkway || 0);
        if (service === "sidewalk") return sum + (pricing?.sidewalk || 0);
        return sum;
    }, 0);
    return total || pricing?.driveway?.[size] || 40;
}
function jobDisplayPrice(job, operator) {
    if (!operator || job.paymentMethod === "cash") return job.price;
    return (job.operatorAmount ?? Math.round(job.price * 100) - Math.round(job.price * 100 * 0.15)) / 100;
}
function transactionDisplayAmount(item, operator) {
    return operator && item.paymentMethod === "credit" ? item.operatorAmount ?? item.amount - Math.round(item.amount * 0.15) : item.amount;
}
}),
"[project]/src/hooks/useWorkOrders.ts [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "useWorkOrders",
    ()=>useWorkOrders
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$firebase$2f$firestore$2f$dist$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/node_modules/firebase/firestore/dist/index.mjs [app-ssr] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$firebase$2f$firestore$2f$dist$2f$index$2e$node$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@firebase/firestore/dist/index.node.mjs [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$firebase$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/firebase.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$context$2f$AuthContext$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/context/AuthContext.tsx [app-ssr] (ecmascript)");
"use client";
;
;
;
;
function useWorkOrders() {
    const { user, profile } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$context$2f$AuthContext$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useAuth"])();
    const [jobs, setJobs] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])([]), [names, setNames] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])({});
    const [people, setPeople] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])({});
    const [loading, setLoading] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(true), [error, setError] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])("");
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        if (!user || !profile) return;
        return (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$firebase$2f$firestore$2f$dist$2f$index$2e$node$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["onSnapshot"])((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$firebase$2f$firestore$2f$dist$2f$index$2e$node$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["query"])((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$firebase$2f$firestore$2f$dist$2f$index$2e$node$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["collection"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$firebase$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["db"], "jobs"), (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$firebase$2f$firestore$2f$dist$2f$index$2e$node$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["where"])(profile.role === "operator" ? "operatorId" : "clientId", "==", user.uid)), (snap)=>{
            setJobs(snap.docs.map((d)=>({
                    ...d.data(),
                    id: d.id
                })));
            setLoading(false);
            setError("");
        }, ()=>{
            setError("Could not load work orders. Check your connection and reload.");
            setLoading(false);
        });
    }, [
        user,
        profile
    ]);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        let active = true;
        const ids = [
            ...new Set(jobs.map((j)=>profile?.role === "operator" ? j.clientId : j.operatorId))
        ];
        void Promise.all(ids.map(async (id)=>{
            try {
                const data = (await (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$firebase$2f$firestore$2f$dist$2f$index$2e$node$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["getDoc"])((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$firebase$2f$firestore$2f$dist$2f$index$2e$node$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["doc"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$firebase$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["db"], "users", id))).data();
                return [
                    id,
                    data?.businessName || data?.displayName || "Company / customer",
                    {
                        ...data,
                        uid: id
                    }
                ];
            } catch  {
                return [
                    id,
                    "Company / customer"
                ];
            }
        })).then((entries)=>{
            if (active) {
                setNames(Object.fromEntries(entries.map(([id, name])=>[
                        id,
                        name
                    ])));
                setPeople(Object.fromEntries(entries.filter((entry)=>entry[2]).map((entry)=>[
                        entry[0],
                        entry[2]
                    ])));
            }
        });
        return ()=>{
            active = false;
        };
    }, [
        jobs,
        profile?.role
    ]);
    return {
        jobs,
        names,
        people,
        loading,
        error,
        uid: user?.uid || "",
        isOperator: profile?.role === "operator"
    };
}
}),
"[project]/src/lib/workOrders.ts [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "dateMillis",
    ()=>dateMillis,
    "hasScheduleConflict",
    ()=>hasScheduleConflict,
    "isAsap",
    ()=>isAsap,
    "isOpenOrder",
    ()=>isOpenOrder,
    "orderActionNeeded",
    ()=>orderActionNeeded,
    "orderLabel",
    ()=>orderLabel,
    "orderNumber",
    ()=>orderNumber,
    "orderSection",
    ()=>orderSection,
    "scheduleText",
    ()=>scheduleText
]);
function orderNumber(job) {
    return job.orderNumber || `L-${job.id}`;
}
function dateMillis(value) {
    if (value && typeof value === "object" && "toDate" in value) return value.toDate().getTime();
    if (value instanceof Date) return value.getTime();
    return typeof value === "string" || typeof value === "number" ? new Date(value).getTime() : 0;
}
function isAsap(job) {
    return job.scheduleMode === "asap" || job.scheduledTime === "ASAP" || !dateMillis(job.scheduledDate);
}
function orderLabel(job) {
    if (job.status === "cancelled") return job.declinedBy ? "Declined" : "Cancelled";
    if (job.status === "completed") return "Completed";
    if (job.status === "en-route") return "On the way";
    if (job.status === "in-progress") return "Work in progress";
    if (job.status === "pending") return "Awaiting confirmation";
    if (job.paymentMethod !== "cash" && ![
        "held",
        "paid"
    ].includes(job.paymentStatus)) return "Payment needed";
    return "Confirmed";
}
function orderActionNeeded(job, uid) {
    if (job.status === "cancelled") return "";
    if (job.status === "completed") return job.operatorId === uid && job.paymentMethod === "cash" && job.paymentStatus === "pending" ? "Confirm cash payment" : "";
    if (job.scheduleProposal?.recipientId === uid) return "Review proposed time";
    if (job.status === "pending" && !job.scheduleProposal && (job.awaitingResponseFrom || job.operatorId) === uid) return "Accept or decline request";
    if (job.status === "accepted" && job.clientId === uid && job.paymentMethod !== "cash" && ![
        "held",
        "paid"
    ].includes(job.paymentStatus)) return "Authorize card payment";
    return "";
}
function orderSection(job, uid) {
    if (orderActionNeeded(job, uid)) return "attention";
    if ([
        "completed",
        "cancelled"
    ].includes(job.status)) return "history";
    if ([
        "en-route",
        "in-progress"
    ].includes(job.status)) return "progress";
    if (job.status === "pending") return "waiting";
    return "upcoming";
}
function isOpenOrder(job) {
    return !!job && ![
        "completed",
        "cancelled"
    ].includes(job.status);
}
function scheduleText(job) {
    if (isAsap(job)) return "ASAP · arrival time to be confirmed";
    const time = dateMillis(job.scheduledDate);
    if (!Number.isFinite(time)) return "Time to be confirmed";
    return new Intl.DateTimeFormat("en-CA", {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: job.scheduleTimezone || "America/Toronto"
    }).format(time) + ` (${job.scheduleTimezone || "America/Toronto"})`;
}
function hasScheduleConflict(candidate, jobs) {
    if (isAsap(candidate)) return false;
    const start = dateMillis(candidate.scheduledDate), end = start + (candidate.estimatedDuration || 45) * 60000;
    return jobs.some((other)=>other.id !== candidate.id && [
            "accepted",
            "en-route",
            "in-progress"
        ].includes(other.status) && !isAsap(other) && start < dateMillis(other.scheduledDate) + (other.estimatedDuration || 45) * 60000 && end > dateMillis(other.scheduledDate));
}
}),
"[project]/src/components/work-orders/work-orders.module.css [app-ssr] (css module)", ((__turbopack_context__) => {

__turbopack_context__.v({
  "activeJobBadge": "work-orders-module__tXG4wW__activeJobBadge",
  "backLink": "work-orders-module__tXG4wW__backLink",
  "badge": "work-orders-module__tXG4wW__badge",
  "body": "work-orders-module__tXG4wW__body",
  "button": "work-orders-module__tXG4wW__button",
  "card": "work-orders-module__tXG4wW__card",
  "cardHeader": "work-orders-module__tXG4wW__cardHeader",
  "companyChevron": "work-orders-module__tXG4wW__companyChevron",
  "companyFilter": "work-orders-module__tXG4wW__companyFilter",
  "companyGroup": "work-orders-module__tXG4wW__companyGroup",
  "companyInfo": "work-orders-module__tXG4wW__companyInfo",
  "companyList": "work-orders-module__tXG4wW__companyList",
  "companyMeta": "work-orders-module__tXG4wW__companyMeta",
  "companySummary": "work-orders-module__tXG4wW__companySummary",
  "companyTools": "work-orders-module__tXG4wW__companyTools",
  "completionPhoto": "work-orders-module__tXG4wW__completionPhoto",
  "conversationRow": "work-orders-module__tXG4wW__conversationRow",
  "conversationStatus": "work-orders-module__tXG4wW__conversationStatus",
  "conversationTime": "work-orders-module__tXG4wW__conversationTime",
  "dateInput": "work-orders-module__tXG4wW__dateInput",
  "detailIdentity": "work-orders-module__tXG4wW__detailIdentity",
  "detailIntro": "work-orders-module__tXG4wW__detailIntro",
  "detailOrderNumber": "work-orders-module__tXG4wW__detailOrderNumber",
  "detailPage": "work-orders-module__tXG4wW__detailPage",
  "detailSection": "work-orders-module__tXG4wW__detailSection",
  "detailSummary": "work-orders-module__tXG4wW__detailSummary",
  "empty": "work-orders-module__tXG4wW__empty",
  "facts": "work-orders-module__tXG4wW__facts",
  "filters": "work-orders-module__tXG4wW__filters",
  "footer": "work-orders-module__tXG4wW__footer",
  "groupAddress": "work-orders-module__tXG4wW__groupAddress",
  "groupEmpty": "work-orders-module__tXG4wW__groupEmpty",
  "guide": "work-orders-module__tXG4wW__guide",
  "header": "work-orders-module__tXG4wW__header",
  "messageButton": "work-orders-module__tXG4wW__messageButton",
  "messagePreview": "work-orders-module__tXG4wW__messagePreview",
  "orderAddress": "work-orders-module__tXG4wW__orderAddress",
  "orderDetails": "work-orders-module__tXG4wW__orderDetails",
  "orderHighlight": "work-orders-module__tXG4wW__orderHighlight",
  "orderHighlightLabel": "work-orders-module__tXG4wW__orderHighlightLabel",
  "orderHighlights": "work-orders-module__tXG4wW__orderHighlights",
  "orderPaymentMethod": "work-orders-module__tXG4wW__orderPaymentMethod",
  "orderPrice": "work-orders-module__tXG4wW__orderPrice",
  "orderReference": "work-orders-module__tXG4wW__orderReference",
  "orderRow": "work-orders-module__tXG4wW__orderRow",
  "orderRowFooter": "work-orders-module__tXG4wW__orderRowFooter",
  "orderRowHeader": "work-orders-module__tXG4wW__orderRowHeader",
  "orderRowMain": "work-orders-module__tXG4wW__orderRowMain",
  "orderView": "work-orders-module__tXG4wW__orderView",
  "page": "work-orders-module__tXG4wW__page",
  "paymentNote": "work-orders-module__tXG4wW__paymentNote",
  "photoLinks": "work-orders-module__tXG4wW__photoLinks",
  "priorityFacts": "work-orders-module__tXG4wW__priorityFacts",
  "progress": "work-orders-module__tXG4wW__progress",
  "reference": "work-orders-module__tXG4wW__reference",
  "rowAction": "work-orders-module__tXG4wW__rowAction",
  "scheduleHint": "work-orders-module__tXG4wW__scheduleHint",
  "scheduleTools": "work-orders-module__tXG4wW__scheduleTools",
  "searchInput": "work-orders-module__tXG4wW__searchInput",
  "searchLabel": "work-orders-module__tXG4wW__searchLabel",
  "secondary": "work-orders-module__tXG4wW__secondary",
  "section": "work-orders-module__tXG4wW__section",
  "sectionHeader": "work-orders-module__tXG4wW__sectionHeader",
  "task-appear": "work-orders-module__tXG4wW__task-appear",
  "timeline": "work-orders-module__tXG4wW__timeline",
  "timelineItem": "work-orders-module__tXG4wW__timelineItem",
  "title": "work-orders-module__tXG4wW__title",
  "unreadBadge": "work-orders-module__tXG4wW__unreadBadge",
});
}),
"[project]/src/lib/workOrderPresentation.ts [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "workOrderPresentation",
    ()=>workOrderPresentation
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$workOrders$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/workOrders.ts [app-ssr] (ecmascript)");
;
function workOrderPresentation(job, uid) {
    const operator = job.operatorId === uid;
    const action = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$workOrders$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["orderActionNeeded"])(job, uid);
    const waitingForCard = job.status === "accepted" && job.paymentMethod !== "cash" && ![
        "held",
        "paid"
    ].includes(job.paymentStatus);
    const paymentMessage = job.paymentMethod === "cash" ? job.paymentStatus === "paid" ? "Cash received" : "Cash after the job" : job.paymentStatus === "held" ? "Card authorized · charged after completion" : job.paymentStatus === "paid" ? "Card payment successful" : job.paymentStatus === "refunded" ? "Card hold released" : "Card authorization needed";
    if (job.status === "completed") return {
        title: "All clear.",
        status: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$workOrders$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["orderLabel"])(job),
        tone: "success",
        progress: 4,
        description: job.paymentStatus === "paid" ? "The work and payment are complete." : "The work is complete. Check the payment step below.",
        nextAction: action,
        paymentMessage
    };
    if (job.status === "cancelled") return {
        title: job.declinedBy ? "Request declined." : "Visit cancelled.",
        status: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$workOrders$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["orderLabel"])(job),
        tone: "danger",
        progress: 1,
        description: "You can request another visit whenever you need help.",
        nextAction: "",
        paymentMessage
    };
    if (job.scheduleProposal) return {
        title: job.scheduleProposal.recipientId === uid ? "Review the new time." : "Time change sent.",
        status: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$workOrders$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["orderLabel"])(job),
        tone: job.scheduleProposal.recipientId === uid ? "attention" : "neutral",
        progress: job.status === "pending" ? 1 : 2,
        description: job.scheduleProposal.recipientId === uid ? "Choose whether the proposed time works for you." : "The current time stays booked until the change is approved.",
        nextAction: action,
        paymentMessage
    };
    if (job.status === "pending") return {
        title: action ? "New request." : "Help requested.",
        status: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$workOrders$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["orderLabel"])(job),
        tone: action ? "attention" : "neutral",
        progress: 1,
        description: action ? "Check the visit and respond below." : "You’ll see the confirmation here.",
        nextAction: action,
        paymentMessage
    };
    if (job.status === "accepted") return {
        title: waitingForCard ? "Payment authorization needed." : "Visit confirmed.",
        status: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$workOrders$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["orderLabel"])(job),
        tone: action ? "attention" : "neutral",
        progress: 2,
        description: waitingForCard ? operator ? "The customer needs to authorize their card before work starts." : "Authorize the card now. It is charged after photo proof." : operator ? "Let the customer know when you leave." : "Your shoveler will update you when they leave.",
        nextAction: action || (operator && !waitingForCard ? "Start the trip" : ""),
        paymentMessage
    };
    if (job.status === "en-route") return {
        title: operator ? "Ready to start?" : "Help is on the way.",
        status: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$workOrders$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["orderLabel"])(job),
        tone: "progress",
        progress: 3,
        description: operator ? "Start work when you reach the property." : "Message your shoveler if they need arrival details.",
        nextAction: operator ? "Start work" : "",
        paymentMessage
    };
    return {
        title: operator ? "One last photo." : "Snow is being cleared.",
        status: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$workOrders$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["orderLabel"])(job),
        tone: "progress",
        progress: 3,
        description: operator ? "Photograph the cleared areas to finish the visit." : "You’ll receive a completion photo when the work is done.",
        nextAction: operator ? "Add photo & complete" : "",
        paymentMessage
    };
}
}),
"[project]/src/components/work-orders/OrderGuide.tsx [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>OrderGuide
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-dev-runtime.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$check$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Check$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/check.js [app-ssr] (ecmascript) <export default as Check>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$clock$2d$3$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Clock3$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/clock-3.js [app-ssr] (ecmascript) <export default as Clock3>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$image$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/image.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$workOrderPresentation$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/workOrderPresentation.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$work$2d$orders$2f$work$2d$orders$2e$module$2e$css__$5b$app$2d$ssr$5d$__$28$css__module$29$__ = __turbopack_context__.i("[project]/src/components/work-orders/work-orders.module.css [app-ssr] (css module)");
"use client";
;
;
;
;
;
function OrderGuide({ job, uid }) {
    const finished = job.status === "completed";
    const view = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$workOrderPresentation$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["workOrderPresentation"])(job, uid);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("section", {
        className: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$work$2d$orders$2f$work$2d$orders$2e$module$2e$css__$5b$app$2d$ssr$5d$__$28$css__module$29$__["default"].guide,
        "data-tone": view.tone,
        "aria-label": "Current task",
        "aria-live": "polite",
        children: [
            finished ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$check$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Check$3e$__["Check"], {
                size: 30,
                "aria-hidden": "true"
            }, void 0, false, {
                fileName: "[project]/src/components/work-orders/OrderGuide.tsx",
                lineNumber: 13,
                columnNumber: 17
            }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$clock$2d$3$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Clock3$3e$__["Clock3"], {
                size: 24,
                "aria-hidden": "true"
            }, void 0, false, {
                fileName: "[project]/src/components/work-orders/OrderGuide.tsx",
                lineNumber: 13,
                columnNumber: 58
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                children: view.title
            }, void 0, false, {
                fileName: "[project]/src/components/work-orders/OrderGuide.tsx",
                lineNumber: 14,
                columnNumber: 5
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                children: view.description
            }, void 0, false, {
                fileName: "[project]/src/components/work-orders/OrderGuide.tsx",
                lineNumber: 14,
                columnNumber: 26
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                className: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$work$2d$orders$2f$work$2d$orders$2e$module$2e$css__$5b$app$2d$ssr$5d$__$28$css__module$29$__["default"].paymentNote,
                children: view.paymentMessage
            }, void 0, false, {
                fileName: "[project]/src/components/work-orders/OrderGuide.tsx",
                lineNumber: 15,
                columnNumber: 5
            }, this),
            finished && job.completionPhotoUrl && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("figure", {
                className: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$work$2d$orders$2f$work$2d$orders$2e$module$2e$css__$5b$app$2d$ssr$5d$__$28$css__module$29$__["default"].completionPhoto,
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$image$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"], {
                        src: job.completionPhotoUrl,
                        alt: "Completed snow clearing",
                        width: 1200,
                        height: 800,
                        unoptimized: true
                    }, void 0, false, {
                        fileName: "[project]/src/components/work-orders/OrderGuide.tsx",
                        lineNumber: 16,
                        columnNumber: 87
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("figcaption", {
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$check$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Check$3e$__["Check"], {
                                size: 15
                            }, void 0, false, {
                                fileName: "[project]/src/components/work-orders/OrderGuide.tsx",
                                lineNumber: 16,
                                columnNumber: 205
                            }, this),
                            " Completion photo"
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/components/work-orders/OrderGuide.tsx",
                        lineNumber: 16,
                        columnNumber: 193
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/src/components/work-orders/OrderGuide.tsx",
                lineNumber: 16,
                columnNumber: 44
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/src/components/work-orders/OrderGuide.tsx",
        lineNumber: 12,
        columnNumber: 10
    }, this);
}
}),
"[project]/src/lib/stripeConnectClient.ts [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "isStripeAccountReady",
    ()=>isStripeAccountReady,
    "stripeConnectFetch",
    ()=>stripeConnectFetch
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$firebase$2f$auth$2f$dist$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/node_modules/firebase/auth/dist/index.mjs [app-ssr] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$firebase$2f$auth$2f$dist$2f$node$2d$esm$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@firebase/auth/dist/node-esm/index.js [app-ssr] (ecmascript)");
;
async function stripeConnectFetch(url, init = {}) {
    const token = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$firebase$2f$auth$2f$dist$2f$node$2d$esm$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["getAuth"])().currentUser?.getIdToken();
    return fetch(url, {
        ...init,
        headers: {
            ...init.headers,
            Authorization: `Bearer ${token || ""}`
        }
    });
}
async function isStripeAccountReady(accountId) {
    if (!accountId) return false;
    const response = await stripeConnectFetch("/api/stripe/account-status", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            accountId
        })
    });
    const data = await response.json();
    return response.ok && data.fullyReady === true;
}
}),
"[project]/src/lib/completeWithPhoto.ts [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "completeWithPhoto",
    ()=>completeWithPhoto
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$stripeConnectClient$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/stripeConnectClient.ts [app-ssr] (ecmascript)");
;
async function completeWithPhoto(job, completionPhotoUrl) {
    async function post(path, body) {
        const response = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$stripeConnectClient$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["stripeConnectFetch"])(path, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(body)
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Could not complete work. Please retry from the work order.");
        return result;
    }
    const result = await post("/api/jobs/action", {
        jobId: job.id,
        revision: job.revision || 0,
        requestId: crypto.randomUUID(),
        action: "photo",
        completionPhotoUrl
    });
    if (job.paymentMethod !== "cash" && job.paymentStatus !== "paid") {
        await post("/api/stripe/capture-payment", {
            paymentIntentId: job.stripePaymentIntentId
        });
        await post("/api/jobs/action", {
            jobId: job.id,
            revision: result.revision,
            requestId: crypto.randomUUID(),
            action: "complete"
        });
    }
}
}),
"[project]/src/components/ui/Modal.tsx [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>Modal
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-dev-runtime.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$hooks$2f$useDialogFocus$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/hooks/useDialogFocus.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$framer$2d$motion$2f$dist$2f$es$2f$components$2f$AnimatePresence$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/framer-motion/dist/es/components/AnimatePresence/index.mjs [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$framer$2d$motion$2f$dist$2f$es$2f$render$2f$components$2f$motion$2f$proxy$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/framer-motion/dist/es/render/components/motion/proxy.mjs [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$x$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__X$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/x.js [app-ssr] (ecmascript) <export default as X>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react.js [app-ssr] (ecmascript)");
"use client";
;
;
;
;
;
const variantStyles = {
    default: {
        iconBg: "bg-[var(--accent-soft)]",
        iconColor: "text-[var(--accent)]",
        accentGlow: "rgba(36, 110, 185, 0.15)"
    },
    danger: {
        iconBg: "bg-red-50 dark:bg-red-500/10",
        iconColor: "text-red-500",
        accentGlow: "rgba(239, 68, 68, 0.15)"
    },
    success: {
        iconBg: "bg-emerald-50 dark:bg-emerald-500/10",
        iconColor: "text-emerald-500",
        accentGlow: "rgba(16, 185, 129, 0.15)"
    },
    info: {
        iconBg: "bg-[var(--accent-soft)]",
        iconColor: "text-[var(--accent)]",
        accentGlow: "rgba(59, 130, 246, 0.15)"
    }
};
const sizeStyles = {
    sm: "max-w-sm",
    md: "max-w-md",
    lg: "max-w-lg"
};
function Modal({ isOpen, onClose, title, subtitle, icon, children, size = "md", showClose = true, variant = "default" }) {
    const overlayRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useRef"])(null);
    const style = variantStyles[variant];
    const dialogRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useRef"])(null);
    const titleId = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useId"])();
    const subtitleId = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useId"])();
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$hooks$2f$useDialogFocus$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useDialogFocus"])(isOpen, dialogRef);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        if (!isOpen || !window.visualViewport) return;
        const viewport = window.visualViewport;
        const update = ()=>{
            const overlay = overlayRef.current;
            if (!overlay) return;
            overlay.style.top = `${viewport.offsetTop}px`;
            overlay.style.left = `${viewport.offsetLeft}px`;
            overlay.style.width = `${viewport.width}px`;
            overlay.style.height = `${viewport.height}px`;
            overlay.style.bottom = "auto";
            overlay.style.setProperty("--modal-viewport-height", `${viewport.height}px`);
        };
        update();
        viewport.addEventListener("resize", update);
        viewport.addEventListener("scroll", update);
        return ()=>{
            viewport.removeEventListener("resize", update);
            viewport.removeEventListener("scroll", update);
        };
    }, [
        isOpen
    ]);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        const handleEsc = (e)=>{
            if (e.key === "Escape") onClose();
        };
        if (isOpen) window.addEventListener("keydown", handleEsc);
        return ()=>window.removeEventListener("keydown", handleEsc);
    }, [
        isOpen,
        onClose
    ]);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$framer$2d$motion$2f$dist$2f$es$2f$components$2f$AnimatePresence$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["AnimatePresence"], {
        children: isOpen && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$framer$2d$motion$2f$dist$2f$es$2f$render$2f$components$2f$motion$2f$proxy$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["motion"].div, {
            ref: overlayRef,
            className: "app-modal-overlay fixed inset-0 z-[9999] flex items-end justify-center p-0 sm:items-center sm:p-4",
            initial: {
                opacity: 0
            },
            animate: {
                opacity: 1
            },
            exit: {
                opacity: 0
            },
            transition: {
                duration: 0.2
            },
            onClick: (e)=>{
                if (e.target === overlayRef.current) onClose();
            },
            children: [
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "pointer-events-none absolute inset-0 bg-[var(--ink)]/35 backdrop-blur-sm"
                }, void 0, false, {
                    fileName: "[project]/src/components/ui/Modal.tsx",
                    lineNumber: 113,
                    columnNumber: 11
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$framer$2d$motion$2f$dist$2f$es$2f$render$2f$components$2f$motion$2f$proxy$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["motion"].div, {
                    ref: dialogRef,
                    style: {
                        maxHeight: "calc(var(--modal-viewport-height, 100dvh) - 2rem)"
                    },
                    role: "dialog",
                    "aria-modal": "true",
                    "aria-labelledby": title ? titleId : undefined,
                    "aria-label": title ? undefined : "Dialog",
                    "aria-describedby": subtitle ? subtitleId : undefined,
                    tabIndex: -1,
                    className: `app-modal-panel relative max-h-[calc(100dvh-1rem)] sm:max-h-[calc(100dvh-2rem)] overflow-y-auto w-full ${sizeStyles[size]} bg-[var(--bg-card-solid)] rounded-t-3xl sm:rounded-3xl shadow-[var(--surface-shadow-strong)] border border-[var(--border-color)]`,
                    initial: {
                        scale: 0.98,
                        opacity: 0,
                        y: 12
                    },
                    animate: {
                        scale: 1,
                        opacity: 1,
                        y: 0
                    },
                    exit: {
                        scale: 0.98,
                        opacity: 0,
                        y: 12
                    },
                    transition: {
                        duration: 0.18,
                        ease: "easeOut"
                    },
                    onClick: (e)=>e.stopPropagation(),
                    children: [
                        showClose && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                            onClick: onClose,
                            type: "button",
                            "aria-label": "Close dialog",
                            className: "absolute top-4 right-4 p-3 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] transition-all z-10",
                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$x$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__X$3e$__["X"], {
                                className: "w-5 h-5"
                            }, void 0, false, {
                                fileName: "[project]/src/components/ui/Modal.tsx",
                                lineNumber: 140,
                                columnNumber: 17
                            }, this)
                        }, void 0, false, {
                            fileName: "[project]/src/components/ui/Modal.tsx",
                            lineNumber: 134,
                            columnNumber: 15
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "p-5 pt-8 pb-[max(20px,env(safe-area-inset-bottom))] sm:p-6 sm:pt-8",
                            children: [
                                icon && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: `w-14 h-14 ${style.iconBg} rounded-2xl flex items-center justify-center mx-auto mb-4`,
                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: style.iconColor,
                                        children: icon
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/ui/Modal.tsx",
                                        lineNumber: 148,
                                        columnNumber: 19
                                    }, this)
                                }, void 0, false, {
                                    fileName: "[project]/src/components/ui/Modal.tsx",
                                    lineNumber: 147,
                                    columnNumber: 17
                                }, this),
                                title && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                                    id: titleId,
                                    className: "text-xl font-semibold text-[var(--text-primary)] text-center px-10 break-words",
                                    children: title
                                }, void 0, false, {
                                    fileName: "[project]/src/components/ui/Modal.tsx",
                                    lineNumber: 154,
                                    columnNumber: 17
                                }, this),
                                subtitle && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                    id: subtitleId,
                                    className: "text-sm text-[var(--text-secondary)] text-center mt-2 leading-relaxed break-words",
                                    children: subtitle
                                }, void 0, false, {
                                    fileName: "[project]/src/components/ui/Modal.tsx",
                                    lineNumber: 159,
                                    columnNumber: 17
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: title || subtitle || icon ? "mt-6" : "",
                                    children: children
                                }, void 0, false, {
                                    fileName: "[project]/src/components/ui/Modal.tsx",
                                    lineNumber: 165,
                                    columnNumber: 15
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/src/components/ui/Modal.tsx",
                            lineNumber: 144,
                            columnNumber: 13
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/src/components/ui/Modal.tsx",
                    lineNumber: 116,
                    columnNumber: 11
                }, this)
            ]
        }, void 0, true, {
            fileName: "[project]/src/components/ui/Modal.tsx",
            lineNumber: 101,
            columnNumber: 9
        }, this)
    }, void 0, false, {
        fileName: "[project]/src/components/ui/Modal.tsx",
        lineNumber: 99,
        columnNumber: 5
    }, this);
}
}),
"[project]/src/lib/completionPhoto.ts [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "MAX_PHOTO_LENGTH",
    ()=>MAX_PHOTO_LENGTH,
    "prepareCompletionPhoto",
    ()=>prepareCompletionPhoto,
    "validCompletionPhoto",
    ()=>validCompletionPhoto
]);
const MAX_PHOTO_LENGTH = 700000;
function validCompletionPhoto(value) {
    return typeof value === "string" && value.length <= MAX_PHOTO_LENGTH && /^data:image\/jpeg;base64,\/9j\/[A-Za-z0-9+/]+={0,2}$/.test(value);
}
async function prepareCompletionPhoto(file) {
    if (file.size > 30 * 1024 * 1024) throw new Error("Choose a photo under 30 MB.");
    if (file.type && !file.type.startsWith("image/")) throw new Error("Choose an image file.");
    const url = URL.createObjectURL(file);
    try {
        const img = new Image();
        img.src = url;
        await new Promise((resolve, reject)=>{
            img.onload = ()=>resolve();
            img.onerror = ()=>reject(new Error("This photo format cannot be opened. Choose a JPEG or PNG, or take a new photo."));
        });
        const canvas = document.createElement("canvas");
        let edge = 1600;
        for(let attempt = 0; attempt < 5; attempt++){
            const ratio = Math.min(1, edge / Math.max(img.naturalWidth, img.naturalHeight));
            canvas.width = Math.max(1, Math.round(img.naturalWidth * ratio));
            canvas.height = Math.max(1, Math.round(img.naturalHeight * ratio));
            const context = canvas.getContext("2d");
            if (!context) throw new Error("Your browser could not prepare this photo.");
            context.fillStyle = "white";
            context.fillRect(0, 0, canvas.width, canvas.height);
            context.drawImage(img, 0, 0, canvas.width, canvas.height);
            const data = canvas.toDataURL("image/jpeg", 0.8 - attempt * 0.1);
            if (validCompletionPhoto(data)) return data;
            edge *= 0.75;
        }
        throw new Error("Choose a smaller photo.");
    } finally{
        URL.revokeObjectURL(url);
    }
}
}),
"[project]/src/components/work-orders/PhotoPicker.tsx [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>PhotoPicker
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-dev-runtime.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$image$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/image.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$completionPhoto$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/completionPhoto.ts [app-ssr] (ecmascript)");
"use client";
;
;
;
;
function PhotoPicker({ photo, onChange, disabled, onBusy, showCamera = true }) {
    const [busy, setBusy] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(false);
    const [error, setError] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])("");
    async function choose(file) {
        if (!file) return;
        setBusy(true);
        onBusy?.(true);
        setError("");
        onChange("");
        try {
            onChange(await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$completionPhoto$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["prepareCompletionPhoto"])(file));
        } catch (e) {
            setError(e instanceof Error ? e.message : "Could not open this photo.");
        } finally{
            setBusy(false);
            onBusy?.(false);
        }
    }
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "space-y-3",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "flex flex-wrap gap-3",
                children: [
                    false,
                    true
                ].filter((camera)=>showCamera !== false || !camera).map((camera)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                        className: `rounded-xl border p-3 font-semibold ${busy || disabled ? "opacity-50" : "cursor-pointer"}`,
                        children: [
                            camera ? "Take a photo" : "Choose from gallery or files",
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                className: "sr-only",
                                type: "file",
                                accept: "image/*",
                                capture: camera ? "environment" : undefined,
                                disabled: busy || disabled,
                                onChange: (e)=>{
                                    void choose(e.target.files?.[0]);
                                    e.target.value = "";
                                }
                            }, void 0, false, {
                                fileName: "[project]/src/components/work-orders/PhotoPicker.tsx",
                                lineNumber: 22,
                                columnNumber: 9
                            }, this)
                        ]
                    }, String(camera), true, {
                        fileName: "[project]/src/components/work-orders/PhotoPicker.tsx",
                        lineNumber: 20,
                        columnNumber: 86
                    }, this))
            }, void 0, false, {
                fileName: "[project]/src/components/work-orders/PhotoPicker.tsx",
                lineNumber: 19,
                columnNumber: 5
            }, this),
            busy && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                role: "status",
                children: "Preparing photo…"
            }, void 0, false, {
                fileName: "[project]/src/components/work-orders/PhotoPicker.tsx",
                lineNumber: 25,
                columnNumber: 14
            }, this),
            error && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                role: "alert",
                className: "text-red-700",
                children: error
            }, void 0, false, {
                fileName: "[project]/src/components/work-orders/PhotoPicker.tsx",
                lineNumber: 26,
                columnNumber: 15
            }, this),
            photo && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$image$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"], {
                unoptimized: true,
                width: 1600,
                height: 1200,
                src: photo,
                alt: "Completion photo preview",
                className: "max-h-52 w-full rounded-xl object-contain"
            }, void 0, false, {
                fileName: "[project]/src/components/work-orders/PhotoPicker.tsx",
                lineNumber: 27,
                columnNumber: 15
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/src/components/work-orders/PhotoPicker.tsx",
        lineNumber: 18,
        columnNumber: 10
    }, this);
}
}),
"[project]/src/components/work-orders/PhonePhotoTransfer.tsx [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>PhonePhotoTransfer
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-dev-runtime.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$image$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/image.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$stripeConnectClient$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/stripeConnectClient.ts [app-ssr] (ecmascript)");
"use client";
;
;
;
;
async function transfer(jobId, action, sessionId) {
    const response = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$stripeConnectClient$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["stripeConnectFetch"])("/api/jobs/photo-transfer", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            jobId,
            action,
            sessionId
        })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Could not connect to your phone. Try again.");
    return data;
}
function PhonePhotoTransfer({ jobId, onPhoto, disabled, autoStart = false }) {
    const [qr, setQr] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(""), [error, setError] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])("");
    const [busy, setBusy] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(false), [received, setReceived] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(false);
    const [expiresAt, setExpiresAt] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(0);
    const [sessionId, setSessionId] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])("");
    const activeSession = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useRef"])("");
    const started = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useRef"])(false);
    const callback = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useRef"])(onPhoto);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        callback.current = onPhoto;
    }, [
        onPhoto
    ]);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        if (!qr) return;
        let stopped = false;
        let timer;
        async function poll() {
            if (Date.now() >= expiresAt) {
                setQr("");
                setError("QR code expired. Create a new one to continue.");
                return;
            }
            try {
                const data = await transfer(jobId, "status", sessionId);
                if (stopped) return;
                if (data.photo) {
                    callback.current(data.photo);
                    setReceived(true);
                    setQr("");
                    return;
                }
                setError("");
            } catch (e) {
                if (stopped) return;
                setError(e instanceof Error ? e.message : "Connection interrupted. Retrying…");
            }
            if (!stopped) timer = setTimeout(poll, 2500);
        }
        void poll();
        return ()=>{
            stopped = true;
            clearTimeout(timer);
        };
    }, [
        qr,
        jobId,
        expiresAt,
        sessionId
    ]);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>()=>{
            if (activeSession.current) void transfer(jobId, "close", activeSession.current).catch(()=>{});
        }, [
        jobId
    ]);
    const create = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useCallback"])(async ()=>{
        setBusy(true);
        setError("");
        setReceived(false);
        try {
            const data = await transfer(jobId, "create");
            activeSession.current = data.sessionId;
            setSessionId(data.sessionId);
            const QRCode = (await __turbopack_context__.A("[project]/node_modules/qrcode/lib/index.js [app-ssr] (ecmascript, async loader)")).default;
            const url = `${window.location.origin}/photo-upload#job=${encodeURIComponent(jobId)}&token=${data.token}`;
            setQr(await QRCode.toDataURL(url, {
                width: 240,
                margin: 4,
                errorCorrectionLevel: "M"
            }));
            setExpiresAt(data.expiresAt);
        } catch (e) {
            setError(e instanceof Error ? e.message : "Could not create QR code.");
        } finally{
            setBusy(false);
        }
    }, [
        jobId
    ]);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        if (!autoStart || disabled || started.current) return;
        started.current = true;
        void create();
    }, [
        autoStart,
        create,
        disabled
    ]);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "space-y-3 border-t pt-4",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                className: "font-semibold",
                children: "Upload from your phone"
            }, void 0, false, {
                fileName: "[project]/src/components/work-orders/PhonePhotoTransfer.tsx",
                lineNumber: 66,
                columnNumber: 5
            }, this),
            qr ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Fragment"], {
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$image$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"], {
                        unoptimized: true,
                        src: qr,
                        alt: "Scan this QR code to upload a completion photo from your phone",
                        width: 240,
                        height: 240,
                        className: "mx-auto"
                    }, void 0, false, {
                        fileName: "[project]/src/components/work-orders/PhonePhotoTransfer.tsx",
                        lineNumber: 68,
                        columnNumber: 7
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                        className: "text-sm",
                        role: "status",
                        children: "Scan with your phone’s camera. Choose or take a photo, then send it here. Keep this window open. This link expires in 10 minutes."
                    }, void 0, false, {
                        fileName: "[project]/src/components/work-orders/PhonePhotoTransfer.tsx",
                        lineNumber: 69,
                        columnNumber: 7
                    }, this)
                ]
            }, void 0, true) : autoStart ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                role: "status",
                children: busy ? "Creating QR code…" : "Preparing phone upload…"
            }, void 0, false, {
                fileName: "[project]/src/components/work-orders/PhonePhotoTransfer.tsx",
                lineNumber: 70,
                columnNumber: 23
            }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                type: "button",
                disabled: busy || disabled,
                onClick: create,
                className: "min-h-12 rounded-xl border px-4 py-3 font-semibold disabled:opacity-50",
                children: busy ? "Creating QR code…" : "Show QR code"
            }, void 0, false, {
                fileName: "[project]/src/components/work-orders/PhonePhotoTransfer.tsx",
                lineNumber: 70,
                columnNumber: 103
            }, this),
            received && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                role: "status",
                children: "Photo received. Completing the work order…"
            }, void 0, false, {
                fileName: "[project]/src/components/work-orders/PhonePhotoTransfer.tsx",
                lineNumber: 71,
                columnNumber: 18
            }, this),
            error && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                role: "alert",
                className: "text-red-700",
                children: error
            }, void 0, false, {
                fileName: "[project]/src/components/work-orders/PhonePhotoTransfer.tsx",
                lineNumber: 72,
                columnNumber: 15
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/src/components/work-orders/PhonePhotoTransfer.tsx",
        lineNumber: 65,
        columnNumber: 10
    }, this);
}
}),
"[project]/src/components/work-orders/OrderActions.tsx [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>OrderActions,
    "orderRequest",
    ()=>orderRequest
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-dev-runtime.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$completeWithPhoto$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/completeWithPhoto.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/navigation.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$context$2f$AuthContext$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/context/AuthContext.tsx [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$stripeConnectClient$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/stripeConnectClient.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$workOrders$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/workOrders.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$Modal$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/components/ui/Modal.tsx [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$shared$2f$lib$2f$app$2d$dynamic$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/shared/lib/app-dynamic.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/client/app-dir/link.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$work$2d$orders$2f$PhotoPicker$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/components/work-orders/PhotoPicker.tsx [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$work$2d$orders$2f$PhonePhotoTransfer$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/components/work-orders/PhonePhotoTransfer.tsx [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$check$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Check$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/check.js [app-ssr] (ecmascript) <export default as Check>");
;
"use client";
;
;
;
;
;
;
;
;
;
const StripeCheckout = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$shared$2f$lib$2f$app$2d$dynamic$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"])(async ()=>{}, {
    loadableGenerated: {
        modules: [
            "[project]/src/components/StripeCheckout.tsx [app-client] (ecmascript, next/dynamic entry)"
        ]
    },
    ssr: false
});
;
;
;
;
async function orderRequest(path, body) {
    const response = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$stripeConnectClient$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["stripeConnectFetch"])(path, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(body)
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "The action could not be completed.");
    return data;
}
const button = "motion-safe:transition motion-safe:active:scale-[0.98] min-h-11 rounded-lg border border-[var(--border-color)] bg-[var(--bg-card-solid)] text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 px-4 py-3 text-sm font-semibold disabled:opacity-50";
const attentionButton = `${button} enabled:!border-[var(--ink)] enabled:!bg-[var(--ink)] enabled:!text-white enabled:hover:!bg-[var(--accent-dark)]`;
const dangerButton = `${button} border-red-200 text-red-700 hover:!border-red-300 hover:!bg-red-50`;
const confirmDangerButton = `${button} !border-red-700 !bg-red-700 !text-white hover:!bg-red-800`;
function OrderActions({ job, onUpdated, activeOrder, bookingUnavailable = false, compact = false, navigateOnUpdate = true }) {
    const { user } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$context$2f$AuthContext$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useAuth"])();
    const router = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useRouter"])();
    const uid = user?.uid || "", operator = uid === job.operatorId, closed = [
        "completed",
        "cancelled"
    ].includes(job.status);
    const [busy, setBusy] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(false), [error, setError] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(""), [notice, setNotice] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(""), [success, setSuccess] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])("");
    const [dialog, setDialog] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])("");
    const [time, setTime] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(""), [asap, setAsap] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(false), [cash, setCash] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(false);
    const [secret, setSecret] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(""), [photo, setPhoto] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])("");
    const [preparingPhoto, setPreparingPhoto] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(false);
    const desktopPhotoFlow = ("TURBOPACK compile-time value", "undefined") !== "undefined" && typeof window.matchMedia === "function" && window.matchMedia("(min-width: 768px)").matches;
    const pendingRequest = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useRef"])(null);
    const perform = async (action, extra = {})=>{
        const payload = {
            jobId: job.id,
            revision: job.revision || 0,
            action,
            ...extra
        };
        const key = JSON.stringify(payload);
        if (pendingRequest.current?.key !== key) pendingRequest.current = {
            key,
            id: crypto.randomUUID()
        };
        return orderRequest("/api/jobs/action", {
            ...payload,
            requestId: pendingRequest.current.id
        });
    };
    const openWorkOrder = ()=>{
        const target = `/dashboard/jobs/${job.id}`;
        if (window.location.pathname !== target) router.push(target);
    };
    const run = async (fn, navigate = navigateOnUpdate, nextDialog = "", successMessage = "Work order updated successfully.")=>{
        if (busy) return;
        setBusy(true);
        setError("");
        setNotice("");
        setSuccess("");
        try {
            await fn();
            pendingRequest.current = null;
            setSuccess(successMessage);
            setDialog(nextDialog);
            if (navigate) {
                openWorkOrder();
                onUpdated?.(`Order #${(0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$workOrders$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["orderNumber"])(job)} updated.`);
            }
        } catch (e) {
            setError(e instanceof Error ? e.message : "Please try again.");
        } finally{
            setBusy(false);
        }
    };
    const approve = (action)=>{
        if (!operator && job.paymentMethod === "cash" && !job.cashPaymentAcknowledged) {
            setDialog("approve");
            return;
        }
        const message = action === "accept" ? "Booking confirmed successfully." : "New visit time approved successfully.";
        void run(()=>perform(action, {
                proposalId: job.scheduleProposal?.id
            }), navigateOnUpdate, "action-success", message);
    };
    const pay = ()=>run(async ()=>{
            const data = await orderRequest("/api/stripe/create-payment-intent", {
                jobId: job.id
            });
            setSecret(data.clientSecret);
        }, false);
    const complete = (cashReceived = false)=>run(async ()=>{
            if (job.paymentMethod !== "cash") await orderRequest("/api/stripe/capture-payment", {
                paymentIntentId: job.stripePaymentIntentId
            });
            if (cashReceived) await orderRequest("/api/jobs/confirm-cash", {
                jobId: job.id
            });
            await perform("complete");
        });
    const actionNeeded = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$workOrders$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["orderActionNeeded"])(job, uid);
    const submitCompletionPhoto = (selectedPhoto)=>{
        setPhoto(selectedPhoto);
        void run(()=>(0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$completeWithPhoto$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["completeWithPhoto"])(job, selectedPhoto), false, job.paymentMethod === "cash" ? "complete-cash" : "completion-success", "Work completed");
    };
    const shareJourney = async ()=>{
        if (!navigator.geolocation) throw new Error("Location sharing is not supported on this device.");
        const position = await new Promise((resolve, reject)=>{
            navigator.geolocation.getCurrentPosition(resolve, reject, {
                enableHighAccuracy: true,
                timeout: 12000,
                maximumAge: 30000
            });
        }).catch((error)=>{
            if (error.code === error.PERMISSION_DENIED) throw new Error("Allow location access to send your arrival time.");
            if (error.code === error.TIMEOUT) throw new Error("Your location took too long to load. Move somewhere with a clearer signal and try again.");
            throw new Error("Your current location could not be found. Check location services and try again.");
        });
        return perform("en-route", {
            operatorLat: position.coords.latitude,
            operatorLng: position.coords.longitude,
            operatorLocationAccuracy: position.coords.accuracy
        });
    };
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "mt-4 space-y-3",
        children: [
            success && dialog !== "action-success" && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                className: "guided-success",
                role: "status",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                        className: "guided-success-icon",
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$check$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Check$3e$__["Check"], {
                            size: 16,
                            "aria-hidden": "true"
                        }, void 0, false, {
                            fileName: "[project]/src/components/work-orders/OrderActions.tsx",
                            lineNumber: 194,
                            columnNumber: 49
                        }, this)
                    }, void 0, false, {
                        fileName: "[project]/src/components/work-orders/OrderActions.tsx",
                        lineNumber: 194,
                        columnNumber: 11
                    }, this),
                    success
                ]
            }, void 0, true, {
                fileName: "[project]/src/components/work-orders/OrderActions.tsx",
                lineNumber: 193,
                columnNumber: 9
            }, this),
            actionNeeded && job.status !== "cancelled" && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                className: "text-sm font-semibold text-[var(--ink)]",
                children: [
                    "Next step: ",
                    actionNeeded
                ]
            }, void 0, true, {
                fileName: "[project]/src/components/work-orders/OrderActions.tsx",
                lineNumber: 199,
                columnNumber: 9
            }, this),
            !actionNeeded && job.status === "pending" && !job.scheduleProposal && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                className: "text-sm text-[var(--text-secondary)]",
                children: [
                    "Waiting for ",
                    operator ? "the customer" : "the service provider",
                    " to respond. You’ll see the update here."
                ]
            }, void 0, true, {
                fileName: "[project]/src/components/work-orders/OrderActions.tsx",
                lineNumber: 204,
                columnNumber: 9
            }, this),
            job.scheduleProposal && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "rounded-lg border border-[var(--border-color)] bg-[var(--bg-secondary)] p-3 text-sm",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("strong", {
                        children: job.scheduleProposal.recipientId === uid ? "Your approval needed" : "Awaiting approval of new time"
                    }, void 0, false, {
                        fileName: "[project]/src/components/work-orders/OrderActions.tsx",
                        lineNumber: 211,
                        columnNumber: 11
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                        children: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$workOrders$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["scheduleText"])(job.scheduleProposal)
                    }, void 0, false, {
                        fileName: "[project]/src/components/work-orders/OrderActions.tsx",
                        lineNumber: 216,
                        columnNumber: 11
                    }, this),
                    job.status === "accepted" && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                        children: "The current appointment stays booked until this change is approved."
                    }, void 0, false, {
                        fileName: "[project]/src/components/work-orders/OrderActions.tsx",
                        lineNumber: 218,
                        columnNumber: 13
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/src/components/work-orders/OrderActions.tsx",
                lineNumber: 210,
                columnNumber: 9
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "flex flex-wrap gap-2 [&>button]:first-of-type:shadow-[0_8px_22px_rgba(23,60,44,0.14)]",
                children: [
                    !closed && job.scheduleProposal?.recipientId === uid && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Fragment"], {
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                className: actionNeeded ? attentionButton : button,
                                disabled: busy,
                                onClick: ()=>approve("approve-time"),
                                children: "Approve time"
                            }, void 0, false, {
                                fileName: "[project]/src/components/work-orders/OrderActions.tsx",
                                lineNumber: 228,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                className: dangerButton,
                                disabled: busy,
                                onClick: ()=>run(()=>perform("decline-time", {
                                            proposalId: job.scheduleProposal?.id
                                        }), navigateOnUpdate, "action-success", "The proposed time was declined. The original visit remains unchanged."),
                                children: "Decline time"
                            }, void 0, false, {
                                fileName: "[project]/src/components/work-orders/OrderActions.tsx",
                                lineNumber: 235,
                                columnNumber: 13
                            }, this)
                        ]
                    }, void 0, true),
                    job.status === "pending" && !job.scheduleProposal && (job.awaitingResponseFrom || job.operatorId) === uid && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Fragment"], {
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                className: actionNeeded ? attentionButton : button,
                                disabled: busy,
                                onClick: ()=>approve("accept"),
                                children: operator ? "Accept" : "Approve booking"
                            }, void 0, false, {
                                fileName: "[project]/src/components/work-orders/OrderActions.tsx",
                                lineNumber: 257,
                                columnNumber: 15
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                className: dangerButton,
                                disabled: busy,
                                onClick: ()=>setDialog("decline"),
                                children: "Decline"
                            }, void 0, false, {
                                fileName: "[project]/src/components/work-orders/OrderActions.tsx",
                                lineNumber: 264,
                                columnNumber: 15
                            }, this)
                        ]
                    }, void 0, true),
                    !operator && job.status === "accepted" && job.paymentMethod !== "cash" && ![
                        "held",
                        "paid"
                    ].includes(job.paymentStatus) && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                        className: actionNeeded ? attentionButton : button,
                        disabled: busy,
                        onClick: pay,
                        children: [
                            "Authorize card · $",
                            job.price.toFixed(2)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/components/work-orders/OrderActions.tsx",
                        lineNumber: 277,
                        columnNumber: 13
                    }, this),
                    operator && !job.scheduleProposal && job.status === "accepted" && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                        className: attentionButton,
                        disabled: busy || job.paymentMethod !== "cash" && ![
                            "held",
                            "paid"
                        ].includes(job.paymentStatus),
                        onClick: ()=>run(shareJourney, navigateOnUpdate, "action-success", "You are now marked on the way. The customer received your ETA."),
                        children: "On my way"
                    }, void 0, false, {
                        fileName: "[project]/src/components/work-orders/OrderActions.tsx",
                        lineNumber: 286,
                        columnNumber: 11
                    }, this),
                    operator && !job.scheduleProposal && job.status === "en-route" && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Fragment"], {
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                className: job.status === "en-route" ? attentionButton : button,
                                disabled: busy || job.paymentMethod !== "cash" && ![
                                    "held",
                                    "paid"
                                ].includes(job.paymentStatus),
                                onClick: ()=>run(()=>perform("in-progress"), navigateOnUpdate, "action-success", "Work started successfully. Add photo proof when the clearing is complete."),
                                children: "Start work"
                            }, void 0, false, {
                                fileName: "[project]/src/components/work-orders/OrderActions.tsx",
                                lineNumber: 302,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                className: button,
                                disabled: busy,
                                onClick: ()=>run(()=>perform("return-to-confirmed"), navigateOnUpdate, "action-success", "The visit is back to confirmed. The shared ETA and location were removed."),
                                children: "Go back to confirmed"
                            }, void 0, false, {
                                fileName: "[project]/src/components/work-orders/OrderActions.tsx",
                                lineNumber: 313,
                                columnNumber: 13
                            }, this)
                        ]
                    }, void 0, true),
                    operator && job.status === "in-progress" && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Fragment"], {
                        children: [
                            !job.completionPhotoUrl && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                className: !job.completionPhotoUrl ? attentionButton : button,
                                disabled: busy,
                                onClick: ()=>setDialog("photo"),
                                children: job.completionPhotoUrl ? "Update photo proof" : "Add photo & complete work"
                            }, void 0, false, {
                                fileName: "[project]/src/components/work-orders/OrderActions.tsx",
                                lineNumber: 324,
                                columnNumber: 41
                            }, this),
                            job.completionPhotoUrl && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                className: attentionButton,
                                disabled: busy || !job.completionPhotoUrl,
                                onClick: ()=>job.completionPhotoUrl ? job.paymentMethod === "cash" && job.paymentStatus === "pending" ? setDialog("complete-cash") : complete() : setDialog("photo"),
                                children: "Complete work"
                            }, void 0, false, {
                                fileName: "[project]/src/components/work-orders/OrderActions.tsx",
                                lineNumber: 333,
                                columnNumber: 40
                            }, this)
                        ]
                    }, void 0, true),
                    operator && job.paymentMethod === "cash" && (job.status === "completed" || job.status === "cancelled" && job.paymentStatus === "refunded") && [
                        "pending",
                        "refunded"
                    ].includes(job.paymentStatus) && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                        className: job.status === "completed" ? attentionButton : button,
                        disabled: busy,
                        onClick: ()=>setDialog("cash"),
                        children: job.paymentStatus === "refunded" ? "Record cash received again" : "Confirm cash received"
                    }, void 0, false, {
                        fileName: "[project]/src/components/work-orders/OrderActions.tsx",
                        lineNumber: 353,
                        columnNumber: 13
                    }, this),
                    closed && activeOrder && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"], {
                        className: button,
                        href: `/dashboard/jobs/${activeOrder.id}`,
                        children: "View current open work order"
                    }, void 0, false, {
                        fileName: "[project]/src/components/work-orders/OrderActions.tsx",
                        lineNumber: 361,
                        columnNumber: 35
                    }, this),
                    closed && !activeOrder && !bookingUnavailable && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"], {
                        className: button,
                        href: `/dashboard/jobs/new?previousOrder=${encodeURIComponent(job.id)}`,
                        children: operator ? "Propose another booking" : "Request again"
                    }, void 0, false, {
                        fileName: "[project]/src/components/work-orders/OrderActions.tsx",
                        lineNumber: 363,
                        columnNumber: 11
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/src/components/work-orders/OrderActions.tsx",
                lineNumber: 225,
                columnNumber: 7
            }, this),
            !compact && (!closed || operator && job.paymentMethod === "cash" && job.paymentStatus === "paid" || job.status === "cancelled" && job.stripePaymentIntentId && job.paymentStatus !== "refunded") && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("section", {
                className: "rounded-xl border border-[var(--border-color)] p-3",
                "aria-labelledby": `more-options-${job.id}`,
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                        id: `more-options-${job.id}`,
                        className: "py-2 text-sm font-semibold",
                        children: "More options"
                    }, void 0, false, {
                        fileName: "[project]/src/components/work-orders/OrderActions.tsx",
                        lineNumber: 372,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "flex flex-wrap gap-2 pt-1",
                        children: [
                            operator && job.paymentMethod === "cash" && job.status === "in-progress" && [
                                "pending",
                                "refunded"
                            ].includes(job.paymentStatus) && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                className: button,
                                disabled: busy,
                                onClick: ()=>setDialog("cash"),
                                children: job.paymentStatus === "refunded" ? "Record cash received again" : "Confirm cash received"
                            }, void 0, false, {
                                fileName: "[project]/src/components/work-orders/OrderActions.tsx",
                                lineNumber: 378,
                                columnNumber: 13
                            }, this),
                            operator && !job.scheduleProposal && job.status === "accepted" && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                className: button,
                                disabled: busy || job.paymentMethod !== "cash" && ![
                                    "held",
                                    "paid"
                                ].includes(job.paymentStatus),
                                onClick: ()=>run(()=>perform("in-progress"), navigateOnUpdate, "action-success", "Work started successfully. Add photo proof when the clearing is complete."),
                                children: "Start work"
                            }, void 0, false, {
                                fileName: "[project]/src/components/work-orders/OrderActions.tsx",
                                lineNumber: 390,
                                columnNumber: 13
                            }, this),
                            !job.scheduleProposal && (job.status === "accepted" || job.status === "pending" && (job.awaitingResponseFrom || job.operatorId) === uid) && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                className: button,
                                disabled: busy,
                                onClick: ()=>setDialog("time"),
                                children: "Propose new time"
                            }, void 0, false, {
                                fileName: "[project]/src/components/work-orders/OrderActions.tsx",
                                lineNumber: 407,
                                columnNumber: 13
                            }, this),
                            operator && job.paymentMethod === "cash" && job.paymentStatus === "paid" && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                className: button,
                                disabled: busy,
                                onClick: ()=>setDialog("refund"),
                                children: "Record cash returned"
                            }, void 0, false, {
                                fileName: "[project]/src/components/work-orders/OrderActions.tsx",
                                lineNumber: 418,
                                columnNumber: 13
                            }, this),
                            [
                                "pending",
                                "accepted"
                            ].includes(job.status) && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                className: dangerButton,
                                disabled: busy,
                                onClick: ()=>setDialog("cancel"),
                                children: "Cancel order"
                            }, void 0, false, {
                                fileName: "[project]/src/components/work-orders/OrderActions.tsx",
                                lineNumber: 427,
                                columnNumber: 11
                            }, this),
                            job.status === "cancelled" && job.stripePaymentIntentId && job.paymentStatus !== "refunded" && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                className: button,
                                disabled: busy,
                                onClick: ()=>run(async ()=>{
                                        const data = await orderRequest("/api/jobs/cancel", {
                                            jobId: job.id
                                        });
                                        setNotice(data.warning || "Card hold release checked.");
                                    }),
                                children: "Check card hold release"
                            }, void 0, false, {
                                fileName: "[project]/src/components/work-orders/OrderActions.tsx",
                                lineNumber: 438,
                                columnNumber: 13
                            }, this),
                            operator && job.status === "in-progress" && job.completionPhotoUrl && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                className: !job.completionPhotoUrl ? attentionButton : button,
                                disabled: busy,
                                onClick: ()=>setDialog("photo"),
                                children: job.completionPhotoUrl ? "Update photo proof" : "Add photo & complete work"
                            }, void 0, false, {
                                fileName: "[project]/src/components/work-orders/OrderActions.tsx",
                                lineNumber: 453,
                                columnNumber: 93
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/components/work-orders/OrderActions.tsx",
                        lineNumber: 373,
                        columnNumber: 9
                    }, this),
                    [
                        "en-route",
                        "in-progress"
                    ].includes(job.status) && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                        className: "w-full text-sm text-[var(--text-secondary)]",
                        children: [
                            "Need to cancel after departure? Call support at ",
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("a", {
                                className: "font-semibold underline",
                                href: "tel:+14379223895",
                                children: "437-922-3895"
                            }, void 0, false, {
                                fileName: "[project]/src/components/work-orders/OrderActions.tsx",
                                lineNumber: 464,
                                columnNumber: 169
                            }, this),
                            "."
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/components/work-orders/OrderActions.tsx",
                        lineNumber: 464,
                        columnNumber: 62
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/src/components/work-orders/OrderActions.tsx",
                lineNumber: 371,
                columnNumber: 208
            }, this),
            !compact && operator && job.status === "accepted" && job.paymentMethod !== "cash" && ![
                "held",
                "paid"
            ].includes(job.paymentStatus) && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                className: "text-sm",
                children: "Waiting for the customer’s card authorization before work can start."
            }, void 0, false, {
                fileName: "[project]/src/components/work-orders/OrderActions.tsx",
                lineNumber: 470,
                columnNumber: 11
            }, this),
            !compact && job.status === "in-progress" && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                className: "text-sm text-[var(--text-secondary)]",
                children: operator ? job.completionPhotoUrl ? "Photo saved. Finish completing this order below." : "Take a photo of the cleared areas, then finish the visit." : "Your provider is working. Completion proof will be available in this order when uploaded."
            }, void 0, false, {
                fileName: "[project]/src/components/work-orders/OrderActions.tsx",
                lineNumber: 475,
                columnNumber: 9
            }, this),
            !compact && !operator && job.status === "accepted" && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                className: "text-sm text-[var(--text-secondary)]",
                children: job.paymentMethod !== "cash" && ![
                    "held",
                    "paid"
                ].includes(job.paymentStatus) ? "Authorize your card before the provider starts. The payment is captured when work is completed." : "Your visit is confirmed. The provider will update this order when they are on the way."
            }, void 0, false, {
                fileName: "[project]/src/components/work-orders/OrderActions.tsx",
                lineNumber: 482,
                columnNumber: 9
            }, this),
            busy && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                role: "status",
                children: "Updating work order…"
            }, void 0, false, {
                fileName: "[project]/src/components/work-orders/OrderActions.tsx",
                lineNumber: 488,
                columnNumber: 16
            }, this),
            error && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                role: "alert",
                className: "text-sm text-red-700",
                children: error
            }, void 0, false, {
                fileName: "[project]/src/components/work-orders/OrderActions.tsx",
                lineNumber: 490,
                columnNumber: 9
            }, this),
            notice && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                role: "status",
                className: "text-sm",
                children: notice
            }, void 0, false, {
                fileName: "[project]/src/components/work-orders/OrderActions.tsx",
                lineNumber: 495,
                columnNumber: 9
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$Modal$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"], {
                isOpen: !!dialog,
                onClose: ()=>{
                    if (!busy) setDialog("");
                },
                title: {
                    "finish-after-cash": "Cash received · finish your work order",
                    "complete-cash": "Did you receive the cash payment?",
                    cancel: "Cancel this order?",
                    decline: "Decline this request?",
                    time: "Propose a new time",
                    photo: "Completion photo",
                    cash: "Confirm cash received",
                    refund: "Record cash returned",
                    approve: "Approve cash booking",
                    "action-success": "Update complete",
                    "completion-success": "Job completed",
                    "": ""
                }[dialog],
                variant: dialog === "cancel" || dialog === "decline" || dialog === "refund" ? "danger" : "default",
                children: [
                    dialog === "action-success" && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "space-y-4 text-center",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                className: "mx-auto grid h-14 w-14 place-items-center rounded-full bg-emerald-100 text-emerald-800",
                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$check$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Check$3e$__["Check"], {
                                    size: 28,
                                    "aria-hidden": "true"
                                }, void 0, false, {
                                    fileName: "[project]/src/components/work-orders/OrderActions.tsx",
                                    lineNumber: 524,
                                    columnNumber: 118
                                }, this)
                            }, void 0, false, {
                                fileName: "[project]/src/components/work-orders/OrderActions.tsx",
                                lineNumber: 524,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                className: "text-base font-semibold",
                                children: success
                            }, void 0, false, {
                                fileName: "[project]/src/components/work-orders/OrderActions.tsx",
                                lineNumber: 525,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                className: attentionButton,
                                onClick: ()=>{
                                    setDialog("");
                                    setSuccess("");
                                },
                                children: "Back to work order"
                            }, void 0, false, {
                                fileName: "[project]/src/components/work-orders/OrderActions.tsx",
                                lineNumber: 526,
                                columnNumber: 13
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/components/work-orders/OrderActions.tsx",
                        lineNumber: 523,
                        columnNumber: 11
                    }, this),
                    dialog === "finish-after-cash" && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "space-y-4",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                children: "Payment is recorded. Complete the work order now so it no longer stays in progress."
                            }, void 0, false, {
                                fileName: "[project]/src/components/work-orders/OrderActions.tsx",
                                lineNumber: 530,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                className: attentionButton,
                                disabled: busy,
                                onClick: ()=>job.completionPhotoUrl ? complete() : setDialog("photo"),
                                children: job.completionPhotoUrl ? "Complete work" : "Add photo & complete work"
                            }, void 0, false, {
                                fileName: "[project]/src/components/work-orders/OrderActions.tsx",
                                lineNumber: 531,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/components/work-orders/OrderActions.tsx",
                        lineNumber: 529,
                        columnNumber: 44
                    }, this),
                    dialog === "complete-cash" && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "space-y-4",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                children: [
                                    "Have you received $",
                                    job.price.toFixed(2),
                                    " CAD in cash for this job?"
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/components/work-orders/OrderActions.tsx",
                                lineNumber: 535,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                className: button,
                                disabled: busy,
                                onClick: ()=>run(()=>orderRequest("/api/jobs/confirm-cash", {
                                            jobId: job.id
                                        }), false, "completion-success", "Cash payment recorded"),
                                children: "Yes · record payment"
                            }, void 0, false, {
                                fileName: "[project]/src/components/work-orders/OrderActions.tsx",
                                lineNumber: 539,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                className: "min-h-11 rounded-lg border px-4 py-3 font-semibold",
                                disabled: busy,
                                onClick: ()=>setDialog("completion-success"),
                                children: "Not yet · keep payment pending"
                            }, void 0, false, {
                                fileName: "[project]/src/components/work-orders/OrderActions.tsx",
                                lineNumber: 551,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                className: "text-sm",
                                children: "Unpaid cash jobs stay in Needs attention so you can confirm payment later."
                            }, void 0, false, {
                                fileName: "[project]/src/components/work-orders/OrderActions.tsx",
                                lineNumber: 558,
                                columnNumber: 13
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/components/work-orders/OrderActions.tsx",
                        lineNumber: 534,
                        columnNumber: 11
                    }, this),
                    dialog === "time" && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "space-y-4",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                className: "flex gap-2",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                        type: "checkbox",
                                        checked: asap,
                                        onChange: (e)=>setAsap(e.target.checked)
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/work-orders/OrderActions.tsx",
                                        lineNumber: 567,
                                        columnNumber: 15
                                    }, this),
                                    "ASAP · no promised appointment time"
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/components/work-orders/OrderActions.tsx",
                                lineNumber: 566,
                                columnNumber: 13
                            }, this),
                            !asap && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                className: "block",
                                children: [
                                    "New date and time",
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                        type: "datetime-local",
                                        value: time,
                                        onChange: (e)=>setTime(e.target.value),
                                        className: "mt-2 block min-h-12 w-full rounded-xl border p-3"
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/work-orders/OrderActions.tsx",
                                        lineNumber: 577,
                                        columnNumber: 17
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/components/work-orders/OrderActions.tsx",
                                lineNumber: 575,
                                columnNumber: 15
                            }, this),
                            !operator && job.paymentMethod === "cash" && !job.cashPaymentAcknowledged && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                className: "flex gap-2",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                        type: "checkbox",
                                        checked: cash,
                                        onChange: (e)=>setCash(e.target.checked)
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/work-orders/OrderActions.tsx",
                                        lineNumber: 589,
                                        columnNumber: 19
                                    }, this),
                                    "I agree to pay $",
                                    job.price.toFixed(2),
                                    " in cash after work."
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/components/work-orders/OrderActions.tsx",
                                lineNumber: 588,
                                columnNumber: 17
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                className: "text-sm",
                                children: [
                                    "Time zone: ",
                                    Intl.DateTimeFormat().resolvedOptions().timeZone,
                                    ". Choose a future time. The other participant must approve."
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/components/work-orders/OrderActions.tsx",
                                lineNumber: 597,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                className: button,
                                disabled: busy || !asap && (!time || !Number.isFinite(new Date(time).getTime()) || new Date(time).getTime() <= Date.now()) || !operator && job.paymentMethod === "cash" && !job.cashPaymentAcknowledged && !cash,
                                onClick: ()=>run(()=>perform("propose-time", {
                                            cashPaymentAcknowledged: cash,
                                            scheduleMode: asap ? "asap" : "scheduled",
                                            scheduledDate: asap ? null : new Date(time).toISOString(),
                                            scheduleTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone
                                        }), navigateOnUpdate, "action-success", "The new visit time was sent for approval."),
                                children: "Send time proposal"
                            }, void 0, false, {
                                fileName: "[project]/src/components/work-orders/OrderActions.tsx",
                                lineNumber: 601,
                                columnNumber: 13
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/components/work-orders/OrderActions.tsx",
                        lineNumber: 565,
                        columnNumber: 11
                    }, this),
                    dialog === "photo" && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "space-y-4",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                children: [
                                    ("TURBOPACK compile-time falsy", 0) ? "TURBOPACK unreachable" : "Choose the completion photo from your gallery.",
                                    " ",
                                    "Uploading completion proof automatically completes this work order. For card orders, the authorized payment is captured at completion."
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/components/work-orders/OrderActions.tsx",
                                lineNumber: 632,
                                columnNumber: 13
                            }, this),
                            ("TURBOPACK compile-time falsy", 0) ? /*#__PURE__*/ "TURBOPACK unreachable" : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$work$2d$orders$2f$PhotoPicker$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"], {
                                photo: photo,
                                onChange: submitCompletionPhoto,
                                disabled: busy,
                                onBusy: setPreparingPhoto,
                                showCamera: false
                            }, void 0, false, {
                                fileName: "[project]/src/components/work-orders/OrderActions.tsx",
                                lineNumber: 640,
                                columnNumber: 15
                            }, this),
                            (busy || preparingPhoto) && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                role: "status",
                                children: "Uploading photo and completing work…"
                            }, void 0, false, {
                                fileName: "[project]/src/components/work-orders/OrderActions.tsx",
                                lineNumber: 642,
                                columnNumber: 42
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/components/work-orders/OrderActions.tsx",
                        lineNumber: 631,
                        columnNumber: 11
                    }, this),
                    dialog === "completion-success" && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "space-y-4 text-center",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                className: "mx-auto grid h-14 w-14 place-items-center rounded-full bg-emerald-100 text-emerald-800",
                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$check$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Check$3e$__["Check"], {
                                    size: 28,
                                    "aria-hidden": "true"
                                }, void 0, false, {
                                    fileName: "[project]/src/components/work-orders/OrderActions.tsx",
                                    lineNumber: 647,
                                    columnNumber: 118
                                }, this)
                            }, void 0, false, {
                                fileName: "[project]/src/components/work-orders/OrderActions.tsx",
                                lineNumber: 647,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                        className: "text-lg font-semibold",
                                        children: "This work order is complete."
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/work-orders/OrderActions.tsx",
                                        lineNumber: 648,
                                        columnNumber: 18
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                        className: "mt-2 text-sm text-[var(--text-secondary)]",
                                        children: [
                                            "The completion photo has been saved",
                                            job.paymentMethod === "cash" && job.paymentStatus !== "paid" ? ". You can record the cash payment later from Needs attention." : " and payment is complete."
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/src/components/work-orders/OrderActions.tsx",
                                        lineNumber: 648,
                                        columnNumber: 87
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/components/work-orders/OrderActions.tsx",
                                lineNumber: 648,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                className: attentionButton,
                                onClick: ()=>router.push("/dashboard"),
                                children: "Close work order & return home"
                            }, void 0, false, {
                                fileName: "[project]/src/components/work-orders/OrderActions.tsx",
                                lineNumber: 649,
                                columnNumber: 13
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/components/work-orders/OrderActions.tsx",
                        lineNumber: 646,
                        columnNumber: 11
                    }, this),
                    dialog === "approve" && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "space-y-4",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                children: [
                                    "Pay $",
                                    job.price.toFixed(2),
                                    " CAD directly to the operator after work. No card will be charged."
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/components/work-orders/OrderActions.tsx",
                                lineNumber: 654,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                className: "flex gap-2",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                        type: "checkbox",
                                        checked: cash,
                                        onChange: (e)=>setCash(e.target.checked)
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/work-orders/OrderActions.tsx",
                                        lineNumber: 659,
                                        columnNumber: 15
                                    }, this),
                                    "I agree to pay in cash."
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/components/work-orders/OrderActions.tsx",
                                lineNumber: 658,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                className: button,
                                disabled: busy || !cash,
                                onClick: ()=>run(()=>perform(job.scheduleProposal ? "approve-time" : "accept", {
                                            proposalId: job.scheduleProposal?.id,
                                            cashPaymentAcknowledged: true
                                        }), navigateOnUpdate, "action-success", "Cash booking approved successfully."),
                                children: "Agree & approve"
                            }, void 0, false, {
                                fileName: "[project]/src/components/work-orders/OrderActions.tsx",
                                lineNumber: 666,
                                columnNumber: 13
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/components/work-orders/OrderActions.tsx",
                        lineNumber: 653,
                        columnNumber: 11
                    }, this),
                    [
                        "cancel",
                        "decline",
                        "cash",
                        "refund"
                    ].includes(dialog) && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "space-y-4",
                        children: [
                            busy && dialog === "cancel" && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "overflow-hidden rounded-xl border border-red-200 bg-red-50 p-3 text-center",
                                role: "status",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "mx-auto mb-2 h-1.5 w-full overflow-hidden rounded-full bg-red-100",
                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                            className: "block h-full w-1/2 animate-[cancel-sweep_700ms_ease-in-out_infinite] rounded-full bg-red-600"
                                        }, void 0, false, {
                                            fileName: "[project]/src/components/work-orders/OrderActions.tsx",
                                            lineNumber: 687,
                                            columnNumber: 234
                                        }, this)
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/work-orders/OrderActions.tsx",
                                        lineNumber: 687,
                                        columnNumber: 151
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                        className: "text-sm font-semibold text-red-800",
                                        children: "Cancelling work order…"
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/work-orders/OrderActions.tsx",
                                        lineNumber: 687,
                                        columnNumber: 353
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/components/work-orders/OrderActions.tsx",
                                lineNumber: 687,
                                columnNumber: 45
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                children: dialog === "cancel" || dialog === "decline" ? "This order will stay in history. New work requires a new booking. Held card payments are released on cancellation; captured payments require support for refunds." : dialog === "cash" ? `Confirm only after you have received $${job.price.toFixed(2)} in cash.` : `Confirm only after returning $${job.price.toFixed(2)} directly to the customer.`
                            }, void 0, false, {
                                fileName: "[project]/src/components/work-orders/OrderActions.tsx",
                                lineNumber: 688,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                className: dialog === "cancel" || dialog === "decline" || dialog === "refund" ? confirmDangerButton : button,
                                disabled: busy,
                                onClick: ()=>run(async ()=>{
                                        if (dialog === "decline") await perform("decline");
                                        else {
                                            const data = await orderRequest(dialog === "cancel" ? "/api/jobs/cancel" : dialog === "cash" ? "/api/jobs/confirm-cash" : "/api/jobs/cash-payment", {
                                                jobId: job.id,
                                                ...dialog === "refund" ? {
                                                    action: "refund"
                                                } : {}
                                            });
                                            if (data.warning) setNotice(data.warning);
                                        }
                                    }, dialog !== "cash", dialog === "cash" && job.status === "in-progress" ? "finish-after-cash" : "action-success", dialog === "cancel" ? "The work order was cancelled successfully." : dialog === "decline" ? "The booking request was declined." : dialog === "cash" ? "Cash payment recorded successfully." : "Cash return recorded successfully."),
                                children: [
                                    "Confirm",
                                    " ",
                                    dialog === "cancel" ? "cancellation" : dialog === "decline" ? "decline" : dialog === "cash" ? "cash received" : "cash returned"
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/components/work-orders/OrderActions.tsx",
                                lineNumber: 695,
                                columnNumber: 13
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/components/work-orders/OrderActions.tsx",
                        lineNumber: 686,
                        columnNumber: 11
                    }, this),
                    dialog !== "completion-success" && dialog !== "action-success" && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                        type: "button",
                        className: `${button} mt-4`,
                        disabled: busy,
                        onClick: ()=>setDialog(""),
                        children: "Back to order"
                    }, void 0, false, {
                        fileName: "[project]/src/components/work-orders/OrderActions.tsx",
                        lineNumber: 735,
                        columnNumber: 76
                    }, this),
                    error && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                        role: "alert",
                        className: "mt-3 text-red-700",
                        children: error
                    }, void 0, false, {
                        fileName: "[project]/src/components/work-orders/OrderActions.tsx",
                        lineNumber: 739,
                        columnNumber: 11
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/src/components/work-orders/OrderActions.tsx",
                lineNumber: 499,
                columnNumber: 7
            }, this),
            secret && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(StripeCheckout, {
                clientSecret: secret,
                amount: job.price,
                onCancel: ()=>setSecret(""),
                onSuccess: async (paymentIntentId)=>{
                    await orderRequest("/api/stripe/payment-status", {
                        paymentIntentId
                    });
                    setSecret("");
                    openWorkOrder();
                    onUpdated?.(`Order #${(0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$workOrders$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["orderNumber"])(job)} payment updated.`);
                }
            }, void 0, false, {
                fileName: "[project]/src/components/work-orders/OrderActions.tsx",
                lineNumber: 745,
                columnNumber: 9
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/src/components/work-orders/OrderActions.tsx",
        lineNumber: 191,
        columnNumber: 5
    }, this);
}
}),
"[project]/src/components/work-orders/OrderCard.tsx [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>OrderCard
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-dev-runtime.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$marketplacePricing$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/marketplacePricing.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$CompanyIdentity$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/components/CompanyIdentity.tsx [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/client/app-dir/link.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$workOrders$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/workOrders.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$context$2f$AuthContext$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/context/AuthContext.tsx [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$work$2d$orders$2f$work$2d$orders$2e$module$2e$css__$5b$app$2d$ssr$5d$__$28$css__module$29$__ = __turbopack_context__.i("[project]/src/components/work-orders/work-orders.module.css [app-ssr] (css module)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$work$2d$orders$2f$OrderGuide$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/components/work-orders/OrderGuide.tsx [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$work$2d$orders$2f$OrderActions$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/components/work-orders/OrderActions.tsx [app-ssr] (ecmascript)");
"use client";
;
;
;
;
;
;
;
;
;
const drivewayCapacity = {
    small: "Fits about 1–2 cars",
    medium: "Fits about 3–4 cars",
    large: "Fits about 5+ cars"
};
function OrderCard({ job, name, person, detail = false, conflict = false, onUpdated }) {
    const { user } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$context$2f$AuthContext$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useAuth"])();
    const operator = user?.uid === job.operatorId;
    const propertyPhotos = operator && person?.role === "client" ? person.propertyDetails?.photos || [] : [];
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("article", {
        className: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$work$2d$orders$2f$work$2d$orders$2e$module$2e$css__$5b$app$2d$ssr$5d$__$28$css__module$29$__["default"].card,
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$work$2d$orders$2f$work$2d$orders$2e$module$2e$css__$5b$app$2d$ssr$5d$__$28$css__module$29$__["default"].body,
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$work$2d$orders$2f$work$2d$orders$2e$module$2e$css__$5b$app$2d$ssr$5d$__$28$css__module$29$__["default"].cardHeader,
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "min-w-0",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                        className: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$work$2d$orders$2f$work$2d$orders$2e$module$2e$css__$5b$app$2d$ssr$5d$__$28$css__module$29$__["default"].reference,
                                        children: [
                                            "Work order #",
                                            (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$workOrders$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["orderNumber"])(job)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/src/components/work-orders/OrderCard.tsx",
                                        lineNumber: 37,
                                        columnNumber: 13
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                                        className: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$work$2d$orders$2f$work$2d$orders$2e$module$2e$css__$5b$app$2d$ssr$5d$__$28$css__module$29$__["default"].title,
                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$CompanyIdentity$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"], {
                                            person: person,
                                            name: name
                                        }, void 0, false, {
                                            fileName: "[project]/src/components/work-orders/OrderCard.tsx",
                                            lineNumber: 38,
                                            columnNumber: 42
                                        }, this)
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/work-orders/OrderCard.tsx",
                                        lineNumber: 38,
                                        columnNumber: 13
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                        className: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$work$2d$orders$2f$work$2d$orders$2e$module$2e$css__$5b$app$2d$ssr$5d$__$28$css__module$29$__["default"].secondary,
                                        children: operator ? "Customer" : "Service provider"
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/work-orders/OrderCard.tsx",
                                        lineNumber: 39,
                                        columnNumber: 13
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/components/work-orders/OrderCard.tsx",
                                lineNumber: 36,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                className: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$work$2d$orders$2f$work$2d$orders$2e$module$2e$css__$5b$app$2d$ssr$5d$__$28$css__module$29$__["default"].badge,
                                "data-status": job.status,
                                children: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$workOrders$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["orderLabel"])(job)
                            }, void 0, false, {
                                fileName: "[project]/src/components/work-orders/OrderCard.tsx",
                                lineNumber: 43,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/components/work-orders/OrderCard.tsx",
                        lineNumber: 35,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$work$2d$orders$2f$work$2d$orders$2e$module$2e$css__$5b$app$2d$ssr$5d$__$28$css__module$29$__["default"].priorityFacts,
                        "aria-label": "Visit time and payment",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        children: "Visit time"
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/work-orders/OrderCard.tsx",
                                        lineNumber: 49,
                                        columnNumber: 13
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("strong", {
                                        children: job.status === "en-route" && job.eta ? `Arriving in about ${job.eta} ${job.eta === 1 ? "minute" : "minutes"}` : (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$workOrders$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["isAsap"])(job) ? "ASAP · As soon as possible" : (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$workOrders$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["scheduleText"])(job)
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/work-orders/OrderCard.tsx",
                                        lineNumber: 50,
                                        columnNumber: 13
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/components/work-orders/OrderCard.tsx",
                                lineNumber: 48,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        children: "Payment"
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/work-orders/OrderCard.tsx",
                                        lineNumber: 53,
                                        columnNumber: 13
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("strong", {
                                        children: [
                                            "$",
                                            (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$marketplacePricing$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jobDisplayPrice"])(job, operator).toFixed(2),
                                            " CAD · ",
                                            job.paymentMethod === "cash" ? "Cash" : "Card"
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/src/components/work-orders/OrderCard.tsx",
                                        lineNumber: 54,
                                        columnNumber: 13
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("small", {
                                        children: job.paymentStatus === "held" ? "Authorized" : job.paymentStatus === "paid" ? "Paid" : job.paymentStatus === "refunded" ? "Refunded / released" : "Pending"
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/work-orders/OrderCard.tsx",
                                        lineNumber: 55,
                                        columnNumber: 13
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/components/work-orders/OrderCard.tsx",
                                lineNumber: 52,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/components/work-orders/OrderCard.tsx",
                        lineNumber: 47,
                        columnNumber: 9
                    }, this),
                    detail && job.status !== "cancelled" && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("ol", {
                        className: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$work$2d$orders$2f$work$2d$orders$2e$module$2e$css__$5b$app$2d$ssr$5d$__$28$css__module$29$__["default"].progress,
                        "aria-label": "Work order progress",
                        children: [
                            "Requested",
                            "Confirmed",
                            "On the way",
                            "Working",
                            "Completed"
                        ].map((label, index)=>{
                            const current = [
                                "pending",
                                "accepted",
                                "en-route",
                                "in-progress",
                                "completed"
                            ].indexOf(job.status);
                            return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("li", {
                                "data-reached": index <= current,
                                "aria-current": index === current ? "step" : undefined,
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        "aria-hidden": "true",
                                        children: index + 1
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/work-orders/OrderCard.tsx",
                                        lineNumber: 63,
                                        columnNumber: 17
                                    }, this),
                                    label
                                ]
                            }, label, true, {
                                fileName: "[project]/src/components/work-orders/OrderCard.tsx",
                                lineNumber: 62,
                                columnNumber: 22
                            }, this);
                        })
                    }, void 0, false, {
                        fileName: "[project]/src/components/work-orders/OrderCard.tsx",
                        lineNumber: 59,
                        columnNumber: 11
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$work$2d$orders$2f$OrderGuide$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"], {
                        job: job,
                        uid: user?.uid || ""
                    }, void 0, false, {
                        fileName: "[project]/src/components/work-orders/OrderCard.tsx",
                        lineNumber: 68,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$work$2d$orders$2f$OrderActions$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"], {
                        job: job,
                        onUpdated: onUpdated
                    }, void 0, false, {
                        fileName: "[project]/src/components/work-orders/OrderCard.tsx",
                        lineNumber: 69,
                        columnNumber: 9
                    }, this),
                    job.chatId && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"], {
                        className: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$work$2d$orders$2f$work$2d$orders$2e$module$2e$css__$5b$app$2d$ssr$5d$__$28$css__module$29$__["default"].messageButton,
                        href: `/dashboard/messages/${job.chatId}`,
                        children: [
                            "Message ",
                            operator ? "customer" : "provider"
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/components/work-orders/OrderCard.tsx",
                        lineNumber: 71,
                        columnNumber: 11
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("section", {
                        className: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$work$2d$orders$2f$work$2d$orders$2e$module$2e$css__$5b$app$2d$ssr$5d$__$28$css__module$29$__["default"].orderDetails,
                        "aria-labelledby": `visit-details-${job.id}`,
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                                id: `visit-details-${job.id}`,
                                className: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$work$2d$orders$2f$work$2d$orders$2e$module$2e$css__$5b$app$2d$ssr$5d$__$28$css__module$29$__["default"].detailSummary,
                                children: "Visit details"
                            }, void 0, false, {
                                fileName: "[project]/src/components/work-orders/OrderCard.tsx",
                                lineNumber: 76,
                                columnNumber: 9
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("dl", {
                                className: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$work$2d$orders$2f$work$2d$orders$2e$module$2e$css__$5b$app$2d$ssr$5d$__$28$css__module$29$__["default"].facts,
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("dt", {
                                                children: "Location"
                                            }, void 0, false, {
                                                fileName: "[project]/src/components/work-orders/OrderCard.tsx",
                                                lineNumber: 79,
                                                columnNumber: 13
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("dd", {
                                                children: job.address ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("a", {
                                                    className: "font-semibold underline",
                                                    href: `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(job.address)}&travelmode=driving&dir_action=navigate`,
                                                    target: "_blank",
                                                    rel: "noreferrer",
                                                    children: [
                                                        job.address,
                                                        " ↗"
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/src/components/work-orders/OrderCard.tsx",
                                                    lineNumber: 81,
                                                    columnNumber: 30
                                                }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("strong", {
                                                    children: "Address to be confirmed"
                                                }, void 0, false, {
                                                    fileName: "[project]/src/components/work-orders/OrderCard.tsx",
                                                    lineNumber: 81,
                                                    columnNumber: 258
                                                }, this)
                                            }, void 0, false, {
                                                fileName: "[project]/src/components/work-orders/OrderCard.tsx",
                                                lineNumber: 80,
                                                columnNumber: 13
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/src/components/work-orders/OrderCard.tsx",
                                        lineNumber: 78,
                                        columnNumber: 11
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("dt", {
                                                children: "Driveway size"
                                            }, void 0, false, {
                                                fileName: "[project]/src/components/work-orders/OrderCard.tsx",
                                                lineNumber: 85,
                                                columnNumber: 13
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("dd", {
                                                className: "capitalize",
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("strong", {
                                                        children: [
                                                            job.propertySize || "medium",
                                                            " driveway"
                                                        ]
                                                    }, void 0, true, {
                                                        fileName: "[project]/src/components/work-orders/OrderCard.tsx",
                                                        lineNumber: 86,
                                                        columnNumber: 40
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("small", {
                                                        className: "mt-1 block normal-case text-[var(--text-muted)]",
                                                        children: drivewayCapacity[job.propertySize || "medium"]
                                                    }, void 0, false, {
                                                        fileName: "[project]/src/components/work-orders/OrderCard.tsx",
                                                        lineNumber: 86,
                                                        columnNumber: 96
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/src/components/work-orders/OrderCard.tsx",
                                                lineNumber: 86,
                                                columnNumber: 13
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/src/components/work-orders/OrderCard.tsx",
                                        lineNumber: 84,
                                        columnNumber: 11
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("dt", {
                                                children: "Expected clearing"
                                            }, void 0, false, {
                                                fileName: "[project]/src/components/work-orders/OrderCard.tsx",
                                                lineNumber: 89,
                                                columnNumber: 13
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("dd", {
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("strong", {
                                                        className: "capitalize",
                                                        children: job.serviceTypes?.map((s)=>s.replaceAll("-", " ")).join(" · ") || "Snow removal"
                                                    }, void 0, false, {
                                                        fileName: "[project]/src/components/work-orders/OrderCard.tsx",
                                                        lineNumber: 91,
                                                        columnNumber: 15
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                        className: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$work$2d$orders$2f$work$2d$orders$2e$module$2e$css__$5b$app$2d$ssr$5d$__$28$css__module$29$__["default"].secondary,
                                                        children: job.specialInstructions || "Clear the selected areas of snow."
                                                    }, void 0, false, {
                                                        fileName: "[project]/src/components/work-orders/OrderCard.tsx",
                                                        lineNumber: 96,
                                                        columnNumber: 15
                                                    }, this),
                                                    propertyPhotos.length > 0 && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                        className: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$work$2d$orders$2f$work$2d$orders$2e$module$2e$css__$5b$app$2d$ssr$5d$__$28$css__module$29$__["default"].photoLinks,
                                                        children: propertyPhotos.map((url, index)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("a", {
                                                                href: url,
                                                                target: "_blank",
                                                                rel: "noreferrer",
                                                                children: [
                                                                    "View property photo ",
                                                                    index + 1,
                                                                    " ↗"
                                                                ]
                                                            }, url, true, {
                                                                fileName: "[project]/src/components/work-orders/OrderCard.tsx",
                                                                lineNumber: 97,
                                                                columnNumber: 114
                                                            }, this))
                                                    }, void 0, false, {
                                                        fileName: "[project]/src/components/work-orders/OrderCard.tsx",
                                                        lineNumber: 97,
                                                        columnNumber: 45
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/src/components/work-orders/OrderCard.tsx",
                                                lineNumber: 90,
                                                columnNumber: 13
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/src/components/work-orders/OrderCard.tsx",
                                        lineNumber: 88,
                                        columnNumber: 11
                                    }, this),
                                    job.status === "en-route" && job.eta && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("dt", {
                                                children: "Live arrival"
                                            }, void 0, false, {
                                                fileName: "[project]/src/components/work-orders/OrderCard.tsx",
                                                lineNumber: 100,
                                                columnNumber: 57
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("dd", {
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("strong", {
                                                        children: [
                                                            "About ",
                                                            job.eta,
                                                            " ",
                                                            job.eta === 1 ? "minute" : "minutes",
                                                            " away"
                                                        ]
                                                    }, void 0, true, {
                                                        fileName: "[project]/src/components/work-orders/OrderCard.tsx",
                                                        lineNumber: 100,
                                                        columnNumber: 82
                                                    }, this),
                                                    Number.isFinite(job.operatorApproxLat) && Number.isFinite(job.operatorApproxLng) && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("a", {
                                                        className: "mt-1 block font-semibold underline",
                                                        href: `https://www.google.com/maps?q=${job.operatorApproxLat},${job.operatorApproxLng}`,
                                                        target: "_blank",
                                                        rel: "noreferrer",
                                                        children: [
                                                            "View approximate area (",
                                                            job.operatorLocationRadiusKm || 1,
                                                            " km radius) ↗"
                                                        ]
                                                    }, void 0, true, {
                                                        fileName: "[project]/src/components/work-orders/OrderCard.tsx",
                                                        lineNumber: 100,
                                                        columnNumber: 243
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                        className: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$work$2d$orders$2f$work$2d$orders$2e$module$2e$css__$5b$app$2d$ssr$5d$__$28$css__module$29$__["default"].secondary,
                                                        children: "The operator’s exact location stays private."
                                                    }, void 0, false, {
                                                        fileName: "[project]/src/components/work-orders/OrderCard.tsx",
                                                        lineNumber: 100,
                                                        columnNumber: 491
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/src/components/work-orders/OrderCard.tsx",
                                                lineNumber: 100,
                                                columnNumber: 78
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/src/components/work-orders/OrderCard.tsx",
                                        lineNumber: 100,
                                        columnNumber: 52
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/components/work-orders/OrderCard.tsx",
                                lineNumber: 77,
                                columnNumber: 9
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/components/work-orders/OrderCard.tsx",
                        lineNumber: 75,
                        columnNumber: 9
                    }, this),
                    conflict && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                        role: "status",
                        className: "mt-3 rounded-xl bg-amber-50 p-3 text-sm text-amber-950",
                        children: "This requested time overlaps a confirmed work order. Propose a different time before accepting."
                    }, void 0, false, {
                        fileName: "[project]/src/components/work-orders/OrderCard.tsx",
                        lineNumber: 104,
                        columnNumber: 11
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/src/components/work-orders/OrderCard.tsx",
                lineNumber: 34,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$work$2d$orders$2f$work$2d$orders$2e$module$2e$css__$5b$app$2d$ssr$5d$__$28$css__module$29$__["default"].footer,
                children: [
                    !detail && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"], {
                        className: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$work$2d$orders$2f$work$2d$orders$2e$module$2e$css__$5b$app$2d$ssr$5d$__$28$css__module$29$__["default"].button,
                        href: `/dashboard/jobs/${job.id}`,
                        children: "View work order"
                    }, void 0, false, {
                        fileName: "[project]/src/components/work-orders/OrderCard.tsx",
                        lineNumber: 115,
                        columnNumber: 11
                    }, this),
                    !detail && job.chatId && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"], {
                        className: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$work$2d$orders$2f$work$2d$orders$2e$module$2e$css__$5b$app$2d$ssr$5d$__$28$css__module$29$__["default"].button,
                        href: `/dashboard/messages/${job.chatId}`,
                        children: [
                            "Message ",
                            operator ? "customer" : "provider"
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/components/work-orders/OrderCard.tsx",
                        lineNumber: 120,
                        columnNumber: 11
                    }, this),
                    job.previousOrderId && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"], {
                        className: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$work$2d$orders$2f$work$2d$orders$2e$module$2e$css__$5b$app$2d$ssr$5d$__$28$css__module$29$__["default"].button,
                        href: `/dashboard/jobs/${job.previousOrderId}`,
                        children: "Previous order"
                    }, void 0, false, {
                        fileName: "[project]/src/components/work-orders/OrderCard.tsx",
                        lineNumber: 128,
                        columnNumber: 11
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/src/components/work-orders/OrderCard.tsx",
                lineNumber: 113,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/src/components/work-orders/OrderCard.tsx",
        lineNumber: 33,
        columnNumber: 5
    }, this);
}
}),
"[project]/src/components/work-orders/WorkOrdersPage.tsx [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>WorkOrdersPage
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-dev-runtime.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$marketplacePricing$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/marketplacePricing.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$CompanyIdentity$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/components/CompanyIdentity.tsx [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/client/app-dir/link.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$arrow$2d$right$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__ArrowRight$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/arrow-right.js [app-ssr] (ecmascript) <export default as ArrowRight>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$calendar$2d$clock$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__CalendarClock$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/calendar-clock.js [app-ssr] (ecmascript) <export default as CalendarClock>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$map$2d$pin$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__MapPin$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/map-pin.js [app-ssr] (ecmascript) <export default as MapPin>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$wallet$2d$cards$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__WalletCards$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/wallet-cards.js [app-ssr] (ecmascript) <export default as WalletCards>");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$hooks$2f$useWorkOrders$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/hooks/useWorkOrders.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$workOrders$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/workOrders.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$work$2d$orders$2f$OrderCard$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/components/work-orders/OrderCard.tsx [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$work$2d$orders$2f$work$2d$orders$2e$module$2e$css__$5b$app$2d$ssr$5d$__$28$css__module$29$__ = __turbopack_context__.i("[project]/src/components/work-orders/work-orders.module.css [app-ssr] (css module)");
"use client";
;
;
;
;
;
;
;
;
;
;
const GROUP_FILTERS = [
    [
        "all",
        "All work orders"
    ],
    [
        "in-progress",
        "In progress"
    ],
    [
        "completed",
        "Completed"
    ],
    [
        "cancelled",
        "Cancelled"
    ]
];
function WorkOrdersPage({ history = false, schedule = false }) {
    const { jobs, names, people, uid, isOperator, loading, error } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$hooks$2f$useWorkOrders$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useWorkOrders"])();
    const [date, setDate] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])("");
    const [notice, setNotice] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])("");
    const [search, setSearch] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])("");
    const [groupFilters, setGroupFilters] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])({});
    const [expandedGroups, setExpandedGroups] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])({});
    const localDate = (value)=>{
        const d = new Date((0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$workOrders$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["dateMillis"])(value));
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    };
    const sorted = [
        ...jobs
    ].sort((a, b)=>{
        if (!schedule) return (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$workOrders$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["dateMillis"])(b.createdAt) - (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$workOrders$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["dateMillis"])(a.createdAt);
        return ((0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$workOrders$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["dateMillis"])(a.scheduledDate) || (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$workOrders$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["dateMillis"])(a.createdAt)) - ((0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$workOrders$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["dateMillis"])(b.scheduledDate) || (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$workOrders$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["dateMillis"])(b.createdAt));
    });
    const matching = sorted.filter((job)=>[
            (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$workOrders$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["orderNumber"])(job),
            job.address,
            names[isOperator ? job.clientId : job.operatorId],
            job.serviceTypes?.join(" ")
        ].filter(Boolean).join(" ").toLowerCase().includes(search.trim().toLowerCase()));
    const cards = (items, empty = "No jobs in this view.")=>items.length ? [
            ...new Set(items.map((job)=>isOperator ? job.clientId : job.operatorId))
        ].map((personId)=>{
            const personOrders = items.filter((job)=>(isOperator ? job.clientId : job.operatorId) === personId);
            const groupFilter = groupFilters[personId] || "all";
            const visibleOrders = personOrders.filter((job)=>groupFilter === "all" || job.status === groupFilter);
            const expanded = isOperator || !!expandedGroups[personId];
            if (!schedule) return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("section", {
                className: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$work$2d$orders$2f$work$2d$orders$2e$module$2e$css__$5b$app$2d$ssr$5d$__$28$css__module$29$__["default"].companyGroup,
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                        type: "button",
                        className: `${__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$work$2d$orders$2f$work$2d$orders$2e$module$2e$css__$5b$app$2d$ssr$5d$__$28$css__module$29$__["default"].companySummary} w-full text-left`,
                        "aria-expanded": expanded,
                        onClick: ()=>{
                            if (!isOperator) setExpandedGroups((current)=>({
                                    ...current,
                                    [personId]: !current[personId]
                                }));
                        },
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                className: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$work$2d$orders$2f$work$2d$orders$2e$module$2e$css__$5b$app$2d$ssr$5d$__$28$css__module$29$__["default"].companyInfo,
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$CompanyIdentity$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"], {
                                        person: people[personId],
                                        name: names[personId] || (isOperator ? "Customer" : "Company")
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/work-orders/WorkOrdersPage.tsx",
                                        lineNumber: 70,
                                        columnNumber: 17
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        className: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$work$2d$orders$2f$work$2d$orders$2e$module$2e$css__$5b$app$2d$ssr$5d$__$28$css__module$29$__["default"].companyMeta,
                                        children: [
                                            personOrders.length,
                                            " work order",
                                            personOrders.length === 1 ? "" : "s"
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/src/components/work-orders/WorkOrdersPage.tsx",
                                        lineNumber: 71,
                                        columnNumber: 17
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/components/work-orders/WorkOrdersPage.tsx",
                                lineNumber: 69,
                                columnNumber: 15
                            }, this),
                            !isOperator && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                className: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$work$2d$orders$2f$work$2d$orders$2e$module$2e$css__$5b$app$2d$ssr$5d$__$28$css__module$29$__["default"].companyChevron,
                                "aria-hidden": "true",
                                children: "›"
                            }, void 0, false, {
                                fileName: "[project]/src/components/work-orders/WorkOrdersPage.tsx",
                                lineNumber: 73,
                                columnNumber: 31
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/components/work-orders/WorkOrdersPage.tsx",
                        lineNumber: 61,
                        columnNumber: 13
                    }, this),
                    expanded && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Fragment"], {
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$work$2d$orders$2f$work$2d$orders$2e$module$2e$css__$5b$app$2d$ssr$5d$__$28$css__module$29$__["default"].companyTools,
                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                    className: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$work$2d$orders$2f$work$2d$orders$2e$module$2e$css__$5b$app$2d$ssr$5d$__$28$css__module$29$__["default"].companyFilter,
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                            children: "View work orders"
                                        }, void 0, false, {
                                            fileName: "[project]/src/components/work-orders/WorkOrdersPage.tsx",
                                            lineNumber: 77,
                                            columnNumber: 17
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("select", {
                                            "aria-label": `Filter work orders for ${names[personId] || (isOperator ? "customer" : "operator")}`,
                                            value: groupFilter,
                                            onChange: (event)=>setGroupFilters((current)=>({
                                                        ...current,
                                                        [personId]: event.target.value
                                                    })),
                                            children: GROUP_FILTERS.map(([key, label])=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                                    value: key,
                                                    children: [
                                                        label,
                                                        " (",
                                                        personOrders.filter((job)=>key === "all" || job.status === key).length,
                                                        ")"
                                                    ]
                                                }, key, true, {
                                                    fileName: "[project]/src/components/work-orders/WorkOrdersPage.tsx",
                                                    lineNumber: 84,
                                                    columnNumber: 21
                                                }, this))
                                        }, void 0, false, {
                                            fileName: "[project]/src/components/work-orders/WorkOrdersPage.tsx",
                                            lineNumber: 78,
                                            columnNumber: 17
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/src/components/work-orders/WorkOrdersPage.tsx",
                                    lineNumber: 76,
                                    columnNumber: 15
                                }, this)
                            }, void 0, false, {
                                fileName: "[project]/src/components/work-orders/WorkOrdersPage.tsx",
                                lineNumber: 75,
                                columnNumber: 28
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("ul", {
                                className: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$work$2d$orders$2f$work$2d$orders$2e$module$2e$css__$5b$app$2d$ssr$5d$__$28$css__module$29$__["default"].companyList,
                                children: [
                                    visibleOrders.map((job)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("li", {
                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"], {
                                                className: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$work$2d$orders$2f$work$2d$orders$2e$module$2e$css__$5b$app$2d$ssr$5d$__$28$css__module$29$__["default"].orderRow,
                                                href: `/dashboard/jobs/${job.id}`,
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                        className: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$work$2d$orders$2f$work$2d$orders$2e$module$2e$css__$5b$app$2d$ssr$5d$__$28$css__module$29$__["default"].orderRowHeader,
                                                        children: [
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                className: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$work$2d$orders$2f$work$2d$orders$2e$module$2e$css__$5b$app$2d$ssr$5d$__$28$css__module$29$__["default"].orderReference,
                                                                children: [
                                                                    "Work order #",
                                                                    (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$workOrders$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["orderNumber"])(job)
                                                                ]
                                                            }, void 0, true, {
                                                                fileName: "[project]/src/components/work-orders/WorkOrdersPage.tsx",
                                                                lineNumber: 96,
                                                                columnNumber: 23
                                                            }, this),
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                className: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$work$2d$orders$2f$work$2d$orders$2e$module$2e$css__$5b$app$2d$ssr$5d$__$28$css__module$29$__["default"].badge,
                                                                "data-status": job.status,
                                                                children: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$workOrders$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["orderLabel"])(job)
                                                            }, void 0, false, {
                                                                fileName: "[project]/src/components/work-orders/WorkOrdersPage.tsx",
                                                                lineNumber: 97,
                                                                columnNumber: 23
                                                            }, this)
                                                        ]
                                                    }, void 0, true, {
                                                        fileName: "[project]/src/components/work-orders/WorkOrdersPage.tsx",
                                                        lineNumber: 95,
                                                        columnNumber: 21
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                        className: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$work$2d$orders$2f$work$2d$orders$2e$module$2e$css__$5b$app$2d$ssr$5d$__$28$css__module$29$__["default"].orderHighlights,
                                                        children: [
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                className: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$work$2d$orders$2f$work$2d$orders$2e$module$2e$css__$5b$app$2d$ssr$5d$__$28$css__module$29$__["default"].orderHighlight,
                                                                children: [
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$calendar$2d$clock$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__CalendarClock$3e$__["CalendarClock"], {
                                                                        "aria-hidden": "true",
                                                                        size: 20
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/src/components/work-orders/WorkOrdersPage.tsx",
                                                                        lineNumber: 101,
                                                                        columnNumber: 25
                                                                    }, this),
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                        children: [
                                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                                className: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$work$2d$orders$2f$work$2d$orders$2e$module$2e$css__$5b$app$2d$ssr$5d$__$28$css__module$29$__["default"].orderHighlightLabel,
                                                                                children: "Date and time"
                                                                            }, void 0, false, {
                                                                                fileName: "[project]/src/components/work-orders/WorkOrdersPage.tsx",
                                                                                lineNumber: 103,
                                                                                columnNumber: 27
                                                                            }, this),
                                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("strong", {
                                                                                children: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$workOrders$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["scheduleText"])(job)
                                                                            }, void 0, false, {
                                                                                fileName: "[project]/src/components/work-orders/WorkOrdersPage.tsx",
                                                                                lineNumber: 104,
                                                                                columnNumber: 27
                                                                            }, this)
                                                                        ]
                                                                    }, void 0, true, {
                                                                        fileName: "[project]/src/components/work-orders/WorkOrdersPage.tsx",
                                                                        lineNumber: 102,
                                                                        columnNumber: 25
                                                                    }, this)
                                                                ]
                                                            }, void 0, true, {
                                                                fileName: "[project]/src/components/work-orders/WorkOrdersPage.tsx",
                                                                lineNumber: 100,
                                                                columnNumber: 23
                                                            }, this),
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                className: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$work$2d$orders$2f$work$2d$orders$2e$module$2e$css__$5b$app$2d$ssr$5d$__$28$css__module$29$__["default"].orderHighlight,
                                                                children: [
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$wallet$2d$cards$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__WalletCards$3e$__["WalletCards"], {
                                                                        "aria-hidden": "true",
                                                                        size: 20
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/src/components/work-orders/WorkOrdersPage.tsx",
                                                                        lineNumber: 108,
                                                                        columnNumber: 25
                                                                    }, this),
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                        children: [
                                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                                className: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$work$2d$orders$2f$work$2d$orders$2e$module$2e$css__$5b$app$2d$ssr$5d$__$28$css__module$29$__["default"].orderHighlightLabel,
                                                                                children: "Payment amount"
                                                                            }, void 0, false, {
                                                                                fileName: "[project]/src/components/work-orders/WorkOrdersPage.tsx",
                                                                                lineNumber: 110,
                                                                                columnNumber: 27
                                                                            }, this),
                                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("strong", {
                                                                                className: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$work$2d$orders$2f$work$2d$orders$2e$module$2e$css__$5b$app$2d$ssr$5d$__$28$css__module$29$__["default"].orderPrice,
                                                                                children: [
                                                                                    "$",
                                                                                    (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$marketplacePricing$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jobDisplayPrice"])(job, isOperator).toFixed(2),
                                                                                    " CAD"
                                                                                ]
                                                                            }, void 0, true, {
                                                                                fileName: "[project]/src/components/work-orders/WorkOrdersPage.tsx",
                                                                                lineNumber: 111,
                                                                                columnNumber: 27
                                                                            }, this),
                                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                                className: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$work$2d$orders$2f$work$2d$orders$2e$module$2e$css__$5b$app$2d$ssr$5d$__$28$css__module$29$__["default"].orderPaymentMethod,
                                                                                children: job.paymentMethod === "cash" ? "Cash" : job.paymentMethod === "e-transfer" ? "E-transfer" : "Card"
                                                                            }, void 0, false, {
                                                                                fileName: "[project]/src/components/work-orders/WorkOrdersPage.tsx",
                                                                                lineNumber: 112,
                                                                                columnNumber: 27
                                                                            }, this)
                                                                        ]
                                                                    }, void 0, true, {
                                                                        fileName: "[project]/src/components/work-orders/WorkOrdersPage.tsx",
                                                                        lineNumber: 109,
                                                                        columnNumber: 25
                                                                    }, this)
                                                                ]
                                                            }, void 0, true, {
                                                                fileName: "[project]/src/components/work-orders/WorkOrdersPage.tsx",
                                                                lineNumber: 107,
                                                                columnNumber: 23
                                                            }, this)
                                                        ]
                                                    }, void 0, true, {
                                                        fileName: "[project]/src/components/work-orders/WorkOrdersPage.tsx",
                                                        lineNumber: 99,
                                                        columnNumber: 21
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                        className: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$work$2d$orders$2f$work$2d$orders$2e$module$2e$css__$5b$app$2d$ssr$5d$__$28$css__module$29$__["default"].orderRowFooter,
                                                        children: [
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                className: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$work$2d$orders$2f$work$2d$orders$2e$module$2e$css__$5b$app$2d$ssr$5d$__$28$css__module$29$__["default"].orderAddress,
                                                                children: [
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$map$2d$pin$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__MapPin$3e$__["MapPin"], {
                                                                        "aria-hidden": "true",
                                                                        size: 16
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/src/components/work-orders/WorkOrdersPage.tsx",
                                                                        lineNumber: 118,
                                                                        columnNumber: 25
                                                                    }, this),
                                                                    job.address || "Address to be confirmed"
                                                                ]
                                                            }, void 0, true, {
                                                                fileName: "[project]/src/components/work-orders/WorkOrdersPage.tsx",
                                                                lineNumber: 117,
                                                                columnNumber: 23
                                                            }, this),
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                className: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$work$2d$orders$2f$work$2d$orders$2e$module$2e$css__$5b$app$2d$ssr$5d$__$28$css__module$29$__["default"].orderView,
                                                                children: [
                                                                    "View order ",
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$arrow$2d$right$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__ArrowRight$3e$__["ArrowRight"], {
                                                                        "aria-hidden": "true",
                                                                        size: 16
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/src/components/work-orders/WorkOrdersPage.tsx",
                                                                        lineNumber: 121,
                                                                        columnNumber: 69
                                                                    }, this)
                                                                ]
                                                            }, void 0, true, {
                                                                fileName: "[project]/src/components/work-orders/WorkOrdersPage.tsx",
                                                                lineNumber: 121,
                                                                columnNumber: 23
                                                            }, this)
                                                        ]
                                                    }, void 0, true, {
                                                        fileName: "[project]/src/components/work-orders/WorkOrdersPage.tsx",
                                                        lineNumber: 116,
                                                        columnNumber: 21
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                        className: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$work$2d$orders$2f$work$2d$orders$2e$module$2e$css__$5b$app$2d$ssr$5d$__$28$css__module$29$__["default"].orderRowMain,
                                                        children: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$workOrders$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["orderActionNeeded"])(job, uid) && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                            className: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$work$2d$orders$2f$work$2d$orders$2e$module$2e$css__$5b$app$2d$ssr$5d$__$28$css__module$29$__["default"].rowAction,
                                                            children: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$workOrders$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["orderActionNeeded"])(job, uid)
                                                        }, void 0, false, {
                                                            fileName: "[project]/src/components/work-orders/WorkOrdersPage.tsx",
                                                            lineNumber: 124,
                                                            columnNumber: 55
                                                        }, this)
                                                    }, void 0, false, {
                                                        fileName: "[project]/src/components/work-orders/WorkOrdersPage.tsx",
                                                        lineNumber: 123,
                                                        columnNumber: 21
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/src/components/work-orders/WorkOrdersPage.tsx",
                                                lineNumber: 94,
                                                columnNumber: 19
                                            }, this)
                                        }, job.id, false, {
                                            fileName: "[project]/src/components/work-orders/WorkOrdersPage.tsx",
                                            lineNumber: 93,
                                            columnNumber: 17
                                        }, this)),
                                    !visibleOrders.length && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("li", {
                                        className: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$work$2d$orders$2f$work$2d$orders$2e$module$2e$css__$5b$app$2d$ssr$5d$__$28$css__module$29$__["default"].groupEmpty,
                                        children: "No work orders match this filter."
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/work-orders/WorkOrdersPage.tsx",
                                        lineNumber: 130,
                                        columnNumber: 17
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/components/work-orders/WorkOrdersPage.tsx",
                                lineNumber: 91,
                                columnNumber: 13
                            }, this)
                        ]
                    }, void 0, true)
                ]
            }, personId, true, {
                fileName: "[project]/src/components/work-orders/WorkOrdersPage.tsx",
                lineNumber: 60,
                columnNumber: 11
            }, this);
            return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("section", {
                className: "space-y-3 rounded-2xl border border-[var(--border-color)] p-3 sm:p-4",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("header", {
                        className: "flex items-center justify-between gap-3",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                                className: "font-semibold",
                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$CompanyIdentity$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"], {
                                    person: people[personId],
                                    name: names[personId] || (isOperator ? "Customer" : "Company")
                                }, void 0, false, {
                                    fileName: "[project]/src/components/work-orders/WorkOrdersPage.tsx",
                                    lineNumber: 136,
                                    columnNumber: 101
                                }, this)
                            }, void 0, false, {
                                fileName: "[project]/src/components/work-orders/WorkOrdersPage.tsx",
                                lineNumber: 136,
                                columnNumber: 71
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                className: "text-sm text-[var(--text-muted)]",
                                children: [
                                    personOrders.length,
                                    " order",
                                    personOrders.length === 1 ? "" : "s"
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/components/work-orders/WorkOrdersPage.tsx",
                                lineNumber: 136,
                                columnNumber: 215
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/components/work-orders/WorkOrdersPage.tsx",
                        lineNumber: 136,
                        columnNumber: 11
                    }, this),
                    personOrders.map((job)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$work$2d$orders$2f$OrderCard$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"], {
                            job: job,
                            person: people[personId],
                            onUpdated: setNotice,
                            conflict: isOperator && job.status === "pending" && (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$workOrders$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["hasScheduleConflict"])(job, jobs),
                            name: names[personId] || (isOperator ? "Customer" : "Company")
                        }, job.id, false, {
                            fileName: "[project]/src/components/work-orders/WorkOrdersPage.tsx",
                            lineNumber: 137,
                            columnNumber: 36
                        }, this))
                ]
            }, personId, true, {
                fileName: "[project]/src/components/work-orders/WorkOrdersPage.tsx",
                lineNumber: 135,
                columnNumber: 16
            }, this);
        }) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
            className: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$work$2d$orders$2f$work$2d$orders$2e$module$2e$css__$5b$app$2d$ssr$5d$__$28$css__module$29$__["default"].empty,
            children: empty
        }, void 0, false, {
            fileName: "[project]/src/components/work-orders/WorkOrdersPage.tsx",
            lineNumber: 141,
            columnNumber: 7
        }, this);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$work$2d$orders$2f$work$2d$orders$2e$module$2e$css__$5b$app$2d$ssr$5d$__$28$css__module$29$__["default"].page,
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("header", {
                className: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$work$2d$orders$2f$work$2d$orders$2e$module$2e$css__$5b$app$2d$ssr$5d$__$28$css__module$29$__["default"].header,
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("h1", {
                                className: "font-headline text-3xl font-bold",
                                children: schedule ? "Schedule" : history ? "Job history" : "Work orders"
                            }, void 0, false, {
                                fileName: "[project]/src/components/work-orders/WorkOrdersPage.tsx",
                                lineNumber: 147,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                className: "mt-2 text-[var(--text-secondary)]",
                                children: schedule ? "See booked visits, ASAP jobs, and requests awaiting confirmation." : isOperator ? "Choose a customer to view their work orders." : "Choose a company to view all your work orders with them."
                            }, void 0, false, {
                                fileName: "[project]/src/components/work-orders/WorkOrdersPage.tsx",
                                lineNumber: 150,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/components/work-orders/WorkOrdersPage.tsx",
                        lineNumber: 146,
                        columnNumber: 9
                    }, this),
                    !isOperator && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"], {
                        className: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$work$2d$orders$2f$work$2d$orders$2e$module$2e$css__$5b$app$2d$ssr$5d$__$28$css__module$29$__["default"].button,
                        href: "/dashboard/find",
                        children: "Book snow help"
                    }, void 0, false, {
                        fileName: "[project]/src/components/work-orders/WorkOrdersPage.tsx",
                        lineNumber: 157,
                        columnNumber: 11
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/src/components/work-orders/WorkOrdersPage.tsx",
                lineNumber: 145,
                columnNumber: 7
            }, this),
            notice && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                role: "status",
                className: "rounded-xl bg-emerald-50 p-4 text-emerald-950",
                children: notice
            }, void 0, false, {
                fileName: "[project]/src/components/work-orders/WorkOrdersPage.tsx",
                lineNumber: 163,
                columnNumber: 9
            }, this),
            error && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                role: "alert",
                className: "text-red-700",
                children: error
            }, void 0, false, {
                fileName: "[project]/src/components/work-orders/WorkOrdersPage.tsx",
                lineNumber: 171,
                columnNumber: 9
            }, this),
            loading ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                role: "status",
                children: "Loading work orders…"
            }, void 0, false, {
                fileName: "[project]/src/components/work-orders/WorkOrdersPage.tsx",
                lineNumber: 176,
                columnNumber: 9
            }, this) : schedule ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Fragment"], {
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$work$2d$orders$2f$work$2d$orders$2e$module$2e$css__$5b$app$2d$ssr$5d$__$28$css__module$29$__["default"].scheduleTools,
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                className: "block text-sm font-medium",
                                children: [
                                    "Appointment date",
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                        className: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$work$2d$orders$2f$work$2d$orders$2e$module$2e$css__$5b$app$2d$ssr$5d$__$28$css__module$29$__["default"].dateInput,
                                        type: "date",
                                        value: date,
                                        onChange: (e)=>setDate(e.target.value)
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/work-orders/WorkOrdersPage.tsx",
                                        lineNumber: 182,
                                        columnNumber: 15
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/components/work-orders/WorkOrdersPage.tsx",
                                lineNumber: 180,
                                columnNumber: 13
                            }, this),
                            date && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                className: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$work$2d$orders$2f$work$2d$orders$2e$module$2e$css__$5b$app$2d$ssr$5d$__$28$css__module$29$__["default"].button,
                                onClick: ()=>setDate(""),
                                children: "Show all dates"
                            }, void 0, false, {
                                fileName: "[project]/src/components/work-orders/WorkOrdersPage.tsx",
                                lineNumber: 190,
                                columnNumber: 15
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                className: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$work$2d$orders$2f$work$2d$orders$2e$module$2e$css__$5b$app$2d$ssr$5d$__$28$css__module$29$__["default"].scheduleHint,
                                children: "ASAP jobs and unconfirmed requests are always shown."
                            }, void 0, false, {
                                fileName: "[project]/src/components/work-orders/WorkOrdersPage.tsx",
                                lineNumber: 194,
                                columnNumber: 13
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/components/work-orders/WorkOrdersPage.tsx",
                        lineNumber: 179,
                        columnNumber: 11
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("section", {
                        className: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$work$2d$orders$2f$work$2d$orders$2e$module$2e$css__$5b$app$2d$ssr$5d$__$28$css__module$29$__["default"].section,
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$work$2d$orders$2f$work$2d$orders$2e$module$2e$css__$5b$app$2d$ssr$5d$__$28$css__module$29$__["default"].sectionHeader,
                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                                    children: "Booked visits"
                                }, void 0, false, {
                                    fileName: "[project]/src/components/work-orders/WorkOrdersPage.tsx",
                                    lineNumber: 200,
                                    columnNumber: 15
                                }, this)
                            }, void 0, false, {
                                fileName: "[project]/src/components/work-orders/WorkOrdersPage.tsx",
                                lineNumber: 199,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "space-y-3",
                                children: cards(sorted.filter((j)=>[
                                        "accepted",
                                        "en-route",
                                        "in-progress"
                                    ].includes(j.status) && !(0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$workOrders$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["isAsap"])(j) && (!date || localDate(j.scheduledDate) === date)), date ? "No booked visits on this date. Choose another date or show all dates." : "No booked visits yet. Accepted requests will appear here.")
                            }, void 0, false, {
                                fileName: "[project]/src/components/work-orders/WorkOrdersPage.tsx",
                                lineNumber: 202,
                                columnNumber: 13
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/components/work-orders/WorkOrdersPage.tsx",
                        lineNumber: 198,
                        columnNumber: 11
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("section", {
                        className: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$work$2d$orders$2f$work$2d$orders$2e$module$2e$css__$5b$app$2d$ssr$5d$__$28$css__module$29$__["default"].section,
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$work$2d$orders$2f$work$2d$orders$2e$module$2e$css__$5b$app$2d$ssr$5d$__$28$css__module$29$__["default"].sectionHeader,
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                                        children: "ASAP jobs"
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/work-orders/WorkOrdersPage.tsx",
                                        lineNumber: 220,
                                        columnNumber: 15
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        className: "text-sm text-[var(--text-secondary)]",
                                        children: "Arrival time to be confirmed"
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/work-orders/WorkOrdersPage.tsx",
                                        lineNumber: 221,
                                        columnNumber: 15
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/components/work-orders/WorkOrdersPage.tsx",
                                lineNumber: 219,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "space-y-3",
                                children: cards(sorted.filter((j)=>[
                                        "accepted",
                                        "en-route",
                                        "in-progress"
                                    ].includes(j.status) && (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$workOrders$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["isAsap"])(j)), "No ASAP jobs waiting.")
                            }, void 0, false, {
                                fileName: "[project]/src/components/work-orders/WorkOrdersPage.tsx",
                                lineNumber: 225,
                                columnNumber: 13
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/components/work-orders/WorkOrdersPage.tsx",
                        lineNumber: 218,
                        columnNumber: 11
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("section", {
                        className: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$work$2d$orders$2f$work$2d$orders$2e$module$2e$css__$5b$app$2d$ssr$5d$__$28$css__module$29$__["default"].section,
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$work$2d$orders$2f$work$2d$orders$2e$module$2e$css__$5b$app$2d$ssr$5d$__$28$css__module$29$__["default"].sectionHeader,
                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                                    children: "Awaiting confirmation"
                                }, void 0, false, {
                                    fileName: "[project]/src/components/work-orders/WorkOrdersPage.tsx",
                                    lineNumber: 239,
                                    columnNumber: 15
                                }, this)
                            }, void 0, false, {
                                fileName: "[project]/src/components/work-orders/WorkOrdersPage.tsx",
                                lineNumber: 238,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                className: "mb-3 text-sm text-[var(--text-secondary)]",
                                children: "These requests are not booked yet."
                            }, void 0, false, {
                                fileName: "[project]/src/components/work-orders/WorkOrdersPage.tsx",
                                lineNumber: 241,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "space-y-3",
                                children: cards(sorted.filter((j)=>j.status === "pending"), "No requests awaiting confirmation.")
                            }, void 0, false, {
                                fileName: "[project]/src/components/work-orders/WorkOrdersPage.tsx",
                                lineNumber: 244,
                                columnNumber: 13
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/components/work-orders/WorkOrdersPage.tsx",
                        lineNumber: 237,
                        columnNumber: 11
                    }, this)
                ]
            }, void 0, true) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Fragment"], {
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                        className: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$work$2d$orders$2f$work$2d$orders$2e$module$2e$css__$5b$app$2d$ssr$5d$__$28$css__module$29$__["default"].searchLabel,
                        children: [
                            "Find a work order",
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                type: "search",
                                className: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$work$2d$orders$2f$work$2d$orders$2e$module$2e$css__$5b$app$2d$ssr$5d$__$28$css__module$29$__["default"].searchInput,
                                value: search,
                                placeholder: "Search order number, name, address or service",
                                onChange: (event)=>setSearch(event.target.value)
                            }, void 0, false, {
                                fileName: "[project]/src/components/work-orders/WorkOrdersPage.tsx",
                                lineNumber: 256,
                                columnNumber: 13
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/components/work-orders/WorkOrdersPage.tsx",
                        lineNumber: 254,
                        columnNumber: 11
                    }, this),
                    search && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                        type: "button",
                        className: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$work$2d$orders$2f$work$2d$orders$2e$module$2e$css__$5b$app$2d$ssr$5d$__$28$css__module$29$__["default"].button,
                        onClick: ()=>setSearch(""),
                        children: "Clear search"
                    }, void 0, false, {
                        fileName: "[project]/src/components/work-orders/WorkOrdersPage.tsx",
                        lineNumber: 260,
                        columnNumber: 22
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                        className: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$work$2d$orders$2f$work$2d$orders$2e$module$2e$css__$5b$app$2d$ssr$5d$__$28$css__module$29$__["default"].scheduleHint,
                        children: history ? "Completed and cancelled work orders, with the most recent first." : `Choose ${isOperator ? "a customer" : "an operator"} to see their newest work orders and filter that list.`
                    }, void 0, false, {
                        fileName: "[project]/src/components/work-orders/WorkOrdersPage.tsx",
                        lineNumber: 261,
                        columnNumber: 11
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "space-y-4",
                        children: cards(history ? matching.filter((job)=>(0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$workOrders$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["orderSection"])(job, uid) === "history") : matching, search.trim() ? "No matching work orders. Try another search." : history ? "Completed and cancelled work orders will appear here." : "No jobs yet. Your booking requests and visits will appear here.")
                    }, void 0, false, {
                        fileName: "[project]/src/components/work-orders/WorkOrdersPage.tsx",
                        lineNumber: 266,
                        columnNumber: 11
                    }, this)
                ]
            }, void 0, true)
        ]
    }, void 0, true, {
        fileName: "[project]/src/components/work-orders/WorkOrdersPage.tsx",
        lineNumber: 144,
        columnNumber: 5
    }, this);
}
}),
];

//# sourceMappingURL=src_b7c34bc0._.js.map