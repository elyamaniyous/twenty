import { ErpPageShell } from '@/erp-maroc/components/ErpPageShell';
import { useErpMarocContext } from '@/erp-maroc/context/useErpMarocContext';
import { erpMarocPaths } from '@/erp-maroc/navigation/erpMarocPaths';
import { styled } from '@linaria/react';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  erpInvoicePageSchema,
  erpPaymentPageSchema,
  erpProductListSchema,
  erpQuoteListSchema,
  erpReminderPageSchema,
  erpTierListSchema,
  type ErpInvoicePage,
  type ErpPaymentPage,
  type ErpQuoteList,
  type ErpReminderPage,
} from 'twenty-shared/erp-maroc';
import { IconRefresh } from 'twenty-ui/display';
import { Button } from 'twenty-ui/input';
import { themeCssVariables } from 'twenty-ui/theme-constants';

type CockpitData = {
  quotes: ErpQuoteList;
  invoices: ErpInvoicePage;
  payments: ErpPaymentPage;
  reminders: ErpReminderPage;
};

type CockpitState = {
  status: 'loading' | 'ready' | 'error';
  data: Partial<CockpitData>;
  failedCount: number;
  failedKeys: string[];
};

type Queue = {
  label: string;
  count: number;
  available: boolean;
  links: Array<{ label: string; to: string }>;
};

const StyledContent = styled.div`
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  min-height: 0;
  overflow: auto;
`;

const StyledPartialError = styled.div`
  align-items: center;
  background: ${themeCssVariables.background.secondary};
  border-bottom: 1px solid ${themeCssVariables.border.color.light};
  color: ${themeCssVariables.font.color.secondary};
  display: flex;
  gap: ${themeCssVariables.spacing[3]};
  justify-content: space-between;
  padding: ${themeCssVariables.spacing[2]} ${themeCssVariables.spacing[4]};
`;

const StyledReferenceSources = styled.section`
  border-bottom: 1px solid ${themeCssVariables.border.color.light};
  color: ${themeCssVariables.font.color.secondary};
  display: flex;
  flex-wrap: wrap;
  font-size: ${themeCssVariables.font.size.sm};
  gap: ${themeCssVariables.spacing[4]};
  padding: ${themeCssVariables.spacing[2]} ${themeCssVariables.spacing[4]};
`;

const StyledQueues = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  width: 100%;
`;

const StyledQueue = styled.section`
  border-bottom: 1px solid ${themeCssVariables.border.color.light};
  border-right: 1px solid ${themeCssVariables.border.color.light};
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[2]};
  min-height: 132px;
  padding: ${themeCssVariables.spacing[4]};
`;

const StyledQueueHeader = styled.div`
  align-items: flex-start;
  display: flex;
  gap: ${themeCssVariables.spacing[3]};
  justify-content: space-between;
`;

const StyledQueueTitle = styled.h2`
  font-size: ${themeCssVariables.font.size.md};
  font-weight: ${themeCssVariables.font.weight.semiBold};
  letter-spacing: 0;
  line-height: 20px;
  margin: 0;

  a {
    color: ${themeCssVariables.font.color.primary};
    text-decoration: none;
  }
`;

const StyledCount = styled.span`
  color: ${themeCssVariables.font.color.primary};
  font-size: ${themeCssVariables.font.size.xl};
  font-weight: ${themeCssVariables.font.weight.semiBold};
`;

const StyledLoadedLabel = styled.span`
  color: ${themeCssVariables.font.color.tertiary};
  font-size: ${themeCssVariables.font.size.sm};
`;

const StyledSecondaryLinks = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${themeCssVariables.spacing[2]};

  a {
    color: ${themeCssVariables.color.blue};
    font-size: ${themeCssVariables.font.size.sm};
  }
`;

const requestDefinitions = [
  ['quotes', '/quotes', erpQuoteListSchema],
  ['invoices', '/invoices', erpInvoicePageSchema],
  ['payments', '/payments', erpPaymentPageSchema],
  ['reminders', '/reminders', erpReminderPageSchema],
  ['products', '/products', erpProductListSchema],
  ['tiers', '/tiers', erpTierListSchema],
] as const;

const referenceSources = [
  { key: 'products', label: 'Catalogue' },
  { key: 'tiers', label: 'Tiers' },
] as const;

const operationalSourceKeys = new Set([
  'quotes',
  'invoices',
  'payments',
  'reminders',
]);

export const ErpMarocCockpitPage = () => {
  const { client } = useErpMarocContext();
  const [generation, setGeneration] = useState(0);
  const [state, setState] = useState<CockpitState>({
    status: 'loading',
    data: {},
    failedCount: 0,
    failedKeys: [],
  });

  useEffect(() => {
    const abortController = new AbortController();
    let isCurrent = true;
    setState({ status: 'loading', data: {}, failedCount: 0, failedKeys: [] });

    Promise.allSettled(
      requestDefinitions.map(([, path, schema]) =>
        client.request({
          method: 'GET',
          path,
          schema,
          signal: abortController.signal,
        }),
      ),
    ).then((results) => {
      if (!isCurrent || abortController.signal.aborted) return;

      const data: Partial<CockpitData> = {};
      let failedCount = 0;
      const failedKeys: string[] = [];
      results.forEach((result, index) => {
        if (result.status === 'rejected') {
          failedCount += 1;
          failedKeys.push(requestDefinitions[index][0]);
          return;
        }

        const key = requestDefinitions[index][0];
        if (key === 'quotes') data.quotes = result.value as ErpQuoteList;
        if (key === 'invoices') data.invoices = result.value as ErpInvoicePage;
        if (key === 'payments') data.payments = result.value as ErpPaymentPage;
        if (key === 'reminders')
          data.reminders = result.value as ErpReminderPage;
      });

      setState({
        status: failedCount === requestDefinitions.length ? 'error' : 'ready',
        data,
        failedCount,
        failedKeys,
      });
    });

    return () => {
      isCurrent = false;
      abortController.abort();
    };
  }, [client, generation]);

  const queues = useMemo<Queue[]>(() => {
    const invoices = state.data.invoices?.items ?? [];
    const reminders = state.data.reminders?.items ?? [];

    return [
      {
        label: 'Brouillons à terminer',
        available: !state.failedKeys.includes('quotes'),
        count:
          state.data.quotes?.filter(({ status }) => status === 'DRAFT')
            .length ?? 0,
        links: [
          {
            label: 'Brouillons à terminer',
            to: `${erpMarocPaths.quotes}?status=DRAFT`,
          },
        ],
      },
      {
        label: 'Factures validées à envoyer',
        available: !state.failedKeys.includes('invoices'),
        count: invoices.filter(({ status }) => status === 'VALIDATED').length,
        links: [
          {
            label: 'Factures validées à envoyer',
            to: `${erpMarocPaths.invoices}?status=VALIDATED`,
          },
        ],
      },
      {
        label: 'Factures en retard ou partiellement payées',
        available: !state.failedKeys.includes('invoices'),
        count: invoices.filter(
          ({ isOverdue, status }) =>
            isOverdue || status === 'OVERDUE' || status === 'PARTIALLY_PAID',
        ).length,
        links: [
          {
            label: 'Factures en retard',
            to: `${erpMarocPaths.invoices}?status=OVERDUE`,
          },
          {
            label: 'Factures partiellement payées',
            to: `${erpMarocPaths.invoices}?status=PARTIALLY_PAID`,
          },
        ],
      },
      {
        label: 'Paiements à affecter',
        available: !state.failedKeys.includes('payments'),
        count:
          state.data.payments?.items.filter(
            ({ status }) => status === 'PENDING_ALLOCATION',
          ).length ?? 0,
        links: [
          {
            label: 'Paiements à affecter',
            to: `${erpMarocPaths.payments}?status=PENDING_ALLOCATION`,
          },
        ],
      },
      {
        label: 'Propositions de relance à approuver',
        available: !state.failedKeys.includes('reminders'),
        count: reminders.filter(({ status }) => status === 'PROPOSED').length,
        links: [
          {
            label: 'Propositions de relance à approuver',
            to: `${erpMarocPaths.reminders}?status=PROPOSED`,
          },
        ],
      },
      {
        label: 'Réconciliations requises',
        available:
          !state.failedKeys.includes('invoices') &&
          !state.failedKeys.includes('reminders'),
        count:
          invoices.filter(
            ({ emailDelivery }) =>
              emailDelivery?.status === 'RECONCILIATION_REQUIRED',
          ).length +
          reminders.filter(({ status }) => status === 'RECONCILIATION_REQUIRED')
            .length,
        links: [
          {
            label: 'Livraisons de facture à réconcilier',
            to: `${erpMarocPaths.invoices}?delivery=RECONCILIATION_REQUIRED`,
          },
          {
            label: 'Relances à réconcilier',
            to: `${erpMarocPaths.reminders}?status=RECONCILIATION_REQUIRED`,
          },
        ],
      },
    ];
  }, [state.data, state.failedKeys]);

  const retry = () => setGeneration((current) => current + 1);
  const hasOperationalFailure = state.failedKeys.some((key) =>
    operationalSourceKeys.has(key),
  );

  return (
    <ErpPageShell
      title="CRM"
      description="Pipeline commercial, facturation client et relances"
      state={state.status === 'ready' ? 'ready' : state.status}
      loadingLabel="Chargement des files opérationnelles"
      errorLabel="Les files opérationnelles sont indisponibles"
      retryLabel="Réessayer"
      onRetry={retry}
    >
      <StyledContent>
        {hasOperationalFailure ? (
          <StyledPartialError role="alert">
            <span>Certaines files ne sont pas disponibles</span>
            <Button
              title="Réessayer"
              ariaLabel="Réessayer"
              Icon={IconRefresh}
              variant="secondary"
              onClick={retry}
            />
          </StyledPartialError>
        ) : null}
        <StyledReferenceSources aria-label="Sources de référence">
          {referenceSources.map(({ key, label }) => (
            <span key={key}>
              {label} —{' '}
              {state.failedKeys.includes(key) ? 'Indisponible' : 'Page chargée'}
            </span>
          ))}
        </StyledReferenceSources>
        <StyledQueues>
          {queues.map((queue) => {
            const primaryLink =
              queue.links.length === 1 ? queue.links[0] : null;

            return (
              <StyledQueue key={queue.label}>
                <StyledQueueHeader>
                  <StyledQueueTitle>
                    {primaryLink === null ? (
                      queue.label
                    ) : (
                      <Link to={primaryLink.to} aria-label={primaryLink.label}>
                        {queue.label}
                      </Link>
                    )}
                  </StyledQueueTitle>
                  <StyledCount>
                    {queue.available ? queue.count : '—'}
                  </StyledCount>
                </StyledQueueHeader>
                <StyledLoadedLabel>
                  {queue.available ? 'Page chargée' : 'Indisponible'}
                </StyledLoadedLabel>
                {primaryLink === null ? (
                  <StyledSecondaryLinks>
                    {queue.links.map((link) => (
                      <Link key={link.to} to={link.to} aria-label={link.label}>
                        {link.label}
                      </Link>
                    ))}
                  </StyledSecondaryLinks>
                ) : null}
              </StyledQueue>
            );
          })}
        </StyledQueues>
      </StyledContent>
    </ErpPageShell>
  );
};
