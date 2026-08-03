import {
  ErpOperationalTable,
  type ErpOperationalTableColumn,
} from '@/erp-maroc/components/ErpOperationalTable';
import { ErpFormDrawer } from '@/erp-maroc/components/ErpFormDrawer';
import { ErpPageShell } from '@/erp-maroc/components/ErpPageShell';
import {
  ErpStatusBadge,
  type ErpStatusTone,
} from '@/erp-maroc/components/ErpStatusBadge';
import { useErpMarocContext } from '@/erp-maroc/context/useErpMarocContext';
import { styled } from '@linaria/react';
import { useCallback, useEffect, useState } from 'react';
import {
  hrDocumentContentSchema,
  hrAttestationRequestSchema,
  hrEmployeeChangeRequestSchema,
  hrEmployeeSelfServicePayslipDocumentSchema,
  hrEmployeeSelfServiceSchema,
  hrLeaveRequestSchema,
  hrNotificationSchema,
  hrPeopleDocumentSchema,
  hrTimeEntryCorrectionRequestSchema,
  type HrTimeEntryCorrectionAction,
  type HrTimeEntryType,
  type HrTimeWorkMode,
  type HrEmployeeSelfService,
} from 'twenty-shared/erp-maroc';
import {
  IconCheck,
  IconDownload,
  IconPlus,
  IconRefresh,
} from 'twenty-ui/display';
import { Button } from 'twenty-ui/input';
import { themeCssVariables } from 'twenty-ui/theme-constants';

type View =
  | 'overview'
  | 'documents'
  | 'payslips'
  | 'leave'
  | 'time'
  | 'services';
type LoadState = 'loading' | 'ready' | 'error';
type DocumentRow = HrEmployeeSelfService['documents'][number];
type PayslipRow = HrEmployeeSelfService['payslips'][number];
type LeaveRow = HrEmployeeSelfService['leaveRequests'][number];
type TimeRow = HrEmployeeSelfService['timeCorrectionRequests'][number];
type ServiceDrawer = 'contact' | 'bank' | 'attestation' | 'sign' | null;

type LeaveForm = {
  policyId: string;
  startDate: string;
  endDate: string;
  eventDate: string;
  eventReference: string;
  reason: string;
  supportingDocumentId: string;
};

type TimeCorrectionForm = {
  action: HrTimeEntryCorrectionAction;
  originalTimeEntryId: string;
  proposedType: HrTimeEntryType;
  proposedOccurredAt: string;
  proposedWorkMode: HrTimeWorkMode;
  proposedNotes: string;
  reason: string;
  supportingDocumentId: string;
};

const StyledMetrics = styled.section`
  border-bottom: 1px solid ${themeCssVariables.border.color.light};
  display: grid;
  flex: 0 0 auto;
  grid-template-columns: repeat(4, minmax(150px, 1fr));
  overflow-x: auto;
`;

const StyledMetric = styled.div`
  border-right: 1px solid ${themeCssVariables.border.color.light};
  display: grid;
  gap: ${themeCssVariables.spacing[1]};
  min-width: 150px;
  padding: ${themeCssVariables.spacing[3]} ${themeCssVariables.spacing[4]};

  &:last-child {
    border-right: 0;
  }
`;

const StyledMetricLabel = styled.span`
  color: ${themeCssVariables.font.color.secondary};
  font-size: ${themeCssVariables.font.size.sm};
`;

const StyledMetricValue = styled.strong`
  color: ${themeCssVariables.font.color.primary};
  font-size: ${themeCssVariables.font.size.xl};
  letter-spacing: 0;
`;

const StyledToolbar = styled.div`
  align-items: center;
  border-bottom: 1px solid ${themeCssVariables.border.color.light};
  display: flex;
  flex: 0 0 auto;
  gap: ${themeCssVariables.spacing[1]};
  min-height: 44px;
  overflow-x: auto;
  padding: 0 ${themeCssVariables.spacing[3]};
`;

const StyledViewActions = styled.div`
  align-items: center;
  border-bottom: 1px solid ${themeCssVariables.border.color.light};
  display: flex;
  justify-content: flex-end;
  min-height: 44px;
  padding: 0 ${themeCssVariables.spacing[3]};
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
  font-size: ${themeCssVariables.font.size.sm};
  font-weight: ${({ active }) =>
    active
      ? themeCssVariables.font.weight.semiBold
      : themeCssVariables.font.weight.regular};
  height: 30px;
  padding: 0 ${themeCssVariables.spacing[2]};
  white-space: nowrap;
`;

const StyledOverview = styled.div`
  display: grid;
  flex: 1 1 auto;
  grid-template-columns: repeat(2, minmax(320px, 1fr));
  min-height: 0;
  overflow: auto;

  @media (max-width: 900px) {
    grid-template-columns: 1fr;
  }
`;

const StyledSection = styled.section`
  border-bottom: 1px solid ${themeCssVariables.border.color.light};
  border-right: 1px solid ${themeCssVariables.border.color.light};
  min-width: 0;
  padding: ${themeCssVariables.spacing[4]};
`;

const StyledSectionTitle = styled.h2`
  color: ${themeCssVariables.font.color.primary};
  font-size: ${themeCssVariables.font.size.md};
  letter-spacing: 0;
  margin: 0 0 ${themeCssVariables.spacing[3]};
`;

const StyledDetails = styled.dl`
  display: grid;
  gap: ${themeCssVariables.spacing[3]};
  grid-template-columns: repeat(2, minmax(0, 1fr));
  margin: 0;
`;

const StyledDetail = styled.div`
  min-width: 0;

  dt {
    color: ${themeCssVariables.font.color.tertiary};
    font-size: ${themeCssVariables.font.size.sm};
    margin-bottom: 3px;
  }

  dd {
    color: ${themeCssVariables.font.color.primary};
    font-size: ${themeCssVariables.font.size.md};
    margin: 0;
    overflow-wrap: anywhere;
  }
`;

const StyledNotice = styled.div<{ danger: boolean }>`
  background: ${({ danger }) =>
    danger
      ? themeCssVariables.tag.background.red
      : themeCssVariables.tag.background.green};
  color: ${({ danger }) =>
    danger ? themeCssVariables.tag.text.red : themeCssVariables.tag.text.green};
  font-size: ${themeCssVariables.font.size.sm};
  padding: ${themeCssVariables.spacing[2]} ${themeCssVariables.spacing[4]};
`;

const StyledDrawerForm = styled.form`
  display: grid;
  gap: ${themeCssVariables.spacing[3]};
  overflow-y: auto;
  padding: ${themeCssVariables.spacing[4]};
`;

const StyledField = styled.label`
  color: ${themeCssVariables.font.color.secondary};
  display: grid;
  font-size: ${themeCssVariables.font.size.sm};
  gap: ${themeCssVariables.spacing[1]};
`;

const fieldStyles = `
  background: ${themeCssVariables.background.primary};
  border: 1px solid ${themeCssVariables.border.color.medium};
  border-radius: ${themeCssVariables.border.radius.sm};
  box-sizing: border-box;
  color: ${themeCssVariables.font.color.primary};
  font: inherit;
  min-height: 34px;
  padding: 0 ${themeCssVariables.spacing[2]};
  width: 100%;
`;

const StyledInput = styled.input`
  ${fieldStyles}
`;

const StyledSelect = styled.select`
  ${fieldStyles}
`;

const StyledTextarea = styled.textarea`
  ${fieldStyles}
  min-height: 88px;
  padding-bottom: ${themeCssVariables.spacing[2]};
  padding-top: ${themeCssVariables.spacing[2]};
  resize: vertical;
`;

const StyledServiceGrid = styled.div`
  display: grid;
  flex: 1 1 auto;
  grid-template-columns: repeat(3, minmax(280px, 1fr));
  min-height: 0;
  overflow: auto;

  @media (max-width: 1000px) {
    grid-template-columns: 1fr;
  }
`;

const StyledServicePanel = styled.section`
  border-right: 1px solid ${themeCssVariables.border.color.light};
  min-width: 0;
`;

const StyledServiceHeader = styled.header`
  align-items: center;
  border-bottom: 1px solid ${themeCssVariables.border.color.light};
  display: flex;
  justify-content: space-between;
  min-height: 48px;
  padding: 0 ${themeCssVariables.spacing[3]};
`;

const StyledServiceTitle = styled.h2`
  color: ${themeCssVariables.font.color.primary};
  font-size: ${themeCssVariables.font.size.md};
  letter-spacing: 0;
  margin: 0;
`;

const StyledServiceRow = styled.div`
  border-bottom: 1px solid ${themeCssVariables.border.color.light};
  display: grid;
  gap: ${themeCssVariables.spacing[2]};
  padding: ${themeCssVariables.spacing[3]};
`;

const StyledServiceMeta = styled.div`
  align-items: center;
  color: ${themeCssVariables.font.color.secondary};
  display: flex;
  font-size: ${themeCssVariables.font.size.sm};
  gap: ${themeCssVariables.spacing[2]};
  justify-content: space-between;
`;

const StyledServiceActions = styled.div`
  display: flex;
  gap: ${themeCssVariables.spacing[1]};
`;

const formatMad = (cents: number) =>
  new Intl.NumberFormat('fr-MA', {
    style: 'currency',
    currency: 'MAD',
  }).format(cents / 100);

const formatDate = (value: string | null) =>
  value === null
    ? '—'
    : new Intl.DateTimeFormat('fr-MA', { dateStyle: 'medium' }).format(
        new Date(`${value.slice(0, 10)}T12:00:00Z`),
      );

const formatDateTime = (value: string) =>
  new Intl.DateTimeFormat('fr-MA', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));

const localDateInput = (date = new Date()) => {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
};

const localDateTimeInput = (date = new Date()) => {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
};

const emptyLeaveForm = (policyId = ''): LeaveForm => ({
  policyId,
  startDate: localDateInput(),
  endDate: localDateInput(),
  eventDate: '',
  eventReference: '',
  reason: '',
  supportingDocumentId: '',
});

const emptyTimeCorrectionForm = (): TimeCorrectionForm => ({
  action: 'ADD',
  originalTimeEntryId: '',
  proposedType: 'CLOCK_IN',
  proposedOccurredAt: localDateTimeInput(),
  proposedWorkMode: 'ONSITE',
  proposedNotes: '',
  reason: '',
  supportingDocumentId: '',
});

const saveBase64 = (
  contentBase64: string,
  mimeType: string,
  filename: string,
) => {
  const bytes = Uint8Array.from(atob(contentBase64), (character) =>
    character.charCodeAt(0),
  );
  const url = URL.createObjectURL(new Blob([bytes], { type: mimeType }));
  const anchor = window.document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
};

const statusTone = (status: string): ErpStatusTone => {
  if (['PAID', 'VALIDATED', 'APPROVED', 'VALID'].includes(status)) {
    return 'success';
  }
  if (['REJECTED', 'EXPIRED', 'MISSING'].includes(status)) return 'danger';
  if (['REQUESTED', 'MANAGER_APPROVED', 'EXPIRING'].includes(status)) {
    return 'warning';
  }
  return 'neutral';
};

const statusLabels: Record<string, string> = {
  PAID: 'Payé',
  VALIDATED: 'Validé',
  APPROVED: 'Approuvé',
  REQUESTED: 'Demandé',
  MANAGER_APPROVED: 'Accord manager',
  REJECTED: 'Refusé',
  CANCELLED: 'Annulé',
  VALID: 'Valide',
  EXPIRING: 'À renouveler',
  EXPIRED: 'Expiré',
  MISSING: 'Manquant',
};

export const ErpEmployeeSelfServicePage = () => {
  const { client } = useErpMarocContext();
  const [data, setData] = useState<HrEmployeeSelfService | null>(null);
  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [view, setView] = useState<View>('overview');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [messageDanger, setMessageDanger] = useState(false);
  const [leaveDrawerOpen, setLeaveDrawerOpen] = useState(false);
  const [timeDrawerOpen, setTimeDrawerOpen] = useState(false);
  const [serviceDrawer, setServiceDrawer] = useState<ServiceDrawer>(null);
  const [serviceTargetId, setServiceTargetId] = useState<string | null>(null);
  const [serviceForm, setServiceForm] = useState<Record<string, string>>({});
  const [leaveForm, setLeaveForm] = useState<LeaveForm>(() => emptyLeaveForm());
  const [timeForm, setTimeForm] = useState<TimeCorrectionForm>(() =>
    emptyTimeCorrectionForm(),
  );

  const load = useCallback(async () => {
    setLoadState('loading');
    try {
      const result = await client.request({
        method: 'GET',
        path: '/hr-self-service/me',
        schema: hrEmployeeSelfServiceSchema,
      });
      setData(result);
      setLoadState('ready');
    } catch {
      setData(null);
      setLoadState('error');
    }
  }, [client]);

  useEffect(() => {
    void load();
  }, [load]);

  const downloadDocument = async (row: DocumentRow) => {
    if (row.latestVersion === null) return;
    setBusy(true);
    setMessage(null);
    try {
      const content = await client.request({
        method: 'GET',
        path: `/hr-self-service/documents/${row.latestVersion.id}/content`,
        schema: hrDocumentContentSchema,
      });
      saveBase64(content.contentBase64, content.mimeType, content.filename);
    } catch {
      setMessage('Téléchargement du document impossible.');
    } finally {
      setBusy(false);
    }
  };

  const downloadPayslip = async (row: PayslipRow) => {
    setBusy(true);
    setMessage(null);
    try {
      const content = await client.request({
        method: 'GET',
        path: `/hr-self-service/payslips/${row.id}/pdf`,
        schema: hrEmployeeSelfServicePayslipDocumentSchema,
      });
      saveBase64(content.contentBase64, content.contentType, content.filename);
    } catch {
      setMessage('Téléchargement du bulletin impossible.');
    } finally {
      setBusy(false);
    }
  };

  const openLeaveRequest = () => {
    setMessage(null);
    setLeaveForm(emptyLeaveForm(data?.leavePolicies[0]?.id));
    setLeaveDrawerOpen(true);
  };

  const submitLeaveRequest = async () => {
    const policy = data?.leavePolicies.find(
      ({ id }) => id === leaveForm.policyId,
    );
    if (
      policy === undefined ||
      leaveForm.startDate === '' ||
      leaveForm.endDate === '' ||
      (policy.eventDateRequired && leaveForm.eventDate === '')
    ) {
      setMessageDanger(true);
      setMessage('Complétez les champs obligatoires de la demande.');
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      const intent = client.createMutationIntent(
        {
          method: 'POST',
          path: '/hr-self-service/leave-requests',
          schema: hrLeaveRequestSchema,
          body: {
            policyId: leaveForm.policyId,
            startDate: leaveForm.startDate,
            endDate: leaveForm.endDate,
            eventDate: leaveForm.eventDate || null,
            eventReference: leaveForm.eventReference || null,
            reason: leaveForm.reason || null,
            supportingDocumentId: leaveForm.supportingDocumentId || null,
          },
        },
        { idempotency: 'required' },
      );
      await intent.execute();
      setLeaveDrawerOpen(false);
      setMessageDanger(false);
      setMessage('Demande de congé enregistrée.');
      await load();
    } catch {
      setMessageDanger(true);
      setMessage(
        'Demande refusée. Vérifiez les dates, le délai et votre solde.',
      );
    } finally {
      setBusy(false);
    }
  };

  const openTimeCorrection = () => {
    setMessage(null);
    setTimeForm(emptyTimeCorrectionForm());
    setTimeDrawerOpen(true);
  };

  const submitTimeCorrection = async () => {
    const needsOriginal = timeForm.action !== 'ADD';
    const needsProposal = timeForm.action !== 'CANCEL';
    if (
      timeForm.reason.trim().length < 3 ||
      (needsOriginal && timeForm.originalTimeEntryId === '') ||
      (needsProposal && timeForm.proposedOccurredAt === '')
    ) {
      setMessageDanger(true);
      setMessage('Complétez le pointage concerné, l’heure et le motif.');
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      const body = {
        action: timeForm.action,
        reason: timeForm.reason,
        ...(needsOriginal
          ? { originalTimeEntryId: timeForm.originalTimeEntryId }
          : {}),
        ...(needsProposal
          ? {
              proposedType: timeForm.proposedType,
              proposedOccurredAt: new Date(
                timeForm.proposedOccurredAt,
              ).toISOString(),
              proposedWorkMode: timeForm.proposedWorkMode,
              proposedNotes: timeForm.proposedNotes || null,
            }
          : {}),
      };
      const intent = client.createMutationIntent(
        {
          method: 'POST',
          path: '/hr-self-service/time-correction-requests',
          schema: hrTimeEntryCorrectionRequestSchema,
          body,
        },
        { idempotency: 'required' },
      );
      const request = await intent.execute();
      if (timeForm.supportingDocumentId !== '') {
        const evidenceIntent = client.createMutationIntent(
          {
            method: 'PATCH',
            path: `/hr-self-service/time-correction-requests/${request.id}/evidence`,
            schema: hrTimeEntryCorrectionRequestSchema,
            body: { documentId: timeForm.supportingDocumentId },
          },
          { idempotency: 'required' },
        );
        await evidenceIntent.execute();
      }
      setTimeDrawerOpen(false);
      setMessageDanger(false);
      setMessage('Demande de correction enregistrée.');
      await load();
    } catch {
      setMessageDanger(true);
      setMessage('Correction refusée. Vérifiez le pointage et la période.');
    } finally {
      setBusy(false);
    }
  };

  const openServiceDrawer = (
    kind: Exclude<ServiceDrawer, null>,
    id?: string,
  ) => {
    setMessage(null);
    setServiceTargetId(id ?? null);
    setServiceForm(
      kind === 'contact'
        ? {
            email: data?.employee.email ?? '',
            phone: data?.employee.phone ?? '',
            address: data?.employee.address ?? '',
            reason: '',
          }
        : kind === 'bank'
          ? {
              bankName: data?.bankAccount?.bankName ?? '',
              accountHolderName:
                data?.bankAccount?.accountHolderName ??
                `${data?.employee.firstName ?? ''} ${data?.employee.lastName ?? ''}`.trim(),
              rib: '',
              reason: '',
            }
          : kind === 'attestation'
            ? { type: 'WORK', purpose: '' }
            : {
                signedName:
                  `${data?.employee.firstName ?? ''} ${data?.employee.lastName ?? ''}`.trim(),
              },
    );
    setServiceDrawer(kind);
  };

  const submitServiceRequest = async () => {
    if (serviceDrawer === null) return;
    setBusy(true);
    setMessage(null);
    try {
      if (serviceDrawer === 'contact' || serviceDrawer === 'bank') {
        const isBank = serviceDrawer === 'bank';
        await client
          .createMutationIntent(
            {
              method: 'POST',
              path: '/hr-self-service/change-requests',
              schema: hrEmployeeChangeRequestSchema,
              body: isBank
                ? {
                    type: 'BANK_ACCOUNT',
                    bankName: serviceForm.bankName,
                    accountHolderName: serviceForm.accountHolderName,
                    rib: serviceForm.rib,
                    reason: serviceForm.reason || null,
                  }
                : {
                    type: 'CONTACT_DETAILS',
                    email: serviceForm.email || null,
                    phone: serviceForm.phone || null,
                    address: serviceForm.address || null,
                    reason: serviceForm.reason || null,
                  },
            },
            { idempotency: 'required' },
          )
          .execute();
      } else if (serviceDrawer === 'attestation') {
        await client
          .createMutationIntent(
            {
              method: 'POST',
              path: '/hr-self-service/attestations',
              schema: hrAttestationRequestSchema,
              body: {
                type: serviceForm.type,
                purpose: serviceForm.purpose || null,
              },
            },
            { idempotency: 'required' },
          )
          .execute();
      } else if (serviceTargetId !== null) {
        await client
          .createMutationIntent(
            {
              method: 'PATCH',
              path: `/hr-self-service/attestations/${serviceTargetId}/sign`,
              schema: hrAttestationRequestSchema,
              body: { signedName: serviceForm.signedName },
            },
            { idempotency: 'forbidden' },
          )
          .execute();
      }
      setServiceDrawer(null);
      setMessageDanger(false);
      setMessage('Demande enregistrée et transmise aux RH.');
      await load();
    } catch {
      setMessageDanger(true);
      setMessage('Demande impossible. Vérifiez les informations saisies.');
    } finally {
      setBusy(false);
    }
  };

  const acknowledgeAttestation = async (id: string) => {
    setBusy(true);
    try {
      await client
        .createMutationIntent(
          {
            method: 'PATCH',
            path: `/hr-self-service/attestations/${id}/acknowledge`,
            schema: hrAttestationRequestSchema,
            body: {},
          },
          { idempotency: 'forbidden' },
        )
        .execute();
      await load();
    } finally {
      setBusy(false);
    }
  };

  const downloadAttestation = async (id: string) => {
    setBusy(true);
    try {
      const document = await client.request({
        method: 'GET',
        path: `/hr-self-service/attestations/${id}/content`,
        schema: hrPeopleDocumentSchema,
      });
      saveBase64(document.contentBase64, document.mimeType, document.filename);
    } finally {
      setBusy(false);
    }
  };

  const markNotificationRead = async (id: string) => {
    await client
      .createMutationIntent(
        {
          method: 'PATCH',
          path: `/hr-self-service/notifications/${id}/read`,
          schema: hrNotificationSchema,
          body: {},
        },
        { idempotency: 'forbidden' },
      )
      .execute();
    await load();
  };

  const currentYear = new Date().getFullYear();
  const currentBalance = data?.leaveBalances.find(
    ({ year }) => year === currentYear,
  );
  const pendingLeaveCount =
    data?.leaveRequests.filter(({ status }) =>
      ['REQUESTED', 'MANAGER_APPROVED'].includes(status),
    ).length ?? 0;
  const documentAlertCount =
    data?.documents.filter(({ status }) =>
      ['MISSING', 'EXPIRING', 'EXPIRED'].includes(status),
    ).length ?? 0;
  const selectedLeavePolicy = data?.leavePolicies.find(
    ({ id }) => id === leaveForm.policyId,
  );

  const documentColumns: ErpOperationalTableColumn<DocumentRow>[] = [
    {
      key: 'title',
      header: 'Document',
      width: '280px',
      render: (row) => row.title,
    },
    {
      key: 'category',
      header: 'Catégorie',
      width: '150px',
      render: (row) => row.category,
    },
    {
      key: 'status',
      header: 'État',
      width: '140px',
      render: (row) => (
        <ErpStatusBadge
          label={statusLabels[row.status] ?? row.status}
          tone={statusTone(row.status)}
        />
      ),
    },
    {
      key: 'expiry',
      header: 'Expiration',
      width: '150px',
      render: (row) => formatDate(row.latestVersion?.expiresAt ?? null),
    },
    {
      key: 'action',
      header: '',
      width: '120px',
      align: 'right',
      render: (row) =>
        row.latestVersion === null ? null : (
          <Button
            title="Télécharger"
            ariaLabel={`Télécharger ${row.title}`}
            Icon={IconDownload}
            variant="secondary"
            disabled={busy}
            onClick={() => void downloadDocument(row)}
          />
        ),
    },
  ];

  const payslipColumns: ErpOperationalTableColumn<PayslipRow>[] = [
    {
      key: 'period',
      header: 'Période',
      width: '170px',
      render: (row) => row.periodKey,
    },
    {
      key: 'gross',
      header: 'Brut',
      width: '160px',
      align: 'right',
      render: (row) => formatMad(row.grossSalaryCents),
    },
    {
      key: 'net',
      header: 'Net',
      width: '160px',
      align: 'right',
      render: (row) => formatMad(row.netSalaryCents),
    },
    {
      key: 'status',
      header: 'État',
      width: '140px',
      render: (row) => (
        <ErpStatusBadge
          label={statusLabels[row.status] ?? row.status}
          tone={statusTone(row.status)}
        />
      ),
    },
    {
      key: 'action',
      header: '',
      width: '120px',
      align: 'right',
      render: (row) => (
        <Button
          title="Télécharger"
          ariaLabel={`Télécharger le bulletin ${row.periodKey}`}
          Icon={IconDownload}
          variant="secondary"
          disabled={busy}
          onClick={() => void downloadPayslip(row)}
        />
      ),
    },
  ];

  const leaveColumns: ErpOperationalTableColumn<LeaveRow>[] = [
    { key: 'type', header: 'Type', width: '170px', render: (row) => row.type },
    {
      key: 'start',
      header: 'Du',
      width: '140px',
      render: (row) => formatDate(row.startDate),
    },
    {
      key: 'end',
      header: 'Au',
      width: '140px',
      render: (row) => formatDate(row.endDate),
    },
    {
      key: 'days',
      header: 'Jours',
      width: '100px',
      align: 'right',
      render: (row) => row.workingDays.toLocaleString('fr-MA'),
    },
    {
      key: 'status',
      header: 'État',
      width: '160px',
      render: (row) => (
        <ErpStatusBadge
          label={statusLabels[row.status] ?? row.status}
          tone={statusTone(row.status)}
        />
      ),
    },
    {
      key: 'reason',
      header: 'Motif',
      width: '280px',
      render: (row) => row.reason ?? '—',
    },
  ];

  const timeColumns: ErpOperationalTableColumn<TimeRow>[] = [
    {
      key: 'date',
      header: 'Journée',
      width: '150px',
      render: (row) => formatDate(row.targetAttendanceDate),
    },
    {
      key: 'action',
      header: 'Correction',
      width: '150px',
      render: (row) => row.action,
    },
    {
      key: 'reason',
      header: 'Motif',
      width: '320px',
      render: (row) => row.reason,
    },
    {
      key: 'status',
      header: 'État',
      width: '170px',
      render: (row) => (
        <ErpStatusBadge
          label={statusLabels[row.status] ?? row.status}
          tone={statusTone(row.status)}
        />
      ),
    },
  ];

  const pageState =
    loadState === 'loading'
      ? 'loading'
      : loadState === 'error'
        ? 'error'
        : 'ready';

  return (
    <ErpPageShell
      title={
        data === null
          ? 'Mon espace salarié'
          : `${data.employee.firstName} ${data.employee.lastName}`
      }
      description={
        data === null
          ? 'Documents, paie, congés et temps de travail'
          : `${data.employee.employeeNumber} · ${data.employee.jobTitle}`
      }
      state={pageState}
      errorLabel="Votre compte n’est pas encore associé à un dossier salarié."
      onRetry={() => void load()}
      actions={
        <Button
          title="Actualiser"
          ariaLabel="Actualiser mon espace salarié"
          Icon={IconRefresh}
          variant="secondary"
          onClick={() => void load()}
        />
      }
    >
      {data === null ? null : (
        <>
          <StyledMetrics>
            <StyledMetric>
              <StyledMetricLabel>
                Congés disponibles {currentYear}
              </StyledMetricLabel>
              <StyledMetricValue>
                {currentBalance?.availableDays ?? '—'}
              </StyledMetricValue>
            </StyledMetric>
            <StyledMetric>
              <StyledMetricLabel>Demandes en cours</StyledMetricLabel>
              <StyledMetricValue>{pendingLeaveCount}</StyledMetricValue>
            </StyledMetric>
            <StyledMetric>
              <StyledMetricLabel>Bulletins disponibles</StyledMetricLabel>
              <StyledMetricValue>{data.payslips.length}</StyledMetricValue>
            </StyledMetric>
            <StyledMetric>
              <StyledMetricLabel>Documents à traiter</StyledMetricLabel>
              <StyledMetricValue>{documentAlertCount}</StyledMetricValue>
            </StyledMetric>
          </StyledMetrics>
          <StyledToolbar role="tablist" aria-label="Mon espace salarié">
            {(
              [
                ['overview', 'Accueil'],
                ['documents', 'Documents'],
                ['payslips', 'Bulletins'],
                ['leave', 'Congés'],
                ['time', 'Temps de travail'],
                ['services', 'Demandes et notifications'],
              ] as const
            ).map(([key, label]) => (
              <StyledTab
                key={key}
                type="button"
                role="tab"
                active={view === key}
                aria-selected={view === key}
                onClick={() => setView(key)}
              >
                {label}
              </StyledTab>
            ))}
          </StyledToolbar>
          {message === null ? null : (
            <StyledNotice danger={messageDanger}>{message}</StyledNotice>
          )}
          {view === 'overview' ? (
            <StyledOverview>
              <StyledSection>
                <StyledSectionTitle>Mon dossier</StyledSectionTitle>
                <StyledDetails>
                  <StyledDetail>
                    <dt>Matricule</dt>
                    <dd>{data.employee.employeeNumber}</dd>
                  </StyledDetail>
                  <StyledDetail>
                    <dt>Statut</dt>
                    <dd>{data.employee.status}</dd>
                  </StyledDetail>
                  <StyledDetail>
                    <dt>Contrat</dt>
                    <dd>
                      {data.currentContract?.contractNumber ??
                        data.employee.contractType}
                    </dd>
                  </StyledDetail>
                  <StyledDetail>
                    <dt>Embauche</dt>
                    <dd>{formatDate(data.employee.hireDate)}</dd>
                  </StyledDetail>
                  <StyledDetail>
                    <dt>Email</dt>
                    <dd>{data.employee.email ?? '—'}</dd>
                  </StyledDetail>
                  <StyledDetail>
                    <dt>Téléphone</dt>
                    <dd>{data.employee.phone ?? '—'}</dd>
                  </StyledDetail>
                </StyledDetails>
              </StyledSection>
              <StyledSection>
                <StyledSectionTitle>Affectation actuelle</StyledSectionTitle>
                <StyledDetails>
                  <StyledDetail>
                    <dt>Poste</dt>
                    <dd>
                      {data.currentAssignment?.jobPosition?.title ??
                        data.employee.jobTitle}
                    </dd>
                  </StyledDetail>
                  <StyledDetail>
                    <dt>Département</dt>
                    <dd>
                      {data.currentAssignment?.department?.name ??
                        data.employee.department ??
                        '—'}
                    </dd>
                  </StyledDetail>
                  <StyledDetail>
                    <dt>Équipe</dt>
                    <dd>{data.currentAssignment?.team?.name ?? '—'}</dd>
                  </StyledDetail>
                  <StyledDetail>
                    <dt>Lieu</dt>
                    <dd>{data.currentAssignment?.workLocation?.name ?? '—'}</dd>
                  </StyledDetail>
                  <StyledDetail>
                    <dt>RIB</dt>
                    <dd>{data.bankAccount?.maskedRib ?? 'Non renseigné'}</dd>
                  </StyledDetail>
                  <StyledDetail>
                    <dt>Banque</dt>
                    <dd>{data.bankAccount?.bankName ?? '—'}</dd>
                  </StyledDetail>
                </StyledDetails>
              </StyledSection>
              <StyledSection>
                <StyledSectionTitle>Mon matériel</StyledSectionTitle>
                {data.equipmentAssignments.filter(
                  ({ returnedAt }) => returnedAt === null,
                ).length === 0 ? (
                  <span>Aucun matériel actuellement confié.</span>
                ) : (
                  <StyledDetails>
                    {data.equipmentAssignments
                      .filter(({ returnedAt }) => returnedAt === null)
                      .map((assignment) => (
                        <StyledDetail key={assignment.id}>
                          <dt>{assignment.asset.label}</dt>
                          <dd>
                            {assignment.asset.assetTag}
                            {assignment.asset.serialNumber === null
                              ? ''
                              : ` · ${assignment.asset.serialNumber}`}
                          </dd>
                        </StyledDetail>
                      ))}
                  </StyledDetails>
                )}
              </StyledSection>
            </StyledOverview>
          ) : view === 'documents' ? (
            <ErpOperationalTable
              ariaLabel="Mes documents RH"
              columns={documentColumns}
              rows={data.documents}
              getRowKey={(row) => row.id}
              emptyLabel="Aucun document disponible"
            />
          ) : view === 'payslips' ? (
            <ErpOperationalTable
              ariaLabel="Mes bulletins de paie"
              columns={payslipColumns}
              rows={data.payslips}
              getRowKey={(row) => row.id}
              emptyLabel="Aucun bulletin validé"
            />
          ) : view === 'leave' ? (
            <>
              <StyledViewActions>
                <Button
                  title="Nouvelle demande"
                  ariaLabel="Créer une demande de congé"
                  Icon={IconPlus}
                  accent="blue"
                  disabled={data.leavePolicies.length === 0}
                  onClick={openLeaveRequest}
                />
              </StyledViewActions>
              <ErpOperationalTable
                ariaLabel="Mes demandes de congé"
                columns={leaveColumns}
                rows={data.leaveRequests}
                getRowKey={(row) => row.id}
                emptyLabel="Aucune demande de congé"
              />
            </>
          ) : view === 'time' ? (
            <>
              <StyledViewActions>
                <Button
                  title="Nouvelle correction"
                  ariaLabel="Créer une demande de correction de pointage"
                  Icon={IconPlus}
                  accent="blue"
                  onClick={openTimeCorrection}
                />
              </StyledViewActions>
              <ErpOperationalTable
                ariaLabel="Mes corrections de pointage"
                columns={timeColumns}
                rows={data.timeCorrectionRequests}
                getRowKey={(row) => row.id}
                emptyLabel="Aucune correction de pointage"
              />
            </>
          ) : (
            <StyledServiceGrid>
              <StyledServicePanel>
                <StyledServiceHeader>
                  <StyledServiceTitle>Mes modifications</StyledServiceTitle>
                  <StyledServiceActions>
                    <Button
                      title="Coordonnées"
                      ariaLabel="Modifier mes coordonnées"
                      Icon={IconPlus}
                      variant="secondary"
                      onClick={() => openServiceDrawer('contact')}
                    />
                    <Button
                      title="RIB"
                      ariaLabel="Modifier mon RIB"
                      Icon={IconPlus}
                      variant="secondary"
                      onClick={() => openServiceDrawer('bank')}
                    />
                  </StyledServiceActions>
                </StyledServiceHeader>
                {data.changeRequests.map((request) => (
                  <StyledServiceRow key={request.id}>
                    <strong>
                      {request.type === 'BANK_ACCOUNT'
                        ? 'Coordonnées bancaires'
                        : 'Coordonnées personnelles'}
                    </strong>
                    <StyledServiceMeta>
                      <span>{formatDateTime(request.requestedAt)}</span>
                      <ErpStatusBadge
                        label={statusLabels[request.status] ?? request.status}
                        tone={statusTone(request.status)}
                      />
                    </StyledServiceMeta>
                    {request.decisionNote ? (
                      <span>{request.decisionNote}</span>
                    ) : null}
                  </StyledServiceRow>
                ))}
              </StyledServicePanel>
              <StyledServicePanel>
                <StyledServiceHeader>
                  <StyledServiceTitle>Mes attestations</StyledServiceTitle>
                  <Button
                    title="Demander"
                    ariaLabel="Demander une attestation"
                    Icon={IconPlus}
                    accent="blue"
                    onClick={() => openServiceDrawer('attestation')}
                  />
                </StyledServiceHeader>
                {data.attestationRequests.map((request) => (
                  <StyledServiceRow key={request.id}>
                    <strong>
                      {request.type === 'WORK'
                        ? 'Attestation de travail'
                        : 'Attestation de salaire'}
                    </strong>
                    <StyledServiceMeta>
                      <span>{formatDateTime(request.requestedAt)}</span>
                      <ErpStatusBadge
                        label={request.status}
                        tone={statusTone(request.status)}
                      />
                    </StyledServiceMeta>
                    <StyledServiceActions>
                      {['GENERATED', 'ACKNOWLEDGED', 'SIGNED'].includes(
                        request.status,
                      ) ? (
                        <Button
                          title="Télécharger"
                          ariaLabel="Télécharger l’attestation"
                          Icon={IconDownload}
                          variant="secondary"
                          disabled={busy}
                          onClick={() => void downloadAttestation(request.id)}
                        />
                      ) : null}
                      {request.status === 'GENERATED' ? (
                        <Button
                          title="Accuser réception"
                          ariaLabel="Accuser réception de l’attestation"
                          Icon={IconCheck}
                          accent="blue"
                          disabled={busy}
                          onClick={() =>
                            void acknowledgeAttestation(request.id)
                          }
                        />
                      ) : null}
                      {request.status === 'ACKNOWLEDGED' ? (
                        <Button
                          title="Signer"
                          ariaLabel="Signer l’attestation"
                          Icon={IconCheck}
                          accent="blue"
                          disabled={busy}
                          onClick={() => openServiceDrawer('sign', request.id)}
                        />
                      ) : null}
                    </StyledServiceActions>
                  </StyledServiceRow>
                ))}
              </StyledServicePanel>
              <StyledServicePanel>
                <StyledServiceHeader>
                  <StyledServiceTitle>Notifications</StyledServiceTitle>
                </StyledServiceHeader>
                {data.notifications.map((notification) => (
                  <StyledServiceRow key={notification.id}>
                    <strong>{notification.title}</strong>
                    <span>{notification.body}</span>
                    <StyledServiceMeta>
                      <span>{formatDateTime(notification.createdAt)}</span>
                      {notification.status !== 'READ' ? (
                        <Button
                          title="Lu"
                          ariaLabel="Marquer la notification comme lue"
                          Icon={IconCheck}
                          variant="secondary"
                          onClick={() =>
                            void markNotificationRead(notification.id)
                          }
                        />
                      ) : (
                        <ErpStatusBadge label="Lu" tone="success" />
                      )}
                    </StyledServiceMeta>
                  </StyledServiceRow>
                ))}
              </StyledServicePanel>
            </StyledServiceGrid>
          )}

          <ErpFormDrawer
            isOpen={leaveDrawerOpen}
            title="Demande de congé"
            description="La demande suivra le circuit d’approbation RH configuré."
            isBusy={busy}
            onClose={() => setLeaveDrawerOpen(false)}
            footer={
              <>
                <Button
                  title="Annuler"
                  ariaLabel="Fermer la demande de congé"
                  variant="secondary"
                  disabled={busy}
                  onClick={() => setLeaveDrawerOpen(false)}
                />
                <Button
                  title="Envoyer"
                  ariaLabel="Envoyer la demande de congé"
                  Icon={IconCheck}
                  accent="blue"
                  disabled={busy}
                  onClick={() => void submitLeaveRequest()}
                />
              </>
            }
          >
            <StyledDrawerForm
              onSubmit={(event) => {
                event.preventDefault();
                void submitLeaveRequest();
              }}
            >
              <StyledField>
                Type de congé
                <StyledSelect
                  value={leaveForm.policyId}
                  onChange={(event) =>
                    setLeaveForm((current) => ({
                      ...current,
                      policyId: event.target.value,
                    }))
                  }
                >
                  {data.leavePolicies.map((policy) => (
                    <option key={policy.id} value={policy.id}>
                      {policy.name}
                    </option>
                  ))}
                </StyledSelect>
              </StyledField>
              <StyledField>
                Date de début
                <StyledInput
                  type="date"
                  value={leaveForm.startDate}
                  onChange={(event) =>
                    setLeaveForm((current) => ({
                      ...current,
                      startDate: event.target.value,
                    }))
                  }
                />
              </StyledField>
              <StyledField>
                Date de fin
                <StyledInput
                  type="date"
                  min={leaveForm.startDate}
                  value={leaveForm.endDate}
                  onChange={(event) =>
                    setLeaveForm((current) => ({
                      ...current,
                      endDate: event.target.value,
                    }))
                  }
                />
              </StyledField>
              {selectedLeavePolicy?.eventDateRequired ? (
                <>
                  <StyledField>
                    Date de l’événement
                    <StyledInput
                      type="date"
                      value={leaveForm.eventDate}
                      onChange={(event) =>
                        setLeaveForm((current) => ({
                          ...current,
                          eventDate: event.target.value,
                        }))
                      }
                    />
                  </StyledField>
                  <StyledField>
                    Référence de l’événement
                    <StyledInput
                      value={leaveForm.eventReference}
                      onChange={(event) =>
                        setLeaveForm((current) => ({
                          ...current,
                          eventReference: event.target.value,
                        }))
                      }
                    />
                  </StyledField>
                </>
              ) : null}
              <StyledField>
                Justificatif
                <StyledSelect
                  value={leaveForm.supportingDocumentId}
                  onChange={(event) =>
                    setLeaveForm((current) => ({
                      ...current,
                      supportingDocumentId: event.target.value,
                    }))
                  }
                >
                  <option value="">Aucun document</option>
                  {data.documents
                    .filter(({ latestVersion }) => latestVersion !== null)
                    .map((document) => (
                      <option key={document.id} value={document.id}>
                        {document.title}
                      </option>
                    ))}
                </StyledSelect>
              </StyledField>
              <StyledField>
                Motif
                <StyledTextarea
                  value={leaveForm.reason}
                  onChange={(event) =>
                    setLeaveForm((current) => ({
                      ...current,
                      reason: event.target.value,
                    }))
                  }
                />
              </StyledField>
            </StyledDrawerForm>
          </ErpFormDrawer>

          <ErpFormDrawer
            isOpen={timeDrawerOpen}
            title="Correction de pointage"
            description="La correction sera appliquée uniquement après les validations requises."
            isBusy={busy}
            onClose={() => setTimeDrawerOpen(false)}
            footer={
              <>
                <Button
                  title="Annuler"
                  ariaLabel="Fermer la correction de pointage"
                  variant="secondary"
                  disabled={busy}
                  onClick={() => setTimeDrawerOpen(false)}
                />
                <Button
                  title="Envoyer"
                  ariaLabel="Envoyer la correction de pointage"
                  Icon={IconCheck}
                  accent="blue"
                  disabled={busy}
                  onClick={() => void submitTimeCorrection()}
                />
              </>
            }
          >
            <StyledDrawerForm
              onSubmit={(event) => {
                event.preventDefault();
                void submitTimeCorrection();
              }}
            >
              <StyledField>
                Type de correction
                <StyledSelect
                  value={timeForm.action}
                  onChange={(event) =>
                    setTimeForm((current) => ({
                      ...current,
                      action: event.target.value as HrTimeEntryCorrectionAction,
                    }))
                  }
                >
                  <option value="ADD">Ajouter un pointage manquant</option>
                  <option value="REPLACE">Modifier un pointage</option>
                  <option value="CANCEL">Annuler un pointage</option>
                </StyledSelect>
              </StyledField>
              {timeForm.action === 'ADD' ? null : (
                <StyledField>
                  Pointage concerné
                  <StyledSelect
                    value={timeForm.originalTimeEntryId}
                    onChange={(event) =>
                      setTimeForm((current) => ({
                        ...current,
                        originalTimeEntryId: event.target.value,
                      }))
                    }
                  >
                    <option value="">Sélectionner</option>
                    {data.timeEntries.map((entry) => (
                      <option key={entry.id} value={entry.id}>
                        {formatDateTime(entry.occurredAt)} · {entry.type}
                      </option>
                    ))}
                  </StyledSelect>
                </StyledField>
              )}
              {timeForm.action === 'CANCEL' ? null : (
                <>
                  <StyledField>
                    Nouveau type
                    <StyledSelect
                      value={timeForm.proposedType}
                      onChange={(event) =>
                        setTimeForm((current) => ({
                          ...current,
                          proposedType: event.target.value as HrTimeEntryType,
                        }))
                      }
                    >
                      <option value="CLOCK_IN">Entrée</option>
                      <option value="CLOCK_OUT">Sortie</option>
                      <option value="BREAK_START">Début de pause</option>
                      <option value="BREAK_END">Fin de pause</option>
                    </StyledSelect>
                  </StyledField>
                  <StyledField>
                    Date et heure
                    <StyledInput
                      type="datetime-local"
                      value={timeForm.proposedOccurredAt}
                      onChange={(event) =>
                        setTimeForm((current) => ({
                          ...current,
                          proposedOccurredAt: event.target.value,
                        }))
                      }
                    />
                  </StyledField>
                  <StyledField>
                    Mode de travail
                    <StyledSelect
                      value={timeForm.proposedWorkMode}
                      onChange={(event) =>
                        setTimeForm((current) => ({
                          ...current,
                          proposedWorkMode: event.target
                            .value as HrTimeWorkMode,
                        }))
                      }
                    >
                      <option value="ONSITE">Sur site</option>
                      <option value="REMOTE">Télétravail</option>
                      <option value="CLIENT_SITE">Chez un client</option>
                    </StyledSelect>
                  </StyledField>
                  <StyledField>
                    Note sur le pointage
                    <StyledInput
                      value={timeForm.proposedNotes}
                      onChange={(event) =>
                        setTimeForm((current) => ({
                          ...current,
                          proposedNotes: event.target.value,
                        }))
                      }
                    />
                  </StyledField>
                </>
              )}
              <StyledField>
                Justificatif
                <StyledSelect
                  value={timeForm.supportingDocumentId}
                  onChange={(event) =>
                    setTimeForm((current) => ({
                      ...current,
                      supportingDocumentId: event.target.value,
                    }))
                  }
                >
                  <option value="">Aucun document</option>
                  {data.documents
                    .filter(({ latestVersion }) => latestVersion !== null)
                    .map((document) => (
                      <option key={document.id} value={document.id}>
                        {document.title}
                      </option>
                    ))}
                </StyledSelect>
              </StyledField>
              <StyledField>
                Motif
                <StyledTextarea
                  required
                  minLength={3}
                  value={timeForm.reason}
                  onChange={(event) =>
                    setTimeForm((current) => ({
                      ...current,
                      reason: event.target.value,
                    }))
                  }
                />
              </StyledField>
            </StyledDrawerForm>
          </ErpFormDrawer>

          <ErpFormDrawer
            isOpen={serviceDrawer !== null}
            title={
              serviceDrawer === 'contact'
                ? 'Modifier mes coordonnées'
                : serviceDrawer === 'bank'
                  ? 'Modifier mon RIB'
                  : serviceDrawer === 'attestation'
                    ? 'Demander une attestation'
                    : 'Signature interne'
            }
            description="La demande et chaque décision sont conservées dans le journal d’audit."
            isBusy={busy}
            onClose={() => setServiceDrawer(null)}
            footer={
              <>
                <Button
                  title="Annuler"
                  ariaLabel="Annuler la demande"
                  variant="secondary"
                  onClick={() => setServiceDrawer(null)}
                />
                <Button
                  title="Envoyer"
                  ariaLabel="Envoyer la demande"
                  Icon={IconCheck}
                  accent="blue"
                  disabled={busy}
                  onClick={() => void submitServiceRequest()}
                />
              </>
            }
          >
            <StyledDrawerForm
              onSubmit={(event) => {
                event.preventDefault();
                void submitServiceRequest();
              }}
            >
              {serviceDrawer === 'contact' ? (
                <>
                  {['email', 'phone', 'address'].map((field) => (
                    <StyledField key={field}>
                      {field === 'email'
                        ? 'Email'
                        : field === 'phone'
                          ? 'Téléphone'
                          : 'Adresse'}
                      <StyledInput
                        type={field === 'email' ? 'email' : 'text'}
                        value={serviceForm[field] ?? ''}
                        onChange={(event) =>
                          setServiceForm((current) => ({
                            ...current,
                            [field]: event.target.value,
                          }))
                        }
                      />
                    </StyledField>
                  ))}
                  <StyledField>
                    Motif
                    <StyledTextarea
                      value={serviceForm.reason ?? ''}
                      onChange={(event) =>
                        setServiceForm((current) => ({
                          ...current,
                          reason: event.target.value,
                        }))
                      }
                    />
                  </StyledField>
                </>
              ) : null}
              {serviceDrawer === 'bank' ? (
                <>
                  {[
                    ['bankName', 'Banque'],
                    ['accountHolderName', 'Titulaire'],
                    ['rib', 'RIB marocain (24 chiffres)'],
                  ].map(([field, label]) => (
                    <StyledField key={field}>
                      {label}
                      <StyledInput
                        inputMode={field === 'rib' ? 'numeric' : undefined}
                        autoComplete="off"
                        value={serviceForm[field] ?? ''}
                        onChange={(event) =>
                          setServiceForm((current) => ({
                            ...current,
                            [field]: event.target.value,
                          }))
                        }
                      />
                    </StyledField>
                  ))}
                  <StyledField>
                    Motif
                    <StyledTextarea
                      value={serviceForm.reason ?? ''}
                      onChange={(event) =>
                        setServiceForm((current) => ({
                          ...current,
                          reason: event.target.value,
                        }))
                      }
                    />
                  </StyledField>
                </>
              ) : null}
              {serviceDrawer === 'attestation' ? (
                <>
                  <StyledField>
                    Type
                    <StyledSelect
                      value={serviceForm.type ?? 'WORK'}
                      onChange={(event) =>
                        setServiceForm((current) => ({
                          ...current,
                          type: event.target.value,
                        }))
                      }
                    >
                      <option value="WORK">Attestation de travail</option>
                      <option value="SALARY">Attestation de salaire</option>
                    </StyledSelect>
                  </StyledField>
                  <StyledField>
                    Usage prévu
                    <StyledTextarea
                      value={serviceForm.purpose ?? ''}
                      onChange={(event) =>
                        setServiceForm((current) => ({
                          ...current,
                          purpose: event.target.value,
                        }))
                      }
                    />
                  </StyledField>
                </>
              ) : null}
              {serviceDrawer === 'sign' ? (
                <>
                  <StyledNotice danger={false}>
                    Cette signature électronique interne prouve l’accord dans
                    Zowka. Elle ne constitue pas une signature électronique
                    qualifiée.
                  </StyledNotice>
                  <StyledField>
                    Nom légal complet
                    <StyledInput
                      value={serviceForm.signedName ?? ''}
                      onChange={(event) =>
                        setServiceForm((current) => ({
                          ...current,
                          signedName: event.target.value,
                        }))
                      }
                    />
                  </StyledField>
                </>
              ) : null}
            </StyledDrawerForm>
          </ErpFormDrawer>
        </>
      )}
    </ErpPageShell>
  );
};
