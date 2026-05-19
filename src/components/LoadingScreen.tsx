"use client";

import { Snowflake } from "lucide-react";

const flakes = Array.from({ length: 28 }, (_, index) => ({
  id: index,
  left: `${(index * 37) % 100}%`,
  delay: `${(index % 9) * 0.16}s`,
  size: 14 + (index % 4) * 5,
}));

export default function LoadingScreen() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[#f3f8fb] text-[#061321]">
      <div aria-hidden="true" className="absolute inset-0">
        {flakes.map((flake) => (
          <Snowflake
            key={flake.id}
            className="absolute top-0 text-[#061321]/18"
            style={{
              left: flake.left,
              width: flake.size,
              height: flake.size,
              animation: `snowd-loading-snow 1.9s linear ${flake.delay} infinite`,
            }}
            strokeWidth={2.5}
          />
        ))}
      </div>

      <div
        aria-hidden="true"
        className="absolute inset-x-0 bottom-0 h-[42vh] rounded-t-[48%] bg-white"
        style={{ animation: "snowd-pile-up 3.2s ease-in-out infinite" }}
      />

      <div
        aria-hidden="true"
        className="absolute bottom-[29vh] left-0 h-10 w-[38vw] origin-right rounded-full bg-[#061321]"
        style={{ animation: "snowd-shovel-sweep 3.2s ease-in-out infinite" }}
      >
        <div className="absolute -right-16 -top-8 h-24 w-28 rotate-[18deg] rounded-[1.4rem] border-[4px] border-[#061321] bg-[#ff820e]" />
      </div>

      <div className="relative z-10 grid min-h-screen place-items-center px-6 text-center">
        <div>
          <p className="font-headline text-5xl font-black lowercase tracking-normal sm:text-7xl">
            snowd<span className="text-[#ff820e]">.</span>
          </p>
          <p className="mt-3 text-sm font-black uppercase tracking-[0.24em] text-[#061321]/56">
            Clearing the way
          </p>
        </div>
      </div>
    </div>
  );
}
