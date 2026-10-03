import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="not-found">
      <h1>Let&apos;s find your way</h1>
      <p>This page doesn&apos;t exist.</p>
      <Link className="btn primary" href="/explore">
        Back to Explore
      </Link>
    </main>
  );
}
