/**
 * Generate URL-friendly slug supporting both Latin characters and Unicode/Bengali alphabets.
 */
export const generateSlug = (text: string): string => {
  if (!text) return '';
  return text
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '-') // Replace non-alphanumeric characters with hyphens
    .replace(/^-+|-+$/g, '');          // Remove leading and trailing hyphens
};
