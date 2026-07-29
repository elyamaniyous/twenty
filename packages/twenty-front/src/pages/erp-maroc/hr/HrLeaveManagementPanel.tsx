import {
  ErpOperationalTable,
  type ErpOperationalTableColumn,
} from '@/erp-maroc/components/ErpOperationalTable';
import { ErpStatusBadge } from '@/erp-maroc/components/ErpStatusBadge';
import { useErpMarocContext } from '@/erp-maroc/context/useErpMarocContext';
import { styled } from '@linaria/react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  hrEmployeeDocumentSchema,
  hrLeaveAccrualRunResultSchema,
  hrLeaveBalanceSchema,
  hrLeaveBalanceListSchema,
  hrLeavePolicyListSchema,
  hrLeavePolicySeedResultSchema,
  hrLeaveRequestListSchema,
  hrLeaveRequestSchema,
  type HrEmployeeListItem,
  type HrLeaveBalance,
  type HrLeavePolicy,
  type HrLeaveRequest,
  type HrLeaveRequestStatus,
} from 'twenty-shared/erp-maroc';
import { IconPlus, IconRefresh } from 'twenty-ui/display';
import { Button } from 'twenty-ui/input';
import { themeCssVariables } from 'twenty-ui/theme-constants';

type Props = {
  employees: HrEmployeeListItem[];
  canWrite: boolean;
  canWriteDocuments: boolean;
  query: string;
};

type LoadState = 'loading' | 'ready' | 'error';

const casablancaToday = () =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Casablanca',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());

const currentYear = () => casablancaToday().slice(0, 4);

const StyledCommands = styled.section`
  border-bottom: 1px solid ${themeCssVariables.border.color.light};
  display: grid;
  grid-template-columns: minmax(520px, 1.5fr) minmax(380px, 1fr) minmax(
      420px,
      1.2fr
    );
  overflow-x: auto;
`;

const StyledCommand = styled.form`
  border-right: 1px solid ${themeCssVariables.border.color.light};
  display: grid;
  gap: ${themeCssVariables.spacing[2]};
  min-width: 380px;
  padding: ${themeCssVariables.spacing[3]};
`;

const StyledCommandTitle = styled.strong`
  color: ${themeCssVariables.font.color.primary};
  font-size: ${themeCssVariables.font.size.sm};
`;

const StyledFields = styled.div`
  align-items: end;
  display: grid;
  gap: ${themeCssVariables.spacing[2]};
  grid-template-columns: repeat(3, minmax(110px, 1fr));
`;

const StyledField = styled.label`
  color: ${themeCssVariables.font.color.secondary};
  display: grid;
  font-size: ${themeCssVariables.font.size.xs};
  gap: ${themeCssVariables.spacing[1]};
`;

const fieldStyles = `
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

const StyledInput = styled.input`
  ${fieldStyles}
`;

const StyledSelect = styled.select`
  ${fieldStyles}
`;

const StyledFeedback = styled.div<{ danger: boolean }>`
  border-bottom: 1px solid ${themeCssVariables.border.color.light};
  color: ${({ danger }) =>
    danger
      ? themeCssVariables.color.red
      : themeCssVariables.font.color.secondary};
  font-size: ${themeCssVariables.font.size.sm};
  padding: ${themeCssVariables.spacing[2]} ${themeCssVariables.spacing[3]};
`;

const StyledSectionHeader = styled.div`
  align-items: center;
  border-bottom: 1px solid ${themeCssVariables.border.color.light};
  display: flex;
  gap: ${themeCssVariables.spacing[2]};
  justify-content: space-between;
  min-height: 42px;
  padding: 0 ${themeCssVariables.spacing[3]};
`;

const StyledSectionTitle = styled.strong`
  color: ${themeCssVariables.font.color.primary};
  font-size: ${themeCssVariables.font.size.sm};
`;

const StyledSectionMeta = styled.span`
  color: ${themeCssVariables.font.color.tertiary};
  font-size: ${themeCssVariables.font.size.sm};
`;

const StyledPrimary = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
`;

const StyledMuted = styled.span`
  color: ${themeCssVariables.font.color.tertiary};
  font-size: ${themeCssVariables.font.size.sm};
`;

const StyledActions = styled.div`
  display: flex;
  gap: ${themeCssVariables.spacing[1]};
  justify-content: flex-end;
`;

const StyledAction = styled.button<{ danger?: boolean }>`
  background: transparent;
  border: 1px solid ${themeCssVariables.border.color.medium};
  border-radius: ${themeCssVariables.border.radius.sm};
  color: ${({ danger }) =>
    danger
      ? themeCssVariables.color.red
      : themeCssVariables.font.color.secondary};
  cursor: pointer;
  font: inherit;
  font-size: ${themeCssVariables.font.size.xs};
  height: 28px;
  padding: 0 ${themeCssVariables.spacing[2]};

  &:disabled {
    cursor: default;
    opacity: 0.5;
  }
`;

const policyLabels: Record<string, string> = {
  ANNUAL: 'Congé annuel',
  SICK: 'Maladie',
  MATERNITY: 'Maternité',
  PATERNITY: 'Naissance',
  BIRTH: 'Naissance',
  MARRIAGE: 'Mariage',
  BEREAVEMENT: 'Décès',
  UNPAID: 'Sans solde',
  OTHER: 'Autre',
};

const statusLabels: Record<HrLeaveRequestStatus, string> = {
  REQUESTED: 'À valider manager',
  MANAGER_APPROVED: 'À valider RH',
  APPROVED: 'Approuvé',
  REJECTED: 'Refusé',
  CANCELLED: 'Annulé',
};

const statusTone = (
  status: HrLeaveRequestStatus,
): 'success' | 'warning' | 'danger' | 'neutral' =>
  status === 'APPROVED'
    ? 'success'
    : status === 'REQUESTED' || status === 'MANAGER_APPROVED'
      ? 'warning'
      : status === 'REJECTED'
        ? 'danger'
        : 'neutral';

export const HrLeaveManagementPanel = ({
  employees,
  canWrite,
  canWriteDocuments,
  query,
}: Props) => {
  const { client } = useErpMarocContext();
  const [year, setYear] = useState(currentYear);
  const [state, setState] = useState<LoadState>('loading');
  const [policies, setPolicies] = useState<HrLeavePolicy[]>([]);
  const [requests, setRequests] = useState<HrLeaveRequest[]>([]);
  const [balances, setBalances] = useState<HrLeaveBalance[]>([]);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<{
    message: string;
    danger: boolean;
  } | null>(null);
  const [requestForm, setRequestForm] = useState({
    employeeId: '',
    delegateEmployeeId: '',
    policyId: '',
    startDate: casablancaToday(),
    endDate: casablancaToday(),
    reason: '',
  });
  const [reviewForm, setReviewForm] = useState({
    requestId: '',
    action: 'APPROVE',
    reason: '',
  });
  const [documentForm, setDocumentForm] = useState({
    requestId: '',
    file: null as File | null,
  });
  const [adjustmentForm, setAdjustmentForm] = useState({
    employeeId: '',
    type: 'ADJUSTMENT',
    days: '',
    reason: '',
  });

  const load = useCallback(async () => {
    setState('loading');
    try {
      const [nextPolicies, nextRequests, nextBalances] = await Promise.all([
        client.request({
          method: 'GET',
          path: '/hr-leave/policies',
          schema: hrLeavePolicyListSchema,
        }),
        client.request({
          method: 'GET',
          path: '/hr-leave/requests',
          query: { year },
          schema: hrLeaveRequestListSchema,
        }),
        client.request({
          method: 'GET',
          path: '/hr-leave/balances',
          query: { year },
          schema: hrLeaveBalanceListSchema,
        }),
      ]);
      setPolicies(nextPolicies);
      setRequests(nextRequests);
      setBalances(nextBalances);
      const pending = nextRequests.find(
        ({ status }) => status === 'REQUESTED' || status === 'MANAGER_APPROVED',
      );
      setRequestForm((current) => ({
        ...current,
        employeeId: current.employeeId || employees[0]?.id || '',
        policyId:
          current.policyId ||
          nextPolicies.find(({ isActive }) => isActive)?.id ||
          '',
        delegateEmployeeId:
          current.delegateEmployeeId === current.employeeId
            ? ''
            : current.delegateEmployeeId,
      }));
      setReviewForm((current) => ({
        ...current,
        requestId: current.requestId || pending?.id || '',
      }));
      setDocumentForm((current) => ({
        ...current,
        requestId: current.requestId || pending?.id || '',
      }));
      setAdjustmentForm((current) => ({
        ...current,
        employeeId: current.employeeId || employees[0]?.id || '',
      }));
      setState('ready');
    } catch {
      setState('error');
    }
  }, [client, employees, year]);

  useEffect(() => {
    void load();
  }, [load]);

  const execute = async (
    request: Parameters<typeof client.createMutationIntent>[0],
    success: string,
  ) => {
    setBusy(true);
    setFeedback(null);
    try {
      await client
        .createMutationIntent(request, { idempotency: 'required' })
        .execute();
      setFeedback({ message: success, danger: false });
      await load();
    } catch {
      setFeedback({
        message:
          "L'opération n'a pas abouti. Vérifiez le solde, les dates et les autorisations.",
        danger: true,
      });
    } finally {
      setBusy(false);
    }
  };

  const createRequest = async () => {
    if (!requestForm.employeeId || !requestForm.policyId) return;
    await execute(
      {
        method: 'POST',
        path: '/hr-leave/requests',
        schema: hrLeaveRequestSchema,
        body: {
          employeeId: requestForm.employeeId,
          delegateEmployeeId: requestForm.delegateEmployeeId || null,
          policyId: requestForm.policyId,
          startDate: requestForm.startDate,
          endDate: requestForm.endDate,
          reason: requestForm.reason || null,
        },
      },
      'Demande de congé enregistrée.',
    );
  };

  const seedPolicies = async () => {
    await execute(
      {
        method: 'POST',
        path: '/hr-leave/policies/seed-morocco',
        schema: hrLeavePolicySeedResultSchema,
        body: {},
      },
      'Politiques Maroc initialisées sans doublon.',
    );
  };

  const runAccruals = async () => {
    const today = casablancaToday();
    const asOfDate = today.startsWith(year) ? today : `${year}-12-31`;
    await execute(
      {
        method: 'POST',
        path: '/hr-leave/accruals/run',
        schema: hrLeaveAccrualRunResultSchema,
        body: { year: Number(year), asOfDate },
      },
      'Acquisitions et ancienneté recalculées de manière idempotente.',
    );
  };

  const submitReview = async () => {
    if (!reviewForm.requestId) return;
    if (reviewForm.action === 'CANCEL') {
      if (!reviewForm.reason.trim()) {
        setFeedback({
          message: "Le motif d'annulation est obligatoire.",
          danger: true,
        });
        return;
      }
      await execute(
        {
          method: 'PATCH',
          path: `/hr-leave/requests/${reviewForm.requestId}/cancel`,
          schema: hrLeaveRequestSchema,
          body: { reason: reviewForm.reason },
        },
        'Demande annulée.',
      );
      return;
    }
    if (reviewForm.action === 'REJECT' && !reviewForm.reason.trim()) {
      setFeedback({
        message: 'Le motif de refus est obligatoire.',
        danger: true,
      });
      return;
    }
    await execute(
      {
        method: 'PATCH',
        path: `/hr-leave/requests/${reviewForm.requestId}/decision`,
        schema: hrLeaveRequestSchema,
        body: {
          decision: reviewForm.action,
          reason: reviewForm.reason || null,
        },
      },
      reviewForm.action === 'APPROVE'
        ? 'Étape de validation enregistrée.'
        : 'Demande refusée.',
    );
  };

  const attachDocument = async () => {
    if (!documentForm.requestId || !documentForm.file) return;
    const file = documentForm.file;
    const request = requests.find(({ id }) => id === documentForm.requestId);
    if (!request) return;
    setBusy(true);
    setFeedback(null);
    try {
      const contentBase64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onerror = () => reject(new Error('File read failed'));
        reader.onload = () => {
          const result = String(reader.result ?? '');
          resolve(result.slice(result.indexOf(',') + 1));
        };
        reader.readAsDataURL(file);
      });
      const document = await client
        .createMutationIntent(
          {
            method: 'POST',
            path: `/hr-core/employees/${request.employeeId}/documents`,
            schema: hrEmployeeDocumentSchema,
            body: {
              category: 'LEAVE_SUPPORT',
              title: `Justificatif ${request.policy?.name ?? request.type} ${request.startDate}`,
              isRequired: false,
              reminderDays: 0,
              filename: file.name,
              contentBase64,
            },
          },
          { idempotency: 'required' },
        )
        .execute();
      await client
        .createMutationIntent(
          {
            method: 'PATCH',
            path: `/hr-leave/requests/${request.id}/evidence`,
            schema: hrLeaveRequestSchema,
            body: { documentId: document.id },
          },
          { idempotency: 'required' },
        )
        .execute();
      setDocumentForm({ requestId: request.id, file: null });
      setFeedback({
        message: 'Justificatif RH importé et rattaché à la demande.',
        danger: false,
      });
      await load();
    } catch {
      setFeedback({
        message:
          "Le justificatif n'a pas pu être importé. Utilisez un PDF, PNG ou JPEG de moins de 20 Mo.",
        danger: true,
      });
    } finally {
      setBusy(false);
    }
  };

  const adjustBalance = async () => {
    if (
      !adjustmentForm.employeeId ||
      !adjustmentForm.days ||
      !adjustmentForm.reason.trim()
    ) {
      setFeedback({
        message:
          'Le collaborateur, le nombre de jours et le motif sont obligatoires.',
        danger: true,
      });
      return;
    }
    await execute(
      {
        method: 'POST',
        path: '/hr-leave/balances/adjustments',
        schema: hrLeaveBalanceSchema,
        body: {
          employeeId: adjustmentForm.employeeId,
          year: Number(year),
          type: adjustmentForm.type,
          days: Number(adjustmentForm.days),
          effectiveDate: `${year}-01-01`,
          reason: adjustmentForm.reason,
        },
      },
      'Régularisation enregistrée dans le journal du compteur.',
    );
  };

  const normalizedQuery = query.trim().toLocaleLowerCase('fr');
  const filteredRequests = useMemo(
    () =>
      requests.filter((request) =>
        normalizedQuery === ''
          ? true
          : [
              request.employee.employeeNumber,
              request.employee.firstName,
              request.employee.lastName,
              request.policy?.name,
              request.status,
            ].some((value) =>
              value?.toLocaleLowerCase('fr').includes(normalizedQuery),
            ),
      ),
    [normalizedQuery, requests],
  );
  const filteredBalances = useMemo(
    () =>
      balances.filter(({ employee }) =>
        normalizedQuery === ''
          ? true
          : [
              employee.employeeNumber,
              employee.firstName,
              employee.lastName,
            ].some((value) =>
              value.toLocaleLowerCase('fr').includes(normalizedQuery),
            ),
      ),
    [balances, normalizedQuery],
  );

  const requestColumns: ErpOperationalTableColumn<HrLeaveRequest>[] = [
    {
      key: 'employee',
      header: 'Collaborateur',
      width: '240px',
      render: ({ employee }) => (
        <StyledPrimary>
          <span>
            {employee.firstName} {employee.lastName}
          </span>
          <StyledMuted>{employee.employeeNumber}</StyledMuted>
        </StyledPrimary>
      ),
    },
    {
      key: 'policy',
      header: 'Nature',
      width: '190px',
      render: ({ policy, type }) => policy?.name ?? policyLabels[type] ?? type,
    },
    {
      key: 'period',
      header: 'Période',
      width: '220px',
      render: ({ startDate, endDate }) => `${startDate} au ${endDate}`,
    },
    {
      key: 'delegate',
      header: 'Relais',
      width: '180px',
      render: ({ delegateEmployee }) =>
        delegateEmployee === null
          ? '—'
          : `${delegateEmployee.firstName} ${delegateEmployee.lastName}`,
    },
    {
      key: 'days',
      header: 'Jours ouvrés',
      width: '120px',
      align: 'right',
      render: ({ workingDays }) => workingDays,
    },
    {
      key: 'evidence',
      header: 'Justificatif',
      width: '150px',
      render: ({ evidenceRequired, supportingDocument }) =>
        supportingDocument ? (
          <ErpStatusBadge label="Reçu" tone="success" />
        ) : evidenceRequired ? (
          <ErpStatusBadge label="Requis" tone="warning" />
        ) : (
          <ErpStatusBadge label="Non requis" tone="neutral" />
        ),
    },
    {
      key: 'status',
      header: 'Statut',
      width: '170px',
      render: ({ status }) => (
        <ErpStatusBadge
          label={statusLabels[status]}
          tone={statusTone(status)}
        />
      ),
    },
    {
      key: 'action',
      header: '',
      width: '105px',
      align: 'right',
      render: (request) =>
        canWrite &&
        (request.status === 'REQUESTED' ||
          request.status === 'MANAGER_APPROVED') ? (
          <StyledActions>
            <StyledAction
              type="button"
              disabled={busy}
              onClick={() => {
                setReviewForm({
                  requestId: request.id,
                  action: 'APPROVE',
                  reason: '',
                });
                void execute(
                  {
                    method: 'PATCH',
                    path: `/hr-leave/requests/${request.id}/decision`,
                    schema: hrLeaveRequestSchema,
                    body: { decision: 'APPROVE', reason: null },
                  },
                  'Étape de validation enregistrée.',
                );
              }}
            >
              Valider
            </StyledAction>
          </StyledActions>
        ) : null,
    },
  ];

  const balanceColumns: ErpOperationalTableColumn<HrLeaveBalance>[] = [
    {
      key: 'employee',
      header: 'Collaborateur',
      width: '260px',
      render: ({ employee }) => (
        <StyledPrimary>
          <span>
            {employee.firstName} {employee.lastName}
          </span>
          <StyledMuted>{employee.employeeNumber}</StyledMuted>
        </StyledPrimary>
      ),
    },
    {
      key: 'entitled',
      header: 'Acquis',
      width: '120px',
      align: 'right',
      render: ({ entitledDays }) => entitledDays,
    },
    {
      key: 'carry',
      header: 'Report',
      width: '120px',
      align: 'right',
      render: ({ carriedDays }) => carriedDays,
    },
    {
      key: 'consumed',
      header: 'Pris',
      width: '120px',
      align: 'right',
      render: ({ consumedDays }) => consumedDays,
    },
    {
      key: 'pending',
      header: 'Réservé',
      width: '120px',
      align: 'right',
      render: ({ pendingDays }) => pendingDays,
    },
    {
      key: 'available',
      header: 'Disponible',
      width: '140px',
      align: 'right',
      render: ({ availableDays }) => (
        <ErpStatusBadge
          label={`${availableDays} j`}
          tone={availableDays < 0 ? 'danger' : 'success'}
        />
      ),
    },
    {
      key: 'ledger',
      header: 'Mouvements',
      width: '130px',
      align: 'right',
      render: ({ movements }) => movements.length,
    },
  ];

  const pendingRequests = requests.filter(
    ({ status }) => status === 'REQUESTED' || status === 'MANAGER_APPROVED',
  );

  return (
    <>
      {canWrite ? (
        <StyledCommands>
          <StyledCommand
            onSubmit={(event) => {
              event.preventDefault();
              void createRequest();
            }}
          >
            <StyledCommandTitle>Nouvelle demande</StyledCommandTitle>
            <StyledFields>
              <StyledField>
                Collaborateur
                <StyledSelect
                  value={requestForm.employeeId}
                  onChange={(event) =>
                    setRequestForm((current) => ({
                      ...current,
                      employeeId: event.target.value,
                    }))
                  }
                >
                  <option value="">Sélectionner</option>
                  {employees.map((employee) => (
                    <option key={employee.id} value={employee.id}>
                      {employee.employeeNumber} · {employee.firstName}{' '}
                      {employee.lastName}
                    </option>
                  ))}
                </StyledSelect>
              </StyledField>
              <StyledField>
                Politique
                <StyledSelect
                  value={requestForm.policyId}
                  onChange={(event) =>
                    setRequestForm((current) => ({
                      ...current,
                      policyId: event.target.value,
                    }))
                  }
                >
                  <option value="">Sélectionner</option>
                  {policies
                    .filter(({ isActive }) => isActive)
                    .map((policy) => (
                      <option key={policy.id} value={policy.id}>
                        {policy.name}
                      </option>
                    ))}
                </StyledSelect>
              </StyledField>
              <Button
                title="Créer"
                ariaLabel="Créer la demande de congé"
                Icon={IconPlus}
                accent="blue"
                disabled={busy || policies.length === 0}
                type="submit"
              />
            </StyledFields>
            <StyledFields>
              <StyledField>
                Début
                <StyledInput
                  type="date"
                  value={requestForm.startDate}
                  onChange={(event) =>
                    setRequestForm((current) => ({
                      ...current,
                      startDate: event.target.value,
                    }))
                  }
                />
              </StyledField>
              <StyledField>
                Fin
                <StyledInput
                  type="date"
                  value={requestForm.endDate}
                  onChange={(event) =>
                    setRequestForm((current) => ({
                      ...current,
                      endDate: event.target.value,
                    }))
                  }
                />
              </StyledField>
              <StyledField>
                Relais pendant l’absence
                <StyledSelect
                  value={requestForm.delegateEmployeeId}
                  onChange={(event) =>
                    setRequestForm((current) => ({
                      ...current,
                      delegateEmployeeId: event.target.value,
                    }))
                  }
                >
                  <option value="">Aucun relais</option>
                  {employees
                    .filter(({ id }) => id !== requestForm.employeeId)
                    .map((employee) => (
                      <option key={employee.id} value={employee.id}>
                        {employee.employeeNumber} · {employee.firstName}{' '}
                        {employee.lastName}
                      </option>
                    ))}
                </StyledSelect>
              </StyledField>
            </StyledFields>
            <StyledField>
              Motif
              <StyledInput
                value={requestForm.reason}
                onChange={(event) =>
                  setRequestForm((current) => ({
                    ...current,
                    reason: event.target.value,
                  }))
                }
              />
            </StyledField>
          </StyledCommand>

          <StyledCommand
            onSubmit={(event) => {
              event.preventDefault();
              void submitReview();
            }}
          >
            <StyledCommandTitle>Validation et décision</StyledCommandTitle>
            <StyledFields>
              <StyledField>
                Demande
                <StyledSelect
                  value={reviewForm.requestId}
                  onChange={(event) =>
                    setReviewForm((current) => ({
                      ...current,
                      requestId: event.target.value,
                    }))
                  }
                >
                  <option value="">Sélectionner</option>
                  {requests
                    .filter(
                      ({ status }) =>
                        status !== 'REJECTED' && status !== 'CANCELLED',
                    )
                    .map((request) => (
                      <option key={request.id} value={request.id}>
                        {request.employee.employeeNumber} ·{' '}
                        {statusLabels[request.status]}
                      </option>
                    ))}
                </StyledSelect>
              </StyledField>
              <StyledField>
                Action
                <StyledSelect
                  value={reviewForm.action}
                  onChange={(event) =>
                    setReviewForm((current) => ({
                      ...current,
                      action: event.target.value,
                    }))
                  }
                >
                  <option value="APPROVE">Valider</option>
                  <option value="REJECT">Refuser</option>
                  <option value="CANCEL">Annuler</option>
                </StyledSelect>
              </StyledField>
              <Button
                title="Appliquer"
                ariaLabel="Appliquer la décision"
                Icon={IconRefresh}
                accent="blue"
                disabled={busy || !reviewForm.requestId}
                type="submit"
              />
            </StyledFields>
            <StyledField>
              Motif de refus ou d’annulation
              <StyledInput
                value={reviewForm.reason}
                onChange={(event) =>
                  setReviewForm((current) => ({
                    ...current,
                    reason: event.target.value,
                  }))
                }
              />
            </StyledField>
            <StyledFields>
              <StyledField>
                Demande à justifier
                <StyledSelect
                  value={documentForm.requestId}
                  onChange={(event) =>
                    setDocumentForm((current) => ({
                      ...current,
                      requestId: event.target.value,
                    }))
                  }
                >
                  <option value="">Sélectionner</option>
                  {pendingRequests.map((request) => (
                    <option key={request.id} value={request.id}>
                      {request.employee.employeeNumber} ·{' '}
                      {request.policy?.name ?? request.type}
                    </option>
                  ))}
                </StyledSelect>
              </StyledField>
              <StyledField>
                Justificatif
                <StyledInput
                  type="file"
                  accept="application/pdf,image/png,image/jpeg"
                  onChange={(event) =>
                    setDocumentForm((current) => ({
                      ...current,
                      file: event.target.files?.[0] ?? null,
                    }))
                  }
                />
              </StyledField>
              <Button
                title="Rattacher"
                ariaLabel="Rattacher le justificatif"
                Icon={IconPlus}
                type="button"
                disabled={
                  busy ||
                  !canWriteDocuments ||
                  !documentForm.requestId ||
                  !documentForm.file
                }
                onClick={() => void attachDocument()}
              />
            </StyledFields>
          </StyledCommand>

          <StyledCommand
            onSubmit={(event) => {
              event.preventDefault();
              void runAccruals();
            }}
          >
            <StyledCommandTitle>Paramétrage et compteurs</StyledCommandTitle>
            <StyledFields>
              <StyledField>
                Exercice
                <StyledInput
                  type="number"
                  min="2000"
                  max="2200"
                  value={year}
                  onChange={(event) => setYear(event.target.value)}
                />
              </StyledField>
              <Button
                title="Initialiser Maroc"
                ariaLabel="Initialiser les politiques Maroc"
                Icon={IconPlus}
                type="button"
                disabled={busy}
                onClick={() => void seedPolicies()}
              />
              <Button
                title="Calculer les acquis"
                ariaLabel="Calculer les acquisitions de congés"
                Icon={IconRefresh}
                accent="blue"
                disabled={busy || policies.length === 0}
                type="submit"
              />
            </StyledFields>
            <StyledMuted>
              Le calcul est idempotent: relancer une même période ne double pas
              les droits.
            </StyledMuted>
            <StyledFields>
              <StyledField>
                Collaborateur
                <StyledSelect
                  value={adjustmentForm.employeeId}
                  onChange={(event) =>
                    setAdjustmentForm((current) => ({
                      ...current,
                      employeeId: event.target.value,
                    }))
                  }
                >
                  <option value="">Sélectionner</option>
                  {employees.map((employee) => (
                    <option key={employee.id} value={employee.id}>
                      {employee.employeeNumber} · {employee.firstName}{' '}
                      {employee.lastName}
                    </option>
                  ))}
                </StyledSelect>
              </StyledField>
              <StyledField>
                Nature
                <StyledSelect
                  value={adjustmentForm.type}
                  onChange={(event) =>
                    setAdjustmentForm((current) => ({
                      ...current,
                      type: event.target.value,
                    }))
                  }
                >
                  <option value="ADJUSTMENT">Régularisation</option>
                  <option value="CARRYOVER">Report antérieur</option>
                </StyledSelect>
              </StyledField>
              <StyledField>
                Jours
                <StyledInput
                  type="number"
                  min="-366"
                  max="366"
                  step="0.5"
                  value={adjustmentForm.days}
                  onChange={(event) =>
                    setAdjustmentForm((current) => ({
                      ...current,
                      days: event.target.value,
                    }))
                  }
                />
              </StyledField>
            </StyledFields>
            <StyledFields>
              <StyledField>
                Motif
                <StyledInput
                  value={adjustmentForm.reason}
                  onChange={(event) =>
                    setAdjustmentForm((current) => ({
                      ...current,
                      reason: event.target.value,
                    }))
                  }
                />
              </StyledField>
              <Button
                title="Régulariser"
                ariaLabel="Régulariser le compteur de congés"
                Icon={IconPlus}
                type="button"
                disabled={busy || policies.length === 0}
                onClick={() => void adjustBalance()}
              />
            </StyledFields>
          </StyledCommand>
        </StyledCommands>
      ) : null}

      {feedback ? (
        <StyledFeedback danger={feedback.danger}>
          {feedback.message}
        </StyledFeedback>
      ) : null}

      <StyledSectionHeader>
        <StyledSectionTitle>Demandes de congés et absences</StyledSectionTitle>
        <StyledSectionMeta>
          {pendingRequests.length} demande(s) en attente
        </StyledSectionMeta>
      </StyledSectionHeader>
      <ErpOperationalTable
        ariaLabel="Demandes de congés"
        columns={requestColumns}
        rows={filteredRequests}
        getRowKey={(row) => row.id}
        state={state}
        loadingLabel="Chargement des demandes"
        emptyLabel="Aucune demande sur cet exercice"
        errorLabel="Impossible de charger les demandes"
        onRetry={() => void load()}
      />

      <StyledSectionHeader>
        <StyledSectionTitle>Compteurs annuels</StyledSectionTitle>
        <StyledSectionMeta>Exercice {year}</StyledSectionMeta>
      </StyledSectionHeader>
      <ErpOperationalTable
        ariaLabel="Compteurs de congés"
        columns={balanceColumns}
        rows={filteredBalances}
        getRowKey={(row) => row.employee.id}
        state={state}
        loadingLabel="Chargement des compteurs"
        emptyLabel="Aucun compteur disponible"
        errorLabel="Impossible de charger les compteurs"
        onRetry={() => void load()}
      />
    </>
  );
};
