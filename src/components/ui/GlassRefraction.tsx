"use client";

import dynamic from "next/dynamic";

// The renderer reads navigator during render, so it must never run on the server.
const LiquidGlass = dynamic(() => import("liquid-glass-react"), { ssr: false });

/** Decorative optics only. Native links/buttons keep their semantics and layout. */
export default function GlassRefraction({ radius = 28 }: { radius?: number }) {
  return (
    <div className="glass-refraction" aria-hidden="true">
      <LiquidGlass
        className="glass-refraction-renderer"
        cornerRadius={radius}
        displacementScale={28}
        blurAmount={0.16}
        saturation={125}
        aberrationIntensity={0.6}
        elasticity={0}
        padding="0"
        style={{ position: "absolute", top: "50%", left: "50%", width: "100%", height: "100%" }}
      >
        <span />
      </LiquidGlass>
    </div>
  );
}
