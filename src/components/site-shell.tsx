"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { BrandMark, Icon } from "./icons";
import type { SiteSettings, Social } from "@/lib/types";
const links = [["Home", "/"], ["Projects", "/projects"], ["Applications", "/applications"], ["Tools", "/tools"], ["Experiments", "/experiments"], ["About", "/about"]];
export function Brand({ settings }: { settings: SiteSettings }) { return <Link href="/" className="brand" aria-label={`${settings.siteName} home`}>{settings.logo ? <img src={settings.logo} width={32} height={36} alt="" /> : <BrandMark />}<span>{settings.siteName}<small>DEVELOPER RAJU</small></span></Link>; }
export function SiteShell({ settings, socials, children }: { settings: SiteSettings; socials: Social[]; children: ReactNode }) {
  const path = usePathname(); const [open, setOpen] = useState(false);
  useEffect(() => { setOpen(false); }, [path]);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || !("IntersectionObserver" in window)) return;
    const targets = Array.from(document.querySelectorAll<HTMLElement>(".section-heading, .about-bento, .contact-banner"));
    const observer = new IntersectionObserver((items) => { items.forEach((item) => { if (item.isIntersecting) { item.target.classList.add("is-revealed"); observer.unobserve(item.target); } }); }, { threshold: .08, rootMargin: "0px 0px -20px 0px" });
    targets.forEach((target) => { if (target.getBoundingClientRect().top > window.innerHeight) { target.classList.add("reveal-coming"); observer.observe(target); } });
    return () => { observer.disconnect(); targets.forEach((target) => target.classList.remove("reveal-coming", "is-revealed")); };
  }, [path]);
  useEffect(() => { if (!open) return; const escape = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false); }; window.addEventListener("keydown", escape); return () => window.removeEventListener("keydown", escape); }, [open]);
  return <div className="site-root" style={{ "--primary": settings.primaryColor, "--accent": settings.accentColor } as CSSProperties}>
    <header className="site-header"><div className="container header-inner"><Brand settings={settings} /><nav className="desktop-nav" aria-label="Main navigation">{links.map(([label, href]) => <Link key={href} href={href} className={path === href || (href !== "/" && path.startsWith(href)) ? "active" : ""}>{label}{href === "/" && <span className="nav-dot" />}</Link>)}</nav><div className="header-right"><Link className="header-contact" href="/contact">Let’s talk <Icon name="arrow" size={15} /></Link><button className="mobile-menu icon-button" aria-label={open ? "Close menu" : "Open menu"} aria-expanded={open} aria-controls="mobile-navigation" onClick={() => setOpen(!open)}><Icon name={open ? "close" : "menu"} size={23} /></button></div></div>
    {open && <nav id="mobile-navigation" className="mobile-nav" aria-label="Mobile navigation">{[...links, ["Skills & Technologies", "/skills"], ["Contact", "/contact"]].map(([label, href]) => <Link key={href} href={href} className={path === href ? "active" : ""} onClick={() => setOpen(false)}>{label}<Icon name="arrow" size={17}/></Link>)}</nav>}</header>
    {children}
    <footer className="site-footer"><div className="container"><div className="footer-top"><div><Brand settings={settings}/><p>{settings.footer}</p></div><div className="footer-links"><Link href="/projects">Projects</Link><Link href="/about">About me</Link><Link href="/skills">My stack</Link><Link href="/contact">Get in touch <Icon name="arrow" size={13}/></Link></div></div><div className="footer-bottom"><span>© {new Date().getFullYear()} {settings.siteName}. Designed & developed by <strong>{settings.developerName}.</strong></span><span className="footer-made"><span className="status-dot"/> Always learning. Always building.</span><Link href="/admin" className="owner-link" aria-label="Owner dashboard"><Icon name="lock" size={13}/></Link></div></div></footer>
  </div>;
}
export function Sakura({ count = 12, className = "" }: { count?: number; className?: string }) { return <div className={`sakura-particles ${className}`} aria-hidden="true">{Array.from({ length: count }, (_, i) => <i key={i} style={{ left: `${18 + ((i * 37) % 82)}%`, top: `${(i * 19) % 90}%`, animationDelay: `${-i * 1.7}s`, animationDuration: `${13 + (i % 5) * 3}s`, width: `${5 + (i % 4) * 2}px`, height: `${3 + (i % 3) * 2}px`, opacity: .15 + (i % 4) * .1 }}/> )}</div>; }
export function SocialLinks({ socials, label = true }: { socials: Social[]; label?: boolean }) { return <div className="social-links">{label && <span>Find me on</span>}{socials.map((social) => <a key={social.id} href={social.url} target={social.url.startsWith("mailto:") ? undefined : "_blank"} rel="noopener noreferrer" aria-label={social.label} title={social.label}><Icon name={social.icon} size={17}/></a>)}<i className="social-divider"/><span className="social-location"><Icon name="globe" size={13}/> Creating for the world</span></div>; }
