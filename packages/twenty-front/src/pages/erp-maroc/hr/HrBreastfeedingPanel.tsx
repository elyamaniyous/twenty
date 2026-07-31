import {
  ErpOperationalTable,
  type ErpOperationalTableColumn,
} from '@/erp-maroc/components/ErpOperationalTable';
import { ErpStatusBadge } from '@/erp-maroc/components/ErpStatusBadge';
import { useErpMarocContext } from '@/erp-maroc/context/useErpMarocContext';
import { styled } from '@linaria/react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  hrBreastfeedingArrangementListSchema,
  hrBreastfeedingArrangementSchema,
  type HrBreastfeedingArrangement,
  type HrEmployeeListItem,
} from 'twenty-shared/erp-maroc';
import { IconCheck, IconPlus, IconX } from 'twenty-ui/display';
import { Button } from 'twenty-ui/input';
import { themeCssVariables } from 'twenty-ui/theme-constants';

type HrBreastfeedingPanelProps = {
  employees: HrEmployeeListItem[];
  canWrite: boolean;
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

const StyledPanel = styled.section`
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  min-height: 0;
`;

const StyledForm = styled.form`
  align-items: end;
  border-bottom: 1px solid ${themeCssVariables.border.color.light};
  display: grid;
  gap: ${themeCssVariables.spacing[2]};
  grid-template-columns:
    minmax(210px, 1.4fr) repeat(3, minmax(125px, 0.7fr)) minmax(180px, 1fr)
    auto auto;
  overflow-x: auto;
  padding: ${themeCssVariables.spacing[3]};
`;

const StyledField = styled.label`
  color: ${themeCssVariables.font.color.secondary};
  display: grid;
  font-size: ${themeCssVariables.font.size.xs};
  gap: ${themeCssVariables.spacing[1]};
  min-width: 110px;
`;

const controlStyles = `
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
  ${controlStyles}
`;

const StyledSelect = styled.select`
  ${controlStyles}
`;

const StyledCheckbox = styled.label`
  align-items: center;
  color: ${themeCssVariables.font.color.secondary};
  display: flex;
  font-size: ${themeCssVariables.font.size.xs};
  gap: ${themeCssVariables.spacing[2]};
  height: 32px;
  white-space: nowrap;
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

const StyledPrimary = styled.div`
  display: grid;
  gap: 2px;
`;

const StyledMuted = styled.span`
  color: ${themeCssVariables.font.color.tertiary};
  font-size: ${themeCssVariables.font.size.xs};
`;

const StyledAction = styled.button`
  background: transparent;
  border: 0;
  color: ${themeCssVariables.color.red};
  cursor: pointer;
  font: inherit;
`;

export const HrBreastfeedingPanel = ({
  employees,
  canWrite,
  query,
}: HrBreastfeedingPanelProps) => {
  const { client } = useErpMarocContext();
  const [state, setState] = useState<LoadState>('loading');
  const [arrangements, setArrangements] = useState<
    HrBreastfeedingArrangement[]
  >([]);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<{
    message: string;
    danger: boolean;
  } | null>(null);
  const [form, setForm] = useState({
    employeeId: '',
    resumedWorkDate: casablancaToday(),
    morningMinutes: '30',
    afternoonMinutes: '30',
    flexibleUse: false,
    notes: '',
  });
  const [endForm, setEndForm] = useState({
    id: '',
    effectiveEndDate: casablancaToday(),
    reason: '',
  });

  const load = useCallback(async () => {
    setState('loading');
    try {
      const next = await client.request({
        method: 'GET',
        path: '/hr-attendance/breastfeeding-arrangements',
        schema: hrBreastfeedingArrangementListSchema,
      });
      setArrangements(next);
      setForm((current) => ({
        ...current,
        employeeId: current.employeeId || employees[0]?.id || '',
      }));
      setState('ready');
    } catch {
      setState('error');
    }
  }, [client, employees]);

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
      setEndForm({ id: '', effectiveEndDate: casablancaToday(), reason: '' });
      await load();
    } catch {
      setFeedback({
        message:
          "L'opération n'a pas abouti. Vérifiez la période et les droits.",
        danger: true,
      });
    } finally {
      setBusy(false);
    }
  };

  const filtered = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase('fr');
    return arrangements.filter(({ employee, status }) =>
      normalized === ''
        ? true
        : [
            employee.employeeNumber,
            employee.firstName,
            employee.lastName,
            status,
          ].some((value) => value.toLocaleLowerCase('fr').includes(normalized)),
    );
  }, [arrangements, query]);

  const columns: ErpOperationalTableColumn<HrBreastfeedingArrangement>[] = [
    {
      key: 'employee',
      header: 'Collaboratrice',
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
      key: 'period',
      header: 'Période légale',
      width: '240px',
      render: ({ resumedWorkDate, legalEndDate }) =>
        `${resumedWorkDate} au ${legalEndDate}`,
    },
    {
      key: 'allowance',
      header: 'Repos rémunéré',
      width: '210px',
      render: ({ morningMinutes, afternoonMinutes, flexibleUse }) =>
        flexibleUse
          ? `${morningMinutes + afternoonMinutes} min flexibles`
          : `${morningMinutes} min matin · ${afternoonMinutes} min après-midi`,
    },
    {
      key: 'status',
      header: 'Statut',
      width: '120px',
      render: ({ status }) => (
        <ErpStatusBadge
          label={status === 'ACTIVE' ? 'Actif' : 'Terminé'}
          tone={status === 'ACTIVE' ? 'success' : 'neutral'}
        />
      ),
    },
    {
      key: 'source',
      header: 'Base',
      width: '250px',
      render: ({ sourceReference }) => sourceReference,
    },
    {
      key: 'action',
      header: '',
      width: '100px',
      align: 'right',
      render: (arrangement) =>
        canWrite && arrangement.status === 'ACTIVE' ? (
          <StyledAction
            type="button"
            onClick={() =>
              setEndForm({
                id: arrangement.id,
                effectiveEndDate: casablancaToday(),
                reason: '',
              })
            }
          >
            Clôturer
          </StyledAction>
        ) : null,
    },
  ];

  return (
    <StyledPanel>
      {canWrite ? (
        <StyledForm
          onSubmit={(event) => {
            event.preventDefault();
            if (!form.employeeId) return;
            void execute(
              {
                method: 'POST',
                path: '/hr-attendance/breastfeeding-arrangements',
                schema: hrBreastfeedingArrangementSchema,
                body: {
                  employeeId: form.employeeId,
                  resumedWorkDate: form.resumedWorkDate,
                  morningMinutes: Number(form.morningMinutes),
                  afternoonMinutes: Number(form.afternoonMinutes),
                  flexibleUse: form.flexibleUse,
                  notes: form.notes || null,
                },
              },
              "L'aménagement a été enregistré.",
            );
          }}
        >
          <StyledField>
            Collaboratrice
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
              {employees.map((employee) => (
                <option key={employee.id} value={employee.id}>
                  {employee.employeeNumber} · {employee.firstName}{' '}
                  {employee.lastName}
                </option>
              ))}
            </StyledSelect>
          </StyledField>
          <StyledField>
            Reprise du travail
            <StyledInput
              type="date"
              required
              value={form.resumedWorkDate}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  resumedWorkDate: event.target.value,
                }))
              }
            />
          </StyledField>
          <StyledField>
            Matin (min)
            <StyledInput
              type="number"
              min="0"
              max="60"
              required
              value={form.morningMinutes}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  morningMinutes: event.target.value,
                }))
              }
            />
          </StyledField>
          <StyledField>
            Après-midi (min)
            <StyledInput
              type="number"
              min="0"
              max="60"
              required
              value={form.afternoonMinutes}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  afternoonMinutes: event.target.value,
                }))
              }
            />
          </StyledField>
          <StyledField>
            Notes
            <StyledInput
              value={form.notes}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  notes: event.target.value,
                }))
              }
            />
          </StyledField>
          <StyledCheckbox>
            <input
              type="checkbox"
              checked={form.flexibleUse}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  flexibleUse: event.target.checked,
                }))
              }
            />
            Heure flexible
          </StyledCheckbox>
          <Button
            title="Créer"
            ariaLabel="Créer l’aménagement d’allaitement"
            Icon={IconPlus}
            accent="blue"
            type="submit"
            disabled={busy || !form.employeeId}
          />
        </StyledForm>
      ) : null}

      {endForm.id ? (
        <StyledForm
          onSubmit={(event) => {
            event.preventDefault();
            void execute(
              {
                method: 'PATCH',
                path: `/hr-attendance/breastfeeding-arrangements/${endForm.id}/end`,
                schema: hrBreastfeedingArrangementSchema,
                body: {
                  effectiveEndDate: endForm.effectiveEndDate,
                  reason: endForm.reason,
                },
              },
              "L'aménagement a été clôturé.",
            );
          }}
        >
          <StyledField>
            Fin effective
            <StyledInput
              type="date"
              required
              value={endForm.effectiveEndDate}
              onChange={(event) =>
                setEndForm((current) => ({
                  ...current,
                  effectiveEndDate: event.target.value,
                }))
              }
            />
          </StyledField>
          <StyledField>
            Motif de clôture
            <StyledInput
              required
              value={endForm.reason}
              onChange={(event) =>
                setEndForm((current) => ({
                  ...current,
                  reason: event.target.value,
                }))
              }
            />
          </StyledField>
          <Button
            title="Confirmer"
            ariaLabel="Confirmer la clôture"
            Icon={IconCheck}
            accent="blue"
            type="submit"
            disabled={busy || !endForm.reason.trim()}
          />
          <Button
            title="Annuler"
            ariaLabel="Annuler la clôture"
            Icon={IconX}
            variant="secondary"
            type="button"
            onClick={() =>
              setEndForm({
                id: '',
                effectiveEndDate: casablancaToday(),
                reason: '',
              })
            }
          />
        </StyledForm>
      ) : null}

      {feedback ? (
        <StyledFeedback danger={feedback.danger}>
          {feedback.message}
        </StyledFeedback>
      ) : null}

      <ErpOperationalTable
        ariaLabel="Aménagements d’allaitement"
        columns={columns}
        rows={filtered}
        getRowKey={(row) => row.id}
        state={state}
        emptyLabel="Aucun aménagement d’allaitement enregistré"
        onRetry={() => void load()}
      />
    </StyledPanel>
  );
};
