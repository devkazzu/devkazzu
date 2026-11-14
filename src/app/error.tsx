"use client";
import Link from "next/link";
import { Icon } from "@/components/icons";
export default function ErrorBoundary({ reset }: { error: Error & { digest?: string }; reset: () => void }) { return <main id="main-content" className="not-found" style={{ minHeight: "85dvh" }}><Icon name="flower" size={45} color="#c59ad7"/><h1>A little pause in the story.</h1><p>Something unexpected happened. Your work is safe. Give the page another try in a moment.</p><button className="button primary" onClick={reset}>Try again<Icon name="refresh" size={16}/></button><Link href="/" className="text-link" style={{ marginTop: 20 }}>Back to the homepage<Icon name="right" size={14}/></Link></main>; }
