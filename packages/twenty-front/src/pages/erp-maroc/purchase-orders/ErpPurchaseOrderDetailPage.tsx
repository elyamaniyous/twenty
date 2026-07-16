import { ErpMarocError } from '@/erp-maroc/api/erpMarocError';
import { ErpConfirmDialog } from '@/erp-maroc/components/ErpConfirmDialog';
import {
  ErpOperationalTable,
  type ErpOperationalTableColumn,
} from '@/erp-maroc/components/ErpOperationalTable';
import { ErpPageShell } from '@/erp-maroc/components/ErpPageShell';
import { ErpStatusBadge } from '@/erp-maroc/components/ErpStatusBadge';
import { useErpMarocContext } from '@/erp-maroc/context/useErpMarocContext';
import {
  formatPurchaseOrderDate,
  purchaseOrderStatusAppearance,
} from '@/erp-maroc/purchase-orders/purchaseOrderUi';
import { formatMadCents } from '@/erp-maroc/utils/money';
import { styled } from '@linaria/react';
import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  erpPurchaseOrderSchema,
  type ErpPurchaseOrder,
  type ErpPurchaseOrderLine,
} from 'twenty-shared/erp-maroc';
import { Button } from 'twenty-ui/input';
import { themeCssVariables } from 'twenty-ui/theme-constants';

type PurchaseOrderAction = 'confirm' | 'cancel';

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const StyledActions = styled.div`
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: ${themeCssVariables.spacing[2]};
`;

const StyledBody = styled.div`
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  min-height: 0;
  overflow: auto;
`;

const StyledSummary = styled.dl`
  display: grid;
  gap: ${themeCssVariables.spacing[2]} ${themeCssVariables.spacing[4]};
  grid-template-columns: repeat(4, minmax(0, 1fr));
  margin: 0;
  padding: ${themeCssVariables.spacing[4]};

  div {
    min-width: 0;
  }

  dt {
    color: ${themeCssVariables.font.color.tertiary};
    font-size: ${themeCssVariables.font.size.sm};
    margin-bottom: ${themeCssVariables.spacing[1]};
  }

  dd {
    color: ${themeCssVariables.font.color.primary};
    margin: 0;
    overflow-wrap: anywhere;
  }

  @media (max-width: 768px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
`;

const StyledSectionTitle = styled.h2`
  border-top: 1px solid ${themeCssVariables.border.color.light};
  color: ${themeCssVariables.font.color.primary};
  font-size: ${themeCssVariables.font.size.md};
  font-weight: ${themeCssVariables.font.weight.semiBold};
  letter-spacing: 0;
  margin: 0;
  padding: ${themeCssVariables.spacing[3]} ${themeCssVariables.spacing[4]};
`;

const StyledAlert = styled.div`
  border-bottom: 1px solid ${themeCssVariables.border.color.light};
  color: ${themeCssVariables.font.color.danger};
  padding: ${themeCssVariables.spacing[2]} ${themeCssVariables.spacing[4]};
`;

const actionCopy = {
  confirm: {
    button: 'Confirmer',
    title: 'Confirmer le bon de commande',
    message: 'Le bon de commande sera verrouillé pour la réception.',
  },
  cancel: {
    button: 'Annuler',
    title: 'Annuler le bon de commande',
    message: 'Cette action annulera le bon de commande fournisseur.',
  },
} as const;

export const ErpPurchaseOrderDetailPage = () => {
  const { client, context } = useErpMarocContext();
  const { id } = useParams<{ id: string }>();
  const orderId = id !== undefined && UUID_PATTERN.test(id) ? id : null;
  const [order, setOrder] = useState<ErpPurchaseOrder | null>(null);
  const [state, setState] = useState<
    'loading' | 'ready' | 'error' | 'not-found'
  >('loading');
  const [generation, setGeneration] = useState(0);
  const [action, setAction] = useState<PurchaseOrderAction | null>(null);
  const [isMutating, setIsMutating] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const canManage = context?.capabilities.manageSalesDocuments === true;

  useEffect(() => {
    if (orderId === null) return;
    const abortController = new AbortController();
    setState('loading');

    client
      .request({
        method: 'GET',
        path: `/purchase-orders/${orderId}`,
        schema: erpPurchaseOrderSchema,
        signal: abortController.signal,
      })
      .then((loadedOrder) => {
        if (abortController.signal.aborted) return;
        setOrder(loadedOrder);
        setState('ready');
      })
      .catch((error: unknown) => {
        if (abortController.signal.aborted) return;
        setState(
          error instanceof ErpMarocError && error.statusCode === 404
            ? 'not-found'
            : 'error',
        );
      });

    return () => abortController.abort();
  }, [client, generation, orderId]);

  const columns = useMemo<ErpOperationalTableColumn<ErpPurchaseOrderLine>[]>(
    () => [
      {
        key: 'description',
        header: 'Description',
        width: '300px',
        render: (line) => line.description,
      },
      {
        key: 'quantity',
        header: 'Quantité',
        width: '110px',
        align: 'right',
        render: (line) => `${line.quantity} ${line.unit ?? ''}`.trim(),
      },
      {
        key: 'received',
        header: 'Reçue',
        width: '100px',
        align: 'right',
        render: (line) => line.quantityReceived,
      },
      {
        key: 'unitPrice',
        header: 'Prix HT',
        width: '130px',
        align: 'right',
        render: (line) => formatMadCents(line.unitPriceHtCents),
      },
      {
        key: 'tva',
        header: 'TVA',
        width: '90px',
        align: 'right',
        render: (line) => `${line.tvaRate} %`,
      },
      {
        key: 'total',
        header: 'Total TTC',
        width: '140px',
        align: 'right',
        render: (line) => formatMadCents(line.totalTtcCents),
      },
    ],
    [],
  );

  const runAction = async () => {
    if (action === null || order === null || !canManage || isMutating) return;
    setIsMutating(true);
    setMessage(null);
    try {
      const intent = client.createMutationIntent(
        {
          method: 'POST',
          path: `/purchase-orders/${order.id}/${action}`,
          schema: erpPurchaseOrderSchema,
        },
        { idempotency: 'forbidden' },
      );
      setOrder(await intent.execute());
      setAction(null);
    } catch {
      setAction(null);
      setMessage(
        "L'action n'a pas pu être confirmée. Actualisez le bon avant de réessayer.",
      );
    } finally {
      setIsMutating(false);
    }
  };

  if (orderId === null || state === 'not-found') {
    return (
      <ErpPageShell
        title="Bon de commande"
        state="empty"
        emptyLabel="Bon de commande introuvable"
      />
    );
  }
  if (state !== 'ready' || order === null) {
    return (
      <ErpPageShell
        title="Bon de commande"
        state={state}
        loadingLabel="Chargement du bon de commande"
        errorLabel="Impossible de charger le bon de commande"
        retryLabel="Réessayer"
        onRetry={() => setGeneration((value) => value + 1)}
      />
    );
  }

  const appearance = purchaseOrderStatusAppearance[order.status];
  const canConfirm = canManage && order.status === 'DRAFT';
  const canCancel =
    canManage && (order.status === 'DRAFT' || order.status === 'CONFIRMED');
  const copy = action === null ? null : actionCopy[action];

  return (
    <ErpPageShell
      title={order.number}
      description={`${order.supplier.name} · ${formatMadCents(
        order.totalTtcCents,
      )} TTC`}
      actions={
        <StyledActions>
          <ErpStatusBadge label={appearance.label} tone={appearance.tone} />
          {canConfirm ? (
            <Button
              title="Confirmer"
              ariaLabel="Confirmer le bon de commande"
              accent="blue"
              onClick={() => setAction('confirm')}
            />
          ) : null}
          {canCancel ? (
            <Button
              title="Annuler"
              ariaLabel="Annuler le bon de commande"
              variant="secondary"
              accent="danger"
              onClick={() => setAction('cancel')}
            />
          ) : null}
        </StyledActions>
      }
    >
      <StyledBody>
        {message === null ? null : (
          <StyledAlert role="alert">{message}</StyledAlert>
        )}
        <StyledSummary>
          <div>
            <dt>Fournisseur</dt>
            <dd>{order.supplier.name}</dd>
          </div>
          <div>
            <dt>Date d'émission</dt>
            <dd>{formatPurchaseOrderDate(order.issueDate)}</dd>
          </div>
          <div>
            <dt>Livraison prévue</dt>
            <dd>{formatPurchaseOrderDate(order.expectedDeliveryDate)}</dd>
          </div>
          <div>
            <dt>Total HT</dt>
            <dd>{formatMadCents(order.totalHtCents)}</dd>
          </div>
          <div>
            <dt>TVA</dt>
            <dd>{formatMadCents(order.totalTvaCents)}</dd>
          </div>
          <div>
            <dt>Total TTC</dt>
            <dd>{formatMadCents(order.totalTtcCents)}</dd>
          </div>
          <div>
            <dt>ICE fournisseur</dt>
            <dd>{order.supplier.ice ?? 'Non renseigné'}</dd>
          </div>
          <div>
            <dt>Notes</dt>
            <dd>{order.notes ?? 'Aucune note'}</dd>
          </div>
        </StyledSummary>
        <StyledSectionTitle>Lignes de commande</StyledSectionTitle>
        <ErpOperationalTable
          ariaLabel="Lignes du bon de commande"
          columns={columns}
          rows={order.lines}
          getRowKey={(line) => line.id}
          emptyLabel="Aucune ligne"
        />
      </StyledBody>
      <ErpConfirmDialog
        isOpen={action !== null}
        title={copy?.title ?? 'Confirmer'}
        message={copy?.message ?? ''}
        confirmLabel={copy?.button}
        destructive={action === 'cancel'}
        confirmDisabled={isMutating}
        isConfirming={isMutating}
        onCancel={() => {
          if (!isMutating) setAction(null);
        }}
        onConfirm={() => void runAction()}
      />
    </ErpPageShell>
  );
};
