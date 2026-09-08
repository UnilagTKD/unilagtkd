"use client";

import { useEffect, useState } from "react";

const NEAR_TOP_THRESHOLD = 200;

/** Single floating button: scrolls down from near the top, flips to scroll
    back up once the page has moved past that point. */
export function ScrollNavButtons() {
  const [nearTop, setNearTop] = useState(true);

  useEffect(() => {
    function onScroll() {
      setNearTop(window.scrollY < NEAR_TOP_THRESHOLD);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="fixed bottom-4 right-4 z-40 sm:hidden print:hidden">
      <button
        type="button"
        aria-label={nearTop ? "Scroll to bottom" : "Scroll to top"}
        onClick={() =>
          window.scrollTo({
            top: nearTop ? document.body.scrollHeight : 0,
            behavior: "smooth",
          })
        }
        className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-black/80 text-white shadow-lg backdrop-blur hover:bg-brand-black"
      >
        {nearTop ? <>&#8595;</> : <>&#8593;</>}
      </button>
    </div>
  );
}
