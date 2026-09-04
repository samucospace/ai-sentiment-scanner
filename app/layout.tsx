import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'AI Industry Sentiment & Use Case Scanner',
  description:
    'Daily Google Alert intelligence on AI sentiment across professions and emerging use cases with citations.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-slate-950 text-slate-100 antialiased min-h-screen">
        {children}
      </body>
    </html>
  );
}
