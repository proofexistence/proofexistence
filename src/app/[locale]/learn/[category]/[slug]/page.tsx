import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Link } from '@/i18n/navigation';
import { getTranslations } from 'next-intl/server';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  getLearnArticle,
  getAllLearnSlugs,
  LEARN_CATEGORIES,
  LearnCategory,
} from '@/lib/content';
import { ArrowLeft, BookOpen, Sparkles, MessageCircle } from 'lucide-react';
import { locales } from '@/i18n/config';

export const revalidate = 3600;

interface ArticlePageProps {
  params: Promise<{ locale: string; category: string; slug: string }>;
}

const categoryIcons: Record<LearnCategory, React.ReactNode> = {
  'getting-started': <Sparkles className="w-4 h-4" />,
  tutorials: <BookOpen className="w-4 h-4" />,
  stories: <MessageCircle className="w-4 h-4" />,
};

export async function generateStaticParams() {
  const slugs = await getAllLearnSlugs();

  // Generate params for all locales and all articles
  return locales.flatMap((locale) =>
    slugs.map(({ category, slug }) => ({
      locale,
      category,
      slug,
    }))
  );
}

export async function generateMetadata({
  params,
}: ArticlePageProps): Promise<Metadata> {
  const { locale, category, slug } = await params;
  const lang = locale === 'cn' ? 'zh' : locale;
  const article = await getLearnArticle(category as LearnCategory, slug, lang);

  if (!article) {
    return {
      title: 'Article Not Found | Proof of Existence',
    };
  }

  return {
    title: `${article.meta.title} | Proof of Existence`,
    description: article.meta.description,
    openGraph: {
      title: `${article.meta.title} | Proof of Existence`,
      description: article.meta.description,
      images: [
        {
          url: '/og-v2.png',
          width: 1200,
          height: 630,
          alt: article.meta.title,
        },
      ],
    },
  };
}

export default async function ArticlePage({ params }: ArticlePageProps) {
  const { locale, category, slug } = await params;
  const t = await getTranslations('learn');
  const tNav = await getTranslations('nav');

  // Map locale to content language (cn uses zh content)
  const lang = locale === 'cn' ? 'zh' : locale;

  const article = await getLearnArticle(category as LearnCategory, slug, lang);

  if (!article) {
    notFound();
  }

  const categoryLabel =
    LEARN_CATEGORIES[article.category]?.labelKey || article.category;

  return (
    <div className="min-h-screen bg-transparent text-zinc-100 font-sans selection:bg-purple-500/30">
      <main className="max-w-3xl mx-auto px-6 pt-32 pb-24">
        {/* Back Link */}
        <Link
          href="/learn"
          className="inline-flex items-center gap-2 text-sm text-zinc-500 hover:text-white transition-colors mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          {t('backToLearn')}
        </Link>

        {/* Header */}
        <div className="mb-12">
          {/* Category Badge */}
          <div className="flex items-center gap-2 mb-4">
            <span className="text-purple-400">
              {categoryIcons[article.category]}
            </span>
            <span className="text-xs uppercase tracking-wider text-purple-400 font-medium">
              {tNav(categoryLabel)}
            </span>
          </div>

          <h1 className="text-3xl md:text-4xl font-light tracking-tight text-white mb-4">
            {article.meta.title}
          </h1>
          <p className="text-lg text-zinc-400">{article.meta.description}</p>

          {/* Published Date */}
          {article.meta.publishedAt && (
            <div className="mt-4 text-sm text-zinc-500">
              {new Date(article.meta.publishedAt).toLocaleDateString(locale, {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </div>
          )}
        </div>

        {/* Article Content */}
        <article className="prose prose-invert prose-zinc prose-headings:font-light prose-headings:tracking-tight prose-p:text-zinc-400 prose-a:text-purple-400 hover:prose-a:text-purple-300 prose-strong:text-white prose-li:text-zinc-400 prose-code:text-purple-300 prose-code:bg-white/5 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded max-w-none">
          <Markdown remarkPlugins={[remarkGfm]}>{article.content}</Markdown>
        </article>

        {/* Footer */}
        <div className="mt-16 pt-8 border-t border-white/10 flex flex-col items-center">
          <p className="text-zinc-500 text-sm mb-4">{t('readyToStart')}</p>
          <Link href="/canvas">
            <button className="px-8 py-3 bg-white text-black hover:bg-zinc-200 transition-colors text-sm uppercase tracking-widest font-bold rounded-lg">
              {t('startDrawing')}
            </button>
          </Link>
        </div>
      </main>
    </div>
  );
}
