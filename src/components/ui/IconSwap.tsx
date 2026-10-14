import type { ReactNode } from "react";

/** Keeps the original label and footprint; the hover artwork is decorative. */
export default function IconSwap({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return <span className="icon-swap"><span className="icon-swap-label">{children}</span><span className="icon-swap-asset" aria-hidden="true">{icon}</span></span>;
}
