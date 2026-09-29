import DOMPurify from "isomorphic-dompurify";
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

const HTML_ENTITIES: Record<string, string> = {
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&apos;": "'",
  "&#39;": "'",
  "&#039;": "'",
  "&nbsp;": " ",
  "&amp;": "&",
};

/** Numeric character references, e.g. `&#8217;` or `&#x2019;`. */
const NUMERIC_ENTITY = /&#(x?)([0-9a-f]+);/gi;

function decodeEntities(input: string): string {
  return input
    .replace(NUMERIC_ENTITY, (_, hex: string, digits: string) => {
      const code = parseInt(digits, hex ? 16 : 10);
      if (!Number.isFinite(code) || code < 0 || code > 0x10ffff) return _;
      try {
        return String.fromCodePoint(code);
      } catch {
        return _;
      }
    })
    .replace(/&(lt|gt|quot|apos|nbsp|amp);/g, (m) => HTML_ENTITIES[m] ?? m);
}

/**
 * Turns a feed description into display-safe plain text.
 *
 * Order is load-bearing and was the source of the visible-HTML bug: several
 * feeds (Google News especially) deliver an HTML-*escaped* description, so
 * `<a href="...">` arrives as the literal text `&lt;a href="..."&gt;`. Stripping
 * tags from that removes nothing, and naively deleting the `&lt;`/`&gt;`
 * entities instead leaves the tag's attributes behind as visible text.
 *
 * So: decode first so the sanitizer has real tags to match, then read
 * `textContent` off the sanitized fragment.
 *
 * The result is deliberately NOT decoded again. Sanitizing re-escapes `&`, `<`
 * and `>`; decoding a second time would undo that escaping and let a stray `>`
 * back into the output. Reading textContent gives the real characters directly
 * with no extra round trip.
 *
 * Uses a real HTML parser rather than a regex, so malformed or nested feed
 * markup cannot break the strip.
 */
function toPlainText(input: string): string {
  const decoded = decodeEntities(input);
  const fragment = DOMPurify.sanitize(decoded, {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
    KEEP_CONTENT: true,
    RETURN_DOM_FRAGMENT: true,
  });
  return (fragment?.textContent ?? "").replace(/\s+/g, " ").trim();
}

/**
 * Google News descriptions are not summaries. They are a link whose anchor text
 * is the headline, two non-breaking spaces, then the publisher inside a <font>.
 * Once cleaned the excerpt is just the title again plus the source, so drop it
 * rather than printing a duplicate of the headline on every card.
 */
function isRedundantWithTitle(description: string, title: string): boolean {
  if (!description) return true;
  const normalise = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  const body = normalise(description);
  const headline = normalise(title);
  if (!body) return true;
  if (headline && body.startsWith(headline.slice(0, Math.min(40, headline.length)))) return true;
  // After cleaning, Google News leaves only "<headline> <publisher>".
  return body.split(/\s{2,}/).length <= 1;
}

function extractImage(itemXml: string): string {
  const enclosureMatch = itemXml.match(/<enclosure[^>]*url="([^"]+)"[^>]*>/);
  if (enclosureMatch) return enclosureMatch[1];

  const mediaMatch = itemXml.match(/<media:content[^>]*url="([^"]+)"[^>]*>/);
  if (mediaMatch) return mediaMatch[1];

  const mediaThumbnail = itemXml.match(/<media:thumbnail[^>]*url="([^"]+)"[^>]*>/);
  if (mediaThumbnail) return mediaThumbnail[1];

  // Atom <content:encoded> and some publishers only carry the image inline.
  const encoded = itemXml.match(/<content:encoded>([\s\S]*?)<\/content:encoded>/);
  if (encoded) {
    const inline = encoded[1].match(/<img[^>]+src="([^"]+)"[^>]*>/);
    if (inline) return inline[1];
  }

  const description = itemXml.match(/<description>([\s\S]*?)<\/description>/);
  if (description) {
    const inline = decodeEntities(description[1]).match(/<img[^>]+src="([^"]+)"[^>]*>/);
    if (inline) return inline[1];
  }

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
      const rawDescription = itemXml.match(descRegex)?.[1]?.trim() || "";
      const cleaned = toPlainText(rawDescription);
      const description = isRedundantWithTitle(cleaned, title) ? "" : cleaned;
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
