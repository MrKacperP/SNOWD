"use client";

import React from "react";
import { useAuth } from "@/context/AuthContext";
import ClientDashboard from "@/components/dashboard/ClientDashboard";
import OperatorDashboard from "@/components/dashboard/OperatorDashboard";

export default function DashboardPage() {
  const { profile } = useAuth();

  if (profile?.role === "operator") {
    return <OperatorDashboard />;
  }

  return <ClientDashboard />;
}
