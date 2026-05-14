const { fetchTickets } = require('../src/lib/linear-client');

function mockFetchSuccess(data) {
  return jest.fn().mockResolvedValue({
    ok: true,
    status: 200,
    json: async () => ({ data }),
  });
}

function ticketIssue(id, overrides = {}) {
  return {
    identifier: id,
    title: `Title for ${id}`,
    description: `Description for ${id}`,
    state: { name: 'Done' },
    ...overrides,
  };
}

describe('fetchTickets', () => {
  test('returns empty map for empty ticket list', async () => {
    const fetch = jest.fn();
    const result = await fetchTickets([], { apiKey: 'k', fetch });
    expect(result).toEqual(new Map());
    expect(fetch).not.toHaveBeenCalled();
  });

  test('fetches a single ticket and returns it keyed by id', async () => {
    const fetch = mockFetchSuccess({ issue: ticketIssue('ETC-1') });
    const result = await fetchTickets(['ETC-1'], { apiKey: 'lin_xxx', fetch });

    expect(result.get('ETC-1')).toMatchObject({
      id: 'ETC-1',
      title: 'Title for ETC-1',
      description: 'Description for ETC-1',
      state: 'Done',
    });
  });

  test('uses Authorization header with provided API key', async () => {
    const fetch = mockFetchSuccess({ issue: ticketIssue('ETC-1') });
    await fetchTickets(['ETC-1'], { apiKey: 'lin_secret', fetch });

    const [url, init] = fetch.mock.calls[0];
    expect(url).toBe('https://api.linear.app/graphql');
    expect(init.method).toBe('POST');
    expect(init.headers.Authorization).toBe('lin_secret');
    expect(init.headers['Content-Type']).toBe('application/json');
  });

  test('sends a GraphQL query with the ticket id as a variable', async () => {
    const fetch = mockFetchSuccess({ issue: ticketIssue('ETC-42') });
    await fetchTickets(['ETC-42'], { apiKey: 'k', fetch });

    const body = JSON.parse(fetch.mock.calls[0][1].body);
    expect(body.variables).toEqual({ id: 'ETC-42' });
    expect(body.query).toMatch(/issue\s*\(\s*id:\s*\$id\s*\)/);
  });

  test('fetches multiple tickets in parallel', async () => {
    const fetch = jest.fn((url, init) => {
      const id = JSON.parse(init.body).variables.id;
      return Promise.resolve({
        ok: true,
        status: 200,
        json: async () => ({ data: { issue: ticketIssue(id) } }),
      });
    });
    const result = await fetchTickets(['A-1', 'B-2', 'C-3'], { apiKey: 'k', fetch });

    expect(fetch).toHaveBeenCalledTimes(3);
    expect(result.size).toBe(3);
    expect(result.get('A-1').title).toBe('Title for A-1');
    expect(result.get('B-2').title).toBe('Title for B-2');
    expect(result.get('C-3').title).toBe('Title for C-3');
  });

  test('silently omits tickets that return non-OK', async () => {
    const fetch = jest.fn((url, init) => {
      const id = JSON.parse(init.body).variables.id;
      if (id === 'BAD-1') {
        return Promise.resolve({ ok: false, status: 404, json: async () => ({}) });
      }
      return Promise.resolve({
        ok: true,
        status: 200,
        json: async () => ({ data: { issue: ticketIssue(id) } }),
      });
    });
    const result = await fetchTickets(['GOOD-1', 'BAD-1', 'GOOD-2'], { apiKey: 'k', fetch });

    expect(result.has('GOOD-1')).toBe(true);
    expect(result.has('GOOD-2')).toBe(true);
    expect(result.has('BAD-1')).toBe(false);
  });

  test('silently omits tickets whose fetch rejects (network error)', async () => {
    const fetch = jest.fn((url, init) => {
      const id = JSON.parse(init.body).variables.id;
      if (id === 'NET-1') return Promise.reject(new Error('econnreset'));
      return Promise.resolve({
        ok: true,
        status: 200,
        json: async () => ({ data: { issue: ticketIssue(id) } }),
      });
    });
    const result = await fetchTickets(['NET-1', 'OK-1'], { apiKey: 'k', fetch });

    expect(result.has('OK-1')).toBe(true);
    expect(result.has('NET-1')).toBe(false);
  });

  test('omits tickets where Linear returns no issue (data.issue is null)', async () => {
    const fetch = jest.fn((url, init) => {
      const id = JSON.parse(init.body).variables.id;
      const issue = id === 'MISSING-1' ? null : ticketIssue(id);
      return Promise.resolve({ ok: true, status: 200, json: async () => ({ data: { issue } }) });
    });
    const result = await fetchTickets(['MISSING-1', 'PRESENT-1'], { apiKey: 'k', fetch });

    expect(result.has('PRESENT-1')).toBe(true);
    expect(result.has('MISSING-1')).toBe(false);
  });

  test('throws when apiKey is missing', async () => {
    await expect(fetchTickets(['ETC-1'], { fetch: jest.fn() })).rejects.toThrow(/apiKey/i);
  });

  test('does not throw if all tickets fail', async () => {
    const fetch = jest.fn().mockResolvedValue({ ok: false, status: 500, json: async () => ({}) });
    const result = await fetchTickets(['A-1', 'B-2'], { apiKey: 'k', fetch });
    expect(result.size).toBe(0);
  });
});
