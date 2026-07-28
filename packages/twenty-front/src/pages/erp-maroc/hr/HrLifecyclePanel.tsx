import { ErpFormDrawer } from '@/erp-maroc/components/ErpFormDrawer';
import {
  ErpOperationalTable,
  type ErpOperationalTableColumn,
} from '@/erp-maroc/components/ErpOperationalTable';
import { ErpStatusBadge } from '@/erp-maroc/components/ErpStatusBadge';
import { useErpMarocContext } from '@/erp-maroc/context/useErpMarocContext';
import { styled } from '@linaria/react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  hrLifecycleJourneyListSchema,
  hrLifecycleJourneySchema,
  hrLifecycleTaskSchema,
  type HrEmployeeListItem,
  type HrLifecycleJourney,
  type HrLifecycleTaskStatus,
  type HrLifecycleType,
} from 'twenty-shared/erp-maroc';
import {
  IconCheck,
  IconChevronRight,
  IconPlus,
  IconX,
} from 'twenty-ui/display';
import { Button } from 'twenty-ui/input';
import { themeCssVariables } from 'twenty-ui/theme-constants';

type LoadState = 'loading' | 'ready' | 'error';

type HrLifecyclePanelProps = {
  employees: HrEmployeeListItem[];
  canWrite: boolean;
  query: string;
  onChanged: () => Promise<void>;
};

const today = () => new Date().toISOString().slice(0, 10);

const StyledHeader = styled.div`
  align-items: center;
  border-bottom: 1px solid ${themeCssVariables.border.color.light};
  display: flex;
  gap: ${themeCssVariables.spacing[2]};
  justify-content: flex-end;
  min-height: 44px;
  padding: 0 ${themeCssVariables.spacing[3]};
`;

const StyledPrimary = styled.div`
  display: grid;
  gap: 2px;
`;

const StyledSecondary = styled.span`
  color: ${themeCssVariables.font.color.tertiary};
  font-size: ${themeCssVariables.font.size.sm};
`;

const StyledAction = styled.button`
  align-items: center;
  background: transparent;
  border: 1px solid ${themeCssVariables.border.color.medium};
  border-radius: ${themeCssVariables.border.radius.sm};
  color: ${themeCssVariables.font.color.secondary};
  cursor: pointer;
  display: inline-flex;
  height: 30px;
  justify-content: center;
  width: 30px;

  &:hover {
    background: ${themeCssVariables.background.transparent.light};
    color: ${themeCssVariables.font.color.primary};
  }
`;

const StyledForm = styled.form`
  display: grid;
  gap: ${themeCssVariables.spacing[3]};
  overflow-y: auto;
  padding: ${themeCssVariables.spacing[4]};
`;

const StyledMode = styled.div`
  background: ${themeCssVariables.background.secondary};
  border-radius: ${themeCssVariables.border.radius.sm};
  display: grid;
  grid-template-columns: 1fr 1fr;
  padding: 3px;
`;

const StyledModeButton = styled.button<{ active: boolean }>`
  background: ${({ active }) =>
    active ? themeCssVariables.background.primary : 'transparent'};
  border: 0;
  border-radius: ${themeCssVariables.border.radius.sm};
  color: ${themeCssVariables.font.color.primary};
  cursor: pointer;
  font: inherit;
  height: 32px;
`;

const StyledGrid = styled.div`
  display: grid;
  gap: ${themeCssVariables.spacing[3]};
  grid-template-columns: repeat(2, minmax(0, 1fr));
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
  min-height: 84px;
  padding-block: ${themeCssVariables.spacing[2]};
  resize: vertical;
`;

const StyledError = styled.div`
  color: ${themeCssVariables.color.red};
  font-size: ${themeCssVariables.font.size.sm};
`;

const StyledTasks = styled.div`
  display: grid;
  gap: ${themeCssVariables.spacing[2]};
  overflow-y: auto;
  padding: ${themeCssVariables.spacing[3]};
`;

const StyledTask = styled.div`
  align-items: center;
  border-bottom: 1px solid ${themeCssVariables.border.color.light};
  display: grid;
  gap: ${themeCssVariables.spacing[2]};
  grid-template-columns: minmax(0, 1fr) 150px;
  padding: ${themeCssVariables.spacing[2]} 0;
`;

const StyledDetailsSummary = styled.div`
  border-bottom: 1px solid ${themeCssVariables.border.color.light};
  display: grid;
  gap: ${themeCssVariables.spacing[2]};
  grid-template-columns: repeat(3, minmax(0, 1fr));
  padding: ${themeCssVariables.spacing[3]};
`;

const StyledCancel = styled.div`
  border-top: 1px solid ${themeCssVariables.border.color.light};
  display: grid;
  gap: ${themeCssVariables.spacing[2]};
  padding: ${themeCssVariables.spacing[3]};
`;

const typeLabels: Record<HrLifecycleType, string> = {
  HIRING: 'Embauche',
  ONBOARDING: 'Intégration',
  MOBILITY: 'Mobilité',
  OFFBOARDING: 'Départ',
};

const statusLabels: Record<HrLifecycleTaskStatus, string> = {
  TODO: 'À faire',
  IN_PROGRESS: 'En cours',
  COMPLETED: 'Terminé',
  SKIPPED: 'Non applicable',
};

const journeyTone = (status: HrLifecycleJourney['status']) =>
  status === 'ACTIVE'
    ? ('warning' as const)
    : status === 'COMPLETED'
      ? ('success' as const)
      : ('neutral' as const);

const defaultForm = () => ({
  mode: 'HIRING' as 'HIRING' | 'JOURNEY',
  employeeId: '',
  type: 'ONBOARDING' as Exclude<HrLifecycleType, 'HIRING'>,
  employeeNumber: '',
  firstName: '',
  lastName: '',
  email: '',
  jobTitle: '',
  department: '',
  contractType: 'CDI',
  baseSalaryMad: '',
  startDate: today(),
  targetDate: today(),
  notes: '',
});

export const HrLifecyclePanel = ({
  employees,
  canWrite,
  query,
  onChanged,
}: HrLifecyclePanelProps) => {
  const { client } = useErpMarocContext();
  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [journeys, setJourneys] = useState<HrLifecycleJourney[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [form, setForm] = useState(defaultForm);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cancellationReason, setCancellationReason] = useState('');

  const load = useCallback(async () => {
    setLoadState('loading');
    try {
      const next = await client.request({
        method: 'GET',
        path: '/hr-core/lifecycle-journeys',
        schema: hrLifecycleJourneyListSchema,
      });
      setJourneys(next);
      setLoadState('ready');
    } catch {
      setLoadState('error');
    }
  }, [client]);

  useEffect(() => {
    void load();
  }, [load]);

  const selected =
    journeys.find((journey) => journey.id === selectedId) ?? null;

  const filtered = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase('fr');
    if (normalized === '') return journeys;
    return journeys.filter((journey) =>
      [
        journey.title,
        typeLabels[journey.type],
        journey.employee.employeeNumber,
        journey.employee.firstName,
        journey.employee.lastName,
      ].some((value) => value.toLocaleLowerCase('fr').includes(normalized)),
    );
  }, [journeys, query]);

  const refresh = async () => {
    await Promise.all([load(), onChanged()]);
  };

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      const isHiring = form.mode === 'HIRING';
      if (
        (isHiring &&
          (!form.employeeNumber ||
            !form.firstName ||
            !form.lastName ||
            !form.jobTitle ||
            !form.baseSalaryMad)) ||
        (!isHiring && !form.employeeId)
      ) {
        setError('Renseignez tous les champs obligatoires.');
        return;
      }
      const path = isHiring ? '/hr-core/hiring' : '/hr-core/lifecycle-journeys';
      const body = isHiring
        ? {
            employeeNumber: form.employeeNumber,
            firstName: form.firstName,
            lastName: form.lastName,
            email: form.email || null,
            jobTitle: form.jobTitle,
            department: form.department || null,
            contractType: form.contractType,
            baseSalaryCents: Math.round(Number(form.baseSalaryMad) * 100),
            hireDate: form.startDate,
            targetDate: form.targetDate,
            notes: form.notes || null,
          }
        : {
            employeeId: form.employeeId,
            type: form.type,
            startDate: form.startDate,
            targetDate: form.targetDate || null,
            notes: form.notes || null,
          };
      await client
        .createMutationIntent(
          {
            method: 'POST',
            path,
            schema: hrLifecycleJourneySchema,
            body,
          },
          { idempotency: 'required' },
        )
        .execute();
      setCreateOpen(false);
      setForm(defaultForm());
      await refresh();
    } catch {
      setError("Le parcours n'a pas pu être créé.");
    } finally {
      setBusy(false);
    }
  };

  const updateTask = async (taskId: string, status: HrLifecycleTaskStatus) => {
    setBusy(true);
    setError(null);
    try {
      await client
        .createMutationIntent(
          {
            method: 'PATCH',
            path: `/hr-core/lifecycle-tasks/${taskId}`,
            schema: hrLifecycleTaskSchema,
            body: { status },
          },
          { idempotency: 'required' },
        )
        .execute();
      await refresh();
    } catch {
      setError("L'étape n'a pas pu être mise à jour.");
    } finally {
      setBusy(false);
    }
  };

  const transition = async (action: 'COMPLETE' | 'CANCEL') => {
    if (selected === null) return;
    setBusy(true);
    setError(null);
    try {
      await client
        .createMutationIntent(
          {
            method: 'PATCH',
            path: `/hr-core/lifecycle-journeys/${selected.id}/status`,
            schema: hrLifecycleJourneySchema,
            body:
              action === 'COMPLETE'
                ? { action }
                : { action, reason: cancellationReason },
          },
          { idempotency: 'required' },
        )
        .execute();
      setSelectedId(null);
      setCancellationReason('');
      await refresh();
    } catch {
      setError(
        action === 'COMPLETE'
          ? 'Toutes les étapes doivent être terminées ou non applicables.'
          : "L'annulation n'a pas abouti.",
      );
    } finally {
      setBusy(false);
    }
  };

  const columns: ErpOperationalTableColumn<HrLifecycleJourney>[] = [
    {
      key: 'employee',
      header: 'Collaborateur',
      width: '250px',
      render: (journey) => (
        <StyledPrimary>
          <span>
            {journey.employee.firstName} {journey.employee.lastName}
          </span>
          <StyledSecondary>{journey.employee.employeeNumber}</StyledSecondary>
        </StyledPrimary>
      ),
    },
    {
      key: 'journey',
      header: 'Parcours',
      width: '280px',
      render: (journey) => (
        <StyledPrimary>
          <span>{journey.title}</span>
          <StyledSecondary>{typeLabels[journey.type]}</StyledSecondary>
        </StyledPrimary>
      ),
    },
    {
      key: 'progress',
      header: 'Progression',
      width: '150px',
      render: (journey) => {
        const done = journey.tasks.filter((task) =>
          ['COMPLETED', 'SKIPPED'].includes(task.status),
        ).length;
        return `${done} / ${journey.tasks.length}`;
      },
    },
    {
      key: 'target',
      header: 'Date cible',
      width: '140px',
      render: (journey) => journey.targetDate ?? '—',
    },
    {
      key: 'status',
      header: 'Statut',
      width: '140px',
      render: (journey) => (
        <ErpStatusBadge
          label={
            journey.status === 'ACTIVE'
              ? 'En cours'
              : journey.status === 'COMPLETED'
                ? 'Terminé'
                : 'Annulé'
          }
          tone={journeyTone(journey.status)}
        />
      ),
    },
    {
      key: 'action',
      header: '',
      width: '64px',
      align: 'right',
      render: (journey) => (
        <StyledAction
          type="button"
          title="Ouvrir le parcours"
          aria-label={`Ouvrir ${journey.title}`}
          onClick={() => {
            setError(null);
            setSelectedId(journey.id);
          }}
        >
          <IconChevronRight size={16} />
        </StyledAction>
      ),
    },
  ];

  const allTasksDone =
    selected !== null &&
    selected.tasks.every((task) =>
      ['COMPLETED', 'SKIPPED'].includes(task.status),
    );

  return (
    <>
      <StyledHeader>
        {canWrite ? (
          <Button
            title="Nouveau parcours"
            ariaLabel="Créer un parcours RH"
            Icon={IconPlus}
            accent="blue"
            onClick={() => {
              setError(null);
              setForm(defaultForm());
              setCreateOpen(true);
            }}
          />
        ) : null}
      </StyledHeader>
      <ErpOperationalTable
        ariaLabel="Parcours RH"
        columns={columns}
        rows={filtered}
        getRowKey={(row) => row.id}
        state={loadState}
        loadingLabel="Chargement des parcours"
        emptyLabel="Aucun parcours RH"
        errorLabel="Impossible de charger les parcours"
        onRetry={() => void load()}
      />

      <ErpFormDrawer
        isOpen={createOpen}
        title="Nouveau parcours RH"
        description="Une checklist datée sera créée automatiquement."
        isBusy={busy}
        onClose={() => setCreateOpen(false)}
        footer={
          <>
            <Button
              title="Annuler"
              ariaLabel="Annuler"
              variant="secondary"
              disabled={busy}
              onClick={() => setCreateOpen(false)}
            />
            <Button
              title="Créer"
              ariaLabel="Créer le parcours"
              Icon={IconPlus}
              accent="blue"
              disabled={busy}
              onClick={() => void submit()}
            />
          </>
        }
      >
        <StyledForm
          onSubmit={(event) => {
            event.preventDefault();
            void submit();
          }}
        >
          <StyledMode>
            <StyledModeButton
              type="button"
              active={form.mode === 'HIRING'}
              onClick={() =>
                setForm((current) => ({ ...current, mode: 'HIRING' }))
              }
            >
              Nouvelle embauche
            </StyledModeButton>
            <StyledModeButton
              type="button"
              active={form.mode === 'JOURNEY'}
              onClick={() =>
                setForm((current) => ({ ...current, mode: 'JOURNEY' }))
              }
            >
              Salarié existant
            </StyledModeButton>
          </StyledMode>

          {form.mode === 'HIRING' ? (
            <>
              <StyledGrid>
                <StyledField>
                  Matricule *
                  <StyledInput
                    value={form.employeeNumber}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        employeeNumber: event.target.value,
                      }))
                    }
                  />
                </StyledField>
                <StyledField>
                  Contrat *
                  <StyledSelect
                    value={form.contractType}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        contractType: event.target.value,
                      }))
                    }
                  >
                    {['CDI', 'CDD', 'ANAPEC', 'INTERIM', 'STAGE'].map(
                      (type) => (
                        <option key={type}>{type}</option>
                      ),
                    )}
                  </StyledSelect>
                </StyledField>
              </StyledGrid>
              <StyledGrid>
                <StyledField>
                  Prénom *
                  <StyledInput
                    value={form.firstName}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        firstName: event.target.value,
                      }))
                    }
                  />
                </StyledField>
                <StyledField>
                  Nom *
                  <StyledInput
                    value={form.lastName}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        lastName: event.target.value,
                      }))
                    }
                  />
                </StyledField>
              </StyledGrid>
              <StyledField>
                Email professionnel
                <StyledInput
                  type="email"
                  value={form.email}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      email: event.target.value,
                    }))
                  }
                />
              </StyledField>
              <StyledField>
                Fonction *
                <StyledInput
                  value={form.jobTitle}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      jobTitle: event.target.value,
                    }))
                  }
                />
              </StyledField>
              <StyledGrid>
                <StyledField>
                  Département
                  <StyledInput
                    value={form.department}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        department: event.target.value,
                      }))
                    }
                  />
                </StyledField>
                <StyledField>
                  Salaire brut MAD *
                  <StyledInput
                    type="number"
                    min="0"
                    value={form.baseSalaryMad}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        baseSalaryMad: event.target.value,
                      }))
                    }
                  />
                </StyledField>
              </StyledGrid>
            </>
          ) : (
            <>
              <StyledField>
                Collaborateur *
                <StyledSelect
                  value={form.employeeId}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      employeeId: event.target.value,
                    }))
                  }
                >
                  <option value="">Sélectionner</option>
                  {employees
                    .filter((employee) => employee.status === 'ACTIVE')
                    .map((employee) => (
                      <option key={employee.id} value={employee.id}>
                        {employee.firstName} {employee.lastName}
                      </option>
                    ))}
                </StyledSelect>
              </StyledField>
              <StyledField>
                Parcours
                <StyledSelect
                  value={form.type}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      type: event.target.value as typeof current.type,
                    }))
                  }
                >
                  <option value="ONBOARDING">Intégration</option>
                  <option value="MOBILITY">Mobilité</option>
                  <option value="OFFBOARDING">Départ</option>
                </StyledSelect>
              </StyledField>
            </>
          )}
          <StyledGrid>
            <StyledField>
              Date de début
              <StyledInput
                type="date"
                value={form.startDate}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    startDate: event.target.value,
                  }))
                }
              />
            </StyledField>
            <StyledField>
              Date cible
              <StyledInput
                type="date"
                value={form.targetDate}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    targetDate: event.target.value,
                  }))
                }
              />
            </StyledField>
          </StyledGrid>
          <StyledField>
            Notes
            <StyledTextarea
              value={form.notes}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  notes: event.target.value,
                }))
              }
            />
          </StyledField>
          {error ? <StyledError>{error}</StyledError> : null}
        </StyledForm>
      </ErpFormDrawer>

      <ErpFormDrawer
        isOpen={selected !== null}
        title={selected?.title ?? 'Parcours RH'}
        description="Validez chaque étape avant de finaliser le parcours."
        isBusy={busy}
        onClose={() => setSelectedId(null)}
        footer={
          selected?.status === 'ACTIVE' && canWrite ? (
            <>
              <Button
                title="Annuler le parcours"
                ariaLabel="Annuler le parcours"
                Icon={IconX}
                accent="danger"
                disabled={busy || cancellationReason.trim() === ''}
                onClick={() => void transition('CANCEL')}
              />
              <Button
                title="Finaliser"
                ariaLabel="Finaliser le parcours"
                Icon={IconCheck}
                accent="blue"
                disabled={busy || !allTasksDone}
                onClick={() => void transition('COMPLETE')}
              />
            </>
          ) : undefined
        }
      >
        {selected ? (
          <>
            <StyledDetailsSummary>
              <StyledPrimary>
                <StyledSecondary>Type</StyledSecondary>
                <span>{typeLabels[selected.type]}</span>
              </StyledPrimary>
              <StyledPrimary>
                <StyledSecondary>Début</StyledSecondary>
                <span>{selected.startDate}</span>
              </StyledPrimary>
              <StyledPrimary>
                <StyledSecondary>Date cible</StyledSecondary>
                <span>{selected.targetDate ?? '—'}</span>
              </StyledPrimary>
            </StyledDetailsSummary>
            <StyledTasks>
              {selected.tasks.map((task) => (
                <StyledTask key={task.id}>
                  <StyledPrimary>
                    <span>{task.title}</span>
                    <StyledSecondary>
                      {task.description} · échéance {task.dueDate ?? '—'}
                    </StyledSecondary>
                  </StyledPrimary>
                  <StyledSelect
                    aria-label={`Statut de ${task.title}`}
                    value={task.status}
                    disabled={busy || !canWrite || selected.status !== 'ACTIVE'}
                    onChange={(event) =>
                      void updateTask(
                        task.id,
                        event.target.value as HrLifecycleTaskStatus,
                      )
                    }
                  >
                    {(Object.keys(statusLabels) as HrLifecycleTaskStatus[]).map(
                      (status) => (
                        <option key={status} value={status}>
                          {statusLabels[status]}
                        </option>
                      ),
                    )}
                  </StyledSelect>
                </StyledTask>
              ))}
              {error ? <StyledError>{error}</StyledError> : null}
            </StyledTasks>
            {selected.status === 'ACTIVE' && canWrite ? (
              <StyledCancel>
                <StyledField>
                  Motif requis uniquement pour annuler le parcours
                  <StyledInput
                    value={cancellationReason}
                    maxLength={500}
                    onChange={(event) =>
                      setCancellationReason(event.target.value)
                    }
                  />
                </StyledField>
              </StyledCancel>
            ) : null}
          </>
        ) : null}
      </ErpFormDrawer>
    </>
  );
};
