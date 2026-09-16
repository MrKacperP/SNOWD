import type { UserRole } from "@/lib/types";
import { Briefcase, ClipboardList, Home, MessageSquare, Shovel } from "lucide-react";

export const primaryNavigation = (role?: UserRole) => role === "operator"
  ? [
      { href: "/dashboard", label: "Home", icon: Home, tour: "nav-home" },
      { href: "/dashboard/jobs", label: "Jobs", icon: ClipboardList, tour: "nav-jobs" },
      { href: "/dashboard/messages", label: "Messages", icon: MessageSquare, tour: "nav-messages" },
      { href: "/dashboard/transactions", label: "Payments", icon: Briefcase },
    ]
  : [
      { href: "/dashboard", label: "Home", icon: Home, tour: "nav-home" },
      { href: "/dashboard/find", label: "Book help", icon: Shovel },
      { href: "/dashboard/jobs", label: "Jobs", icon: ClipboardList, tour: "nav-jobs" },
      { href: "/dashboard/messages", label: "Messages", icon: MessageSquare, tour: "nav-messages" },
    ];

