import type { CSSProperties, ReactNode } from "react";

export function Card(props: { children: ReactNode; className?: string; style?: CSSProperties }) {
  return (
    <div className={`card${props.className ? ` ${props.className}` : ""}`} style={props.style}>
      {props.children}
    </div>
  );
}

export function Panel(props: { children: ReactNode; className?: string }) {
  return <div className={`panel panelPad${props.className ? ` ${props.className}` : ""}`}>{props.children}</div>;
}
