const LINEAR_URL = 'https://api.linear.app/graphql';
const QUERY = `query($id: String!) {
  issue(id: $id) {
    identifier
    title
    description
    state { name }
  }
}`;

async function fetchOne(id, { apiKey, fetch, timeoutMs }) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(LINEAR_URL, {
      method: 'POST',
      headers: { Authorization: apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: QUERY, variables: { id } }),
      signal: controller.signal,
    });
    if (!res.ok) return null;
    const json = await res.json();
    const issue = json && json.data && json.data.issue;
    if (!issue) return null;
    return {
      id: issue.identifier || id,
      title: issue.title || '',
      description: issue.description || '',
      state: (issue.state && issue.state.name) || '',
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function fetchTickets(ticketIds, options = {}) {
  if (!ticketIds || ticketIds.length === 0) return new Map();
  const { apiKey, fetch = globalThis.fetch, timeoutMs = 5000 } = options;
  if (!apiKey) throw new Error('fetchTickets: apiKey is required');

  const settled = await Promise.allSettled(
    ticketIds.map((id) => fetchOne(id, { apiKey, fetch, timeoutMs }))
  );

  const out = new Map();
  ticketIds.forEach((id, i) => {
    const r = settled[i];
    if (r.status === 'fulfilled' && r.value) out.set(id, r.value);
  });
  return out;
}

module.exports = { fetchTickets };
