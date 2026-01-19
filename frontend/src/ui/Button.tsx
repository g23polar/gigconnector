type Variant = "primary" | "secondary" | "ghost";

export default function Button(props: {
  children: React.ReactNode;
  onClick?: () => void;
  type?: "button" | "submit";
  disabled?: boolean;
  variant?: Variant;
  className?: string;
}) {
  const variant = props.variant ?? "secondary";
  const cls =
    variant === "primary"
      ? "btn btnPrimary"
      : variant === "ghost"
      ? "btn btnGhost"
      : "btn";

  return (
    <button
      type={props.type ?? "button"}
      className={`${cls}${props.className ? ` ${props.className}` : ""}`}
      onClick={props.onClick}
      disabled={props.disabled}
    >
      {props.children}
    </button>
  );
}
