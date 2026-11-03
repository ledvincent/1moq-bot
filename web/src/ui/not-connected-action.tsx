import { createContext, useContext, useState, type FormEvent, type ReactNode } from 'react';
import { connectedBy, notConnectedText, type ActionId } from '../app/connected-by.ts';

const NoticeContext = createContext<(action: ActionId) => void>(() => undefined);

// Holds the page's "Not connected yet" notice; mount one per page.
export function NotConnectedProvider({ children }: { children: ReactNode }) {
  const [action, setAction] = useState<ActionId | null>(null);
  return (
    <NoticeContext.Provider value={setAction}>
      <NotConnectedNotice action={action} />
      {children}
    </NoticeContext.Provider>
  );
}

export function NotConnectedNotice({ action }: { action: ActionId | null }) {
  return (
    <div role="status" className="notice" hidden={action === null}>
      {action === null ? '' : notConnectedText(action)}
    </div>
  );
}

// A normal button for an action not built yet: it only shows the notice.
export function NotConnectedAction({
  action,
  children,
  variant,
}: {
  action: ActionId;
  children?: ReactNode;
  variant?: 'primary';
}) {
  const show = useContext(NoticeContext);
  return (
    <button
      type="button"
      className={variant === 'primary' ? 'button button-primary' : 'button'}
      data-action={action}
      onClick={(event) => {
        event.preventDefault();
        show(action);
      }}
    >
      {children ?? connectedBy[action].label}
    </button>
  );
}

// A form whose submit is an action not built yet: nothing is submitted; `clear` empties
// its fields after use.
export function NotConnectedForm({
  action,
  clear = false,
  className,
  children,
}: {
  action: ActionId;
  clear?: boolean;
  className?: string;
  children: ReactNode;
}) {
  const show = useContext(NoticeContext);
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (clear) event.currentTarget.reset();
    show(action);
  }
  return (
    <form className={className} onSubmit={handleSubmit} data-form-action={action}>
      {children}
      <button type="submit" className="button button-primary" data-action={action}>
        {connectedBy[action].label}
      </button>
    </form>
  );
}
