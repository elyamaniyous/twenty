import { isErpMarocEnabledState } from '@/client-config/states/isErpMarocEnabledState';
import { NavigationDrawerErpMarocSection } from '@/erp-maroc/navigation/NavigationDrawerErpMarocSection';
import { erpMarocPaths } from '@/erp-maroc/navigation/erpMarocPaths';
import { MainNavigationDrawerScrollableItems } from '@/navigation/components/MainNavigationDrawerScrollableItems';
import { type NavigationDrawerItemProps } from '@/ui/navigation/navigation-drawer/components/NavigationDrawerItem';
import { isNavigationDrawerExpandedState } from '@/ui/navigation/states/isNavigationDrawerExpanded';
import { i18n } from '@lingui/core';
import { I18nProvider } from '@lingui/react';
import { render, screen, waitFor } from '@testing-library/react';
import { createStore, Provider as JotaiProvider } from 'jotai';
import { type ComponentType, type ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';

jest.mock(
  '@/navigation-menu-item/display/sections/components/NavigationDrawerOpenedSection',
  () => ({
    NavigationDrawerOpenedSection: () => <div data-testid="opened-section" />,
  }),
);

jest.mock(
  '@/navigation-menu-item/display/sections/favorites/components/FavoritesSectionDispatcher',
  () => ({
    FavoritesSectionDispatcher: () => <div data-testid="favorites-section" />,
  }),
);

jest.mock(
  '@/navigation-menu-item/display/sections/workspace/components/WorkspaceSectionDispatcher',
  () => ({
    WorkspaceSectionDispatcher: () => <div data-testid="workspace-section" />,
  }),
);

jest.mock('@/navigation/components/NavigationDrawerOtherSection', () => ({
  NavigationDrawerOtherSection: () => <div data-testid="other-section" />,
}));

jest.mock(
  '@/ui/navigation/navigation-drawer/components/NavigationDrawerAnimatedCollapseWrapper',
  () => ({
    NavigationDrawerAnimatedCollapseWrapper: ({
      children,
    }: {
      children: ReactNode;
    }) => children,
  }),
);

jest.mock(
  '@/ui/navigation/navigation-drawer/components/NavigationDrawerSection',
  () => ({
    NavigationDrawerSection: ({ children }: { children: ReactNode }) => (
      <section>{children}</section>
    ),
  }),
);

jest.mock(
  '@/ui/navigation/navigation-drawer/components/NavigationDrawerSectionTitle',
  () => ({
    NavigationDrawerSectionTitle: ({ label }: { label: string }) => (
      <h2>{label}</h2>
    ),
  }),
);

jest.mock(
  '@/ui/navigation/navigation-drawer/components/NavigationDrawerItem',
  () => {
    const { Link } = jest.requireActual('react-router-dom');

    return {
      NavigationDrawerItem: ({
        label,
        to,
        Icon,
        active,
      }: {
        label: string;
        to: string;
        Icon: ComponentType;
        active: boolean;
      }) => (
        <Link to={to} aria-selected={active}>
          <Icon />
          {label}
        </Link>
      ),
    };
  },
);

const ActualNavigationDrawerItem = jest.requireActual(
  '@/ui/navigation/navigation-drawer/components/NavigationDrawerItem',
).NavigationDrawerItem as ComponentType<NavigationDrawerItemProps>;

const labels = [
  'Vue ventes',
  'Produits',
  'Tiers',
  'Devis',
  'Factures',
  'Achats',
  'Paiements',
  'Chèques',
  'Avoirs',
  'Relances',
  'Marketing',
  'Provisions',
  'Fiscalité',
  'Écritures',
  'Grand livre',
  'Balance',
  'Lettrage',
];

const renderWithNavigation = ({
  path = erpMarocPaths.cockpit,
  isEnabled = true,
  isExpanded = true,
  component = <NavigationDrawerErpMarocSection />,
}: {
  path?: string;
  isEnabled?: boolean;
  isExpanded?: boolean;
  component?: ReactNode;
} = {}) => {
  const store = createStore();
  store.set(isErpMarocEnabledState.atom, isEnabled);
  store.set(isNavigationDrawerExpandedState.atom, isExpanded);

  return render(
    <I18nProvider i18n={i18n}>
      <JotaiProvider store={store}>
        <MemoryRouter
          initialEntries={[path]}
          future={{ v7_relativeSplatPath: true, v7_startTransition: true }}
        >
          {component}
        </MemoryRouter>
      </JotaiProvider>
    </I18nProvider>,
  );
};

describe('NavigationDrawerErpMarocSection', () => {
  it('defines the canonical ERP Maroc paths', () => {
    expect(erpMarocPaths).toEqual({
      cockpit: '/erp-maroc',
      products: '/erp-maroc/products',
      tiers: '/erp-maroc/tiers',
      quotes: '/erp-maroc/quotes',
      quoteNew: '/erp-maroc/quotes/new',
      quoteEdit: '/erp-maroc/quotes/:id/edit',
      quoteDetail: '/erp-maroc/quotes/:id',
      purchaseOrders: '/erp-maroc/purchase-orders',
      purchaseOrderNew: '/erp-maroc/purchase-orders/new',
      purchaseOrderDetail: '/erp-maroc/purchase-orders/:id',
      invoices: '/erp-maroc/invoices',
      invoiceNew: '/erp-maroc/invoices/new',
      invoiceEdit: '/erp-maroc/invoices/:id/edit',
      invoiceDetail: '/erp-maroc/invoices/:id',
      payments: '/erp-maroc/payments',
      paymentNew: '/erp-maroc/payments/new',
      paymentDetail: '/erp-maroc/payments/:id',
      cheques: '/erp-maroc/cheques',
      chequeDetail: '/erp-maroc/cheques/:id',
      chequeDepositSlipDetail: '/erp-maroc/cheques/deposit-slips/:id',
      creditNotes: '/erp-maroc/credit-notes',
      creditNoteNew: '/erp-maroc/credit-notes/new',
      creditNoteEdit: '/erp-maroc/credit-notes/:id/edit',
      creditNoteDetail: '/erp-maroc/credit-notes/:id',
      reminders: '/erp-maroc/reminders',
      marketing: '/erp-maroc/marketing',
      hrCore: '/erp-maroc/hr',
      hrEmployeeDetail: '/erp-maroc/hr/employees/:id',
      payrollRegulatory: '/erp-maroc/hr/payroll-regulatory',
      accountingEntries: '/erp-maroc/accounting/entries',
      accountingEntryNew: '/erp-maroc/accounting/entries/new',
      accountingEntryEdit: '/erp-maroc/accounting/entries/:id/edit',
      accountingEntryDetail: '/erp-maroc/accounting/entries/:id',
      accountingProvisions: '/erp-maroc/accounting/provisions',
      fiscal: '/erp-maroc/accounting/fiscal',
      accountingReferences: '/erp-maroc/accounting/references',
      accountingClosing: '/erp-maroc/accounting/closing',
      accountingGrandLivre: '/erp-maroc/accounting/grand-livre',
      accountingBalance: '/erp-maroc/accounting/balance',
      accountingLettrage: '/erp-maroc/accounting/lettrage',
    });
  });

  it('renders all ERP labels with existing Twenty icons', () => {
    renderWithNavigation();

    for (const label of labels) {
      const link = screen.getByRole('link', { name: label });
      expect(link).toHaveAttribute('href');
      expect(link.querySelector('svg')).toBeInTheDocument();
    }
  });

  it.each([
    [erpMarocPaths.cockpit, 'Vue ventes'],
    [erpMarocPaths.products, 'Produits'],
    [erpMarocPaths.tiers, 'Tiers'],
    [erpMarocPaths.quotes, 'Devis'],
    [erpMarocPaths.quoteNew, 'Devis'],
    ['/erp-maroc/quotes/quote-123', 'Devis'],
    ['/erp-maroc/quotes/quote-123/edit', 'Devis'],
    [erpMarocPaths.invoices, 'Factures'],
    [erpMarocPaths.invoiceNew, 'Factures'],
    ['/erp-maroc/invoices/invoice-123/edit', 'Factures'],
    ['/erp-maroc/invoices/invoice-123', 'Factures'],
    [erpMarocPaths.purchaseOrders, 'Achats'],
    [erpMarocPaths.purchaseOrderNew, 'Achats'],
    ['/erp-maroc/purchase-orders/order-123', 'Achats'],
    [erpMarocPaths.payments, 'Paiements'],
    [erpMarocPaths.paymentNew, 'Paiements'],
    ['/erp-maroc/payments/payment-123', 'Paiements'],
    [erpMarocPaths.cheques, 'Chèques'],
    ['/erp-maroc/cheques/cheque-123', 'Chèques'],
    [erpMarocPaths.creditNotes, 'Avoirs'],
    [erpMarocPaths.creditNoteNew, 'Avoirs'],
    ['/erp-maroc/credit-notes/credit-note-123/edit', 'Avoirs'],
    ['/erp-maroc/credit-notes/credit-note-123', 'Avoirs'],
    [erpMarocPaths.reminders, 'Relances'],
    [erpMarocPaths.marketing, 'Marketing'],
    [erpMarocPaths.accountingEntries, 'Écritures'],
    ['/erp-maroc/accounting/entries/entry-123/edit', 'Écritures'],
    ['/erp-maroc/accounting/entries/entry-123', 'Écritures'],
    [erpMarocPaths.accountingProvisions, 'Provisions'],
    [erpMarocPaths.fiscal, 'Fiscalité'],
    [erpMarocPaths.accountingGrandLivre, 'Grand livre'],
    [erpMarocPaths.accountingBalance, 'Balance'],
    [erpMarocPaths.accountingLettrage, 'Lettrage'],
  ])('marks only the exact item active at %s', (path, activeLabel) => {
    renderWithNavigation({ path });

    for (const label of labels) {
      expect(screen.getByRole('link', { name: label })).toHaveAttribute(
        'aria-selected',
        String(label === activeLabel),
      );
    }
  });

  it('does not prefix-match an unsupported nested ERP path', () => {
    renderWithNavigation({ path: '/erp-maroc/quotes/quote-123/history' });

    for (const label of labels) {
      expect(screen.getByRole('link', { name: label })).toHaveAttribute(
        'aria-selected',
        'false',
      );
    }
  });

  it('retains accessible link labels when the drawer is collapsed', () => {
    renderWithNavigation({ isExpanded: false });

    for (const label of labels) {
      expect(screen.getByRole('link', { name: label })).toBeInTheDocument();
    }
  });
});

describe('NavigationDrawerItem accessibility', () => {
  it('keeps its DOM label as the accessible name when really collapsed', () => {
    const consoleErrorSpy = jest
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);

    try {
      renderWithNavigation({
        isExpanded: false,
        component: (
          <ActualNavigationDrawerItem
            label="Libellé collapsed accessible"
            to="/destination"
          />
        ),
      });

      const link = screen.getByRole('link', {
        name: 'Libellé collapsed accessible',
      });
      expect(link).toHaveTextContent('Libellé collapsed accessible');
      expect(link).toHaveAccessibleName('Libellé collapsed accessible');
      expect(link).not.toHaveAttribute('aria-label');
    } finally {
      consoleErrorSpy.mockRestore();
    }
  });
});

describe('MainNavigationDrawerScrollableItems ERP Maroc registration', () => {
  it('does not render the ERP section when the feature flag is disabled', async () => {
    renderWithNavigation({
      isEnabled: false,
      component: <MainNavigationDrawerScrollableItems />,
    });

    await waitFor(() =>
      expect(screen.getByTestId('workspace-section')).toBeInTheDocument(),
    );
    expect(screen.queryByRole('link', { name: 'Vue ventes' })).toBeNull();
  });

  it('renders the ERP section immediately before Other when enabled', async () => {
    renderWithNavigation({
      component: <MainNavigationDrawerScrollableItems />,
    });

    const otherSection = await screen.findByTestId('other-section');
    expect(otherSection.previousElementSibling).toContainElement(
      screen.getByRole('link', { name: 'Vue ventes' }),
    );
  });
});
