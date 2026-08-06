import { ErpConfirmDialog } from '@/erp-maroc/components/ErpConfirmDialog';
import { ErpFormDrawer } from '@/erp-maroc/components/ErpFormDrawer';
import {
  ErpOperationalTable,
  type ErpOperationalTableColumn,
} from '@/erp-maroc/components/ErpOperationalTable';
import { ErpPageShell } from '@/erp-maroc/components/ErpPageShell';
import { ErpStatusBadge, type ErpStatusTone } from '@/erp-maroc/components/ErpStatusBadge';
import { useErpMarocContext } from '@/erp-maroc/context/useErpMarocContext';
import { formatMadCents } from '@/erp-maroc/utils/money';
import { useSnackBar } from '@/ui/feedback/snack-bar-manager/hooks/useSnackBar';
import { styled } from '@linaria/react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  erpCustomerReturnEligibleLineListSchema,
  erpCustomerReturnListSchema,
  erpCustomerReturnSchema,
  erpDeliveryNoteListSchema,
  erpDeliveryNoteSchema,
  erpInvoiceSchema,
  erpQuoteListSchema,
  erpSalesOrderListSchema,
  erpSalesOrderSchema,
  erpWarehouseListSchema,
  type ErpCustomerReturn,
  type ErpCustomerReturnEligibleLine,
  type ErpDeliveryNote,
  type ErpQuote,
  type ErpSalesOrder,
  type ErpSalesOrderLine,
  type ErpWarehouse,
} from 'twenty-shared/erp-maroc';
import { IconCheck, IconFileText, IconPlus, IconRefresh, IconX } from 'twenty-ui/display';
import { Button } from 'twenty-ui/input';
import { themeCssVariables } from 'twenty-ui/theme-constants';
import { type ZodType } from 'zod';

type View = 'orders' | 'deliveries' | 'returns';
type Drawer = 'new-order' | 'prepare' | 'delivery' | 'return' | 'cancel-order' | 'cancel-delivery' | 'cancel-return';
type ReturnAction = { kind: 'validate'; item: ErpCustomerReturn };

const today = () => new Date().toISOString().slice(0, 10);
const quantity = (value: number) => new Intl.NumberFormat('fr-MA', { maximumFractionDigits: 3 }).format(value);
const date = (value: string) => new Intl.DateTimeFormat('fr-MA').format(new Date(`${value}T12:00:00`));

const orderStatus: Record<ErpSalesOrder['status'], { label: string; tone: ErpStatusTone }> = {
  DRAFT: { label: 'Brouillon', tone: 'neutral' },
  CONFIRMED: { label: 'Confirmée', tone: 'info' },
  PARTIALLY_DELIVERED: { label: 'Livrée partiellement', tone: 'warning' },
  DELIVERED: { label: 'Livrée', tone: 'success' },
  INVOICED: { label: 'Facturée', tone: 'success' },
  CANCELLED: { label: 'Annulée', tone: 'danger' },
};

const returnStatus: Record<ErpCustomerReturn['status'], { label: string; tone: ErpStatusTone }> = {
  DRAFT: { label: 'Brouillon', tone: 'warning' },
  VALIDATED: { label: 'Validé', tone: 'success' },
  CANCELLED: { label: 'Annulé', tone: 'danger' },
};

const StyledWorkspace = styled.div`
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  min-height: 0;
`;

const StyledTabs = styled.div`
  border-bottom: 1px solid ${themeCssVariables.border.color.medium};
  display: flex;
  flex: 0 0 auto;
  gap: ${themeCssVariables.spacing[1]};
  min-height: 44px;
  padding: 0 ${themeCssVariables.spacing[3]};
`;

const StyledTab = styled.button<{ active: boolean }>`
  background: transparent;
  border: 0;
  border-bottom: 2px solid ${({ active }) => active ? themeCssVariables.color.blue : 'transparent'};
  color: ${({ active }) => active ? themeCssVariables.font.color.primary : themeCssVariables.font.color.secondary};
  cursor: pointer;
  font: inherit;
  height: 44px;
  letter-spacing: 0;
  padding: 0 ${themeCssVariables.spacing[2]};
`;

const StyledSplit = styled.div`
  display: grid;
  flex: 1 1 auto;
  grid-template-rows: minmax(220px, 1.1fr) minmax(250px, 1fr);
  min-height: 0;
`;

const StyledDetail = styled.section`
  border-top: 1px solid ${themeCssVariables.border.color.medium};
  display: flex;
  flex-direction: column;
  min-height: 0;
`;

const StyledDetailHeader = styled.div`
  align-items: center;
  background: ${themeCssVariables.background.secondary};
  border-bottom: 1px solid ${themeCssVariables.border.color.light};
  display: flex;
  gap: ${themeCssVariables.spacing[3]};
  justify-content: space-between;
  min-height: 48px;
  padding: 0 ${themeCssVariables.spacing[3]};
`;

const StyledDetailTitle = styled.div`
  color: ${themeCssVariables.font.color.primary};
  display: flex;
  flex-direction: column;
  font-size: ${themeCssVariables.font.size.md};
  gap: 2px;
  min-width: 0;

  span {
    color: ${themeCssVariables.font.color.secondary};
    font-size: ${themeCssVariables.font.size.sm};
  }
`;

const StyledActions = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${themeCssVariables.spacing[1]};
`;

const StyledLinkButton = styled.button`
  background: transparent;
  border: 0;
  color: ${themeCssVariables.color.blue};
  cursor: pointer;
  font: inherit;
  max-width: 100%;
  overflow: hidden;
  padding: 0;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const formControl = `
  background: ${themeCssVariables.background.primary};
  border: 1px solid ${themeCssVariables.border.color.medium};
  border-radius: ${themeCssVariables.border.radius.sm};
  box-sizing: border-box;
  color: ${themeCssVariables.font.color.primary};
  font: inherit;
  height: 32px;
  min-width: 0;
  padding: 0 ${themeCssVariables.spacing[2]};
  width: 100%;
`;

const StyledInput = styled.input`${formControl}`;
const StyledSelect = styled.select`${formControl}`;
const StyledTextarea = styled.textarea`
  ${formControl}
  height: 88px;
  padding-bottom: ${themeCssVariables.spacing[2]};
  padding-top: ${themeCssVariables.spacing[2]};
  resize: vertical;
`;

const StyledDrawerBody = styled.form`
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[3]};
  min-height: 0;
  overflow: auto;
  padding: ${themeCssVariables.spacing[3]};
`;

const StyledField = styled.label`
  color: ${themeCssVariables.font.color.secondary};
  display: flex;
  flex-direction: column;
  font-size: ${themeCssVariables.font.size.sm};
  gap: ${themeCssVariables.spacing[1]};
`;

const StyledLines = styled.div`
  border: 1px solid ${themeCssVariables.border.color.light};
  border-radius: ${themeCssVariables.border.radius.sm};
`;

const StyledLine = styled.label`
  align-items: center;
  border-bottom: 1px solid ${themeCssVariables.border.color.light};
  display: grid;
  gap: ${themeCssVariables.spacing[2]};
  grid-template-columns: minmax(0, 1fr) 110px;
  padding: ${themeCssVariables.spacing[2]};

  &:last-child { border-bottom: 0; }
`;

const StyledLineName = styled.span`
  color: ${themeCssVariables.font.color.primary};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

export const ErpSalesOperationsPage = () => {
  const { client, context } = useErpMarocContext();
  const { enqueueErrorSnackBar, enqueueSuccessSnackBar } = useSnackBar();
  const [view, setView] = useState<View>('orders');
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [busy, setBusy] = useState(false);
  const [generation, setGeneration] = useState(0);
  const [drawer, setDrawer] = useState<Drawer | null>(null);
  const [orders, setOrders] = useState<ErpSalesOrder[]>([]);
  const [deliveries, setDeliveries] = useState<ErpDeliveryNote[]>([]);
  const [returns, setReturns] = useState<ErpCustomerReturn[]>([]);
  const [eligibleLines, setEligibleLines] = useState<ErpCustomerReturnEligibleLine[]>([]);
  const [quotes, setQuotes] = useState<ErpQuote[]>([]);
  const [warehouses, setWarehouses] = useState<ErpWarehouse[]>([]);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [selectedDelivery, setSelectedDelivery] = useState<ErpDeliveryNote | null>(null);
  const [selectedReturn, setSelectedReturn] = useState<ErpCustomerReturn | null>(null);
  const [returnAction, setReturnAction] = useState<ReturnAction | null>(null);
  const [orderForm, setOrderForm] = useState({ quoteId: '', issueDate: today(), expectedDeliveryDate: '', notes: '' });
  const [operationForm, setOperationForm] = useState({ warehouseId: '', date: today(), notes: '', values: {} as Record<string, string> });
  const [returnForm, setReturnForm] = useState({ eligibleLineId: '', returnDate: today(), quantity: '', reason: '', notes: '' });
  const [cancelReason, setCancelReason] = useState('');

  const selectedOrder = useMemo(
    () => orders.find((order) => order.id === selectedOrderId) ?? orders[0] ?? null,
    [orders, selectedOrderId],
  );
  const defaultWarehouseId = warehouses.find((item) => item.isDefault)?.id ?? warehouses[0]?.id ?? '';
  const canManageSales = context?.capabilities.manageSalesDocuments === true;
  const canManageStock = context?.capabilities.manageInventory === true;
  const availableQuotes = quotes.filter((quote) => quote.status === 'ACCEPTED' && !quote.convertedSalesOrderId);

  const load = useCallback(async () => {
    setStatus('loading');
    try {
      const [nextOrders, nextReturns, nextEligibleLines, nextQuotes, nextWarehouses] = await Promise.all([
        client.request({ method: 'GET', path: '/sales-orders', schema: erpSalesOrderListSchema }),
        client.request({ method: 'GET', path: '/customer-returns', schema: erpCustomerReturnListSchema }),
        client.request({ method: 'GET', path: '/customer-returns/eligible-lines', schema: erpCustomerReturnEligibleLineListSchema }),
        client.request({ method: 'GET', path: '/quotes', schema: erpQuoteListSchema }),
        client.request({ method: 'GET', path: '/warehouses', schema: erpWarehouseListSchema }),
      ]);
      const deliveryLists = await Promise.all(nextOrders.map((order) => client.request({
        method: 'GET', path: `/sales-orders/${order.id}/deliveries`, schema: erpDeliveryNoteListSchema,
      })));
      setOrders(nextOrders);
      setReturns(nextReturns);
      setEligibleLines(nextEligibleLines);
      setQuotes(nextQuotes);
      setWarehouses(nextWarehouses);
      setDeliveries(deliveryLists.flat());
      setSelectedOrderId((current) => current ?? nextOrders[0]?.id ?? null);
      setStatus('ready');
    } catch {
      setStatus('error');
    }
  }, [client]);

  useEffect(() => { void load(); }, [generation, load]);
  const refresh = () => setGeneration((value) => value + 1);

  const runMutation = async (
    path: string,
    schema: ZodType,
    body: unknown,
    message: string,
    idempotency: 'required' | 'forbidden',
  ) => {
    setBusy(true);
    try {
      const request = { method: 'POST' as const, path, schema, body };
      const intent = idempotency === 'required'
        ? client.createMutationIntent(request)
        : client.createMutationIntent(request, { idempotency: 'forbidden' });
      await intent.execute();
      enqueueSuccessSnackBar({ message });
      setDrawer(null);
      setReturnAction(null);
      await load();
      return true;
    } catch {
      enqueueErrorSnackBar({ message: "L'opération commerciale a échoué" });
      return false;
    } finally {
      setBusy(false);
    }
  };

  const openNewOrder = () => {
    setOrderForm({ quoteId: availableQuotes[0]?.id ?? '', issueDate: today(), expectedDeliveryDate: '', notes: '' });
    setDrawer('new-order');
  };

  const openLineOperation = (kind: 'prepare' | 'delivery') => {
    if (!selectedOrder) return;
    const values = Object.fromEntries(selectedOrder.lines.map((line) => {
      const allocation = line.allocations.find((item) => item.warehouseId === defaultWarehouseId);
      const suggested = kind === 'prepare'
        ? allocation?.quantityReserved ?? 0
        : Math.max(0, (allocation?.quantityPrepared ?? 0) - line.quantityDelivered);
      return [line.id, String(suggested)];
    }));
    setOperationForm({ warehouseId: defaultWarehouseId, date: today(), notes: '', values });
    setDrawer(kind);
  };

  const changeOperationWarehouse = (warehouseId: string) => {
    if (!selectedOrder) return;
    setOperationForm((current) => ({
      ...current,
      warehouseId,
      values: Object.fromEntries(selectedOrder.lines.map((line) => {
        const allocation = line.allocations.find((item) => item.warehouseId === warehouseId);
        const value = drawer === 'prepare'
          ? allocation?.quantityReserved ?? 0
          : Math.max(0, (allocation?.quantityPrepared ?? 0) - line.quantityDelivered);
        return [line.id, String(value)];
      })),
    }));
  };

  const openReturn = () => {
    const line = eligibleLines[0];
    setReturnForm({
      eligibleLineId: line?.salesInvoiceAllocationId ?? '', returnDate: today(),
      quantity: line ? String(line.quantityAvailable) : '', reason: '', notes: '',
    });
    setDrawer('return');
  };

  const submitDrawer = async () => {
    if (drawer === 'new-order') {
      await runMutation(`/sales-orders/from-quote/${orderForm.quoteId}`, erpSalesOrderSchema, {
        issueDate: orderForm.issueDate,
        expectedDeliveryDate: orderForm.expectedDeliveryDate || null,
        notes: orderForm.notes || null,
      }, 'Commande client créée', 'forbidden');
    } else if ((drawer === 'prepare' || drawer === 'delivery') && selectedOrder) {
      const values = selectedOrder.lines.map((line) => ({
        salesOrderLineId: line.id,
        value: Number((operationForm.values[line.id] ?? '0').replace(',', '.')),
      }));
      if (drawer === 'prepare') {
        await runMutation(`/sales-orders/${selectedOrder.id}/preparation`, erpSalesOrderSchema, {
          warehouseId: operationForm.warehouseId,
          lines: values.map((line) => ({ salesOrderLineId: line.salesOrderLineId, quantityPrepared: line.value })),
        }, 'Préparation enregistrée', 'forbidden');
      } else {
        await runMutation(`/sales-orders/${selectedOrder.id}/deliveries`, erpDeliveryNoteSchema, {
          warehouseId: operationForm.warehouseId,
          deliveryDate: operationForm.date,
          notes: operationForm.notes || null,
          commandId: crypto.randomUUID(),
          lines: values.filter((line) => line.value > 0).map((line) => ({ salesOrderLineId: line.salesOrderLineId, quantity: line.value })),
        }, 'Bon de livraison comptabilisé', 'forbidden');
      }
    } else if (drawer === 'return') {
      const line = eligibleLines.find((item) => item.salesInvoiceAllocationId === returnForm.eligibleLineId);
      if (!line) return;
      await runMutation('/customer-returns', erpCustomerReturnSchema, {
        sourceInvoiceId: line.invoiceId,
        deliveryNoteId: line.deliveryNoteId,
        returnDate: returnForm.returnDate,
        reason: returnForm.reason,
        notes: returnForm.notes || null,
        lines: [{ salesInvoiceAllocationId: line.salesInvoiceAllocationId, quantity: Number(returnForm.quantity.replace(',', '.')) }],
      }, 'Retour client créé', 'required');
    } else if (drawer === 'cancel-order' && selectedOrder) {
      await runMutation(`/sales-orders/${selectedOrder.id}/cancel`, erpSalesOrderSchema, { reason: cancelReason }, 'Commande annulée', 'forbidden');
    } else if (drawer === 'cancel-delivery' && selectedDelivery) {
      await runMutation(`/sales-orders/${selectedDelivery.salesOrderId}/deliveries/${selectedDelivery.id}/cancel`, erpDeliveryNoteSchema, {
        reason: cancelReason, commandId: crypto.randomUUID(),
      }, 'Livraison annulée et stock réintégré', 'forbidden');
    } else if (drawer === 'cancel-return' && selectedReturn) {
      await runMutation(`/customer-returns/${selectedReturn.id}/cancel`, erpCustomerReturnSchema, { reason: cancelReason }, 'Retour annulé', 'required');
    }
  };

  const orderColumns: ErpOperationalTableColumn<ErpSalesOrder>[] = [
    { key: 'number', header: 'Commande', width: '160px', render: (row) => <StyledLinkButton onClick={() => setSelectedOrderId(row.id)}>{row.number}</StyledLinkButton> },
    { key: 'customer', header: 'Client', width: '230px', render: (row) => row.customer.name },
    { key: 'date', header: 'Date', width: '110px', render: (row) => date(row.issueDate) },
    { key: 'expected', header: 'Livraison prévue', width: '140px', render: (row) => row.expectedDeliveryDate ? date(row.expectedDeliveryDate) : '—' },
    { key: 'status', header: 'Statut', width: '155px', render: (row) => <ErpStatusBadge {...orderStatus[row.status]} /> },
    { key: 'total', header: 'Total TTC', width: '140px', align: 'right', render: (row) => formatMadCents(row.totalTtcCents) },
  ];

  const lineColumns: ErpOperationalTableColumn<ErpSalesOrderLine>[] = [
    { key: 'description', header: 'Article', width: '280px', render: (row) => row.product ? `${row.product.code} · ${row.product.name}` : row.description },
    { key: 'ordered', header: 'Commandé', width: '110px', align: 'right', render: (row) => quantity(row.quantity) },
    { key: 'reserved', header: 'Réservé', width: '110px', align: 'right', render: (row) => quantity(row.allocations.reduce((sum, item) => sum + item.quantityReserved, 0)) },
    { key: 'prepared', header: 'Préparé', width: '110px', align: 'right', render: (row) => quantity(row.allocations.reduce((sum, item) => sum + item.quantityPrepared, 0)) },
    { key: 'delivered', header: 'Livré', width: '110px', align: 'right', render: (row) => quantity(row.quantityDelivered) },
    { key: 'remaining', header: 'Reliquat', width: '110px', align: 'right', render: (row) => quantity(Math.max(0, row.quantity - row.quantityDelivered)) },
    { key: 'total', header: 'Total TTC', width: '140px', align: 'right', render: (row) => formatMadCents(row.totalTtcCents) },
  ];

  const deliveryColumns: ErpOperationalTableColumn<ErpDeliveryNote>[] = [
    { key: 'number', header: 'Bon de livraison', width: '180px', render: (row) => row.number },
    { key: 'order', header: 'Commande', width: '160px', render: (row) => orders.find((order) => order.id === row.salesOrderId)?.number ?? '—' },
    { key: 'customer', header: 'Client', width: '220px', render: (row) => orders.find((order) => order.id === row.salesOrderId)?.customer.name ?? '—' },
    { key: 'warehouse', header: 'Entrepôt', width: '130px', render: (row) => row.warehouse.code },
    { key: 'date', header: 'Date', width: '110px', render: (row) => date(row.deliveryDate) },
    { key: 'lines', header: 'Lignes', width: '90px', align: 'right', render: (row) => row.lines.length },
    { key: 'status', header: 'Statut', width: '120px', render: (row) => <ErpStatusBadge label={row.status === 'POSTED' ? 'Comptabilisé' : 'Annulé'} tone={row.status === 'POSTED' ? 'success' : 'danger'} /> },
    { key: 'actions', header: '', width: '120px', align: 'right', render: (row) => row.status === 'POSTED' && canManageStock ? <Button title="Annuler" ariaLabel={`Annuler ${row.number}`} Icon={IconX} variant="secondary" onClick={() => { setSelectedDelivery(row); setCancelReason(''); setDrawer('cancel-delivery'); }} /> : null },
  ];

  const returnColumns: ErpOperationalTableColumn<ErpCustomerReturn>[] = [
    { key: 'number', header: 'Retour', width: '150px', render: (row) => row.number },
    { key: 'customer', header: 'Client', width: '220px', render: (row) => row.customer.name },
    { key: 'delivery', header: 'Livraison', width: '160px', render: (row) => row.deliveryNote.number },
    { key: 'date', header: 'Date', width: '110px', render: (row) => date(row.returnDate) },
    { key: 'reason', header: 'Motif', width: '260px', render: (row) => row.reason },
    { key: 'status', header: 'Statut', width: '120px', render: (row) => <ErpStatusBadge {...returnStatus[row.status]} /> },
    { key: 'credit', header: 'Avoir', width: '130px', render: (row) => row.creditNote?.number ?? (row.creditNote ? 'Brouillon' : '—') },
    { key: 'actions', header: '', width: '160px', align: 'right', render: (row) => row.status === 'DRAFT' && canManageStock ? <StyledActions>
      <Button title="Valider" ariaLabel={`Valider ${row.number}`} Icon={IconCheck} variant="secondary" onClick={() => setReturnAction({ kind: 'validate', item: row })} />
      <Button title="Annuler" ariaLabel={`Annuler ${row.number}`} Icon={IconX} variant="secondary" onClick={() => { setSelectedReturn(row); setCancelReason(''); setDrawer('cancel-return'); }} />
    </StyledActions> : null },
  ];

  const orderActions = selectedOrder && canManageSales ? (
    <StyledActions>
      {selectedOrder.status === 'DRAFT' ? <Button title="Confirmer" ariaLabel="Confirmer et réserver la commande" Icon={IconCheck} variant="primary" onClick={() => void runMutation(`/sales-orders/${selectedOrder.id}/confirm`, erpSalesOrderSchema, { warehouseId: defaultWarehouseId || null }, 'Commande confirmée', 'forbidden')} /> : null}
      {['CONFIRMED', 'PARTIALLY_DELIVERED'].includes(selectedOrder.status) ? <Button title="Réserver" ariaLabel="Actualiser la réservation" variant="secondary" onClick={() => void runMutation(`/sales-orders/${selectedOrder.id}/reservations`, erpSalesOrderSchema, { warehouseId: defaultWarehouseId || null }, 'Stock réservé', 'forbidden')} /> : null}
      {['CONFIRMED', 'PARTIALLY_DELIVERED'].includes(selectedOrder.status) && canManageStock ? <Button title="Préparer" ariaLabel="Préparer la commande" variant="secondary" onClick={() => openLineOperation('prepare')} /> : null}
      {['CONFIRMED', 'PARTIALLY_DELIVERED'].includes(selectedOrder.status) && canManageStock ? <Button title="Livrer" ariaLabel="Créer un bon de livraison" variant="primary" onClick={() => openLineOperation('delivery')} /> : null}
      {['DELIVERED', 'PARTIALLY_DELIVERED'].includes(selectedOrder.status) ? <Button title="Facturer" ariaLabel="Créer la facture de la commande" Icon={IconFileText} variant="secondary" onClick={() => void runMutation(`/invoices/from-sales-order/${selectedOrder.id}`, erpInvoiceSchema, {}, 'Facture créée', 'forbidden')} /> : null}
      {['DRAFT', 'CONFIRMED'].includes(selectedOrder.status) ? <Button title="Annuler" ariaLabel="Annuler la commande" Icon={IconX} variant="secondary" onClick={() => { setCancelReason(''); setDrawer('cancel-order'); }} /> : null}
    </StyledActions>
  ) : null;

  const drawerTitle: Record<Drawer, [string, string]> = {
    'new-order': ['Nouvelle commande', "Créez une commande depuis un devis accepté."],
    prepare: ['Préparer la commande', 'Indiquez les quantités préparées dans l’entrepôt.'],
    delivery: ['Créer la livraison', 'Les quantités validées sortiront du stock.'],
    return: ['Nouveau retour client', 'Sélectionnez une ligne livrée et facturée.'],
    'cancel-order': ['Annuler la commande', "La réservation de stock sera libérée."],
    'cancel-delivery': ['Annuler la livraison', "Les quantités seront réintégrées au stock."],
    'cancel-return': ['Annuler le retour', "Le brouillon de retour sera abandonné."],
  };

  return (
    <ErpPageShell title="Commandes et livraisons" description="Réservation, préparation, livraison, facturation et retours clients" state={status} loadingLabel="Chargement des opérations commerciales…" errorLabel="Impossible de charger les commandes." onRetry={refresh}
      actions={<><Button title="Actualiser" ariaLabel="Actualiser les commandes" Icon={IconRefresh} variant="secondary" onClick={refresh} />{canManageSales && view === 'orders' ? <Button title="Nouvelle commande" ariaLabel="Créer une commande" Icon={IconPlus} variant="primary" onClick={openNewOrder} /> : canManageStock && view === 'returns' ? <Button title="Nouveau retour" ariaLabel="Créer un retour client" Icon={IconPlus} variant="primary" onClick={openReturn} /> : null}</>}>
      <StyledWorkspace>
        <StyledTabs role="tablist" aria-label="Opérations commerciales">
          {([['orders', 'Commandes'], ['deliveries', 'Livraisons'], ['returns', 'Retours']] as Array<[View, string]>).map(([key, label]) => <StyledTab key={key} type="button" role="tab" active={view === key} aria-selected={view === key} onClick={() => setView(key)}>{label}</StyledTab>)}
        </StyledTabs>
        {view === 'orders' ? <StyledSplit>
          <ErpOperationalTable ariaLabel="Commandes clients" columns={orderColumns} rows={orders} getRowKey={(row) => row.id} emptyLabel="Aucune commande client" />
          <StyledDetail>
            <StyledDetailHeader><StyledDetailTitle>{selectedOrder ? `${selectedOrder.number} · ${selectedOrder.customer.name}` : 'Aucune commande sélectionnée'}<span>{selectedOrder ? `${orderStatus[selectedOrder.status].label} · ${formatMadCents(selectedOrder.totalTtcCents)}` : 'Créez une commande depuis un devis accepté.'}</span></StyledDetailTitle>{orderActions}</StyledDetailHeader>
            <ErpOperationalTable ariaLabel="Lignes de la commande" columns={lineColumns} rows={selectedOrder?.lines ?? []} getRowKey={(row) => row.id} emptyLabel="Aucune ligne de commande" />
          </StyledDetail>
        </StyledSplit> : view === 'deliveries' ? <ErpOperationalTable ariaLabel="Bons de livraison" columns={deliveryColumns} rows={deliveries} getRowKey={(row) => row.id} emptyLabel="Aucune livraison" /> : <ErpOperationalTable ariaLabel="Retours clients" columns={returnColumns} rows={returns} getRowKey={(row) => row.id} emptyLabel="Aucun retour client" />}
      </StyledWorkspace>

      <ErpFormDrawer isOpen={drawer !== null} title={drawer ? drawerTitle[drawer][0] : 'Opération'} description={drawer ? drawerTitle[drawer][1] : ''} isBusy={busy} onClose={() => !busy && setDrawer(null)} footer={<><Button title="Fermer" ariaLabel="Fermer le formulaire" variant="secondary" onClick={() => setDrawer(null)} /><Button title="Enregistrer" ariaLabel="Enregistrer l'opération" Icon={IconCheck} variant="primary" disabled={busy} onClick={() => void submitDrawer()} /></>}>
        <StyledDrawerBody onSubmit={(event) => { event.preventDefault(); void submitDrawer(); }}>
          {drawer === 'new-order' ? <><StyledField>Devis accepté<StyledSelect required value={orderForm.quoteId} onChange={(event) => setOrderForm((current) => ({ ...current, quoteId: event.target.value }))}><option value="">Sélectionner</option>{availableQuotes.map((quote) => <option key={quote.id} value={quote.id}>{quote.number} · {quote.title} · {formatMadCents(quote.totalTtcCents)}</option>)}</StyledSelect></StyledField><StyledField>Date de commande<StyledInput required type="date" value={orderForm.issueDate} onChange={(event) => setOrderForm((current) => ({ ...current, issueDate: event.target.value }))} /></StyledField><StyledField>Livraison prévue<StyledInput type="date" value={orderForm.expectedDeliveryDate} onChange={(event) => setOrderForm((current) => ({ ...current, expectedDeliveryDate: event.target.value }))} /></StyledField><StyledField>Notes<StyledTextarea value={orderForm.notes} onChange={(event) => setOrderForm((current) => ({ ...current, notes: event.target.value }))} /></StyledField></>
          : drawer === 'prepare' || drawer === 'delivery' ? <><StyledField>Entrepôt<StyledSelect required value={operationForm.warehouseId} onChange={(event) => changeOperationWarehouse(event.target.value)}>{warehouses.map((warehouse) => <option key={warehouse.id} value={warehouse.id}>{warehouse.code} · {warehouse.name}</option>)}</StyledSelect></StyledField>{drawer === 'delivery' ? <StyledField>Date de livraison<StyledInput required type="date" value={operationForm.date} onChange={(event) => setOperationForm((current) => ({ ...current, date: event.target.value }))} /></StyledField> : null}<StyledLines>{selectedOrder?.lines.map((line) => <StyledLine key={line.id}><StyledLineName>{line.product ? `${line.product.code} · ${line.product.name}` : line.description}</StyledLineName><StyledInput aria-label={`Quantité ${line.description}`} inputMode="decimal" value={operationForm.values[line.id] ?? '0'} onChange={(event) => setOperationForm((current) => ({ ...current, values: { ...current.values, [line.id]: event.target.value } }))} /></StyledLine>)}</StyledLines>{drawer === 'delivery' ? <StyledField>Notes<StyledTextarea value={operationForm.notes} onChange={(event) => setOperationForm((current) => ({ ...current, notes: event.target.value }))} /></StyledField> : null}</>
          : drawer === 'return' ? <><StyledField>Ligne livrée et facturée<StyledSelect required value={returnForm.eligibleLineId} onChange={(event) => { const line = eligibleLines.find((item) => item.salesInvoiceAllocationId === event.target.value); setReturnForm((current) => ({ ...current, eligibleLineId: event.target.value, quantity: line ? String(line.quantityAvailable) : '' })); }}><option value="">Sélectionner</option>{eligibleLines.map((line) => <option key={line.salesInvoiceAllocationId} value={line.salesInvoiceAllocationId}>{line.deliveryNoteNumber} · {line.product.code} · disponible {quantity(line.quantityAvailable)}</option>)}</StyledSelect></StyledField><StyledField>Quantité retournée<StyledInput required inputMode="decimal" value={returnForm.quantity} onChange={(event) => setReturnForm((current) => ({ ...current, quantity: event.target.value }))} /></StyledField><StyledField>Date<StyledInput required type="date" value={returnForm.returnDate} onChange={(event) => setReturnForm((current) => ({ ...current, returnDate: event.target.value }))} /></StyledField><StyledField>Motif<StyledTextarea required value={returnForm.reason} onChange={(event) => setReturnForm((current) => ({ ...current, reason: event.target.value }))} /></StyledField><StyledField>Notes<StyledTextarea value={returnForm.notes} onChange={(event) => setReturnForm((current) => ({ ...current, notes: event.target.value }))} /></StyledField></>
          : drawer?.startsWith('cancel-') ? <StyledField>Motif obligatoire<StyledTextarea required value={cancelReason} onChange={(event) => setCancelReason(event.target.value)} /></StyledField> : null}
        </StyledDrawerBody>
      </ErpFormDrawer>

      <ErpConfirmDialog isOpen={returnAction !== null} title="Valider le retour client" message="La validation remettra les articles en stock et générera l’avoir correspondant." confirmLabel="Valider et créer l’avoir" isConfirming={busy} onCancel={() => setReturnAction(null)} onConfirm={() => { if (returnAction) void runMutation(`/customer-returns/${returnAction.item.id}/validate`, erpCustomerReturnSchema, {}, 'Retour validé et avoir créé', 'required'); }} />
    </ErpPageShell>
  );
};
