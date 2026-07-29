import {
  ErpStatusBadge,
  type ErpStatusTone,
} from '@/erp-maroc/components/ErpStatusBadge';
import { styled } from '@linaria/react';
import { useMemo, useState } from 'react';
import { type HrEmployeeDetail } from 'twenty-shared/erp-maroc';
import { themeCssVariables } from 'twenty-ui/theme-constants';

type Props = {
  employee: HrEmployeeDetail;
};

type View = 'time' | 'leave' | 'payroll' | 'history';

const viewLabels: Record<View, string> = {
  time: 'Temps',
  leave: 'Congés',
  payroll: 'Paie',
  history: 'Historique',
};

const leaveTypeLabels: Record<string, string> = {
  ANNUAL: 'Congé annuel',
  SICK: 'Maladie',
  MATERNITY: 'Maternité',
  PATERNITY: 'Paternité',
  UNPAID: 'Sans solde',
  OTHER: 'Autre',
};

const statusLabels: Record<string, string> = {
  REQUESTED: 'Demandé',
  APPROVED: 'Approuvé',
  REJECTED: 'Rejeté',
  CANCELLED: 'Annulé',
  DRAFT: 'Brouillon',
  VALIDATED: 'Validé',
  PAID: 'Payé',
};

const statusTones: Record<string, ErpStatusTone> = {
  REQUESTED: 'warning',
  APPROVED: 'success',
  REJECTED: 'danger',
  CANCELLED: 'neutral',
  DRAFT: 'neutral',
  VALIDATED: 'warning',
  PAID: 'success',
};

const historyLabels: Record<string, string> = {
  HR_PRIVATE_PROFILE_ACCESSED: 'Dossier privé consulté',
  HR_PRIVATE_PROFILE_UPDATED: 'Dossier privé modifié',
  HR_DEPENDANT_CREATED: 'Personne à charge ajoutée',
  HR_DEPENDANT_UPDATED: 'Personne à charge modifiée',
  HR_EMERGENCY_CONTACT_CREATED: 'Contact d’urgence ajouté',
  HR_EMERGENCY_CONTACT_UPDATED: 'Contact d’urgence modifié',
  HR_BANK_ACCOUNT_REPLACED: 'Compte bancaire remplacé',
  HR_EMPLOYEE_ASSIGNMENT_CREATED: 'Affectation créée',
  HR_EMPLOYEE_ASSIGNMENT_ENDED: 'Affectation terminée',
  HR_EMPLOYEE_DOCUMENT_CREATED: 'Document RH créé',
  HR_EMPLOYEE_DOCUMENT_VERSION_ADDED: 'Version de document ajoutée',
  HR_LIFECYCLE_JOURNEY_CREATED: 'Parcours RH démarré',
  HR_LIFECYCLE_JOURNEY_CANCELLED: 'Parcours RH annulé',
  HR_EMPLOYEE_CRM_LINKED: 'Profil CRM lié',
  HR_EMPLOYEE_CRM_SYNCED: 'Profil CRM synchronisé',
  HR_EMPLOYEE_CRM_UNLINKED: 'Profil CRM délié',
  EMPLOYMENT_CONTRACT_CREATED: 'Contrat créé',
  EMPLOYMENT_CONTRACT_ACTIVATED: 'Contrat activé',
  EMPLOYMENT_CONTRACT_ENDED: 'Contrat terminé',
};

const StyledSection = styled.section`
  border-bottom: 1px solid ${themeCssVariables.border.color.light};
`;

const StyledHeader = styled.header`
  align-items: center;
  display: flex;
  justify-content: space-between;
  min-height: 48px;
  padding: 0 ${themeCssVariables.spacing[4]};
`;

const StyledTitle = styled.h2`
  color: ${themeCssVariables.font.color.primary};
  font-size: ${themeCssVariables.font.size.md};
  letter-spacing: 0;
  margin: 0;
`;

const StyledTabs = styled.div`
  align-items: center;
  display: flex;
  gap: ${themeCssVariables.spacing[1]};
  overflow-x: auto;
`;

const StyledTab = styled.button<{ active: boolean }>`
  background: ${({ active }) =>
    active ? themeCssVariables.background.transparent.light : 'transparent'};
  border: 0;
  border-bottom: 2px solid
    ${({ active }) => (active ? themeCssVariables.color.blue : 'transparent')};
  color: ${({ active }) =>
    active
      ? themeCssVariables.font.color.primary
      : themeCssVariables.font.color.secondary};
  cursor: pointer;
  font: inherit;
  font-size: ${themeCssVariables.font.size.sm};
  height: 36px;
  padding: 0 ${themeCssVariables.spacing[2]};
`;

const StyledMetrics = styled.div`
  background: ${themeCssVariables.background.secondary};
  border-top: 1px solid ${themeCssVariables.border.color.light};
  display: grid;
  grid-template-columns: repeat(4, minmax(140px, 1fr));
  overflow-x: auto;
`;

const StyledMetric = styled.div`
  border-right: 1px solid ${themeCssVariables.border.color.light};
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[1]};
  min-width: 140px;
  padding: ${themeCssVariables.spacing[3]} ${themeCssVariables.spacing[4]};
`;

const StyledMetricValue = styled.strong`
  color: ${themeCssVariables.font.color.primary};
  font-size: ${themeCssVariables.font.size.lg};
  letter-spacing: 0;
`;

const StyledMuted = styled.span`
  color: ${themeCssVariables.font.color.tertiary};
  font-size: ${themeCssVariables.font.size.sm};
`;

const StyledRow = styled.div`
  align-items: center;
  border-top: 1px solid ${themeCssVariables.border.color.light};
  display: grid;
  gap: ${themeCssVariables.spacing[3]};
  grid-template-columns:
    minmax(180px, 1.2fr) minmax(160px, 1fr) minmax(140px, 0.8fr)
    minmax(140px, 0.8fr);
  min-width: 720px;
  min-height: 48px;
  padding: 0 ${themeCssVariables.spacing[4]};
`;

const StyledCell = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
`;

const StyledEmpty = styled.div`
  border-top: 1px solid ${themeCssVariables.border.color.light};
  color: ${themeCssVariables.font.color.secondary};
  padding: ${themeCssVariables.spacing[4]};
`;

const formatMad = (cents: number) =>
  new Intl.NumberFormat('fr-MA', {
    style: 'currency',
    currency: 'MAD',
    maximumFractionDigits: 2,
  }).format(cents / 100);

const formatInstant = (value: string) =>
  new Intl.DateTimeFormat('fr-MA', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));

export const Employee360Tabs = ({ employee }: Props) => {
  const [view, setView] = useState<View>('time');
  const currentYear = new Date().getFullYear();
  const activeContract = employee.employmentContracts.find(
    (contract) =>
      contract.status === 'ACTIVE' || contract.status === 'SUSPENDED',
  );
  const currentBalance =
    employee.leaveBalances.find((balance) => balance.year === currentYear) ??
    employee.leaveBalances[0] ??
    null;
  const approvedLeaveDays = useMemo(
    () =>
      employee.leaveRequests
        .filter((leave) => leave.status === 'APPROVED')
        .reduce((total, leave) => total + leave.workingDays, 0),
    [employee.leaveRequests],
  );

  return (
    <StyledSection>
      <StyledHeader>
        <StyledTitle>Vue salarié 360</StyledTitle>
        <StyledTabs role="tablist" aria-label="Vue salarié 360">
          {(Object.keys(viewLabels) as View[]).map((candidate) => (
            <StyledTab
              key={candidate}
              type="button"
              role="tab"
              active={view === candidate}
              aria-selected={view === candidate}
              onClick={() => setView(candidate)}
            >
              {viewLabels[candidate]}
            </StyledTab>
          ))}
        </StyledTabs>
      </StyledHeader>

      {view === 'time' ? (
        <>
          <StyledMetrics>
            <StyledMetric>
              <StyledMetricValue>
                {activeContract === undefined
                  ? '—'
                  : `${activeContract.weeklyHoursHundredths / 100} h`}
              </StyledMetricValue>
              <StyledMuted>Horaire contractuel hebdomadaire</StyledMuted>
            </StyledMetric>
            <StyledMetric>
              <StyledMetricValue>
                {
                  employee.assignments.filter(
                    (assignment) => assignment.endDate === null,
                  ).length
                }
              </StyledMetricValue>
              <StyledMuted>Affectations actives</StyledMuted>
            </StyledMetric>
            <StyledMetric>
              <StyledMetricValue>
                {activeContract?.startDate ?? '—'}
              </StyledMetricValue>
              <StyledMuted>Début du contrat actif</StyledMuted>
            </StyledMetric>
            <StyledMetric>
              <StyledMetricValue>
                {activeContract?.paymentFrequency ?? '—'}
              </StyledMetricValue>
              <StyledMuted>Fréquence de paie</StyledMuted>
            </StyledMetric>
          </StyledMetrics>
          {employee.assignments.length === 0 ? (
            <StyledEmpty>Aucune affectation historisée.</StyledEmpty>
          ) : (
            employee.assignments.slice(0, 8).map((assignment) => (
              <StyledRow key={assignment.id}>
                <StyledCell>
                  <strong>
                    {assignment.title ??
                      assignment.jobPosition?.title ??
                      'Affectation'}
                  </strong>
                  <StyledMuted>{assignment.type}</StyledMuted>
                </StyledCell>
                <StyledCell>
                  <span>{assignment.department?.name ?? '—'}</span>
                  <StyledMuted>
                    {assignment.team?.name ?? 'Sans équipe'}
                  </StyledMuted>
                </StyledCell>
                <span>
                  {assignment.startDate} → {assignment.endDate ?? 'en cours'}
                </span>
                <span>{assignment.allocationBasisPoints / 100} %</span>
              </StyledRow>
            ))
          )}
        </>
      ) : view === 'leave' ? (
        <>
          <StyledMetrics>
            <StyledMetric>
              <StyledMetricValue>
                {currentBalance?.availableDays ?? '—'}
              </StyledMetricValue>
              <StyledMuted>Jours disponibles</StyledMuted>
            </StyledMetric>
            <StyledMetric>
              <StyledMetricValue>
                {currentBalance?.entitledDays ?? '—'}
              </StyledMetricValue>
              <StyledMuted>Droits annuels</StyledMuted>
            </StyledMetric>
            <StyledMetric>
              <StyledMetricValue>{approvedLeaveDays}</StyledMetricValue>
              <StyledMuted>Jours approuvés visibles</StyledMuted>
            </StyledMetric>
            <StyledMetric>
              <StyledMetricValue>
                {currentBalance?.year ?? currentYear}
              </StyledMetricValue>
              <StyledMuted>Exercice affiché</StyledMuted>
            </StyledMetric>
          </StyledMetrics>
          {employee.leaveRequests.length === 0 ? (
            <StyledEmpty>Aucune demande de congé.</StyledEmpty>
          ) : (
            employee.leaveRequests.slice(0, 12).map((leave) => (
              <StyledRow key={leave.id}>
                <strong>{leaveTypeLabels[leave.type] ?? leave.type}</strong>
                <span>
                  {leave.startDate} → {leave.endDate}
                </span>
                <span>{leave.workingDays} jour(s)</span>
                <ErpStatusBadge
                  label={statusLabels[leave.status] ?? leave.status}
                  tone={statusTones[leave.status] ?? 'neutral'}
                />
              </StyledRow>
            ))
          )}
        </>
      ) : view === 'payroll' ? (
        employee.access.canReadCompensation ? (
          employee.payslips.length === 0 ? (
            <StyledEmpty>Aucun bulletin généré.</StyledEmpty>
          ) : (
            employee.payslips.map((payslip) => (
              <StyledRow key={payslip.id}>
                <StyledCell>
                  <strong>{payslip.periodKey}</strong>
                  <StyledMuted>
                    {payslip.periodStart} → {payslip.periodEnd}
                  </StyledMuted>
                </StyledCell>
                <StyledCell>
                  <strong>{formatMad(payslip.grossSalaryCents)}</strong>
                  <StyledMuted>Brut</StyledMuted>
                </StyledCell>
                <StyledCell>
                  <strong>{formatMad(payslip.netSalaryCents)}</strong>
                  <StyledMuted>Net</StyledMuted>
                </StyledCell>
                <ErpStatusBadge
                  label={statusLabels[payslip.status] ?? payslip.status}
                  tone={statusTones[payslip.status] ?? 'neutral'}
                />
              </StyledRow>
            ))
          )
        ) : (
          <StyledEmpty>
            Les bulletins sont réservés aux rôles autorisés à consulter la
            rémunération.
          </StyledEmpty>
        )
      ) : employee.access.canReadPrivate ? (
        employee.history.length === 0 ? (
          <StyledEmpty>Aucun événement RH journalisé.</StyledEmpty>
        ) : (
          employee.history.map((event) => (
            <StyledRow key={event.id}>
              <strong>
                {historyLabels[event.action] ??
                  event.action.replaceAll('_', ' ').toLocaleLowerCase()}
              </strong>
              <span>{formatInstant(event.createdAt)}</span>
              <StyledCell>
                <StyledMuted>Auteur</StyledMuted>
                <span>{event.actorTwentyUserId ?? 'Système'}</span>
              </StyledCell>
              <span />
            </StyledRow>
          ))
        )
      ) : (
        <StyledEmpty>
          L’historique est réservé aux rôles autorisés à consulter le dossier
          privé.
        </StyledEmpty>
      )}
    </StyledSection>
  );
};
