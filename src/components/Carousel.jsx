"use client";
// 간단 캐러셀: 자동/수동 슬라이드 전환
// English: lightweight carousel with autoplay + manual controls
import useEmblaCarousel from "embla-carousel-react";
import { useCallback, useEffect, useState } from "react";

export default function Carousel({ items = [], autoplay = 0 }) {
  const [emblaRef, embla] = useEmblaCarousel({ dragFree: false, loop: true, align: "start" });
  const [index, setIndex] = useState(0);

  const onSelect = useCallback(() => {
    if (!embla) return;
    setIndex(embla.selectedScrollSnap());
  }, [embla]);

  useEffect(() => {
    if (!embla) return;
    embla.on("select", onSelect);
    onSelect();
  }, [embla, onSelect]);

  useEffect(() => {
    if (!embla || !autoplay) return;
    const id = setInterval(() => {
      if (!embla) return;
      embla.scrollNext();
    }, autoplay);
    return () => clearInterval(id);
  }, [embla, autoplay]);

  return (
    <div className="embla">
      <div className="embla__viewport" ref={emblaRef}>
        <div className="embla__container flex">
          {items.map((node, i) => (
            <div key={i} className="embla__slide shrink-0 w-full px-2">
              {node}
            </div>
          ))}
        </div>
      </div>
      <div className="flex justify-center gap-2 mt-2">
        {items.map((_, i) => (
          <button
            key={i}
            aria-label={`go to slide ${i + 1}`}
            onClick={() => embla && embla.scrollTo(i)}
            className={`h-2.5 w-2.5 rounded-full transition ${index === i ? "bg-brand-600" : "bg-zinc-300 dark:bg-zinc-600"}`}
          />
        ))}
      </div>
    </div>
  );
}
