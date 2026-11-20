import type { ReactNode } from 'react';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, vi } from 'vitest';
import { App } from '../App.tsx';

declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean | undefined;
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const mounted: { root: Root; container: HTMLElement }[] = [];

afterEach(() => {
  for (const { root, container } of mounted.splice(0)) {
    act(() => root.unmount());
    container.remove();
  }
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

// Mounts `ui` (the whole app by default) with the browser at `path`.
export async function renderAt(path: string, ui: ReactNode = <App />): Promise<HTMLElement> {
  for (const { root, container } of mounted.splice(0)) {
    act(() => root.unmount());
    container.remove();
  }
  history.replaceState(null, '', path);
  const container = document.createElement('div');
  document.body.append(container);
  const root = createRoot(container);
  mounted.push({ root, container });
  await act(async () => root.render(ui));
  await settle();
  return container;
}

// Lets the page's pending API answers (stubbed, so microtasks only) reach the screen.
export async function settle(): Promise<void> {
  await act(async () => {
    for (let i = 0; i < 20; i++) await Promise.resolve();
  });
}

export async function click(element: Element, init: MouseEventInit = {}): Promise<MouseEvent> {
  const event = new MouseEvent('click', { bubbles: true, cancelable: true, button: 0, ...init });
  await act(async () => {
    element.dispatchEvent(event);
  });
  await settle();
  return event;
}

export type FetchHandler = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

// Spies on every way the page could reach the server; `answer` serves fetch (by default every
// request fails).
export function spyOnRequests(answer?: FetchHandler) {
  const fetchSpy = vi.fn<FetchHandler>(
    answer ?? (() => Promise.reject(new Error('fetch called in a test'))),
  );
  vi.stubGlobal('fetch', fetchSpy);
  const xhrSpy = vi.spyOn(XMLHttpRequest.prototype, 'send').mockImplementation(() => undefined);
  return {
    count: () => fetchSpy.mock.calls.length + xhrSpy.mock.calls.length,
  };
}

export function byText(root: ParentNode, selector: string, text: string): HTMLElement {
  const found = Array.from(root.querySelectorAll<HTMLElement>(selector)).find(
    (element) => element.textContent?.trim() === text,
  );
  if (!found) throw new Error(`No ${selector} with text "${text}"`);
  return found;
}
