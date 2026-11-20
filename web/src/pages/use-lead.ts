import { useEffect, useState } from 'react';
import { getLead, type LeadDetails } from '../api/leads.ts';

export type LeadLoad =
  | { kind: 'loading' }
  | { kind: 'found'; lead: LeadDetails }
  | { kind: 'not-found' }
  | { kind: 'error'; message: string };

/** Loads the lead of a lead page address; null when the address is not a lead page. */
export function useLead(id: string | null): LeadLoad | null {
  const [loaded, setLoaded] = useState<{ id: string; load: LeadLoad } | null>(null);

  useEffect(() => {
    if (id === null) return;
    let cancelled = false;
    getLead(id)
      .then((lead) => {
        if (!cancelled)
          setLoaded({ id, load: lead ? { kind: 'found', lead } : { kind: 'not-found' } });
      })
      .catch((failure: unknown) => {
        const message = failure instanceof Error ? failure.message : String(failure);
        if (!cancelled) setLoaded({ id, load: { kind: 'error', message } });
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (id === null) return null;
  // A result for another lead is stale: this one is still loading.
  return loaded?.id === id ? loaded.load : { kind: 'loading' };
}
