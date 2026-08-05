import { ErpConfirmDialog } from '@/erp-maroc/components/ErpConfirmDialog';
import {
  ErpOperationalTable,
  type ErpOperationalTableColumn,
} from '@/erp-maroc/components/ErpOperationalTable';
import { ErpPageShell } from '@/erp-maroc/components/ErpPageShell';
import {
  ErpStatusBadge,
  type ErpStatusTone,
} from '@/erp-maroc/components/ErpStatusBadge';
import { useErpMarocContext } from '@/erp-maroc/context/useErpMarocContext';
import { erpMarocPaths } from '@/erp-maroc/navigation/erpMarocPaths';
import { formatMadCents } from '@/erp-maroc/utils/money';
import { styled } from '@linaria/react';
import {
  type ChangeEvent,
  type FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { Link } from 'react-router-dom';
import {
  erpDocumentSchema,
  erpEmployeeListSchema,
  erpExpenseNoteListSchema,
  erpExpenseNoteSchema,
  type ErpEmployee,
  type ErpExpenseNote,
} from 'twenty-shared/erp-maroc';
import {
  IconCheck,
  IconCreditCard,
  IconFileText,
  IconPlus,
  IconRefresh,
  IconSend,
  IconTrash,
  IconX,
} from 'twenty-ui/display';
import { Button } from 'twenty-ui/input';
import { themeCssVariables } from 'twenty-ui/theme-constants';

type ExpenseStatus = ErpExpenseNote['status'];
type PaymentMethod = NonNullable<ErpExpenseNote['paymentMethod']>;
type DraftLine = {
  key: string;
  description: string;
  category: string;
  amountHt: string;
  tvaRate: string;
  receipt: File | null;
};

const statusAppearance: Record<
  ExpenseStatus,
  { label: string; tone: ErpStatusTone }
> = {
  DRAFT: { label: 'Brouillon', tone: 'neutral' },
  SUBMITTED: { label: 'À valider', tone: 'warning' },
  APPROVED: { label: 'À rembourser', tone: 'info' },
  REJECTED: { label: 'Rejetée', tone: 'danger' },
  PAID: { label: 'Remboursée', tone: 'success' },
  CANCELLED: { label: 'Annulée', tone: 'neutral' },
};

const paymentMethods: Array<{ value: PaymentMethod; label: string }> = [
  { value: 'BANK_TRANSFER', label: 'Virement bancaire' },
  { value: 'CHECK', label: 'Chèque' },
  { value: 'CARD', label: 'Carte' },
  { value: 'CASH', label: 'Espèces' },
  { value: 'DIRECT_DEBIT', label: 'Prélèvement' },
  { value: 'OTHER', label: 'Autre' },
];

const makeLine = (): DraftLine => ({
  key: crypto.randomUUID(),
  description: '',
  category: 'Déplacement',
  amountHt: '',
  tvaRate: '20',
  receipt: null,
});

const today = () => new Date().toISOString().slice(0, 10);

const readFileBase64 = async (file: File) => {
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunkSize = 0x8000;
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(
      ...bytes.subarray(offset, offset + chunkSize),
    );
  }
  return btoa(binary);
};

const controlCss = `
  background: ${themeCssVariables.background.primary};
  border: 1px solid ${themeCssVariables.border.color.medium};
  border-radius: ${themeCssVariables.border.radius.sm};
  box-sizing: border-box;
  color: ${themeCssVariables.font.color.primary};
  font: inherit;
  height: 32px;
  min-width: 0;
  padding: 0 ${themeCssVariables.spacing[2]};
`;

const StyledToolbar = styled.div`
  align-items: center;
  border-bottom: 1px solid ${themeCssVariables.border.color.light};
  display: flex;
  flex-wrap: wrap;
  gap: ${themeCssVariables.spacing[2]};
  justify-content: space-between;
  min-height: 44px;
  padding: ${themeCssVariables.spacing[2]} ${themeCssVariables.spacing[3]};
`;

const StyledToolbarGroup = styled.div`
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: ${themeCssVariables.spacing[2]};
`;

const StyledInput = styled.input`
  ${controlCss}
`;

const StyledSelect = styled.select`
  ${controlCss}
`;

const StyledTextarea = styled.textarea`
  ${controlCss}
  height: 72px;
  padding-block: ${themeCssVariables.spacing[2]};
  resize: vertical;
`;

const StyledNotice = styled.div<{ danger: boolean }>`
  background: ${({ danger }) =>
    danger
      ? themeCssVariables.tag.background.red
      : themeCssVariables.tag.background.green};
  border-bottom: 1px solid ${themeCssVariables.border.color.light};
  color: ${({ danger }) =>
    danger ? themeCssVariables.tag.text.red : themeCssVariables.tag.text.green};
  font-size: ${themeCssVariables.font.size.sm};
  padding: ${themeCssVariables.spacing[2]} ${themeCssVariables.spacing[3]};
`;

const StyledMetrics = styled.div`
  border-bottom: 1px solid ${themeCssVariables.border.color.light};
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));

  @media (max-width: 760px) {
    grid-template-columns: 1fr;
  }
`;

const StyledMetric = styled.div`
  border-right: 1px solid ${themeCssVariables.border.color.light};
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[1]};
  padding: ${themeCssVariables.spacing[2]} ${themeCssVariables.spacing[3]};

  &:last-child {
    border-right: 0;
  }

  span {
    color: ${themeCssVariables.font.color.secondary};
    font-size: ${themeCssVariables.font.size.sm};
  }

  strong {
    color: ${themeCssVariables.font.color.primary};
    font-size: ${themeCssVariables.font.size.lg};
    font-weight: ${themeCssVariables.font.weight.semiBold};
  }
`;

const StyledForm = styled.form`
  border-bottom: 1px solid ${themeCssVariables.border.color.medium};
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[3]};
  padding: ${themeCssVariables.spacing[3]};
`;

const StyledFormHeader = styled.div`
  align-items: center;
  display: flex;
  justify-content: space-between;
`;

const StyledFormTitle = styled.h2`
  color: ${themeCssVariables.font.color.primary};
  font-size: ${themeCssVariables.font.size.md};
  font-weight: ${themeCssVariables.font.weight.semiBold};
  letter-spacing: 0;
  margin: 0;
`;

const StyledFormGrid = styled.div`
  display: grid;
  gap: ${themeCssVariables.spacing[2]};
  grid-template-columns: minmax(180px, 1fr) minmax(180px, 1fr) 150px;

  @media (max-width: 760px) {
    grid-template-columns: 1fr;
  }
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
  display: flex;
  flex-direction: column;
`;

const StyledLine = styled.div`
  align-items: end;
  border-bottom: 1px solid ${themeCssVariables.border.color.light};
  display: grid;
  gap: ${themeCssVariables.spacing[2]};
  grid-template-columns: minmax(180px, 1.4fr) minmax(
      140px,
      1fr
    ) 120px 90px minmax(170px, 1fr) 32px;
  padding: ${themeCssVariables.spacing[2]};

  &:last-child {
    border-bottom: 0;
  }

  @media (max-width: 980px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
`;

const StyledFormActions = styled.div`
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: ${themeCssVariables.spacing[2]};
  justify-content: flex-end;
`;

const StyledPanel = styled.form`
  border-bottom: 1px solid ${themeCssVariables.border.color.medium};
  display: grid;
  gap: ${themeCssVariables.spacing[2]};
  grid-template-columns: repeat(3, minmax(160px, 1fr)) auto;
  padding: ${themeCssVariables.spacing[3]};

  @media (max-width: 860px) {
    grid-template-columns: 1fr;
  }
`;

const StyledActions = styled.div`
  align-items: center;
  display: flex;
  gap: ${themeCssVariables.spacing[1]};
`;

const StyledLink = styled(Link)`
  color: ${themeCssVariables.color.blue};
  text-decoration: none;

  &:hover {
    text-decoration: underline;
  }
`;

const employeeLabel = (employee: ErpEmployee | null | undefined) =>
  employee ? `${employee.firstName} ${employee.lastName}` : 'Non affectée';

export const ErpExpenseNotesPage = () => {
  const { client, context } = useErpMarocContext();
  const [notes, setNotes] = useState<ErpExpenseNote[]>([]);
  const [employees, setEmployees] = useState<ErpEmployee[]>([]);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [generation, setGeneration] = useState(0);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{
    text: string;
    danger: boolean;
  } | null>(null);
  const [statusFilter, setStatusFilter] = useState<ExpenseStatus | ''>('');
  const [showCreate, setShowCreate] = useState(false);
  const [title, setTitle] = useState('');
  const [expenseDate, setExpenseDate] = useState(today());
  const [employeeId, setEmployeeId] = useState('');
  const [lines, setLines] = useState<DraftLine[]>([makeLine()]);
  const [approvalNote, setApprovalNote] = useState<ErpExpenseNote | null>(null);
  const [rejectingNoteId, setRejectingNoteId] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [payingNoteId, setPayingNoteId] = useState('');
  const [paymentDate, setPaymentDate] = useState(today());
  const [paymentMethod, setPaymentMethod] =
    useState<PaymentMethod>('BANK_TRANSFER');
  const [paymentAccountCode, setPaymentAccountCode] = useState('5141');
  const [paymentReference, setPaymentReference] = useState('');

  const canApprove = ['OWNER', 'ADMIN', 'COMPTABLE'].includes(
    context?.role ?? '',
  );

  const notify = useCallback((text: string, danger = false) => {
    setMessage({ text, danger });
  }, []);

  const load = useCallback(() => {
    const abortController = new AbortController();
    setState('loading');
    void Promise.all([
      client.request({
        method: 'GET',
        path: '/operations/expense-notes',
        schema: erpExpenseNoteListSchema,
        signal: abortController.signal,
      }),
      client.request({
        method: 'GET',
        path: '/payroll/employees',
        schema: erpEmployeeListSchema,
        signal: abortController.signal,
      }),
    ])
      .then(([nextNotes, nextEmployees]) => {
        if (abortController.signal.aborted) return;
        setNotes(nextNotes);
        setEmployees(nextEmployees);
        setState('ready');
      })
      .catch(() => {
        if (!abortController.signal.aborted) setState('error');
      });
    return () => abortController.abort();
  }, [client]);

  useEffect(() => load(), [generation, load]);

  const filteredNotes = useMemo(
    () => notes.filter((note) => !statusFilter || note.status === statusFilter),
    [notes, statusFilter],
  );

  const metrics = useMemo(
    () => ({
      submitted: notes.filter(({ status }) => status === 'SUBMITTED').length,
      approved: notes.filter(({ status }) => status === 'APPROVED').length,
      outstandingCents: notes
        .filter(({ status }) => status === 'APPROVED')
        .reduce((sum, note) => sum + note.totalTtcCents, 0),
    }),
    [notes],
  );

  const resetCreate = () => {
    setTitle('');
    setExpenseDate(today());
    setEmployeeId('');
    setLines([makeLine()]);
    setShowCreate(false);
  };

  const updateLine = (key: string, patch: Partial<DraftLine>) => {
    setLines((current) =>
      current.map((line) => (line.key === key ? { ...line, ...patch } : line)),
    );
  };

  const uploadReceipt = async (line: DraftLine) => {
    if (!line.receipt) return null;
    const extension = line.receipt.name.split('.').pop()?.toLowerCase();
    if (
      line.receipt.size === 0 ||
      line.receipt.size > 20 * 1024 * 1024 ||
      (!['application/pdf', 'image/png', 'image/jpeg'].includes(
        line.receipt.type,
      ) &&
        !['pdf', 'png', 'jpg', 'jpeg'].includes(extension ?? ''))
    ) {
      throw new Error('invalid receipt');
    }
    const contentBase64 = await readFileBase64(line.receipt);
    return client
      .createMutationIntent(
        {
          method: 'POST',
          path: '/documents',
          body: {
            type: 'RECEIPT',
            filename: line.receipt.name,
            title: line.description.trim() || line.receipt.name,
            tags: ['note-de-frais'],
            contentBase64,
          },
          schema: erpDocumentSchema,
        },
        { idempotency: 'required' },
      )
      .execute();
  };

  const createNote = async (event: FormEvent) => {
    event.preventDefault();
    const parsedLines = lines.map((line) => ({
      ...line,
      amountHt: Number(line.amountHt.replace(',', '.')),
      tvaRate: Number(line.tvaRate),
    }));
    if (
      !title.trim() ||
      !/^\d{4}-\d{2}-\d{2}$/.test(expenseDate) ||
      parsedLines.some(
        (line) =>
          !line.description.trim() ||
          !line.category.trim() ||
          !Number.isFinite(line.amountHt) ||
          line.amountHt <= 0 ||
          ![0, 7, 10, 14, 20].includes(line.tvaRate),
      )
    ) {
      notify(
        'Complétez les lignes avec des montants et taux de TVA valides.',
        true,
      );
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      const receipts = await Promise.all(lines.map(uploadReceipt));
      const intent = client.createMutationIntent(
        {
          method: 'POST',
          path: '/operations/expense-notes',
          body: {
            title: title.trim(),
            expenseDate,
            employeeId: employeeId || null,
            lines: parsedLines.map((line, index) => ({
              description: line.description.trim(),
              category: line.category.trim(),
              amountHtCents: Math.round(line.amountHt * 100),
              tvaRate: line.tvaRate,
              documentId: receipts[index]?.id ?? null,
            })),
          },
          schema: erpExpenseNoteSchema,
        },
        { idempotency: 'required' },
      );
      await intent.execute();
      resetCreate();
      setGeneration((value) => value + 1);
      notify('Note de frais créée.');
    } catch {
      notify(
        'La création a échoué. Vérifiez les justificatifs et les données.',
        true,
      );
    } finally {
      setBusy(false);
    }
  };

  const mutateNote = async (
    method: 'POST' | 'PATCH',
    path: string,
    successMessage: string,
    body?: unknown,
  ) => {
    setBusy(true);
    setMessage(null);
    try {
      await client
        .createMutationIntent(
          { method, path, body, schema: erpExpenseNoteSchema },
          { idempotency: 'required' },
        )
        .execute();
      setGeneration((value) => value + 1);
      notify(successMessage);
      return true;
    } catch {
      notify(
        'Opération refusée. Vérifiez les droits, validations et périodes comptables.',
        true,
      );
      return false;
    } finally {
      setBusy(false);
    }
  };

  const submitNote = (id: string) =>
    mutateNote(
      'POST',
      `/operations/expense-notes/${id}/submit`,
      'Note soumise pour validation.',
    );

  const approveNote = async () => {
    if (!approvalNote) return;
    const succeeded = await mutateNote(
      'PATCH',
      `/operations/expense-notes/${approvalNote.id}/decision`,
      'Note validée et écriture comptable générée.',
      { status: 'APPROVED' },
    );
    if (succeeded) setApprovalNote(null);
  };

  const rejectNote = async (event: FormEvent) => {
    event.preventDefault();
    if (!rejectingNoteId || !rejectionReason.trim()) {
      notify('Le motif de rejet est obligatoire.', true);
      return;
    }
    const succeeded = await mutateNote(
      'PATCH',
      `/operations/expense-notes/${rejectingNoteId}/decision`,
      'Note rejetée.',
      { status: 'REJECTED', reason: rejectionReason.trim() },
    );
    if (succeeded) {
      setRejectingNoteId('');
      setRejectionReason('');
    }
  };

  const payNote = async (event: FormEvent) => {
    event.preventDefault();
    if (!payingNoteId) return;
    const succeeded = await mutateNote(
      'POST',
      `/operations/expense-notes/${payingNoteId}/pay`,
      'Remboursement comptabilisé.',
      {
        paymentDate,
        paymentMethod,
        paymentAccountCode,
        paymentReference: paymentReference.trim() || null,
      },
    );
    if (succeeded) {
      setPayingNoteId('');
      setPaymentReference('');
    }
  };

  const openPayment = (note: ErpExpenseNote) => {
    setPayingNoteId(note.id);
    setPaymentDate(today());
    setPaymentMethod('BANK_TRANSFER');
    setPaymentAccountCode('5141');
    setPaymentReference('');
  };

  const columns = useMemo<ErpOperationalTableColumn<ErpExpenseNote>[]>(
    () => [
      {
        key: 'number',
        header: 'Numéro',
        width: '130px',
        render: (note) => note.number,
      },
      {
        key: 'employee',
        header: 'Salarié',
        width: '180px',
        render: (note) => employeeLabel(note.employee),
      },
      {
        key: 'title',
        header: 'Objet',
        width: '220px',
        render: (note) => note.title,
      },
      {
        key: 'date',
        header: 'Date',
        width: '110px',
        render: (note) => note.expenseDate,
      },
      {
        key: 'status',
        header: 'Statut',
        width: '130px',
        render: (note) => (
          <ErpStatusBadge
            label={statusAppearance[note.status].label}
            tone={statusAppearance[note.status].tone}
          />
        ),
      },
      {
        key: 'receipts',
        header: 'Justificatifs',
        width: '110px',
        align: 'right',
        render: (note) =>
          String(
            note.lines?.filter(({ documentId }) => documentId).length ?? 0,
          ),
      },
      {
        key: 'total',
        header: 'Total TTC',
        width: '130px',
        align: 'right',
        render: (note) => formatMadCents(note.totalTtcCents),
      },
      {
        key: 'entry',
        header: 'Écriture',
        width: '100px',
        render: (note) => {
          const entryId =
            note.paymentAccountingEntryId ?? note.accountingEntryId;
          return entryId ? (
            <StyledLink
              to={erpMarocPaths.accountingEntryDetail.replace(':id', entryId)}
            >
              Ouvrir
            </StyledLink>
          ) : (
            '—'
          );
        },
      },
      {
        key: 'actions',
        header: 'Actions',
        width: '210px',
        render: (note) => (
          <StyledActions>
            {note.status === 'DRAFT' ? (
              <Button
                title="Soumettre"
                ariaLabel={`Soumettre ${note.number}`}
                Icon={IconSend}
                variant="secondary"
                size="small"
                disabled={busy}
                onClick={() => void submitNote(note.id)}
              />
            ) : null}
            {note.status === 'SUBMITTED' && canApprove ? (
              <>
                <Button
                  title="Valider"
                  ariaLabel={`Valider ${note.number}`}
                  Icon={IconCheck}
                  variant="secondary"
                  size="small"
                  disabled={busy}
                  onClick={() => setApprovalNote(note)}
                />
                <Button
                  title="Rejeter"
                  ariaLabel={`Rejeter ${note.number}`}
                  Icon={IconX}
                  variant="secondary"
                  size="small"
                  disabled={busy}
                  onClick={() => {
                    setRejectingNoteId(note.id);
                    setRejectionReason('');
                  }}
                />
              </>
            ) : null}
            {note.status === 'APPROVED' && canApprove ? (
              <Button
                title="Rembourser"
                ariaLabel={`Rembourser ${note.number}`}
                Icon={IconCreditCard}
                variant="secondary"
                size="small"
                disabled={busy}
                onClick={() => openPayment(note)}
              />
            ) : null}
          </StyledActions>
        ),
      },
    ],
    [busy, canApprove],
  );

  return (
    <ErpPageShell
      title="Notes de frais"
      description="Dépenses, validation humaine et remboursement"
      state={state}
      errorLabel="Impossible de charger les notes de frais."
      onRetry={() => setGeneration((value) => value + 1)}
      actions={
        <>
          <Button
            title="Actualiser"
            ariaLabel="Actualiser les notes de frais"
            Icon={IconRefresh}
            variant="secondary"
            disabled={busy}
            onClick={() => setGeneration((value) => value + 1)}
          />
          <Button
            title="Nouvelle note"
            ariaLabel="Créer une note de frais"
            Icon={IconPlus}
            variant="primary"
            disabled={busy}
            onClick={() => setShowCreate(true)}
          />
        </>
      }
    >
      {message ? (
        <StyledNotice danger={message.danger}>{message.text}</StyledNotice>
      ) : null}
      <StyledMetrics>
        <StyledMetric>
          <span>À valider</span>
          <strong>{metrics.submitted}</strong>
        </StyledMetric>
        <StyledMetric>
          <span>À rembourser</span>
          <strong>{metrics.approved}</strong>
        </StyledMetric>
        <StyledMetric>
          <span>Montant restant</span>
          <strong>{formatMadCents(metrics.outstandingCents)}</strong>
        </StyledMetric>
      </StyledMetrics>

      {showCreate ? (
        <StyledForm onSubmit={(event) => void createNote(event)}>
          <StyledFormHeader>
            <StyledFormTitle>Nouvelle note de frais</StyledFormTitle>
            <Button
              type="button"
              title="Fermer"
              ariaLabel="Fermer le formulaire"
              Icon={IconX}
              variant="secondary"
              disabled={busy}
              onClick={resetCreate}
            />
          </StyledFormHeader>
          <StyledFormGrid>
            <StyledField>
              Objet
              <StyledInput
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                maxLength={255}
                required
              />
            </StyledField>
            <StyledField>
              Salarié
              <StyledSelect
                value={employeeId}
                onChange={(event) => setEmployeeId(event.target.value)}
              >
                <option value="">Non affectée</option>
                {employees.map((employee) => (
                  <option key={employee.id} value={employee.id}>
                    {employeeLabel(employee)}
                  </option>
                ))}
              </StyledSelect>
            </StyledField>
            <StyledField>
              Date
              <StyledInput
                type="date"
                value={expenseDate}
                max={today()}
                onChange={(event) => setExpenseDate(event.target.value)}
                required
              />
            </StyledField>
          </StyledFormGrid>
          <StyledLines>
            {lines.map((line) => (
              <StyledLine key={line.key}>
                <StyledField>
                  Description
                  <StyledInput
                    value={line.description}
                    onChange={(event) =>
                      updateLine(line.key, { description: event.target.value })
                    }
                    maxLength={255}
                    required
                  />
                </StyledField>
                <StyledField>
                  Catégorie
                  <StyledInput
                    value={line.category}
                    onChange={(event) =>
                      updateLine(line.key, { category: event.target.value })
                    }
                    maxLength={100}
                    required
                  />
                </StyledField>
                <StyledField>
                  Montant HT
                  <StyledInput
                    inputMode="decimal"
                    value={line.amountHt}
                    onChange={(event) =>
                      updateLine(line.key, { amountHt: event.target.value })
                    }
                    required
                  />
                </StyledField>
                <StyledField>
                  TVA
                  <StyledSelect
                    value={line.tvaRate}
                    onChange={(event) =>
                      updateLine(line.key, { tvaRate: event.target.value })
                    }
                  >
                    {[0, 7, 10, 14, 20].map((rate) => (
                      <option key={rate} value={rate}>
                        {rate}%
                      </option>
                    ))}
                  </StyledSelect>
                </StyledField>
                <StyledField>
                  Justificatif PDF/JPG/PNG
                  <StyledInput
                    type="file"
                    accept="application/pdf,image/png,image/jpeg"
                    onChange={(event: ChangeEvent<HTMLInputElement>) =>
                      updateLine(line.key, {
                        receipt: event.target.files?.[0] ?? null,
                      })
                    }
                  />
                </StyledField>
                <Button
                  type="button"
                  title="Supprimer la ligne"
                  ariaLabel="Supprimer la ligne"
                  Icon={IconTrash}
                  variant="secondary"
                  disabled={busy || lines.length === 1}
                  onClick={() =>
                    setLines((current) =>
                      current.filter(({ key }) => key !== line.key),
                    )
                  }
                />
              </StyledLine>
            ))}
          </StyledLines>
          <StyledFormActions>
            <Button
              type="button"
              title="Ajouter une ligne"
              ariaLabel="Ajouter une ligne"
              Icon={IconPlus}
              variant="secondary"
              disabled={busy}
              onClick={() => setLines((current) => [...current, makeLine()])}
            />
            <Button
              type="submit"
              title="Créer la note"
              ariaLabel="Créer la note de frais"
              Icon={IconFileText}
              variant="primary"
              disabled={busy}
            />
          </StyledFormActions>
        </StyledForm>
      ) : null}

      {rejectingNoteId ? (
        <StyledPanel onSubmit={(event) => void rejectNote(event)}>
          <StyledField>
            Motif de rejet
            <StyledTextarea
              value={rejectionReason}
              onChange={(event) => setRejectionReason(event.target.value)}
              maxLength={1000}
              required
            />
          </StyledField>
          <span />
          <span />
          <StyledActions>
            <Button
              type="button"
              title="Annuler"
              ariaLabel="Annuler le rejet"
              Icon={IconX}
              variant="secondary"
              disabled={busy}
              onClick={() => setRejectingNoteId('')}
            />
            <Button
              type="submit"
              title="Confirmer le rejet"
              ariaLabel="Confirmer le rejet"
              Icon={IconCheck}
              variant="primary"
              disabled={busy}
            />
          </StyledActions>
        </StyledPanel>
      ) : null}

      {payingNoteId ? (
        <StyledPanel onSubmit={(event) => void payNote(event)}>
          <StyledField>
            Date de paiement
            <StyledInput
              type="date"
              value={paymentDate}
              max={today()}
              onChange={(event) => setPaymentDate(event.target.value)}
              required
            />
          </StyledField>
          <StyledField>
            Mode
            <StyledSelect
              value={paymentMethod}
              onChange={(event) => {
                const method = event.target.value as PaymentMethod;
                setPaymentMethod(method);
                setPaymentAccountCode(method === 'CASH' ? '5161' : '5141');
              }}
            >
              {paymentMethods.map((method) => (
                <option key={method.value} value={method.value}>
                  {method.label}
                </option>
              ))}
            </StyledSelect>
          </StyledField>
          <StyledField>
            Compte de trésorerie
            <StyledInput
              value={paymentAccountCode}
              onChange={(event) => setPaymentAccountCode(event.target.value)}
              maxLength={30}
              required
            />
          </StyledField>
          <StyledField>
            Référence
            <StyledInput
              value={paymentReference}
              onChange={(event) => setPaymentReference(event.target.value)}
              maxLength={160}
            />
          </StyledField>
          <StyledActions>
            <Button
              type="button"
              title="Annuler"
              ariaLabel="Annuler le remboursement"
              Icon={IconX}
              variant="secondary"
              disabled={busy}
              onClick={() => setPayingNoteId('')}
            />
            <Button
              type="submit"
              title="Comptabiliser"
              ariaLabel="Comptabiliser le remboursement"
              Icon={IconCreditCard}
              variant="primary"
              disabled={busy}
            />
          </StyledActions>
        </StyledPanel>
      ) : null}

      <StyledToolbar>
        <StyledToolbarGroup>
          <StyledSelect
            aria-label="Filtrer par statut"
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(event.target.value as ExpenseStatus | '')
            }
          >
            <option value="">Tous les statuts</option>
            {Object.entries(statusAppearance).map(([status, appearance]) => (
              <option key={status} value={status}>
                {appearance.label}
              </option>
            ))}
          </StyledSelect>
        </StyledToolbarGroup>
        <span>{filteredNotes.length} note(s)</span>
      </StyledToolbar>
      <ErpOperationalTable
        ariaLabel="Notes de frais"
        columns={columns}
        rows={filteredNotes}
        getRowKey={(note) => note.id}
        state={state}
        loadingLabel="Chargement des notes de frais…"
        emptyLabel="Aucune note de frais"
        errorLabel="Impossible de charger les notes de frais."
        onRetry={() => setGeneration((value) => value + 1)}
      />
      <ErpConfirmDialog
        isOpen={approvalNote !== null}
        title="Valider la note de frais"
        message={
          approvalNote
            ? `Valider ${approvalNote.number} pour ${formatMadCents(approvalNote.totalTtcCents)} et générer son écriture comptable ?`
            : ''
        }
        confirmLabel="Valider et comptabiliser"
        isConfirming={busy}
        onCancel={() => setApprovalNote(null)}
        onConfirm={() => void approveNote()}
      />
    </ErpPageShell>
  );
};
