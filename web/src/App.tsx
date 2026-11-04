import { useEffect, type ReactNode } from 'react';
import { Link } from './app/link.tsx';
import { usePathname } from './app/navigation.ts';
import { matchRoute, pages, type PageKey } from './app/routes.ts';
import { EmailsPage } from './pages/emails-page.tsx';
import { FindPage } from './pages/find-page.tsx';
import { LeadPage } from './pages/lead-page.tsx';
import { LeadsPage } from './pages/leads-page.tsx';
import { NotFoundPage } from './pages/not-found-page.tsx';
import { OverviewPage } from './pages/overview-page.tsx';
import { ResultsPage } from './pages/results-page.tsx';
import { ReviewPage } from './pages/review-page.tsx';
import { SettingsPage } from './pages/settings-page.tsx';
import { TemplatesPage } from './pages/templates-page.tsx';
import { findLead } from './sample/leads.ts';
import { NotConnectedProvider } from './ui/not-connected-action.tsx';

const APP_NAME = '1moq-bot';

const pageComponents: Record<PageKey, () => ReactNode> = {
  overview: OverviewPage,
  find: FindPage,
  review: ReviewPage,
  leads: LeadsPage,
  emails: EmailsPage,
  templates: TemplatesPage,
  results: ResultsPage,
  settings: SettingsPage,
};

function resolve(pathname: string): { title: string; menu: PageKey | null; content: ReactNode } {
  const route = matchRoute(pathname);
  if (route.kind === 'page') {
    const Page = pageComponents[route.page];
    const label = pages.find((page) => page.key === route.page)!.label;
    return { title: label, menu: route.page, content: <Page /> };
  }
  if (route.kind === 'lead') {
    const lead = findLead(route.id);
    if (lead) return { title: lead.name, menu: 'leads', content: <LeadPage lead={lead} /> };
  }
  return { title: 'Page not found', menu: null, content: <NotFoundPage /> };
}

export function App() {
  const pathname = usePathname();
  const { title, menu, content } = resolve(pathname);

  useEffect(() => {
    document.title = `${title} · ${APP_NAME}`;
  }, [title]);

  return (
    <>
      <header className="top-bar">
        <Link href="/" className="brand" aria-label={APP_NAME}>
          1moq
        </Link>
        <nav className="menu" aria-label="Menu">
          {pages.map((page) => (
            <Link
              key={page.key}
              href={page.path}
              aria-current={page.key === menu ? 'page' : undefined}
            >
              {page.label}
            </Link>
          ))}
        </nav>
        {/* Kept for MOQ-4's Sign out. */}
        <div className="top-bar-slot" />
      </header>
      <main className="page">
        <NotConnectedProvider key={pathname}>{content}</NotConnectedProvider>
      </main>
    </>
  );
}
