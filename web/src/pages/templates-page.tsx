import { sampleTemplate } from '../sample/templates.ts';
import { clientTypes, steps } from '../sample/types.ts';
import { NotConnectedForm } from '../ui/not-connected-action.tsx';
import { PageHeader } from '../ui/page-header.tsx';

export function TemplatesPage() {
  return (
    <>
      <PageHeader title="Templates">
        The base text of each email, by client type, step and language.
      </PageHeader>
      <NotConnectedForm action="saveTemplate">
        <div className="form" style={{ marginBottom: 24 }}>
          <label>
            Client type
            <select name="clientType">
              {clientTypes.map((type) => (
                <option key={type}>{type}</option>
              ))}
            </select>
          </label>
          <label>
            Step
            <select name="step">
              {steps.map((step) => (
                <option key={step}>{step}</option>
              ))}
            </select>
          </label>
          <label>
            Language
            <select name="language">
              <option>English</option>
              <option>French</option>
            </select>
          </label>
        </div>
        <label style={{ marginBottom: 24 }}>
          Base text
          <textarea name="text" defaultValue={sampleTemplate} />
        </label>
      </NotConnectedForm>
    </>
  );
}
