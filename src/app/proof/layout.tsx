import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { Providers } from '@/providers/app-provider';
import { GlobalBackground } from '@/components/layout/global-background';
import { Navbar } from '@/components/layout/navbar';
import { Footer } from '@/components/layout/footer';
import { LoadingBar } from '@/components/layout/loading-bar';
import { ReferralListener } from '@/components/auth/referral-listener';
import Script from 'next/script';

export default async function ProofLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Default to 'en' locale for proof pages
  const messages = await getMessages({ locale: 'en' });

  return (
    <>
      <Script
        src="https://www.googletagmanager.com/gtag/js?id=G-SVQWPRD6ER"
        strategy="afterInteractive"
      />
      <Script id="google-analytics" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());

          gtag('config', 'G-SVQWPRD6ER');
        `}
      </Script>
      <LoadingBar />
      <NextIntlClientProvider locale="en" messages={messages}>
        <Providers>
          <div className="relative min-h-screen flex flex-col">
            <GlobalBackground />
            <header className="relative z-50">
              <ReferralListener />
              <Navbar />
            </header>
            <main className="flex-grow">{children}</main>
            <Footer />
          </div>
        </Providers>
      </NextIntlClientProvider>
    </>
  );
}
