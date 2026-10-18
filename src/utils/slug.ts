/**
 * URL-safe slug generation. Kept dependency-free and unit tested.
 */
export const slugify = (value: string): string =>
  value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

/**
 * Appends a short random suffix when `isTaken` reports the slug is in use.
 * Keeps slugs readable while guaranteeing uniqueness.
 */
export const uniqueSlug = async (
  base: string,
  isTaken: (candidate: string) => Promise<boolean>,
): Promise<string> => {
  const root = slugify(base) || 'item';

  if (!(await isTaken(root))) return root;

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const suffix = Math.random().toString(36).slice(2, 6);
    const candidate = `${root}-${suffix}`;
    if (!(await isTaken(candidate))) return candidate;
  }

  return `${root}-${Date.now().toString(36)}`;
};
