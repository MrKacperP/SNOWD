/**
 * A light filter for objectionable text before it's posted (App Review 1.2): slurs, sexual content
 * and threats are stopped on the phone with a friendly note. Reports and blocking (lib/safety.ts) and
 * the support team handle anything it misses. Matching ignores case, accents, spacing tricks and
 * common letter swaps (1→i, 0→o, 3→e, 4/@→a, 5/$→s), and only matches whole words, so everyday words
 * that merely contain one of these ("Scunthorpe", "classic") pass.
 */

// Kept as stems; a word matches when it starts with a stem and adds at most a plural or verb ending.
const BLOCKED = [
  // Slurs
  "nigger", "nigga", "faggot", "fag", "dyke", "tranny", "retard", "chink", "spic", "kike", "wetback", "gook", "coon", "paki",
  // Sexual content
  "cunt", "pussy", "cock", "blowjob", "handjob", "porn", "nude", "nudes", "rape", "rapist", "whore", "slut",
  // Abuse
  "fuck", "fucker", "fucking", "motherfucker", "bitch", "asshole", "bastard",
];
// Threats that are objectionable as a phrase even though each word is ordinary.
const PHRASES = ["kill you", "kill yourself", "kys", "i will hurt you", "beat you up", "burn your house"];

const LEET: Record<string, string> = { "0": "o", "1": "i", "!": "i", "3": "e", "4": "a", "@": "a", "5": "s", $: "s", "7": "t", "8": "b" };

function normalize(text: string) {
  return text
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[0134578@$!]/g, (c) => LEET[c] || c)
    // "f.u.c.k" → "fuck", then "f u c k" → "fuck": single letters joined by dots/dashes, then by spaces.
    .replace(/\b(?:[a-z][.\-_*]){2,}[a-z]\b/g, (m) => m.replace(/[.\-_*]/g, ""))
    .replace(/\b(?:[a-z] ){3,}[a-z]\b/g, (m) => m.replace(/ /g, ""))
    .replace(/(.)\1{2,}/g, "$1$1");
}

const ENDINGS = "(?:s|es|ed|er|ers|ing|in|y|z)?";
const WORDS = new RegExp(`\\b(?:${BLOCKED.join("|")})${ENDINGS}\\b`);
const THREATS = new RegExp(`\\b(?:${PHRASES.map((p) => p.replace(/ /g, "\\s+")).join("|")})\\b`);

/** True when the text contains a blocked word or threat. */
export function isObjectionable(text: string) {
  if (!text) return false;
  const clean = normalize(text);
  return WORDS.test(clean) || THREATS.test(clean);
}

/** The note shown when something can't be posted. */
export const OBJECTIONABLE_NOTE = "Please keep it respectful. SNOWD doesn’t allow abusive, hateful or sexual language. Reword your message and try again.";
