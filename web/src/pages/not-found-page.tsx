import { Link } from '../app/link.tsx';
import { PageHeader } from '../ui/page-header.tsx';

export function NotFoundPage() {
  return (
    <>
      <PageHeader title="Page not found" sample={false}>
        This address matches no page of the tool.
      </PageHeader>
      <Link href="/">Back to the Overview</Link>
    </>
  );
}
