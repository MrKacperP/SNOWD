"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  ArrowLeft,
  Check,
  Car,
  DoorOpen,
  Footprints,
  Trees,
  type LucideIcon,
} from "lucide-react";
import OnboardingAddress, {
  type OnboardingLocation,
} from "./OnboardingAddress";
import ServiceAreaEditor from "./ServiceAreaEditor";
import ProfilePhotoPicker from "./ProfilePhotoPicker";
import SnowStorm from "./SnowStorm";
import styles from "./onboarding.module.css";
import {
  type OperatorServiceArea,
  type PropertySize,
  type ServiceType,
  EQUIPMENT_OPTIONS,
  SHOVELING_SERVICES,
  isShovelingService,
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
  serviceAreaMode: "radius" | "cities";
  serviceAreas: OperatorServiceArea[];
  operatorServiceTypes: ServiceType[];
  /** Blank prices fall back to the suggested amount shown in the input. */
  pricingSmall: string;
  pricingMedium: string;
  pricingLarge: string;
  /** One price for both the front porch and the sidewalk. */
  pricingSidewalk: string;
  pricingBackyardPatio: string;
  isStudent: boolean;
  phone: string;
  age: string;
  avatar: string;
};

export const SUGGESTED_PRICES = {
  pricingSmall: 25,
  pricingMedium: 40,
  pricingLarge: 60,
  pricingSidewalk: 15,
  pricingBackyardPatio: 20,
} as const;

const defaults: OnboardingDraft = {
  role: null,
  step: 1,
  location: { address: "", city: "", province: "", postalCode: "" },
  propertySize: "medium",
  serviceTypes: ["driveway"],
  specialInstructions: "",
  equipment: ["Snow Shovel"],
  serviceRadius: 10,
  serviceAreaMode: "radius",
  serviceAreas: [],
  operatorServiceTypes: ["driveway", "porch", "sidewalk"],
  pricingSmall: "",
  pricingMedium: "",
  pricingLarge: "",
  pricingSidewalk: "",
  pricingBackyardPatio: "",
  isStudent: false,
  phone: "",
  age: "",
  avatar: "",
};

const serviceIcons: Record<(typeof SHOVELING_SERVICES)[number][0], LucideIcon> = {
  driveway: Car,
  porch: DoorOpen,
  sidewalk: Footprints,
  "backyard-patio": Trees,
};
const serviceHints: Record<(typeof SHOVELING_SERVICES)[number][0], string> = {
  driveway: "Priced by size",
  porch: "Steps and landing",
  sidewalk: "Along the street",
  "backyard-patio": "Deck or patio out back",
};
const propertySizes: [PropertySize, string, string][] = [
  ["small", "1-car driveway", "Fits one car"],
  ["medium", "2-car driveway", "Fits two cars"],
  ["large", "3+ car driveway", "Fits three or more"],
];
type PriceKey = keyof typeof SUGGESTED_PRICES;
const priceFields: { key: PriceKey; label: string; detail?: string; offered: (services: ServiceType[]) => boolean }[] = [
  { key: "pricingSmall", label: "1-car driveway", offered: (s) => s.includes("driveway") },
  { key: "pricingMedium", label: "2-car driveway", offered: (s) => s.includes("driveway") },
  { key: "pricingLarge", label: "3+ car driveway", offered: (s) => s.includes("driveway") },
  { key: "pricingSidewalk", label: "Front porch & sidewalk", detail: "One price for either area", offered: (s) => s.includes("porch") || s.includes("sidewalk") },
  { key: "pricingBackyardPatio", label: "Backyard patio", detail: "Set your own rate", offered: (s) => s.includes("backyard-patio") },
];
const validPrice = (value: string) =>
  !value || (/^\d+(\.\d{1,2})?$/.test(value) && Number(value) > 0 && Number(value) <= 10000);
const stepNames = ["Your role", "Your address", "Your services"];

function OptionButton({ selected, onClick, icon: Icon, label, hint }: { selected: boolean; onClick: () => void; icon?: LucideIcon; label: string; hint?: string }) {
  return (
    <button type="button" aria-pressed={selected} onClick={onClick} className={styles.option}>
      {Icon && <span className={styles.optionIcon} aria-hidden="true"><Icon size={18} /></span>}
      <span>{label}{hint && <small>{hint}</small>}</span>
      <span className={styles.check} aria-hidden="true">{selected && <Check size={14} strokeWidth={3} />}</span>
    </button>
  );
}

export default function OnboardingFlow({
  draftKey,
  onComplete,
  initialRole = null,
}: {
  initialRole?: "client" | "operator" | null;
  draftKey?: string;
  onComplete: (draft: OnboardingDraft) => Promise<void>;
}) {
  const [draft, setDraft] = useState({ ...defaults, role: initialRole });
  const [ready, setReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);
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
        const data = parsed?.data;
        // Only restore the current draft shape; ignore obsolete or corrupt data.
        if (
          parsed.version === 4 &&
          data &&
          Object.entries(defaults)
            .filter(([key, value]) => typeof value === "string" && key !== "serviceAreaMode")
            .every(([key]) => typeof data[key] === "string") &&
          ["small", "medium", "large"].includes(data.propertySize) &&
          typeof data.isStudent === "boolean" &&
          ["radius", "cities"].includes(data.serviceAreaMode) &&
          Array.isArray(data.serviceAreas) &&
          data.serviceAreas.every((area: OperatorServiceArea) => area && typeof area.placeId === "string" && typeof area.city === "string" && Number.isFinite(area.lat) && Number.isFinite(area.lng)) &&
          Number.isFinite(data.serviceRadius) &&
          data.serviceRadius >= 1 &&
          data.serviceRadius <= 50 &&
          ["address", "city", "province", "postalCode"].every((key) => typeof data.location?.[key] === "string") &&
          (data.role === "client" || data.role === "operator" || data.role === null) &&
          [1, 2, 3].includes(data.step) &&
          ["serviceTypes", "operatorServiceTypes", "equipment"].every(
            (key) => Array.isArray(data[key]) && data[key].every((item: unknown) => typeof item === "string"),
          )
        ) {
          setDraft({
            ...defaults,
            ...data,
            serviceTypes: data.serviceTypes.filter(isShovelingService),
            operatorServiceTypes: data.operatorServiceTypes.filter(isShovelingService),
            role: initialRole || data.role,
            step: initialRole && initialRole !== data.role ? 1 : data.role ? data.step : 1,
          });
        }
      }
    } catch {
      /* Storage can be disabled; signup remains usable. */
    }
    setReady(true);
  }, [draftKey, initialRole]);

  useEffect(() => {
    if (!ready || !draftKey) return;
    try {
      localStorage.setItem(draftKey, JSON.stringify({ version: 4, data: draft }));
      setSaved(true);
    } catch {
      setSaved(false);
    }
  }, [draft, draftKey, ready]);

  const visiblePrices = priceFields.filter((field) => field.offered(draft.operatorServiceTypes));
  const validAddress =
    location.address.trim().length > 4 &&
    location.city.trim().length > 0 &&
    Boolean(location.province) &&
    /^[A-Z]\d[A-Z]\s?\d[A-Z]\d$/i.test(location.postalCode.trim());
  const validPrices = visiblePrices.every(({ key }) => validPrice(draft[key]));
  const validAge =
    !draft.age ||
    (Number.isInteger(Number(draft.age)) && Number(draft.age) >= 13 && Number(draft.age) <= 120);
  const validPhone = !draft.phone || /^\+?1?\d{10}$/.test(draft.phone.replace(/[\s()-]/g, ""));
  const validDetails =
    validAge &&
    validPhone &&
    (role === "client"
      ? draft.serviceTypes.length > 0
      : draft.operatorServiceTypes.length > 0 && draft.equipment.length > 0 && validPrices);
  const validArea = role !== "operator" || draft.serviceAreaMode === "radius" || draft.serviceAreas.length > 0;
  const canContinue = step === 1 ? Boolean(role) : step === 2 ? validAddress && validArea : validDetails;
  const title =
    step === 1
      ? "How can we help"
      : step === 2
        ? role === "operator" ? "Where you’ll work" : "Where’s your snow"
        : role === "client"
          ? "What needs clearing"
          : "Your services, your prices";
  const lede =
    step === 1
      ? "Choose what brings you to SNOWD."
      : step === 2
        ? role === "client"
          ? "Find the home you’d like cleared."
          : "Start with your home base, then set how far you’ll travel."
        : role === "client"
          ? "Pick the areas of your property to shovel. You can change these when you book."
          : "Choose what you clear. Leave a price blank to use the suggestion.";
  const move = (next: number) => {
    update({ step: next });
    requestAnimationFrame(() => {
      heading.current?.focus();
      heading.current?.closest(".auth-frame")?.scrollTo({ top: 0 });
    });
  };
  const toggle = (key: "serviceTypes" | "operatorServiceTypes", value: ServiceType) =>
    update({
      [key]: draft[key].includes(value) ? draft[key].filter((v) => v !== value) : [...draft[key], value],
    });
  const submit = async () => {
    if (saving) return;
    if (!role) return move(1);
    if (!validAddress || !validArea) return move(2);
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
      setError("We couldn’t finish setup. Your answers are still here. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (!ready)
    return (
      <main className="flex min-h-dvh items-center justify-center bg-[#050b16] text-white" role="status">
        Getting your setup ready…
      </main>
    );
  const selectedServices = role === "client" ? draft.serviceTypes : draft.operatorServiceTypes;
  return (
    <main className="onboarding-flow auth-page grid h-dvh place-items-center overflow-hidden px-4 py-4 sm:p-6">
      <SnowStorm />
      <div className="auth-frame auth-frame-split relative w-full max-w-[1040px]">
        <section className="flex min-w-0 flex-col p-4 sm:p-7">
          <Link href="/" className="inline-flex min-h-11 w-fit items-center gap-3" aria-label="SNOWD home">
            <Image src="/logo.png" alt="" width={44} height={48} priority className="h-12 w-11 object-contain" />
            <span className="font-headline text-3xl font-semibold">snowd<span className="text-[var(--accent-sun)]">.ca</span></span>
          </Link>
          <div className={`${styles.body} mx-auto w-full max-w-[480px] flex-1 py-4`}>
            <div className="grid gap-2">
              <div className={styles.top}>
                <span>Step {step} of 3 · {stepNames[step - 1]}</span>
                <span className={styles.saved}>{saved ? "Progress saved" : ""}</span>
              </div>
              <div role="progressbar" aria-label="Setup progress" aria-valuemin={0} aria-valuemax={3} aria-valuenow={step} className={styles.progress}>
                <span style={{ width: `${(step / 3) * 100}%` }} />
              </div>
            </div>
            <h1 ref={heading} tabIndex={-1} className={styles.title}>{title}<span>.</span></h1>
            <p className={styles.lede}>{lede}</p>

            <fieldset disabled={saving} className={styles.fields}>
              <legend className="sr-only">{title}</legend>
              {step === 1 && (
                <div className={styles.roles}>
                  {([
                    ["client", "/landing/snowd-cleared-driveway.png", "I’m a homeowner", "Find friendly, local snow removal."],
                    ["operator", "/landing/snowd-mascot-helper-cutout.png", "I’m an operator", "Earn money clearing snow nearby."],
                  ] as const).map(([value, art, label, description]) => (
                    <button key={value} type="button" data-kind={value} aria-pressed={role === value} onClick={() => update({ role: value })} className={styles.role}>
                      <span className={styles.check} aria-hidden="true">{role === value && <Check size={15} strokeWidth={3} />}</span>
                      <span className={styles.roleArt}><Image src={art} alt="" width={400} height={240} sizes="(min-width: 520px) 240px, 100vw" /></span>
                      <span className={styles.roleCopy}><strong>{label}</strong><span>{description}</span></span>
                    </button>
                  ))}
                </div>
              )}

              {step === 2 && (
                <>
                  <OnboardingAddress value={location} onChange={(location) => update({ location })} />
                  {role === "operator" && validAddress && (
                    <ServiceAreaEditor location={location} mode={draft.serviceAreaMode} radius={draft.serviceRadius} cities={draft.serviceAreas} onChange={update} />
                  )}
                </>
              )}

              {step === 3 && (
                <>
                  <section className={styles.card}>
                    <div className={styles.cardHead}>
                      <h2>{role === "client" ? "Areas to shovel" : "What do you clear?"}</h2>
                      <p>{role === "client" ? "Choose every area you want cleared at this property." : "Clients can only book the areas you offer."}</p>
                    </div>
                    <div className={styles.options}>
                      {SHOVELING_SERVICES.map(([value, label]) => (
                        <OptionButton
                          key={value}
                          selected={selectedServices.includes(value)}
                          onClick={() => toggle(role === "client" ? "serviceTypes" : "operatorServiceTypes", value)}
                          icon={serviceIcons[value]}
                          label={label}
                          hint={serviceHints[value]}
                        />
                      ))}
                    </div>
                    {!selectedServices.length && <p className={styles.error}>Choose at least one area.</p>}
                  </section>

                  {role === "client" && draft.serviceTypes.includes("driveway") && (
                    <section className={styles.card}>
                      <div className={styles.cardHead}>
                        <h2>Driveway size</h2>
                        <p>Operators price driveways by size.</p>
                      </div>
                      <div className={styles.options}>
                        {propertySizes.map(([size, label, hint]) => (
                          <OptionButton key={size} selected={draft.propertySize === size} onClick={() => update({ propertySize: size })} label={label} hint={hint} />
                        ))}
                      </div>
                    </section>
                  )}

                  {role === "operator" && visiblePrices.length > 0 && (
                    <section className={styles.card}>
                      <div className={styles.cardHead}>
                        <h2>Your prices · CAD per visit</h2>
                        <p>Front porch and sidewalk share one price. You can change prices any time in settings.</p>
                      </div>
                      <div className={styles.prices}>
                        {visiblePrices.map(({ key, label, detail }) => (
                          <label key={key} className={styles.price}>
                            <span>{label}{detail && <small>{detail}</small>}</span>
                            <span className={styles.priceInput}>
                              <span aria-hidden="true">$</span>
                              <input
                                aria-label={`${label} price in CAD`}
                                className={styles.input}
                                inputMode="decimal"
                                type="text"
                                placeholder={`${SUGGESTED_PRICES[key]} suggested`}
                                value={draft[key]}
                                aria-invalid={!validPrice(draft[key]) || undefined}
                                onChange={(e) => update({ [key]: e.target.value })}
                              />
                            </span>
                          </label>
                        ))}
                      </div>
                      {!validPrices && <p role="alert" className={styles.error}>Enter a price from $0.01 to $10,000, with up to two decimal places.</p>}
                    </section>
                  )}

                  {role === "operator" && (
                    <section className={styles.card}>
                      <div className={styles.cardHead}>
                        <h2>Your equipment</h2>
                        <p>Choose at least one.</p>
                      </div>
                      <div className={styles.chips}>
                        {EQUIPMENT_OPTIONS.map((item) => {
                          const on = draft.equipment.includes(item);
                          return (
                            <button type="button" key={item} aria-pressed={on} className={styles.chip} onClick={() => update({ equipment: on ? draft.equipment.filter((e) => e !== item) : [...draft.equipment, item] })}>
                              {on ? "✓ " : ""}{item}
                            </button>
                          );
                        })}
                      </div>
                      {draft.equipment.length === 0 && <p className={styles.error}>Choose at least one item.</p>}
                      <label className={styles.toggle}>
                        <input type="checkbox" checked={draft.isStudent} onChange={(e) => update({ isStudent: e.target.checked })} />
                        I’m a student operator
                      </label>
                    </section>
                  )}

                  <section className={styles.card}>
                    <div className={styles.cardHead}>
                      <h2>{role === "client" ? "A few extras" : "Contact details"}</h2>
                      <p>All optional.</p>
                    </div>
                    {role === "client" && (
                      <label className={styles.label}>
                        Anything your shoveler should know?
                        <textarea className={styles.input} value={draft.specialInstructions} onChange={(e) => update({ specialInstructions: e.target.value })} placeholder="A gate, steps, or a spot to watch out for…" />
                      </label>
                    )}
                    {role === "client" && (
                      <div className={styles.label}>
                        Profile photo
                        <ProfilePhotoPicker value={draft.avatar} onChange={(avatar) => update({ avatar })} size={64} />
                      </div>
                    )}
                    <div className="grid gap-4 sm:grid-cols-2">
                      <label className={styles.label}>
                        Phone
                        <input className={styles.input} type="tel" autoComplete="tel" value={draft.phone} aria-invalid={!validPhone || undefined} onChange={(e) => update({ phone: e.target.value })} placeholder="(416) 555-0123" />
                      </label>
                      <label className={styles.label}>
                        Age
                        <input className={styles.input} inputMode="numeric" value={draft.age} aria-invalid={!validAge || undefined} onChange={(e) => update({ age: e.target.value })} />
                      </label>
                    </div>
                    {!validPhone && <p className={styles.error}>Enter a 10-digit phone number, or leave it blank.</p>}
                    {!validAge && <p className={styles.error}>Enter an age between 13 and 120, or leave it blank.</p>}
                  </section>

                  {role === "operator" && (
                    <p className={styles.note}>Your profile needs verification before you can accept jobs. Add your business name and bio from settings once your account is open.</p>
                  )}
                </>
              )}
            </fieldset>

            {error && <p role="alert" className={styles.alert}>{error}</p>}

            <div className={styles.actions}>
              {step > 1 && (
                <button type="button" aria-label="Previous step" disabled={saving} onClick={() => move(step - 1)} className={`dialog-btn ${styles.back}`} data-tone="neutral">
                  <ArrowLeft size={20} />
                </button>
              )}
              <button
                type="button"
                disabled={!canContinue || saving}
                onClick={() => (step < 3 ? move(step + 1) : void submit())}
                className={`dialog-btn ${styles.next} ${step === 3 ? "action-shine" : ""}`}
                data-tone="primary"
              >
                {saving ? "Getting things ready…" : step < 3 ? "Continue" : role === "client" ? "Find snow removal" : "Create my operator profile"}
                {!saving && <ArrowRight size={20} />}
              </button>
            </div>
          </div>
        </section>

        <aside className={`auth-aside ${styles.aside}`}>
          <div className="auth-aside-inner">
            <p className="auth-aside-kicker">Account setup</p>
            <h2 className="auth-aside-title">A few steps. A fresh start<span className="text-[var(--accent-sun)]">.</span></h2>
            <Image className={styles.asideArt} src="/landing/snowd-mascot-helper-cutout.png" alt="" width={220} height={220} />
            <ol className={styles.asideSteps}>
              {stepNames.map((name, i) => (
                <li key={name} data-state={i + 1 < step ? "done" : i + 1 === step ? "current" : "next"} aria-current={i + 1 === step ? "step" : undefined}>
                  <span className={styles.asideNum}>{i + 1 < step ? <Check size={14} strokeWidth={3} /> : `0${i + 1}`}</span>
                  {name}
                </li>
              ))}
            </ol>
          </div>
        </aside>
      </div>
    </main>
  );
}
