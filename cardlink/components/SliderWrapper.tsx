"use client";

import { useCallback, useRef, useState } from "react";

export default function SliderWrapper({
  count,
  children,
}: {
  count: number;
  children: React.ReactNode;
}) {
  const sliderRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const handleScroll = useCallback(() => {
    const el = sliderRef.current;
    if (!el) return;
    const idx = Math.round(el.scrollLeft / el.offsetWidth);
    setActiveIndex(Math.max(0, Math.min(idx, count - 1)));
  }, [count]);

  const scrollToSlide = useCallback(
    (index: number) => {
      const el = sliderRef.current;
      if (!el) return;
      const clamped = Math.max(0, Math.min(index, count - 1));
      el.scrollTo({ left: clamped * el.offsetWidth, behavior: "smooth" });
      setActiveIndex(clamped);
    },
    [count]
  );

  return (
    <>
      <div
        ref={sliderRef}
        onScroll={handleScroll}
        className="flex snap-x snap-mandatory gap-0 overflow-x-auto scroll-smooth scrollbar-hide"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {children}
      </div>
      {count > 1 && (
        <div className="mt-3 flex justify-center gap-1.5">
          {Array.from({ length: count }).map((_, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => scrollToSlide(idx)}
              className={`h-1.5 rounded-full transition-all ${
                idx === activeIndex
                  ? "w-4 bg-indigo-600"
                  : "w-1.5 bg-gray-300"
              }`}
              aria-label={`Go to slide ${idx + 1}`}
            />
          ))}
        </div>
      )}
    </>
  );
}
