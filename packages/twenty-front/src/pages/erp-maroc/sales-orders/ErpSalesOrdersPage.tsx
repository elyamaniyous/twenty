import {
  ErpOperationalTable,
  type ErpOperationalTableColumn,
} from '@/erp-maroc/components/ErpOperationalTable';
import { ErpPageShell } from '@/erp-maroc/components/ErpPageShell';
import { ErpStatusBadge } from '@/erp-maroc/components/ErpStatusBadge';
import { useErpMarocContext } from '@/erp-maroc/context/useErpMarocContext';
import { erpMarocPaths } from '@/erp-maroc/navigation/erpMarocPaths';
import {
  formatSalesOrderDate,
  salesOrderStatusAppearance,
} from '@/erp-maroc/sales-orders/salesOrderUi';
import { formatMadCents } from '@/erp-maroc/utils/money';
import { styled } from '@linaria/react';
import { useEffect, useMemo, useState } from 'react';
import { generatePath, Link } from 'react-router-dom';
import {
  erpSalesOrderListSchema,
  type ErpSalesOrder,
} from 'twenty-shared/erp-maroc';
import { IconArrowRight } from 'twenty-ui/display';
import { themeCssVariables } from 'twenty-ui/theme-constants';

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

export const ErpSalesOrdersPage = () => {
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

  const columns = useMemo<ErpOperationalTableColumn<ErpSalesOrder>[]>(
    () => [
      {
        key: 'number',
        header: 'Commande client',
        width: '180px',
        render: (order) => (
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
        render: (order) => order.customer.name,
      },
      {
        key: 'issueDate',
        header: 'Émission',
        width: '140px',
        render: (order) => formatSalesOrderDate(order.issueDate),
      },
      {
        key: 'delivery',
        header: 'Livraison prévue',
        width: '160px',
        render: (order) => formatSalesOrderDate(order.expectedDeliveryDate),
      },
      {
        key: 'status',
        header: 'Statut',
        width: '180px',
        render: (order) => {
          const appearance = salesOrderStatusAppearance[order.status];
          return (
            <ErpStatusBadge label={appearance.label} tone={appearance.tone} />
          );
        },
      },
      {
        key: 'total',
        header: 'Total TTC',
        width: '150px',
        align: 'right',
        render: (order) => formatMadCents(order.totalTtcCents),
      },
      {
        key: 'open',
        header: '',
        width: '56px',
        align: 'right',
        render: (order) => (
          <StyledOpenLink
            to={generatePath(erpMarocPaths.salesOrderDetail, { id: order.id })}
            aria-label={`Ouvrir ${order.number}`}
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
      title="Commandes clients"
      description="Préparation, livraison et facturation des ventes"
    >
      <StyledContent>
        <ErpOperationalTable
          ariaLabel="Commandes clients"
          columns={columns}
          rows={orders}
          getRowKey={(order) => order.id}
          state={state}
          loadingLabel="Chargement des commandes clients"
          emptyLabel="Aucune commande client"
          errorLabel="Impossible de charger les commandes clients"
          retryLabel="Réessayer"
          onRetry={() => setGeneration((value) => value + 1)}
        />
      </StyledContent>
    </ErpPageShell>
  );
};
