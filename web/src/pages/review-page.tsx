import { useState } from 'react';
import { leads, qualificationRules } from '../sample/leads.ts';
import { NotConnectedAction } from '../ui/not-connected-action.tsx';
import { PageHeader } from '../ui/page-header.tsx';

const waiting = leads.filter((lead) => lead.status === 'waiting for review');

export function ReviewPage() {
  const [index, setIndex] = useState(0);
  const lead = waiting[index]!;
  return (
    <>
      <PageHeader title="Review">
        {index + 1} of {waiting.length}
      </PageHeader>
      <article className="review-card">
        <div className="pictures" aria-label="Pictures">
          <div className="picture" />
          <div className="picture" />
          <div className="picture" />
          <div className="picture" />
        </div>
        <div>
          <h2 style={{ marginTop: 0 }}>{lead.name}</h2>
          <dl className="facts">
            <dt>Client type</dt>
            <dd>
              {lead.clientType} <span className="muted">({lead.clientTypeReason})</span>
            </dd>
            <dt>Market</dt>
            <dd>{lead.market}</dd>
            <dt>Website</dt>
            <dd>{lead.website}</dd>
            <dt>Instagram</dt>
            <dd>{lead.instagram ?? 'not found'}</dd>
            <dt>Fit</dt>
            <dd className="strong">{lead.fit}</dd>
            {qualificationRules.map((rule, ruleIndex) => (
              <div key={rule} style={{ display: 'contents' }}>
                <dt>{rule}</dt>
                <dd>{lead.rules[ruleIndex]}</dd>
              </div>
            ))}
          </dl>
          <div className="actions">
            <NotConnectedAction action="approve" variant="primary" />
            <NotConnectedAction action="reject" />
            <button
              type="button"
              className="button"
              disabled={index === 0}
              onClick={() => setIndex(index - 1)}
            >
              Previous lead
            </button>
            <button
              type="button"
              className="button"
              disabled={index === waiting.length - 1}
              onClick={() => setIndex(index + 1)}
            >
              Next lead
            </button>
          </div>
        </div>
      </article>
    </>
  );
}
