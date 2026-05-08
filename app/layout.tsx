import type { Metadata, Viewport } from 'next';

export const metadata: Metadata = {
  title: 'Reestr-Zakupka',
  description: 'TRU verification system',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
      <html lang="ru">
      <body>{children}</body>
      </html>
  );
}