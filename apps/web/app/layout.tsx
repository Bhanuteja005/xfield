import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import '../styles/global.css';
import '../styles/landing.css';
import '../styles/library.css';

export const metadata: Metadata = {
  title: { default: 'Xfield — Creative Studio', template: '%s · Xfield' },
  description:
    'Xfield creative studio. Explore ideas, create visuals and organize every project in one place.',
  icons: { icon: '/favicon.svg' },
};

export const viewport: Viewport = { themeColor: '#101112', colorScheme: 'dark' };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
