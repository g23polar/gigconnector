import { useEffect, useRef, useState } from "react";

declare global {
  interface Window {
    google?: any;
  }
}

const GOOGLE_SCRIPT_ATTR = "data-google-identity";
let googleIdentityPromise: Promise<void> | null = null;

const loadGoogleIdentity = () => {
  if (window.google?.accounts?.id) return Promise.resolve();
  if (googleIdentityPromise) return googleIdentityPromise;

  googleIdentityPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[${GOOGLE_SCRIPT_ATTR}]`);
    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("Failed to load Google Identity.")), {
        once: true,
      });
      return;
    }

    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.setAttribute(GOOGLE_SCRIPT_ATTR, "true");
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Google Identity."));
    document.head.appendChild(script);
  });

  return googleIdentityPromise;
};

export default function GoogleAuthButton(props: {
  onCredential: (token: string) => void;
  onError?: (message: string) => void;
  text?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;
    if (!clientId) {
      props.onError?.("Google login is not configured.");
      return;
    }
    let active = true;

    loadGoogleIdentity()
      .then(() => {
        if (!active) return;
        setReady(true);
      })
      .catch((err: any) => {
        if (!active) return;
        props.onError?.(err?.message ?? "Failed to load Google login.");
      });

    return () => {
      active = false;
    };
  }, [props.onError]);

  useEffect(() => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;
    if (!ready || !clientId || !ref.current || !window.google?.accounts?.id) return;

    window.google.accounts.id.initialize({
      client_id: clientId,
      callback: (resp: { credential?: string }) => {
        if (!resp?.credential) {
          props.onError?.("Google login failed. Please try again.");
          return;
        }
        props.onCredential(resp.credential);
      },
    });

    ref.current.innerHTML = "";
    window.google.accounts.id.renderButton(ref.current, {
      theme: "outline",
      size: "large",
      text: props.text ?? "continue_with",
      width: 320,
    });
  }, [ready, props.onCredential, props.onError, props.text]);

  return <div className="googleAuthButton" ref={ref} />;
}
