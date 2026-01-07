import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

// Types for Learn articles
export interface LearnArticleMeta {
  title: string;
  description: string;
  category: LearnCategory;
  order: number;
  publishedAt: string;
}

export interface LearnArticle {
  slug: string;
  category: LearnCategory;
  meta: LearnArticleMeta;
  content: string;
  lang: string;
}

export type LearnCategory = 'getting-started' | 'tutorials' | 'stories';

export const LEARN_CATEGORIES: Record<
  LearnCategory,
  { labelKey: string; order: number }
> = {
  'getting-started': { labelKey: 'gettingStarted', order: 1 },
  tutorials: { labelKey: 'tutorials', order: 2 },
  stories: { labelKey: 'stories', order: 3 },
};

/**
 * Get all learn articles with metadata
 */
export const getLearnArticles = async (
  lang: string = 'en'
): Promise<LearnArticle[]> => {
  const articles: LearnArticle[] = [];
  const learnDir = path.join(process.cwd(), 'src/content/learn');

  if (!fs.existsSync(learnDir)) {
    return articles;
  }

  const categories = fs.readdirSync(learnDir).filter((dir) => {
    const categoryPath = path.join(learnDir, dir);
    return fs.statSync(categoryPath).isDirectory();
  });

  for (const category of categories) {
    const categoryDir = path.join(learnDir, category);
    const slugs = fs.readdirSync(categoryDir).filter((dir) => {
      const slugPath = path.join(categoryDir, dir);
      return fs.statSync(slugPath).isDirectory();
    });

    for (const slug of slugs) {
      const article = await getLearnArticle(
        category as LearnCategory,
        slug,
        lang
      );
      if (article) {
        articles.push(article);
      }
    }
  }

  // Sort by category order, then by article order
  return articles.sort((a, b) => {
    const categoryOrderA = LEARN_CATEGORIES[a.category]?.order ?? 99;
    const categoryOrderB = LEARN_CATEGORIES[b.category]?.order ?? 99;
    if (categoryOrderA !== categoryOrderB) {
      return categoryOrderA - categoryOrderB;
    }
    return a.meta.order - b.meta.order;
  });
};

/**
 * Get a single learn article by category and slug
 */
export const getLearnArticle = async (
  category: LearnCategory,
  slug: string,
  lang: string = 'en'
): Promise<LearnArticle | null> => {
  try {
    const articleDir = path.join(
      process.cwd(),
      'src/content/learn',
      category,
      slug
    );

    if (!fs.existsSync(articleDir)) {
      return null;
    }

    // Try requested language, fallback to English
    const langFile = path.join(articleDir, `${lang}.md`);
    const enFile = path.join(articleDir, 'en.md');

    const fileToRead = fs.existsSync(langFile) ? langFile : enFile;
    const actualLang = fs.existsSync(langFile) ? lang : 'en';

    if (!fs.existsSync(fileToRead)) {
      return null;
    }

    const fileContent = fs.readFileSync(fileToRead, 'utf-8');
    const { data, content } = matter(fileContent);

    return {
      slug,
      category,
      meta: data as LearnArticleMeta,
      content,
      lang: actualLang,
    };
  } catch (error) {
    console.error(`Error reading article ${category}/${slug}:`, error);
    return null;
  }
};

/**
 * Get all article slugs for static generation
 */
export const getAllLearnSlugs = async (): Promise<
  { category: LearnCategory; slug: string }[]
> => {
  const slugs: { category: LearnCategory; slug: string }[] = [];
  const learnDir = path.join(process.cwd(), 'src/content/learn');

  if (!fs.existsSync(learnDir)) {
    return slugs;
  }

  const categories = fs.readdirSync(learnDir).filter((dir) => {
    const categoryPath = path.join(learnDir, dir);
    return fs.statSync(categoryPath).isDirectory();
  });

  for (const category of categories) {
    const categoryDir = path.join(learnDir, category);
    const articleSlugs = fs.readdirSync(categoryDir).filter((dir) => {
      const slugPath = path.join(categoryDir, dir);
      return fs.statSync(slugPath).isDirectory();
    });

    for (const slug of articleSlugs) {
      slugs.push({ category: category as LearnCategory, slug });
    }
  }

  return slugs;
};

export const getWhitepaperContent = async (lang: string = 'en') => {
  try {
    const filePath = path.join(
      process.cwd(),
      'src/content/whitepaper',
      `${lang}.md`
    );

    // Fallback to English if file doesn't exist
    const fileToRead = fs.existsSync(filePath)
      ? filePath
      : path.join(process.cwd(), 'src/content/whitepaper', 'en.md');

    const fileContent = fs.readFileSync(fileToRead, 'utf-8');
    const { data, content } = matter(fileContent);

    return {
      meta: data,
      content,
      lang: fs.existsSync(filePath) ? lang : 'en',
    };
  } catch (error) {
    console.error('Error reading whitepaper:', error);
    return {
      meta: {},
      content: '# Error\nCould not load whitepaper.',
      lang: 'en',
    };
  }
};
