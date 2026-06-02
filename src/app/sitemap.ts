import { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

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
