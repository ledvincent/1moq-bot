import { useEffect, useState, type FormEvent } from 'react';
import { getSheetSettings, saveSheetLink, type SheetSettings } from '../api/sheet.ts';
import { SectionHeading } from '../ui/section-heading.tsx';

/** Settings' "Google Sheet" section: the address to share the sheet with, and the sheet link. */
export function SheetSettingsSection() {
  const [settings, setSettings] = useState<SheetSettings | null>(null);
  const [link, setLink] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getSheetSettings()
      .then((loaded) => {
        if (cancelled) return;
        setSettings(loaded);
        setLink(loaded.link ?? '');
      })
      .catch((failure: unknown) => {
        if (!cancelled) setError(failure instanceof Error ? failure.message : String(failure));
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setSaved(null);
    try {
      const answer = await saveSheetLink(link);
      setLink(answer.link ?? '');
      setSaved(answer.link ? 'Sheet link saved.' : 'Sheet link cleared.');
    } catch (failure) {
      // The server's refusal, e.g. "This is not a Google Sheets link."
      setError(failure instanceof Error ? failure.message : String(failure));
    }
    setSaving(false);
  }

  return (
    <section data-section="google-sheet">
      <SectionHeading title="Google Sheet" />
      {settings &&
        (settings.serviceAccountEmail ? (
          <>
            <p>Share the sheet with this address, as Viewer:</p>
            <p className="strong" data-service-account="">
              {settings.serviceAccountEmail}
            </p>
          </>
        ) : (
          <p className="alert">
            Google access is not set up: the setting GOOGLE_SERVICE_ACCOUNT_KEY is missing.
          </p>
        ))}
      <form className="form" onSubmit={(event) => void save(event)}>
        <label>
          Sheet link
          <input
            name="sheetLink"
            type="text"
            inputMode="url"
            size={60}
            autoComplete="off"
            value={link}
            onChange={(event) => setLink(event.currentTarget.value)}
          />
        </label>
        <button type="submit" className="button button-primary" disabled={saving}>
          Save
        </button>
      </form>
      {error && (
        <p className="alert" role="alert">
          {error}
        </p>
      )}
      {saved && <p className="muted">{saved}</p>}
    </section>
  );
}
