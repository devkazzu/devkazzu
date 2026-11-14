"use client";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { BrandMark } from "./icons";
export function NavigationLoader() {
  const pathname = usePathname(); const [pending, setPending] = useState(false); const delay = useRef<ReturnType<typeof setTimeout> | undefined>(undefined); const expiry = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => { clearTimeout(delay.current); clearTimeout(expiry.current); setPending(false); }, [pathname]);
  useEffect(() => {
    function onClick(event: MouseEvent) {
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const element = event.target instanceof Element ? event.target : null; const anchor = element?.closest<HTMLAnchorElement>("a[href]");
      if (!anchor || anchor.download || anchor.target && anchor.target !== "_self") return;
      const url = new URL(anchor.href, location.href);
      if (url.origin !== location.origin || url.pathname === location.pathname) return;
      clearTimeout(delay.current); clearTimeout(expiry.current);
      delay.current = setTimeout(() => setPending(true), 180); expiry.current = setTimeout(() => setPending(false), 8000);
    }
    document.addEventListener("click", onClick, true);
    return () => { document.removeEventListener("click", onClick, true); clearTimeout(delay.current); clearTimeout(expiry.current); };
  }, []);
  if (!pending) return null;
  return <div className="navigation-loading" role="status" aria-label="Loading your next page"><div className="loading-page"><span className="brand"><BrandMark/><span>DEVKAZZU</span></span><span>A LITTLE MAGIC IN THE MAKING…</span><div className="skeleton" style={{ width: 100, height: 2 }}/></div></div>;
}
