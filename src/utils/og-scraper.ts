export async function fetchOgImage(url: string): Promise<string | null> {
  try {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), 2500);

    const response = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": "Edyfra/1.0" },
      next: { revalidate: 3600 } // Cache the HTML result to save external requests
    });
    
    clearTimeout(id);

    if (!response.ok) return null;

    const html = await response.text();

    // Look for <meta property="og:image" content="..."> or <meta content="..." property="og:image">
    const ogMatch = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i) 
      || html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:image["']/i)
      || html.match(/<meta[^>]*name=["']twitter:image["'][^>]*content=["']([^"']+)["']/i);

    if (ogMatch && ogMatch[1]) {
      // Decode basic HTML entities that might be present in URLs
      return ogMatch[1].replace(/&amp;/g, '&');
    }

    return null;
  } catch (err) {
    // Fail silently on timeout or network errors so news still loads
    return null;
  }
}
