"use client";
import Modal from "@/components/ui/Modal";
import { Download } from "lucide-react";
import { useState } from "react";
import styles from "./photo-viewer.module.css";

/** A completion photo as a thumbnail; pressing it opens a larger view with a save button. */
export default function PhotoViewer({ src, title = "Completion photo", className, thumbClassName }: { src: string; title?: string; className?: string; thumbClassName?: string }) {
  const [open, setOpen] = useState(false);
  const save = () => {
    const link = document.createElement("a");
    link.href = src;
    link.download = `${title.toLowerCase().replaceAll(" ", "-")}.jpg`;
    document.body.append(link);
    link.click();
    link.remove();
  };
  return <>
    <button type="button" className={`${styles.thumb} ${className || ""}`} onClick={() => setOpen(true)} aria-label={`View ${title.toLowerCase()} larger`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={title} className={thumbClassName} />
    </button>
    <Modal isOpen={open} onClose={() => setOpen(false)} title={title} size="lg">
      <div className={styles.viewer}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={title} />
        <button type="button" className={styles.save} onClick={save}><Download size={18} aria-hidden="true" />Save photo</button>
      </div>
    </Modal>
  </>;
}
