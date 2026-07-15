import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  RouterProvider,
  createMemoryRouter,
  useNavigate,
} from 'react-router-dom';

import { useQuoteUnsavedChangesGuard } from '@/erp-maroc/quotes/useQuoteUnsavedChangesGuard';

beforeAll(() => {
  if (globalThis.Request === undefined) {
    class TestRequest {
      readonly url: string;
      readonly method: string;
      readonly signal: AbortSignal | null;

      constructor(input: string | URL, init?: RequestInit) {
        this.url = String(input);
        this.method = init?.method ?? 'GET';
        this.signal = init?.signal ?? null;
      }
    }

    Object.defineProperty(globalThis, 'Request', {
      configurable: true,
      value: TestRequest as unknown as typeof Request,
    });
  }
});

const dispatchBeforeUnload = () => {
  const event = new Event('beforeunload', { cancelable: true });

  Object.defineProperty(event, 'returnValue', {
    value: undefined,
    writable: true,
  });

  window.dispatchEvent(event);

  return event;
};

const GuardHarness = ({
  shouldBlock,
  isNavigationLocked = false,
}: {
  shouldBlock: boolean;
  isNavigationLocked?: boolean;
}) => {
  const navigate = useNavigate();
  const guard = useQuoteUnsavedChangesGuard({
    shouldBlock,
    isNavigationLocked,
  });

  return (
    <>
      <span data-testid="blocked">{String(guard.isBlocked)}</span>
      <span data-testid="confirm-disabled">
        {String(guard.confirmDisabled)}
      </span>
      <button onClick={() => void navigate('/target')}>Navigate</button>
      <button onClick={guard.cancelNavigation}>Stay</button>
      <button onClick={guard.confirmNavigation}>Leave</button>
      <button
        onClick={() =>
          guard.runWithBypass(() => {
            void navigate('/target');
          })
        }
      >
        Saved navigate
      </button>
    </>
  );
};

const renderHookRoute = ({
  shouldBlock,
  isNavigationLocked,
}: {
  shouldBlock: boolean;
  isNavigationLocked?: boolean;
}) => {
  const router = createMemoryRouter(
    [
      {
        path: '/edit',
        element: (
          <GuardHarness
            shouldBlock={shouldBlock}
            isNavigationLocked={isNavigationLocked}
          />
        ),
      },
      {
        path: '/target',
        element: <span>Target route</span>,
      },
    ],
    { initialEntries: ['/edit'] },
  );

  render(
    <RouterProvider router={router} future={{ v7_startTransition: true }} />,
  );

  return router;
};

describe('useQuoteUnsavedChangesGuard', () => {
  it('blocks, resets, and proceeds through data-router navigation', async () => {
    const router = renderHookRoute({ shouldBlock: true });

    await userEvent.click(screen.getByRole('button', { name: 'Navigate' }));

    expect(screen.getByTestId('blocked')).toHaveTextContent('true');
    expect(router.state.location.pathname).toBe('/edit');

    await userEvent.click(screen.getByRole('button', { name: 'Stay' }));

    await waitFor(() =>
      expect(screen.getByTestId('blocked')).toHaveTextContent('false'),
    );
    expect(router.state.location.pathname).toBe('/edit');

    await userEvent.click(screen.getByRole('button', { name: 'Navigate' }));
    await userEvent.click(screen.getByRole('button', { name: 'Leave' }));

    await screen.findByText('Target route');
    expect(router.state.location.pathname).toBe('/target');
  });

  it('prevents beforeunload while dirty and bypasses one synchronous saved navigation', async () => {
    const router = renderHookRoute({ shouldBlock: true });

    const event = dispatchBeforeUnload();

    expect(event.defaultPrevented).toBe(true);
    expect(event.returnValue).toBe('');

    await userEvent.click(
      screen.getByRole('button', { name: 'Saved navigate' }),
    );

    await screen.findByText('Target route');
    expect(router.state.location.pathname).toBe('/target');
  });

  it('keeps proceed disabled while navigation is locked', async () => {
    const router = renderHookRoute({
      shouldBlock: true,
      isNavigationLocked: true,
    });

    await userEvent.click(screen.getByRole('button', { name: 'Navigate' }));

    expect(screen.getByTestId('blocked')).toHaveTextContent('true');
    expect(screen.getByTestId('confirm-disabled')).toHaveTextContent('true');

    await userEvent.click(screen.getByRole('button', { name: 'Leave' }));

    expect(router.state.location.pathname).toBe('/edit');
  });
});
