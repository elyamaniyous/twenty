import { ErpMarocError } from '@/erp-maroc/api/erpMarocError';
import { ErpConfirmDialog } from '@/erp-maroc/components/ErpConfirmDialog';
import {
  ErpOperationalTable,
  type ErpOperationalTableColumn,
} from '@/erp-maroc/components/ErpOperationalTable';
import { ErpPageShell } from '@/erp-maroc/components/ErpPageShell';
import { ErpStatusBadge } from '@/erp-maroc/components/ErpStatusBadge';
import { useErpMarocContext } from '@/erp-maroc/context/useErpMarocContext';
import { erpMarocPaths } from '@/erp-maroc/navigation/erpMarocPaths';
import { ErpSalesDeliveryPanel } from '@/erp-maroc/sales-orders/ErpSalesDeliveryPanel';
import {
  ErpSalesReservationPanel,
  type ErpSalesStockAction,
} from '@/erp-maroc/sales-orders/ErpSalesReservationPanel';
import {
  formatSalesOrderDate,
  salesOrderStatusAppearance,
} from '@/erp-maroc/sales-orders/salesOrderUi';
import { formatMadCents } from '@/erp-maroc/utils/money';
import { styled } from '@linaria/react';
import { useEffect, useMemo, useState } from 'react';
import { generatePath, Link, useNavigate, useParams } from 'react-router-dom';
import {
  erpInvoiceSchema,
  erpSalesOrderSchema,
  type ErpInvoice,
  type ErpSalesOrder,
  type ErpSalesOrderLine,
} from 'twenty-shared/erp-maroc';
import { Button } from 'twenty-ui/input';
import { themeCssVariables } from 'twenty-ui/theme-constants';

type SalesOrderAction = 'cancel' | 'invoice';
type SalesOrderInvoice = ErpSalesOrder['invoices'][number];

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

const StyledLink = styled(Link)`
  color: ${themeCssVariables.font.color.primary};
  text-decoration: underline;
`;

const actionCopy = {
  cancel: {
    button: 'Annuler',
    title: 'Annuler la commande client',
    message: 'Cette action annulera la commande avant toute livraison.',
  },
  invoice: {
    button: 'Créer la facture',
    title: 'Facturer les livraisons',
    message:
      'La facture brouillon reprendra uniquement les quantités livrées qui ne sont pas encore facturées.',
  },
} as const;

const invoiceStatusLabel: Record<string, string> = {
  DRAFT: 'Brouillon',
  VALIDATED: 'Validée',
  SENT: 'Envoyée',
  PARTIALLY_PAID: 'Partiellement réglée',
  PAID: 'Payée',
  OVERDUE: 'Échue',
  CANCELLED: 'Annulée',
};

export const ErpSalesOrderDetailPage = () => {
  const { client, context } = useErpMarocContext();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const orderId = id !== undefined && UUID_PATTERN.test(id) ? id : null;
  const [order, setOrder] = useState<ErpSalesOrder | null>(null);
  const [state, setState] = useState<
    'loading' | 'ready' | 'error' | 'not-found'
  >('loading');
  const [generation, setGeneration] = useState(0);
  const [action, setAction] = useState<SalesOrderAction | null>(null);
  const [isMutating, setIsMutating] = useState(false);
  const [stockAction, setStockAction] = useState<ErpSalesStockAction | null>(
    null,
  );
  const [isDeliveryOpen, setIsDeliveryOpen] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const canManage = context?.capabilities.manageSalesDocuments === true;

  useEffect(() => {
    if (orderId === null) return;
    const abortController = new AbortController();
    setState('loading');
    client
      .request({
        method: 'GET',
        path: `/sales-orders/${orderId}`,
        schema: erpSalesOrderSchema,
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

  const columns = useMemo<ErpOperationalTableColumn<ErpSalesOrderLine>[]>(
    () => [
      {
        key: 'description',
        header: 'Description',
        width: '300px',
        render: (line) => line.description,
      },
      {
        key: 'quantity',
        header: 'Commandée',
        width: '120px',
        align: 'right',
        render: (line) => `${line.quantity} ${line.unit ?? ''}`.trim(),
      },
      {
        key: 'delivered',
        header: 'Livrée',
        width: '110px',
        align: 'right',
        render: (line) => line.quantityDelivered,
      },
      {
        key: 'invoiced',
        header: 'Facturée',
        width: '110px',
        align: 'right',
        render: (line) =>
          line.invoiceAllocations.reduce(
            (total, allocation) => total + allocation.quantity,
            0,
          ),
      },
      {
        key: 'reserved',
        header: 'Réservée',
        width: '110px',
        align: 'right',
        render: (line) =>
          line.allocations.reduce(
            (total, allocation) => total + allocation.quantityReserved,
            0,
          ),
      },
      {
        key: 'prepared',
        header: 'Préparée',
        width: '110px',
        align: 'right',
        render: (line) =>
          line.allocations.reduce(
            (total, allocation) => total + allocation.quantityPrepared,
            0,
          ),
      },
      {
        key: 'remaining',
        header: 'À livrer',
        width: '110px',
        align: 'right',
        render: (line) => line.quantity - line.quantityDelivered,
      },
      {
        key: 'billable',
        header: 'À facturer',
        width: '110px',
        align: 'right',
        render: (line) => {
          const invoiced = line.invoiceAllocations.reduce(
            (total, allocation) => total + allocation.quantity,
            0,
          );
          return Math.max(0, line.quantityDelivered - invoiced);
        },
      },
      {
        key: 'unitPrice',
        header: 'Prix HT',
        width: '130px',
        align: 'right',
        render: (line) => formatMadCents(line.unitPriceHtCents),
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

  const invoiceColumns = useMemo<
    ErpOperationalTableColumn<SalesOrderInvoice>[]
  >(
    () => [
      {
        key: 'number',
        header: 'Facture',
        width: '220px',
        render: (invoice) => (
          <StyledLink
            to={generatePath(erpMarocPaths.invoiceDetail, { id: invoice.id })}
          >
            {invoice.number ?? 'Brouillon'}
          </StyledLink>
        ),
      },
      {
        key: 'status',
        header: 'Statut',
        width: '180px',
        render: (invoice) =>
          invoiceStatusLabel[invoice.status] ?? invoice.status,
      },
      {
        key: 'amount',
        header: 'Total TTC',
        width: '160px',
        align: 'right',
        render: (invoice) => formatMadCents(invoice.totalTtcCents),
      },
    ],
    [],
  );

  const runAction = async () => {
    if (action === null || order === null || !canManage || isMutating) return;
    setIsMutating(true);
    setMessage(null);
    try {
      if (action === 'invoice') {
        const intent = client.createMutationIntent(
          {
            method: 'POST',
            path: `/invoices/from-sales-order/${order.id}`,
            schema: erpInvoiceSchema,
          },
          { idempotency: 'forbidden' },
        );
        const invoice = (await intent.execute()) as ErpInvoice;
        void navigate(
          generatePath(erpMarocPaths.invoiceDetail, { id: invoice.id }),
        );
        return;
      }

      const intent = client.createMutationIntent(
        {
          method: 'POST',
          path: `/sales-orders/${order.id}/${action}`,
          schema: erpSalesOrderSchema,
          body:
            action === 'cancel'
              ? { reason: 'Annulation manuelle depuis Twenty' }
              : undefined,
        },
        { idempotency: 'forbidden' },
      );
      setOrder(await intent.execute());
      setAction(null);
    } catch {
      setAction(null);
      setMessage(
        "L'action n'a pas pu être confirmée. Actualisez la commande avant de réessayer.",
      );
    } finally {
      setIsMutating(false);
    }
  };

  if (orderId === null || state === 'not-found') {
    return (
      <ErpPageShell
        title="Commande client"
        state="empty"
        emptyLabel="Commande client introuvable"
      />
    );
  }
  if (state !== 'ready' || order === null) {
    return (
      <ErpPageShell
        title="Commande client"
        state={state}
        loadingLabel="Chargement de la commande client"
        errorLabel="Impossible de charger la commande client"
        retryLabel="Réessayer"
        onRetry={() => setGeneration((value) => value + 1)}
      />
    );
  }

  const appearance = salesOrderStatusAppearance[order.status];
  const unreservedQuantity = order.lines.reduce(
    (total, line) =>
      line.product?.type === 'PRODUIT'
        ? total +
          Math.max(
            0,
            line.quantity -
              line.quantityDelivered -
              line.allocations.reduce(
                (sum, allocation) => sum + allocation.quantityReserved,
                0,
              ),
          )
        : total,
    0,
  );
  const reservedQuantity = order.lines.reduce(
    (total, line) =>
      total +
      line.allocations.reduce(
        (sum, allocation) => sum + allocation.quantityReserved,
        0,
      ),
    0,
  );
  const preparedQuantity = order.lines.reduce(
    (total, line) =>
      total +
      line.allocations.reduce(
        (sum, allocation) => sum + allocation.quantityPrepared,
        0,
      ),
    0,
  );
  const billableQuantity = order.lines.reduce((total, line) => {
    const invoiced = line.invoiceAllocations.reduce(
      (sum, allocation) => sum + allocation.quantity,
      0,
    );
    return total + Math.max(0, line.quantityDelivered - invoiced);
  }, 0);
  const canReserve =
    canManage &&
    (order.status === 'DRAFT' ||
      ((order.status === 'CONFIRMED' ||
        order.status === 'PARTIALLY_DELIVERED') &&
        unreservedQuantity > 1e-9));
  const canPrepare =
    canManage &&
    (order.status === 'CONFIRMED' || order.status === 'PARTIALLY_DELIVERED') &&
    reservedQuantity > 1e-9;
  const canCancel =
    canManage && (order.status === 'DRAFT' || order.status === 'CONFIRMED');
  const canDeliver =
    canManage &&
    (order.status === 'CONFIRMED' || order.status === 'PARTIALLY_DELIVERED') &&
    preparedQuantity > 1e-9;
  const canInvoice =
    canManage &&
    (order.status === 'PARTIALLY_DELIVERED' || order.status === 'DELIVERED') &&
    billableQuantity > 1e-9;
  const copy = action === null ? null : actionCopy[action];

  return (
    <ErpPageShell
      title={order.number}
      description={`${order.customer.name} · ${formatMadCents(order.totalTtcCents)} TTC`}
      actions={
        <StyledActions>
          <ErpStatusBadge label={appearance.label} tone={appearance.tone} />
          {canReserve ? (
            <Button
              title={
                order.status === 'DRAFT' ? 'Confirmer et réserver' : 'Réserver'
              }
              ariaLabel="Réserver le stock de la commande client"
              accent="blue"
              onClick={() => setStockAction('reserve')}
            />
          ) : null}
          {canPrepare ? (
            <Button
              title="Préparer"
              ariaLabel="Préparer la commande client"
              variant="secondary"
              onClick={() => setStockAction('prepare')}
            />
          ) : null}
          {canCancel ? (
            <Button
              title="Annuler"
              ariaLabel="Annuler la commande client"
              variant="secondary"
              accent="danger"
              onClick={() => setAction('cancel')}
            />
          ) : null}
          {canDeliver ? (
            <Button
              title="Livrer"
              ariaLabel="Enregistrer une livraison client"
              accent="blue"
              onClick={() => setIsDeliveryOpen(true)}
            />
          ) : null}
          {canInvoice ? (
            <Button
              title="Facturer les livraisons"
              ariaLabel="Facturer les quantités livrées non facturées"
              accent="blue"
              onClick={() => setAction('invoice')}
            />
          ) : null}
          {order.convertedInvoiceId === null ? null : (
            <Button
              title="Ouvrir la facture"
              ariaLabel="Ouvrir la facture liée"
              variant="secondary"
              onClick={() =>
                void navigate(
                  generatePath(erpMarocPaths.invoiceDetail, {
                    id: order.convertedInvoiceId!,
                  }),
                )
              }
            />
          )}
        </StyledActions>
      }
    >
      <StyledBody>
        {message === null ? null : (
          <StyledAlert role="alert">{message}</StyledAlert>
        )}
        <StyledSummary>
          <div>
            <dt>Client</dt>
            <dd>{order.customer.name}</dd>
          </div>
          <div>
            <dt>Date d'émission</dt>
            <dd>{formatSalesOrderDate(order.issueDate)}</dd>
          </div>
          <div>
            <dt>Livraison prévue</dt>
            <dd>{formatSalesOrderDate(order.expectedDeliveryDate)}</dd>
          </div>
          <div>
            <dt>Devis source</dt>
            <dd>
              {order.sourceQuote === null ? (
                'Non renseigné'
              ) : (
                <StyledLink
                  to={generatePath(erpMarocPaths.quoteDetail, {
                    id: order.sourceQuote.id,
                  })}
                >
                  {order.sourceQuote.number}
                </StyledLink>
              )}
            </dd>
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
            <dt>Notes</dt>
            <dd>{order.notes ?? 'Aucune note'}</dd>
          </div>
        </StyledSummary>
        <StyledSectionTitle>Lignes de commande</StyledSectionTitle>
        <ErpOperationalTable
          ariaLabel="Lignes de la commande client"
          columns={columns}
          rows={order.lines}
          getRowKey={(line) => line.id}
          emptyLabel="Aucune ligne"
        />
        <StyledSectionTitle>Factures liées</StyledSectionTitle>
        <ErpOperationalTable
          ariaLabel="Factures liées à la commande client"
          columns={invoiceColumns}
          rows={order.invoices}
          getRowKey={(invoice) => invoice.id}
          emptyLabel="Aucune facture"
        />
        <ErpSalesReservationPanel
          order={order}
          mode={stockAction}
          disabled={!canManage}
          onClose={() => setStockAction(null)}
          onSaved={(updatedOrder) => {
            setOrder(updatedOrder);
            setStockAction(null);
          }}
        />
        <ErpSalesDeliveryPanel
          order={order}
          isOpen={isDeliveryOpen}
          disabled={!canDeliver}
          onClose={() => setIsDeliveryOpen(false)}
          onSaved={() => setGeneration((value) => value + 1)}
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
