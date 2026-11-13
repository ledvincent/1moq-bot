import { SampleDataMarker } from './sample-data-marker.tsx';

/**
 * A section's heading; `sample` adds the "Sample data" marker beside it, for a section still on
 * sample data in a page that also shows real data.
 */
export function SectionHeading({ title, sample = false }: { title: string; sample?: boolean }) {
  return (
    <div className="section-heading">
      <h2>{title}</h2>
      {sample && <SampleDataMarker />}
    </div>
  );
}
