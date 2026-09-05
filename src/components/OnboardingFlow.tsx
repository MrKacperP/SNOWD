"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import {
  ArrowRight,
  ArrowLeft,
  Check,
  Home,
  Truck,
  MapPin,
  Sparkles,
} from "lucide-react";
import OnboardingAddress, {
  type OnboardingLocation,
} from "./OnboardingAddress";
import {
  type PropertySize,
  type ServiceType,
  EQUIPMENT_OPTIONS,
} from "@/lib/types";

export type OnboardingDraft = {
  role: "client" | "operator" | null;
  step: number;
  location: OnboardingLocation;
  propertySize: PropertySize;
  serviceTypes: ServiceType[];
  specialInstructions: string;
  equipment: string[];
  serviceRadius: number;
  operatorServiceTypes: ServiceType[];
  pricingSmall: string;
  pricingMedium: string;
  pricingLarge: string;
  pricingWalkway: string;
  pricingSidewalk: string;
  businessName: string;
  bio: string;
  isStudent: boolean;
  phone: string;
  age: string;
};
const defaults: OnboardingDraft = {
  role: null,
  step: 1,
  location: { address: "", city: "", province: "", postalCode: "" },
  propertySize: "medium",
  serviceTypes: ["driveway", "walkway"],
  specialInstructions: "",
  equipment: ["Snow Shovel"],
  serviceRadius: 10,
  operatorServiceTypes: ["driveway", "walkway"],
  pricingSmall: "25",
  pricingMedium: "40",
  pricingLarge: "60",
  pricingWalkway: "15",
  pricingSidewalk: "15",
  businessName: "",
  bio: "",
  isStudent: false,
  phone: "",
  age: "",
};
const field =
  "w-full min-h-12 rounded-xl border-2 border-[#061321] bg-white px-3 text-base font-bold outline-none focus-visible:ring-4 focus-visible:ring-[#ff820e]/40";
const services: [ServiceType, string][] = [
  ["driveway", "Driveway"],
  ["walkway", "Walkway"],
  ["sidewalk", "Sidewalk"],
];
const propertySizes: [PropertySize, string, string][] = [
  ["small", "Small", "1-car driveway"],
  ["medium", "Medium", "2-car driveway"],
  ["large", "Large", "3+ cars / long"],
  ["commercial", "Commercial", "Parking lot"],
];
const priceFields = [
  ["pricingSmall", "Small driveway", "25"],
  ["pricingMedium", "Medium driveway", "40"],
  ["pricingLarge", "Large driveway", "60"],
  ["pricingWalkway", "Walkway", "15"],
  ["pricingSidewalk", "Sidewalk", "15"],
] as const;

function Choice({
  selected,
  children,
  onClick,
}: {
  selected: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={`flex min-h-14 items-center justify-between gap-3 rounded-2xl border-[3px] border-[#061321] px-4 py-3 text-left transition motion-safe:hover:-translate-y-0.5 focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-[#ff820e] ${selected ? "bg-[#dfeef8] shadow-[0_3px_0_#061321]" : "bg-white hover:bg-[#f3f8fb]"}`}
    >
      {children}
      <span
        aria-hidden="true"
        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 border-[#061321] ${selected ? "bg-[#ff820e]" : "bg-white"}`}
      >
        {selected && <Check size={15} strokeWidth={3} />}
      </span>
    </button>
  );
}

export default function OnboardingFlow({
  draftKey,
  onComplete,
}: {
  draftKey?: string;
  onComplete: (draft: OnboardingDraft) => Promise<void>;
}) {
  const [draft, setDraft] = useState(defaults);
  const [ready, setReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const reduceMotion = useReducedMotion();
  const { role, step, location } = draft;
  const update = (patch: Partial<OnboardingDraft>) => {
    setDraft((d) => ({ ...d, ...patch }));
    setError("");
  };

  useEffect(() => {
    try {
      const stored = draftKey ? localStorage.getItem(draftKey) : null;
      if (stored) {
        const parsed = JSON.parse(stored);
        // Only restore this version's complete draft shape; ignore obsolete or corrupt data.
        if (
          parsed.version === 2 &&
          parsed.data &&
          Object.entries(defaults)
            .filter(([, value]) => typeof value === "string")
            .every(([key]) => typeof parsed.data[key] === "string") &&
          ["small", "medium", "large", "commercial"].includes(
            parsed.data.propertySize,
          ) &&
          typeof parsed.data.isStudent === "boolean" &&
          Number.isFinite(parsed.data.serviceRadius) &&
          parsed.data.serviceRadius >= 1 &&
          parsed.data.serviceRadius <= 50 &&
          ["address", "city", "province", "postalCode"].every(
            (key) => typeof parsed.data.location?.[key] === "string",
          ) &&
          (parsed.data.role === "client" ||
            parsed.data.role === "operator" ||
            parsed.data.role === null) &&
          [1, 2, 3].includes(parsed.data.step) &&
          parsed.data.location &&
          ["serviceTypes", "operatorServiceTypes", "equipment"].every(
            (key) =>
              Array.isArray(parsed.data[key]) &&
              parsed.data[key].every(
                (item: unknown) => typeof item === "string",
              ),
          )
        ) {
          setDraft({
            ...defaults,
            ...parsed.data,
            step: parsed.data.role ? parsed.data.step : 1,
          });
        }
      }
    } catch {
      /* Storage can be disabled; signup remains usable. */
    }
    setReady(true);
  }, [draftKey]);

  useEffect(() => {
    if (!ready || !draftKey) return;
    try {
      localStorage.setItem(
        draftKey,
        JSON.stringify({ version: 2, data: draft }),
      );
      setSaved(true);
    } catch {
      setSaved(false);
    }
  }, [draft, draftKey, ready]);

  const visiblePrices = priceFields.filter(([key]) =>
    key === "pricingWalkway"
      ? draft.operatorServiceTypes.includes("walkway")
      : key === "pricingSidewalk"
        ? draft.operatorServiceTypes.includes("sidewalk")
        : draft.operatorServiceTypes.includes("driveway"),
  );
  const validAddress =
    location.address.trim().length > 4 &&
    location.city.trim().length > 0 &&
    Boolean(location.province) &&
    /^[A-Z]\d[A-Z]\s?\d[A-Z]\d$/i.test(location.postalCode.trim());
  const validPrices = visiblePrices.every(
    ([key]) =>
      /^\d+(\.\d{1,2})?$/.test(draft[key]) &&
      Number(draft[key]) > 0 &&
      Number(draft[key]) <= 10000,
  );
  const validAge =
    !draft.age ||
    (Number.isInteger(Number(draft.age)) &&
      Number(draft.age) >= 13 &&
      Number(draft.age) <= 120);
  const validPhone =
    !draft.phone || /^\+?1?\d{10}$/.test(draft.phone.replace(/[\s()-]/g, ""));
  const validDetails =
    validAge &&
    validPhone &&
    (role === "client"
      ? draft.serviceTypes.length > 0
      : draft.operatorServiceTypes.length > 0 &&
        draft.equipment.length > 0 &&
        validPrices);
  const canContinue =
    step === 1 ? Boolean(role) : step === 2 ? validAddress : validDetails;
  const title =
    step === 1
      ? "How can we help?"
      : step === 2
        ? "Where’s your snow?"
        : role === "client"
          ? "What needs clearing?"
          : "Your services. Your prices.";
  const message =
    step === 1
      ? "Hi, I’m your snow-day sidekick. Let’s get you started!"
      : step === 2
        ? "Just one search. I’ll help with the rest!"
        : "You’re nearly there. Let’s make this snow day a good one!";
  const move = (next: number) => {
    update({ step: next });
    requestAnimationFrame(() => {
      heading.current?.focus();
      window.scrollTo({ top: 0, behavior: "instant" });
    });
  };
  const toggle = (
    key: "serviceTypes" | "operatorServiceTypes",
    value: ServiceType,
  ) =>
    update({
      [key]: draft[key].includes(value)
        ? draft[key].filter((v) => v !== value)
        : [...draft[key], value],
    });
  const submit = async () => {
    if (saving) return;
    if (!role) {
      move(1);
      return;
    }
    if (!validAddress) {
      move(2);
      return;
    }
    if (!validDetails) return;
    setSaving(true);
    setError("");
    try {
      await onComplete(draft);
      if (draftKey) {
        try {
          localStorage.removeItem(draftKey);
        } catch {}
      }
    } catch {
      setError(
        "We couldn’t finish setup. Your answers are still here. Please try again.",
      );
    } finally {
      setSaving(false);
    }
  };

  if (!ready)
    return (
      <main
        className="flex min-h-dvh items-center justify-center bg-[#f3f8fb] text-[#061321]"
        role="status"
      >
        Getting your setup ready…
      </main>
    );
  return (
    <main className="min-h-dvh bg-[#f3f8fb] px-4 py-5 text-[#061321] sm:px-6 sm:py-8">
      <header className="mx-auto flex max-w-5xl items-center justify-between gap-4">
        <Link
          href="/"
          aria-label="snowd home"
          className="flex items-center gap-2"
        >
          <Image
            src="/logo.png"
            alt=""
            width={40}
            height={44}
            className="h-auto w-10"
          />
          <span className="font-headline text-3xl font-black">
            snowd<span className="text-[#ff820e]">.</span>
          </span>
        </Link>
        <span className="text-xs font-bold text-[#061321]/65">
          {saved ? "Progress saved" : "A few steps. A fresh start."}
        </span>
      </header>
      <div className="mx-auto mt-6 max-w-5xl overflow-hidden rounded-[1.5rem] border-[3px] border-[#061321] bg-white shadow-[6px_6px_0_#061321] lg:grid lg:grid-cols-[0.72fr_1fr]">
        <aside className="relative flex items-center gap-3 border-b-[3px] border-[#061321] bg-[#dfeef8] p-4 lg:flex-col lg:justify-center lg:border-b-0 lg:border-r-[3px] lg:p-8">
          <motion.div
            key={step}
            initial={reduceMotion ? false : { scale: 0.97, y: 5 }}
            animate={{ scale: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 220, damping: 15 }}
            className="w-20 shrink-0 lg:w-full lg:max-w-64"
          >
            <Image
              src="/logo.png"
              alt=""
              width={320}
              height={342}
              priority
              className="h-auto w-full"
            />
          </motion.div>
          <div
            className="rounded-2xl border-2 border-[#061321] bg-white px-4 py-3 text-sm font-extrabold leading-relaxed lg:text-center lg:text-lg"
            aria-live="polite"
          >
            {message}
          </div>
          <p className="mt-5 hidden text-sm font-bold text-[#061321]/60 lg:block">
            A little setup. A lot less shoveling.
          </p>
        </aside>
        <section className="min-w-0 p-5 sm:p-8">
          <div className="mb-6">
            <div className="mb-2 flex justify-between text-xs font-black uppercase tracking-wider">
              <span>
                {["Your role", "Your address", "Your services"][step - 1]}
              </span>
              <span>Step {step} of 3</span>
            </div>
            <div
              role="progressbar"
              aria-label="Setup progress"
              aria-valuemin={0}
              aria-valuemax={3}
              aria-valuenow={step}
              className="h-3 overflow-hidden rounded-full border-2 border-[#061321] bg-[#f3f8fb]"
            >
              <div
                className="h-full bg-[#ff820e] motion-safe:transition-all motion-safe:duration-300"
                style={{ width: `${(step / 3) * 100}%` }}
              />
            </div>
          </div>
          <h1
            ref={heading}
            tabIndex={-1}
            className="font-headline text-3xl font-black leading-tight outline-none sm:text-4xl"
          >
            {title}
          </h1>
          <p className="mb-6 mt-2 text-sm font-semibold leading-6 text-[#061321]/65">
            {step === 1
              ? "Choose what brings you to snowd."
              : step === 2
                ? role === "client"
                  ? "Find the home you’d like cleared."
                  : "Start with your home base. Set how far you’ll travel next."
                : role === "client"
                  ? "Pick what you need. You can change these details later."
                  : "Choose your services, then keep or edit the starter prices."}
          </p>
          <fieldset disabled={saving} className="min-w-0 space-y-4">
            <legend className="sr-only">{title}</legend>
            {step === 1 && (
              <div className="grid gap-4">
                {(
                  [
                    [
                      "client",
                      Home,
                      "I’m a homeowner",
                      "Find friendly, local snow removal.",
                    ],
                    [
                      "operator",
                      Truck,
                      "I’m an operator",
                      "Earn money clearing snow nearby.",
                    ],
                  ] as const
                ).map(([value, Icon, label, description]) => (
                  <Choice
                    key={value}
                    selected={role === value}
                    onClick={() => update({ role: value })}
                  >
                    <span className="flex items-center gap-3">
                      <Icon size={30} strokeWidth={2.5} />
                      <span>
                        <span className="block text-lg font-black">
                          {label}
                        </span>
                        <span className="mt-1 block text-sm font-medium text-[#061321]/65">
                          {description}
                        </span>
                      </span>
                    </span>
                  </Choice>
                ))}
              </div>
            )}
            {step === 2 && (
              <OnboardingAddress
                value={location}
                onChange={(location) => update({ location })}
              />
            )}
            {step === 3 && (
              <>
                {role === "client" && (
                  <div>
                    <h2 className="mb-2 text-sm font-black">Property size</h2>
                    <div className="grid grid-cols-2 gap-3">
                      {propertySizes.map(([size, label, description]) => (
                        <Choice
                          key={size}
                          selected={draft.propertySize === size}
                          onClick={() =>
                            update({
                              propertySize: size,
                              serviceTypes:
                                size === "commercial"
                                  ? ["parking-lot", "sidewalk"]
                                  : ["driveway", "walkway"],
                            })
                          }
                        >
                          <span>
                            <span className="block font-black">{label}</span>
                            <span className="text-xs font-semibold">
                              {description}
                            </span>
                          </span>
                        </Choice>
                      ))}
                    </div>
                  </div>
                )}
                <div>
                  <h2 className="mb-2 text-sm font-black">
                    {role === "client"
                      ? "Areas to clear"
                      : "What do you offer?"}
                  </h2>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {(role === "client"
                      ? [
                          ...services,
                          ["parking-lot", "Parking lot"] as [
                            ServiceType,
                            string,
                          ],
                          ["roof", "Roof snow removal"] as [
                            ServiceType,
                            string,
                          ],
                          ["other", "Other"] as [ServiceType, string],
                        ]
                      : services
                    ).map(([value, label]) => (
                      <Choice
                        key={value}
                        selected={(role === "client"
                          ? draft.serviceTypes
                          : draft.operatorServiceTypes
                        ).includes(value)}
                        onClick={() =>
                          toggle(
                            role === "client"
                              ? "serviceTypes"
                              : "operatorServiceTypes",
                            value,
                          )
                        }
                      >
                        <span className="text-sm font-bold">{label}</span>
                      </Choice>
                    ))}
                  </div>
                </div>
                {role === "operator" && (
                  <>
                    <div className="rounded-2xl border-2 border-[#061321] bg-[#f3f8fb] p-4">
                      <h2 className="flex items-center gap-2 text-sm font-black">
                        <Sparkles size={18} className="text-[#ff820e]" />
                        Starter prices · CAD / visit
                      </h2>
                      <p className="mb-4 mt-1 text-xs leading-5 text-[#061321]/65">
                        Suggested starting points, not market estimates. Charge
                        what works for you.
                      </p>
                      <div className="space-y-3">
                        {visiblePrices.map(([key, label, recommended]) => (
                          <label
                            key={key}
                            className="flex items-center justify-between gap-3"
                          >
                            <span className="text-sm font-bold">
                              {label}
                              <span className="block text-xs font-medium text-[#061321]/60">
                                Suggested ${recommended}
                              </span>
                            </span>
                            <span className="relative w-28 shrink-0">
                              <span
                                className="absolute left-3 top-3 font-bold"
                                aria-hidden="true"
                              >
                                $
                              </span>
                              <input
                                aria-label={`${label} price in CAD`}
                                className={`${field} pl-7`}
                                inputMode="decimal"
                                type="text"
                                value={draft[key]}
                                onChange={(e) =>
                                  update({ [key]: e.target.value })
                                }
                              />
                            </span>
                          </label>
                        ))}
                      </div>
                      {!validPrices && (
                        <p
                          role="alert"
                          className="mt-3 text-sm font-bold text-red-700"
                        >
                          Enter a price from $0.01 to $10,000, with up to two
                          decimal places.
                        </p>
                      )}
                      <button
                        type="button"
                        className="mt-3 min-h-11 text-xs font-bold underline underline-offset-4"
                        onClick={() =>
                          update({
                            pricingSmall: "25",
                            pricingMedium: "40",
                            pricingLarge: "60",
                            pricingWalkway: "15",
                            pricingSidewalk: "15",
                          })
                        }
                      >
                        Use suggested prices
                      </button>
                    </div>
                    <label className="block text-sm font-black">
                      How far will you travel?{" "}
                      <span className="float-right rounded-full bg-[#dfeef8] px-3 py-1">
                        {draft.serviceRadius} km
                      </span>
                      <input
                        aria-label="Service radius in kilometres"
                        className="mt-4 h-8 w-full accent-[#ff820e]"
                        type="range"
                        min={1}
                        max={50}
                        value={draft.serviceRadius}
                        onChange={(e) =>
                          update({ serviceRadius: Number(e.target.value) })
                        }
                      />
                      <span className="flex justify-between text-xs font-medium">
                        <span>Close to home · 1 km</span>
                        <span>50 km</span>
                      </span>
                    </label>
                    <p className="text-xs leading-5 text-[#061321]/65">
                      Your profile needs verification before you can accept
                      jobs. We’ll guide you from your dashboard.
                    </p>
                  </>
                )}
                <details className="rounded-2xl border-2 border-[#061321]/20 p-3">
                  <summary className="cursor-pointer py-2 text-sm font-bold">
                    {role === "operator"
                      ? "Your equipment & optional details"
                      : "Add a note or contact details (optional)"}
                  </summary>
                  <div className="mt-3 space-y-3">
                    {role === "operator" && (
                      <>
                        <p className="text-xs font-bold">
                          Equipment · choose at least one
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {EQUIPMENT_OPTIONS.map((item) => (
                            <button
                              type="button"
                              key={item}
                              aria-pressed={draft.equipment.includes(item)}
                              className={`min-h-11 rounded-xl border-2 border-[#061321] px-3 text-xs font-bold ${draft.equipment.includes(item) ? "bg-[#dfeef8]" : "bg-white"}`}
                              onClick={() =>
                                update({
                                  equipment: draft.equipment.includes(item)
                                    ? draft.equipment.filter((e) => e !== item)
                                    : [...draft.equipment, item],
                                })
                              }
                            >
                              {draft.equipment.includes(item) ? "✓ " : ""}
                              {item}
                            </button>
                          ))}
                        </div>
                        <label className="flex min-h-11 items-center gap-2 text-sm font-bold">
                          <input
                            type="checkbox"
                            checked={draft.isStudent}
                            onChange={(e) =>
                              update({ isStudent: e.target.checked })
                            }
                          />
                          I’m a student operator
                        </label>
                        <label className="block text-sm font-bold">
                          Business name (optional)
                          <input
                            className={field}
                            value={draft.businessName}
                            onChange={(e) =>
                              update({ businessName: e.target.value })
                            }
                          />
                        </label>
                        <label className="block text-sm font-bold">
                          A little about you (optional)
                          <textarea
                            className={`${field} py-3`}
                            value={draft.bio}
                            onChange={(e) => update({ bio: e.target.value })}
                          />
                        </label>
                      </>
                    )}
                    {role === "client" && (
                      <label className="block text-sm font-bold">
                        Anything we should know?
                        <textarea
                          className={`${field} py-3`}
                          value={draft.specialInstructions}
                          onChange={(e) =>
                            update({ specialInstructions: e.target.value })
                          }
                          placeholder="A gate, steps, or a spot to watch out for…"
                        />
                      </label>
                    )}
                    <label className="block text-sm font-bold">
                      Phone (optional)
                      <input
                        className={field}
                        type="tel"
                        autoComplete="tel"
                        value={draft.phone}
                        onChange={(e) => update({ phone: e.target.value })}
                      />
                    </label>
                    <label className="block text-sm font-bold">
                      Age (optional)
                      <input
                        className={field}
                        inputMode="numeric"
                        value={draft.age}
                        onChange={(e) => update({ age: e.target.value })}
                      />
                      <span className="text-xs font-medium">
                        Helps us personalize your experience.
                      </span>
                    </label>
                  </div>
                </details>
                {!validAge && (
                  <p className="text-sm font-bold text-red-700">
                    Enter an age between 13 and 120, or leave it blank.
                  </p>
                )}
                {!validPhone && (
                  <p className="text-sm font-bold text-red-700">
                    Enter a 10-digit phone number, or leave it blank.
                  </p>
                )}
                {role === "operator" && draft.equipment.length === 0 && (
                  <p className="text-sm font-bold text-red-700">
                    Choose at least one item under equipment.
                  </p>
                )}
              </>
            )}
          </fieldset>
          {error && (
            <p
              role="alert"
              className="mt-4 rounded-xl bg-red-50 p-3 text-sm font-bold text-red-700"
            >
              {error}
            </p>
          )}
          <div className="mt-6 flex items-center gap-3 border-t-2 border-[#061321]/10 pt-5">
            {step > 1 && (
              <button
                type="button"
                aria-label="Previous step"
                disabled={saving}
                onClick={() => move(step - 1)}
                className="flex h-13 w-13 shrink-0 items-center justify-center rounded-2xl border-[3px] border-[#061321] bg-white disabled:opacity-50"
              >
                <ArrowLeft size={20} />
              </button>
            )}
            <button
              type="button"
              disabled={!canContinue || saving}
              onClick={() => (step < 3 ? move(step + 1) : void submit())}
              className="flex min-h-13 flex-1 items-center justify-center gap-2 rounded-2xl border-[3px] border-[#061321] bg-[#ff820e] px-4 py-3 text-base font-black shadow-[0_4px_0_#061321] transition enabled:hover:bg-[#ff9c40] focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-[#061321] disabled:opacity-45"
            >
              {saving
                ? "Getting things ready…"
                : step < 3
                  ? "Continue"
                  : role === "client"
                    ? "Find snow removal"
                    : "Create my operator profile"}
              {!saving && <ArrowRight size={20} />}
            </button>
          </div>
          {step === 3 && (
            <p className="mt-4 text-center text-xs font-semibold text-[#061321]/60">
              You can update your preferences anytime.
            </p>
          )}
        </section>
      </div>
      <p className="mx-auto mt-6 max-w-5xl text-center text-xs font-semibold text-[#061321]/50">
        <MapPin className="mr-1 inline h-3 w-3" />
        Made for your neighbourhood. Ready for winter.
      </p>
    </main>
  );
}
