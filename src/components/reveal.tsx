"use client";

import { useEffect, useRef, type ReactNode } from "react";

const pending = new Map<Element, number>();
let observer: IntersectionObserver | undefined;
function revealObserver() {
  return observer ??= new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      const delay = pending.get(entry.target) ?? 0;
      pending.delete(entry.target);
      observer?.unobserve(entry.target);
      if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        entry.target.animate([
          { opacity: 0, transform: "translateY(16px)" },
          { opacity: 1, transform: "translateY(0)" },
        ], { duration: 450, delay, easing: "ease-out", fill: "backwards" });
      }
    }
  }, { threshold: 0.05 });
}

export function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node || !("IntersectionObserver" in window) || !("animate" in node) || window.matchMedia("(prefers-reduced-motion: reduce)").matches || node.getBoundingClientRect().top < window.innerHeight) return;
    pending.set(node, delay);
    const shared = revealObserver();
    shared.observe(node);
    return () => { shared.unobserve(node); pending.delete(node); };
  }, [delay]);

  return (
    <div
      ref={ref}
      className={className}
    >
      {children}
    </div>
  );
}
