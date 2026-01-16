// lib/scrapers/bio-finder.js
// Smart bio page finder using Google site-specific search
// Primary method: site:domain.edu "firstname lastname" 
// This is far more reliable than blind URL pattern guessing

import * as cheerio from 'cheerio';

const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
const GOOGLE_CSE_ID = process.env.GOOGLE_CSE_ID;

/**
 * Find a person's bio page using Google site-specific search
 * Much smarter than trying random URL patterns
 */
export async function findBioPage(name, title, institution, emailDomain) {
  if (!emailDomain && !institution) return null;

  const domain = emailDomain || guessDomain(institution);
  if (!domain) return null;

  // Strategy 1: Google site-specific search (best method)
  if (GOOGLE_API_KEY && GOOGLE_CSE_ID) {
    const googleResult = await searchGoogleForBio(name, title, domain);
    if (googleResult) return googleResult;
  }

  // Strategy 2: Try common URL patterns directly (fallback)
  const urlResult = await probeCommonUrls(name, domain);
  if (urlResult) return urlResult;

  // Strategy 3: Search leadership/directory pages
  const directoryResult = await searchDirectoryPages(name, domain);
  if (directoryResult) return directoryResult;

  return null;
}

/**
 * Use Google Custom Search to find bio page
 * Query: site:domain.edu "firstname lastname"
 */
async function searchGoogleForBio(name, title, domain) {
  try {
    // Build targeted search query
    const query = `site:${domain} "${name}"`;
    const url = `https://www.googleapis.com/customsearch/v1?key=${GOOGLE_API_KEY}&cx=${GOOGLE_CSE_ID}&q=${encodeURIComponent(query)}&num=5`;

    const response = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!response.ok) return null;

    const data = await response.json();
    if (!data.items?.length) return null;

    // Score and rank results
    const nameLower = name.toLowerCase();
    const nameParts = nameLower.split(/\s+/);
    const lastName = nameParts[nameParts.length - 1];

    for (const item of data.items) {
      const urlLower = item.link.toLowerCase();
      const titleLower = (item.title || '').toLowerCase();

      // Skip non-HTML files
      if (urlLower.endsWith('.pdf') || urlLower.endsWith('.doc') || 
          urlLower.endsWith('.docx') || urlLower.endsWith('.ppt') ||
          urlLower.endsWith('.xlsx') || urlLower.endsWith('.zip')) {
        continue;
      }

      // Skip non-bio pages
      if (urlLower.includes('/news/') || urlLower.includes('/events/') ||
          urlLower.includes('/apply') || urlLower.includes('/admissions') ||
          urlLower.includes('digitalcollections') || urlLower.includes('/archive')) {
        continue;
      }

      // Good signals: URL or title contains name, looks like profile page
      const hasName = urlLower.includes(lastName) || titleLower.includes(lastName);
      const isProfileUrl = /\/(people|faculty|staff|directory|leadership|about|profile|team)\//.test(urlLower);

      if (hasName || isProfileUrl) {
        return item.link;
      }
    }

    // Return first result if nothing matched perfectly
    return data.items[0]?.link || null;

  } catch (err) {
    console.log(`   Google search error: ${err.message}`);
    return null;
  }
}

/**
 * Probe common bio URL patterns with HEAD requests
 */
async function probeCommonUrls(name, domain) {
  const nameParts = name.toLowerCase().split(/\s+/);
  const firstName = nameParts[0];
  const lastName = nameParts[nameParts.length - 1];

  const patterns = [
    `/about/leadership/${firstName}-${lastName}`,
    `/about/leadership/${lastName}-${firstName}`,
    `/leadership/${firstName}-${lastName}`,
    `/people/${firstName}-${lastName}`,
    `/faculty/${firstName}-${lastName}`,
    `/directory/${firstName}-${lastName}`,
    `/staff/${firstName}-${lastName}`,
    `/team/${firstName}-${lastName}`,
    `/${firstName}-${lastName}`,
  ];

  const bases = [`https://${domain}`, `https://www.${domain}`];

  for (const base of bases) {
    for (const pattern of patterns) {
      try {
        const response = await fetch(`${base}${pattern}`, {
          method: 'HEAD',
          redirect: 'follow',
          signal: AbortSignal.timeout(2000)
        });
        if (response.ok) return response.url;
      } catch { /* continue */ }
    }
  }

  return null;
}

/**
 * Search leadership/directory pages for person's link
 */
async function searchDirectoryPages(name, domain) {
  const nameParts = name.toLowerCase().split(/\s+/);
  const firstName = nameParts[0];
  const lastName = nameParts[nameParts.length - 1];

  const pages = ['/about/leadership', '/leadership', '/administration', '/directory', '/our-team'];
  const bases = [`https://${domain}`, `https://www.${domain}`];

  for (const base of bases) {
    for (const page of pages) {
      try {
        const response = await fetch(`${base}${page}`, {
          signal: AbortSignal.timeout(4000)
        });
        if (!response.ok) continue;

        const html = await response.text();
        const $ = cheerio.load(html);

        // Find links containing the person's name
        let bestMatch = null;
        $('a[href]').each((i, el) => {
          const text = $(el).text().toLowerCase();
          const href = $(el).attr('href') || '';

          if (text.includes(firstName) && text.includes(lastName)) {
            bestMatch = makeAbsoluteUrl(href, base);
            return false; // break
          }
        });

        if (bestMatch) return bestMatch;
      } catch { /* continue */ }
    }
  }

  return null;
}

/**
 * Scrape content from a bio page
 */
export async function scrapeBioContent(url, name) {
  try {
    // Skip PDFs and other non-HTML
    if (url.match(/\.(pdf|doc|docx|ppt|xlsx|zip)$/i)) {
      console.log(`   Skipping non-HTML: ${url}`);
      return null;
    }

    const response = await fetch(url, {
      signal: AbortSignal.timeout(6000),
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
    });
    if (!response.ok) return null;

    // Check content type
    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('text/html')) {
      console.log(`   Skipping non-HTML content: ${contentType}`);
      return null;
    }

    // Limit response size to 500KB to prevent memory issues
    const text = await response.text();
    const html = text.slice(0, 500000);
    const $ = cheerio.load(html);

    // Remove noise
    $('nav, header, footer, aside, script, style, .nav, .menu, .sidebar').remove();

    // Try bio-specific selectors first
    const bioSelectors = [
      '.bio', '.biography', '.profile-bio', '.about-text', '.profile-content',
      '[class*="biography"]', '[class*="bio-text"]', 'article', 'main', '.content'
    ];

    let content = '';
    for (const sel of bioSelectors) {
      const text = $(sel).text().trim().replace(/\s+/g, ' ');
      if (text.length > 100 && text.length < 5000) {
        content = text;
        break;
      }
    }

    // Fallback to paragraphs
    if (!content) {
      content = $('p').map((i, el) => $(el).text().trim()).get()
        .filter(p => p.length > 40).slice(0, 5).join(' ');
    }

    // Extract education section
    let education = extractSection($, ['education', 'academic background', 'degrees']);
    
    // Extract experience section
    let experience = extractSection($, ['experience', 'career', 'background']);

    return {
      url,
      content: content.slice(0, 2500),
      education: education?.slice(0, 400),
      experience: experience?.slice(0, 400),
      title: $('h1').first().text().trim() || $('title').text().trim()
    };

  } catch (err) {
    console.log(`   Bio scrape error: ${err.message}`);
    return null;
  }
}

function extractSection($, headings) {
  for (const heading of headings) {
    const header = $('h2, h3, h4, strong').filter((i, el) =>
      $(el).text().toLowerCase().includes(heading)
    ).first();

    if (header.length) {
      let content = '';
      let next = header.parent().next();
      if (!next.length) next = header.next();

      for (let i = 0; i < 5 && next.length; i++) {
        const text = next.text().trim();
        if (text.length > 10) content += text + ' ';
        if (next.is('h2, h3, h4')) break;
        next = next.next();
      }

      if (content.length > 20) return content.trim();
    }
  }
  return null;
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

function guessDomain(institution) {
  // Don't guess - require email domain for reliability
  return null;
}

export default { findBioPage, scrapeBioContent };
