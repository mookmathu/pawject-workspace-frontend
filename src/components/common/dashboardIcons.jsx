import React from "react";

const common = {
  stroke: "#221D17",
  strokeWidth: 2.2,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  fill: "none",
};

export function AddWorkspaceIcon(props) {
  return (
    <svg viewBox="0 0 40 40" width="26" height="26" {...props}>
      <rect x="6" y="8" width="28" height="24" rx="4" {...common} />
      <line x1="20" y1="15" x2="20" y2="25" {...common} />
      <line x1="15" y1="20" x2="25" y2="20" {...common} />
    </svg>
  );
}

export function InviteIcon(props) {
  return (
    <svg viewBox="0 0 40 40" width="26" height="26" {...props}>
      <circle cx="15" cy="15" r="6" {...common} />
      <path d="M5 33c0-7 6-11 10-11s10 4 10 11" {...common} />
      <path d="M28 12h8M32 8v8" {...common} />
    </svg>
  );
}

export function CompassIcon(props) {
  return (
    <svg viewBox="0 0 40 40" width="26" height="26" {...props}>
      <circle cx="20" cy="20" r="14" {...common} />
      <path d="M25 14 L18 18 L15 26 L22 22 Z" {...common} strokeLinejoin="round" />
    </svg>
  );
}

export function BoxOpenIcon(props) {
  return (
    <svg viewBox="0 0 40 40" width="30" height="30" {...props}>
      <path d="M6 16 L20 9 L34 16 L20 23 Z" {...common} />
      <path d="M6 16 V29 L20 36 V23" {...common} />
      <path d="M34 16 V29 L20 36" {...common} />
    </svg>
  );
}

export function GearIcon(props) {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" {...props}>
      <circle cx="12" cy="12" r="3.2" {...common} />
      <path
        d="M12 3.5v2.2M12 18.3v2.2M20.5 12h-2.2M5.7 12H3.5M17.8 6.2l-1.5 1.5M7.7 16.3l-1.5 1.5M17.8 17.8l-1.5-1.5M7.7 7.7 6.2 6.2"
        {...common}
      />
    </svg>
  );
}

export function BellIcon(props) {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" {...props}>
      <path d="M6 10a6 6 0 1 1 12 0c0 4.5 1.5 6 1.5 6h-15S6 14.5 6 10Z" {...common} strokeLinejoin="round" />
      <path d="M10 19a2 2 0 0 0 4 0" {...common} />
    </svg>
  );
}
