import React from "react";

interface InitialAvatarProps {
  name: string;
  size?: number;
}

export function InitialAvatar({ name, size = 80 }: InitialAvatarProps) {
  const initial = name.charAt(0).toUpperCase();
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: "linear-gradient(135deg, #FF9500, #E68600)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: size * 0.4,
        fontFamily: "Syne, system-ui",
        fontWeight: 700,
        color: "white",
      }}
    >
      {initial}
    </div>
  );
}
