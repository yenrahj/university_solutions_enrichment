# AllCampus Prospect Enrichment Tool

Automated prospect intelligence gathering for AllCampus sales outreach.

## What It Does

1. Pulls contacts from HubSpot list (default: 1241)
2. Gathers intelligence from multiple sources:
   - IPEDS enrollment data
   - Online program completions trends (2020-2024)
   - Google Scholar (for academic contacts)
   - Recent news and announcements
   - Bio pages
3. Uses OpenAI to analyze and synthesize findings
4. Writes enrichment summary back to HubSpot

## Key Features

- **Contact Scope Detection**: Identifies if contact is institutional-level, college-level, department-level, or program-level
- **Division-Filtered Data**: Only includes data relevant to the contact's scope
- **Evidence-Based Analysis**: No unfounded assumptions - only reports what the data shows
- **Self-Reference Handling**: Uses "your" not their name when news is about the contact

## Environment Variables

```
HUBSPOT_ACCESS_TOKEN=your-hubspot-token
OPENAI_API_KEY=your-openai-key
HUBSPOT_LIST_ID=1241 (optional, defaults to 1241)
GOOGLE_CSE_ID=your-google-cse-id
GOOGLE_API_KEY=your-google-api-key
DATA_GOV_API_KEY=your-data-gov-key
```

## Deployment

Deploy to Vercel and set up a cron job to run the enrichment queue.

## Output

Creates a formatted "Prospect Intelligence Report" in HubSpot with:
- Contact scope (institutional/college/department/program)
- Executive summary
- Evidence-based findings
- IPEDS program data (filtered to scope)
- Recent news
- AllCampus fit analysis
- Personalization hooks
- Conversation strategy
