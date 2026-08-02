import { describe, expect, it } from 'vitest';

import { getDocumentationUrl } from '../getDocumentationUrl';

describe('getDocumentationUrl', () => {
  it.each([
    {},
    { locale: 'fr-FR' },
    { locale: 'en-US', path: '/developers/introduction' },
  ])('routes help links to Zowka without Twenty paths', (options) => {
    expect(getDocumentationUrl(options)).toBe('https://zowka.com');
  });
});
