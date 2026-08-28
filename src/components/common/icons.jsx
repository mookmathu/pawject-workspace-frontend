import React from "react";

/** Party mascot illustration for the right-hand panel. */
export function Mascot() {
  return (
    <svg width="180" height="200" viewBox="0 0 180 200" fill="none">
      {/* party hat */}
      <path d="M90 18 L112 62 L68 62 Z" fill="#5FC98D" stroke="#221D17" strokeWidth="3" strokeLinejoin="round" />
      <circle cx="90" cy="14" r="6" fill="#F4B740" stroke="#221D17" strokeWidth="2.5" />
      {/* head */}
      <circle cx="90" cy="92" r="46" fill="#FFFDF8" stroke="#221D17" strokeWidth="3.5" />
      {/* eyes */}
      <circle cx="74" cy="88" r="4.2" fill="#221D17" />
      <circle cx="106" cy="88" r="4.2" fill="#221D17" />
      {/* smile */}
      <path d="M72 104 Q90 118 108 104" stroke="#221D17" strokeWidth="3.5" fill="none" strokeLinecap="round" />
      {/* cheeks */}
      <circle cx="64" cy="100" r="6" fill="#FF6F91" opacity="0.55" />
      <circle cx="116" cy="100" r="6" fill="#FF6F91" opacity="0.55" />
      {/* body */}
      <path
        d="M46 190 C46 150 66 138 90 138 C114 138 134 150 134 190 Z"
        fill="#3E6BE0"
        stroke="#221D17"
        strokeWidth="3.5"
      />
      {/* arm + drink */}
      <path d="M130 158 L152 140" stroke="#221D17" strokeWidth="3.5" strokeLinecap="round" />
      <path d="M144 118 L160 140 L128 140 Z" fill="#F4B740" stroke="#221D17" strokeWidth="2.5" strokeLinejoin="round" />
      <path d="M148 132 Q152 122 146 116" stroke="#5FC98D" strokeWidth="2.5" fill="none" strokeLinecap="round" />
    </svg>
  );
}

export function ChatBubbleIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path d="M4 5h16v11H9l-4 4v-4H4V5z" stroke="#221D17" strokeWidth="2" strokeLinejoin="round" fill="#FF6F91" />
    </svg>
  );
}

export function LaptopIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <rect x="4" y="5" width="16" height="10" rx="1" stroke="#221D17" strokeWidth="2" fill="#3E6BE0" />
      <path d="M2 18h20" stroke="#221D17" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function LockIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <rect x="5" y="11" width="14" height="10" rx="2" stroke="#221D17" strokeWidth="2" fill="#F4B740" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" stroke="#221D17" strokeWidth="2" fill="none" />
    </svg>
  );
}

export function SparkleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <path
        d="M12 2 L14 10 L22 12 L14 14 L12 22 L10 14 L2 12 L10 10 Z"
        fill="#5FC98D"
        stroke="#221D17"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function GoogleIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24">
      <path
        fill="#4285F4"
        d="M23.5 12.3c0-.9-.1-1.6-.2-2.4H12v4.5h6.5c-.3 1.6-1.2 2.9-2.5 3.8v3.1h4C22.2 19.4 23.5 16.2 23.5 12.3z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.3 0 6-1.1 8-2.9l-4-3.1c-1.1.7-2.5 1.2-4 1.2-3.1 0-5.7-2.1-6.6-4.9H1.3v3.1C3.3 21.3 7.3 24 12 24z"
      />
      <path fill="#FBBC05" d="M5.4 14.3c-.2-.7-.4-1.5-.4-2.3s.1-1.6.4-2.3V6.6H1.3C.5 8.2 0 10 0 12s.5 3.8 1.3 5.4z" />
      <path
        fill="#EA4335"
        d="M12 4.8c1.8 0 3.4.6 4.6 1.8l3.5-3.5C18 1.2 15.3 0 12 0 7.3 0 3.3 2.7 1.3 6.6l4.1 3.1C6.3 6.9 8.9 4.8 12 4.8z"
      />
    </svg>
  );
}

export function GithubIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="#221D17">
      <path d="M12 .5C5.7.5.5 5.7.5 12c0 5 3.3 9.3 7.8 10.8.6.1.8-.3.8-.6v-2.2c-3.2.7-3.9-1.4-3.9-1.4-.5-1.3-1.3-1.7-1.3-1.7-1.1-.7.1-.7.1-.7 1.2.1 1.8 1.2 1.8 1.2 1 1.8 2.7 1.3 3.4 1 .1-.8.4-1.3.7-1.6-2.6-.3-5.3-1.3-5.3-5.7 0-1.3.5-2.3 1.2-3.1-.1-.3-.5-1.5.1-3.1 0 0 1-.3 3.3 1.2.9-.3 2-.4 3-.4s2.1.1 3 .4c2.3-1.5 3.3-1.2 3.3-1.2.6 1.6.2 2.8.1 3.1.8.8 1.2 1.9 1.2 3.1 0 4.4-2.7 5.4-5.3 5.7.4.4.8 1.1.8 2.2v3.3c0 .3.2.7.8.6C20.2 21.3 23.5 17 23.5 12 23.5 5.7 18.3.5 12 .5z" />
    </svg>
  );
}

export function FacebookIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="12" fill="#1877F2" />
      <path
        d="M15.1 12.6h-2v7.3h-3v-7.3H8.4v-2.6h1.7V8.3c0-1.6.9-3.1 3.4-3.1h2v2.5h-1.5c-.3 0-.7.2-.7.9v1.4h2.2l-.4 2.6z"
        fill="#fff"
      />
    </svg>
  );
}