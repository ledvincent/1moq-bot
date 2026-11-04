import { act } from 'react';
import { describe, expect, it } from 'vitest';
import { click, renderAt } from '../test/render.tsx';
import {
  NotConnectedAction,
  NotConnectedForm,
  NotConnectedProvider,
} from './not-connected-action.tsx';

function status(root: HTMLElement) {
  return root.querySelector<HTMLElement>('[role="status"]')!;
}

describe('NotConnectedAction', () => {
  it('shows no notice before use', async () => {
    const root = await renderAt(
      '/review',
      <NotConnectedProvider>
        <NotConnectedAction action="approve" />
      </NotConnectedProvider>,
    );
    expect(status(root).hidden).toBe(true);
    expect(status(root).textContent).toBe('');
  });

  it('is a clickable button that shows the notice naming the ticket', async () => {
    const root = await renderAt(
      '/review',
      <NotConnectedProvider>
        <NotConnectedAction action="approve" />
      </NotConnectedProvider>,
    );
    const button = root.querySelector('button')!;
    expect(button.disabled).toBe(false);
    expect(button.textContent).toBe('Approve');
    await click(button);
    expect(status(root).hidden).toBe(false);
    expect(status(root).textContent).toBe('Not connected yet. Approve is connected by MOQ-13.');
  });

  it('a form submit is prevented and shows the notice', async () => {
    const root = await renderAt(
      '/find',
      <NotConnectedProvider>
        <NotConnectedForm action="search">
          <input name="city" defaultValue="Bristol" />
        </NotConnectedForm>
      </NotConnectedProvider>,
    );
    const event = new Event('submit', { bubbles: true, cancelable: true });
    await act(async () => {
      root.querySelector('form')!.dispatchEvent(event);
    });
    expect(event.defaultPrevented).toBe(true);
    expect(status(root).textContent).toBe('Not connected yet. Search is connected by MOQ-5.');
    expect(root.querySelector('input')!.value).toBe('Bristol');
  });

  it('a clearing form empties its field after use', async () => {
    const root = await renderAt(
      '/settings',
      <NotConnectedProvider>
        <NotConnectedForm action="addDoNotContact" clear>
          <input name="address" />
        </NotConnectedForm>
      </NotConnectedProvider>,
    );
    root.querySelector('input')!.value = 'someone@example.com';
    await click(root.querySelector('button[type="submit"]')!);
    expect(root.querySelector('input')!.value).toBe('');
    expect(status(root).textContent).toBe(
      'Not connected yet. Add to do-not-contact list is connected by MOQ-18.',
    );
  });
});
