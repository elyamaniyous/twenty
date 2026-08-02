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
  IconCurrencyDirham,
  IconFileText,
  IconListDetails,
  IconLink,
  IconMail,
  IconNotes,
  IconSettings,
  IconUser,
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
      label: t`Relances`,
      path: erpMarocPaths.reminders,
      activePaths: [erpMarocPaths.reminders],
      Icon: IconBell,
    },
    {
      label: t`Marketing`,
      path: erpMarocPaths.marketing,
      activePaths: [erpMarocPaths.marketing],
      Icon: IconMail,
    },
    {
      label: t`Ressources humaines`,
      path: erpMarocPaths.hrCore,
      activePaths: [erpMarocPaths.hrCore, erpMarocPaths.hrEmployeeDetail],
      Icon: IconUsers,
    },
    {
      label: t`Mon espace salarié`,
      path: erpMarocPaths.hrSelfService,
      activePaths: [erpMarocPaths.hrSelfService],
      Icon: IconUser,
    },
    {
      label: t`Cycle de paie`,
      path: erpMarocPaths.payrollCycle,
      activePaths: [erpMarocPaths.payrollCycle],
      Icon: IconCurrencyDirham,
    },
    {
      label: t`Référentiel paie`,
      path: erpMarocPaths.payrollRegulatory,
      activePaths: [erpMarocPaths.payrollRegulatory],
      Icon: IconSettings,
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
