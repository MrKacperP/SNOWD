"use client";

import React from "react";
import Image from "next/image";

interface UserAvatarProps {
  photoURL?: string;
  role?: string;
  displayName?: string;
  /** Pixel dimension for width and height */
  size?: number;
  className?: string;
  /** Round shape (default true) */
  rounded?: "full" | "xl" | "2xl";
}

/**
 * Renders a user avatar.
 * - If the user has a photoURL, displays it.
 * - Clients without a photo → logo.png in black & white.
 * - Operators without a photo → StudentLogo.png in black & white.
 */
export default function UserAvatar({
  photoURL,
  role,
  displayName,
  size = 36,
  className = "",
  rounded = "full",
}: UserAvatarProps) {
  const roundedClass =
    rounded === "full" ? "rounded-full" : rounded === "2xl" ? "rounded-2xl" : "rounded-xl";

  if (photoURL) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={photoURL}
        alt={displayName || "User"}
        width={size}
        height={size}
        className={`object-cover ${roundedClass} ${className}`}
        style={{ width: size, height: size, minWidth: size }}
      />
    );
  }

  const isOperator = role === "operator";
  const defaultSrc = isOperator ? "/StudentLogo.png" : "/logo.png";

  return (
    <div
      className={`flex items-center justify-center bg-gray-100 ${roundedClass} overflow-hidden ${className}`}
      style={{ width: size, height: size, minWidth: size }}
    >
      <Image
        src={defaultSrc}
        alt={displayName || "User"}
        width={size}
        height={size}
        className="object-contain p-0.5"
        style={{ filter: "grayscale(100%)", opacity: 0.65 }}
      />
    </div>
  );
}
