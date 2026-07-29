import {
  ErpOperationalTable,
  type ErpOperationalTableColumn,
} from '@/erp-maroc/components/ErpOperationalTable';
import { ErpStatusBadge } from '@/erp-maroc/components/ErpStatusBadge';
import { useErpMarocContext } from '@/erp-maroc/context/useErpMarocContext';
import { erpMarocPaths } from '@/erp-maroc/navigation/erpMarocPaths';
import { styled } from '@linaria/react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  hrAttendanceMonthSchema,
  hrCalendarDaySchema,
  hrMoroccoHolidaySeedResultSchema,
  hrTimeEntrySchema,
  hrWorkCalendarListSchema,
  hrWorkCalendarSchema,
  hrWorkScheduleAssignmentSchema,
  hrWorkScheduleListSchema,
  hrWorkScheduleSchema,
  type HrAttendanceEmployeeMonth,
  type HrAttendanceMonth,
  type HrCalendarDayType,
  type HrEmployeeListItem,
  type HrTeam,
  type HrTimeEntryType,
  type HrTimeWorkMode,
  type HrWorkCalendar,
  type HrWorkSchedule,
} from 'twenty-shared/erp-maroc';
import { IconChevronRight, IconPlus, IconRefresh } from 'twenty-ui/display';
import { Button } from 'twenty-ui/input';
import { themeCssVariables } from 'twenty-ui/theme-constants';

type Props = {
  employees: HrEmployeeListItem[];
  teams: HrTeam[];
  canWrite: boolean;
  query: string;
};

type LoadState = 'loading' | 'ready' | 'error';

const casablancaDateParts = () => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Casablanca',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? '';
  return {
    year: value('year'),
    month: value('month'),
    day: value('day'),
  };
};

const currentMonth = () => {
  const { year, month } = casablancaDateParts();
  return `${year}-${month}`;
};

const currentDate = () => {
  const { year, month, day } = casablancaDateParts();
  return `${year}-${month}-${day}`;
};
const currentLocalInstant = () => {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60_000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 16);
};

const StyledCommands = styled.section`
  border-bottom: 1px solid ${themeCssVariables.border.color.light};
  display: grid;
  grid-template-columns: minmax(420px, 1.5fr) minmax(360px, 1fr) minmax(
      440px,
      1.25fr
    );
  overflow-x: auto;
`;

const StyledCalendarCommands = styled.section`
  border-bottom: 1px solid ${themeCssVariables.border.color.light};
  display: grid;
  grid-template-columns: repeat(3, minmax(360px, 1fr));
  overflow-x: auto;
`;

const StyledCommand = styled.form`
  border-right: 1px solid ${themeCssVariables.border.color.light};
  display: grid;
  gap: ${themeCssVariables.spacing[2]};
  min-width: 360px;
  padding: ${themeCssVariables.spacing[3]};
`;

const StyledCalendarEvents = styled.div`
  border-bottom: 1px solid ${themeCssVariables.border.color.light};
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
`;

const StyledCalendarEvent = styled.div`
  align-items: center;
  border-right: 1px solid ${themeCssVariables.border.color.light};
  display: grid;
  gap: ${themeCssVariables.spacing[2]};
  grid-template-columns: 84px minmax(120px, 1fr) auto;
  min-height: 40px;
  padding: 0 ${themeCssVariables.spacing[3]};
`;

const StyledCalendarEmpty = styled.div`
  color: ${themeCssVariables.font.color.tertiary};
  font-size: ${themeCssVariables.font.size.sm};
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
  grid-template-columns: repeat(3, minmax(100px, 1fr));
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

const StyledDays = styled.div`
  display: flex;
  gap: ${themeCssVariables.spacing[2]};
`;

const StyledDay = styled.label`
  align-items: center;
  color: ${themeCssVariables.font.color.secondary};
  display: flex;
  font-size: ${themeCssVariables.font.size.xs};
  gap: 3px;
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

const StyledPeriod = styled.div`
  align-items: center;
  border-bottom: 1px solid ${themeCssVariables.border.color.light};
  display: flex;
  gap: ${themeCssVariables.spacing[2]};
  justify-content: space-between;
  min-height: 44px;
  padding: 0 ${themeCssVariables.spacing[3]};
`;

const StyledScheduleSummary = styled.span`
  color: ${themeCssVariables.font.color.secondary};
  font-size: ${themeCssVariables.font.size.sm};
`;

const StyledEmployee = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
`;

const StyledMuted = styled.span`
  color: ${themeCssVariables.font.color.tertiary};
  font-size: ${themeCssVariables.font.size.sm};
`;

const StyledActionLink = styled(Link)`
  align-items: center;
  border: 1px solid ${themeCssVariables.border.color.medium};
  border-radius: ${themeCssVariables.border.radius.sm};
  color: ${themeCssVariables.font.color.secondary};
  display: inline-flex;
  height: 28px;
  justify-content: center;
  text-decoration: none;
  width: 28px;
`;

const parseMinute = (value: string) => {
  const [hour, minute] = value.split(':').map(Number);
  return hour * 60 + minute;
};

const formatDuration = (minutes: number) =>
  `${Math.floor(minutes / 60)} h ${String(minutes % 60).padStart(2, '0')}`;

const weekdayLabels = [
  ['Lun', 1],
  ['Mar', 2],
  ['Mer', 3],
  ['Jeu', 4],
  ['Ven', 5],
  ['Sam', 6],
  ['Dim', 7],
] as const;

const typeLabels: Record<HrTimeEntryType, string> = {
  CLOCK_IN: 'Entrée',
  CLOCK_OUT: 'Sortie',
  BREAK_START: 'Début pause',
  BREAK_END: 'Fin pause',
};

const calendarDayTypeLabels: Record<HrCalendarDayType, string> = {
  NATIONAL_HOLIDAY: 'Fête nationale',
  RELIGIOUS_HOLIDAY: 'Fête religieuse',
  COMPANY_CLOSURE: 'Fermeture',
  WORKING_EXCEPTION: 'Ouverture exceptionnelle',
};

export const HrTimeAttendancePanel = ({
  employees,
  teams,
  canWrite,
  query,
}: Props) => {
  const { client } = useErpMarocContext();
  const [month, setMonth] = useState(currentMonth);
  const [state, setState] = useState<LoadState>('loading');
  const [attendance, setAttendance] = useState<HrAttendanceMonth | null>(null);
  const [schedules, setSchedules] = useState<HrWorkSchedule[]>([]);
  const [calendars, setCalendars] = useState<HrWorkCalendar[]>([]);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<{
    message: string;
    danger: boolean;
  } | null>(null);
  const [scheduleForm, setScheduleForm] = useState({
    code: 'STD',
    name: 'Horaire standard',
    start: '08:30',
    end: '17:30',
    breakMinutes: '60',
    tolerance: '5',
    weekdays: [1, 2, 3, 4, 5],
  });
  const [calendarForm, setCalendarForm] = useState({
    code: 'MA',
    name: 'Calendrier Maroc',
    teamId: '',
  });
  const [calendarDayForm, setCalendarDayForm] = useState<{
    workCalendarId: string;
    date: string;
    name: string;
    type: HrCalendarDayType;
    isConfirmed: boolean;
    start: string;
    end: string;
    breakMinutes: string;
  }>({
    workCalendarId: '',
    date: currentDate(),
    name: '',
    type: 'RELIGIOUS_HOLIDAY',
    isConfirmed: false,
    start: '08:30',
    end: '17:30',
    breakMinutes: '60',
  });
  const [assignmentForm, setAssignmentForm] = useState({
    employeeId: '',
    workScheduleId: '',
    validFrom: currentDate(),
  });
  const [entryForm, setEntryForm] = useState<{
    employeeId: string;
    type: HrTimeEntryType;
    occurredAt: string;
    workMode: HrTimeWorkMode;
  }>({
    employeeId: '',
    type: 'CLOCK_IN',
    occurredAt: currentLocalInstant(),
    workMode: 'ONSITE',
  });

  const load = useCallback(async () => {
    setState('loading');
    try {
      const [nextAttendance, nextSchedules, nextCalendars] = await Promise.all([
        client.request({
          method: 'GET',
          path: '/hr-attendance/monthly',
          query: { month },
          schema: hrAttendanceMonthSchema,
        }),
        client.request({
          method: 'GET',
          path: '/hr-attendance/work-schedules',
          schema: hrWorkScheduleListSchema,
        }),
        client.request({
          method: 'GET',
          path: '/hr-attendance/work-calendars',
          query: { year: month.slice(0, 4) },
          schema: hrWorkCalendarListSchema,
        }),
      ]);
      setAttendance(nextAttendance);
      setSchedules(nextSchedules);
      setCalendars(nextCalendars);
      setAssignmentForm((current) => ({
        ...current,
        employeeId: current.employeeId || employees[0]?.id || '',
        workScheduleId:
          current.workScheduleId ||
          nextSchedules.find(({ isActive }) => isActive)?.id ||
          '',
      }));
      setEntryForm((current) => ({
        ...current,
        employeeId: current.employeeId || employees[0]?.id || '',
      }));
      setCalendarDayForm((current) => ({
        ...current,
        workCalendarId:
          current.workCalendarId ||
          nextCalendars.find(({ isActive }) => isActive)?.id ||
          '',
      }));
      setState('ready');
    } catch {
      setState('error');
    }
  }, [client, employees, month]);

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
          "L'opération n'a pas abouti. Vérifiez les dates et les chevauchements.",
        danger: true,
      });
    } finally {
      setBusy(false);
    }
  };

  const createCalendar = async () => {
    await execute(
      {
        method: 'POST',
        path: '/hr-attendance/work-calendars',
        schema: hrWorkCalendarSchema,
        body: {
          code: calendarForm.code,
          name: calendarForm.name,
          timezone: 'Africa/Casablanca',
          teamId: calendarForm.teamId || null,
        },
      },
      'Calendrier de travail créé.',
    );
  };

  const upsertCalendarDay = async () => {
    if (!calendarDayForm.workCalendarId || !calendarDayForm.name) return;
    const isWorkingDay = calendarDayForm.type === 'WORKING_EXCEPTION';
    await execute(
      {
        method: 'POST',
        path: `/hr-attendance/work-calendars/${calendarDayForm.workCalendarId}/days`,
        schema: hrCalendarDaySchema,
        body: {
          date: calendarDayForm.date,
          name: calendarDayForm.name,
          type: calendarDayForm.type,
          isWorkingDay,
          isConfirmed: calendarDayForm.isConfirmed,
          ...(isWorkingDay
            ? {
                startMinute: parseMinute(calendarDayForm.start),
                endMinute: parseMinute(calendarDayForm.end),
                breakMinutes: Number(calendarDayForm.breakMinutes),
              }
            : {}),
        },
      },
      'Exception de calendrier enregistrée.',
    );
  };

  const seedMoroccoNationalHolidays = async () => {
    if (!calendarDayForm.workCalendarId) return;
    await execute(
      {
        method: 'POST',
        path: `/hr-attendance/work-calendars/${calendarDayForm.workCalendarId}/morocco-national-holidays`,
        schema: hrMoroccoHolidaySeedResultSchema,
        body: { year: Number(month.slice(0, 4)) },
      },
      'Jours fériés nationaux ajoutés sans écraser les exceptions existantes.',
    );
  };

  const createSchedule = async () => {
    const selected = new Set(scheduleForm.weekdays);
    await execute(
      {
        method: 'POST',
        path: '/hr-attendance/work-schedules',
        schema: hrWorkScheduleSchema,
        body: {
          code: scheduleForm.code,
          name: scheduleForm.name,
          timezone: 'Africa/Casablanca',
          lateToleranceMinutes: Number(scheduleForm.tolerance),
          days: weekdayLabels.map(([, weekday]) =>
            selected.has(weekday)
              ? {
                  weekday,
                  isWorkingDay: true,
                  startMinute: parseMinute(scheduleForm.start),
                  endMinute: parseMinute(scheduleForm.end),
                  breakMinutes: Number(scheduleForm.breakMinutes),
                }
              : { weekday, isWorkingDay: false },
          ),
        },
      },
      'Horaire créé.',
    );
  };

  const assignSchedule = async () => {
    if (!assignmentForm.employeeId || !assignmentForm.workScheduleId) return;
    await execute(
      {
        method: 'POST',
        path: `/hr-attendance/employees/${assignmentForm.employeeId}/work-schedule-assignments`,
        schema: hrWorkScheduleAssignmentSchema,
        body: {
          workScheduleId: assignmentForm.workScheduleId,
          validFrom: assignmentForm.validFrom,
          validTo: null,
        },
      },
      'Horaire affecté au collaborateur.',
    );
  };

  const recordEntry = async () => {
    if (!entryForm.employeeId || !entryForm.occurredAt) return;
    await execute(
      {
        method: 'POST',
        path: '/hr-attendance/time-entries',
        schema: hrTimeEntrySchema,
        body: {
          employeeId: entryForm.employeeId,
          externalId: `manual:${crypto.randomUUID()}`,
          type: entryForm.type,
          source: 'MANUAL',
          workMode: entryForm.workMode,
          occurredAt: new Date(entryForm.occurredAt).toISOString(),
          notes: null,
        },
      },
      'Pointage enregistré.',
    );
  };

  const normalizedQuery = query.trim().toLocaleLowerCase('fr');
  const rows = useMemo(
    () =>
      (attendance?.employees ?? []).filter(({ employee }) =>
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
    [attendance, normalizedQuery],
  );
  const calendarEvents = useMemo(
    () =>
      calendars
        .filter(({ isActive }) => isActive)
        .flatMap((calendar) =>
          calendar.days
            .filter(({ date }) => date.startsWith(month))
            .map((day) => ({ calendar, day })),
        )
        .sort((left, right) => left.day.date.localeCompare(right.day.date)),
    [calendars, month],
  );

  const columns: ErpOperationalTableColumn<HrAttendanceEmployeeMonth>[] = [
    {
      key: 'employee',
      header: 'Collaborateur',
      width: '260px',
      render: ({ employee }) => (
        <StyledEmployee>
          <span>
            {employee.firstName} {employee.lastName}
          </span>
          <StyledMuted>{employee.employeeNumber}</StyledMuted>
        </StyledEmployee>
      ),
    },
    {
      key: 'attendance',
      header: 'Présence',
      width: '190px',
      render: ({ summary }) => (
        <span>
          {summary.presentDays} / {summary.scheduledDays} jour(s)
        </span>
      ),
    },
    {
      key: 'late',
      header: 'Retards',
      width: '170px',
      render: ({ summary }) =>
        summary.lateCount === 0 ? (
          <ErpStatusBadge label="À l’heure" tone="success" />
        ) : (
          <ErpStatusBadge
            label={`${summary.lateCount} · ${summary.lateMinutes} min`}
            tone="warning"
          />
        ),
    },
    {
      key: 'hours',
      header: 'Heures',
      width: '170px',
      render: ({ summary }) => formatDuration(summary.workedMinutes),
    },
    {
      key: 'absence',
      header: 'Absences',
      width: '140px',
      render: ({ summary }) => summary.absentDays,
    },
    {
      key: 'holidays',
      header: 'Fériés',
      width: '120px',
      render: ({ summary }) => summary.holidayDays,
    },
    {
      key: 'anomalies',
      header: 'Anomalies',
      width: '150px',
      render: ({ summary }) => (
        <ErpStatusBadge
          label={String(summary.anomalyCount)}
          tone={summary.anomalyCount === 0 ? 'neutral' : 'danger'}
        />
      ),
    },
    {
      key: 'action',
      header: '',
      width: '60px',
      align: 'right',
      render: ({ employee }) => (
        <StyledActionLink
          to={erpMarocPaths.hrEmployeeDetail.replace(':id', employee.id)}
          title="Ouvrir la fiche salarié"
          aria-label={`Ouvrir la fiche de ${employee.firstName} ${employee.lastName}`}
        >
          <IconChevronRight size={16} />
        </StyledActionLink>
      ),
    },
  ];

  return (
    <>
      {canWrite ? (
        <StyledCalendarCommands>
          <StyledCommand
            onSubmit={(event) => {
              event.preventDefault();
              void createCalendar();
            }}
          >
            <StyledCommandTitle>Nouveau calendrier</StyledCommandTitle>
            <StyledFields>
              <StyledField>
                Code
                <StyledInput
                  value={calendarForm.code}
                  onChange={(event) =>
                    setCalendarForm((current) => ({
                      ...current,
                      code: event.target.value.toUpperCase(),
                    }))
                  }
                />
              </StyledField>
              <StyledField>
                Libellé
                <StyledInput
                  value={calendarForm.name}
                  onChange={(event) =>
                    setCalendarForm((current) => ({
                      ...current,
                      name: event.target.value,
                    }))
                  }
                />
              </StyledField>
              <Button
                title="Créer"
                ariaLabel="Créer le calendrier"
                Icon={IconPlus}
                accent="blue"
                disabled={busy}
                type="submit"
              />
            </StyledFields>
            <StyledField>
              Portée
              <StyledSelect
                value={calendarForm.teamId}
                onChange={(event) =>
                  setCalendarForm((current) => ({
                    ...current,
                    teamId: event.target.value,
                  }))
                }
              >
                <option value="">Toute la société</option>
                {teams
                  .filter(({ isActive }) => isActive)
                  .map((team) => (
                    <option key={team.id} value={team.id}>
                      Équipe · {team.name}
                    </option>
                  ))}
              </StyledSelect>
            </StyledField>
          </StyledCommand>

          <StyledCommand
            onSubmit={(event) => {
              event.preventDefault();
              void upsertCalendarDay();
            }}
          >
            <StyledCommandTitle>Jour férié ou exception</StyledCommandTitle>
            <StyledFields>
              <StyledField>
                Calendrier
                <StyledSelect
                  value={calendarDayForm.workCalendarId}
                  onChange={(event) =>
                    setCalendarDayForm((current) => ({
                      ...current,
                      workCalendarId: event.target.value,
                    }))
                  }
                >
                  <option value="">Sélectionner</option>
                  {calendars
                    .filter(({ isActive }) => isActive)
                    .map((calendar) => (
                      <option key={calendar.id} value={calendar.id}>
                        {calendar.code} · {calendar.team?.name ?? 'Société'}
                      </option>
                    ))}
                </StyledSelect>
              </StyledField>
              <StyledField>
                Date
                <StyledInput
                  type="date"
                  value={calendarDayForm.date}
                  onChange={(event) =>
                    setCalendarDayForm((current) => ({
                      ...current,
                      date: event.target.value,
                    }))
                  }
                />
              </StyledField>
              <StyledField>
                Nature
                <StyledSelect
                  value={calendarDayForm.type}
                  onChange={(event) => {
                    const type = event.target.value as HrCalendarDayType;
                    setCalendarDayForm((current) => ({
                      ...current,
                      type,
                      isConfirmed: type !== 'RELIGIOUS_HOLIDAY',
                    }));
                  }}
                >
                  {Object.entries(calendarDayTypeLabels).map(
                    ([type, label]) => (
                      <option key={type} value={type}>
                        {label}
                      </option>
                    ),
                  )}
                </StyledSelect>
              </StyledField>
            </StyledFields>
            <StyledFields>
              <StyledField>
                Libellé
                <StyledInput
                  value={calendarDayForm.name}
                  onChange={(event) =>
                    setCalendarDayForm((current) => ({
                      ...current,
                      name: event.target.value,
                    }))
                  }
                />
              </StyledField>
              <StyledDay>
                <input
                  type="checkbox"
                  checked={calendarDayForm.isConfirmed}
                  onChange={(event) =>
                    setCalendarDayForm((current) => ({
                      ...current,
                      isConfirmed: event.target.checked,
                    }))
                  }
                />
                Date confirmée
              </StyledDay>
              <Button
                title="Enregistrer"
                ariaLabel="Enregistrer le jour de calendrier"
                Icon={IconPlus}
                accent="blue"
                disabled={busy || calendars.length === 0}
                type="submit"
              />
            </StyledFields>
            {calendarDayForm.type === 'WORKING_EXCEPTION' ? (
              <StyledFields>
                <StyledField>
                  Début
                  <StyledInput
                    type="time"
                    value={calendarDayForm.start}
                    onChange={(event) =>
                      setCalendarDayForm((current) => ({
                        ...current,
                        start: event.target.value,
                      }))
                    }
                  />
                </StyledField>
                <StyledField>
                  Fin
                  <StyledInput
                    type="time"
                    value={calendarDayForm.end}
                    onChange={(event) =>
                      setCalendarDayForm((current) => ({
                        ...current,
                        end: event.target.value,
                      }))
                    }
                  />
                </StyledField>
                <StyledField>
                  Pause
                  <StyledInput
                    type="number"
                    min="0"
                    value={calendarDayForm.breakMinutes}
                    onChange={(event) =>
                      setCalendarDayForm((current) => ({
                        ...current,
                        breakMinutes: event.target.value,
                      }))
                    }
                  />
                </StyledField>
              </StyledFields>
            ) : null}
          </StyledCommand>

          <StyledCommand
            onSubmit={(event) => {
              event.preventDefault();
              void seedMoroccoNationalHolidays();
            }}
          >
            <StyledCommandTitle>
              Calendrier national marocain
            </StyledCommandTitle>
            <StyledField>
              Calendrier
              <StyledSelect
                value={calendarDayForm.workCalendarId}
                onChange={(event) =>
                  setCalendarDayForm((current) => ({
                    ...current,
                    workCalendarId: event.target.value,
                  }))
                }
              >
                <option value="">Sélectionner</option>
                {calendars
                  .filter(({ isActive }) => isActive)
                  .map((calendar) => (
                    <option key={calendar.id} value={calendar.id}>
                      {calendar.code} · {calendar.team?.name ?? 'Société'}
                    </option>
                  ))}
              </StyledSelect>
            </StyledField>
            <StyledFields>
              <StyledField>
                Année
                <StyledInput value={month.slice(0, 4)} readOnly />
              </StyledField>
              <Button
                title="Ajouter les fêtes nationales"
                ariaLabel="Ajouter les fêtes nationales marocaines"
                Icon={IconPlus}
                accent="blue"
                disabled={busy || calendars.length === 0}
                type="submit"
              />
            </StyledFields>
          </StyledCommand>
        </StyledCalendarCommands>
      ) : null}

      <StyledCalendarEvents>
        {calendarEvents.length === 0 ? (
          <StyledCalendarEmpty>
            Aucun jour férié ou exception sur ce mois.
          </StyledCalendarEmpty>
        ) : (
          calendarEvents.map(({ calendar, day }) => (
            <StyledCalendarEvent key={`${calendar.id}:${day.id}`}>
              <span>{day.date.split('-').reverse().join('/')}</span>
              <span>{day.name}</span>
              <ErpStatusBadge
                label={day.isConfirmed ? 'Confirmé' : 'À confirmer'}
                tone={day.isConfirmed ? 'success' : 'warning'}
              />
            </StyledCalendarEvent>
          ))
        )}
      </StyledCalendarEvents>

      {canWrite ? (
        <StyledCommands>
          <StyledCommand
            onSubmit={(event) => {
              event.preventDefault();
              void createSchedule();
            }}
          >
            <StyledCommandTitle>Nouvel horaire</StyledCommandTitle>
            <StyledFields>
              <StyledField>
                Code
                <StyledInput
                  value={scheduleForm.code}
                  onChange={(event) =>
                    setScheduleForm((current) => ({
                      ...current,
                      code: event.target.value.toUpperCase(),
                    }))
                  }
                />
              </StyledField>
              <StyledField>
                Libellé
                <StyledInput
                  value={scheduleForm.name}
                  onChange={(event) =>
                    setScheduleForm((current) => ({
                      ...current,
                      name: event.target.value,
                    }))
                  }
                />
              </StyledField>
              <Button
                title="Créer"
                ariaLabel="Créer l’horaire"
                Icon={IconPlus}
                accent="blue"
                disabled={busy}
                type="submit"
              />
            </StyledFields>
            <StyledFields>
              <StyledField>
                Début
                <StyledInput
                  type="time"
                  value={scheduleForm.start}
                  onChange={(event) =>
                    setScheduleForm((current) => ({
                      ...current,
                      start: event.target.value,
                    }))
                  }
                />
              </StyledField>
              <StyledField>
                Fin
                <StyledInput
                  type="time"
                  value={scheduleForm.end}
                  onChange={(event) =>
                    setScheduleForm((current) => ({
                      ...current,
                      end: event.target.value,
                    }))
                  }
                />
              </StyledField>
              <StyledField>
                Pause (min)
                <StyledInput
                  type="number"
                  min="0"
                  value={scheduleForm.breakMinutes}
                  onChange={(event) =>
                    setScheduleForm((current) => ({
                      ...current,
                      breakMinutes: event.target.value,
                    }))
                  }
                />
              </StyledField>
            </StyledFields>
            <StyledDays>
              {weekdayLabels.map(([label, weekday]) => (
                <StyledDay key={weekday}>
                  <input
                    type="checkbox"
                    checked={scheduleForm.weekdays.includes(weekday)}
                    onChange={() =>
                      setScheduleForm((current) => ({
                        ...current,
                        weekdays: current.weekdays.includes(weekday)
                          ? current.weekdays.filter((day) => day !== weekday)
                          : [...current.weekdays, weekday].sort(),
                      }))
                    }
                  />
                  {label}
                </StyledDay>
              ))}
              <StyledField>
                Tolérance
                <StyledInput
                  type="number"
                  min="0"
                  value={scheduleForm.tolerance}
                  onChange={(event) =>
                    setScheduleForm((current) => ({
                      ...current,
                      tolerance: event.target.value,
                    }))
                  }
                />
              </StyledField>
            </StyledDays>
          </StyledCommand>

          <StyledCommand
            onSubmit={(event) => {
              event.preventDefault();
              void assignSchedule();
            }}
          >
            <StyledCommandTitle>Affecter un horaire</StyledCommandTitle>
            <StyledField>
              Collaborateur
              <StyledSelect
                value={assignmentForm.employeeId}
                onChange={(event) =>
                  setAssignmentForm((current) => ({
                    ...current,
                    employeeId: event.target.value,
                  }))
                }
              >
                {employees.map((employee) => (
                  <option key={employee.id} value={employee.id}>
                    {employee.firstName} {employee.lastName}
                  </option>
                ))}
              </StyledSelect>
            </StyledField>
            <StyledField>
              Horaire
              <StyledSelect
                value={assignmentForm.workScheduleId}
                onChange={(event) =>
                  setAssignmentForm((current) => ({
                    ...current,
                    workScheduleId: event.target.value,
                  }))
                }
              >
                <option value="">Sélectionner</option>
                {schedules
                  .filter(({ isActive }) => isActive)
                  .map((schedule) => (
                    <option key={schedule.id} value={schedule.id}>
                      {schedule.code} · {schedule.name}
                    </option>
                  ))}
              </StyledSelect>
            </StyledField>
            <StyledFields>
              <StyledField>
                À partir du
                <StyledInput
                  type="date"
                  value={assignmentForm.validFrom}
                  onChange={(event) =>
                    setAssignmentForm((current) => ({
                      ...current,
                      validFrom: event.target.value,
                    }))
                  }
                />
              </StyledField>
              <Button
                title="Affecter"
                ariaLabel="Affecter l’horaire"
                Icon={IconPlus}
                accent="blue"
                disabled={busy || schedules.length === 0}
                type="submit"
              />
            </StyledFields>
          </StyledCommand>

          <StyledCommand
            onSubmit={(event) => {
              event.preventDefault();
              void recordEntry();
            }}
          >
            <StyledCommandTitle>Saisie de pointage</StyledCommandTitle>
            <StyledFields>
              <StyledField>
                Collaborateur
                <StyledSelect
                  value={entryForm.employeeId}
                  onChange={(event) =>
                    setEntryForm((current) => ({
                      ...current,
                      employeeId: event.target.value,
                    }))
                  }
                >
                  {employees.map((employee) => (
                    <option key={employee.id} value={employee.id}>
                      {employee.firstName} {employee.lastName}
                    </option>
                  ))}
                </StyledSelect>
              </StyledField>
              <StyledField>
                Événement
                <StyledSelect
                  value={entryForm.type}
                  onChange={(event) =>
                    setEntryForm((current) => ({
                      ...current,
                      type: event.target.value as HrTimeEntryType,
                    }))
                  }
                >
                  {Object.entries(typeLabels).map(([type, label]) => (
                    <option key={type} value={type}>
                      {label}
                    </option>
                  ))}
                </StyledSelect>
              </StyledField>
              <StyledField>
                Mode
                <StyledSelect
                  value={entryForm.workMode}
                  onChange={(event) =>
                    setEntryForm((current) => ({
                      ...current,
                      workMode: event.target.value as HrTimeWorkMode,
                    }))
                  }
                >
                  <option value="ONSITE">Sur site</option>
                  <option value="REMOTE">Télétravail</option>
                  <option value="CLIENT_SITE">Site client</option>
                </StyledSelect>
              </StyledField>
            </StyledFields>
            <StyledFields>
              <StyledField>
                Date et heure
                <StyledInput
                  type="datetime-local"
                  value={entryForm.occurredAt}
                  onChange={(event) =>
                    setEntryForm((current) => ({
                      ...current,
                      occurredAt: event.target.value,
                    }))
                  }
                />
              </StyledField>
              <Button
                title="Enregistrer"
                ariaLabel="Enregistrer le pointage"
                Icon={IconPlus}
                accent="blue"
                disabled={busy}
                type="submit"
              />
            </StyledFields>
          </StyledCommand>
        </StyledCommands>
      ) : null}

      {feedback === null ? null : (
        <StyledFeedback danger={feedback.danger} role="status">
          {feedback.message}
        </StyledFeedback>
      )}

      <StyledPeriod>
        <StyledField>
          Mois
          <StyledInput
            type="month"
            value={month}
            onChange={(event) => setMonth(event.target.value)}
          />
        </StyledField>
        <StyledScheduleSummary>
          {calendars.filter(({ isActive }) => isActive).length} calendrier(s) ·{' '}
          {schedules.length} horaire(s) · {attendance?.employees.length ?? 0}{' '}
          collaborateur(s)
        </StyledScheduleSummary>
        <Button
          title="Actualiser"
          ariaLabel="Actualiser les présences"
          Icon={IconRefresh}
          variant="secondary"
          onClick={() => void load()}
        />
      </StyledPeriod>

      <ErpOperationalTable
        ariaLabel="Présences mensuelles"
        columns={columns}
        rows={rows}
        getRowKey={(row) => row.employee.id}
        state={state}
        loadingLabel="Calcul des présences"
        emptyLabel="Aucune présence pour cette période"
        errorLabel="Impossible de calculer les présences"
        onRetry={() => void load()}
      />
    </>
  );
};
