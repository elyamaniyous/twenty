import { NavigationDrawerAnimatedCollapseWrapper } from '@/ui/navigation/navigation-drawer/components/NavigationDrawerAnimatedCollapseWrapper';
import { NavigationDrawerItem } from '@/ui/navigation/navigation-drawer/components/NavigationDrawerItem';
import { NavigationDrawerSection } from '@/ui/navigation/navigation-drawer/components/NavigationDrawerSection';
import { NavigationDrawerSectionTitle } from '@/ui/navigation/navigation-drawer/components/NavigationDrawerSectionTitle';
import { useLingui } from '@lingui/react/macro';
import { matchPath, useLocation } from 'react-router-dom';
import {
  IconBell,
  IconBook,
  IconBox,
  IconChartBar,
  IconCreditCard,
  IconFileText,
  IconListDetails,
  IconLink,
  IconListCheck,
  IconLock,
  IconMail,
  IconNotes,
  IconPercentage,
  IconCoins,
  IconSettings,
  IconSparkles,
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
      label: t`Mise en service`,
      path: erpMarocPaths.onboarding,
      activePaths: [erpMarocPaths.onboarding],
      Icon: IconListCheck,
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
      label: t`Chèques`,
      path: erpMarocPaths.cheques,
      activePaths: [
        erpMarocPaths.cheques,
        erpMarocPaths.chequeDetail,
        erpMarocPaths.chequeDepositSlipDetail,
      ],
      Icon: IconNotes,
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
      label: t`GED / OCR`,
      path: erpMarocPaths.documents,
      activePaths: [erpMarocPaths.documents],
      Icon: IconFileText,
    },
    {
      label: t`Notes de frais`,
      path: erpMarocPaths.expenseNotes,
      activePaths: [erpMarocPaths.expenseNotes],
      Icon: IconFileText,
    },
    {
      label: t`Pilotage financier`,
      path: erpMarocPaths.financialPlanning,
      activePaths: [erpMarocPaths.financialPlanning],
      Icon: IconCoins,
    },
    {
      label: t`Ressources humaines`,
      path: erpMarocPaths.hrCore,
      activePaths: [erpMarocPaths.hrCore, erpMarocPaths.hrEmployeeDetail],
      Icon: IconUsers,
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
        erpMarocPaths.accountingEntryNew,
        erpMarocPaths.accountingEntryEdit,
        erpMarocPaths.accountingEntryDetail,
      ],
      Icon: IconBook,
    },
    {
      label: t`Provisions`,
      path: erpMarocPaths.accountingProvisions,
      activePaths: [erpMarocPaths.accountingProvisions],
      Icon: IconFileText,
    },
    {
      label: t`Fiscalité`,
      path: erpMarocPaths.fiscal,
      activePaths: [erpMarocPaths.fiscal],
      Icon: IconPercentage,
    },
    {
      label: t`Plan comptable`,
      path: erpMarocPaths.accountingReferences,
      activePaths: [erpMarocPaths.accountingReferences],
      Icon: IconSettings,
    },
    {
      label: t`Révision comptable`,
      path: erpMarocPaths.accountingReview,
      activePaths: [erpMarocPaths.accountingReview],
      Icon: IconListCheck,
    },
    {
      label: t`Clôture comptable`,
      path: erpMarocPaths.accountingClosing,
      activePaths: [erpMarocPaths.accountingClosing],
      Icon: IconLock,
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
      label: t`Copilote comptable`,
      path: erpMarocPaths.accountingCopilot,
      activePaths: [erpMarocPaths.accountingCopilot],
      Icon: IconSparkles,
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
