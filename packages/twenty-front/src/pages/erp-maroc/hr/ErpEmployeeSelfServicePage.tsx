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
import { useCallback, useEffect, useState } from 'react';
import {
  hrDocumentContentSchema,
  hrEmployeeSelfServicePayslipDocumentSchema,
  hrEmployeeSelfServiceSchema,
  type HrEmployeeSelfService,
} from 'twenty-shared/erp-maroc';
import { IconDownload, IconRefresh } from 'twenty-ui/display';
import { Button } from 'twenty-ui/input';
import { themeCssVariables } from 'twenty-ui/theme-constants';

type View = 'overview' | 'documents' | 'payslips' | 'leave' | 'time';
type LoadState = 'loading' | 'ready' | 'error';
type DocumentRow = HrEmployeeSelfService['documents'][number];
type PayslipRow = HrEmployeeSelfService['payslips'][number];
type LeaveRow = HrEmployeeSelfService['leaveRequests'][number];
type TimeRow = HrEmployeeSelfService['timeCorrectionRequests'][number];

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
            <StyledNotice danger>{message}</StyledNotice>
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
            <ErpOperationalTable
              ariaLabel="Mes demandes de congé"
              columns={leaveColumns}
              rows={data.leaveRequests}
              getRowKey={(row) => row.id}
              emptyLabel="Aucune demande de congé"
            />
          ) : (
            <ErpOperationalTable
              ariaLabel="Mes corrections de pointage"
              columns={timeColumns}
              rows={data.timeCorrectionRequests}
              getRowKey={(row) => row.id}
              emptyLabel="Aucune correction de pointage"
            />
          )}
        </>
      )}
    </ErpPageShell>
  );
};
