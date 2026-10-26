import React, { useEffect, useState } from "react";
import { resolveAvatarUrl } from "../../lib/api";

// One avatar for the whole app: shows the person's profile picture when they
// have one and the initial-letter circle otherwise (also if the image fails
// to load). `style` is the caller's existing circle style, so every spot keeps
// its own size/border and only the contents change.
export function initialOf(name) {
  return (name || "?").trim().charAt(0).toUpperCase() || "?";
}

export default function UserAvatar({ avatarUrl, name, style, title, className }) {
  const src = resolveAvatarUrl(avatarUrl);
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [src]);

  if (src && !failed) {
    return (
      <img
        src={src}
        alt=""
        title={title}
        className={className}
        onError={() => setFailed(true)}
        style={{ ...style, objectFit: "cover", display: "block", padding: 0 }}
      />
    );
  }
  return (
    <span style={style} title={title} className={className}>
      {initialOf(name)}
    </span>
  );
}
