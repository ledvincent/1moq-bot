import type { AnchorHTMLAttributes, MouseEvent } from 'react';
import { navigate } from './navigation.ts';

type LinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & { href: string };

// A real link; a plain left click opens the page in the app, any other click is the browser's.
export function Link({ href, onClick, ...rest }: LinkProps) {
  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    onClick?.(event);
    if (event.defaultPrevented) return;
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
      return;
    }
    event.preventDefault();
    navigate(href);
  }
  return <a href={href} onClick={handleClick} {...rest} />;
}
