import type { Metadata } from 'next';
import '@fontsource/plus-jakarta-sans/latin-400.css';
import '@fontsource/plus-jakarta-sans/latin-500.css';
import '@fontsource/plus-jakarta-sans/latin-600.css';
import '@fontsource/plus-jakarta-sans/latin-700.css';
import '@fontsource/merriweather/latin-400.css';
import '@fontsource/merriweather/latin-700.css';
import '@fontsource/jetbrains-mono/latin-400.css';
import '@fontsource/jetbrains-mono/latin-500.css';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'Digital Library | Professional Studies Department — Dispur College',
    template: '%s | Dispur College Digital Library',
  },
  description:
    'Official departmental digital library of the Professional Studies Department, Dispur College, Assam, India. Browse, read online, and access academic PDFs and e-books.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="relative min-h-screen flex flex-col bg-charcoal-950 text-offwhite-100 overflow-x-hidden">
        {children}
      </body>
    </html>
  );
}

