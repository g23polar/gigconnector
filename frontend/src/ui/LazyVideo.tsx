import { useEffect, useState } from "react";

/**
 * Video element that defers loading until play and auto-generates
 * a poster thumbnail from the first frame.
 */
export default function LazyVideo({
  src,
  style,
  ...rest
}: React.VideoHTMLAttributes<HTMLVideoElement>) {
  const [poster, setPoster] = useState<string>();

  useEffect(() => {
    if (!src) return;
    let cancelled = false;
    const vid = document.createElement("video");
    vid.muted = true;
    vid.playsInline = true;
    vid.preload = "metadata";
    vid.src = src;

    vid.addEventListener(
      "loadeddata",
      () => {
        if (!cancelled) vid.currentTime = 0.1;
      },
      { once: true },
    );

    vid.addEventListener(
      "seeked",
      () => {
        if (cancelled) return;
        try {
          const c = document.createElement("canvas");
          c.width = vid.videoWidth || 320;
          c.height = vid.videoHeight || 180;
          const ctx = c.getContext("2d");
          if (ctx) {
            ctx.drawImage(vid, 0, 0, c.width, c.height);
            setPoster(c.toDataURL("image/jpeg", 0.5));
          }
        } catch {
          // Poster extraction failed — video still works without one.
        }
        vid.removeAttribute("src");
        vid.load();
      },
      { once: true },
    );

    return () => {
      cancelled = true;
      vid.removeAttribute("src");
      vid.load();
    };
  }, [src]);

  return <video preload="none" poster={poster} src={src} style={style} {...rest} />;
}
