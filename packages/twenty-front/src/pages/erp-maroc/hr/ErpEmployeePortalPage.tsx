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
import { styled } from '@linaria/react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  employeePortalDashboardSchema,
  employeePortalEmployeeListSchema,
  employeePortalFileSchema,
  employeePortalRequestListSchema,
  employeePortalRequestSchema,
  erpLeaveRequestSchema,
  type EmployeePortalDashboard,
  type EmployeePortalEmployee,
  type EmployeePortalRequest,
  type ErpLeaveRequest,
  type ErpPayslip,
} from 'twenty-shared/erp-maroc';
import {
  IconCheck,
  IconDownload,
  IconFileText,
  IconPlus,
  IconRefresh,
  IconX,
} from 'twenty-ui/display';
import { Button } from 'twenty-ui/input';
import { themeCssVariables } from 'twenty-ui/theme-constants';

type View = 'overview' | 'pay' | 'leaves' | 'career' | 'requests' | 'admin';
type LoadState = 'loading' | 'ready' | 'error';
type FormMode = 'none' | 'leave' | 'request' | 'review';

const today = () => new Date().toISOString().slice(0, 10);

const formatMoney = (cents: number) =>
  new Intl.NumberFormat('fr-MA', {
    style: 'currency',
    currency: 'MAD',
  }).format(cents / 100);

const formatDate = (value: string | null | undefined) =>
  value
    ? new Intl.DateTimeFormat('fr-MA', { dateStyle: 'medium' }).format(
        new Date(value),
      )
    : '—';

const downloadBase64 = (file: {
  filename: string;
  contentType: string;
  contentBase64: string;
}) => {
  const bytes = Uint8Array.from(window.atob(file.contentBase64), (character) =>
    character.charCodeAt(0),
  );
  const url = URL.createObjectURL(
    new Blob([bytes], { type: file.contentType }),
  );
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = file.filename;
  anchor.click();
  URL.revokeObjectURL(url);
};

const statusTone = (status: string): ErpStatusTone => {
  if (
    ['APPROVED', 'PAID', 'VALIDATED', 'COMPLETED', 'FINALIZED'].includes(status)
  )
    return 'success';
  if (['REJECTED', 'FAILED', 'CANCELLED'].includes(status)) return 'danger';
  if (['IN_REVIEW', 'REQUESTED', 'SUBMITTED', 'SELF_REVIEW'].includes(status))
    return 'warning';
  return 'info';
};

const statusBadge = (status: string) => (
  <ErpStatusBadge
    label={status.replaceAll('_', ' ')}
    tone={statusTone(status)}
  />
);

const StyledToolbar = styled.div`
  align-items: center;
  border-bottom: 1px solid ${themeCssVariables.border.color.light};
  display: flex;
  flex: 0 0 auto;
  gap: ${themeCssVariables.spacing[2]};
  justify-content: space-between;
  min-height: 44px;
  overflow-x: auto;
  padding: 0 ${themeCssVariables.spacing[3]};
`;

const StyledTabs = styled.div`
  display: flex;
  gap: ${themeCssVariables.spacing[1]};
`;

const StyledTab = styled.button<{ active: boolean }>`
  background: ${({ active }) =>
    active
      ? themeCssVariables.background.quaternary
      : themeCssVariables.background.transparent.light};
  border: 0;
  border-radius: ${themeCssVariables.border.radius.sm};
  color: ${({ active }) =>
    active
      ? themeCssVariables.font.color.primary
      : themeCssVariables.font.color.secondary};
  cursor: pointer;
  font: inherit;
  font-size: ${themeCssVariables.font.size.sm};
  height: 30px;
  padding: 0 ${themeCssVariables.spacing[2]};
  white-space: nowrap;
`;

const StyledSelect = styled.select`
  background: ${themeCssVariables.background.primary};
  border: 1px solid ${themeCssVariables.border.color.medium};
  border-radius: ${themeCssVariables.border.radius.sm};
  color: ${themeCssVariables.font.color.primary};
  font: inherit;
  font-size: ${themeCssVariables.font.size.sm};
  height: 30px;
  min-width: 180px;
  padding: 0 ${themeCssVariables.spacing[2]};
`;

const StyledMetrics = styled.section`
  border-bottom: 1px solid ${themeCssVariables.border.color.light};
  display: grid;
  flex: 0 0 auto;
  grid-template-columns: repeat(4, minmax(150px, 1fr));
  overflow-x: auto;
`;

const StyledMetric = styled.div`
  border-right: 1px solid ${themeCssVariables.border.color.light};
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[1]};
  padding: ${themeCssVariables.spacing[3]};
`;

const StyledMetricLabel = styled.span`
  color: ${themeCssVariables.font.color.secondary};
  font-size: ${themeCssVariables.font.size.sm};
`;

const StyledMetricValue = styled.strong`
  color: ${themeCssVariables.font.color.primary};
  font-size: ${themeCssVariables.font.size.lg};
  letter-spacing: 0;
`;

const StyledProfile = styled.section`
  display: grid;
  flex: 0 0 auto;
  grid-template-columns: repeat(4, minmax(150px, 1fr));
  overflow-x: auto;
`;

const StyledProfileField = styled.div`
  border-bottom: 1px solid ${themeCssVariables.border.color.light};
  border-right: 1px solid ${themeCssVariables.border.color.light};
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[1]};
  min-height: 54px;
  padding: ${themeCssVariables.spacing[3]};
`;

const StyledLabel = styled.span`
  color: ${themeCssVariables.font.color.tertiary};
  font-size: ${themeCssVariables.font.size.sm};
`;

const StyledValue = styled.span`
  color: ${themeCssVariables.font.color.primary};
  font-size: ${themeCssVariables.font.size.md};
  overflow-wrap: anywhere;
`;

const StyledForm = styled.form`
  align-items: end;
  background: ${themeCssVariables.background.secondary};
  border-bottom: 1px solid ${themeCssVariables.border.color.light};
  display: grid;
  flex: 0 0 auto;
  gap: ${themeCssVariables.spacing[2]};
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  padding: ${themeCssVariables.spacing[3]};
`;

const StyledField = styled.label`
  color: ${themeCssVariables.font.color.secondary};
  display: flex;
  flex-direction: column;
  font-size: ${themeCssVariables.font.size.sm};
  gap: ${themeCssVariables.spacing[1]};
  min-width: 0;
`;

const StyledControl = styled.input`
  background: ${themeCssVariables.background.primary};
  border: 1px solid ${themeCssVariables.border.color.medium};
  border-radius: ${themeCssVariables.border.radius.sm};
  box-sizing: border-box;
  color: ${themeCssVariables.font.color.primary};
  font: inherit;
  font-size: ${themeCssVariables.font.size.sm};
  height: 30px;
  min-width: 0;
  padding: 0 ${themeCssVariables.spacing[2]};
`;

const StyledTextArea = styled.textarea`
  background: ${themeCssVariables.background.primary};
  border: 1px solid ${themeCssVariables.border.color.medium};
  border-radius: ${themeCssVariables.border.radius.sm};
  box-sizing: border-box;
  color: ${themeCssVariables.font.color.primary};
  font: inherit;
  font-size: ${themeCssVariables.font.size.sm};
  min-height: 64px;
  padding: ${themeCssVariables.spacing[2]};
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
  flex: 0 0 auto;
  font-size: ${themeCssVariables.font.size.sm};
  padding: ${themeCssVariables.spacing[2]} ${themeCssVariables.spacing[3]};
`;

const StyledRowActions = styled.div`
  align-items: center;
  display: flex;
  gap: ${themeCssVariables.spacing[1]};
  justify-content: flex-end;
`;

const StyledAction = styled.button`
  align-items: center;
  background: transparent;
  border: 0;
  color: ${themeCssVariables.color.blue};
  cursor: pointer;
  display: inline-flex;
  font: inherit;
  font-size: ${themeCssVariables.font.size.sm};
  gap: ${themeCssVariables.spacing[1]};
  padding: ${themeCssVariables.spacing[1]};

  &:disabled {
    color: ${themeCssVariables.font.color.extraLight};
    cursor: default;
  }
`;

const StyledSectionTitle = styled.h2`
  border-bottom: 1px solid ${themeCssVariables.border.color.light};
  color: ${themeCssVariables.font.color.primary};
  font-size: ${themeCssVariables.font.size.md};
  font-weight: ${themeCssVariables.font.weight.semiBold};
  letter-spacing: 0;
  margin: 0;
  padding: ${themeCssVariables.spacing[3]};
`;

export const ErpEmployeePortalPage = () => {
  const { client } = useErpMarocContext();
  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [view, setView] = useState<View>('overview');
  const [formMode, setFormMode] = useState<FormMode>('none');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{
    danger: boolean;
    text: string;
  } | null>(null);
  const [employees, setEmployees] = useState<EmployeePortalEmployee[]>([]);
  const [employeeId, setEmployeeId] = useState('');
  const [dashboard, setDashboard] = useState<EmployeePortalDashboard | null>(
    null,
  );
  const [adminRequests, setAdminRequests] = useState<EmployeePortalRequest[]>(
    [],
  );
  const [canReview, setCanReview] = useState(false);
  const [selectedRequest, setSelectedRequest] =
    useState<EmployeePortalRequest | null>(null);
  const [leaveForm, setLeaveForm] = useState({
    type: 'ANNUAL',
    startDate: today(),
    endDate: today(),
    reason: '',
  });
  const [requestForm, setRequestForm] = useState({
    type: 'PROFILE_CHANGE',
    subject: '',
    email: '',
    phone: '',
    address: '',
    bankName: '',
    accountHolderName: '',
    rib: '',
    effectiveFrom: today(),
    description: '',
  });
  const [reviewForm, setReviewForm] = useState({
    status: 'IN_REVIEW',
    reviewerComment: '',
  });

  const loadEmployees = useCallback(async () => {
    setLoadState('loading');
    try {
      const nextEmployees = await client.request({
        method: 'GET',
        path: '/employee-portal/employees',
        schema: employeePortalEmployeeListSchema,
      });
      setEmployees(nextEmployees);
      setEmployeeId((current) => current || nextEmployees[0]?.id || '');
      setLoadState('ready');
    } catch {
      setLoadState('error');
    }
  }, [client]);

  const loadDashboard = useCallback(async () => {
    if (!employeeId) return;
    setLoadState('loading');
    try {
      const [nextDashboard, nextAdminRequests] = await Promise.all([
        client.request({
          method: 'GET',
          path: '/employee-portal/dashboard',
          query: { employeeId },
          schema: employeePortalDashboardSchema,
        }),
        client
          .request({
            method: 'GET',
            path: '/employee-portal/admin/requests',
            schema: employeePortalRequestListSchema,
          })
          .catch(() => null),
      ]);
      setDashboard(nextDashboard);
      setCanReview(nextAdminRequests !== null);
      setAdminRequests(nextAdminRequests ?? []);
      setLoadState('ready');
    } catch {
      setLoadState('error');
    }
  }, [client, employeeId]);

  useEffect(() => {
    void loadEmployees();
  }, [loadEmployees]);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  const mutate = async <T,>(operation: () => Promise<T>, success: string) => {
    setBusy(true);
    setNotice(null);
    try {
      await operation();
      setNotice({ danger: false, text: success });
      setFormMode('none');
      await loadDashboard();
    } catch {
      setNotice({ danger: true, text: "L'opération n'a pas abouti." });
    } finally {
      setBusy(false);
    }
  };

  const saveLeave = (event: React.FormEvent) => {
    event.preventDefault();
    void mutate(
      () =>
        client
          .createMutationIntent({
            method: 'POST',
            path: '/employee-portal/leaves',
            schema: erpLeaveRequestSchema,
            body: { employeeId, ...leaveForm },
          })
          .execute(),
      'Demande de congé transmise.',
    );
  };

  const saveRequest = (event: React.FormEvent) => {
    event.preventDefault();
    const payload =
      requestForm.type === 'PROFILE_CHANGE'
        ? {
            email: requestForm.email,
            phone: requestForm.phone,
            address: requestForm.address,
          }
        : requestForm.type === 'BANK_CHANGE'
          ? {
              bankName: requestForm.bankName,
              accountHolderName: requestForm.accountHolderName,
              rib: requestForm.rib,
              effectiveFrom: requestForm.effectiveFrom,
            }
          : { description: requestForm.description };
    void mutate(
      () =>
        client
          .createMutationIntent({
            method: 'POST',
            path: '/employee-portal/requests',
            schema: employeePortalRequestSchema,
            body: {
              employeeId,
              type: requestForm.type,
              subject: requestForm.subject,
              payload,
            },
          })
          .execute(),
      'Demande RH transmise.',
    );
  };

  const saveReview = (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedRequest) return;
    void mutate(
      () =>
        client
          .createMutationIntent({
            method: 'PATCH',
            path: `/employee-portal/admin/requests/${selectedRequest.id}`,
            schema: employeePortalRequestSchema,
            body: reviewForm,
          })
          .execute(),
      'Demande RH mise à jour.',
    );
  };

  const getFile = async (path: string, query: Record<string, string>) => {
    setBusy(true);
    try {
      const file = await client.request({
        method: 'GET',
        path,
        query,
        schema: employeePortalFileSchema,
      });
      downloadBase64(file);
    } catch {
      setNotice({ danger: true, text: 'Document indisponible.' });
    } finally {
      setBusy(false);
    }
  };

  const payslipColumns = useMemo<ErpOperationalTableColumn<ErpPayslip>[]>(
    () => [
      {
        key: 'period',
        header: 'Période',
        width: '120px',
        render: ({ periodKey }) => periodKey,
      },
      {
        key: 'gross',
        header: 'Brut',
        width: '130px',
        align: 'right',
        render: ({ grossSalaryCents }) => formatMoney(grossSalaryCents),
      },
      {
        key: 'net',
        header: 'Net',
        width: '130px',
        align: 'right',
        render: ({ netSalaryCents }) => formatMoney(netSalaryCents),
      },
      {
        key: 'status',
        header: 'Statut',
        width: '110px',
        render: ({ status }) => statusBadge(status),
      },
      {
        key: 'action',
        header: '',
        width: '130px',
        align: 'right',
        render: ({ id }) => (
          <StyledAction
            disabled={busy}
            onClick={() =>
              void getFile(`/employee-portal/payslips/${id}/pdf`, {
                employeeId,
              })
            }
          >
            <IconDownload size={14} /> Télécharger
          </StyledAction>
        ),
      },
    ],
    [busy, employeeId],
  );

  const leaveColumns = useMemo<ErpOperationalTableColumn<ErpLeaveRequest>[]>(
    () => [
      {
        key: 'type',
        header: 'Type',
        width: '130px',
        render: ({ type }) => type,
      },
      {
        key: 'dates',
        header: 'Période',
        width: '220px',
        render: ({ startDate, endDate }) =>
          `${formatDate(startDate)} - ${formatDate(endDate)}`,
      },
      {
        key: 'days',
        header: 'Jours',
        width: '80px',
        align: 'right',
        render: ({ workingDays }) => workingDays,
      },
      {
        key: 'status',
        header: 'Statut',
        width: '120px',
        render: ({ status }) => statusBadge(status),
      },
      {
        key: 'actions',
        header: '',
        width: '110px',
        align: 'right',
        render: (leave) =>
          leave.status === 'REQUESTED' ? (
            <StyledAction
              disabled={busy}
              onClick={() =>
                void mutate(
                  () =>
                    client
                      .createMutationIntent({
                        method: 'POST',
                        path: `/employee-portal/leaves/${leave.id}/cancel`,
                        schema: erpLeaveRequestSchema,
                      })
                      .execute(),
                  'Demande annulée.',
                )
              }
            >
              <IconX size={14} /> Annuler
            </StyledAction>
          ) : null,
      },
    ],
    [busy, client],
  );

  const requestColumns = useMemo<
    ErpOperationalTableColumn<EmployeePortalRequest>[]
  >(
    () => [
      {
        key: 'subject',
        header: 'Demande',
        width: '240px',
        render: ({ subject }) => subject,
      },
      {
        key: 'type',
        header: 'Type',
        width: '160px',
        render: ({ type }) => type.replaceAll('_', ' '),
      },
      {
        key: 'date',
        header: 'Soumise le',
        width: '130px',
        render: ({ createdAt }) => formatDate(createdAt),
      },
      {
        key: 'status',
        header: 'Statut',
        width: '120px',
        render: ({ status }) => statusBadge(status),
      },
      {
        key: 'actions',
        header: '',
        width: '110px',
        align: 'right',
        render: (request) =>
          request.status === 'SUBMITTED' ? (
            <StyledAction
              disabled={busy}
              onClick={() =>
                void mutate(
                  () =>
                    client
                      .createMutationIntent({
                        method: 'POST',
                        path: `/employee-portal/requests/${request.id}/cancel`,
                        schema: employeePortalRequestSchema,
                      })
                      .execute(),
                  'Demande annulée.',
                )
              }
            >
              <IconX size={14} /> Annuler
            </StyledAction>
          ) : null,
      },
    ],
    [busy, client],
  );

  const adminColumns = useMemo<
    ErpOperationalTableColumn<EmployeePortalRequest>[]
  >(
    () => [
      {
        key: 'employee',
        header: 'Salarié',
        width: '180px',
        render: ({ employee }) =>
          employee ? `${employee.firstName} ${employee.lastName}` : '—',
      },
      {
        key: 'subject',
        header: 'Demande',
        width: '240px',
        render: ({ subject }) => subject,
      },
      {
        key: 'type',
        header: 'Type',
        width: '160px',
        render: ({ type }) => type.replaceAll('_', ' '),
      },
      {
        key: 'status',
        header: 'Statut',
        width: '120px',
        render: ({ status }) => statusBadge(status),
      },
      {
        key: 'actions',
        header: '',
        width: '120px',
        align: 'right',
        render: (request) =>
          ['SUBMITTED', 'IN_REVIEW'].includes(request.status) ? (
            <StyledAction
              disabled={busy}
              onClick={() => {
                setSelectedRequest(request);
                setReviewForm({
                  status:
                    request.status === 'SUBMITTED' ? 'IN_REVIEW' : 'APPROVED',
                  reviewerComment: '',
                });
                setFormMode('review');
              }}
            >
              <IconCheck size={14} /> Examiner
            </StyledAction>
          ) : null,
      },
    ],
    [busy],
  );

  const content = dashboard;
  const latestPayslip = content?.payslips[0];
  const currentBank = content?.employee.bankDetails?.[0];
  const pendingRequests = content?.requests.filter(({ status }) =>
    ['SUBMITTED', 'IN_REVIEW'].includes(status),
  ).length;
  const tabs: Array<readonly [View, string]> = [
    ['overview', 'Synthèse'],
    ['pay', 'Paie & documents'],
    ['leaves', 'Congés & temps'],
    ['career', 'Parcours'],
    ['requests', 'Demandes RH'],
  ];
  if (canReview) tabs.push(['admin', 'Validation RH']);

  return (
    <ErpPageShell
      title="Mon espace salarié"
      description="Informations personnelles, paie, congés et parcours professionnel"
      state={
        loadState === 'loading'
          ? 'loading'
          : loadState === 'error'
            ? 'error'
            : employees.length === 0
              ? 'empty'
              : 'ready'
      }
      emptyLabel="Aucun salarié n'est associé à ce compte."
      errorLabel="Impossible de charger l'espace salarié."
      onRetry={() => void loadEmployees()}
      actions={
        <Button
          title="Actualiser"
          ariaLabel="Actualiser l'espace salarié"
          Icon={IconRefresh}
          variant="secondary"
          onClick={() => void loadDashboard()}
        />
      }
    >
      <StyledToolbar>
        <StyledTabs>
          {tabs.map(([key, label]) => (
            <StyledTab
              key={key}
              active={view === key}
              onClick={() => {
                setView(key);
                setFormMode('none');
              }}
            >
              {label}
            </StyledTab>
          ))}
        </StyledTabs>
        {employees.length > 1 ? (
          <StyledSelect
            aria-label="Salarié"
            value={employeeId}
            onChange={(event) => setEmployeeId(event.target.value)}
          >
            {employees.map((employee) => (
              <option key={employee.id} value={employee.id}>
                {employee.firstName} {employee.lastName}
              </option>
            ))}
          </StyledSelect>
        ) : null}
      </StyledToolbar>

      {notice ? (
        <StyledNotice danger={notice.danger}>{notice.text}</StyledNotice>
      ) : null}

      {formMode === 'leave' ? (
        <StyledForm onSubmit={saveLeave}>
          <StyledField>
            Type
            <StyledSelect
              value={leaveForm.type}
              onChange={(event) =>
                setLeaveForm({ ...leaveForm, type: event.target.value })
              }
            >
              <option value="ANNUAL">Congé annuel</option>
              <option value="SICK">Maladie</option>
              <option value="MATERNITY">Maternité</option>
              <option value="PATERNITY">Paternité</option>
              <option value="UNPAID">Sans solde</option>
              <option value="OTHER">Autre</option>
            </StyledSelect>
          </StyledField>
          <StyledField>
            Du
            <StyledControl
              type="date"
              required
              value={leaveForm.startDate}
              onChange={(event) =>
                setLeaveForm({ ...leaveForm, startDate: event.target.value })
              }
            />
          </StyledField>
          <StyledField>
            Au
            <StyledControl
              type="date"
              required
              min={leaveForm.startDate}
              value={leaveForm.endDate}
              onChange={(event) =>
                setLeaveForm({ ...leaveForm, endDate: event.target.value })
              }
            />
          </StyledField>
          <StyledField>
            Motif
            <StyledControl
              value={leaveForm.reason}
              onChange={(event) =>
                setLeaveForm({ ...leaveForm, reason: event.target.value })
              }
            />
          </StyledField>
          <Button
            title="Soumettre"
            ariaLabel="Soumettre la demande de congé"
            Icon={IconCheck}
            variant="primary"
            disabled={busy}
            type="submit"
          />
        </StyledForm>
      ) : null}

      {formMode === 'request' ? (
        <StyledForm onSubmit={saveRequest}>
          <StyledField>
            Type
            <StyledSelect
              value={requestForm.type}
              onChange={(event) =>
                setRequestForm({ ...requestForm, type: event.target.value })
              }
            >
              <option value="PROFILE_CHANGE">Coordonnées</option>
              <option value="BANK_CHANGE">RIB</option>
              <option value="DOCUMENT_REQUEST">Document</option>
              <option value="HR_SUPPORT">Assistance RH</option>
            </StyledSelect>
          </StyledField>
          <StyledField>
            Objet
            <StyledControl
              required
              value={requestForm.subject}
              onChange={(event) =>
                setRequestForm({ ...requestForm, subject: event.target.value })
              }
            />
          </StyledField>
          {requestForm.type === 'PROFILE_CHANGE' ? (
            <>
              <StyledField>
                Email
                <StyledControl
                  type="email"
                  value={requestForm.email}
                  onChange={(event) =>
                    setRequestForm({
                      ...requestForm,
                      email: event.target.value,
                    })
                  }
                />
              </StyledField>
              <StyledField>
                Téléphone
                <StyledControl
                  value={requestForm.phone}
                  onChange={(event) =>
                    setRequestForm({
                      ...requestForm,
                      phone: event.target.value,
                    })
                  }
                />
              </StyledField>
              <StyledField>
                Adresse
                <StyledControl
                  value={requestForm.address}
                  onChange={(event) =>
                    setRequestForm({
                      ...requestForm,
                      address: event.target.value,
                    })
                  }
                />
              </StyledField>
            </>
          ) : requestForm.type === 'BANK_CHANGE' ? (
            <>
              <StyledField>
                Banque
                <StyledControl
                  required
                  value={requestForm.bankName}
                  onChange={(event) =>
                    setRequestForm({
                      ...requestForm,
                      bankName: event.target.value,
                    })
                  }
                />
              </StyledField>
              <StyledField>
                Titulaire
                <StyledControl
                  required
                  value={requestForm.accountHolderName}
                  onChange={(event) =>
                    setRequestForm({
                      ...requestForm,
                      accountHolderName: event.target.value,
                    })
                  }
                />
              </StyledField>
              <StyledField>
                RIB 24 chiffres
                <StyledControl
                  required
                  inputMode="numeric"
                  value={requestForm.rib}
                  onChange={(event) =>
                    setRequestForm({ ...requestForm, rib: event.target.value })
                  }
                />
              </StyledField>
              <StyledField>
                Date d'effet
                <StyledControl
                  type="date"
                  required
                  value={requestForm.effectiveFrom}
                  onChange={(event) =>
                    setRequestForm({
                      ...requestForm,
                      effectiveFrom: event.target.value,
                    })
                  }
                />
              </StyledField>
            </>
          ) : (
            <StyledField>
              Détail
              <StyledTextArea
                required
                value={requestForm.description}
                onChange={(event) =>
                  setRequestForm({
                    ...requestForm,
                    description: event.target.value,
                  })
                }
              />
            </StyledField>
          )}
          <Button
            title="Transmettre"
            ariaLabel="Transmettre la demande RH"
            Icon={IconCheck}
            variant="primary"
            disabled={busy}
            type="submit"
          />
        </StyledForm>
      ) : null}

      {formMode === 'review' && selectedRequest ? (
        <StyledForm onSubmit={saveReview}>
          <StyledField>
            Demande
            <StyledControl disabled value={selectedRequest.subject} />
          </StyledField>
          <StyledField>
            Décision
            <StyledSelect
              value={reviewForm.status}
              onChange={(event) =>
                setReviewForm({ ...reviewForm, status: event.target.value })
              }
            >
              <option value="IN_REVIEW">Prendre en charge</option>
              <option value="APPROVED">Approuver</option>
              <option value="REJECTED">Rejeter</option>
            </StyledSelect>
          </StyledField>
          <StyledField>
            Commentaire
            <StyledTextArea
              required={reviewForm.status === 'REJECTED'}
              value={reviewForm.reviewerComment}
              onChange={(event) =>
                setReviewForm({
                  ...reviewForm,
                  reviewerComment: event.target.value,
                })
              }
            />
          </StyledField>
          <Button
            title="Valider"
            ariaLabel="Valider la décision RH"
            Icon={IconCheck}
            variant="primary"
            disabled={busy}
            type="submit"
          />
        </StyledForm>
      ) : null}

      {content ? (
        <>
          {view === 'overview' ? (
            <>
              <StyledMetrics>
                <StyledMetric>
                  <StyledMetricLabel>Solde de congés</StyledMetricLabel>
                  <StyledMetricValue>
                    {content.leaveBalance.availableDays.toFixed(1)} j
                  </StyledMetricValue>
                </StyledMetric>
                <StyledMetric>
                  <StyledMetricLabel>Dernier net payé</StyledMetricLabel>
                  <StyledMetricValue>
                    {latestPayslip
                      ? formatMoney(latestPayslip.netSalaryCents)
                      : '—'}
                  </StyledMetricValue>
                </StyledMetric>
                <StyledMetric>
                  <StyledMetricLabel>Documents</StyledMetricLabel>
                  <StyledMetricValue>
                    {content.documents.length}
                  </StyledMetricValue>
                </StyledMetric>
                <StyledMetric>
                  <StyledMetricLabel>Demandes en cours</StyledMetricLabel>
                  <StyledMetricValue>{pendingRequests ?? 0}</StyledMetricValue>
                </StyledMetric>
              </StyledMetrics>
              <StyledProfile>
                <StyledProfileField>
                  <StyledLabel>Salarié</StyledLabel>
                  <StyledValue>
                    {content.employee.firstName} {content.employee.lastName}
                  </StyledValue>
                </StyledProfileField>
                <StyledProfileField>
                  <StyledLabel>Matricule</StyledLabel>
                  <StyledValue>{content.employee.employeeNumber}</StyledValue>
                </StyledProfileField>
                <StyledProfileField>
                  <StyledLabel>Poste</StyledLabel>
                  <StyledValue>{content.employee.jobTitle}</StyledValue>
                </StyledProfileField>
                <StyledProfileField>
                  <StyledLabel>Département</StyledLabel>
                  <StyledValue>
                    {content.employee.department ?? '—'}
                  </StyledValue>
                </StyledProfileField>
                <StyledProfileField>
                  <StyledLabel>Email</StyledLabel>
                  <StyledValue>{content.employee.email ?? '—'}</StyledValue>
                </StyledProfileField>
                <StyledProfileField>
                  <StyledLabel>Téléphone</StyledLabel>
                  <StyledValue>{content.employee.phone ?? '—'}</StyledValue>
                </StyledProfileField>
                <StyledProfileField>
                  <StyledLabel>Contrat</StyledLabel>
                  <StyledValue>
                    {content.contract?.contractType ??
                      content.employee.contractType}
                  </StyledValue>
                </StyledProfileField>
                <StyledProfileField>
                  <StyledLabel>Compte bancaire</StyledLabel>
                  <StyledValue>{currentBank?.maskedRib ?? '—'}</StyledValue>
                </StyledProfileField>
              </StyledProfile>
            </>
          ) : null}

          {view === 'pay' ? (
            <>
              <StyledToolbar>
                <StyledSectionTitle>Bulletins et documents</StyledSectionTitle>
                <StyledRowActions>
                  {(['travail', 'salaire', 'certificat'] as const).map(
                    (type) => (
                      <StyledAction
                        key={type}
                        disabled={busy}
                        onClick={() =>
                          void getFile('/employee-portal/attestation', {
                            employeeId,
                            type,
                          })
                        }
                      >
                        <IconFileText size={14} /> {type}
                      </StyledAction>
                    ),
                  )}
                </StyledRowActions>
              </StyledToolbar>
              <ErpOperationalTable
                ariaLabel="Bulletins de paie"
                columns={payslipColumns}
                rows={content.payslips}
                getRowKey={({ id }) => id}
                state={content.payslips.length ? 'ready' : 'empty'}
                emptyLabel="Aucun bulletin disponible."
              />
              <StyledSectionTitle>Documents RH</StyledSectionTitle>
              {content.documents.map((document) => (
                <StyledToolbar key={document.id}>
                  <span>{document.title}</span>
                  {document.versions[0] ? (
                    <StyledAction
                      disabled={busy}
                      onClick={() =>
                        void getFile(
                          `/employee-portal/documents/${document.versions[0].id}/content`,
                          { employeeId },
                        )
                      }
                    >
                      <IconDownload size={14} /> Télécharger
                    </StyledAction>
                  ) : (
                    statusBadge('REQUESTED')
                  )}
                </StyledToolbar>
              ))}
            </>
          ) : null}

          {view === 'leaves' ? (
            <>
              <StyledToolbar>
                <span>
                  Disponible: {content.leaveBalance.availableDays.toFixed(1)}{' '}
                  jours
                </span>
                <Button
                  title="Nouvelle demande"
                  ariaLabel="Créer une demande de congé"
                  Icon={IconPlus}
                  variant="primary"
                  onClick={() => setFormMode('leave')}
                />
              </StyledToolbar>
              <ErpOperationalTable
                ariaLabel="Demandes de congé"
                columns={leaveColumns}
                rows={content.leaves}
                getRowKey={({ id }) => id}
                state={content.leaves.length ? 'ready' : 'empty'}
                emptyLabel="Aucune demande de congé."
              />
              <StyledSectionTitle>Derniers pointages</StyledSectionTitle>
              <StyledProfile>
                {content.attendance.slice(0, 12).map((record) => (
                  <StyledProfileField key={record.id}>
                    <StyledLabel>
                      {formatDate(record.attendanceDate)}
                    </StyledLabel>
                    <StyledValue>
                      {Math.floor(record.workedMinutes / 60)} h{' '}
                      {record.workedMinutes % 60} · {record.status}
                    </StyledValue>
                  </StyledProfileField>
                ))}
              </StyledProfile>
            </>
          ) : null}

          {view === 'career' ? (
            <>
              <StyledSectionTitle>Compétences</StyledSectionTitle>
              <StyledProfile>
                {content.skills.map((employeeSkill) => (
                  <StyledProfileField key={employeeSkill.id}>
                    <StyledLabel>
                      {employeeSkill.skill?.category ?? 'Compétence'}
                    </StyledLabel>
                    <StyledValue>
                      {employeeSkill.skill?.name ?? '—'} · {employeeSkill.level}
                      /5
                    </StyledValue>
                  </StyledProfileField>
                ))}
              </StyledProfile>
              <StyledSectionTitle>Formations</StyledSectionTitle>
              <StyledProfile>
                {content.enrollments.map((enrollment) => (
                  <StyledProfileField key={enrollment.id}>
                    <StyledLabel>{enrollment.status}</StyledLabel>
                    <StyledValue>
                      {enrollment.session?.course.title ?? 'Formation'}
                    </StyledValue>
                  </StyledProfileField>
                ))}
              </StyledProfile>
              <StyledSectionTitle>Évaluations</StyledSectionTitle>
              <StyledProfile>
                {content.reviews.map((review) => (
                  <StyledProfileField key={review.id}>
                    <StyledLabel>{review.cycle.name}</StyledLabel>
                    <StyledValue>
                      {review.finalScore ??
                        review.managerScore ??
                        review.selfScore ??
                        '—'}
                      /100 · {review.status}
                    </StyledValue>
                  </StyledProfileField>
                ))}
              </StyledProfile>
            </>
          ) : null}

          {view === 'requests' ? (
            <>
              <StyledToolbar>
                <span>Demandes de modification et assistance</span>
                <Button
                  title="Nouvelle demande"
                  ariaLabel="Créer une demande RH"
                  Icon={IconPlus}
                  variant="primary"
                  onClick={() => setFormMode('request')}
                />
              </StyledToolbar>
              <ErpOperationalTable
                ariaLabel="Demandes RH"
                columns={requestColumns}
                rows={content.requests}
                getRowKey={({ id }) => id}
                state={content.requests.length ? 'ready' : 'empty'}
                emptyLabel="Aucune demande RH."
              />
            </>
          ) : null}

          {view === 'admin' && canReview ? (
            <ErpOperationalTable
              ariaLabel="Validation des demandes RH"
              columns={adminColumns}
              rows={adminRequests}
              getRowKey={({ id }) => id}
              state={adminRequests.length ? 'ready' : 'empty'}
              emptyLabel="Aucune demande à traiter."
            />
          ) : null}
        </>
      ) : null}
    </ErpPageShell>
  );
};
