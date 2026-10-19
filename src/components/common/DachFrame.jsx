import React from "react";
import head from "../../assets/doggo/dachshund-head.png";
import body from "../../assets/doggo/dachshund-body.png";
import tail from "../../assets/doggo/dachshund-tail.png";

/**
 * The long pup as a frame strip: head and tail keep their proportions, only the
 * plain middle of the body stretches, so it can span any width without the
 * drawing breaking. Children sit inside the (hollow) body.
 * Source art is 560x184 (head 0-190, body 190-420, tail 420-560).
 */
const CSS = `
.dachf{display:flex;align-items:flex-end;width:100%;pointer-events:none}
.dachf>*{flex:none;display:block;height:var(--dh)}
.dachf-head{width:calc(var(--dh) * 190 / 184)}
.dachf-tail{width:calc(var(--dh) * 140 / 184)}
.dachf-body{flex:1 1 auto;position:relative;display:flex;align-items:center;padding:calc(var(--dh) * .12) 4px 0;box-sizing:border-box;min-width:0;
  background:url(${body}) 0 0/100% 100% no-repeat;pointer-events:auto}
.dachf-head img,.dachf-tail img{width:100%;height:100%;display:block}
:root[data-theme="dark"] .dachf-head,:root[data-theme="dark"] .dachf-body,:root[data-theme="dark"] .dachf-tail{filter:drop-shadow(0 0 1px rgba(255,255,255,.95)) drop-shadow(0 0 1px rgba(255,255,255,.6))}
`;

export default function DachFrame({ height = 68, children, style }) {
  return (
    <>
      <style>{CSS}</style>
      <div className="dachf" style={{ "--dh": `${height}px`, ...style }}>
      <span className="dachf-head"><img src={head} alt="" draggable={false} /></span>
      <div className="dachf-body">{children}</div>
      <span className="dachf-tail"><img src={tail} alt="" draggable={false} /></span>
      </div>
    </>
  );
}
