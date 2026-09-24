"use client";

import { useState } from "react";
import { Photo } from "../ui";

/** Tap-through photo strip for result cards (arrows on hover, dots always). */
export default function ImageCarousel({ images, alt }: { images: string[]; alt: string }) {
  const [index, setIndex] = useState(0);
  const count = images.length;

  function go(e: React.MouseEvent, delta: number) {
    e.preventDefault();
    e.stopPropagation();
    setIndex((i) => (i + delta + count) % count);
  }

  return (
    <div className="group/carousel relative h-full w-full overflow-hidden bg-sand-100">
      <Photo src={images[index]} alt={alt} sizes="(min-width: 768px) 300px, 100vw" />
      {count > 1 && (
        <>
          <button
            type="button"
            onClick={(e) => go(e, -1)}
            aria-label="Previous photo"
            className="absolute left-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-surface/90 text-slate-700 opacity-0 shadow transition group-hover/carousel:opacity-100"
          >
            ‹
          </button>
          <button
            type="button"
            onClick={(e) => go(e, 1)}
            aria-label="Next photo"
            className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-surface/90 text-slate-700 opacity-0 shadow transition group-hover/carousel:opacity-100"
          >
            ›
          </button>
          <div className="absolute inset-x-0 bottom-2 flex justify-center gap-1">
            {images.map((_, i) => (
              <span key={i} className={`h-1.5 rounded-full transition-all ${i === index ? "w-4 bg-white" : "w-1.5 bg-white/60"}`} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
