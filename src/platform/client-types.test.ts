import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { clientTypes, namedClientTypes } from './client-types.ts';

// The first column of the table under "## Rules" in the concept.
function typesInConcept(): string[] {
  const concept = readFileSync(
    new URL('../../okf/domain/client-types.md', import.meta.url),
    'utf8',
  );
  const rules = concept.slice(concept.indexOf('## Rules'));
  return rules
    .split(/\r?\n/)
    .filter((line) => line.startsWith('|'))
    .map((line) => line.split('|')[1]!.trim())
    .filter((name) => name !== 'Client type' && !/^-+$/.test(name));
}

describe('client types', () => {
  it('match the table of okf/domain/client-types.md, in its order, Other last', () => {
    expect(clientTypes).toEqual(typesInConcept());
  });

  it('hold 13 named types plus Other', () => {
    expect(namedClientTypes).toHaveLength(13);
    expect(clientTypes.at(-1)).toBe('Other');
  });
});
