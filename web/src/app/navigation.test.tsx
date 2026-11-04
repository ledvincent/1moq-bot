import { act } from 'react';
import { describe, expect, it } from 'vitest';
import { click, renderAt } from '../test/render.tsx';
import { Link } from './link.tsx';
import { navigate, usePathname } from './navigation.ts';

function Where() {
  return (
    <>
      <output>{usePathname()}</output>
      <Link href="/emails">Emails</Link>
    </>
  );
}

describe('navigation', () => {
  it('navigate changes the address and the hook re-renders', async () => {
    const root = await renderAt('/', <Where />);
    await act(async () => navigate('/results'));
    expect(location.pathname).toBe('/results');
    expect(root.querySelector('output')!.textContent).toBe('/results');
  });

  it('the hook follows the browser back button (popstate)', async () => {
    const root = await renderAt('/find', <Where />);
    await act(async () => {
      history.replaceState(null, '', '/review');
      window.dispatchEvent(new PopStateEvent('popstate'));
    });
    expect(root.querySelector('output')!.textContent).toBe('/review');
  });

  it('a plain left click on a Link opens the page in the app', async () => {
    const root = await renderAt('/', <Where />);
    const event = await click(root.querySelector('a')!);
    expect(event.defaultPrevented).toBe(true);
    expect(location.pathname).toBe('/emails');
    expect(root.querySelector('output')!.textContent).toBe('/emails');
  });

  it('a modified or middle click is left to the browser', async () => {
    const root = await renderAt('/', <Where />);
    for (const init of [
      { metaKey: true },
      { ctrlKey: true },
      { shiftKey: true },
      { altKey: true },
      { button: 1 },
    ]) {
      const event = await click(root.querySelector('a')!, init);
      expect(event.defaultPrevented, JSON.stringify(init)).toBe(false);
    }
    expect(root.querySelector('output')!.textContent).toBe('/');
  });
});
