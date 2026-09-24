"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

type GalleryImage = { id: number | string; url: string };

function Tile({
  src,
  alt,
  index,
  onSelect,
  className,
  showExtra,
  extra,
}: {
  src: string;
  alt: string;
  index: number;
  onSelect: (index: number) => void;
  className: string;
  showExtra?: boolean;
  extra: number;
}) {
  return (
    <button
      onClick={() => onSelect(index)}
      className={`group relative overflow-hidden ${className}`}
    >
      <Image
        src={src}
        alt={alt}
        fill
        sizes="(min-width: 640px) 50vw, 100vw"
        className="object-cover transition duration-300 group-hover:brightness-90"
      />
      {showExtra && extra > 0 && (
        <span className="absolute inset-0 flex items-center justify-center bg-black/45 text-sm font-semibold text-white">
          +{extra} photos
        </span>
      )}
    </button>
  );
}

export default function ImageGallery({
  images,
  alt,
  apiUrl,
}: {
  images: GalleryImage[];
  alt: string;
  apiUrl?: string;
}) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const src = (url: string) => `${apiUrl ?? ""}${url}`;

  useEffect(() => {
    if (lightboxIndex === null) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setLightboxIndex(null);
      if (e.key === "ArrowRight") setLightboxIndex((i) => (i === null ? i : (i + 1) % images.length));
      if (e.key === "ArrowLeft")
        setLightboxIndex((i) => (i === null ? i : (i - 1 + images.length) % images.length));
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightboxIndex, images.length]);

  if (images.length === 0) {
    return (
      <div className="flex h-64 w-full items-center justify-center rounded-2xl bg-sand-200 text-sm text-stone-400 sm:h-80">
        No photos yet
      </div>
    );
  }

  const main = images[0];
  const rest = images.slice(1, 5);
  const extra = images.length - 5;

  return (
    <>
      {/* Mobile: swipeable strip */}
      <div className="-mx-4 flex snap-x snap-mandatory gap-2 overflow-x-auto px-4 sm:hidden">
        {images.map((img, i) => (
          <button
            key={img.id}
            onClick={() => setLightboxIndex(i)}
            className="relative h-56 w-[85%] shrink-0 snap-start overflow-hidden rounded-xl"
          >
            <Image src={src(img.url)} alt={alt} fill sizes="85vw" className="object-cover" />
          </button>
        ))}
      </div>

      {/* Desktop: mosaic grid, shaped to however many photos exist */}
      <div className="hidden sm:block" style={{ height: 380 }}>
        {images.length === 1 && (
          <Tile src={src(main.url)} alt={alt} index={0} onSelect={setLightboxIndex} className="h-full rounded-2xl" extra={extra} />
        )}

        {images.length === 2 && (
          <div className="grid h-full grid-cols-2 gap-2">
            <Tile src={src(main.url)} alt={alt} index={0} onSelect={setLightboxIndex} className="rounded-l-2xl" extra={extra} />
            <Tile src={src(rest[0].url)} alt={alt} index={1} onSelect={setLightboxIndex} className="rounded-r-2xl" extra={extra} />
          </div>
        )}

        {images.length === 3 && (
          <div className="grid h-full grid-cols-2 grid-rows-2 gap-2">
            <Tile src={src(main.url)} alt={alt} index={0} onSelect={setLightboxIndex} className="col-span-1 row-span-2 rounded-l-2xl" extra={extra} />
            <Tile src={src(rest[0].url)} alt={alt} index={1} onSelect={setLightboxIndex} className="rounded-tr-2xl" extra={extra} />
            <Tile src={src(rest[1].url)} alt={alt} index={2} onSelect={setLightboxIndex} className="rounded-br-2xl" extra={extra} />
          </div>
        )}

        {images.length === 4 && (
          <div className="grid h-full grid-cols-3 grid-rows-2 gap-2">
            <Tile src={src(main.url)} alt={alt} index={0} onSelect={setLightboxIndex} className="col-span-2 row-span-2 rounded-l-2xl" extra={extra} />
            <Tile src={src(rest[0].url)} alt={alt} index={1} onSelect={setLightboxIndex} className="rounded-tr-2xl" extra={extra} />
            <Tile src={src(rest[1].url)} alt={alt} index={2} onSelect={setLightboxIndex} className="rounded-br-2xl" extra={extra} />
          </div>
        )}

        {images.length >= 5 && (
          <div className="grid h-full grid-cols-4 grid-rows-2 gap-2">
            <Tile src={src(main.url)} alt={alt} index={0} onSelect={setLightboxIndex} className="col-span-2 row-span-2 rounded-l-2xl" extra={extra} />
            <Tile src={src(rest[0].url)} alt={alt} index={1} onSelect={setLightboxIndex} className="" extra={extra} />
            <Tile src={src(rest[1].url)} alt={alt} index={2} onSelect={setLightboxIndex} className="rounded-tr-2xl" extra={extra} />
            <Tile src={src(rest[2].url)} alt={alt} index={3} onSelect={setLightboxIndex} className="" extra={extra} />
            <Tile src={src(rest[3].url)} alt={alt} index={4} onSelect={setLightboxIndex} className="rounded-br-2xl" showExtra extra={extra} />
          </div>
        )}
      </div>

      {images.length > 1 && (
        <button
          onClick={() => setLightboxIndex(0)}
          className="mt-3 hidden rounded-full border border-stone-300 bg-surface px-4 py-2 text-xs font-semibold text-stone-700 shadow-sm hover:bg-sand-50 sm:inline-block"
        >
          Show all {images.length} photos
        </button>
      )}

      {lightboxIndex !== null && (
        <div className="fixed inset-0 z-[100] flex flex-col bg-black/95">
          <div className="flex items-center justify-between px-4 py-3 text-white sm:px-6">
            <span className="text-sm">
              {lightboxIndex + 1} / {images.length}
            </span>
            <button
              onClick={() => setLightboxIndex(null)}
              className="flex h-9 w-9 items-center justify-center rounded-full text-xl hover:bg-white/10"
              aria-label="Close"
            >
              ✕
            </button>
          </div>

          <div className="relative flex flex-1 items-center justify-center px-2 pb-6">
            {images.length > 1 && (
              <button
                onClick={() => setLightboxIndex((i) => (i === null ? i : (i - 1 + images.length) % images.length))}
                className="absolute left-2 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-xl text-white hover:bg-white/20 sm:left-6"
                aria-label="Previous photo"
              >
                ‹
              </button>
            )}
            <Image
              src={src(images[lightboxIndex].url)}
              alt={alt}
              fill
              sizes="100vw"
              className="rounded-lg object-contain"
            />
            {images.length > 1 && (
              <button
                onClick={() => setLightboxIndex((i) => (i === null ? i : (i + 1) % images.length))}
                className="absolute right-2 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-xl text-white hover:bg-white/20 sm:right-6"
                aria-label="Next photo"
              >
                ›
              </button>
            )}
          </div>
        </div>
      )}
    </>
  );
}
