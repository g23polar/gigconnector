import { useState } from "react";
import type { FormEvent } from "react";
import emailjs from "@emailjs/browser";
import { Panel } from "../ui/Card";
import { Field } from "../ui/Field";
import Button from "../ui/Button";

const EMAILJS_SERVICE_ID = import.meta.env.VITE_EMAILJS_SERVICE_ID as string | undefined;
const EMAILJS_TEMPLATE_ID = import.meta.env.VITE_EMAILJS_TEMPLATE_ID as string | undefined;
const EMAILJS_PUBLIC_KEY = import.meta.env.VITE_EMAILJS_PUBLIC_KEY as string | undefined;

export default function Contact() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErr(null);
    setOk(null);

    if (!name.trim() || !email.trim() || !message.trim()) {
      setErr("Name, email, and message are required.");
      return;
    }

    if (!EMAILJS_SERVICE_ID || !EMAILJS_TEMPLATE_ID || !EMAILJS_PUBLIC_KEY) {
      setErr("Email service is not configured. Please try again later.");
      return;
    }

    setSending(true);
    try {
      const trimmedMessage = message.trim();
      const messageWithEmail = `${trimmedMessage}\n\nReply-to: ${email.trim()}`;
      await emailjs.send(
        EMAILJS_SERVICE_ID,
        EMAILJS_TEMPLATE_ID,
        {
          name: name.trim(),
          message: messageWithEmail,
        },
        {
          publicKey: EMAILJS_PUBLIC_KEY,
        }
      );
      setOk("Message sent. We'll get back to you soon.");
      setName("");
      setEmail("");
      setMessage("");
    } catch (error: any) {
      setErr(error?.text ?? "Failed to send message. Please try again.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="container" style={{ maxWidth: 980 }}>
      <Panel>
        <div className="sectionTitle">Contact Us</div>
        <p className="sectionDesc">
          Questions, feedback, or partnership ideas? We would love to hear from you.
        </p>
        <form onSubmit={onSubmit} className="card" style={{ display: "grid", gap: 12 }}>
          {err && <div className="error">{err}</div>}
          {ok && <div className="ok">{ok}</div>}

          <div className="grid2">
            <Field label="Name">
              <input
                className="input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                required
              />
            </Field>
            <Field label="Email">
              <input
                className="input"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@email.com"
                required
              />
            </Field>
          </div>

          <Field label="Message">
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Write your message..."
              required
            />
          </Field>

          <div className="btnRow">
            <Button type="submit" variant="primary" disabled={sending}>
              {sending ? "Sending..." : "Send message"}
            </Button>
            <span className="smallMuted">
              We typically reply within 1–2 business days.
            </span>
          </div>
        </form>
      </Panel>
    </div>
  );
}
