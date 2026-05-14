function extractTickets(commits, ticketPattern) {
  const re = new RegExp(ticketPattern, 'gi');
  const globalSeen = new Set();
  const uniqueTicketIds = [];

  const enriched = commits.map((commit) => {
    const haystack = `${commit.subject || ''}\n${commit.body || ''}`;
    const matches = haystack.match(re) || [];
    const seen = new Set();
    const ticketIds = [];
    for (const m of matches) {
      const id = m.toUpperCase();
      if (!seen.has(id)) {
        seen.add(id);
        ticketIds.push(id);
      }
      if (!globalSeen.has(id)) {
        globalSeen.add(id);
        uniqueTicketIds.push(id);
      }
    }
    return { ...commit, ticketIds };
  });

  return { commits: enriched, uniqueTicketIds };
}

module.exports = { extractTickets };
