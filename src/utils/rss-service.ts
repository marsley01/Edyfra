import { resolveThumbnail, type ThumbnailResult } from "@/lib/thumbnail-resolver";

export interface RSSItem {
  title: string;
  link: string;
  description: string;
  pubDate: string;
  source: string;
  category: string;
  /** Raw image extracted from the feed XML (enclosure / media tags). May be empty. */
  imageUrl: string;
  /** Resolved thumbnail data — populated by fetchAllFeeds() */
  thumbnail_url: string | null;
  thumbnail_source: "og" | "pexels" | null;
  pexels_photographer: string | null;
  pexels_photo_page: string | null;
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
      // Sort by date, take top 8, then resolve thumbnails in parallel
      const sorted = items
        .sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime())
        .slice(0, 8);

      const enriched = await Promise.all(
        sorted.map(async (item): Promise<RSSItem> => {
          // If the feed already provided an image, use it as-is and skip resolution
          if (item.imageUrl) {
            return {
              ...item,
              thumbnail_url: item.imageUrl,
              thumbnail_source: null,
              pexels_photographer: null,
              pexels_photo_page: null,
            };
          }

          // No feed image — run the full resolver (cache → OG → Pexels)
          let thumb: ThumbnailResult = {
            thumbnail_url: null,
            source: null,
            photographer: null,
            photo_page: null,
          };
          try {
            thumb = await resolveThumbnail(item.link, item.title);
          } catch (err) {
            console.warn("[rss] thumbnail resolution failed for", item.link, err);
          }

          return {
            ...item,
            thumbnail_url: thumb.thumbnail_url,
            thumbnail_source: thumb.source,
            pexels_photographer: thumb.photographer,
            pexels_photo_page: thumb.photo_page,
          };
        })
      );

      results.push({ category, items: enriched });
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
        items.push({
          title,
          link,
          description,
          pubDate,
          source,
          category,
          imageUrl,
          // These are populated later in fetchAllFeeds()
          thumbnail_url: null,
          thumbnail_source: null,
          pexels_photographer: null,
          pexels_photo_page: null,
        });
      }
    }

    return items.slice(0, 6);
  }
}
