"use client";

import { useEffect } from "react";

export function PageMotion() {
  useEffect(() => {
    document.documentElement.classList.remove("motion-ready");

    let frame = 0;
    const onScroll = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        const progress = Math.min(1, window.scrollY / Math.max(1, document.documentElement.scrollHeight - window.innerHeight));
        document.documentElement.style.setProperty("--scroll-progress", String(progress));
        frame = 0;
      });
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  return <div className="scroll-progress" aria-hidden="true" />;
}
