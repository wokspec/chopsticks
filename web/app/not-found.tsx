import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: '404 — Not Found',
  robots: { index: false, follow: false },
};

export default function NotFound() {
  return (
    <section style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4rem 1.5rem' }}>
      <div style={{ textAlign: 'center', maxWidth: 480 }}>
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--text-faint)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '1rem' }}>
          404 · Page not found
        </p>
        <h1 style={{ fontSize: 'clamp(1.75rem, 5vw, 2.5rem)', fontWeight: 700, letterSpacing: '-0.04em', color: 'var(--text)', fontFamily: 'var(--font-heading)', marginBottom: '1rem' }}>
          Nothing here.
        </h1>
        <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', lineHeight: 1.7, marginBottom: '2rem' }}>
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link href="/" className="btn btn-primary" style={{ padding: '0.75rem 1.5rem', fontSize: '0.875rem' }}>
            Back to home
          </Link>
          <Link href="/commands" className="btn btn-ghost" style={{ padding: '0.75rem 1.5rem', fontSize: '0.875rem' }}>
            Browse commands
          </Link>
        </div>
      </div>
    </section>
  );
}
