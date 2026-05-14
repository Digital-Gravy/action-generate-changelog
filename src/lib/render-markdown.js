const CATEGORY_ORDER = ['Breaking', 'New', 'Improvement', 'Fix'];

function renderMarkdown({ summary, items }) {
  const grouped = new Map(CATEGORY_ORDER.map((c) => [c, []]));
  for (const item of items) {
    if (grouped.has(item.category)) grouped.get(item.category).push(item);
  }

  const bullets = [];
  for (const cat of CATEGORY_ORDER) {
    for (const item of grouped.get(cat)) {
      bullets.push(`* **${cat}:** ${item.text}`);
    }
  }

  if (bullets.length === 0) return `${summary}\n`;
  return `${summary}\n\n${bullets.join('\n')}\n`;
}

module.exports = { renderMarkdown, CATEGORY_ORDER };
