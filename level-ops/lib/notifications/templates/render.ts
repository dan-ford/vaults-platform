import { renderToStaticMarkup } from "react-dom/server";

/**
 * Renders a React email component to HTML string
 */
export function renderEmail(component: React.ReactElement): string {
  return renderToStaticMarkup(component);
}
