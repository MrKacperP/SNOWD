"use client";

import { useEffect, useRef } from "react";
import styles from "./guided-step.module.css";

export default function GuidedStep({ step, labels, title, description, children }: {
  step: number; labels: string[]; title: string; description?: string; children: React.ReactNode;
}) {
  const heading = useRef<HTMLHeadingElement>(null);
  const previous = useRef(step);
  useEffect(() => {
    if (previous.current !== step) heading.current?.focus();
    previous.current = step;
  }, [step]);
  return <section className={styles.flow}>
    <ol className={styles.progress} aria-label="Your progress">
      {labels.map((label, index) => <li key={label} data-reached={index <= step} aria-current={index === step ? "step" : undefined}><span />{label}</li>)}
    </ol>
    <div key={step} className={styles.scene}>
      <p className={styles.eyebrow}>Step {step + 1} of {labels.length}</p>
      <h2 ref={heading} tabIndex={-1} className={styles.title}>{title}</h2>
      {description && <p className={styles.description}>{description}</p>}
      <div className={styles.content}>{children}</div>
    </div>
  </section>;
}
