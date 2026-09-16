"use client";
import UserAvatar from "@/components/UserAvatar";
import { useAuth } from "@/context/AuthContext";
import { ClientProfile, OperatorProfile, UserProfile } from "@/lib/types";
export default function CompanyIdentity({ person, name }: { person?: UserProfile | ClientProfile | OperatorProfile; name: string }) {
  const { profile } = useAuth();
  const client = profile as ClientProfile | null;
  const favorite = person && (client?.savedOperators?.includes(person.uid) || client?.favoriteOperatorId === person.uid);
  const logoUrl = person?.role === "operator" ? (person as OperatorProfile).logoUrl : undefined;
  return <span className="inline-flex min-w-0 items-center gap-3"><UserAvatar photoURL={person?.avatar} logoURL={logoUrl} role={person?.role} displayName={name} /><span>{name}{favorite && <span className="ml-2 text-amber-600" aria-label="Favorite operator">★</span>}</span></span>;
}
