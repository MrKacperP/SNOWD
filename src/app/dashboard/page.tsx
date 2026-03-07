"use client";

import React from "react";
import { useAuth } from "@/context/AuthContext";
import ClientDashboard from "@/components/dashboard/ClientDashboard";
import OperatorDashboard from "@/components/dashboard/OperatorDashboard";
import SeniorClientDashboard from "@/components/dashboard/SeniorClientDashboard";
import { ClientProfile } from "@/lib/types";

export default function DashboardPage() {
  const { profile } = useAuth();
  const clientProfile = profile as ClientProfile | null;

  if (profile?.role === "operator") {
    return <OperatorDashboard />;
  }

  if (profile?.role === "client" && (clientProfile?.simplifiedMode || (clientProfile?.age ?? 0) >= 55)) {
    return <SeniorClientDashboard />;
  }

  return <ClientDashboard />;
}
