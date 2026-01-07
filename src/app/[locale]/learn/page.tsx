import { Metadata } from 'next';
import { Link } from '@/i18n/navigation';
import { getTranslations } from 'next-intl/server';
import { getLearnArticles, LEARN_CATEGORIES, LearnCategory } from '@/lib/content';
import { ArrowRight, BookOpen, Sparkles, MessageCircle, FileText } from 'lucide-react';

export const revalidate = 3600;

interface LearnPageProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'Learn | Proof of Existence',
    description:
      'Discover how to use Proof of Existence. Tutorials, guides, and stories behind the project.',
    openGraph: {
      title: 'Learn | Proof of Existence',
      description:
        'Discover how to use Proof of Existence. Tutorials, guides, and stories behind the project.',
      images: [
        {
          url: '/og-v2.png',
          width: 1200,
          height: 630,
          alt: 'Learn - Proof of Existence',
        },
      ],
    },
  };
}

const categoryIcons: Record<LearnCategory, React.ReactNode> = {
  'getting-started': <Sparkles className="w-5 h-5" />,
  tutorials: <BookOpen className="w-5 h-5" />,
  stories: <MessageCircle className="w-5 h-5" />,
};

export default async function LearnPage({ params }: LearnPageProps) {
  const { locale } = await params;
  const t = await getTranslations('learn');
  const tNav = await getTranslations('nav');

  // Map locale to content language (cn uses zh content)
  const lang = locale === 'cn' ? 'zh' : locale;

  const articles = await getLearnArticles(lang);

  // Group articles by category
  const articlesByCategory = articles.reduce(
    (acc, article) => {
      if (!acc[article.category]) {
        acc[article.category] = [];
      }
      acc[article.category].push(article);
      return acc;
    },
    {} as Record<LearnCategory, typeof articles>
  );

  // Get sorted categories
  const sortedCategories = (Object.keys(LEARN_CATEGORIES) as LearnCategory[]).sort(
    (a, b) => LEARN_CATEGORIES[a].order - LEARN_CATEGORIES[b].order
  );

  return (
    <div className="min-h-screen bg-transparent text-zinc-100 font-sans selection:bg-purple-500/30">
      <main className="max-w-3xl mx-auto px-6 pt-32 pb-24">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-4xl font-light tracking-tight text-white mb-4">
            {t('title')}
          </h1>
          <p className="text-lg text-zinc-400">{t('description')}</p>
        </div>

        {/* Categories */}
        <div className="space-y-12">
          {sortedCategories.map((category) => {
            const categoryArticles = articlesByCategory[category] || [];
            if (categoryArticles.length === 0) return null;

            return (
              <section key={category} id={category}>
                <div className="flex items-center gap-3 mb-6">
                  <span className="text-purple-400">
                    {categoryIcons[category]}
                  </span>
                  <h2 className="text-xl font-medium text-white">
                    {tNav(LEARN_CATEGORIES[category].labelKey)}
                  </h2>
                </div>

                <div className="space-y-3">
                  {categoryArticles.map((article) => (
                    <Link
                      key={article.slug}
                      href={`/learn/${article.category}/${article.slug}` as `/learn/${string}/${string}`}
                      className="group block p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-base font-medium text-white group-hover:text-purple-300 transition-colors">
                            {article.meta.title}
                          </h3>
                          <p className="text-sm text-zinc-500 mt-1">
                            {article.meta.description}
                          </p>
                        </div>
                        <ArrowRight className="w-5 h-5 text-zinc-500 group-hover:text-purple-400 group-hover:translate-x-1 transition-all" />
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            );
          })}
        </div>

        {/* Whitepaper Link */}
        <div className="mt-16 pt-8 border-t border-white/10">
          <Link
            href="/whitepaper"
            className="group flex items-center gap-4 p-5 rounded-xl bg-gradient-to-r from-purple-500/10 to-blue-500/10 border border-white/10 hover:border-white/20 transition-all"
          >
            <FileText className="w-6 h-6 text-purple-400" />
            <div className="flex-1">
              <h3 className="text-lg font-medium text-white group-hover:text-purple-300 transition-colors">
                {tNav('whitepaper')}
              </h3>
              <p className="text-sm text-zinc-500">
                Read the full protocol specification
              </p>
            </div>
            <ArrowRight className="w-5 h-5 text-zinc-500 group-hover:text-purple-400 group-hover:translate-x-1 transition-all" />
          </Link>
        </div>
      </main>
    </div>
  );
}
