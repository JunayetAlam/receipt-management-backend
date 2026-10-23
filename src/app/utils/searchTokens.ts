// Characters treated as word separators in search terms: whitespace, quotes
// (incl. the inch mark and smart quotes) and hyphens. So `6 pipe`, `6"pipe`
// and `6-pipe` all search for the words "6" and "pipe".
const SEPARATORS = /[\s"'`″“”‘’\-]+/;

export const splitSearchTokens = (term: string): string[] => {
  const trimmed = term.trim();
  if (!trimmed) return [];
  const tokens = trimmed.split(SEPARATORS).filter(Boolean);
  // Term made only of separators (e.g. `"`): fall back to the raw term.
  return tokens.length ? tokens : [trimmed];
};

// Every word must match (AND); a word may match any of the fields (OR).
// Supports one-level relation paths like `customer.name`.
export const buildTokenSearchWhere = (term: string, fields: string[]) => {
  const tokens = splitSearchTokens(term);
  if (!tokens.length) return undefined;
  return {
    AND: tokens.map(token => ({
      OR: fields.map(field => {
        if (field.includes('.')) {
          const [parent, child] = field.split('.');
          return { [parent]: { [child]: { contains: token, mode: 'insensitive' } } };
        }
        return { [field]: { contains: token, mode: 'insensitive' } };
      }),
    })),
  };
};
