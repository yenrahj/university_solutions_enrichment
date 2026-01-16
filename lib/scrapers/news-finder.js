// lib/scrapers/news-finder.js
// Institution news finder - RSS autodiscovery + fallback methods

import * as cheerio from 'cheerio';

const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
const GOOGLE_CSE_ID = process.env.GOOGLE_CSE_ID;

/**
 * Get news about an institution
 * Priority: 1) RSS feeds, 2) Scrape news page, 3) Google search
 */
export async function getInstitutionNews(institution, emailDomain) {
  if (!emailDomain && !institution) return [];

  const domain = emailDomain;
  if (!domain) return [];

  // Try RSS first (unlimited, no API cost)
  const rssNews = await findAndParseRSS(domain);
  if (rssNews.length >= 3) return rssNews;

  // Try scraping news page directly
  const scrapedNews = await scrapeNewsPage(domain);
  if (scrapedNews.length >= 2) return [...rssNews, ...scrapedNews].slice(0, 8);

  // Fallback to Google if we have API access and still need news
  if (GOOGLE_API_KEY && GOOGLE_CSE_ID && rssNews.length + scrapedNews.length < 2) {
    const googleNews = await searchGoogleNews(institution);
    return [...rssNews, ...scrapedNews, ...googleNews].slice(0, 8);
  }

  return [...rssNews, ...scrapedNews].slice(0, 8);
}

/**
 * Find RSS feed via autodiscovery and common paths, then parse
 */
async function findAndParseRSS(domain) {
  const bases = [`https://${domain}`, `https://www.${domain}`];

  for (const base of bases) {
    // Step 1: Try RSS autodiscovery from homepage
    const autodiscovered = await autodiscoverRSS(base);
    if (autodiscovered) {
      const news = await parseRSSFeed(autodiscovered);
      if (news.length > 0) return news;
    }

    // Step 2: Try common RSS paths
    const commonPaths = [
      '/feed', '/rss', '/news/feed', '/news/rss', 
      '/feed/', '/rss/', '/news/feed/', '/news/rss/',
      '/blog/feed', '/newsroom/feed', '/stories/feed'
    ];

    for (const path of commonPaths) {
      const news = await parseRSSFeed(`${base}${path}`);
      if (news.length > 0) {
        console.log(`   Found RSS at ${base}${path}`);
        return news;
      }
    }
  }

  return [];
}

/**
 * Look for RSS link in HTML head (autodiscovery)
 */
async function autodiscoverRSS(baseUrl) {
  try {
    const response = await fetch(baseUrl, { 
      signal: AbortSignal.timeout(4000),
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });
    if (!response.ok) return null;

    const html = await response.text();
    const $ = cheerio.load(html);

    // Look for RSS/Atom link tags
    const rssLink = $('link[type="application/rss+xml"]').attr('href') ||
                    $('link[type="application/atom+xml"]').attr('href') ||
                    $('a[href*="/feed"]').first().attr('href') ||
                    $('a[href*="/rss"]').first().attr('href');

    if (rssLink) {
      return makeAbsoluteUrl(rssLink, baseUrl);
    }

    return null;
  } catch { return null; }
}

/**
 * Parse an RSS/Atom feed
 */
async function parseRSSFeed(feedUrl) {
  try {
    const response = await fetch(feedUrl, {
      signal: AbortSignal.timeout(4000),
      headers: { 
        'User-Agent': 'Mozilla/5.0',
        'Accept': 'application/rss+xml, application/xml, text/xml, */*'
      }
    });
    if (!response.ok) return [];

    // Limit response size
    const fullText = await response.text();
    const text = fullText.slice(0, 200000);
    
    // Quick check if it's actually XML/RSS
    if (!text.includes('<rss') && !text.includes('<feed') && !text.includes('<item')) {
      return [];
    }

    const $ = cheerio.load(text, { xmlMode: true });
    const news = [];

    // Parse RSS items or Atom entries
    $('item, entry').each((i, el) => {
      if (news.length >= 6) return false;

      const title = $(el).find('title').first().text().trim();
      const link = $(el).find('link').first().text().trim() || 
                   $(el).find('link').attr('href');
      const pubDate = $(el).find('pubDate, published, updated').first().text().trim();
      const desc = $(el).find('description, summary, content').first().text().trim();

      if (title && title.length > 10) {
        news.push({
          headline: cleanText(title).slice(0, 200),
          summary: cleanText(desc).slice(0, 300),
          date: formatDate(pubDate),
          url: link,
          source: 'RSS'
        });
      }
    });

    return news;
  } catch { return []; }
}

/**
 * Scrape news directly from common news page URLs
 */
async function scrapeNewsPage(domain) {
  const paths = ['/news', '/newsroom', '/stories', '/press', '/media'];
  const bases = [`https://${domain}`, `https://www.${domain}`];

  for (const base of bases) {
    for (const path of paths) {
      try {
        const response = await fetch(`${base}${path}`, {
          signal: AbortSignal.timeout(4000),
          headers: { 'User-Agent': 'Mozilla/5.0' }
        });
        if (!response.ok) continue;

        // Limit response size
        const fullHtml = await response.text();
        const html = fullHtml.slice(0, 300000);
        const $ = cheerio.load(html);
        const news = [];

        // Look for article/news elements
        $('article, .news-item, .post, [class*="news-"], [class*="story"]').each((i, el) => {
          if (news.length >= 5) return false;

          const headline = $(el).find('h2, h3, h4, .title, .headline').first().text().trim();
          const summary = $(el).find('p, .excerpt, .summary').first().text().trim();
          const link = $(el).find('a').first().attr('href');
          const date = $(el).find('time, .date, [class*="date"]').first().text().trim();

          if (headline && headline.length > 15) {
            news.push({
              headline: headline.slice(0, 200),
              summary: summary?.slice(0, 300),
              date: formatDate(date),
              url: makeAbsoluteUrl(link, base),
              source: 'Website'
            });
          }
        });

        if (news.length > 0) return news;
      } catch { continue; }
    }
  }

  return [];
}

/**
 * Search Google for institution news
 */
async function searchGoogleNews(institution) {
  if (!GOOGLE_API_KEY || !GOOGLE_CSE_ID) return [];

  try {
    const query = `"${institution}" (announcement OR program OR partnership OR initiative)`;
    const url = `https://www.googleapis.com/customsearch/v1?key=${GOOGLE_API_KEY}&cx=${GOOGLE_CSE_ID}&q=${encodeURIComponent(query)}&num=5&sort=date`;

    const response = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!response.ok) return [];

    const data = await response.json();
    
    return (data.items || [])
      .filter(item => {
        const url = item.link.toLowerCase();
        return !url.includes('/apply') && !url.includes('/admissions');
      })
      .map(item => ({
        headline: item.title?.slice(0, 200),
        summary: item.snippet?.slice(0, 300),
        url: item.link,
        source: 'Google'
      }));

  } catch { return []; }
}

function cleanText(text) {
  if (!text) return '';
  return text
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

function formatDate(dateStr) {
  if (!dateStr) return null;
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr.slice(0, 20);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  } catch { return dateStr.slice(0, 20); }
}

function makeAbsoluteUrl(href, baseUrl) {
  if (!href) return null;
  try {
    if (href.startsWith('http')) return href;
    const base = new URL(baseUrl);
    if (href.startsWith('/')) return `${base.protocol}//${base.host}${href}`;
    return new URL(href, baseUrl).href;
  } catch { return null; }
}

export default { getInstitutionNews };
