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
  purchaseOrderStatusAppearance,
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

export const ErpPurchaseOrdersPage = () => {
  const { client, context } = useErpMarocContext();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<ErpPurchaseOrder[]>([]);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [generation, setGeneration] = useState(0);
  const canManage = context?.capabilities.manageSalesDocuments === true;

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

  const columns = useMemo<ErpOperationalTableColumn<ErpPurchaseOrder>[]>(
    () => [
      {
        key: 'number',
        header: 'Bon de commande',
        width: '180px',
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
        width: '220px',
        render: (order) => order.supplier.name,
      },
      {
        key: 'issueDate',
        header: 'Émission',
        width: '140px',
        render: (order) => formatPurchaseOrderDate(order.issueDate),
      },
      {
        key: 'delivery',
        header: 'Livraison prévue',
        width: '160px',
        render: (order) => formatPurchaseOrderDate(order.expectedDeliveryDate),
      },
      {
        key: 'status',
        header: 'Statut',
        width: '170px',
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
    [],
  );

  return (
    <ErpPageShell
      title="Achats"
      description="Bons de commande fournisseurs en MAD"
      actions={
        canManage ? (
          <StyledActions>
            <Button
              title="Nouveau bon de commande"
              ariaLabel="Nouveau bon de commande"
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
        <ErpOperationalTable
          ariaLabel="Bons de commande fournisseurs"
          columns={columns}
          rows={orders}
          getRowKey={(order) => order.id}
          state={state}
          loadingLabel="Chargement des achats"
          emptyLabel="Aucun bon de commande"
          errorLabel="Impossible de charger les achats"
          retryLabel="Réessayer"
          onRetry={() => setGeneration((value) => value + 1)}
        />
      </StyledContent>
    </ErpPageShell>
  );
};
