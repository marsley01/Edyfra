import { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://edyfra.space';

  // Add the main public routes
  const routes = [
    '',
    '/features',
    '/about',
    '/contact',
    '/login',
    '/signup',
    '/community',
    '/news',
    '/privacy',
    '/roadmap',
    '/terms',
    '/forgot-password'
  ].map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: route === '' ? 1 : 0.8,
  }));

  return [...routes];
}
