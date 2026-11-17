// Stripe sends operators here after setup in the app's secure sheet. Opening the app's
// connect-return link closes that sheet straight away, and the payouts screen checks Stripe again.
export default function ConnectReturn() {
  return <main className="native-page"><meta httpEquiv="refresh" content="0;url=snowd://connect-return" /><div className="native-content"><span className="native-brand">snowd<span>.</span></span><h1>Returning to SNOWD…</h1><p>SNOWD will check your Stripe setup. If Stripe needs more information, open Payouts in the app and choose Continue setup.</p><a className="native-primary" href="snowd://connect-return">Return to SNOWD</a><p className="text-sm">If the app doesn’t open, switch back to SNOWD and pull down on Payouts to check again.</p></div></main>;
}
