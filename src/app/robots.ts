import { MetadataRoute } from 'next';
import { getAppUrl } from '@/lib/app-url';

export default function robots(): MetadataRoute.Robots {
  const siteUrl = getAppUrl();

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/dashboard/',
          '/tutor/',
          '/admin/',
          '/api/',
          '/login',
          '/signup',
          '/forgot-password',
          '/update-password',
          '/onboarding/',
          '/auth/',
          '/institution/dashboard/',
          '/institution/login',
          '/institution/signup',
          '/institutions/login',
          '/institutions/signup',
        ],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
