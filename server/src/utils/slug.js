function baseSlug(name) {
  const s = String(name)
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
  return s || 'user';
}

// isTaken(slug) returns true when another user already has that slug.
function uniqueSlug(name, isTaken) {
  const base = baseSlug(name);
  let candidate = base;
  let n = 2;
  while (isTaken(candidate)) candidate = `${base}-${n++}`;
  return candidate;
}

module.exports = { uniqueSlug };