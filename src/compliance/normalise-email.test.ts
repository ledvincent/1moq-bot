import { describe, expect, it } from 'vitest';
import { normaliseEmail } from './index.ts';

describe('normaliseEmail', () => {
  it('lower-cases the whole address', () => {
    expect(normaliseEmail('Hello@Cafe.EXAMPLE')).toBe('hello@cafe.example');
  });

  it('drops surrounding spaces', () => {
    expect(normaliseEmail('  hello@cafe.example \t')).toBe('hello@cafe.example');
  });

  it('drops a leading mailto: in any case, with spaces around it', () => {
    expect(normaliseEmail('mailto:hello@cafe.example')).toBe('hello@cafe.example');
    expect(normaliseEmail(' MAILTO: Hello@cafe.example ')).toBe('hello@cafe.example');
  });

  it('keeps a mailto that is not at the start', () => {
    expect(normaliseEmail('hello.mailto:x@cafe.example')).toBe('hello.mailto:x@cafe.example');
  });
});
