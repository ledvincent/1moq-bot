import { describe, expect, it } from 'vitest';
import { byText, click, renderAt } from '../test/render.tsx';

const menu = [
  ['Overview', '/'],
  ['Find leads', '/find'],
  ['Review', '/review'],
  ['Leads', '/leads'],
  ['Emails', '/emails'],
  ['Templates', '/templates'],
  ['Results', '/results'],
  ['Settings', '/settings'],
] as const;

function menuLinks(root: HTMLElement) {
  return Array.from(root.querySelectorAll<HTMLAnchorElement>('nav[aria-label="Menu"] a'));
}

function marked(root: HTMLElement) {
  return menuLinks(root)
    .filter((link) => link.getAttribute('aria-current') === 'page')
    .map((link) => link.textContent);
}

describe('App', () => {
  it('mounts and names the tool', async () => {
    const root = await renderAt('/');
    expect(root.querySelector('a.brand')!.getAttribute('aria-label')).toBe('1moq-bot');
    expect(document.title).toBe('Overview · 1moq-bot');
  });

  it('Menu reaches every page', async () => {
    const root = await renderAt('/');
    expect(menuLinks(root).map((link) => [link.textContent, link.getAttribute('href')])).toEqual(
      menu.map(([label, href]) => [label, href]),
    );
    for (const [label, href] of [...menu].reverse()) {
      await click(byText(root, 'nav[aria-label="Menu"] a', label));
      expect(location.pathname).toBe(href);
      expect(root.querySelector('h1')!.textContent).toBe(label);
      expect(marked(root)).toEqual([label]);
      expect(document.title).toBe(`${label} · 1moq-bot`);
    }
  });

  it('a lead page marks Leads in the menu', async () => {
    const root = await renderAt('/leads/lead-01');
    expect(marked(root)).toEqual(['Leads']);
  });

  it('Reload keeps the page: mounting at each address opens that page', async () => {
    for (const [label, href] of menu) {
      const root = await renderAt(href);
      expect(root.querySelector('h1')!.textContent, href).toBe(label);
      root.remove();
    }
    const root = await renderAt('/leads/lead-01');
    expect(root.querySelector('h1')!.textContent).toBe('Harbour Roasters');
  });

  it('Unknown address shows Page not found', async () => {
    for (const address of ['/to-do', '/leads/lead-99']) {
      const root = await renderAt(address);
      expect(root.querySelector('h1')!.textContent, address).toBe('Page not found');
      expect(root.querySelector('[data-sample-marker]'), address).toBeNull();
      expect(root.querySelector('nav[aria-label="Menu"]'), address).not.toBeNull();
      expect(marked(root)).toEqual([]);
      const back = byText(root, 'main a', 'Back to the Overview');
      expect(back.getAttribute('href')).toBe('/');
      await click(back);
      expect(location.pathname).toBe('/');
      expect(root.querySelector('h1')!.textContent).toBe('Overview');
      root.remove();
    }
  });
});
