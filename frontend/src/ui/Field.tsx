export function Field(props: {
  label: string;
  hint?: string;
  children: React.ReactNode;
  error?: string | null;
}) {
  return (
    <div className="field">
      <label>{props.label}</label>
      {props.children}
      {props.hint && <div className="smallMuted">{props.hint}</div>}
      {props.error && <div className="error">{props.error}</div>}
    </div>
  );
}
