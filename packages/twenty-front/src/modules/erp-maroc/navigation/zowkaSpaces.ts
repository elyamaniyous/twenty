import { type MessageDescriptor } from '@lingui/core';
import { msg } from '@lingui/core/macro';
import { matchPath } from 'react-router-dom';
import { type ErpContext } from 'twenty-shared/erp-maroc';
import {
  IconBell,
  IconBook,
  IconBox,
  IconBriefcase,
  IconBuildingBank,
  IconChartBar,
  IconClock,
  IconCoins,
  IconCreditCard,
  IconFileText,
  IconLink,
  IconListCheck,
  IconListDetails,
  IconLock,
  IconMail,
  IconNotes,
  IconPercentage,
  IconSettings,
  IconSparkles,
  IconUsers,
  IconUsersGroup,
  type IconComponent,
} from 'twenty-ui/display';

import { erpMarocPaths } from './erpMarocPaths';

export const ZOWKA_SPACE_IDS = ['crm', 'finance', 'hr'] as const;

export type ZowkaSpaceId = (typeof ZOWKA_SPACE_IDS)[number];

export type ZowkaSpaceAccess = Record<ZowkaSpaceId, boolean>;

export type ZowkaNavigationItem = {
  id: string;
  label: MessageDescriptor;
  path: string;
  activePaths: string[];
  Icon: IconComponent;
  isVisible?: (context: ErpContext) => boolean;
};

export type ZowkaNavigationGroup = {
  id: string;
  label: MessageDescriptor;
  items: ZowkaNavigationItem[];
};

export type ZowkaSpaceDefinition = {
  id: ZowkaSpaceId;
  label: MessageDescriptor;
  navigationLabel: MessageDescriptor;
  Icon: IconComponent;
  entryPath: string;
  defaultHomePath: string;
  homeItem: ZowkaNavigationItem;
  groups: ZowkaNavigationGroup[];
};

const canUseAccounting = (context: ErpContext) =>
  context.role === 'OWNER' ||
  context.role === 'ADMIN' ||
  context.role === 'COMPTABLE';

export const zowkaSpaceDefinitions: Record<ZowkaSpaceId, ZowkaSpaceDefinition> =
  {
    crm: {
      id: 'crm',
      label: msg`CRM`,
      navigationLabel: msg`Espace CRM`,
      Icon: IconBriefcase,
      entryPath: erpMarocPaths.crm,
      defaultHomePath: erpMarocPaths.crm,
      homeItem: {
        id: 'crm-home',
        label: msg`Vue commerciale`,
        path: erpMarocPaths.crm,
        activePaths: [erpMarocPaths.crm, erpMarocPaths.cockpit],
        Icon: IconChartBar,
      },
      groups: [
        {
          id: 'crm-relations',
          label: msg`Relation client`,
          items: [
            {
              id: 'tiers',
              label: msg`Tiers synchronisés`,
              path: erpMarocPaths.tiers,
              activePaths: [erpMarocPaths.tiers],
              Icon: IconUsers,
              isVisible: (context) => context.capabilities.manageTiers,
            },
            {
              id: 'client-portal',
              label: msg`Portail clients`,
              path: erpMarocPaths.clientPortal,
              activePaths: [erpMarocPaths.clientPortal],
              Icon: IconLink,
            },
            {
              id: 'reminders',
              label: msg`Relances`,
              path: erpMarocPaths.reminders,
              activePaths: [erpMarocPaths.reminders],
              Icon: IconBell,
              isVisible: (context) => context.capabilities.manageReminders,
            },
          ],
        },
        {
          id: 'crm-sales',
          label: msg`Vente`,
          items: [
            {
              id: 'products',
              label: msg`Produits`,
              path: erpMarocPaths.products,
              activePaths: [erpMarocPaths.products],
              Icon: IconBox,
              isVisible: (context) => context.capabilities.manageCatalog,
            },
            {
              id: 'quotes',
              label: msg`Devis`,
              path: erpMarocPaths.quotes,
              activePaths: [
                erpMarocPaths.quotes,
                erpMarocPaths.quoteNew,
                erpMarocPaths.quoteEdit,
                erpMarocPaths.quoteDetail,
              ],
              Icon: IconNotes,
              isVisible: (context) => context.capabilities.manageSalesDocuments,
            },
            {
              id: 'sales-operations',
              label: msg`Commandes et livraisons`,
              path: erpMarocPaths.salesOperations,
              activePaths: [erpMarocPaths.salesOperations],
              Icon: IconListCheck,
              isVisible: (context) => context.capabilities.manageSalesDocuments,
            },
          ],
        },
        {
          id: 'crm-marketing',
          label: msg`Marketing`,
          items: [
            {
              id: 'marketing',
              label: msg`Campagnes et automatisations`,
              path: erpMarocPaths.marketing,
              activePaths: [erpMarocPaths.marketing],
              Icon: IconMail,
              isVisible: (context) => context.capabilities.manageMarketing,
            },
          ],
        },
      ],
    },
    finance: {
      id: 'finance',
      label: msg`Finance`,
      navigationLabel: msg`Espace Finance`,
      Icon: IconBuildingBank,
      entryPath: erpMarocPaths.finance,
      defaultHomePath: erpMarocPaths.finance,
      homeItem: {
        id: 'finance-home',
        label: msg`Pilotage financier`,
        path: erpMarocPaths.finance,
        activePaths: [erpMarocPaths.finance],
        Icon: IconCoins,
        isVisible: canUseAccounting,
      },
      groups: [
        {
          id: 'finance-steering',
          label: msg`Pilotage`,
          items: [
            {
              id: 'financial-planning',
              label: msg`Budgets, analytique et devises`,
              path: erpMarocPaths.financialPlanning,
              activePaths: [erpMarocPaths.financialPlanning],
              Icon: IconChartBar,
              isVisible: canUseAccounting,
            },
          ],
        },
        {
          id: 'finance-sales',
          label: msg`Ventes`,
          items: [
            {
              id: 'invoices',
              label: msg`Factures`,
              path: erpMarocPaths.invoices,
              activePaths: [
                erpMarocPaths.invoices,
                erpMarocPaths.invoiceNew,
                erpMarocPaths.invoiceEdit,
                erpMarocPaths.invoiceDetail,
              ],
              Icon: IconFileText,
              isVisible: (context) => context.capabilities.manageSalesDocuments,
            },
            {
              id: 'credit-notes',
              label: msg`Avoirs`,
              path: erpMarocPaths.creditNotes,
              activePaths: [
                erpMarocPaths.creditNotes,
                erpMarocPaths.creditNoteNew,
                erpMarocPaths.creditNoteEdit,
                erpMarocPaths.creditNoteDetail,
              ],
              Icon: IconFileText,
              isVisible: (context) => context.capabilities.manageCreditNotes,
            },
            {
              id: 'payments',
              label: msg`Paiements`,
              path: erpMarocPaths.payments,
              activePaths: [
                erpMarocPaths.payments,
                erpMarocPaths.paymentNew,
                erpMarocPaths.paymentDetail,
              ],
              Icon: IconCreditCard,
              isVisible: (context) => context.capabilities.createPendingPayment,
            },
          ],
        },
        {
          id: 'finance-purchases',
          label: msg`Achats`,
          items: [
            {
              id: 'procurement',
              label: msg`Demandes et appels d'offres`,
              path: erpMarocPaths.procurement,
              activePaths: [erpMarocPaths.procurement],
              Icon: IconListCheck,
              isVisible: (context) =>
                context.capabilities.manageSupplierAccounting,
            },
            {
              id: 'purchase-orders',
              label: msg`Commandes et réceptions`,
              path: erpMarocPaths.purchaseOrders,
              activePaths: [
                erpMarocPaths.purchaseOrders,
                erpMarocPaths.purchaseOrderNew,
                erpMarocPaths.purchaseOrderDetail,
              ],
              Icon: IconBox,
              isVisible: (context) =>
                context.capabilities.manageSupplierAccounting,
            },
            {
              id: 'documents',
              label: msg`GED et OCR`,
              path: erpMarocPaths.documents,
              activePaths: [erpMarocPaths.documents],
              Icon: IconFileText,
              isVisible: (context) =>
                context.capabilities.manageSupplierAccounting,
            },
            {
              id: 'expense-notes',
              label: msg`Notes de frais`,
              path: erpMarocPaths.expenseNotes,
              activePaths: [erpMarocPaths.expenseNotes],
              Icon: IconFileText,
            },
          ],
        },
        {
          id: 'finance-treasury',
          label: msg`Trésorerie`,
          items: [
            {
              id: 'bank-statements',
              label: msg`Relevés bancaires`,
              path: erpMarocPaths.bankStatements,
              activePaths: [erpMarocPaths.bankStatements],
              Icon: IconBuildingBank,
              isVisible: canUseAccounting,
            },
            {
              id: 'cheques',
              label: msg`Chèques`,
              path: erpMarocPaths.cheques,
              activePaths: [
                erpMarocPaths.cheques,
                erpMarocPaths.chequeDetail,
                erpMarocPaths.chequeDepositSlipDetail,
              ],
              Icon: IconNotes,
              isVisible: canUseAccounting,
            },
          ],
        },
        {
          id: 'finance-inventory',
          label: msg`Stock`,
          items: [
            {
              id: 'inventory',
              label: msg`Stocks et inventaires`,
              path: erpMarocPaths.inventory,
              activePaths: [erpMarocPaths.inventory],
              Icon: IconListDetails,
              isVisible: (context) => context.capabilities.manageInventory,
            },
          ],
        },
        {
          id: 'finance-accounting',
          label: msg`Comptabilité`,
          items: [
            {
              id: 'accounting-entries',
              label: msg`Écritures`,
              path: erpMarocPaths.accountingEntries,
              activePaths: [
                erpMarocPaths.accountingEntries,
                erpMarocPaths.accountingEntryNew,
                erpMarocPaths.accountingEntryEdit,
                erpMarocPaths.accountingEntryDetail,
              ],
              Icon: IconBook,
              isVisible: canUseAccounting,
            },
            {
              id: 'grand-livre',
              label: msg`Grand livre`,
              path: erpMarocPaths.accountingGrandLivre,
              activePaths: [erpMarocPaths.accountingGrandLivre],
              Icon: IconListDetails,
              isVisible: canUseAccounting,
            },
            {
              id: 'balance',
              label: msg`Balance`,
              path: erpMarocPaths.accountingBalance,
              activePaths: [erpMarocPaths.accountingBalance],
              Icon: IconChartBar,
              isVisible: canUseAccounting,
            },
            {
              id: 'lettrage',
              label: msg`Lettrage`,
              path: erpMarocPaths.accountingLettrage,
              activePaths: [erpMarocPaths.accountingLettrage],
              Icon: IconLink,
              isVisible: canUseAccounting,
            },
            {
              id: 'accounting-references',
              label: msg`Plan comptable et journaux`,
              path: erpMarocPaths.accountingReferences,
              activePaths: [erpMarocPaths.accountingReferences],
              Icon: IconSettings,
              isVisible: canUseAccounting,
            },
            {
              id: 'accounting-copilot',
              label: msg`Copilote comptable`,
              path: erpMarocPaths.accountingCopilot,
              activePaths: [erpMarocPaths.accountingCopilot],
              Icon: IconSparkles,
              isVisible: canUseAccounting,
            },
          ],
        },
        {
          id: 'finance-compliance',
          label: msg`Fiscalité et clôture`,
          items: [
            {
              id: 'fiscal',
              label: msg`Fiscalité`,
              path: erpMarocPaths.fiscal,
              activePaths: [erpMarocPaths.fiscal],
              Icon: IconPercentage,
              isVisible: canUseAccounting,
            },
            {
              id: 'provisions',
              label: msg`Provisions`,
              path: erpMarocPaths.accountingProvisions,
              activePaths: [erpMarocPaths.accountingProvisions],
              Icon: IconFileText,
              isVisible: canUseAccounting,
            },
            {
              id: 'fixed-assets',
              label: msg`Immobilisations`,
              path: erpMarocPaths.fixedAssets,
              activePaths: [erpMarocPaths.fixedAssets],
              Icon: IconCoins,
              isVisible: canUseAccounting,
            },
            {
              id: 'accounting-review',
              label: msg`Révision comptable`,
              path: erpMarocPaths.accountingReview,
              activePaths: [erpMarocPaths.accountingReview],
              Icon: IconListCheck,
              isVisible: canUseAccounting,
            },
            {
              id: 'accounting-closing',
              label: msg`Clôture comptable`,
              path: erpMarocPaths.accountingClosing,
              activePaths: [erpMarocPaths.accountingClosing],
              Icon: IconLock,
              isVisible: canUseAccounting,
            },
          ],
        },
        {
          id: 'finance-setup',
          label: msg`Configuration`,
          items: [
            {
              id: 'onboarding',
              label: msg`Mise en service`,
              path: erpMarocPaths.onboarding,
              activePaths: [erpMarocPaths.onboarding],
              Icon: IconListCheck,
              isVisible: canUseAccounting,
            },
          ],
        },
      ],
    },
    hr: {
      id: 'hr',
      label: msg`RH`,
      navigationLabel: msg`Espace RH`,
      Icon: IconUsersGroup,
      entryPath: erpMarocPaths.hr,
      defaultHomePath: erpMarocPaths.hr,
      homeItem: {
        id: 'hr-home',
        label: msg`Pilotage RH`,
        path: erpMarocPaths.hr,
        activePaths: [erpMarocPaths.hr],
        Icon: IconChartBar,
      },
      groups: [
        {
          id: 'hr-steering',
          label: msg`Pilotage`,
          items: [
            {
              id: 'hr-operations',
              label: msg`Opérations et campagnes RH`,
              path: erpMarocPaths.hrOperations,
              activePaths: [erpMarocPaths.hrOperations],
              Icon: IconChartBar,
            },
          ],
        },
        {
          id: 'hr-employees',
          label: msg`Collaborateurs`,
          items: [
            {
              id: 'hr-core',
              label: msg`Dossiers salariés`,
              path: erpMarocPaths.hrCore,
              activePaths: [
                erpMarocPaths.hrCore,
                erpMarocPaths.hrEmployeeDetail,
              ],
              Icon: IconUsers,
            },
          ],
        },
        {
          id: 'hr-time',
          label: msg`Temps et présence`,
          items: [
            {
              id: 'time-attendance',
              label: msg`Temps, congés et présence`,
              path: erpMarocPaths.timeAttendance,
              activePaths: [erpMarocPaths.timeAttendance],
              Icon: IconClock,
            },
          ],
        },
        {
          id: 'hr-payroll',
          label: msg`Paie`,
          items: [
            {
              id: 'payroll-regulatory',
              label: msg`Paie et réglementation`,
              path: erpMarocPaths.payrollRegulatory,
              activePaths: [erpMarocPaths.payrollRegulatory],
              Icon: IconSettings,
            },
          ],
        },
        {
          id: 'hr-talent',
          label: msg`Talents`,
          items: [
            {
              id: 'talent',
              label: msg`Recrutement et développement`,
              path: erpMarocPaths.talent,
              activePaths: [erpMarocPaths.talent],
              Icon: IconUsersGroup,
            },
          ],
        },
        {
          id: 'hr-services',
          label: msg`Services salariés`,
          items: [
            {
              id: 'employee-portal',
              label: msg`Portail salarié`,
              path: erpMarocPaths.employeePortal,
              activePaths: [erpMarocPaths.employeePortal],
              Icon: IconUsers,
            },
          ],
        },
      ],
    },
  };

export const isZowkaNavigationItemActive = (
  item: ZowkaNavigationItem,
  pathname: string,
) =>
  item.activePaths.some((activePath) =>
    matchPath({ path: activePath, end: true }, pathname),
  );

export const getVisibleZowkaGroups = (
  space: ZowkaSpaceDefinition,
  context: ErpContext,
): ZowkaNavigationGroup[] =>
  space.groups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => item.isVisible?.(context) ?? true),
    }))
    .filter((group) => group.items.length > 0);

export const resolveZowkaSpaceForPath = (
  pathname: string,
  fallback: ZowkaSpaceId = 'crm',
): ZowkaSpaceId => {
  if (pathname === erpMarocPaths.crm || pathname.startsWith('/crm/')) {
    return 'crm';
  }
  if (pathname === erpMarocPaths.finance || pathname.startsWith('/finance/')) {
    return 'finance';
  }
  if (pathname === erpMarocPaths.hr || pathname.startsWith('/rh/')) {
    return 'hr';
  }
  if (pathname === '/objects' || pathname.startsWith('/objects/')) {
    return 'crm';
  }

  for (const spaceId of ZOWKA_SPACE_IDS) {
    const space = zowkaSpaceDefinitions[spaceId];
    const items = [
      space.homeItem,
      ...space.groups.flatMap(({ items }) => items),
    ];

    if (items.some((item) => isZowkaNavigationItemActive(item, pathname))) {
      return spaceId;
    }
  }

  return fallback;
};

export const getZowkaSpaceHomePath = (spaceId: ZowkaSpaceId) =>
  zowkaSpaceDefinitions[spaceId].defaultHomePath;
