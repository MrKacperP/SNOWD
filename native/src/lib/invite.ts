/** The website that serves invite links (and opens the app when it's installed). */
const SITE = (process.env.EXPO_PUBLIC_API_URL || "https://www.snowd.ca").replace(/\/$/, "");

/** A person's invite link: opens their profile in SNOWD, or helps the reader get the app. */
export const inviteLink = (uid: string) => `${SITE}/i/${encodeURIComponent(uid)}`;
