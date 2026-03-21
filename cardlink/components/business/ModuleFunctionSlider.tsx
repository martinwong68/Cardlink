"use client";

import { useCallback, useRef, useState, useEffect, useMemo } from "react";

import ModuleFunctionTile from "@/components/business/ModuleFunctionTile";
import type { ModuleFunctionDefinition } from "@/src/lib/module-functions";

/**
 * ModuleFunctionSlider — horizontal scroll-snap slider of function tiles.
 *
 * - Mobile: 2-column grid per snap page (2 tiles visible)
 * - Tablet/Desktop (md+): 4-column grid per snap page (4 tiles visible)
 *
 * Includes lightweight dot indicators for page navigation.
 */
export default function ModuleFunctionSlider({
  items,
  activeId,
  onSelect,
}: {
  items: ModuleFunctionDefinition[];
  activeId: string | null;
  onSelect: (id: string) => void;
}) {
  const sliderRef = useRef<HTMLDivElement>(null);
  const [activePageIndex, setActivePageIndex] = useState(0);
  const [tilesPerPage, setTilesPerPage] = useState(2);

  // Responsive tiles per page: 2 on mobile, 4 on md+
  useEffect(() => {
    const mql = window.matchMedia("(min-width: 768px)");
    const update = () => setTilesPerPage(mql.matches ? 4 : 2);
    update();
    mql.addEventListener("change", update);
    return () => mql.removeEventListener("change", update);
  }, []);

  const pageCount = useMemo(
    () => Math.max(1, Math.ceil(items.length / tilesPerPage)),
    [items.length, tilesPerPage],
  );

  const handleScroll = useCallback(() => {
    const el = sliderRef.current;
    if (!el) return;
    const idx = Math.round(el.scrollLeft / el.offsetWidth);
    setActivePageIndex(Math.max(0, Math.min(idx, pageCount - 1)));
  }, [pageCount]);

  const scrollToPage = useCallback(
    (index: number) => {
      const el = sliderRef.current;
      if (!el) return;
      const clamped = Math.max(0, Math.min(index, pageCount - 1));
      el.scrollTo({ left: clamped * el.offsetWidth, behavior: "smooth" });
      setActivePageIndex(clamped);
    },
    [pageCount],
  );

  // Group items into pages
  const pages = useMemo(() => {
    const result: ModuleFunctionDefinition[][] = [];
    for (let i = 0; i < items.length; i += tilesPerPage) {
      result.push(items.slice(i, i + tilesPerPage));
    }
    return result;
  }, [items, tilesPerPage]);

  return (
    <div className="overflow-hidden">
      {/* Slider container — each child page is 100% width via min-w-0 + w-full */}
      <div
        ref={sliderRef}
        onScroll={handleScroll}
        className="flex snap-x snap-mandatory overflow-x-auto scroll-smooth scrollbar-hide"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {pages.map((page, pageIdx) => (
          <div
            key={pageIdx}
            className="grid snap-center gap-3 px-0.5 grid-cols-2 md:grid-cols-4"
            style={{ minWidth: "100%", width: "100%", flexShrink: 0 }}
          >
            {page.map((item) => (
              <ModuleFunctionTile
                key={item.id}
                title={item.title}
                description={item.description}
                icon={item.icon}
                color={item.color}
                badge={item.badgeText}
                active={activeId === item.id}
                onClick={() => onSelect(item.id)}
              />
            ))}
          </div>
        ))}
      </div>

      {/* Dot indicators */}
      {pageCount > 1 && (
        <div className="mt-3 flex justify-center gap-1.5">
          {Array.from({ length: pageCount }).map((_, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => scrollToPage(idx)}
              className={`h-1.5 rounded-full transition-all ${
                idx === activePageIndex
                  ? "w-4 bg-indigo-600"
                  : "w-1.5 bg-gray-300"
              }`}
              aria-label={`Go to page ${idx + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
