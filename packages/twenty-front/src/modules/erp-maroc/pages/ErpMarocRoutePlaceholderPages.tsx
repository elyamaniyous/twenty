import { useLingui } from '@lingui/react/macro';

const ErpMarocRoutePlaceholderPage = ({ title }: { title: string }) => (
  <div>{title}</div>
);

export const ErpMarocInvoicesPage = () => {
  const { t } = useLingui();

  return <ErpMarocRoutePlaceholderPage title={t`Factures`} />;
};

export const ErpMarocPaymentsPage = () => {
  const { t } = useLingui();

  return <ErpMarocRoutePlaceholderPage title={t`Paiements`} />;
};

export const ErpMarocRemindersPage = () => {
  const { t } = useLingui();

  return <ErpMarocRoutePlaceholderPage title={t`Relances`} />;
};
