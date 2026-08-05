export interface RSSItem {
  title: string;
  link: string;
  description: string;
  pubDate: string;
  source: string;
  category: string;
  imageUrl: string;
}

const CATEGORY_FEEDS: { category: string; name: string; url: string }[] = [
  { category: "Tech", name: "TechCrunch", url: "https://techcrunch.com/feed/" },
  { category: "Tech", name: "The Verge", url: "https://www.theverge.com/rss/index.xml" },
  { category: "Tech", name: "Wired", url: "https://www.wired.com/feed/rss" },
  { category: "Education", name: "BBC Education", url: "https://feeds.bbci.co.uk/news/education/rss.xml" },
  { category: "Education", name: "Edutopia", url: "https://www.edutopia.org/rss.xml" },
  { category: "Education", name: "Kenya Education News", url: "https://news.google.com/rss/search?q=education+kenya&hl=en-KE&gl=KE&ceid=KE:en" },
  { category: "Education", name: "Kenyan Schools", url: "https://news.google.com/rss/search?q=kenyan+schools+education+students&hl=en-KE&gl=KE&ceid=KE:en" },
  { category: "Education", name: "KNEC Exams", url: "https://news.google.com/rss/search?q=KNEC+KCSE+KCPE+kenya&hl=en-KE&gl=KE&ceid=KE:en" },
  { category: "Education", name: "KUCCPS Universities", url: "https://news.google.com/rss/search?q=KUCCPS+university+kenya&hl=en-KE&gl=KE&ceid=KE:en" },
  { category: "Education", name: "Nation Africa", url: "https://nation.africa/kenya/rss" },
  { category: "Student Life", name: "The Guardian Education", url: "https://www.theguardian.com/education/rss" },
  { category: "Student Life", name: "Times Higher Ed", url: "https://www.timeshighereducation.com/feed" },
  { category: "Student Life", name: "Inside Higher Ed", url: "https://www.insidehighered.com/rss" },
  { category: "Announcements", name: "NASA Breaking News", url: "https://www.nasa.gov/feed/" },
  { category: "Announcements", name: "Science Daily", url: "https://www.sciencedaily.com/rss/all.xml" },
];

const FALLBACK_IMAGES: Record<string, string> = {
  Tech: "https://images.unsplash.com/photo-1518770660439-4636190af475?q=80&w=2070&auto=format&fit=crop",
  Education: "https://images.unsplash.com/photo-1523050854058-8df90110c7f1?q=80&w=2071&auto=format&fit=crop",
  "Student Life": "https://images.unsplash.com/photo-1523240795612-9a054b0db644?q=80&w=2070&auto=format&fit=crop",
  Announcements: "https://images.unsplash.com/photo-1504711434969-e33886168d6c?q=80&w=2070&auto=format&fit=crop",
};

const UNSPLASH_BACKUP = "https://images.unsplash.com/photo-1546410531-bb4caa1b4247?q=80&w=2070&auto=format&fit=crop";

function extractImage(itemXml: string): string {
  const enclosureMatch = itemXml.match(/<enclosure[^>]*url="([^"]+)"[^>]*>/);
  if (enclosureMatch) return enclosureMatch[1];

  const mediaMatch = itemXml.match(/<media:content[^>]*url="([^"]+)"[^>]*>/);
  if (mediaMatch) return mediaMatch[1];

  const mediaThumbnail = itemXml.match(/<media:thumbnail[^>]*url="([^"]+)"[^>]*>/);
  if (mediaThumbnail) return mediaThumbnail[1];

  const imgTag = itemXml.match(/<img[^>]+src="([^"]+)"[^>]*>/);
  if (imgTag) return imgTag[1];

  return "";
}

export class RSSService {
  async fetchAllFeeds(): Promise<{ category: string; items: RSSItem[] }[]> {
    const results: { category: string; items: RSSItem[] }[] = [];
    const categoryMap = new Map<string, RSSItem[]>();

    for (const feed of CATEGORY_FEEDS) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 8000);
        const response = await fetch(feed.url, { signal: controller.signal, headers: { "User-Agent": "Edyfra/1.0" } });
        clearTimeout(timeout);
        const xml = await response.text();
        const items = this.parseRSS(xml, feed.name, feed.category);
        const existing = categoryMap.get(feed.category) || [];
        categoryMap.set(feed.category, [...existing, ...items]);
      } catch (error) {
        console.error(`RSS failed: ${feed.name}`, (error as Error).message);
      }
    }

    for (const [category, items] of categoryMap) {
      const fallbackImg = FALLBACK_IMAGES[category] || UNSPLASH_BACKUP;
      const enriched = items.map(item => ({
        ...item,
        imageUrl: item.imageUrl || fallbackImg,
      }));
      results.push({
        category,
        items: enriched.sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime()).slice(0, 8),
      });
    }

    return results;
  }

  private parseRSS(xml: string, source: string, category: string): RSSItem[] {
    const items: RSSItem[] = [];
    const itemRegex = /<item>([\s\S]*?)<\/item>/g;
    const titleRegex = /<title>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/;
    const linkRegex = /<link>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/link>/;
    const descRegex = /<description>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/description>/;
    const dateRegex = /<pubDate>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/pubDate>/;

    let match;
    while ((match = itemRegex.exec(xml)) !== null) {
      const itemXml = match[1];
      const title = itemXml.match(titleRegex)?.[1]?.trim() || "";
      const link = itemXml.match(linkRegex)?.[1]?.trim() || "";
      const description = itemXml.match(descRegex)?.[1]?.trim().replace(/<[^>]*>?/gm, "") || "";
      const pubDate = itemXml.match(dateRegex)?.[1]?.trim() || "";
      const imageUrl = extractImage(itemXml);

      if (title && link) {
        items.push({ title, link, description, pubDate, source, category, imageUrl });
      }
    }

    return items.slice(0, 6);
  }
}
