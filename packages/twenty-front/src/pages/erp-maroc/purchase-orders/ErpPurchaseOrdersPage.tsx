import {
  ErpOperationalTable,
  type ErpOperationalTableColumn,
} from '@/erp-maroc/components/ErpOperationalTable';
import { ErpPageShell } from '@/erp-maroc/components/ErpPageShell';
import { ErpStatusBadge } from '@/erp-maroc/components/ErpStatusBadge';
import { useErpMarocContext } from '@/erp-maroc/context/useErpMarocContext';
import { erpMarocPaths } from '@/erp-maroc/navigation/erpMarocPaths';
import {
  formatPurchaseOrderDate,
  isPurchaseOrderDeliveryOverdue,
  matchesPurchaseOrderProcessFilter,
  purchaseOrderNextAction,
  purchaseOrderStatusAppearance,
  type PurchaseOrderProcessFilter,
} from '@/erp-maroc/purchase-orders/purchaseOrderUi';
import { formatMadCents } from '@/erp-maroc/utils/money';
import { styled } from '@linaria/react';
import { useEffect, useMemo, useState } from 'react';
import { generatePath, Link, useNavigate } from 'react-router-dom';
import {
  erpPurchaseOrderListSchema,
  type ErpPurchaseOrder,
} from 'twenty-shared/erp-maroc';
import { IconArrowRight, IconPlus } from 'twenty-ui/display';
import { Button } from 'twenty-ui/input';
import { themeCssVariables } from 'twenty-ui/theme-constants';

const StyledActions = styled.div`
  display: flex;
  gap: ${themeCssVariables.spacing[2]};
`;

const StyledContent = styled.div`
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  min-height: 0;
  overflow: auto;
`;

const StyledProcess = styled.section`
  border-bottom: 1px solid ${themeCssVariables.border.color.light};
  display: grid;
  grid-template-columns: repeat(4, minmax(150px, 1fr));

  @media (max-width: 768px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
`;

const StyledStageButton = styled.button<{ $active: boolean }>`
  background: ${({ $active }) =>
    $active
      ? themeCssVariables.background.secondary
      : themeCssVariables.background.primary};
  border: 0;
  border-right: 1px solid ${themeCssVariables.border.color.light};
  color: ${themeCssVariables.font.color.primary};
  cursor: pointer;
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[1]};
  min-height: 86px;
  padding: ${themeCssVariables.spacing[3]} ${themeCssVariables.spacing[4]};
  text-align: left;

  &:hover {
    background: ${themeCssVariables.background.secondary};
  }

  span {
    color: ${themeCssVariables.font.color.secondary};
    font-size: ${themeCssVariables.font.size.sm};
  }

  strong {
    font-size: ${themeCssVariables.font.size.xl};
    font-weight: ${themeCssVariables.font.weight.semiBold};
  }
`;

const StyledSummary = styled.section`
  border-bottom: 1px solid ${themeCssVariables.border.color.light};
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));

  @media (max-width: 768px) {
    grid-template-columns: minmax(0, 1fr);
  }
`;

const StyledSummaryItem = styled.div`
  border-right: 1px solid ${themeCssVariables.border.color.light};
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[1]};
  min-height: 64px;
  padding: ${themeCssVariables.spacing[3]} ${themeCssVariables.spacing[4]};

  span {
    color: ${themeCssVariables.font.color.tertiary};
    font-size: ${themeCssVariables.font.size.sm};
  }

  strong {
    color: ${themeCssVariables.font.color.primary};
    font-size: ${themeCssVariables.font.size.md};
    font-weight: ${themeCssVariables.font.weight.semiBold};
  }
`;

const StyledToolbar = styled.div`
  align-items: center;
  border-bottom: 1px solid ${themeCssVariables.border.color.light};
  display: flex;
  gap: ${themeCssVariables.spacing[2]};
  padding: ${themeCssVariables.spacing[2]} ${themeCssVariables.spacing[4]};

  @media (max-width: 768px) {
    align-items: stretch;
    flex-direction: column;
  }
`;

const StyledSearch = styled.input`
  background: ${themeCssVariables.background.primary};
  border: 1px solid ${themeCssVariables.border.color.medium};
  border-radius: ${themeCssVariables.border.radius.sm};
  box-sizing: border-box;
  color: ${themeCssVariables.font.color.primary};
  font: inherit;
  min-height: 32px;
  min-width: 240px;
  padding: 0 ${themeCssVariables.spacing[2]};

  @media (max-width: 768px) {
    min-width: 0;
    width: 100%;
  }
`;

const StyledSelect = styled.select`
  background: ${themeCssVariables.background.primary};
  border: 1px solid ${themeCssVariables.border.color.medium};
  border-radius: ${themeCssVariables.border.radius.sm};
  color: ${themeCssVariables.font.color.primary};
  min-height: 32px;
  padding: 0 ${themeCssVariables.spacing[2]};
`;

const StyledOrderLink = styled(Link)`
  color: ${themeCssVariables.font.color.primary};
  font-weight: ${themeCssVariables.font.weight.medium};
  text-decoration: none;

  &:hover {
    text-decoration: underline;
  }
`;

const StyledDelivery = styled.div`
  align-items: flex-start;
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[1]};
`;

const StyledNextAction = styled(Link)`
  align-items: center;
  color: ${themeCssVariables.color.blue};
  display: inline-flex;
  gap: ${themeCssVariables.spacing[1]};
  text-decoration: none;
`;

const StyledOpenLink = styled(Link)`
  align-items: center;
  border-radius: ${themeCssVariables.border.radius.sm};
  color: ${themeCssVariables.font.color.secondary};
  display: inline-flex;
  height: 28px;
  justify-content: center;
  width: 28px;

  &:hover {
    background: ${themeCssVariables.background.transparent.light};
    color: ${themeCssVariables.font.color.primary};
  }
`;

const processFilterOptions: Array<{
  value: PurchaseOrderProcessFilter;
  label: string;
}> = [
  { value: 'ALL', label: 'Tous les achats' },
  { value: 'DRAFT', label: 'Commandes à valider' },
  { value: 'RECEIVING', label: 'Réceptions en attente' },
  { value: 'INVOICING', label: 'Factures à contrôler' },
  { value: 'COMPLETED', label: 'Achats facturés' },
  { value: 'OVERDUE', label: 'Livraisons en retard' },
];

const casablancaToday = () =>
  new Date().toLocaleDateString('en-CA', {
    timeZone: 'Africa/Casablanca',
  });

export const ErpPurchaseOrdersPage = () => {
  const { client, context } = useErpMarocContext();
  const navigate = useNavigate();
  const [today] = useState(casablancaToday);
  const [orders, setOrders] = useState<ErpPurchaseOrder[]>([]);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [generation, setGeneration] = useState(0);
  const [filter, setFilter] = useState<PurchaseOrderProcessFilter>('ALL');
  const [search, setSearch] = useState('');
  const canManage = context?.capabilities.manageSupplierAccounting === true;

  useEffect(() => {
    const abortController = new AbortController();
    setState('loading');

    client
      .request({
        method: 'GET',
        path: '/purchase-orders',
        schema: erpPurchaseOrderListSchema,
        signal: abortController.signal,
      })
      .then((loadedOrders) => {
        if (abortController.signal.aborted) return;
        setOrders(loadedOrders);
        setState('ready');
      })
      .catch(() => {
        if (abortController.signal.aborted) return;
        setState('error');
      });

    return () => abortController.abort();
  }, [client, generation]);

  const processStages = useMemo(
    () => [
      {
        filter: 'DRAFT' as const,
        label: 'Commande et validation',
        count: orders.filter(({ status }) => status === 'DRAFT').length,
      },
      {
        filter: 'RECEIVING' as const,
        label: 'Réception',
        count: orders.filter(({ status }) =>
          ['CONFIRMED', 'PARTIALLY_RECEIVED'].includes(status),
        ).length,
      },
      {
        filter: 'INVOICING' as const,
        label: 'Facture fournisseur',
        count: orders.filter(({ status }) => status === 'RECEIVED').length,
      },
      {
        filter: 'COMPLETED' as const,
        label: 'Facturé',
        count: orders.filter(({ status }) => status === 'INVOICED').length,
      },
    ],
    [orders],
  );

  const openCommitmentCents = useMemo(
    () =>
      orders
        .filter(({ status }) =>
          ['DRAFT', 'CONFIRMED', 'PARTIALLY_RECEIVED', 'RECEIVED'].includes(
            status,
          ),
        )
        .reduce((total, order) => total + order.totalTtcCents, 0),
    [orders],
  );
  const overdueCount = useMemo(
    () =>
      orders.filter((order) => isPurchaseOrderDeliveryOverdue(order, today))
        .length,
    [orders, today],
  );

  const visibleOrders = useMemo(() => {
    const normalizedSearch = search.trim().toLocaleLowerCase('fr');
    return orders.filter(
      (order) =>
        matchesPurchaseOrderProcessFilter(order, filter, today) &&
        (normalizedSearch.length === 0 ||
          order.number.toLocaleLowerCase('fr').includes(normalizedSearch) ||
          order.supplier.name
            .toLocaleLowerCase('fr')
            .includes(normalizedSearch)),
    );
  }, [filter, orders, search, today]);

  const columns = useMemo<ErpOperationalTableColumn<ErpPurchaseOrder>[]>(
    () => [
      {
        key: 'number',
        header: 'Bon de commande',
        width: '170px',
        render: (order) => (
          <StyledOrderLink
            to={generatePath(erpMarocPaths.purchaseOrderDetail, {
              id: order.id,
            })}
          >
            {order.number}
          </StyledOrderLink>
        ),
      },
      {
        key: 'supplier',
        header: 'Fournisseur',
        width: '210px',
        render: (order) => order.supplier.name,
      },
      {
        key: 'issueDate',
        header: 'Émission',
        width: '125px',
        render: (order) => formatPurchaseOrderDate(order.issueDate),
      },
      {
        key: 'delivery',
        header: 'Livraison prévue',
        width: '165px',
        render: (order) => (
          <StyledDelivery>
            <span>{formatPurchaseOrderDate(order.expectedDeliveryDate)}</span>
            {isPurchaseOrderDeliveryOverdue(order, today) ? (
              <ErpStatusBadge label="En retard" tone="danger" />
            ) : null}
          </StyledDelivery>
        ),
      },
      {
        key: 'status',
        header: 'Statut',
        width: '165px',
        render: (order) => {
          const appearance = purchaseOrderStatusAppearance[order.status];

          return (
            <ErpStatusBadge label={appearance.label} tone={appearance.tone} />
          );
        },
      },
      {
        key: 'total',
        header: 'Total TTC',
        width: '135px',
        align: 'right',
        render: (order) => formatMadCents(order.totalTtcCents),
      },
      {
        key: 'nextAction',
        header: 'Prochaine action',
        width: '210px',
        render: (order) => (
          <StyledNextAction
            to={generatePath(erpMarocPaths.purchaseOrderDetail, {
              id: order.id,
            })}
          >
            {purchaseOrderNextAction[order.status]}
            <IconArrowRight size={14} />
          </StyledNextAction>
        ),
      },
      {
        key: 'open',
        header: '',
        width: '48px',
        align: 'right',
        render: (order) => (
          <StyledOpenLink
            to={generatePath(erpMarocPaths.purchaseOrderDetail, {
              id: order.id,
            })}
            aria-label={`Ouvrir ${order.number}`}
          >
            <IconArrowRight size={16} />
          </StyledOpenLink>
        ),
      },
    ],
    [today],
  );

  return (
    <ErpPageShell
      title="Processus achats"
      description="Commande, validation, réception, facture fournisseur et paiement"
      actions={
        canManage ? (
          <StyledActions>
            <Button
              title="Nouvelle commande"
              ariaLabel="Nouveau bon de commande fournisseur"
              Icon={IconPlus}
              variant="primary"
              accent="blue"
              onClick={() => navigate(erpMarocPaths.purchaseOrderNew)}
            />
          </StyledActions>
        ) : null
      }
    >
      <StyledContent>
        <StyledProcess aria-label="Étapes du processus achat">
          {processStages.map((stage) => (
            <StyledStageButton
              key={stage.filter}
              type="button"
              $active={filter === stage.filter}
              aria-pressed={filter === stage.filter}
              onClick={() => setFilter(stage.filter)}
            >
              <span>{stage.label}</span>
              <strong>{stage.count}</strong>
            </StyledStageButton>
          ))}
        </StyledProcess>
        <StyledSummary aria-label="Synthèse des achats">
          <StyledSummaryItem>
            <span>Engagements ouverts</span>
            <strong>{formatMadCents(openCommitmentCents)}</strong>
          </StyledSummaryItem>
          <StyledSummaryItem>
            <span>Livraisons en retard</span>
            <strong>{overdueCount}</strong>
          </StyledSummaryItem>
          <StyledSummaryItem>
            <span>Dossiers affichés</span>
            <strong>{visibleOrders.length}</strong>
          </StyledSummaryItem>
        </StyledSummary>
        <StyledToolbar>
          <StyledSearch
            type="search"
            aria-label="Rechercher un achat"
            placeholder="Bon de commande ou fournisseur"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <StyledSelect
            aria-label="Filtrer le processus achat"
            value={filter}
            onChange={(event) =>
              setFilter(event.target.value as PurchaseOrderProcessFilter)
            }
          >
            {processFilterOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </StyledSelect>
        </StyledToolbar>
        <ErpOperationalTable
          ariaLabel="Processus des achats fournisseurs"
          columns={columns}
          rows={visibleOrders}
          getRowKey={(order) => order.id}
          state={state}
          loadingLabel="Chargement du processus achats"
          emptyLabel="Aucun achat ne correspond à ce filtre"
          errorLabel="Impossible de charger les achats"
          retryLabel="Réessayer"
          onRetry={() => setGeneration((value) => value + 1)}
        />
      </StyledContent>
    </ErpPageShell>
  );
};
