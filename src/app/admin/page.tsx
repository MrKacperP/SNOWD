"use client";

import AdminOverview from "@/components/admin/AdminOverview";
import { useAdminData } from "@/components/admin/AdminProvider";

export default function AdminOverviewPage() {
  const data = useAdminData();
  return <AdminOverview data={data} />;
}
