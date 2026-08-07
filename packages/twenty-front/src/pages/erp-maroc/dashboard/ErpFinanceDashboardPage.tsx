import {
  ErpSpaceDashboard,
  type ErpDashboardActionGroup,
  type ErpDashboardMetric,
} from '@/erp-maroc/components/ErpSpaceDashboard';
import { useErpMarocContext } from '@/erp-maroc/context/useErpMarocContext';
import { erpMarocPaths } from '@/erp-maroc/navigation/erpMarocPaths';
import { formatMadCents } from '@/erp-maroc/utils/money';
import { useEffect, useMemo, useState } from 'react';
import {
  erpAccountingEntryPageSchema,
  erpBankStatementListSchema,
  erpInvoicePageSchema,
  erpPaymentPageSchema,
  erpPurchaseOrderListSchema,
  type ErpAccountingEntryPage,
  type ErpBankStatement,
  type ErpInvoicePage,
  type ErpPaymentPage,
  type ErpPurchaseOrder,
} from 'twenty-shared/erp-maroc';
import {
  IconBook,
  IconBox,
  IconBuildingBank,
  IconFileText,
  IconListCheck,
  IconPercentage,
  IconReceipt,
} from 'twenty-ui/display';

type FinanceData = {
  invoices?: ErpInvoicePage;
  payments?: ErpPaymentPage;
  bankStatements?: ErpBankStatement[];
  entries?: ErpAccountingEntryPage;
  purchaseOrders?: ErpPurchaseOrder[];
};

type FinanceRequestKey = keyof FinanceData;

export const ErpFinanceDashboardPage = () => {
  const state = useErpMarocContext();
  const { client } = state;
  const context = state.status === 'ready' ? state.context : null;
  const [generation, setGeneration] = useState(0);
  const [loadState, setLoadState] = useState<'loading' | 'ready' | 'error'>(
    'loading',
  );
  const [data, setData] = useState<FinanceData>({});
  const [failedKeys, setFailedKeys] = useState<FinanceRequestKey[]>([]);
  const canUseAccounting =
    context !== null && ['OWNER', 'ADMIN', 'COMPTABLE'].includes(context.role);

  useEffect(() => {
    if (context === null) return;

    const abortController = new AbortController();
    const requests: Array<Promise<{ key: FinanceRequestKey; value: unknown }>> =
      [];
    const requestedKeys: FinanceRequestKey[] = [];

    if (context.capabilities.manageSalesDocuments) {
      requestedKeys.push('invoices');
      requests.push(
        client
          .request({
            method: 'GET',
            path: '/invoices',
            schema: erpInvoicePageSchema,
            signal: abortController.signal,
          })
          .then((value) => ({ key: 'invoices', value })),
      );
    }
    if (context.capabilities.createPendingPayment) {
      requestedKeys.push('payments');
      requests.push(
        client
          .request({
            method: 'GET',
            path: '/payments',
            schema: erpPaymentPageSchema,
            signal: abortController.signal,
          })
          .then((value) => ({ key: 'payments', value })),
      );
    }
    if (context.capabilities.manageSupplierAccounting) {
      requestedKeys.push('purchaseOrders');
      requests.push(
        client
          .request({
            method: 'GET',
            path: '/purchase-orders',
            schema: erpPurchaseOrderListSchema,
            signal: abortController.signal,
          })
          .then((value) => ({ key: 'purchaseOrders', value })),
      );
    }
    if (canUseAccounting) {
      requestedKeys.push('bankStatements', 'entries');
      requests.push(
        client
          .request({
            method: 'GET',
            path: '/bank-statements',
            schema: erpBankStatementListSchema,
            signal: abortController.signal,
          })
          .then((value) => ({ key: 'bankStatements', value })),
        client
          .request({
            method: 'GET',
            path: '/accounting/entries',
            schema: erpAccountingEntryPageSchema,
            signal: abortController.signal,
          })
          .then((value) => ({ key: 'entries', value })),
      );
    }

    setLoadState('loading');
    setFailedKeys([]);
    void Promise.allSettled(requests).then((results) => {
      if (abortController.signal.aborted) return;

      const nextData: FinanceData = {};
      const nextFailedKeys: FinanceRequestKey[] = [];
      let successCount = 0;

      results.forEach((result, index) => {
        if (result.status !== 'fulfilled') {
          nextFailedKeys.push(requestedKeys[index]);
          return;
        }
        successCount += 1;
        const { key, value } = result.value;
        if (key === 'invoices') nextData.invoices = value as ErpInvoicePage;
        if (key === 'payments') nextData.payments = value as ErpPaymentPage;
        if (key === 'bankStatements')
          nextData.bankStatements = value as ErpBankStatement[];
        if (key === 'entries')
          nextData.entries = value as ErpAccountingEntryPage;
        if (key === 'purchaseOrders')
          nextData.purchaseOrders = value as ErpPurchaseOrder[];
      });

      setData(nextData);
      setFailedKeys(nextFailedKeys);
      setLoadState(successCount === 0 ? 'error' : 'ready');
    });

    return () => abortController.abort();
  }, [canUseAccounting, client, context, generation]);

  const metrics = useMemo<ErpDashboardMetric[]>(() => {
    const invoices = data.invoices?.items ?? [];
    const payments = data.payments?.items ?? [];
    const statements = data.bankStatements ?? [];
    const entries = data.entries?.items ?? [];
    const purchaseOrders = data.purchaseOrders ?? [];
    const items: ErpDashboardMetric[] = [];

    if (context?.capabilities.manageSalesDocuments) {
      items.push(
        {
          id: 'outstanding',
          label: 'Encours clients',
          value: failedKeys.includes('invoices')
            ? '—'
            : formatMadCents(
                invoices.reduce(
                  (sum, invoice) => sum + invoice.outstandingCents,
                  0,
                ),
              ),
          to: erpMarocPaths.invoices,
        },
        {
          id: 'overdue',
          label: 'Factures en retard',
          value: failedKeys.includes('invoices')
            ? '—'
            : String(invoices.filter(({ isOverdue }) => isOverdue).length),
          to: `${erpMarocPaths.invoices}?status=OVERDUE`,
        },
      );
    }
    if (context?.capabilities.createPendingPayment) {
      items.push({
        id: 'payments',
        label: 'Paiements à affecter',
        value: failedKeys.includes('payments')
          ? '—'
          : String(
              payments.filter(({ status }) => status === 'PENDING_ALLOCATION')
                .length,
            ),
        to: `${erpMarocPaths.payments}?status=PENDING_ALLOCATION`,
      });
    }
    if (context?.capabilities.manageSupplierAccounting) {
      const openPurchaseOrders = purchaseOrders.filter(({ status }) =>
        ['DRAFT', 'CONFIRMED', 'PARTIALLY_RECEIVED', 'RECEIVED'].includes(
          status,
        ),
      );
      items.push(
        {
          id: 'purchases-to-process',
          label: 'Achats à traiter',
          value: failedKeys.includes('purchaseOrders')
            ? '—'
            : String(openPurchaseOrders.length),
          to: erpMarocPaths.purchaseOrders,
        },
        {
          id: 'purchase-commitments',
          label: 'Engagements fournisseurs',
          value: failedKeys.includes('purchaseOrders')
            ? '—'
            : formatMadCents(
                openPurchaseOrders.reduce(
                  (sum, order) => sum + order.totalTtcCents,
                  0,
                ),
              ),
          to: erpMarocPaths.purchaseOrders,
        },
      );
    }
    if (canUseAccounting) {
      items.push(
        {
          id: 'bank-statements',
          label: 'Relevés à contrôler',
          value: failedKeys.includes('bankStatements')
            ? '—'
            : String(
                statements.filter(({ status }) =>
                  ['PENDING_OCR', 'PROCESSING', 'READY_FOR_REVIEW'].includes(
                    status,
                  ),
                ).length,
              ),
          to: erpMarocPaths.bankStatements,
        },
        {
          id: 'draft-entries',
          label: 'Écritures brouillon',
          value: failedKeys.includes('entries')
            ? '—'
            : String(entries.filter(({ status }) => status === 'DRAFT').length),
          to: `${erpMarocPaths.accountingEntries}?status=DRAFT`,
        },
      );
    }

    return items;
  }, [canUseAccounting, context, data, failedKeys]);

  const actionGroups = useMemo<ErpDashboardActionGroup[]>(() => {
    const groups: ErpDashboardActionGroup[] = [
      {
        id: 'sales-finance',
        label: 'Cycle client',
        actions: [
          ...(context?.capabilities.manageSalesDocuments
            ? [
                {
                  label: 'Factures clients',
                  to: erpMarocPaths.invoices,
                  Icon: IconFileText,
                },
              ]
            : []),
          ...(context?.capabilities.createPendingPayment
            ? [
                {
                  label: 'Paiements et affectations',
                  to: erpMarocPaths.payments,
                  Icon: IconReceipt,
                },
              ]
            : []),
          ...(context?.capabilities.manageCreditNotes
            ? [
                {
                  label: 'Avoirs',
                  to: erpMarocPaths.creditNotes,
                  Icon: IconFileText,
                },
              ]
            : []),
        ],
      },
    ];

    if (context?.capabilities.manageSupplierAccounting) {
      groups.push({
        id: 'purchases',
        label: 'Achats et fournisseurs',
        actions: [
          {
            label: "Sourcing et appels d'offres",
            to: erpMarocPaths.procurement,
          },
          {
            label: 'Commandes et réceptions',
            to: erpMarocPaths.purchaseOrders,
            Icon: IconBox,
          },
          {
            label: 'Factures fournisseurs et OCR',
            to: erpMarocPaths.documents,
            Icon: IconFileText,
          },
          {
            label: 'Notes de frais',
            to: erpMarocPaths.expenseNotes,
            Icon: IconReceipt,
          },
        ],
      });
    }

    if (canUseAccounting) {
      groups.push(
        {
          id: 'treasury',
          label: 'Trésorerie',
          actions: [
            {
              label: 'Relevés et rapprochement',
              to: erpMarocPaths.bankStatements,
              Icon: IconBuildingBank,
            },
            {
              label: 'Chèques et LCN',
              to: erpMarocPaths.cheques,
              Icon: IconListCheck,
            },
          ],
        },
        {
          id: 'accounting',
          label: 'Comptabilité et fiscalité',
          actions: [
            {
              label: 'Écritures comptables',
              to: erpMarocPaths.accountingEntries,
              Icon: IconBook,
            },
            {
              label: 'Déclarations fiscales',
              to: erpMarocPaths.fiscal,
              Icon: IconPercentage,
            },
            {
              label: 'Révision et clôture',
              to: erpMarocPaths.accountingClosing,
              Icon: IconListCheck,
            },
          ],
        },
      );
    }

    return groups.filter(({ actions }) => actions.length > 0);
  }, [canUseAccounting, context]);

  return (
    <ErpSpaceDashboard
      title="Finance"
      description="Trésorerie, comptabilité et obligations marocaines"
      state={loadState}
      metrics={metrics}
      actionGroups={actionGroups}
      onRetry={() => setGeneration((value) => value + 1)}
    />
  );
};
