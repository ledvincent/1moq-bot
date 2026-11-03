// The owner's app pages, in menu order (MOQ-30 design D1).
export const pages = [
  { key: 'overview', path: '/', label: 'Overview' },
  { key: 'find', path: '/find', label: 'Find leads' },
  { key: 'review', path: '/review', label: 'Review' },
  { key: 'leads', path: '/leads', label: 'Leads' },
  { key: 'emails', path: '/emails', label: 'Emails' },
  { key: 'templates', path: '/templates', label: 'Templates' },
  { key: 'results', path: '/results', label: 'Results' },
  { key: 'settings', path: '/settings', label: 'Settings' },
] as const;

export type PageKey = (typeof pages)[number]['key'];

export type Route =
  { kind: 'page'; page: PageKey } | { kind: 'lead'; id: string } | { kind: 'not-found' };

export function matchRoute(pathname: string): Route {
  const path = pathname.length > 1 ? pathname.replace(/\/+$/, '') || '/' : pathname;
  const page = pages.find((entry) => entry.path === path);
  if (page) return { kind: 'page', page: page.key };
  const lead = /^\/leads\/([^/]+)$/.exec(path);
  if (lead?.[1]) return { kind: 'lead', id: decodeURIComponent(lead[1]) };
  return { kind: 'not-found' };
}
