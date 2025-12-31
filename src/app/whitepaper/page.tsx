import { getWhitepaperContent } from '@/lib/content';
import { Metadata } from 'next';
import Link from 'next/link';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

// Force static generation for performance, but allows revalidation if needed
export const revalidate = 3600;

// Define Props interface correctly for Next.js 15+ Server Components
interface WhitepaperPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'Whitepaper | Proof of Existence',
    description:
      'Read the full protocol specification and artistic vision behind Proof of Existence. A year-long collective art experiment on the blockchain.',
    openGraph: {
      title: 'Whitepaper | Proof of Existence',
      description:
        'Read the full protocol specification and artistic vision behind Proof of Existence. A year-long collective art experiment on the blockchain.',
      images: [
        {
          url: '/og-v2.png',
          width: 1200,
          height: 630,
          alt: 'Proof of Existence Whitepaper',
        },
      ],
    },
  };
}

export default async function WhitepaperPage({
  searchParams,
}: WhitepaperPageProps) {
  // Await searchParams before accessing properties
  const resolvedSearchParams = await searchParams;
  const lang = (resolvedSearchParams?.lang as string) || 'en';

  // Fetch content based on language
  const { content } = await getWhitepaperContent(lang);

  return (
    <div className="min-h-screen bg-transparent text-zinc-100 font-sans selection:bg-purple-500/30">
      <main className="max-w-3xl mx-auto px-6 pt-32 pb-24">
        {/* Header & Language Toggle */}
        <div className="flex flex-col md:flex-row items-center justify-between mb-12 gap-6">
          <div className="text-zinc-500 text-xs tracking-[0.2em] uppercase font-medium">
            Protocol Specification
          </div>

          <div className="flex gap-2 text-xs font-mono bg-white/5 p-1 rounded-lg border border-white/5">
            <Link
              href="?lang=en"
              className={`px-3 py-1.5 rounded transition-all ${lang === 'en' ? 'bg-white text-black shadow-sm' : 'text-zinc-500 hover:text-white hover:bg-white/5'}`}
            >
              EN
            </Link>
            <Link
              href="?lang=zh"
              className={`px-3 py-1.5 rounded transition-all ${lang === 'zh' ? 'bg-white text-black shadow-sm' : 'text-zinc-500 hover:text-white hover:bg-white/5'}`}
            >
              中文
            </Link>
            <Link
              href="?lang=es"
              className={`px-3 py-1.5 rounded transition-all ${lang === 'es' ? 'bg-white text-black shadow-sm' : 'text-zinc-500 hover:text-white hover:bg-white/5'}`}
            >
              ES
            </Link>
            <Link
              href="?lang=ja"
              className={`px-3 py-1.5 rounded transition-all ${lang === 'ja' ? 'bg-white text-black shadow-sm' : 'text-zinc-500 hover:text-white hover:bg-white/5'}`}
            >
              JA
            </Link>
            <Link
              href="?lang=fr"
              className={`px-3 py-1.5 rounded transition-all ${lang === 'fr' ? 'bg-white text-black shadow-sm' : 'text-zinc-500 hover:text-white hover:bg-white/5'}`}
            >
              FR
            </Link>
          </div>
        </div>

        <article className="prose prose-invert prose-zinc prose-headings:font-light prose-headings:tracking-tight prose-p:text-zinc-400 prose-a:text-purple-400 hover:prose-a:text-purple-300 prose-strong:text-white prose-li:text-zinc-400 max-w-none">
          <Markdown remarkPlugins={[remarkGfm]}>{content}</Markdown>
        </article>

        <div className="mt-16 pt-8 border-t border-white/10 flex flex-col items-center">
          <p className="text-zinc-500 text-sm mb-4">Ready to exist?</p>
          <Link href="/">
            <button className="px-8 py-3 bg-white text-black hover:bg-zinc-200 transition-colors text-sm uppercase tracking-widest font-bold">
              Enter App
            </button>
          </Link>
        </div>
      </main>
    </div>
  );
}
