import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const siteUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || 'https://edyfra-v2.vercel.app';

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
