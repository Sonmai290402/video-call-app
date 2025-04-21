"use client";

import { ReactNode } from "react";

interface CallButtonProps {
  onClick: () => void;
  color: "green" | "red" | "blue" | "gray";
  children: ReactNode;
  disabled?: boolean;
}

export default function CallButton({
  onClick,
  color,
  children,
  disabled = false,
}: CallButtonProps) {
  const colorStyles = {
    green: "bg-green-600 hover:bg-green-700",
    red: "bg-red-600 hover:bg-red-700",
    blue: "bg-blue-600 hover:bg-blue-700",
    gray: "bg-gray-600 hover:bg-gray-700",
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`rounded-full p-4 text-white shadow-md transition-colors ${colorStyles[color]} disabled:cursor-not-allowed disabled:opacity-50`}
    >
      {children}
    </button>
  );
}
