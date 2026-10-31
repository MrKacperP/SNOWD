import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { BookVisual, FollowVisual, PhotoVisual } from "@/components/LandingStepVisuals";

const STEPS = [
  { visual: BookVisual, title: "Book in a minute" },
  { visual: FollowVisual, title: "Follow every step" },
  { visual: PhotoVisual, title: "See it done" },
];

/** Side panel for the sign-in and sign-up pages: the landing page's three animated steps. */
export default function AuthStepsAside() {
  return <div className="auth-aside-inner">
    <p className="auth-aside-kicker">How SNOWD works</p>
    <h2 className="auth-aside-title">Snow day, handled<span className="text-[var(--accent-sun)]">.</span></h2>
    <ol className="auth-aside-steps">
      {STEPS.map(({ visual: Visual, title }, i) => <li key={title}>
        <Visual compact />
        <p className="auth-aside-step-title"><span>0{i + 1}</span> {title}</p>
      </li>)}
    </ol>
    <p className="auth-aside-foot">Clear snow for neighbours? <Link href="/signup?role=operator">Earn with SNOWD <ArrowRight size={14} aria-hidden="true" /></Link></p>
  </div>;
}
