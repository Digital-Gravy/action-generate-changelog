const { extractTickets } = require('../src/lib/extract-tickets');

const DEFAULT = '[A-Z]{2,10}-\\d+';

describe('extractTickets', () => {
  test('returns empty result for empty commit list', () => {
    expect(extractTickets([], DEFAULT)).toEqual({ commits: [], uniqueTicketIds: [] });
  });

  test('attaches empty ticketIds to commits with no matches', () => {
    const commits = [{ subject: 'feat: no tickets here', body: '' }];
    const result = extractTickets(commits, DEFAULT);
    expect(result.commits[0].ticketIds).toEqual([]);
    expect(result.uniqueTicketIds).toEqual([]);
  });

  test('extracts ticket IDs from commit subject', () => {
    const commits = [{ subject: 'feat(ETC-123): add login', body: '' }];
    const result = extractTickets(commits, DEFAULT);
    expect(result.commits[0].ticketIds).toEqual(['ETC-123']);
    expect(result.uniqueTicketIds).toEqual(['ETC-123']);
  });

  test('extracts ticket IDs from commit body', () => {
    const commits = [{ subject: 'feat: add login', body: 'Closes ETC-456' }];
    const result = extractTickets(commits, DEFAULT);
    expect(result.commits[0].ticketIds).toEqual(['ETC-456']);
  });

  test('dedupes ticket IDs within a single commit', () => {
    const commits = [
      { subject: 'feat(ETC-789): add login', body: 'Closes ETC-789. See ETC-789 for design.' },
    ];
    const result = extractTickets(commits, DEFAULT);
    expect(result.commits[0].ticketIds).toEqual(['ETC-789']);
  });

  test('dedupes ticket IDs globally across commits', () => {
    const commits = [
      { subject: 'feat(ETC-1): one', body: '' },
      { subject: 'fix(ETC-1): two', body: '' },
      { subject: 'feat(ETC-2): three', body: '' },
    ];
    const result = extractTickets(commits, DEFAULT);
    expect(result.uniqueTicketIds.sort()).toEqual(['ETC-1', 'ETC-2']);
  });

  test('matches case-insensitively but normalizes captured IDs to uppercase', () => {
    const commits = [{ subject: 'feat(etc-100): lowercase', body: 'also Etc-100 mid-cap' }];
    const result = extractTickets(commits, DEFAULT);
    expect(result.commits[0].ticketIds).toEqual(['ETC-100']);
    expect(result.uniqueTicketIds).toEqual(['ETC-100']);
  });

  test('extracts multiple distinct tickets from one commit', () => {
    const commits = [{ subject: 'feat: merge ETC-1 and ABC-2', body: 'depends on XYZ-3' }];
    const result = extractTickets(commits, DEFAULT);
    expect(result.commits[0].ticketIds.sort()).toEqual(['ABC-2', 'ETC-1', 'XYZ-3']);
  });

  test('respects a custom ticket pattern', () => {
    const commits = [{ subject: 'fix: closes #JIRA-9999', body: '' }];
    const result = extractTickets(commits, 'JIRA-\\d+');
    expect(result.commits[0].ticketIds).toEqual(['JIRA-9999']);
  });

  test('does not match ticket-like strings the pattern excludes', () => {
    const commits = [{ subject: 'feat: bumped to v1.2.3', body: 'no tickets' }];
    const result = extractTickets(commits, DEFAULT);
    expect(result.commits[0].ticketIds).toEqual([]);
  });

  test('preserves all original commit fields', () => {
    const commits = [
      {
        hash: 'abc',
        author: 'Dev',
        date: '2026-05-14T00:00:00Z',
        subject: 'feat(ETC-1): one',
        body: 'body',
      },
    ];
    const result = extractTickets(commits, DEFAULT);
    expect(result.commits[0]).toMatchObject({
      hash: 'abc',
      author: 'Dev',
      date: '2026-05-14T00:00:00Z',
      subject: 'feat(ETC-1): one',
      body: 'body',
      ticketIds: ['ETC-1'],
    });
  });

  test('uniqueTicketIds preserves first-seen order', () => {
    const commits = [
      { subject: 'feat(BBB-2): two', body: '' },
      { subject: 'feat(AAA-1): one', body: '' },
      { subject: 'feat(BBB-2): again', body: '' },
    ];
    const result = extractTickets(commits, DEFAULT);
    expect(result.uniqueTicketIds).toEqual(['BBB-2', 'AAA-1']);
  });
});
