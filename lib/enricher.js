// lib/enricher.js
// Strategic prospect intelligence for AllCampus outreach

import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/**
 * Analyze prospect data and create comprehensive outreach strategy
 */
export async function analyzeProspect(data) {
  const { name, title, institution, bio, ipeds, scholar, news, sources } = data;

  const context = buildContext(data);
  const confidence = sources.length >= 3 ? 'high' : sources.length >= 2 ? 'medium' : 'low';

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-5.1',
      max_completion_tokens: 6000,
      response_format: { type: "json_object" },
      messages: [
        {
          role: 'system',
          content: `You are a senior sales strategist for AllCampus, creating comprehensive outreach strategies for higher education prospects.

**ABOUT ALLCAMPUS:**
AllCampus is a leading higher education management provider. Tagline: "Your partner for the future of education."

We are lifelong learners, quantitative data geeks, and creative thinkers with a mission to make higher education more affordable, more accessible, and more equitable.

**CRITICAL: ONLINE PROGRAM FOCUS**
AllCampus specializes in ONLINE programs. This is our primary focus:
- The vast majority of our work is with online degree programs
- We can support hybrid or on-campus modalities, but ONLY if there's also an online version of the program
- When analyzing prospects, prioritize their online program presence, growth, and potential
- Our value proposition centers on growing online enrollments specifically

**CREDIBILITY:**
- Partner with over 20 of the top 50 U.S. universities
- ~130 ONLINE programs across 25+ institutions
- 90% median retention rate among recruited students
- Online MBA program grew from under 150 to over 800 students
- Online MSW programs nearly tripled enrollment
- Enrollment specialists average 8 years experience
- Partners include: USC, UCLA, Boston University, Purdue, Northeastern, GWU, SMU, Wake Forest, Tulane, DePaul, Emory, University of Florida

**OUR SERVICES:**

📣 **Marketing & Recruitment** (CORE STRENGTH)
- Paid search, SEO, social media, affiliate marketing
- Creative content and landing page optimization
- "The AC Formula" - data-inspired, adaptive methodology
- Lead nurturing sequences

📞 **Enrollment Services** (CORE STRENGTH)
- Dedicated advisors who become "a true extension of your institution"
- "Conversations, never scripts" - no scripted calls
- "Pleasant and proactive" approach
- Speed-to-lead response, multi-channel outreach
- Application coaching, financial aid guidance
- Specialists average 8 years experience

🎯 **Student & Retention Services** (CORE STRENGTH)
- Success coaching and early alerts
- Retention analytics and proactive outreach
- 90% median retention rate
- Pre-class coaching to set expectations

📊 **New Program Viability / Market Research**
- Demand analysis and market sizing
- Competitive landscape assessment
- IPEDS data analysis
- Program prioritization and ROI modeling

🏢 **Employer Partnerships**
- Corporate education network
- Tuition reimbursement program integration
- B2B channel to employer-funded learners
- Workforce development connections

🎓 **Course Design & Development** (OPTIONAL - only if explicit need)
- Instructional design expertise
- Multimedia production
- LMS integration
- Only mention if there's clear evidence they need this

**PRICING MODELS:**
- **Revenue Share**: We handle upfront costs, full service suite
- **Fee-for-Service**: Institution invests upfront, flexible bundled services  
- **Hybrid**: Combination of both models

**YOUR JOB:**
Create a COMPREHENSIVE OUTREACH STRATEGY that tells the email writer:
1. Who this person is and how they think
2. What tone and communication style to use
3. What their likely pain points are (with evidence)
4. Exactly what to say in each email
5. Which services to emphasize and why
6. What objections to anticipate
7. What specific details to reference

**CRITICAL RULES:**

1. **NO UNFOUNDED ASSUMPTIONS** - Only state things you have evidence for. If data is missing, say so. Never fabricate pain points.

2. **CONTACT SCOPE** - Determine their organizational scope:
   - President, Provost, VP, CAO → INSTITUTIONAL (all data relevant)
   - Dean, Associate Dean → COLLEGE/SCHOOL (only their college's programs)
   - Department Chair/Head → DEPARTMENT (only their department)
   - Program Director/Chair → PROGRAM (only their specific program)

3. **FILTER DATA TO SCOPE** - If they're Dean of Business, ONLY analyze business programs. Ignore nursing, education, etc.

4. **SELF-REFERENCE RULE** - When news is about the contact themselves:
   - ✅ "your recent appointment as Dean"
   - ❌ "Dr. Smith's appointment as Dean"

5. **COURSE DESIGN RESTRAINT** - Only recommend emphasizing course design if:
   - News mentions course quality issues
   - Accreditation concerns about online delivery
   - Explicit statements about needing instructional design
   - Otherwise, DO NOT recommend it

6. **BE SPECIFIC** - Generic strategies fail. Every recommendation must tie to specific data from the research.

Output valid JSON only.`
        },
        {
          role: 'user',
          content: `Create a comprehensive outreach strategy for this prospect:

PROSPECT: ${name}
TITLE: ${title || 'Unknown'}
INSTITUTION: ${institution}

${context}

Return JSON with this structure:

{
  "contact_profile": {
    "scope_level": "INSTITUTIONAL|COLLEGE|DEPARTMENT|PROGRAM",
    "division": "Their specific division or 'Institution-wide'",
    "relevant_programs": ["Only programs within their scope"],
    "scope_reasoning": "How you determined scope from title"
  },

  "persona_analysis": {
    "leader_type": "Data-Driven Operator | Relationship Builder | Innovator/Visionary | Risk-Averse Administrator | Growth-Focused Strategist",
    "persona_evidence": "What in their bio/news suggests this persona type",
    "likely_priorities": ["Based on their role and evidence, what they probably care about"],
    "communication_preferences": "How this persona type prefers to receive information"
  },

  "tone_strategy": {
    "recommended_tone": "Formal/Professional | Collegial/Peer-to-peer | Warm/Consultative | Direct/Efficient",
    "formality_level": "High | Medium | Low",
    "technical_depth": "High (use data/metrics) | Medium (balance) | Low (focus on outcomes)",
    "urgency_level": "High (time-sensitive hooks) | Medium (opportunity-focused) | Low (relationship-building)",
    "tone_reasoning": "Why this tone fits this person",
    "phrases_to_use": ["Specific phrases that would resonate"],
    "phrases_to_avoid": ["What would turn them off"]
  },

  "evidence_summary": {
    "confirmed_facts": ["Only things with direct evidence from the data"],
    "inferred_insights": ["Reasonable inferences with stated reasoning"],
    "data_gaps": ["Important missing information"],
    "news_about_contact_personally": "Any news specifically about this person (for self-reference rule)"
  },

  "pain_point_analysis": {
    "primary_pain": {
      "pain": "The most likely challenge they face",
      "evidence": "What data supports this",
      "allcampus_solution": "How AllCampus addresses this",
      "email_to_mention": "Which email should lead with this (1, 3, or 4)"
    },
    "secondary_pain": {
      "pain": "Second most likely challenge",
      "evidence": "What data supports this",
      "allcampus_solution": "How AllCampus addresses this",
      "email_to_mention": "Which email should use this angle"
    },
    "tertiary_pain": {
      "pain": "Third challenge or opportunity",
      "evidence": "What data supports this",
      "allcampus_solution": "How AllCampus addresses this",
      "email_to_mention": "Which email should use this angle"
    }
  },

  "service_prioritization": {
    "primary_service": {
      "service": "Marketing & Recruitment | Enrollment Services | Retention Services | Market Research | Employer Partnerships | Course Design",
      "why_primary": "Specific reason tied to their situation",
      "proof_point": "Which case study or stat to reference"
    },
    "secondary_service": {
      "service": "Second most relevant service",
      "why_relevant": "Specific reason",
      "when_to_mention": "Which email"
    },
    "services_to_avoid": ["Services NOT to mention and why"],
    "course_design_appropriate": "YES with evidence | NO | INSUFFICIENT DATA"
  },

  "email_by_email_strategy": {
    "email_1": {
      "purpose": "The Hook - grab attention with something specific",
      "lead_with": "Exact detail to open with (news, data point, initiative)",
      "angle": "The specific angle/framing",
      "tone_note": "Any tone adjustments for this email",
      "word_count": "50-75"
    },
    "email_2": {
      "purpose": "The Proof - credibility through results",
      "pivot_to": "What angle to take (different from Email 1)",
      "case_study": "Which AllCampus result to reference and how to phrase it",
      "connection": "How this connects to their situation",
      "word_count": "40-60"
    },
    "email_3": {
      "purpose": "The Value - explain how AllCampus helps",
      "lead_with": "Different hook than Emails 1-2",
      "service_focus": "Which service(s) to emphasize",
      "value_prop": "The specific value proposition to articulate",
      "include_calendar": true,
      "word_count": "90-120"
    },
    "email_4": {
      "purpose": "Fresh Thread - new angle, new subject line",
      "new_angle": "Completely different approach than Emails 1-3",
      "detail_to_reference": "Different research detail to use",
      "service_focus": "Different service emphasis",
      "include_calendar": true,
      "word_count": "90-120"
    },
    "email_5": {
      "purpose": "The Close - graceful wrap-up",
      "circle_back_to": "Reference from Email 1 to create continuity",
      "easy_out": "Give them a graceful way to decline",
      "include_calendar": true,
      "word_count": "40-60"
    }
  },

  "specific_references": {
    "must_mention": ["Specific details that MUST be referenced (news, data, initiatives)"],
    "good_to_mention": ["Optional details that could strengthen emails"],
    "do_not_mention": ["Things to avoid (other divisions' data, sensitive topics, etc.)"]
  },

  "objection_anticipation": {
    "likely_objections": [
      {
        "objection": "What they might think or push back on",
        "counter_approach": "How to preemptively address or respond"
      }
    ],
    "trust_builders": ["What would build credibility with this specific person"]
  },

  "subject_line_suggestions": {
    "email_1": "5-8 word subject line suggestion",
    "email_4": "5-8 word subject line for fresh thread"
  },

  "executive_summary": "2-3 sentence summary: Who is this person, what's the strategic approach, and what's the most compelling reason they should talk to AllCampus."
}`
        }
      ]
    });

    const content = completion.choices[0].message.content;
    
    let analysis;
    try {
      analysis = JSON.parse(content);
    } catch (e) {
      console.error('Failed to parse OpenAI response:', e);
      analysis = { error: 'Failed to parse analysis', raw: content };
    }

    // Build formatted summary for HubSpot
    const summary = formatStrategicSummary(analysis, name, institution, data);

    return {
      prospect_research_summary: summary,
      analysis_json: JSON.stringify(analysis),
      data_quality: {
        confidence,
        sources,
        timestamp: new Date().toISOString()
      }
    };

  } catch (error) {
    console.error('OpenAI analysis error:', error);
    throw error;
  }
}

function buildContext(data) {
  const sections = [];

  if (data.bio?.content) {
    let s = '=== BIOGRAPHICAL INFORMATION ===\n';
    s += data.bio.content;
    if (data.bio.sourceUrl) s += `\nSource: ${data.bio.sourceUrl}`;
    sections.push(s);
  }

  if (data.ipeds) {
    let s = '=== IPEDS INSTITUTIONAL DATA ===\n';
    s += 'NOTE: This is ENROLLMENT data (students currently attending).\n\n';
    if (data.ipeds.name) s += `Institution: ${data.ipeds.name}\n`;
    if (data.ipeds.city && data.ipeds.state) s += `Location: ${data.ipeds.city}, ${data.ipeds.state}\n`;
    if (data.ipeds.enrollment?.total) s += `Total Enrollment: ${data.ipeds.enrollment.total.toLocaleString()}\n`;
    if (data.ipeds.enrollment?.graduate) s += `Graduate Enrollment: ${data.ipeds.enrollment.graduate.toLocaleString()}\n`;
    if (data.ipeds.enrollment?.undergraduate) s += `Undergraduate: ${data.ipeds.enrollment.undergraduate.toLocaleString()}\n`;
    sections.push(s);
  }

  if (data.scholar) {
    let s = '=== GOOGLE SCHOLAR ===\n';
    s += `Total Citations: ${data.scholar.citations?.toLocaleString() || 0}\n`;
    s += `h-index: ${data.scholar.hIndex || 0}\n`;
    s += `Published Papers: ${data.scholar.papers || 0}\n`;
    if (data.scholar.topics?.length) {
      s += `Research Areas: ${data.scholar.topics.join(', ')}\n`;
    }
    sections.push(s);
  }

  if (data.news?.length > 0) {
    let s = '=== RECENT NEWS & ANNOUNCEMENTS ===\n';
    s += `Found ${data.news.length} recent articles:\n\n`;
    data.news.forEach((n, i) => {
      s += `[${i + 1}] "${n.headline}"\n`;
      if (n.date) s += `    Date: ${n.date}\n`;
      if (n.summary) s += `    Summary: ${n.summary}\n`;
      if (n.url) s += `    URL: ${n.url}\n`;
      s += '\n';
    });
    sections.push(s);
  }

  if (data.completions?.institutionMatched) {
    let s = '=== ONLINE GRADUATE DEGREE COMPLETIONS (IPEDS 2020-2024) ===\n';
    s += 'IMPORTANT: This is DEGREES AWARDED, not enrollment. Completions = graduates.\n\n';
    
    const c = data.completions;
    s += `Total Online Grad Completions: ${c.overall.startCompletions} (2020) → ${c.overall.endCompletions} (2024)\n`;
    s += `5-Year Change: ${c.overall.growthPct > 0 ? '+' : ''}${c.overall.growthPct}%\n`;
    s += `Trend: ${c.overall.trend.toUpperCase()}\n\n`;
    
    if (c.highlights.largestPrograms?.length > 0) {
      s += `Largest Online Grad Programs (2024 completions):\n`;
      c.highlights.largestPrograms.forEach(p => {
        s += `  • ${p.program}: ${p.endCompletions} graduates`;
        if (p.growthPct !== null) s += ` [${p.growthPct > 0 ? '+' : ''}${p.growthPct}% since 2020]`;
        s += '\n';
      });
      s += '\n';
    }
    
    if (c.highlights.fastestGrowing?.length > 0) {
      s += `Fastest Growing Programs:\n`;
      c.highlights.fastestGrowing.forEach(p => {
        s += `  • ${p.program}: ${p.startCompletions} → ${p.endCompletions} [+${p.growthPct}%]\n`;
      });
      s += '\n';
    }
    
    if (c.highlights.declining?.length > 0) {
      s += `DECLINING Programs:\n`;
      c.highlights.declining.forEach(p => {
        s += `  • ${p.program}: ${p.startCompletions} → ${p.endCompletions} [${p.growthPct}%]\n`;
      });
      s += '\n';
    }
    
    sections.push(s);
  }

  return sections.join('\n\n') || 'Limited data available for this prospect.';
}

function formatStrategicSummary(analysis, name, institution, rawData) {
  const lines = [];
  
  lines.push('╔══════════════════════════════════════════════════════════════════════════════╗');
  lines.push('║              ALLCAMPUS - STRATEGIC OUTREACH PLAN                            ║');
  lines.push('╚══════════════════════════════════════════════════════════════════════════════╝');
  lines.push('');

  // Executive Summary
  if (analysis.executive_summary) {
    lines.push('┌──────────────────────────────────────────────────────────────────────────────┐');
    lines.push('│ 📋 EXECUTIVE SUMMARY                                                         │');
    lines.push('└──────────────────────────────────────────────────────────────────────────────┘');
    lines.push(analysis.executive_summary);
    lines.push('');
  }

  // Contact Profile & Scope
  if (analysis.contact_profile) {
    lines.push('┌──────────────────────────────────────────────────────────────────────────────┐');
    lines.push('│ 🎯 CONTACT SCOPE                                                             │');
    lines.push('└──────────────────────────────────────────────────────────────────────────────┘');
    const p = analysis.contact_profile;
    lines.push(`Scope Level: ${p.scope_level}`);
    lines.push(`Division: ${p.division}`);
    if (p.relevant_programs?.length) {
      lines.push(`Relevant Programs: ${p.relevant_programs.join(', ')}`);
    }
    lines.push('');
  }

  // Persona Analysis
  if (analysis.persona_analysis) {
    lines.push('┌──────────────────────────────────────────────────────────────────────────────┐');
    lines.push('│ 👤 PERSONA ANALYSIS                                                          │');
    lines.push('└──────────────────────────────────────────────────────────────────────────────┘');
    const pa = analysis.persona_analysis;
    lines.push(`Leader Type: ${pa.leader_type}`);
    if (pa.persona_evidence) lines.push(`Evidence: ${pa.persona_evidence}`);
    if (pa.likely_priorities?.length) {
      lines.push(`Likely Priorities:`);
      pa.likely_priorities.forEach(p => lines.push(`  • ${p}`));
    }
    if (pa.communication_preferences) {
      lines.push(`Communication Style: ${pa.communication_preferences}`);
    }
    lines.push('');
  }

  // Tone Strategy
  if (analysis.tone_strategy) {
    lines.push('┌──────────────────────────────────────────────────────────────────────────────┐');
    lines.push('│ 🎨 TONE & COMMUNICATION STRATEGY                                             │');
    lines.push('└──────────────────────────────────────────────────────────────────────────────┘');
    const t = analysis.tone_strategy;
    lines.push(`Recommended Tone: ${t.recommended_tone}`);
    lines.push(`Formality: ${t.formality_level} | Technical Depth: ${t.technical_depth} | Urgency: ${t.urgency_level}`);
    if (t.tone_reasoning) lines.push(`Reasoning: ${t.tone_reasoning}`);
    if (t.phrases_to_use?.length) {
      lines.push(`✓ Phrases to Use: ${t.phrases_to_use.join(' | ')}`);
    }
    if (t.phrases_to_avoid?.length) {
      lines.push(`✗ Phrases to Avoid: ${t.phrases_to_avoid.join(' | ')}`);
    }
    lines.push('');
  }

  // Evidence Summary
  if (analysis.evidence_summary) {
    lines.push('┌──────────────────────────────────────────────────────────────────────────────┐');
    lines.push('│ 📊 EVIDENCE SUMMARY                                                          │');
    lines.push('└──────────────────────────────────────────────────────────────────────────────┘');
    const e = analysis.evidence_summary;
    if (e.confirmed_facts?.length) {
      lines.push('Confirmed Facts:');
      e.confirmed_facts.forEach(f => lines.push(`  ✓ ${f}`));
    }
    if (e.inferred_insights?.length) {
      lines.push('Inferred Insights:');
      e.inferred_insights.forEach(i => lines.push(`  → ${i}`));
    }
    if (e.news_about_contact_personally) {
      lines.push('');
      lines.push(`⚠️ NEWS ABOUT CONTACT: ${e.news_about_contact_personally}`);
      lines.push('   USE "YOUR" NOT THEIR NAME WHEN REFERENCING');
    }
    if (e.data_gaps?.length) {
      lines.push('Data Gaps:');
      e.data_gaps.forEach(g => lines.push(`  ? ${g}`));
    }
    lines.push('');
  }

  // Pain Point Analysis
  if (analysis.pain_point_analysis) {
    lines.push('┌──────────────────────────────────────────────────────────────────────────────┐');
    lines.push('│ 🔥 PAIN POINT ANALYSIS (Ranked)                                              │');
    lines.push('└──────────────────────────────────────────────────────────────────────────────┘');
    const ppa = analysis.pain_point_analysis;
    
    if (ppa.primary_pain) {
      lines.push(`#1 PRIMARY: ${ppa.primary_pain.pain}`);
      lines.push(`   Evidence: ${ppa.primary_pain.evidence}`);
      lines.push(`   Solution: ${ppa.primary_pain.allcampus_solution}`);
      lines.push(`   Use in Email: ${ppa.primary_pain.email_to_mention}`);
      lines.push('');
    }
    if (ppa.secondary_pain) {
      lines.push(`#2 SECONDARY: ${ppa.secondary_pain.pain}`);
      lines.push(`   Evidence: ${ppa.secondary_pain.evidence}`);
      lines.push(`   Solution: ${ppa.secondary_pain.allcampus_solution}`);
      lines.push(`   Use in Email: ${ppa.secondary_pain.email_to_mention}`);
      lines.push('');
    }
    if (ppa.tertiary_pain) {
      lines.push(`#3 TERTIARY: ${ppa.tertiary_pain.pain}`);
      lines.push(`   Evidence: ${ppa.tertiary_pain.evidence}`);
      lines.push(`   Solution: ${ppa.tertiary_pain.allcampus_solution}`);
      lines.push(`   Use in Email: ${ppa.tertiary_pain.email_to_mention}`);
      lines.push('');
    }
  }

  // Service Prioritization
  if (analysis.service_prioritization) {
    lines.push('┌──────────────────────────────────────────────────────────────────────────────┐');
    lines.push('│ 🛠️ SERVICE PRIORITIZATION                                                    │');
    lines.push('└──────────────────────────────────────────────────────────────────────────────┘');
    const sp = analysis.service_prioritization;
    
    if (sp.primary_service) {
      lines.push(`#1 ${sp.primary_service.service}`);
      lines.push(`   Why: ${sp.primary_service.why_primary}`);
      lines.push(`   Proof Point: ${sp.primary_service.proof_point}`);
    }
    if (sp.secondary_service) {
      lines.push(`#2 ${sp.secondary_service.service}`);
      lines.push(`   Why: ${sp.secondary_service.why_relevant}`);
      lines.push(`   Mention in: Email ${sp.secondary_service.when_to_mention}`);
    }
    if (sp.services_to_avoid?.length) {
      lines.push(`✗ Avoid: ${sp.services_to_avoid.join(', ')}`);
    }
    lines.push(`Course Design Appropriate: ${sp.course_design_appropriate}`);
    lines.push('');
  }

  // Email-by-Email Strategy
  if (analysis.email_by_email_strategy) {
    lines.push('┌──────────────────────────────────────────────────────────────────────────────┐');
    lines.push('│ 📧 EMAIL-BY-EMAIL STRATEGY                                                   │');
    lines.push('└──────────────────────────────────────────────────────────────────────────────┘');
    const ebs = analysis.email_by_email_strategy;
    
    if (ebs.email_1) {
      lines.push(`EMAIL 1: ${ebs.email_1.purpose} (${ebs.email_1.word_count} words)`);
      lines.push(`  Lead with: ${ebs.email_1.lead_with}`);
      lines.push(`  Angle: ${ebs.email_1.angle}`);
      if (ebs.email_1.tone_note) lines.push(`  Tone: ${ebs.email_1.tone_note}`);
      lines.push('');
    }
    if (ebs.email_2) {
      lines.push(`EMAIL 2: ${ebs.email_2.purpose} (${ebs.email_2.word_count} words)`);
      lines.push(`  Pivot to: ${ebs.email_2.pivot_to}`);
      lines.push(`  Case Study: ${ebs.email_2.case_study}`);
      lines.push(`  Connection: ${ebs.email_2.connection}`);
      lines.push('');
    }
    if (ebs.email_3) {
      lines.push(`EMAIL 3: ${ebs.email_3.purpose} (${ebs.email_3.word_count} words)`);
      lines.push(`  Lead with: ${ebs.email_3.lead_with}`);
      lines.push(`  Service Focus: ${ebs.email_3.service_focus}`);
      lines.push(`  Value Prop: ${ebs.email_3.value_prop}`);
      lines.push(`  [Include calendar link]`);
      lines.push('');
    }
    if (ebs.email_4) {
      lines.push(`EMAIL 4: ${ebs.email_4.purpose} (${ebs.email_4.word_count} words) - NEW THREAD`);
      lines.push(`  New Angle: ${ebs.email_4.new_angle}`);
      lines.push(`  Reference: ${ebs.email_4.detail_to_reference}`);
      lines.push(`  Service Focus: ${ebs.email_4.service_focus}`);
      lines.push(`  [Include calendar link]`);
      lines.push('');
    }
    if (ebs.email_5) {
      lines.push(`EMAIL 5: ${ebs.email_5.purpose} (${ebs.email_5.word_count} words)`);
      lines.push(`  Circle back to: ${ebs.email_5.circle_back_to}`);
      lines.push(`  Easy out: ${ebs.email_5.easy_out}`);
      lines.push(`  [Include calendar link]`);
      lines.push('');
    }
  }

  // Specific References
  if (analysis.specific_references) {
    lines.push('┌──────────────────────────────────────────────────────────────────────────────┐');
    lines.push('│ 📌 SPECIFIC REFERENCES                                                       │');
    lines.push('└──────────────────────────────────────────────────────────────────────────────┘');
    const sr = analysis.specific_references;
    if (sr.must_mention?.length) {
      lines.push('MUST Mention:');
      sr.must_mention.forEach(m => lines.push(`  ★ ${m}`));
    }
    if (sr.good_to_mention?.length) {
      lines.push('Good to Mention:');
      sr.good_to_mention.forEach(m => lines.push(`  ○ ${m}`));
    }
    if (sr.do_not_mention?.length) {
      lines.push('DO NOT Mention:');
      sr.do_not_mention.forEach(m => lines.push(`  ✗ ${m}`));
    }
    lines.push('');
  }

  // Objection Anticipation
  if (analysis.objection_anticipation) {
    lines.push('┌──────────────────────────────────────────────────────────────────────────────┐');
    lines.push('│ ⚠️ OBJECTION ANTICIPATION                                                    │');
    lines.push('└──────────────────────────────────────────────────────────────────────────────┘');
    const oa = analysis.objection_anticipation;
    if (oa.likely_objections?.length) {
      oa.likely_objections.forEach(o => {
        lines.push(`Objection: "${o.objection}"`);
        lines.push(`  → Counter: ${o.counter_approach}`);
      });
    }
    if (oa.trust_builders?.length) {
      lines.push('');
      lines.push('Trust Builders:');
      oa.trust_builders.forEach(t => lines.push(`  • ${t}`));
    }
    lines.push('');
  }

  // Subject Line Suggestions
  if (analysis.subject_line_suggestions) {
    lines.push('┌──────────────────────────────────────────────────────────────────────────────┐');
    lines.push('│ ✉️ SUBJECT LINE SUGGESTIONS                                                  │');
    lines.push('└──────────────────────────────────────────────────────────────────────────────┘');
    const sls = analysis.subject_line_suggestions;
    if (sls.email_1) lines.push(`Email 1: "${sls.email_1}"`);
    if (sls.email_4) lines.push(`Email 4: "${sls.email_4}"`);
    lines.push('');
  }

  return lines.join('\n');
}

export { buildContext, formatStrategicSummary };
