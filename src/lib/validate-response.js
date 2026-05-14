const VALID_CATEGORIES = new Set(['Breaking', 'New', 'Improvement', 'Fix']);

function validateResponse(r) {
  if (!r || typeof r !== 'object' || Array.isArray(r)) {
    throw new Error('validateResponse: expected an object');
  }
  if (typeof r.summary !== 'string') {
    throw new Error('validateResponse: summary must be a string');
  }
  if (!Array.isArray(r.items)) {
    throw new Error('validateResponse: items must be an array');
  }
  r.items.forEach((item, i) => {
    if (!item || typeof item !== 'object') {
      throw new Error(`validateResponse: items[${i}] must be an object`);
    }
    if (typeof item.category !== 'string' || !VALID_CATEGORIES.has(item.category)) {
      throw new Error(
        `validateResponse: items[${i}].category must be one of Breaking, New, Improvement, Fix`
      );
    }
    if (typeof item.text !== 'string' || item.text.trim().length === 0) {
      throw new Error(`validateResponse: items[${i}].text must be a non-empty string`);
    }
  });
  return r;
}

module.exports = { validateResponse, VALID_CATEGORIES };
