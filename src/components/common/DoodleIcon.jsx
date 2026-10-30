import React from "react";
import person from "../../assets/task-icons/person.png";
import tag from "../../assets/task-icons/tag.png";
import note from "../../assets/task-icons/note.png";
import search from "../../assets/task-icons/search.png";
import palette from "../../assets/task-icons/palette.png";
import camera from "../../assets/task-icons/camera.png";
import pencil from "../../assets/task-icons/pencil.png";
import clipboard from "../../assets/task-icons/clipboard.png";
import chat from "../../assets/task-icons/chat.png";
import crown from "../../assets/task-icons/crown.png";
import calendar from "../../assets/task-icons/calendar.png";
import flame from "../../assets/task-icons/flame.png";
import trophy from "../../assets/task-icons/trophy.png";
import school from "../../assets/task-icons/school.png";
import envelope from "../../assets/task-icons/envelope.png";
import key from "../../assets/task-icons/key.png";

const ICONS = { person, tag, note, search, palette, camera, pencil, clipboard, chat, crown, calendar, flame, trophy, school, envelope, key };

/** Small hand-drawn icon that sits inline with text (replaces emoji / line icons). */
export default function DoodleIcon({ name, size = 18, style }) {
  return (
    <img
      className="doodle-ico"
      src={ICONS[name]}
      alt=""
      aria-hidden="true"
      draggable={false}
      width={size}
      height={size}
      style={{ display: "inline-block", verticalAlign: "-0.25em", flexShrink: 0, objectFit: "contain", ...style }}
    />
  );
}
