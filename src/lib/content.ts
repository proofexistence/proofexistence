import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

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
