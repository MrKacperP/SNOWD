import { notFound } from "next/navigation";

// Sample-data review pages for local design checks; never served in production.
export default function PropertyReviewLayout({ children }: { children: React.ReactNode }) {
  if (process.env.NODE_ENV === "production") notFound();
  return children;
}
