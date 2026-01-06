import { Geist, Geist_Mono, Noto_Serif_TC } from 'next/font/google';
import { getLocale } from 'next-intl/server';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

const notoSerifTC = Noto_Serif_TC({
  variable: '--font-noto-serif-tc',
  subsets: ['latin'],
  weight: ['200', '300', '400', '500', '600', '700', '900'],
});

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Get locale from next-intl
  const locale = await getLocale();

  // Root layout - locale-specific content is in [locale]/layout.tsx
  return (
    <html lang={locale} suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${notoSerifTC.variable} antialiased`}
        suppressHydrationWarning
      >
        {children}
      </body>
    </html>
  );
}
