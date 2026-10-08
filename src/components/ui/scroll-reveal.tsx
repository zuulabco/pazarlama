"use client";

import { useEffect, useRef, useState, type CSSProperties, type ElementType, type ReactNode } from "react";

/**
 * Kaydırdıkça beliren alan: görünür olunca bir kez yumuşakça yükselip belirir. `delay` (ms) art arda gelen öğelere kademe verir.
 * Alt öğeler `group-data-[in=true]/reveal:` ile aynı tetikleyiciye bağlanabilir (örn. büyüyen çubuklar).
 * Hareketi azaltma tercihi olan ya da JavaScript'i kapalı kullanıcılar içeriği animasyonsuz görür.
 */
export function ScrollReveal({ children, delay = 0, as, className = "", style }: { children: ReactNode; delay?: number; as?: ElementType; className?: string; style?: CSSProperties }) {
  const Tag = (as ?? "div") as ElementType;
  const ref = useRef<HTMLElement>(null);
  const [seen, setSeen] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      const t = setTimeout(() => setSeen(true), 0);
      return () => clearTimeout(t);
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setSeen(true);
          io.disconnect();
        }
      },
      { rootMargin: "0px 0px -12% 0px", threshold: 0.08 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <Tag
      ref={ref}
      data-reveal=""
      data-in={seen}
      style={{ transitionDelay: seen ? `${delay}ms` : undefined, ...style }}
      className={`group/reveal translate-y-7 opacity-0 transition-[opacity,transform] duration-700 ease-out data-[in=true]:translate-y-0 data-[in=true]:opacity-100 motion-reduce:translate-y-0 motion-reduce:opacity-100 motion-reduce:transition-none ${className}`}
    >
      {children}
    </Tag>
  );
}
