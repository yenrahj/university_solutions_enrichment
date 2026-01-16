// lib/scrapers/completions.js
// Online graduate program completions trends from IPEDS data

import { readFileSync } from 'fs';
import { parse } from 'csv-parse/sync';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

let completionsData = null;

/**
 * Load and parse the completions CSV (cached after first load)
 */
function loadData() {
  if (completionsData) return completionsData;
  
  try {
    // Resolve path relative to this file
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);
    const csvPath = join(__dirname, '../../data/completions.csv');
    
    console.log(`   Loading completions CSV from: ${csvPath}`);
    
    const raw = readFileSync(csvPath, 'utf-8');
    console.log(`   CSV loaded: ${raw.length} bytes`);
    
    const records = parse(raw, { columns: true, skip_empty_lines: true });
    
    // Index by institution name (lowercase for matching)
    completionsData = {};
    for (const row of records) {
      const inst = row.Institution?.toLowerCase().trim();
      if (!inst) continue;
      
      if (!completionsData[inst]) {
        completionsData[inst] = [];
      }
      
      completionsData[inst].push({
        program: row.CIPCODE_LABEL?.replace(/\.$/, '').trim(),
        cipCode: row.CIPCODE,
        year: parseInt(row.ConferralYear),
        completions: parseInt(row.Completions) || 0
      });
    }
    
    console.log(`Loaded completions data: ${Object.keys(completionsData).length} institutions`);
    return completionsData;
  } catch (err) {
    console.error(`Failed to load completions CSV: ${err.message}`);
    return {};
  }
}

/**
 * Find institution in data (fuzzy match)
 */
function findInstitution(name) {
  const data = loadData();
  const nameLower = name.toLowerCase().trim();
  
  // Exact match
  if (data[nameLower]) return data[nameLower];
  
  // Try common variations
  const variations = [
    nameLower,
    nameLower.replace(' university', ''),
    nameLower.replace(' college', ''),
    nameLower.replace('university of ', ''),
    nameLower.replace('the ', ''),
    nameLower.replace(/-/g, ' '),
    nameLower.replace(/st\./g, 'saint'),
    nameLower.replace(/saint/g, 'st.')
  ];
  
  for (const variant of variations) {
    if (data[variant]) return data[variant];
  }
  
  // Fuzzy: find best match by word overlap
  const nameWords = new Set(nameLower.split(/\s+/));
  let bestMatch = null;
  let bestScore = 0;
  
  for (const key of Object.keys(data)) {
    const keyWords = new Set(key.split(/\s+/));
    let score = 0;
    for (const word of nameWords) {
      if (word.length > 2 && keyWords.has(word)) score++;
    }
    if (score > bestScore && score >= 2) {
      bestScore = score;
      bestMatch = key;
    }
  }
  
  return bestMatch ? data[bestMatch] : null;
}

/**
 * Get completions trends for an institution
 */
export function getCompletionsTrends(institutionName) {
  console.log(`   Looking up completions for: ${institutionName}`);
  
  const records = findInstitution(institutionName);
  
  if (!records || records.length === 0) {
    console.log(`   No completions data found for: ${institutionName}`);
    return null;
  }
  
  console.log(`   Found ${records.length} completion records`);
  
  // Group by program
  const byProgram = {};
  for (const r of records) {
    if (!byProgram[r.program]) {
      byProgram[r.program] = { cipCode: r.cipCode, years: {} };
    }
    byProgram[r.program].years[r.year] = r.completions;
  }
  
  // Calculate trends for each program
  const programTrends = [];
  let totalStart = 0;
  let totalEnd = 0;
  
  for (const [program, data] of Object.entries(byProgram)) {
    const years = Object.keys(data.years).map(Number).sort();
    const startYear = Math.min(...years);
    const endYear = Math.max(...years);
    const startVal = data.years[startYear] || 0;
    const endVal = data.years[endYear] || 0;
    
    totalStart += startVal;
    totalEnd += endVal;
    
    // Skip programs with no completions
    if (startVal === 0 && endVal === 0) continue;
    
    // Calculate growth
    let growthPct = null;
    let trend = 'stable';
    
    if (startVal > 0 && endVal > 0) {
      growthPct = Math.round(((endVal - startVal) / startVal) * 100);
      if (growthPct > 20) trend = 'growing';
      else if (growthPct < -20) trend = 'declining';
    } else if (startVal === 0 && endVal > 0) {
      trend = 'new';
      growthPct = null;
    } else if (startVal > 0 && endVal === 0) {
      trend = 'discontinued';
      growthPct = -100;
    }
    
    programTrends.push({
      program,
      cipCode: data.cipCode,
      startYear,
      endYear,
      startCompletions: startVal,
      endCompletions: endVal,
      growthPct,
      trend,
      yearlyData: data.years
    });
  }
  
  // Sort by end completions (biggest programs first)
  programTrends.sort((a, b) => b.endCompletions - a.endCompletions);
  
  // Calculate overall trend
  let overallGrowth = null;
  if (totalStart > 0) {
    overallGrowth = Math.round(((totalEnd - totalStart) / totalStart) * 100);
  }
  
  // Identify notable trends
  const growing = programTrends.filter(p => p.trend === 'growing' && p.endCompletions >= 10);
  const declining = programTrends.filter(p => p.trend === 'declining' && p.startCompletions >= 10);
  const largest = programTrends.filter(p => p.endCompletions >= 20).slice(0, 5);
  
  return {
    institutionMatched: true,
    totalPrograms: programTrends.length,
    
    overall: {
      startYear: 2020,
      endYear: 2024,
      startCompletions: totalStart,
      endCompletions: totalEnd,
      growthPct: overallGrowth,
      trend: overallGrowth > 20 ? 'growing' : overallGrowth < -20 ? 'declining' : 'stable'
    },
    
    highlights: {
      fastestGrowing: growing.sort((a, b) => b.growthPct - a.growthPct).slice(0, 3),
      largestPrograms: largest,
      declining: declining.slice(0, 3)
    },
    
    allPrograms: programTrends,
    
    summary: formatSummary(institutionName, totalStart, totalEnd, overallGrowth, growing, declining, largest)
  };
}

/**
 * Format a readable summary for the enrichment
 */
function formatSummary(institution, totalStart, totalEnd, overallGrowth, growing, declining, largest) {
  const lines = [];
  
  lines.push(`=== ONLINE GRADUATE COMPLETIONS TRENDS ===`);
  lines.push(`Institution: ${institution}`);
  lines.push(`Period: 2020-2024`);
  lines.push('');
  
  // Overall
  lines.push(`📊 OVERALL: ${totalStart} → ${totalEnd} completions`);
  if (overallGrowth !== null) {
    const arrow = overallGrowth > 0 ? '↑' : overallGrowth < 0 ? '↓' : '→';
    lines.push(`   ${arrow} ${overallGrowth > 0 ? '+' : ''}${overallGrowth}% change`);
  }
  lines.push('');
  
  // Largest programs
  if (largest.length > 0) {
    lines.push(`📈 LARGEST ONLINE GRAD PROGRAMS (2024):`);
    for (const p of largest) {
      const change = p.growthPct !== null ? ` (${p.growthPct > 0 ? '+' : ''}${p.growthPct}%)` : '';
      lines.push(`   • ${p.program}: ${p.endCompletions} completions${change}`);
    }
    lines.push('');
  }
  
  // Fast growing
  if (growing.length > 0) {
    lines.push(`🚀 FASTEST GROWING:`);
    for (const p of growing) {
      lines.push(`   • ${p.program}: ${p.startCompletions} → ${p.endCompletions} (+${p.growthPct}%)`);
    }
    lines.push('');
  }
  
  // Declining
  if (declining.length > 0) {
    lines.push(`⚠️ DECLINING PROGRAMS:`);
    for (const p of declining) {
      lines.push(`   • ${p.program}: ${p.startCompletions} → ${p.endCompletions} (${p.growthPct}%)`);
    }
    lines.push('');
  }
  
  // Sales insight
  lines.push(`💡 SALES INSIGHT:`);
  if (overallGrowth !== null && overallGrowth > 30) {
    lines.push(`   Strong online grad growth suggests successful infrastructure - ACL can help scale further or launch adjacent programs.`);
  } else if (overallGrowth !== null && overallGrowth < -10) {
    lines.push(`   Declining completions may indicate enrollment challenges - ACL marketing/enrollment services could help reverse trend.`);
  } else if (totalEnd < 100) {
    lines.push(`   Smaller online footprint - ACL can help grow existing programs or launch new ones efficiently.`);
  } else {
    lines.push(`   Established online presence - explore program-specific opportunities or new program launches.`);
  }
  
  return lines.join('\n');
}

export default { getCompletionsTrends };
