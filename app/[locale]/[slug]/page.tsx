/**
 * Dynamic CMS Page Route
 * 
 * Ez az oldal rendereli a CMS-ből származó dinamikus oldalakat.
 * Bármely slug-ra illeszkedik, ami nem egyezik más statikus útvonallal.
 */

import { notFound } from 'next/navigation';
import { pagesStorage } from '@/lib/cms/storage';
import { BlockRenderer } from '@/components/cms/BlockRenderer';
import type { Page } from '@/lib/cms/types';

interface Props {
  params: Promise<{
    slug: string;
  }>;
}

export async function generateStaticParams() {
  const pages = await pagesStorage.readPublishedPages();
  return pages.map((page) => ({
    slug: page.slug,
  }));
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const page = await pagesStorage.readPage(slug);
  
  if (!page || !page.published) {
    return {
      title: 'Oldal nem található',
    };
  }

  return {
    title: page.seo.title?.hu || page.title.hu || slug,
    description: page.seo.description?.hu || '',
  };
}

export default async function CmsPage({ params }: Props) {
  const { slug } = await params;
  const page: Page | null = await pagesStorage.readPage(slug);

  if (!page || !page.published) {
    notFound();
  }

  const sortedBlocks = [...page.blocks]
    .filter((block) => block.visible)
    .sort((a, b) => a.order - b.order);

  return (
    <main className="min-h-screen">
      {sortedBlocks.map((block) => (
        <BlockRenderer key={block.id} block={block} />
      ))}
    </main>
  );
}
