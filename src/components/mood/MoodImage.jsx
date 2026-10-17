import React, { useEffect, useState } from "react";
import { fetchMoodImageUrl } from "../../lib/api";

// Loads a private meme through an authenticated fetch. `version` forces a
// reload after the entry is edited.
export default function MoodImage({ day, version, style, alt = "" }) {
  const [src, setSrc] = useState(null);

  useEffect(() => {
    let alive = true;
    let url = null;
    setSrc(null);
    fetchMoodImageUrl(day)
      .then((u) => {
        url = u;
        if (alive) setSrc(u);
        else URL.revokeObjectURL(u);
      })
      .catch(() => {});
    return () => {
      alive = false;
      if (url) URL.revokeObjectURL(url);
    };
  }, [day, version]);

  if (!src) return <div style={{ ...style, background: "color-mix(in srgb, var(--ink) 8%, var(--bg-surface))" }} />;
  return <img src={src} alt={alt} style={style} />;
}
