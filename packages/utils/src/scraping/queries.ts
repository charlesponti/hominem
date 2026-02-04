import type { ElementHandle } from 'playwright';

type PlaywrightElement = ElementHandle<SVGElement | HTMLElement>;
export async function findChildMatchingQuery(
  parentEl: PlaywrightElement,
  query: (element: PlaywrightElement) => Promise<boolean>,
): Promise<PlaywrightElement[]> {
  // Get all elements within the parent element
  const elements = await parentEl.$$('*');
  const results: PlaywrightElement[] = [];

  for (const element of elements) {
    // Get all children of the current element
    const children = await element.$$('*');

    if (children) {
      const hasMatchingChild = children.some(query);

      if (!hasMatchingChild) {
        results.push(element);
      }
    }
  }

  return results;
}
