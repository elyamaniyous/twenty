import { NavigationDrawerAnimatedCollapseWrapper } from '@/ui/navigation/navigation-drawer/components/NavigationDrawerAnimatedCollapseWrapper';
import { NavigationDrawerItem } from '@/ui/navigation/navigation-drawer/components/NavigationDrawerItem';
import { NavigationDrawerSection } from '@/ui/navigation/navigation-drawer/components/NavigationDrawerSection';
import { NavigationDrawerSectionTitle } from '@/ui/navigation/navigation-drawer/components/NavigationDrawerSectionTitle';
import { useLingui } from '@lingui/react/macro';
import { matchPath, useLocation } from 'react-router-dom';
import {
  IconBell,
  IconBook,
  IconBuildingSkyscraper,
  IconBox,
  IconChartBar,
  IconCreditCard,
  IconFileText,
  IconListDetails,
  IconLink,
  IconNotes,
  IconUsers,
  type IconComponent,
} from 'twenty-ui/display';

import { erpMarocPaths } from './erpMarocPaths';

type ErpMarocNavigationItem = {
  label: string;
  path: string;
  activePaths: string[];
  Icon: IconComponent;
};

export const NavigationDrawerErpMarocSection = () => {
  const { t } = useLingui();
  const { pathname } = useLocation();

  const items: ErpMarocNavigationItem[] = [
    {
      label: t`Vue ventes`,
      path: erpMarocPaths.cockpit,
      activePaths: [erpMarocPaths.cockpit],
      Icon: IconChartBar,
    },
    {
      label: t`Produits`,
      path: erpMarocPaths.products,
      activePaths: [erpMarocPaths.products],
      Icon: IconBox,
    },
    {
      label: t`Tiers`,
      path: erpMarocPaths.tiers,
      activePaths: [erpMarocPaths.tiers],
      Icon: IconUsers,
    },
    {
      label: t`Devis`,
      path: erpMarocPaths.quotes,
      activePaths: [
        erpMarocPaths.quotes,
        erpMarocPaths.quoteNew,
        erpMarocPaths.quoteEdit,
        erpMarocPaths.quoteDetail,
      ],
      Icon: IconNotes,
    },
    {
      label: t`Commandes clients`,
      path: erpMarocPaths.salesOrders,
      activePaths: [
        erpMarocPaths.salesOrders,
        erpMarocPaths.salesOrdersPreparation,
        erpMarocPaths.salesOrderDetail,
      ],
      Icon: IconListDetails,
    },
    {
      label: t`Factures`,
      path: erpMarocPaths.invoices,
      activePaths: [
        erpMarocPaths.invoices,
        erpMarocPaths.invoiceNew,
        erpMarocPaths.invoiceEdit,
        erpMarocPaths.invoiceDetail,
      ],
      Icon: IconFileText,
    },
    {
      label: t`Achats`,
      path: erpMarocPaths.purchaseOrders,
      activePaths: [
        erpMarocPaths.purchaseOrders,
        erpMarocPaths.purchaseOrderNew,
        erpMarocPaths.purchaseOrderDetail,
      ],
      Icon: IconBox,
    },
    {
      label: t`Paiements`,
      path: erpMarocPaths.payments,
      activePaths: [
        erpMarocPaths.payments,
        erpMarocPaths.paymentNew,
        erpMarocPaths.paymentDetail,
      ],
      Icon: IconCreditCard,
    },
    {
      label: t`Avoirs`,
      path: erpMarocPaths.creditNotes,
      activePaths: [
        erpMarocPaths.creditNotes,
        erpMarocPaths.creditNoteNew,
        erpMarocPaths.creditNoteEdit,
        erpMarocPaths.creditNoteDetail,
      ],
      Icon: IconFileText,
    },
    {
      label: t`Retours clients`,
      path: erpMarocPaths.customerReturns,
      activePaths: [erpMarocPaths.customerReturns],
      Icon: IconBox,
    },
    {
      label: t`Relances`,
      path: erpMarocPaths.reminders,
      activePaths: [erpMarocPaths.reminders],
      Icon: IconBell,
    },
    {
      label: t`Écritures`,
      path: erpMarocPaths.accountingEntries,
      activePaths: [
        erpMarocPaths.accountingEntries,
        erpMarocPaths.accountingEntryDetail,
      ],
      Icon: IconBook,
    },
    {
      label: t`Grand livre`,
      path: erpMarocPaths.accountingGrandLivre,
      activePaths: [erpMarocPaths.accountingGrandLivre],
      Icon: IconListDetails,
    },
    {
      label: t`Balance`,
      path: erpMarocPaths.accountingBalance,
      activePaths: [erpMarocPaths.accountingBalance],
      Icon: IconChartBar,
    },
    {
      label: t`Lettrage`,
      path: erpMarocPaths.accountingLettrage,
      activePaths: [erpMarocPaths.accountingLettrage],
      Icon: IconLink,
    },
    {
      label: t`Banque`,
      path: erpMarocPaths.bankStatements,
      activePaths: [erpMarocPaths.bankStatements],
      Icon: IconBuildingSkyscraper,
    },
    {
      label: t`Stock`,
      path: erpMarocPaths.inventory,
      activePaths: [erpMarocPaths.inventory],
      Icon: IconBox,
    },
  ];

  return (
    <NavigationDrawerSection>
      <NavigationDrawerAnimatedCollapseWrapper>
        <NavigationDrawerSectionTitle label={t`ERP Maroc`} />
      </NavigationDrawerAnimatedCollapseWrapper>
      {items.map(({ label, path, activePaths, Icon }) => (
        <NavigationDrawerItem
          key={path}
          label={label}
          to={path}
          Icon={Icon}
          active={activePaths.some((activePath) =>
            matchPath({ path: activePath, end: true }, pathname),
          )}
        />
      ))}
    </NavigationDrawerSection>
  );
};
