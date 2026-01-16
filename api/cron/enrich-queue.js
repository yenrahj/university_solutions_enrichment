// api/cron/enrich-queue.js
// Prospect enrichment for AllCampus outreach

import { getContactsInList, updateContactWithEnrichment } from '../../lib/hubspot-client.js';
import { getInstitutionData } from '../../lib/scrapers/ipeds.js';
import { getCompletionsTrends } from '../../lib/scrapers/completions.js';
import { getScholarData } from '../../lib/scrapers/scholar.js';
import { findBioPage, scrapeBioContent } from '../../lib/scrapers/bio-finder.js';
import { getInstitutionNews } from '../../lib/scrapers/news-finder.js';
import { analyzeProspect } from '../../lib/enricher.js';

export const config = { maxDuration: 800 };

// Configuration
const LIST_ID = process.env.HUBSPOT_LIST_ID || '1241';
const BATCH_SIZE = 8;

export default async function handler(req, res) {
  const startTime = Date.now();
  console.log('\n' + '═'.repeat(50));
  console.log('  ALLCAMPUS PROSPECT ENRICHMENT');
  console.log('═'.repeat(50));

  try {
    // Process in smaller batches to avoid memory issues
    const contacts = await getContactsInList(LIST_ID, BATCH_SIZE);
    if (contacts.length === 0) {
      return res.status(200).json({ message: 'Queue empty' });
    }

    const results = { processed: 0, failed: 0, names: [] };

    for (const contact of contacts) {
      const name = `${contact.firstName || ''} ${contact.lastName || ''}`.trim();
      if (!name || !contact.company) continue;

      // Time check - stop at 5 min to avoid memory issues
      if (Date.now() - startTime > 300000) {
        console.log('⏱️ Time limit - stopping');
        break;
      }

      console.log(`\n👤 ${name} @ ${contact.company}`);

      try {
        const result = await enrichContact(contact, name);
        results.processed++;
        results.names.push(name);
        console.log(`✅ Done - ${result.sources.join(', ')}`);
      } catch (err) {
        console.error(`❌ ${err.message}`);
        results.failed++;
      }
    }

    const time = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`\n═══ ${results.processed} contacts in ${time}s ═══\n`);

    return res.status(200).json({ 
      success: true, 
      processed: results.processed, 
      failed: results.failed,
      time,
      contacts: results.names
    });
  } catch (error) {
    console.error('Fatal:', error);
    return res.status(500).json({ error: error.message });
  }
}

async function enrichContact(contact, name) {
  const domain = contact.email?.split('@')[1];
  const sources = [];
  const data = { bio: null, ipeds: null, completions: null, scholar: null, news: [] };

  // Parallel fetch: IPEDS, Completions, Scholar, News, Bio
  const [ipedsResult, completionsResult, scholarResult, newsResult, bioUrl] = await Promise.all([
    timeout(getInstitutionData(contact.company), 6000).catch(() => null),
    Promise.resolve(getCompletionsTrends(contact.company)).catch(() => null),
    timeout(getScholarData(name, contact.company), 6000).catch(() => null),
    timeout(getInstitutionNews(contact.company, domain), 8000).catch(() => []),
    timeout(findBioPage(name, contact.title, contact.company, domain), 10000).catch(() => null)
  ]);

  if (ipedsResult) {
    data.ipeds = ipedsResult;
    sources.push('IPEDS');
    console.log(`   ✓ IPEDS: ${ipedsResult.enrollment?.total?.toLocaleString() || '?'} students`);
  }

  if (completionsResult?.institutionMatched) {
    data.completions = completionsResult;
    sources.push('Completions');
    console.log(`   ✓ Completions: ${completionsResult.overall.startCompletions} → ${completionsResult.overall.endCompletions} (${completionsResult.overall.growthPct}%)`);
  }

  if (scholarResult) {
    data.scholar = scholarResult;
    sources.push('Scholar');
    console.log(`   ✓ Scholar: ${scholarResult.citations || 0} citations`);
  }

  if (newsResult?.length > 0) {
    data.news = newsResult;
    sources.push('News');
    console.log(`   ✓ News: ${newsResult.length} articles`);
  }

  // Scrape bio if found
  if (bioUrl) {
    console.log(`   ✓ Bio URL: ${bioUrl}`);
    const bioContent = await timeout(scrapeBioContent(bioUrl, name), 5000).catch(() => null);
    if (bioContent?.content) {
      data.bio = bioContent;
      sources.push('Bio');
      console.log(`   ✓ Bio scraped: ${bioContent.content.length} chars`);
    }
  }

  // Analyze with OpenAI
  console.log('   🤖 Analyzing...');
  const analysis = await analyzeProspect({ name, title: contact.title, institution: contact.company, ...data, sources });

  // Update HubSpot
  await updateContactWithEnrichment(contact.id, analysis);
  console.log('   📤 HubSpot updated');

  return { sources };
}

function timeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), ms))
  ]);
}
