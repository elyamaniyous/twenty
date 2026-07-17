import {
  ErpOperationalTable,
  type ErpOperationalTableColumn,
} from '@/erp-maroc/components/ErpOperationalTable';
import { ErpPageShell } from '@/erp-maroc/components/ErpPageShell';
import { ErpStatusBadge } from '@/erp-maroc/components/ErpStatusBadge';
import { useErpMarocContext } from '@/erp-maroc/context/useErpMarocContext';
import { erpMarocPaths } from '@/erp-maroc/navigation/erpMarocPaths';
import { formatSalesOrderDate } from '@/erp-maroc/sales-orders/salesOrderUi';
import { styled } from '@linaria/react';
import { useEffect, useMemo, useState } from 'react';
import { generatePath, Link } from 'react-router-dom';
import {
  erpSalesOrderListSchema,
  type ErpSalesOrder,
} from 'twenty-shared/erp-maroc';
import { IconArrowRight } from 'twenty-ui/display';
import { themeCssVariables } from 'twenty-ui/theme-constants';

type PreparationRow = {
  order: ErpSalesOrder;
  reserved: number;
  prepared: number;
  warehouses: string;
};

const StyledContent = styled.div`
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  min-height: 0;
`;

const StyledOrderLink = styled(Link)`
  color: ${themeCssVariables.font.color.primary};
  font-weight: ${themeCssVariables.font.weight.medium};
  text-decoration: none;

  &:hover {
    text-decoration: underline;
  }
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

export const ErpSalesPreparationPage = () => {
  const { client } = useErpMarocContext();
  const [orders, setOrders] = useState<ErpSalesOrder[]>([]);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [generation, setGeneration] = useState(0);

  useEffect(() => {
    const abortController = new AbortController();
    setState('loading');
    client
      .request({
        method: 'GET',
        path: '/sales-orders',
        schema: erpSalesOrderListSchema,
        signal: abortController.signal,
      })
      .then((loadedOrders) => {
        if (abortController.signal.aborted) return;
        setOrders(loadedOrders);
        setState('ready');
      })
      .catch(() => {
        if (!abortController.signal.aborted) setState('error');
      });
    return () => abortController.abort();
  }, [client, generation]);

  const rows = useMemo<PreparationRow[]>(
    () =>
      orders.flatMap((order) => {
        if (
          order.status !== 'CONFIRMED' &&
          order.status !== 'PARTIALLY_DELIVERED'
        ) {
          return [];
        }
        const allocations = order.lines.flatMap((line) => line.allocations);
        const reserved = allocations.reduce(
          (total, allocation) => total + allocation.quantityReserved,
          0,
        );
        if (reserved <= 1e-9) return [];
        const prepared = allocations.reduce(
          (total, allocation) => total + allocation.quantityPrepared,
          0,
        );
        const warehouses = Array.from(
          new Set(
            allocations
              .filter((allocation) => allocation.quantityReserved > 1e-9)
              .map((allocation) => allocation.warehouse.name),
          ),
        ).join(', ');
        return [{ order, reserved, prepared, warehouses }];
      }),
    [orders],
  );

  const columns = useMemo<ErpOperationalTableColumn<PreparationRow>[]>(
    () => [
      {
        key: 'number',
        header: 'Commande client',
        width: '180px',
        render: ({ order }) => (
          <StyledOrderLink
            to={generatePath(erpMarocPaths.salesOrderDetail, { id: order.id })}
          >
            {order.number}
          </StyledOrderLink>
        ),
      },
      {
        key: 'customer',
        header: 'Client',
        width: '230px',
        render: ({ order }) => order.customer.name,
      },
      {
        key: 'delivery',
        header: 'Livraison prévue',
        width: '160px',
        render: ({ order }) => formatSalesOrderDate(order.expectedDeliveryDate),
      },
      {
        key: 'warehouses',
        header: 'Dépôt',
        width: '220px',
        render: ({ warehouses }) => warehouses,
      },
      {
        key: 'reserved',
        header: 'Réservé',
        width: '120px',
        align: 'right',
        render: ({ reserved }) => reserved,
      },
      {
        key: 'prepared',
        header: 'Préparé',
        width: '120px',
        align: 'right',
        render: ({ prepared }) => prepared,
      },
      {
        key: 'status',
        header: 'Préparation',
        width: '150px',
        render: ({ reserved, prepared }) => (
          <ErpStatusBadge
            label={
              prepared <= 1e-9
                ? 'À préparer'
                : prepared + 1e-9 >= reserved
                  ? 'Prête'
                  : 'Partielle'
            }
            tone={
              prepared <= 1e-9
                ? 'neutral'
                : prepared + 1e-9 >= reserved
                  ? 'success'
                  : 'warning'
            }
          />
        ),
      },
      {
        key: 'open',
        header: '',
        width: '56px',
        align: 'right',
        render: ({ order }) => (
          <StyledOpenLink
            to={generatePath(erpMarocPaths.salesOrderDetail, { id: order.id })}
            aria-label={`Préparer ${order.number}`}
          >
            <IconArrowRight size={16} />
          </StyledOpenLink>
        ),
      },
    ],
    [],
  );

  return (
    <ErpPageShell
      title="Commandes à préparer"
      description="Réservations actives et avancement par dépôt"
    >
      <StyledContent>
        <ErpOperationalTable
          ariaLabel="Commandes clients à préparer"
          columns={columns}
          rows={rows}
          getRowKey={({ order }) => order.id}
          state={state}
          loadingLabel="Chargement des préparations"
          emptyLabel="Aucune commande à préparer"
          errorLabel="Impossible de charger les préparations"
          retryLabel="Réessayer"
          onRetry={() => setGeneration((value) => value + 1)}
        />
      </StyledContent>
    </ErpPageShell>
  );
};
