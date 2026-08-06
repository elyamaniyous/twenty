import { t } from '@lingui/core/macro';

export const getStandardApplicationDescription =
  (): string => t`The base data model every Zowka workspace runs on.

#### What "foundation" means

Every Zowka workspace starts with this set of objects. They define the shape of your CRM, including relationships, activity, and reporting. Everything else, including AI agents and custom objects, plugs into them.

#### Included objects
- **People & Companies**: contact and account records
- **Opportunities**: your sales pipeline
- **Notes & Tasks**: activity and follow-ups
- **Workflows & Dashboards**: automation and reporting

Remove this app and the rest of Zowka has nothing to hang off.

#### Build your own app

Extend Zowka with your own objects, fields, logic functions, or AI skills. Scaffold a new app in one command:

\`\`\`bash
Contactez support@zowka.com pour créer une extension dédiée.
\`\`\`

Then inside the folder:

\`\`\`bash
Les extensions sont validées, versionnées et déployées avec votre release Zowka.
\`\`\`

Consultez le [dépôt Zowka](https://github.com/elyamaniyous/zowka) pour la documentation technique.`;
