import { getWhitepaperContent } from '@/lib/content';
import { Metadata } from 'next';
import { Link } from '@/i18n/navigation';
import { getTranslations } from 'next-intl/server';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

// Force static generation for performance, but allows revalidation if needed
export const revalidate = 3600;

// Define Props interface correctly for Next.js 15+ Server Components
interface WhitepaperPageProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({
  params,
}: WhitepaperPageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'metadata.whitepaper' });

  return {
    title: t('title'),
    description: t('description'),
    openGraph: {
      title: t('title'),
      description: t('description'),
      images: [
        {
          url: '/og-v2.png',
          width: 1200,
          height: 630,
          alt: `Whitepaper - ${t('title')}`,
        },
      ],
    },
  };
}

export default async function WhitepaperPage({ params }: WhitepaperPageProps) {
  const { locale } = await params;
  const t = await getTranslations('whitepaper');

  // Map locale to whitepaper language (cn uses zh content)
  const lang = locale === 'cn' ? 'zh' : locale;

  // Fetch content based on language
  const { content } = await getWhitepaperContent(lang);

  return (
    <div className="min-h-screen bg-transparent text-zinc-100 font-sans selection:bg-purple-500/30">
      <main className="max-w-3xl mx-auto px-6 pt-32 pb-24">
        {/* Header */}
        <div className="flex items-center justify-center mb-12">
          <div className="text-zinc-500 text-xs tracking-[0.2em] uppercase font-medium">
            {t('protocolSpec')}
          </div>
        </div>

        <article className="prose prose-invert prose-zinc prose-headings:font-light prose-headings:tracking-tight prose-p:text-zinc-400 prose-a:text-purple-400 hover:prose-a:text-purple-300 prose-strong:text-white prose-li:text-zinc-400 max-w-none">
          <Markdown
            remarkPlugins={[remarkGfm]}
            components={{
              blockquote: ({ children }) => (
                <div className="not-prose my-6 rounded-lg border border-purple-500/30 bg-purple-500/10 px-5 py-4 text-sm text-zinc-300 leading-relaxed">
                  {children}
                </div>
              ),
            }}
          >
            {content}
          </Markdown>
        </article>

        <div className="mt-16 pt-8 border-t border-white/10 flex flex-col items-center">
          <p className="text-zinc-500 text-sm mb-4">{t('readyToExist')}</p>
          <Link href="/">
            <button className="px-8 py-3 bg-white text-black hover:bg-zinc-200 transition-colors text-sm uppercase tracking-widest font-bold">
              {t('enterApp')}
            </button>
          </Link>
        </div>
      </main>
    </div>
  );
}
