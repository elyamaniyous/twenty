import { type DocumentationPath } from 'twenty-shared/constants';

const ZOWKA_HELP_URL = 'https://zowka.com';

export const getDocumentationUrl = (_options: {
  locale?: string | null;
  path?: DocumentationPath | string;
}): string => ZOWKA_HELP_URL;
