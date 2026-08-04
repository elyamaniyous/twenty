import { AppRouterProviders } from '@/app/components/AppRouterProviders';
import { LazyRoute } from '@/app/components/LazyRoute';
import { SettingsRoutes } from '@/app/components/SettingsRoutes';
import { VerifyLoginTokenEffect } from '@/auth/components/VerifyLoginTokenEffect';
import { isErpMarocEnabledState } from '@/client-config/states/isErpMarocEnabledState';
import { ErpMarocContextProvider } from '@/erp-maroc/context/ErpMarocContextProvider';
import { ErpMarocRouteBoundary } from '@/erp-maroc/navigation/ErpMarocRouteBoundary';
import { erpMarocPaths } from '@/erp-maroc/navigation/erpMarocPaths';

import { VerifyEmailEffect } from '@/auth/components/VerifyEmailEffect';
import indexAppPath from '@/navigation/utils/indexAppPath';
import { BlankLayout } from '@/ui/layout/page/components/BlankLayout';
import { DefaultLayout } from '@/ui/layout/page/components/DefaultLayout';
import { useAtomStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomStateValue';
import { AppPath } from 'twenty-shared/types';

import { lazy } from 'react';
import {
  createBrowserRouter,
  createRoutesFromElements,
  Route,
  useParams,
} from 'react-router-dom';

const ErpMarocCockpitPage = lazy(() =>
  import('~/pages/erp-maroc/ErpMarocCockpitPage').then((module) => ({
    default: module.ErpMarocCockpitPage,
  })),
);

const ErpMarocProductsPage = lazy(() =>
  import('~/pages/erp-maroc/products/ErpProductsPage').then((module) => ({
    default: module.ErpProductsPage,
  })),
);

const ErpMarocTiersPage = lazy(() =>
  import('~/pages/erp-maroc/tiers/ErpTiersPage').then((module) => ({
    default: module.ErpTiersPage,
  })),
);

const ErpMarocQuotesPage = lazy(() =>
  import('~/pages/erp-maroc/quotes/ErpQuotesPage').then((module) => ({
    default: module.ErpQuotesPage,
  })),
);

const ErpMarocQuoteEditorPage = lazy(() =>
  import('~/pages/erp-maroc/quotes/ErpQuoteEditorPage').then((module) => ({
    default: module.ErpQuoteEditorPage,
  })),
);

const ErpMarocQuoteDetailPage = lazy(() =>
  import('~/pages/erp-maroc/quotes/ErpQuoteDetailPage').then((module) => ({
    default: module.ErpQuoteDetailPage,
  })),
);

const ErpPurchaseOrdersPage = lazy(() =>
  import('~/pages/erp-maroc/purchase-orders/ErpPurchaseOrdersPage').then(
    (module) => ({ default: module.ErpPurchaseOrdersPage }),
  ),
);

const ErpPurchaseOrderEditorPage = lazy(() =>
  import('~/pages/erp-maroc/purchase-orders/ErpPurchaseOrderEditorPage').then(
    (module) => ({ default: module.ErpPurchaseOrderEditorPage }),
  ),
);

const ErpPurchaseOrderDetailPage = lazy(() =>
  import('~/pages/erp-maroc/purchase-orders/ErpPurchaseOrderDetailPage').then(
    (module) => ({ default: module.ErpPurchaseOrderDetailPage }),
  ),
);

const ErpMarocInvoicesPage = lazy(() =>
  import('~/pages/erp-maroc/invoices/ErpInvoicesPage').then((module) => ({
    default: module.ErpInvoicesPage,
  })),
);

const ErpInvoiceEditorPage = lazy(() =>
  import('~/pages/erp-maroc/invoices/ErpInvoiceEditorPage').then((module) => ({
    default: module.ErpInvoiceEditorPage,
  })),
);

const ErpInvoiceDetailPage = lazy(() =>
  import('~/pages/erp-maroc/invoices/ErpInvoiceDetailPage').then((module) => ({
    default: module.ErpInvoiceDetailPage,
  })),
);

const ErpInvoiceEditorRoute = () => {
  const { id: invoiceId } = useParams<{ id: string }>();

  return <ErpInvoiceEditorPage invoiceId={invoiceId} />;
};

const ErpPaymentsPage = lazy(() =>
  import('~/pages/erp-maroc/payments/ErpPaymentsPage').then((module) => ({
    default: module.ErpPaymentsPage,
  })),
);

const ErpPaymentEditorPage = lazy(() =>
  import('~/pages/erp-maroc/payments/ErpPaymentEditorPage').then((module) => ({
    default: module.ErpPaymentEditorPage,
  })),
);

const ErpPaymentDetailPage = lazy(() =>
  import('~/pages/erp-maroc/payments/ErpPaymentDetailPage').then((module) => ({
    default: module.ErpPaymentDetailPage,
  })),
);

const ErpChequesPage = lazy(() =>
  import('~/pages/erp-maroc/cheques/ErpChequesPage').then((module) => ({
    default: module.ErpChequesPage,
  })),
);

const ErpChequeDetailPage = lazy(() =>
  import('~/pages/erp-maroc/cheques/ErpChequeDetailPage').then((module) => ({
    default: module.ErpChequeDetailPage,
  })),
);

const ErpChequeDepositSlipPage = lazy(() =>
  import('~/pages/erp-maroc/cheques/ErpChequeDepositSlipPage').then(
    (module) => ({
      default: module.ErpChequeDepositSlipPage,
    }),
  ),
);

const ErpCreditNotesPage = lazy(() =>
  import('~/pages/erp-maroc/credit-notes/ErpCreditNotesPage').then(
    (module) => ({ default: module.ErpCreditNotesPage }),
  ),
);

const ErpCreditNoteEditorPage = lazy(() =>
  import('~/pages/erp-maroc/credit-notes/ErpCreditNoteEditorPage').then(
    (module) => ({ default: module.ErpCreditNoteEditorPage }),
  ),
);

const ErpCreditNoteDetailPage = lazy(() =>
  import('~/pages/erp-maroc/credit-notes/ErpCreditNoteDetailPage').then(
    (module) => ({ default: module.ErpCreditNoteDetailPage }),
  ),
);

const ErpMarocRemindersPage = lazy(() =>
  import('~/pages/erp-maroc/reminders/ErpRemindersPage').then((module) => ({
    default: module.ErpRemindersPage,
  })),
);

const ErpMarketingPage = lazy(() =>
  import('~/pages/erp-maroc/marketing/ErpMarketingPage').then((module) => ({
    default: module.ErpMarketingPage,
  })),
);

const ErpPayrollRegulatoryPage = lazy(() =>
  import('~/pages/erp-maroc/hr/ErpPayrollRegulatoryPage').then((module) => ({
    default: module.ErpPayrollRegulatoryPage,
  })),
);

const ErpHrCorePage = lazy(() =>
  import('~/pages/erp-maroc/hr/ErpHrCorePage').then((module) => ({
    default: module.ErpHrCorePage,
  })),
);

const ErpEmployeeHrDetailPage = lazy(() =>
  import('~/pages/erp-maroc/hr/ErpEmployeeHrDetailPage').then((module) => ({
    default: module.ErpEmployeeHrDetailPage,
  })),
);

const ErpEntriesPage = lazy(() =>
  import('~/pages/erp-maroc/accounting/ErpEntriesPage').then((module) => ({
    default: module.ErpEntriesPage,
  })),
);

const ErpAccountingEntryEditorPage = lazy(() =>
  import('~/pages/erp-maroc/accounting/ErpAccountingEntryEditorPage').then(
    (module) => ({ default: module.ErpAccountingEntryEditorPage }),
  ),
);

const ErpEntryDetailPage = lazy(() =>
  import('~/pages/erp-maroc/accounting/ErpEntryDetailPage').then((module) => ({
    default: module.ErpEntryDetailPage,
  })),
);

const ErpAccountingProvisionsPage = lazy(() =>
  import('~/pages/erp-maroc/accounting/ErpAccountingProvisionsPage').then(
    (module) => ({ default: module.ErpAccountingProvisionsPage }),
  ),
);

const ErpGrandLivrePage = lazy(() =>
  import('~/pages/erp-maroc/accounting/ErpGrandLivrePage').then((module) => ({
    default: module.ErpGrandLivrePage,
  })),
);

const ErpBalancePage = lazy(() =>
  import('~/pages/erp-maroc/accounting/ErpBalancePage').then((module) => ({
    default: module.ErpBalancePage,
  })),
);

const ErpLettragePage = lazy(() =>
  import('~/pages/erp-maroc/accounting/ErpLettragePage').then((module) => ({
    default: module.ErpLettragePage,
  })),
);

const ErpAccountingReferencesPage = lazy(() =>
  import('~/pages/erp-maroc/accounting/ErpAccountingReferencesPage').then(
    (module) => ({ default: module.ErpAccountingReferencesPage }),
  ),
);

const ErpAccountingClosingPage = lazy(() =>
  import('~/pages/erp-maroc/accounting/ErpAccountingClosingPage').then(
    (module) => ({ default: module.ErpAccountingClosingPage }),
  ),
);

const RecordIndexPage = lazy(() =>
  import('~/pages/object-record/RecordIndexPage').then((module) => ({
    default: module.RecordIndexPage,
  })),
);

const RecordShowPage = lazy(() =>
  import('~/pages/object-record/RecordShowPage').then((module) => ({
    default: module.RecordShowPage,
  })),
);

const SignInUp = lazy(() =>
  import('~/pages/auth/SignInUp').then((module) => ({
    default: module.SignInUp,
  })),
);

const PasswordReset = lazy(() =>
  import('~/pages/auth/PasswordReset').then((module) => ({
    default: module.PasswordReset,
  })),
);

const Authorize = lazy(() =>
  import('~/pages/auth/Authorize').then((module) => ({
    default: module.Authorize,
  })),
);

const CreateWorkspace = lazy(() =>
  import('~/pages/onboarding/CreateWorkspace').then((module) => ({
    default: module.CreateWorkspace,
  })),
);

const CreateProfile = lazy(() =>
  import('~/pages/onboarding/CreateProfile').then((module) => ({
    default: module.CreateProfile,
  })),
);

const SyncEmails = lazy(() =>
  import('~/pages/onboarding/SyncEmails').then((module) => ({
    default: module.SyncEmails,
  })),
);

const InviteTeam = lazy(() =>
  import('~/pages/onboarding/InviteTeam').then((module) => ({
    default: module.InviteTeam,
  })),
);

const ChooseYourPlan = lazy(() =>
  import('~/pages/onboarding/ChooseYourPlan').then((module) => ({
    default: module.ChooseYourPlan,
  })),
);

const PaymentSuccess = lazy(() =>
  import('~/pages/onboarding/PaymentSuccess').then((module) => ({
    default: module.PaymentSuccess,
  })),
);

const BookCallDecision = lazy(() =>
  import('~/pages/onboarding/BookCallDecision').then((module) => ({
    default: module.BookCallDecision,
  })),
);

const BookCall = lazy(() =>
  import('~/pages/onboarding/BookCall').then((module) => ({
    default: module.BookCall,
  })),
);

const StandalonePageLayoutPage = lazy(() =>
  import('~/pages/page-layout/StandalonePageLayoutPage').then((module) => ({
    default: module.StandalonePageLayoutPage,
  })),
);

const NotFound = lazy(() =>
  import('~/pages/not-found/NotFound').then((module) => ({
    default: module.NotFound,
  })),
);

export const useCreateAppRouter = (
  isFunctionSettingsEnabled?: boolean,
  isAdminPageEnabled?: boolean,
) => {
  const isErpMarocEnabled = useAtomStateValue(isErpMarocEnabledState);

  return createBrowserRouter(
    createRoutesFromElements(
      <Route
        element={<AppRouterProviders />}
        // To switch state to `loading` temporarily to enable us
        // to set scroll position before the page is rendered
        loader={async () => Promise.resolve(null)}
      >
        <Route element={<DefaultLayout />}>
          <Route path={AppPath.Verify} element={<VerifyLoginTokenEffect />} />
          <Route path={AppPath.VerifyEmail} element={<VerifyEmailEffect />} />
          <Route
            path={AppPath.SignInUp}
            element={
              <LazyRoute fallback={null}>
                <SignInUp />
              </LazyRoute>
            }
          />
          <Route
            path={AppPath.Invite}
            element={
              <LazyRoute fallback={null}>
                <SignInUp />
              </LazyRoute>
            }
          />
          <Route
            path={AppPath.ResetPassword}
            element={
              <LazyRoute fallback={null}>
                <PasswordReset />
              </LazyRoute>
            }
          />
          <Route
            path={AppPath.CreateWorkspace}
            element={
              <LazyRoute fallback={null}>
                <CreateWorkspace />
              </LazyRoute>
            }
          />
          <Route
            path={AppPath.CreateProfile}
            element={
              <LazyRoute fallback={null}>
                <CreateProfile />
              </LazyRoute>
            }
          />
          <Route
            path={AppPath.SyncEmails}
            element={
              <LazyRoute fallback={null}>
                <SyncEmails />
              </LazyRoute>
            }
          />
          <Route
            path={AppPath.InviteTeam}
            element={
              <LazyRoute fallback={null}>
                <InviteTeam />
              </LazyRoute>
            }
          />
          <Route
            path={AppPath.PlanRequired}
            element={
              <LazyRoute fallback={null}>
                <ChooseYourPlan />
              </LazyRoute>
            }
          />
          <Route
            path={AppPath.PlanRequiredSuccess}
            element={
              <LazyRoute fallback={null}>
                <PaymentSuccess />
              </LazyRoute>
            }
          />
          <Route
            path={AppPath.BookCallDecision}
            element={
              <LazyRoute fallback={null}>
                <BookCallDecision />
              </LazyRoute>
            }
          />
          <Route
            path={AppPath.BookCall}
            element={
              <LazyRoute fallback={null}>
                <BookCall />
              </LazyRoute>
            }
          />
          <Route path={indexAppPath.getIndexAppPath()} element={<></>} />
          <Route
            path={AppPath.RecordIndexPage}
            element={
              <LazyRoute>
                <RecordIndexPage />
              </LazyRoute>
            }
          />
          <Route
            path={AppPath.RecordShowPage}
            element={
              <LazyRoute>
                <RecordShowPage />
              </LazyRoute>
            }
          />
          <Route
            path={AppPath.PageLayoutPage}
            element={
              <LazyRoute>
                <StandalonePageLayoutPage />
              </LazyRoute>
            }
          />
          {isErpMarocEnabled && (
            <Route
              element={
                <ErpMarocContextProvider>
                  <ErpMarocRouteBoundary />
                </ErpMarocContextProvider>
              }
            >
              <Route
                path={erpMarocPaths.cockpit}
                element={
                  <LazyRoute>
                    <ErpMarocCockpitPage />
                  </LazyRoute>
                }
              />
              <Route
                path={erpMarocPaths.products}
                element={
                  <LazyRoute>
                    <ErpMarocProductsPage />
                  </LazyRoute>
                }
              />
              <Route
                path={erpMarocPaths.tiers}
                element={
                  <LazyRoute>
                    <ErpMarocTiersPage />
                  </LazyRoute>
                }
              />
              <Route
                path={erpMarocPaths.quotes}
                element={
                  <LazyRoute>
                    <ErpMarocQuotesPage />
                  </LazyRoute>
                }
              />
              <Route
                path={erpMarocPaths.quoteNew}
                element={
                  <LazyRoute>
                    <ErpMarocQuoteEditorPage />
                  </LazyRoute>
                }
              />
              <Route
                path={erpMarocPaths.quoteEdit}
                element={
                  <LazyRoute>
                    <ErpMarocQuoteEditorPage />
                  </LazyRoute>
                }
              />
              <Route
                path={erpMarocPaths.quoteDetail}
                element={
                  <LazyRoute>
                    <ErpMarocQuoteDetailPage />
                  </LazyRoute>
                }
              />
              <Route
                path={erpMarocPaths.invoices}
                element={
                  <LazyRoute>
                    <ErpMarocInvoicesPage />
                  </LazyRoute>
                }
              />
              <Route
                path={erpMarocPaths.purchaseOrders}
                element={
                  <LazyRoute>
                    <ErpPurchaseOrdersPage />
                  </LazyRoute>
                }
              />
              <Route
                path={erpMarocPaths.purchaseOrderNew}
                element={
                  <LazyRoute>
                    <ErpPurchaseOrderEditorPage />
                  </LazyRoute>
                }
              />
              <Route
                path={erpMarocPaths.purchaseOrderDetail}
                element={
                  <LazyRoute>
                    <ErpPurchaseOrderDetailPage />
                  </LazyRoute>
                }
              />
              <Route
                path={erpMarocPaths.invoiceNew}
                element={
                  <LazyRoute>
                    <ErpInvoiceEditorPage />
                  </LazyRoute>
                }
              />
              <Route
                path={erpMarocPaths.invoiceEdit}
                element={
                  <LazyRoute>
                    <ErpInvoiceEditorRoute />
                  </LazyRoute>
                }
              />
              <Route
                path={erpMarocPaths.invoiceDetail}
                element={
                  <LazyRoute>
                    <ErpInvoiceDetailPage />
                  </LazyRoute>
                }
              />
              <Route
                path={erpMarocPaths.payments}
                element={
                  <LazyRoute>
                    <ErpPaymentsPage />
                  </LazyRoute>
                }
              />
              <Route
                path={erpMarocPaths.paymentNew}
                element={
                  <LazyRoute>
                    <ErpPaymentEditorPage />
                  </LazyRoute>
                }
              />
              <Route
                path={erpMarocPaths.paymentDetail}
                element={
                  <LazyRoute>
                    <ErpPaymentDetailPage />
                  </LazyRoute>
                }
              />
              <Route
                path={erpMarocPaths.cheques}
                element={
                  <LazyRoute>
                    <ErpChequesPage />
                  </LazyRoute>
                }
              />
              <Route
                path={erpMarocPaths.chequeDetail}
                element={
                  <LazyRoute>
                    <ErpChequeDetailPage />
                  </LazyRoute>
                }
              />
              <Route
                path={erpMarocPaths.chequeDepositSlipDetail}
                element={
                  <LazyRoute>
                    <ErpChequeDepositSlipPage />
                  </LazyRoute>
                }
              />
              <Route
                path={erpMarocPaths.creditNotes}
                element={
                  <LazyRoute>
                    <ErpCreditNotesPage />
                  </LazyRoute>
                }
              />
              <Route
                path={erpMarocPaths.creditNoteNew}
                element={
                  <LazyRoute>
                    <ErpCreditNoteEditorPage />
                  </LazyRoute>
                }
              />
              <Route
                path={erpMarocPaths.creditNoteEdit}
                element={
                  <LazyRoute>
                    <ErpCreditNoteEditorPage />
                  </LazyRoute>
                }
              />
              <Route
                path={erpMarocPaths.creditNoteDetail}
                element={
                  <LazyRoute>
                    <ErpCreditNoteDetailPage />
                  </LazyRoute>
                }
              />
              <Route
                path={erpMarocPaths.reminders}
                element={
                  <LazyRoute>
                    <ErpMarocRemindersPage />
                  </LazyRoute>
                }
              />
              <Route
                path={erpMarocPaths.marketing}
                element={
                  <LazyRoute>
                    <ErpMarketingPage />
                  </LazyRoute>
                }
              />
              <Route
                path={erpMarocPaths.hrCore}
                element={
                  <LazyRoute>
                    <ErpHrCorePage />
                  </LazyRoute>
                }
              />
              <Route
                path={erpMarocPaths.hrEmployeeDetail}
                element={
                  <LazyRoute>
                    <ErpEmployeeHrDetailPage />
                  </LazyRoute>
                }
              />
              <Route
                path={erpMarocPaths.payrollRegulatory}
                element={
                  <LazyRoute>
                    <ErpPayrollRegulatoryPage />
                  </LazyRoute>
                }
              />
              <Route
                path={erpMarocPaths.accountingEntries}
                element={
                  <LazyRoute>
                    <ErpEntriesPage />
                  </LazyRoute>
                }
              />
              <Route
                path={erpMarocPaths.accountingEntryNew}
                element={
                  <LazyRoute>
                    <ErpAccountingEntryEditorPage />
                  </LazyRoute>
                }
              />
              <Route
                path={erpMarocPaths.accountingEntryEdit}
                element={
                  <LazyRoute>
                    <ErpAccountingEntryEditorPage />
                  </LazyRoute>
                }
              />
              <Route
                path={erpMarocPaths.accountingEntryDetail}
                element={
                  <LazyRoute>
                    <ErpEntryDetailPage />
                  </LazyRoute>
                }
              />
              <Route
                path={erpMarocPaths.accountingProvisions}
                element={
                  <LazyRoute>
                    <ErpAccountingProvisionsPage />
                  </LazyRoute>
                }
              />
              <Route
                path={erpMarocPaths.accountingGrandLivre}
                element={
                  <LazyRoute>
                    <ErpGrandLivrePage />
                  </LazyRoute>
                }
              />
              <Route
                path={erpMarocPaths.accountingBalance}
                element={
                  <LazyRoute>
                    <ErpBalancePage />
                  </LazyRoute>
                }
              />
              <Route
                path={erpMarocPaths.accountingLettrage}
                element={
                  <LazyRoute>
                    <ErpLettragePage />
                  </LazyRoute>
                }
              />
              <Route
                path={erpMarocPaths.accountingReferences}
                element={
                  <LazyRoute>
                    <ErpAccountingReferencesPage />
                  </LazyRoute>
                }
              />
              <Route
                path={erpMarocPaths.accountingClosing}
                element={
                  <LazyRoute>
                    <ErpAccountingClosingPage />
                  </LazyRoute>
                }
              />
            </Route>
          )}
          <Route
            path={AppPath.SettingsCatchAll}
            element={
              <SettingsRoutes
                isFunctionSettingsEnabled={isFunctionSettingsEnabled}
                isAdminPageEnabled={isAdminPageEnabled}
              />
            }
          />
          <Route
            path={AppPath.NotFoundWildcard}
            element={
              <LazyRoute>
                <NotFound />
              </LazyRoute>
            }
          />
        </Route>
        <Route element={<BlankLayout />}>
          <Route
            path={AppPath.Authorize}
            element={
              <LazyRoute>
                <Authorize />
              </LazyRoute>
            }
          />
        </Route>
      </Route>,
    ),
  );
};
