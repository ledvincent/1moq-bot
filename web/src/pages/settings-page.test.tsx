import { act } from 'react';
import { describe, expect, it } from 'vitest';
import { fakeApi, SERVICE_ACCOUNT, SHEET_LINK } from '../test/fake-api.ts';
import { byText, renderAt, settle, spyOnRequests } from '../test/render.tsx';

function sheetSection(root: HTMLElement) {
  return root.querySelector<HTMLElement>('section[data-section="google-sheet"]')!;
}

function linkField(root: HTMLElement) {
  return sheetSection(root).querySelector<HTMLInputElement>('input[name="sheetLink"]')!;
}

// Types into the controlled field the way a browser does, then submits the form.
async function saveLink(root: HTMLElement, link: string) {
  const field = linkField(root);
  await act(async () => {
    const setValue = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!;
    setValue.call(field, link);
    field.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await act(async () => {
    sheetSection(root)
      .querySelector('form')!
      .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
  });
  await settle();
}

describe('Settings, Google Sheet section', () => {
  it('Settings shows the service account and saves the link', async () => {
    const api = fakeApi({ settings: { link: null, serviceAccountEmail: SERVICE_ACCOUNT } });
    spyOnRequests(api.handler);
    let root = await renderAt('/settings');

    expect(sheetSection(root).querySelector('[data-service-account]')!.textContent).toBe(
      SERVICE_ACCOUNT,
    );
    expect(sheetSection(root).textContent).toContain(
      'Share the sheet with this address, as Viewer:',
    );
    expect(linkField(root).value).toBe('');

    await saveLink(root, SHEET_LINK);
    expect(api.calls).toContain('PUT /api/settings/sheet');
    expect(api.bodies.at(-1)).toEqual({ link: SHEET_LINK });
    expect(sheetSection(root).textContent).toContain('Sheet link saved.');

    // Reload: the page reads the saved link back.
    root = await renderAt('/settings');
    expect(linkField(root).value).toBe(SHEET_LINK);
    expect(sheetSection(root).querySelector('[data-service-account]')!.textContent).toBe(
      SERVICE_ACCOUNT,
    );
  });

  it('Link that is not a Google Sheet', async () => {
    const api = fakeApi({
      settings: { link: null, serviceAccountEmail: SERVICE_ACCOUNT },
      saveLink: () => ({ status: 400, body: { error: 'This is not a Google Sheets link.' } }),
    });
    spyOnRequests(api.handler);
    const root = await renderAt('/settings');

    // Any refused link: the server decides (src/sourcing/http.int.test.ts sends the scenario's).
    await saveLink(root, 'shop.example/leads');

    expect(sheetSection(root).querySelector('[role="alert"]')!.textContent).toBe(
      'This is not a Google Sheets link.',
    );
    expect(sheetSection(root).textContent).not.toContain('Sheet link saved.');
  });

  it('says when Google access is not set up', async () => {
    spyOnRequests(fakeApi({ settings: { link: null, serviceAccountEmail: null } }).handler);
    const root = await renderAt('/settings');
    expect(sheetSection(root).querySelector('[data-service-account]')).toBeNull();
    expect(sheetSection(root).textContent).toContain(
      'Google access is not set up: the setting GOOGLE_SERVICE_ACCOUNT_KEY is missing.',
    );
  });

  it('clears the link when saved empty', async () => {
    const api = fakeApi();
    spyOnRequests(api.handler);
    const root = await renderAt('/settings');
    expect(linkField(root).value).toBe(SHEET_LINK);

    await saveLink(root, '');

    expect(api.bodies.at(-1)).toEqual({ link: '' });
    expect(sheetSection(root).textContent).toContain('Sheet link cleared.');
    expect(byText(sheetSection(root), 'button', 'Save')).toBeDefined();
  });
});
