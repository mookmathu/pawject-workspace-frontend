import React from "react";
import editPng from "../../assets/icons/edit.png";

// The pencil-and-notepad icon used for every "edit" button.
export default function EditIcon({ size = 18, style }) {
  return (
    <img
      src={editPng}
      alt=""
      aria-hidden="true"
      width={size}
      height={size}
      style={{ verticalAlign: "-0.2em", marginRight: 6, ...style }}
    />
  );
}
