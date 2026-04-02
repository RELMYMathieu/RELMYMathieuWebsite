export function isLangFile(filePath: string | undefined, id: string, locale: string): boolean {
  if (filePath) {
    const normalizedPath = filePath.replace(/\\/g, '/');
    const filename = normalizedPath.split('/').pop() ?? '';

    if (filename === `${locale}.mdx` || filename === `${locale}.md`) return true;
    if (filename.endsWith(`.${locale}.mdx`) || filename.endsWith(`.${locale}.md`)) return true;
  }

  const normalizedId = id.replace(/\\/g, '/');
  return normalizedId === locale || normalizedId.endsWith(`/${locale}`) || normalizedId.endsWith(`.${locale}`);
}

export function getWorkKey(filePath: string | undefined, id: string, locale: string): string {
  if (filePath) {
    const normalizedPath = filePath.replace(/\\/g, '/');
    const segments = normalizedPath.split('/').filter(Boolean);
    const parent = segments.at(-2);
    const filename = segments.at(-1) ?? '';

    if (parent) return parent;

    const baseName = filename.replace(/\.(mdx|md)$/i, '');
    if (baseName.endsWith(`.${locale}`)) {
      return baseName.slice(0, -(locale.length + 1));
    }
    if (baseName === locale) {
      return id.replace(/\.[^./\\]+$/, '').replace(/[\\/]/g, '-');
    }

    return baseName;
  }

  return id.replace(/\.[^./\\]+$/, '').replace(/[\\/]/g, '-');
}
