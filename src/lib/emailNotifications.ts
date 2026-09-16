import { Resend } from "resend";
import { getAdminDb } from "@/lib/firebaseAdmin";

type EmailCategory = "account" | "workOrders";

type EmailMessage = {
  category: EmailCategory;
  subject: string;
  preheader: string;
  heading: string;
  message: string;
  actionHref: string;
  actionLabel: string;
  idempotencyKey: string;
};

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://www.snowd.ca";
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || "SNOWD <updates@updates.snowd.ca>";

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character] || character);
}

function emailHtml(name: string, content: EmailMessage) {
  const settingsUrl = `${APP_URL}/dashboard/settings?tab=notifications`;
  return `<!doctype html><html><body style="margin:0;background:#f3f8fb;color:#061321;font-family:Arial,sans-serif"><div style="display:none;max-height:0;overflow:hidden">${escapeHtml(content.preheader)}</div><table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td align="center" style="padding:32px 16px"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;background:#fff;border:1px solid #dce4e0;border-radius:20px"><tr><td style="padding:30px"><div style="font-size:28px;font-weight:800;letter-spacing:-1px">snowd<span style="color:#ff820e">.</span></div><h1 style="margin:28px 0 12px;font-size:26px">${escapeHtml(content.heading)}</h1><p style="font-size:16px;line-height:1.6">Hi ${escapeHtml(name || "there")},</p><p style="font-size:16px;line-height:1.6;color:#3e5060">${escapeHtml(content.message)}</p><a href="${escapeHtml(content.actionHref)}" style="display:inline-block;margin-top:12px;padding:13px 20px;background:#061321;color:#fff;text-decoration:none;border-radius:12px;font-weight:700">${escapeHtml(content.actionLabel)}</a><p style="margin-top:30px;font-size:12px;line-height:1.5;color:#5e6873">This email was sent for your SNOWD account. You can change email preferences in <a href="${settingsUrl}" style="color:#3e5060">Notification settings</a>.</p></td></tr></table></td></tr></table></body></html>`;
}

export async function sendUserEmail(uid: string, content: EmailMessage) {
  if (!process.env.RESEND_API_KEY) return { sent: false, reason: "not-configured" as const };
  const snapshot = await getAdminDb().doc(`users/${uid}`).get();
  const profile = snapshot.data();
  if (!snapshot.exists || !profile?.email) return { sent: false, reason: "no-recipient" as const };
  if (profile.emailNotifications?.[content.category] === false) return { sent: false, reason: "disabled" as const };
  const resend = new Resend(process.env.RESEND_API_KEY);
  const { data, error } = await resend.emails.send({
    from: FROM_EMAIL,
    to: [profile.email],
    subject: content.subject,
    html: emailHtml(profile.displayName || "", content),
  }, { idempotencyKey: content.idempotencyKey });
  if (error) throw new Error(error.message);
  return { sent: true, id: data?.id };
}

export function sendWorkOrderEmail(uid: string, jobId: string, title: string, eventId: string) {
  return sendUserEmail(uid, {
    category: "workOrders",
    subject: title,
    preheader: `There is an update to your SNOWD work order.`,
    heading: "Work order update",
    message: title,
    actionHref: `${APP_URL}/dashboard/jobs/${encodeURIComponent(jobId)}`,
    actionLabel: "View work order",
    idempotencyKey: `work-order-${jobId}-${eventId}`,
  });
}

export function sendWelcomeEmail(uid: string) {
  return sendUserEmail(uid, {
    category: "account",
    subject: "Welcome to SNOWD",
    preheader: "Your SNOWD account is ready.",
    heading: "Welcome to your neighbourhood snow network",
    message: "Your account is ready. Use SNOWD to book local snow help, manage work orders, and keep every job update in one place.",
    actionHref: `${APP_URL}/dashboard`,
    actionLabel: "Open your dashboard",
    idempotencyKey: `welcome-${uid}`,
  });
}
