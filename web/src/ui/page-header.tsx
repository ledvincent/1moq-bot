import type { ReactNode } from 'react';
import { SampleDataMarker } from './sample-data-marker.tsx';

export function PageHeader({
  title,
  sample = true,
  children,
}: {
  title: string;
  sample?: boolean;
  children?: ReactNode;
}) {
  return (
    <header className="page-header">
      <div className="page-title-row">
        <h1>{title}</h1>
        {sample && <SampleDataMarker />}
      </div>
      {children && <p className="page-lede">{children}</p>}
    </header>
  );
}
