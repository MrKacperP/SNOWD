import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Check, Clock3 } from "lucide-react";

const TRACKER = ["Requested", "Confirmed", "On the way", "Clearing", "Done"];

/** Static, pared-down snapshots of the landing page's three steps. */
function BookSnapshot() {
  return <div className="auth-step-snap">
    <span className="auth-step-snap-line"><Clock3 size={14} aria-hidden="true" />2-car driveway · <b>ASAP</b></span>
    <span className="auth-step-pill"><Check size={14} strokeWidth={3} aria-hidden="true" />Booked</span>
  </div>;
}

function FollowSnapshot() {
  return <div className="auth-step-track" aria-hidden="true">
    {TRACKER.map((label, i) => <span key={label} data-on={i < 3 || undefined}><i />{label}</span>)}
  </div>;
}

function DoneSnapshot() {
  return <div className="auth-step-snap">
    <Image className="auth-step-thumb" src="/landing/snowd-cleared-driveway.png" alt="" width={64} height={44} sizes="64px" />
    <span className="auth-step-pill"><Check size={14} strokeWidth={3} aria-hidden="true" />Photo sent</span>
  </div>;
}

const STEPS = [
  { snapshot: BookSnapshot, title: "Book in a minute" },
  { snapshot: FollowSnapshot, title: "Follow every step" },
  { snapshot: DoneSnapshot, title: "See it done" },
];

/** Side panel for the sign-in and sign-up pages: the three steps as small static cards. */
export default function AuthStepsAside() {
  return <div className="auth-aside-inner">
    <p className="auth-aside-kicker">How SNOWD works</p>
    <h2 className="auth-aside-title">Snow day, handled<span className="text-[var(--accent-sun)]">.</span></h2>
    <ol className="auth-aside-steps">
      {STEPS.map(({ snapshot: Snapshot, title }, i) => <li key={title}>
        <p className="auth-aside-step-title"><span>0{i + 1}</span> {title}</p>
        <Snapshot />
      </li>)}
    </ol>
    <p className="auth-aside-foot">Clear snow for neighbours? <Link href="/signup?role=operator">Earn with SNOWD <ArrowRight size={14} aria-hidden="true" /></Link></p>
  </div>;
}
