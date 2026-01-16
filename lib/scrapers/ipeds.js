// lib/scrapers/ipeds.js
// IPEDS data via College Scorecard API

const API_KEY = process.env.DATA_GOV_API_KEY || 'DEMO_KEY';
const API_URL = 'https://api.data.gov/ed/collegescorecard/v1/schools';

export async function getInstitutionData(institutionName) {
  if (!institutionName) return null;

  try {
    const fields = [
      'school.name', 'school.city', 'school.state', 'school.ownership',
      'latest.student.size', 'latest.student.enrollment.grad_12_month',
      'latest.admissions.admission_rate.overall',
      'latest.cost.tuition.in_state', 'latest.cost.tuition.out_of_state'
    ].join(',');

    const url = `${API_URL}?school.name=${encodeURIComponent(institutionName)}&api_key=${API_KEY}&fields=${fields}&per_page=5`;

    const response = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!response.ok) return null;

    const data = await response.json();
    if (!data.results?.length) return null;

    // Find best match
    const match = findBestMatch(data.results, institutionName);
    if (!match) return null;

    return {
      name: match['school.name'],
      location: { city: match['school.city'], state: match['school.state'] },
      type: { 1: 'Public', 2: 'Private nonprofit', 3: 'Private for-profit' }[match['school.ownership']] || 'Unknown',
      enrollment: {
        total: match['latest.student.size'],
        graduate: match['latest.student.enrollment.grad_12_month']
      },
      admissions: {
        acceptanceRate: match['latest.admissions.admission_rate.overall']
      },
      cost: {
        inState: match['latest.cost.tuition.in_state'],
        outOfState: match['latest.cost.tuition.out_of_state']
      }
    };

  } catch (err) {
    console.log(`   IPEDS error: ${err.message}`);
    return null;
  }
}

function findBestMatch(results, target) {
  const targetLower = target.toLowerCase();
  const targetWords = new Set(targetLower.split(/\s+/));

  let best = null;
  let bestScore = 0;

  for (const r of results) {
    const name = (r['school.name'] || '').toLowerCase();
    
    // Exact match
    if (name === targetLower) return r;

    // Word overlap
    const words = new Set(name.split(/\s+/));
    let score = 0;
    for (const w of targetWords) {
      if (words.has(w)) score++;
    }

    if (score > bestScore) {
      bestScore = score;
      best = r;
    }
  }

  return bestScore >= 2 ? best : null;
}

export default { getInstitutionData };
