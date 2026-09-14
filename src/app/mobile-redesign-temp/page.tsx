import { notFound } from "next/navigation";

// Retired design preview: sample jobs must never appear as a working account.
export default function RetiredPreview() {
  notFound();
}
