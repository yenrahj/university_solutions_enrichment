// lib/scrapers/scholar.js
// Semantic Scholar API - free, no key required

const API_URL = 'https://api.semanticscholar.org/graph/v1';

export async function getScholarData(name, institution) {
  if (!name) return null;

  try {
    const url = `${API_URL}/author/search?query=${encodeURIComponent(name)}&fields=name,affiliations,paperCount,citationCount,hIndex`;

    const response = await fetch(url, {
      signal: AbortSignal.timeout(6000),
      headers: { 'User-Agent': 'AllCampus-Enrichment/1.0' }
    });

    if (!response.ok) return null;

    const data = await response.json();
    if (!data.data?.length) return null;

    // Find best match by institution
    const match = findBestMatch(data.data, name, institution);
    if (!match) return null;

    // Get research topics from papers
    const topics = await getAuthorTopics(match.authorId);

    return {
      name: match.name,
      citations: match.citationCount || 0,
      hIndex: match.hIndex || 0,
      papers: match.paperCount || 0,
      topics
    };

  } catch (err) {
    console.log(`   Scholar error: ${err.message}`);
    return null;
  }
}

function findBestMatch(authors, targetName, institution) {
  const nameParts = targetName.toLowerCase().split(/\s+/);
  const lastName = nameParts[nameParts.length - 1];
  const instLower = institution?.toLowerCase() || '';

  let best = null;
  let bestScore = 0;

  for (const author of authors) {
    const authorName = (author.name || '').toLowerCase();
    let score = 0;

    // Name match
    if (authorName.includes(lastName)) score += 5;
    if (authorName === targetName.toLowerCase()) score += 5;

    // Institution match
    if (instLower && author.affiliations) {
      for (const aff of author.affiliations) {
        if (aff.toLowerCase().includes(instLower) || instLower.includes(aff.toLowerCase())) {
          score += 8;
          break;
        }
      }
    }

    // Prefer authors with citations
    if (author.citationCount > 100) score += 2;

    if (score > bestScore) {
      bestScore = score;
      best = author;
    }
  }

  return bestScore >= 5 ? best : null;
}

async function getAuthorTopics(authorId) {
  try {
    const url = `${API_URL}/author/${authorId}?fields=papers.fieldsOfStudy`;
    const response = await fetch(url, {
      signal: AbortSignal.timeout(4000),
      headers: { 'User-Agent': 'AllCampus-Enrichment/1.0' }
    });

    if (!response.ok) return [];

    const data = await response.json();
    const topicCounts = {};

    for (const paper of data.papers || []) {
      for (const field of paper.fieldsOfStudy || []) {
        topicCounts[field] = (topicCounts[field] || 0) + 1;
      }
    }

    return Object.entries(topicCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([topic]) => topic);

  } catch { return []; }
}

export default { getScholarData };
