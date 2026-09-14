/** User-facing recovery guidance shared by Google login and signup. */
export function googleSignInError(error: unknown): string {
  const code = typeof error === "object" && error !== null && "code" in error ? error.code : "";
  switch (code) {
    case "auth/popup-closed-by-user":
      return "Google sign-in was closed before it finished. Select Continue with Google to try again.";
    case "auth/cancelled-popup-request":
      return "Another sign-in window is already open. Finish signing in there, or try again.";
    case "auth/popup-blocked":
      return "Your browser blocked the Google sign-in window. Allow popups for this site and try again. If you are in an in-app browser, open this page in Chrome or Safari.";
    case "auth/unauthorized-domain":
      return "Google sign-in is not enabled for this website address. The site administrator needs to add this domain to Firebase Authentication’s authorized domains.";
    case "auth/operation-not-allowed":
      return "Google sign-in is not enabled yet. Please contact support or sign in with email.";
    case "auth/network-request-failed":
      return "Google sign-in could not connect. Check your internet connection and try again.";
    case "auth/account-exists-with-different-credential":
      return "An account already exists with this email. Sign in using the method you originally used.";
    default:
      return "Google sign-in could not finish. Try again, or open this page in Chrome or Safari.";
  }
}
