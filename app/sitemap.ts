import { MetadataRoute } from 'next';
import { readAllFighters } from '@/lib/fighters';
import { pagesStorage } from '@/lib/cms/storage';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://elitefightuniverse.com';
  
  // Statikus oldalak
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 1,
    },
    {
      url: `${baseUrl}/rolunk`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/reality`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/harcosok`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/jelentkezz`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/szponzorok`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.6,
    },
  ];

  // Dinamikus harcos oldalak
  let fighterRoutes: MetadataRoute.Sitemap = [];
  try {
    const fighters = await readAllFighters();
    fighterRoutes = fighters.map((fighter) => ({
      url: `${baseUrl}/harcosok/${fighter.slug}`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.8,
    }));
  } catch (error) {
    console.error('Error fetching fighters for sitemap:', error);
  }

  // CMS oldalak (publikált, látható oldalak)
  let cmsRoutes: MetadataRoute.Sitemap = [];
  try {
    const pages = await pagesStorage.readPublishedPages();
    cmsRoutes = pages
      .filter((page) => page.published)
      .map((page) => ({
        url: `${baseUrl}/hu/${page.slug}`,
        lastModified: new Date(page.updatedAt || page.createdAt),
        changeFrequency: 'weekly' as const,
        priority: 0.7,
      }));
  } catch (error) {
    console.error('Error fetching CMS pages for sitemap:', error);
  }

  return [...staticRoutes, ...fighterRoutes, ...cmsRoutes];
}
