export function Card(props: { children: React.ReactNode; className?: string }) {
  return <div className={`card${props.className ? ` ${props.className}` : ""}`}>{props.children}</div>;
}

export function Panel(props: { children: React.ReactNode; className?: string }) {
  return <div className={`panel panelPad${props.className ? ` ${props.className}` : ""}`}>{props.children}</div>;
}
