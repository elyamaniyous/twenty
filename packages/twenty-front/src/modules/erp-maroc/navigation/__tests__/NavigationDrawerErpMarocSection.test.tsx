import { isErpMarocEnabledState } from '@/client-config/states/isErpMarocEnabledState';
import { type ErpMarocClient } from '@/erp-maroc/api/erpMarocClient';
import { useErpMarocContext } from '@/erp-maroc/context/useErpMarocContext';
import { NavigationDrawerErpMarocSection } from '@/erp-maroc/navigation/NavigationDrawerErpMarocSection';
import { erpMarocPaths } from '@/erp-maroc/navigation/erpMarocPaths';
import { MainNavigationDrawerScrollableItems } from '@/navigation/components/MainNavigationDrawerScrollableItems';
import { type NavigationDrawerItemProps } from '@/ui/navigation/navigation-drawer/components/NavigationDrawerItem';
import { isNavigationDrawerExpandedState } from '@/ui/navigation/states/isNavigationDrawerExpanded';
import { i18n } from '@lingui/core';
import { I18nProvider } from '@lingui/react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { createStore, Provider as JotaiProvider } from 'jotai';
import { type ComponentType, type ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { type ErpContext } from 'twenty-shared/erp-maroc';

jest.mock('@/erp-maroc/context/useErpMarocContext', () => ({
  useErpMarocContext: jest.fn(),
}));

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
    NavigationDrawerSectionTitle: ({
      label,
      onClick,
      isOpen,
    }: {
      label: string;
      onClick?: () => void;
      isOpen?: boolean;
    }) =>
      onClick ? (
        <button type="button" aria-expanded={isOpen} onClick={onClick}>
          {label}
        </button>
      ) : (
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

const ERP_CONTEXT: ErpContext = {
  societeId: '89c90690-4f4a-4f2e-91ce-3700f16a8ca1',
  twentyUserId: 'twenty-user-1',
  timezone: 'Africa/Casablanca',
  role: 'ADMIN',
  capabilities: {
    manageCatalog: true,
    manageTiers: true,
    manageSalesDocuments: true,
    createPendingPayment: true,
    postPayment: true,
    terminateOwnPendingPayment: true,
    terminateAnyPayment: true,
    manageReminders: true,
    manageCreditNotes: true,
    allocateCustomerCredit: true,
    manageSupplierAccounting: true,
    manageInventory: true,
    manageMarketing: true,
  },
  features: {
    salesUi: true,
    pdfGeneration: true,
    invoiceValidation: true,
    invoiceEmail: true,
    reminderManagement: true,
    reminderDelivery: true,
    marketingAutomation: true,
    whatsappDelivery: false,
  },
};

const mockedUseErpMarocContext = jest.mocked(useErpMarocContext);

const setReadyContext = ({
  context = ERP_CONTEXT,
  hr = true,
}: {
  context?: ErpContext;
  hr?: boolean;
} = {}) => {
  mockedUseErpMarocContext.mockReturnValue({
    status: 'ready',
    context,
    spaceAccess: { crm: true, finance: true, hr },
    error: null,
    refetch: jest.fn(),
    client: {} as ErpMarocClient,
  });
};

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
  beforeEach(() => {
    window.localStorage.clear();
    setReadyContext();
  });

  it('defines the three stable entry routes and bank statements route', () => {
    expect(erpMarocPaths.crm).toBe('/crm');
    expect(erpMarocPaths.finance).toBe('/finance');
    expect(erpMarocPaths.hr).toBe('/rh');
    expect(erpMarocPaths.bankStatements).toBe('/erp-maroc/bank-statements');
  });

  it('renders a compact CRM navigation and opens groups on demand', () => {
    renderWithNavigation();

    expect(screen.getByRole('heading', { name: 'Espace CRM' })).toBeVisible();
    expect(
      screen.getByRole('link', { name: 'Vue commerciale' }),
    ).toHaveAttribute('aria-selected', 'true');
    expect(
      screen.getByRole('link', { name: 'Tiers synchronisés' }),
    ).toBeVisible();
    expect(screen.queryByRole('link', { name: 'Devis' })).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Vente' }));

    expect(screen.getByRole('link', { name: 'Devis' })).toBeVisible();
    expect(
      screen.getByRole('link', { name: 'Commandes et livraisons' }),
    ).toBeVisible();
    expect(
      screen.queryByRole('link', { name: 'Tiers synchronisés' }),
    ).toBeNull();
  });

  it('opens the active Finance group and marks the exact item active', () => {
    renderWithNavigation({ path: erpMarocPaths.invoices });

    expect(
      screen.getByRole('heading', { name: 'Espace Finance' }),
    ).toBeVisible();
    expect(screen.getByRole('link', { name: 'Factures' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(
      screen.queryByRole('link', { name: 'Dossiers salariés' }),
    ).toBeNull();
  });

  it('keeps the detailed Finance and RH tools available below their dashboards', () => {
    const { unmount } = renderWithNavigation({
      path: erpMarocPaths.financialPlanning,
    });

    expect(
      screen.getByRole('link', { name: 'Budgets, analytique et devises' }),
    ).toHaveAttribute('aria-selected', 'true');

    unmount();
    renderWithNavigation({ path: erpMarocPaths.hrOperations });

    expect(
      screen.getByRole('link', { name: 'Opérations et campagnes RH' }),
    ).toHaveAttribute('aria-selected', 'true');
  });

  it('filters accounting and RH access for a commercial user', () => {
    setReadyContext({
      context: {
        ...ERP_CONTEXT,
        role: 'COMMERCIAL',
        capabilities: {
          ...ERP_CONTEXT.capabilities,
          manageSupplierAccounting: false,
          manageInventory: false,
        },
      },
      hr: false,
    });

    renderWithNavigation({
      path: erpMarocPaths.finance,
      component: <MainNavigationDrawerScrollableItems />,
    });

    expect(screen.queryByRole('tab', { name: 'RH' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Comptabilité' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Ventes' })).toBeVisible();
  });
});

describe('MainNavigationDrawerScrollableItems spaces', () => {
  beforeEach(() => {
    window.localStorage.clear();
    setReadyContext();
  });

  it('keeps native objects in CRM', async () => {
    renderWithNavigation({
      component: <MainNavigationDrawerScrollableItems />,
    });

    expect(await screen.findByTestId('workspace-section')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'CRM' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
  });

  it('hides native CRM objects in Finance', async () => {
    renderWithNavigation({
      path: erpMarocPaths.invoices,
      component: <MainNavigationDrawerScrollableItems />,
    });

    await waitFor(() =>
      expect(screen.getByTestId('other-section')).toBeInTheDocument(),
    );
    expect(screen.queryByTestId('workspace-section')).toBeNull();
    expect(screen.getByRole('tab', { name: 'Finance' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
  });

  it('keeps the standard workspace navigation when ERP is disabled', async () => {
    renderWithNavigation({
      isEnabled: false,
      component: <MainNavigationDrawerScrollableItems />,
    });

    expect(await screen.findByTestId('workspace-section')).toBeInTheDocument();
    expect(screen.queryByRole('tab', { name: 'CRM' })).toBeNull();
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
