import { ErpMarocError } from '@/erp-maroc/api/erpMarocError';
import {
  ErpOperationalTable,
  type ErpOperationalTableColumn,
  type ErpOperationalTableState,
} from '@/erp-maroc/components/ErpOperationalTable';
import { ErpStatusBadge } from '@/erp-maroc/components/ErpStatusBadge';
import { useErpMarocContext } from '@/erp-maroc/context/useErpMarocContext';
import { formatPurchaseOrderDate } from '@/erp-maroc/purchase-orders/purchaseOrderUi';
import { formatMadCents } from '@/erp-maroc/utils/money';
import { TextArea } from '@/ui/input/components/TextArea';
import { TextInput } from '@/ui/input/components/TextInput';
import { styled } from '@linaria/react';
import { useEffect, useMemo, useState } from 'react';
import {
  erpSupplierInvoiceListSchema,
  erpSupplierInvoiceSchema,
  type ErpPurchaseOrder,
  type ErpSupplierInvoice,
} from 'twenty-shared/erp-maroc';
import { Button } from 'twenty-ui/input';
import { themeCssVariables } from 'twenty-ui/theme-constants';

const StyledSectionTitle = styled.h2`
  border-top: 1px solid ${themeCssVariables.border.color.light};
  color: ${themeCssVariables.font.color.primary};
  font-size: ${themeCssVariables.font.size.md};
  font-weight: ${themeCssVariables.font.weight.semiBold};
  letter-spacing: 0;
  margin: 0;
  padding: ${themeCssVariables.spacing[3]} ${themeCssVariables.spacing[4]};
`;

const StyledForm = styled.form`
  background: ${themeCssVariables.background.secondary};
  border-top: 1px solid ${themeCssVariables.border.color.light};
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[3]};
  padding: ${themeCssVariables.spacing[4]};
`;

const StyledFormHeader = styled.div`
  align-items: center;
  display: flex;
  gap: ${themeCssVariables.spacing[2]};
  justify-content: space-between;

  strong {
    color: ${themeCssVariables.font.color.primary};
    font-size: ${themeCssVariables.font.size.md};
  }
`;

const StyledFields = styled.div`
  display: grid;
  gap: ${themeCssVariables.spacing[3]};
  grid-template-columns: repeat(3, minmax(0, 1fr));

  @media (max-width: 768px) {
    grid-template-columns: minmax(0, 1fr);
  }
`;

const StyledNotes = styled.div`
  grid-column: 1 / -1;
`;

const StyledLines = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[2]};
`;

const StyledLine = styled.div`
  align-items: end;
  display: grid;
  gap: ${themeCssVariables.spacing[3]};
  grid-template-columns: minmax(180px, 1fr) 130px 150px 110px;

  @media (max-width: 768px) {
    align-items: stretch;
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
`;

const StyledLineLabel = styled.div`
  color: ${themeCssVariables.font.color.primary};
  min-width: 0;

  span {
    color: ${themeCssVariables.font.color.tertiary};
    display: block;
    font-size: ${themeCssVariables.font.size.sm};
    margin-top: ${themeCssVariables.spacing[1]};
  }

  @media (max-width: 768px) {
    grid-column: 1 / -1;
  }
`;

const StyledSelectField = styled.div`
  min-width: 0;
`;

const StyledSelectLabel = styled.label`
  color: ${themeCssVariables.font.color.secondary};
  display: block;
  font-size: ${themeCssVariables.font.size.sm};
  margin-bottom: ${themeCssVariables.spacing[1]};
`;

const StyledSelect = styled.select`
  background: ${themeCssVariables.background.primary};
  border: 1px solid ${themeCssVariables.border.color.medium};
  box-sizing: border-box;
  color: ${themeCssVariables.font.color.primary};
  min-height: 32px;
  padding: 0 ${themeCssVariables.spacing[2]};
  width: 100%;
`;

const StyledFormFooter = styled.div`
  align-items: center;
  display: flex;
  gap: ${themeCssVariables.spacing[2]};
  justify-content: flex-end;
`;

const StyledAlert = styled.div`
  color: ${themeCssVariables.font.color.danger};
  font-size: ${themeCssVariables.font.size.sm};
`;

const StyledHistory = styled.div`
  height: 260px;
  min-height: 180px;
`;

const getCasablancaDate = (offsetDays = 0) => {
  const value = new Date();
  value.setUTCDate(value.getUTCDate() + offsetDays);
  return value.toLocaleDateString('en-CA', {
    timeZone: 'Africa/Casablanca',
  });
};

const matchAppearance = {
  MATCHED: { label: 'Conforme', tone: 'success' },
  DISCREPANCY: { label: 'Écart', tone: 'warning' },
  BLOCKED: { label: 'Bloquée', tone: 'danger' },
} as const;

const tvaRates = [0, 7, 10, 14, 20] as const;

export const ErpSupplierInvoicePanel = ({
  order,
  isOpen,
  disabled,
  onClose,
  onSaved,
}: {
  order: ErpPurchaseOrder;
  isOpen: boolean;
  disabled: boolean;
  onClose: () => void;
  onSaved: () => void;
}) => {
  const { client } = useErpMarocContext();
  const [invoices, setInvoices] = useState<ErpSupplierInvoice[]>([]);
  const [historyState, setHistoryState] =
    useState<ErpOperationalTableState>('loading');
  const [historyGeneration, setHistoryGeneration] = useState(0);
  const [externalReference, setExternalReference] = useState('');
  const [issueDate, setIssueDate] = useState(() => getCasablancaDate());
  const [dueDate, setDueDate] = useState(() => getCasablancaDate(30));
  const [notes, setNotes] = useState('');
  const [quantities, setQuantities] = useState<Record<string, string>>({});
  const [unitPrices, setUnitPrices] = useState<Record<string, string>>({});
  const [tvaByLine, setTvaByLine] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setExternalReference('');
    setIssueDate(getCasablancaDate());
    setDueDate(getCasablancaDate(30));
    setNotes('');
    setError(null);
    setQuantities({});
    setUnitPrices(
      Object.fromEntries(
        order.lines.map((line) => [
          line.id,
          String(line.unitPriceHtCents / 100),
        ]),
      ),
    );
    setTvaByLine(
      Object.fromEntries(
        order.lines.map((line) => [line.id, String(line.tvaRate)]),
      ),
    );
  }, [isOpen, order.lines]);

  useEffect(() => {
    const abortController = new AbortController();
    setHistoryState('loading');
    client
      .request({
        method: 'GET',
        path: `/purchase-orders/${order.id}/supplier-invoices`,
        schema: erpSupplierInvoiceListSchema,
        signal: abortController.signal,
      })
      .then((result) => {
        if (abortController.signal.aborted) return;
        setInvoices(result);
        setHistoryState(result.length === 0 ? 'empty' : 'ready');
      })
      .catch(() => {
        if (!abortController.signal.aborted) setHistoryState('error');
      });

    return () => abortController.abort();
  }, [client, historyGeneration, order.id]);

  const previouslyInvoicedByLineId = useMemo(() => {
    const result = new Map<string, number>();
    for (const invoice of invoices) {
      if (invoice.status === 'CANCELLED') continue;
      for (const line of invoice.lines) {
        result.set(
          line.purchaseOrderLineId,
          (result.get(line.purchaseOrderLineId) ?? 0) + line.quantity,
        );
      }
    }
    return result;
  }, [invoices]);

  const historyColumns = useMemo<
    ErpOperationalTableColumn<ErpSupplierInvoice>[]
  >(
    () => [
      {
        key: 'reference',
        header: 'Référence fournisseur',
        width: '210px',
        render: (invoice) => invoice.externalReference,
      },
      {
        key: 'date',
        header: 'Date',
        width: '120px',
        render: (invoice) => formatPurchaseOrderDate(invoice.issueDate),
      },
      {
        key: 'match',
        header: 'Rapprochement',
        width: '150px',
        render: (invoice) => {
          const appearance = matchAppearance[invoice.matchStatus];
          return (
            <ErpStatusBadge label={appearance.label} tone={appearance.tone} />
          );
        },
      },
      {
        key: 'total',
        header: 'Total TTC',
        width: '140px',
        align: 'right',
        render: (invoice) => formatMadCents(invoice.totalTtcCents),
      },
      {
        key: 'details',
        header: 'Détails du contrôle',
        width: '380px',
        render: (invoice) =>
          invoice.lines
            .filter((line) => line.matchStatus !== 'MATCHED')
            .map((line) => {
              const differences = [
                line.quantityVariance > 0
                  ? `quantité +${line.quantityVariance}`
                  : null,
                line.unitPriceVarianceCents !== 0
                  ? `prix ${formatMadCents(line.unitPriceVarianceCents)}`
                  : null,
                line.tvaRateVariance !== 0
                  ? `TVA ${line.tvaRateVariance > 0 ? '+' : ''}${line.tvaRateVariance} pt`
                  : null,
              ].filter(Boolean);
              return `${line.purchaseOrderLine.description}: ${differences.join(', ')}`;
            })
            .join(' · ') || 'Aucun écart',
      },
    ],
    [],
  );

  const submitInvoice = async () => {
    if (disabled || isSaving) return;
    setError(null);
    if (!externalReference.trim()) {
      setError('La référence de la facture fournisseur est obligatoire.');
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(issueDate) || dueDate < issueDate) {
      setError("Les dates de facture et d'échéance sont invalides.");
      return;
    }

    const lines = order.lines.flatMap((line) => {
      const quantity = Number(quantities[line.id]);
      const unitPriceHt = Number(unitPrices[line.id]);
      const tvaRate = Number(tvaByLine[line.id]);
      if (!Number.isFinite(quantity) || quantity <= 0) return [];
      return [
        {
          purchaseOrderLineId: line.id,
          quantity,
          unitPriceHt,
          tvaRate,
        },
      ];
    });
    if (lines.length === 0) {
      setError('Renseignez au moins une quantité facturée positive.');
      return;
    }
    if (
      lines.some(
        (line) =>
          !Number.isFinite(line.unitPriceHt) ||
          line.unitPriceHt < 0 ||
          !tvaRates.includes(line.tvaRate as (typeof tvaRates)[number]),
      )
    ) {
      setError('Un prix ou un taux de TVA est invalide.');
      return;
    }

    setIsSaving(true);
    try {
      const intent = client.createMutationIntent(
        {
          method: 'POST',
          path: `/purchase-orders/${order.id}/supplier-invoices`,
          schema: erpSupplierInvoiceSchema,
          body: {
            externalReference: externalReference.trim(),
            currency: 'MAD',
            issueDate,
            dueDate,
            notes: notes.trim() || null,
            lines,
          },
        },
        { idempotency: 'forbidden' },
      );
      await intent.execute();
      setHistoryGeneration((value) => value + 1);
      onClose();
      onSaved();
    } catch (caught) {
      setError(
        caught instanceof ErpMarocError && caught.statusCode === 409
          ? 'Cette référence fournisseur existe déjà ou le bon a changé.'
          : "La facture fournisseur n'a pas pu être enregistrée.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      {isOpen ? (
        <StyledForm
          onSubmit={(event) => {
            event.preventDefault();
            void submitInvoice();
          }}
        >
          <StyledFormHeader>
            <strong>Nouvelle facture fournisseur</strong>
            <Button
              type="button"
              title="Fermer"
              ariaLabel="Fermer la facture fournisseur"
              variant="secondary"
              disabled={isSaving}
              onClick={onClose}
            />
          </StyledFormHeader>
          {error === null ? null : (
            <StyledAlert role="alert">{error}</StyledAlert>
          )}
          <StyledFields>
            <TextInput
              label="Référence fournisseur"
              value={externalReference}
              disabled={isSaving}
              fullWidth
              onChange={setExternalReference}
            />
            <TextInput
              label="Date de facture"
              type="date"
              min={order.issueDate}
              value={issueDate}
              disabled={isSaving}
              fullWidth
              onChange={setIssueDate}
            />
            <TextInput
              label="Date d'échéance"
              type="date"
              min={issueDate}
              value={dueDate}
              disabled={isSaving}
              fullWidth
              onChange={setDueDate}
            />
            <StyledNotes>
              <TextArea
                textAreaId="supplier-invoice-notes"
                label="Notes"
                value={notes}
                disabled={isSaving}
                minRows={2}
                onChange={setNotes}
              />
            </StyledNotes>
          </StyledFields>
          <StyledLines>
            {order.lines.map((line) => {
              const alreadyInvoiced =
                previouslyInvoicedByLineId.get(line.id) ?? 0;
              const available = Math.max(
                0,
                line.quantityReceived - alreadyInvoiced,
              );
              return (
                <StyledLine key={line.id}>
                  <StyledLineLabel>
                    {line.description}
                    <span>
                      Reçue {line.quantityReceived}; déjà facturée{' '}
                      {alreadyInvoiced}; disponible {available}{' '}
                      {line.unit ?? ''}
                    </span>
                  </StyledLineLabel>
                  <TextInput
                    label="Quantité facturée"
                    type="number"
                    min="0"
                    step="any"
                    value={quantities[line.id] ?? ''}
                    disabled={isSaving}
                    fullWidth
                    onChange={(value) =>
                      setQuantities((current) => ({
                        ...current,
                        [line.id]: value,
                      }))
                    }
                  />
                  <TextInput
                    label="Prix unitaire HT"
                    type="number"
                    min="0"
                    step="0.01"
                    value={unitPrices[line.id] ?? ''}
                    disabled={isSaving}
                    fullWidth
                    onChange={(value) =>
                      setUnitPrices((current) => ({
                        ...current,
                        [line.id]: value,
                      }))
                    }
                  />
                  <StyledSelectField>
                    <StyledSelectLabel htmlFor={`supplier-tva-${line.id}`}>
                      TVA
                    </StyledSelectLabel>
                    <StyledSelect
                      id={`supplier-tva-${line.id}`}
                      value={tvaByLine[line.id] ?? String(line.tvaRate)}
                      disabled={isSaving}
                      onChange={(event) =>
                        setTvaByLine((current) => ({
                          ...current,
                          [line.id]: event.target.value,
                        }))
                      }
                    >
                      {tvaRates.map((rate) => (
                        <option key={rate} value={rate}>
                          {rate} %
                        </option>
                      ))}
                    </StyledSelect>
                  </StyledSelectField>
                </StyledLine>
              );
            })}
          </StyledLines>
          <StyledFormFooter>
            <Button
              type="submit"
              title="Contrôler et enregistrer"
              ariaLabel="Contrôler et enregistrer la facture fournisseur"
              variant="primary"
              accent="blue"
              disabled={disabled || isSaving}
              isLoading={isSaving}
            />
          </StyledFormFooter>
        </StyledForm>
      ) : null}
      <StyledSectionTitle>
        Factures fournisseur et rapprochement
      </StyledSectionTitle>
      <StyledHistory>
        <ErpOperationalTable
          ariaLabel="Factures fournisseur"
          columns={historyColumns}
          rows={invoices}
          getRowKey={(invoice) => invoice.id}
          state={historyState}
          loadingLabel="Chargement des factures fournisseur"
          emptyLabel="Aucune facture fournisseur enregistrée"
          errorLabel="Impossible de charger les factures fournisseur"
          retryLabel="Réessayer"
          onRetry={() => setHistoryGeneration((value) => value + 1)}
        />
      </StyledHistory>
    </>
  );
};
