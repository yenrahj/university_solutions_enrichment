// lib/hubspot-client.js
// HubSpot API client

const API = 'https://api.hubapi.com';
const TOKEN = process.env.HUBSPOT_ACCESS_TOKEN;

export async function getContactsInList(listId, limit = 10) {
  // Get more contacts than needed so we can filter out already-enriched ones
  const url = `${API}/contacts/v1/lists/${listId}/contacts/all?count=${Math.min(limit * 3, 100)}&property=email&property=firstname&property=lastname&property=company&property=jobtitle&property=prospect_research_summary`;

  console.log(`Fetching from list ${listId}...`);
  
  const response = await fetch(url, {
    headers: { 'Authorization': `Bearer ${TOKEN}` },
    signal: AbortSignal.timeout(10000)
  });

  if (!response.ok) {
    const errText = await response.text();
    console.error(`HubSpot API error: ${response.status} - ${errText}`);
    throw new Error(`HubSpot: ${response.status}`);
  }

  const data = await response.json();
  
  console.log(`API returned ${data.contacts?.length || 0} contacts`);

  // Map and filter out already-enriched contacts
  const contacts = (data.contacts || [])
    .map(c => ({
      id: c.vid,
      email: c.properties?.email?.value,
      firstName: c.properties?.firstname?.value,
      lastName: c.properties?.lastname?.value,
      company: c.properties?.company?.value,
      title: c.properties?.jobtitle?.value,
      alreadyEnriched: !!c.properties?.prospect_research_summary?.value
    }))
    .filter(c => !c.alreadyEnriched)
    .slice(0, limit);

  console.log(`After filtering: ${contacts.length} unenriched contacts`);
  
  return contacts;
}

export async function updateContactWithEnrichment(contactId, enrichment) {
  const response = await fetch(`${API}/crm/v3/objects/contacts/${contactId}`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      properties: {
        prospect_research_summary: enrichment.formatted_summary || 'Enrichment failed'
      }
    }),
    signal: AbortSignal.timeout(10000)
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`HubSpot update: ${err}`);
  }

  return response.json();
}

export default { getContactsInList, updateContactWithEnrichment };
