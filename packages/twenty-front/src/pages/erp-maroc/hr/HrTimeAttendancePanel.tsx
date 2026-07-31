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
  hrShiftRotationAssignmentSchema,
  hrShiftRotationListSchema,
  hrShiftRotationSchema,
  hrWorkPatternChangeRequestListSchema,
  hrWorkPatternChangeRequestSchema,
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
  type HrShiftRotation,
  type HrTeam,
  type HrTimeEntryType,
  type HrTimeWorkMode,
  type HrWorkPatternChangeRequest,
  type HrWorkPatternType,
  type HrWorkCalendar,
  type HrWorkSchedule,
} from 'twenty-shared/erp-maroc';
import {
  IconCheck,
  IconChevronRight,
  IconPlus,
  IconRefresh,
  IconX,
} from 'twenty-ui/display';
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

const StyledRotationCommands = styled.section`
  border-bottom: 1px solid ${themeCssVariables.border.color.light};
  display: grid;
  grid-template-columns: repeat(2, minmax(420px, 1fr));
  overflow-x: auto;
`;

const StyledWorkflow = styled.section`
  border-bottom: 1px solid ${themeCssVariables.border.color.light};
`;

const StyledWorkflowHeader = styled.div`
  align-items: center;
  border-bottom: 1px solid ${themeCssVariables.border.color.light};
  display: flex;
  justify-content: space-between;
  min-height: 44px;
  padding: 0 ${themeCssVariables.spacing[3]};
`;

const StyledWorkflowTitle = styled.strong`
  color: ${themeCssVariables.font.color.primary};
  font-size: ${themeCssVariables.font.size.md};
`;

const StyledCommand = styled.form`
  border-right: 1px solid ${themeCssVariables.border.color.light};
  display: grid;
  gap: ${themeCssVariables.spacing[2]};
  min-width: 360px;
  padding: ${themeCssVariables.spacing[3]};
`;

const StyledChangeForm = styled.form`
  align-items: end;
  border-bottom: 1px solid ${themeCssVariables.border.color.light};
  display: grid;
  gap: ${themeCssVariables.spacing[2]};
  grid-template-columns:
    minmax(190px, 1.1fr) minmax(145px, 0.8fr) minmax(210px, 1.1fr)
    minmax(135px, 0.7fr) minmax(240px, 1.4fr) auto;
  overflow-x: auto;
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

const StyledReviewInput = styled.input`
  ${fieldStyles}
  height: 28px;
  min-width: 150px;
`;

const StyledApprovalActions = styled.div`
  align-items: center;
  display: flex;
  gap: ${themeCssVariables.spacing[1]};
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

const rotationPresets = {
  NIGHT_4X4: {
    label: '4 nuits · 4 repos',
    cycleLengthDays: 8,
    days: Array.from({ length: 8 }, (_, dayOffset) =>
      dayOffset < 4
        ? {
            dayOffset,
            label: 'Nuit',
            isWorkingDay: true,
            startMinute: 22 * 60,
            endMinute: 6 * 60,
            endsNextDay: true,
            breakMinutes: 60,
          }
        : { dayOffset, label: 'Repos', isWorkingDay: false },
    ),
  },
  THREE_SHIFT: {
    label: '2 matin · 2 soir · 2 nuit · 2 repos',
    cycleLengthDays: 8,
    days: Array.from({ length: 8 }, (_, dayOffset) => {
      if (dayOffset < 2) {
        return {
          dayOffset,
          label: 'Matin',
          isWorkingDay: true,
          startMinute: 6 * 60,
          endMinute: 14 * 60,
          endsNextDay: false,
          breakMinutes: 30,
        };
      }
      if (dayOffset < 4) {
        return {
          dayOffset,
          label: 'Soir',
          isWorkingDay: true,
          startMinute: 14 * 60,
          endMinute: 22 * 60,
          endsNextDay: false,
          breakMinutes: 30,
        };
      }
      if (dayOffset < 6) {
        return {
          dayOffset,
          label: 'Nuit',
          isWorkingDay: true,
          startMinute: 22 * 60,
          endMinute: 6 * 60,
          endsNextDay: true,
          breakMinutes: 30,
        };
      }
      return { dayOffset, label: 'Repos', isWorkingDay: false };
    }),
  },
  DAY_5X2: {
    label: '5 jours · 2 repos',
    cycleLengthDays: 7,
    days: Array.from({ length: 7 }, (_, dayOffset) =>
      dayOffset < 5
        ? {
            dayOffset,
            label: 'Jour',
            isWorkingDay: true,
            startMinute: 8 * 60 + 30,
            endMinute: 17 * 60 + 30,
            endsNextDay: false,
            breakMinutes: 60,
          }
        : { dayOffset, label: 'Repos', isWorkingDay: false },
    ),
  },
} as const;

type RotationPreset = keyof typeof rotationPresets;

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
  const [rotations, setRotations] = useState<HrShiftRotation[]>([]);
  const [changeRequests, setChangeRequests] = useState<
    HrWorkPatternChangeRequest[]
  >([]);
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
    endsNextDay: false,
    weekdays: [1, 2, 3, 4, 5],
  });
  const [rotationForm, setRotationForm] = useState<{
    code: string;
    name: string;
    preset: RotationPreset;
    tolerance: string;
  }>({
    code: 'ROT-NUIT',
    name: 'Rotation nuit 4x4',
    preset: 'NIGHT_4X4',
    tolerance: '5',
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
  const [rotationAssignmentForm, setRotationAssignmentForm] = useState({
    employeeId: '',
    rotationId: '',
    validFrom: currentDate(),
    startOffset: '0',
  });
  const [changeRequestForm, setChangeRequestForm] = useState<{
    employeeId: string;
    patternType: HrWorkPatternType;
    patternId: string;
    effectiveFrom: string;
    startOffset: string;
    reason: string;
  }>({
    employeeId: '',
    patternType: 'WORK_SCHEDULE',
    patternId: '',
    effectiveFrom: currentDate(),
    startOffset: '0',
    reason: '',
  });
  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({});
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
      const [
        nextAttendance,
        nextSchedules,
        nextRotations,
        nextCalendars,
        nextChangeRequests,
      ] = await Promise.all([
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
          path: '/hr-attendance/shift-rotations',
          schema: hrShiftRotationListSchema,
        }),
        client.request({
          method: 'GET',
          path: '/hr-attendance/work-calendars',
          query: { year: month.slice(0, 4) },
          schema: hrWorkCalendarListSchema,
        }),
        client.request({
          method: 'GET',
          path: '/hr-attendance/work-pattern-change-requests',
          schema: hrWorkPatternChangeRequestListSchema,
        }),
      ]);
      setAttendance(nextAttendance);
      setSchedules(nextSchedules);
      setRotations(nextRotations);
      setCalendars(nextCalendars);
      setChangeRequests(nextChangeRequests);
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
      setRotationAssignmentForm((current) => ({
        ...current,
        employeeId: current.employeeId || employees[0]?.id || '',
        rotationId:
          current.rotationId ||
          nextRotations.find(({ isActive }) => isActive)?.id ||
          '',
      }));
      setChangeRequestForm((current) => {
        const availablePatterns =
          current.patternType === 'WORK_SCHEDULE'
            ? nextSchedules
            : nextRotations;
        return {
          ...current,
          employeeId: current.employeeId || employees[0]?.id || '',
          patternId: availablePatterns.some(
            ({ id }) => id === current.patternId,
          )
            ? current.patternId
            : (availablePatterns.find(({ isActive }) => isActive)?.id ?? ''),
        };
      });
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
      return true;
    } catch {
      setFeedback({
        message:
          "L'opération n'a pas abouti. Vérifiez les dates et les chevauchements.",
        danger: true,
      });
      return false;
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
                  endsNextDay: scheduleForm.endsNextDay,
                  breakMinutes: Number(scheduleForm.breakMinutes),
                }
              : { weekday, isWorkingDay: false },
          ),
        },
      },
      'Horaire créé.',
    );
  };

  const createRotation = async () => {
    const preset = rotationPresets[rotationForm.preset];
    await execute(
      {
        method: 'POST',
        path: '/hr-attendance/shift-rotations',
        schema: hrShiftRotationSchema,
        body: {
          code: rotationForm.code,
          name: rotationForm.name,
          timezone: 'Africa/Casablanca',
          cycleLengthDays: preset.cycleLengthDays,
          lateToleranceMinutes: Number(rotationForm.tolerance),
          days: preset.days,
        },
      },
      'Cycle de rotation créé.',
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

  const assignRotation = async () => {
    if (
      !rotationAssignmentForm.employeeId ||
      !rotationAssignmentForm.rotationId
    ) {
      return;
    }
    await execute(
      {
        method: 'POST',
        path: `/hr-attendance/employees/${rotationAssignmentForm.employeeId}/shift-rotation-assignments`,
        schema: hrShiftRotationAssignmentSchema,
        body: {
          rotationId: rotationAssignmentForm.rotationId,
          validFrom: rotationAssignmentForm.validFrom,
          validTo: null,
          startOffset: Number(rotationAssignmentForm.startOffset),
        },
      },
      'Rotation affectée au collaborateur.',
    );
  };

  const createChangeRequest = async () => {
    if (
      !changeRequestForm.employeeId ||
      !changeRequestForm.patternId ||
      changeRequestForm.reason.trim().length < 3
    ) {
      return;
    }
    const isSchedule = changeRequestForm.patternType === 'WORK_SCHEDULE';
    const succeeded = await execute(
      {
        method: 'POST',
        path: '/hr-attendance/work-pattern-change-requests',
        schema: hrWorkPatternChangeRequestSchema,
        body: {
          employeeId: changeRequestForm.employeeId,
          patternType: changeRequestForm.patternType,
          effectiveFrom: changeRequestForm.effectiveFrom,
          reason: changeRequestForm.reason.trim(),
          workScheduleId: isSchedule ? changeRequestForm.patternId : null,
          rotationId: isSchedule ? null : changeRequestForm.patternId,
          startOffset: isSchedule ? 0 : Number(changeRequestForm.startOffset),
        },
      },
      "Demande de changement d'horaire envoyée pour validation.",
    );
    if (succeeded) {
      setChangeRequestForm((current) => ({ ...current, reason: '' }));
    }
  };

  const reviewChangeRequest = async (
    request: HrWorkPatternChangeRequest,
    decision: 'approve' | 'reject',
  ) => {
    const reviewNote = reviewNotes[request.id]?.trim() ?? '';
    if (decision === 'reject' && reviewNote.length < 3) return;
    const succeeded = await execute(
      {
        method: 'PATCH',
        path: `/hr-attendance/work-pattern-change-requests/${request.id}/${decision}`,
        schema: hrWorkPatternChangeRequestSchema,
        body: { reviewNote: reviewNote || null },
      },
      decision === 'approve'
        ? 'Le nouvel horaire est approuvé et affecté.'
        : 'La demande de changement est refusée.',
    );
    if (!succeeded) return;
    setReviewNotes((current) => {
      const next = { ...current };
      delete next[request.id];
      return next;
    });
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

  const changeRequestColumns: ErpOperationalTableColumn<HrWorkPatternChangeRequest>[] =
    [
      {
        key: 'employee',
        header: 'Collaborateur',
        width: '220px',
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
        key: 'pattern',
        header: 'Nouvel horaire',
        width: '240px',
        render: ({ patternType, workSchedule, rotation, startOffset }) => {
          const pattern = workSchedule ?? rotation;
          return (
            <StyledEmployee>
              <span>{pattern?.name ?? 'Configuration indisponible'}</span>
              <StyledMuted>
                {patternType === 'WORK_SCHEDULE'
                  ? `Horaire · ${pattern?.code ?? ''}`
                  : `Rotation · ${pattern?.code ?? ''} · départ J${startOffset + 1}`}
              </StyledMuted>
            </StyledEmployee>
          );
        },
      },
      {
        key: 'effectiveFrom',
        header: "Date d'effet",
        width: '130px',
        render: ({ effectiveFrom }) => effectiveFrom,
      },
      {
        key: 'reason',
        header: 'Motif',
        width: '260px',
        render: ({ reason }) => reason,
      },
      {
        key: 'status',
        header: 'Statut',
        width: '140px',
        render: ({ status }) => (
          <ErpStatusBadge
            label={
              status === 'PENDING'
                ? 'À valider'
                : status === 'APPROVED'
                  ? 'Approuvée'
                  : 'Refusée'
            }
            tone={
              status === 'PENDING'
                ? 'warning'
                : status === 'APPROVED'
                  ? 'success'
                  : 'danger'
            }
          />
        ),
      },
      {
        key: 'review',
        header: 'Validation',
        width: '310px',
        render: (request) =>
          canWrite && request.status === 'PENDING' ? (
            <StyledApprovalActions>
              <StyledReviewInput
                aria-label={`Commentaire pour ${request.employee.firstName} ${request.employee.lastName}`}
                placeholder="Motif si refus"
                value={reviewNotes[request.id] ?? ''}
                onChange={(event) =>
                  setReviewNotes((current) => ({
                    ...current,
                    [request.id]: event.target.value,
                  }))
                }
              />
              <Button
                title="Approuver"
                ariaLabel="Approuver le changement d'horaire"
                Icon={IconCheck}
                accent="blue"
                disabled={busy}
                onClick={() => void reviewChangeRequest(request, 'approve')}
              />
              <Button
                title="Refuser"
                ariaLabel="Refuser le changement d'horaire"
                Icon={IconX}
                accent="danger"
                disabled={
                  busy || (reviewNotes[request.id]?.trim().length ?? 0) < 3
                }
                onClick={() => void reviewChangeRequest(request, 'reject')}
              />
            </StyledApprovalActions>
          ) : (
            <StyledMuted>
              {request.reviewNote ??
                (request.status === 'PENDING'
                  ? 'En attente'
                  : 'Sans commentaire')}
            </StyledMuted>
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
              <StyledDay>
                <input
                  type="checkbox"
                  checked={scheduleForm.endsNextDay}
                  onChange={(event) =>
                    setScheduleForm((current) => ({
                      ...current,
                      endsNextDay: event.target.checked,
                    }))
                  }
                />
                Fin le lendemain
              </StyledDay>
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

      {canWrite ? (
        <StyledRotationCommands>
          <StyledCommand
            onSubmit={(event) => {
              event.preventDefault();
              void createRotation();
            }}
          >
            <StyledCommandTitle>Nouveau cycle de rotation</StyledCommandTitle>
            <StyledFields>
              <StyledField>
                Code
                <StyledInput
                  value={rotationForm.code}
                  onChange={(event) =>
                    setRotationForm((current) => ({
                      ...current,
                      code: event.target.value.toUpperCase(),
                    }))
                  }
                />
              </StyledField>
              <StyledField>
                Libellé
                <StyledInput
                  value={rotationForm.name}
                  onChange={(event) =>
                    setRotationForm((current) => ({
                      ...current,
                      name: event.target.value,
                    }))
                  }
                />
              </StyledField>
              <Button
                title="Créer"
                ariaLabel="Créer le cycle de rotation"
                Icon={IconPlus}
                accent="blue"
                disabled={busy}
                type="submit"
              />
            </StyledFields>
            <StyledFields>
              <StyledField>
                Modèle
                <StyledSelect
                  value={rotationForm.preset}
                  onChange={(event) =>
                    setRotationForm((current) => ({
                      ...current,
                      preset: event.target.value as RotationPreset,
                    }))
                  }
                >
                  {Object.entries(rotationPresets).map(([value, preset]) => (
                    <option key={value} value={value}>
                      {preset.label}
                    </option>
                  ))}
                </StyledSelect>
              </StyledField>
              <StyledField>
                Tolérance (min)
                <StyledInput
                  type="number"
                  min="0"
                  max="180"
                  value={rotationForm.tolerance}
                  onChange={(event) =>
                    setRotationForm((current) => ({
                      ...current,
                      tolerance: event.target.value,
                    }))
                  }
                />
              </StyledField>
            </StyledFields>
          </StyledCommand>

          <StyledCommand
            onSubmit={(event) => {
              event.preventDefault();
              void assignRotation();
            }}
          >
            <StyledCommandTitle>Affecter une rotation</StyledCommandTitle>
            <StyledFields>
              <StyledField>
                Collaborateur
                <StyledSelect
                  value={rotationAssignmentForm.employeeId}
                  onChange={(event) =>
                    setRotationAssignmentForm((current) => ({
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
                Cycle
                <StyledSelect
                  value={rotationAssignmentForm.rotationId}
                  onChange={(event) =>
                    setRotationAssignmentForm((current) => ({
                      ...current,
                      rotationId: event.target.value,
                      startOffset: '0',
                    }))
                  }
                >
                  <option value="">Sélectionner</option>
                  {rotations
                    .filter(({ isActive }) => isActive)
                    .map((rotation) => (
                      <option key={rotation.id} value={rotation.id}>
                        {rotation.code} · {rotation.name}
                      </option>
                    ))}
                </StyledSelect>
              </StyledField>
              <StyledField>
                Jour initial
                <StyledInput
                  type="number"
                  min="0"
                  max={String(
                    Math.max(
                      0,
                      (rotations.find(
                        ({ id }) => id === rotationAssignmentForm.rotationId,
                      )?.cycleLengthDays ?? 1) - 1,
                    ),
                  )}
                  value={rotationAssignmentForm.startOffset}
                  onChange={(event) =>
                    setRotationAssignmentForm((current) => ({
                      ...current,
                      startOffset: event.target.value,
                    }))
                  }
                />
              </StyledField>
            </StyledFields>
            <StyledFields>
              <StyledField>
                À partir du
                <StyledInput
                  type="date"
                  value={rotationAssignmentForm.validFrom}
                  onChange={(event) =>
                    setRotationAssignmentForm((current) => ({
                      ...current,
                      validFrom: event.target.value,
                    }))
                  }
                />
              </StyledField>
              <Button
                title="Affecter"
                ariaLabel="Affecter le cycle de rotation"
                Icon={IconPlus}
                accent="blue"
                disabled={busy || rotations.length === 0}
                type="submit"
              />
            </StyledFields>
          </StyledCommand>
        </StyledRotationCommands>
      ) : null}

      <StyledWorkflow>
        <StyledWorkflowHeader>
          <StyledWorkflowTitle>
            Changements d&apos;horaire à valider
          </StyledWorkflowTitle>
          <StyledScheduleSummary>
            {changeRequests.filter(({ status }) => status === 'PENDING').length}{' '}
            demande(s) en attente
          </StyledScheduleSummary>
        </StyledWorkflowHeader>
        {canWrite ? (
          <StyledChangeForm
            onSubmit={(event) => {
              event.preventDefault();
              void createChangeRequest();
            }}
          >
            <StyledField>
              Collaborateur
              <StyledSelect
                value={changeRequestForm.employeeId}
                onChange={(event) =>
                  setChangeRequestForm((current) => ({
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
              Type
              <StyledSelect
                value={changeRequestForm.patternType}
                onChange={(event) => {
                  const patternType = event.target.value as HrWorkPatternType;
                  const patterns =
                    patternType === 'WORK_SCHEDULE' ? schedules : rotations;
                  setChangeRequestForm((current) => ({
                    ...current,
                    patternType,
                    patternId:
                      patterns.find(({ isActive }) => isActive)?.id ?? '',
                    startOffset: '0',
                  }));
                }}
              >
                <option value="WORK_SCHEDULE">Horaire hebdomadaire</option>
                <option value="SHIFT_ROTATION">Cycle de rotation</option>
              </StyledSelect>
            </StyledField>
            <StyledField>
              Nouvel horaire
              <StyledSelect
                value={changeRequestForm.patternId}
                onChange={(event) =>
                  setChangeRequestForm((current) => ({
                    ...current,
                    patternId: event.target.value,
                  }))
                }
              >
                <option value="">Sélectionner</option>
                {(changeRequestForm.patternType === 'WORK_SCHEDULE'
                  ? schedules
                  : rotations
                )
                  .filter(({ isActive }) => isActive)
                  .map((pattern) => (
                    <option key={pattern.id} value={pattern.id}>
                      {pattern.code} · {pattern.name}
                    </option>
                  ))}
              </StyledSelect>
            </StyledField>
            <StyledField>
              Date d&apos;effet
              <StyledInput
                type="date"
                value={changeRequestForm.effectiveFrom}
                onChange={(event) =>
                  setChangeRequestForm((current) => ({
                    ...current,
                    effectiveFrom: event.target.value,
                  }))
                }
              />
            </StyledField>
            <StyledField>
              Motif
              <StyledInput
                value={changeRequestForm.reason}
                placeholder="Mutation, correction, besoin opérationnel"
                onChange={(event) =>
                  setChangeRequestForm((current) => ({
                    ...current,
                    reason: event.target.value,
                  }))
                }
              />
            </StyledField>
            <StyledApprovalActions>
              {changeRequestForm.patternType === 'SHIFT_ROTATION' ? (
                <StyledField>
                  Départ cycle
                  <StyledInput
                    type="number"
                    min="0"
                    max={
                      (rotations.find(
                        ({ id }) => id === changeRequestForm.patternId,
                      )?.cycleLengthDays ?? 1) - 1
                    }
                    value={changeRequestForm.startOffset}
                    onChange={(event) =>
                      setChangeRequestForm((current) => ({
                        ...current,
                        startOffset: event.target.value,
                      }))
                    }
                  />
                </StyledField>
              ) : null}
              <Button
                title="Soumettre"
                ariaLabel="Soumettre le changement d'horaire"
                Icon={IconPlus}
                accent="blue"
                disabled={
                  busy ||
                  !changeRequestForm.employeeId ||
                  !changeRequestForm.patternId ||
                  changeRequestForm.reason.trim().length < 3
                }
                type="submit"
              />
            </StyledApprovalActions>
          </StyledChangeForm>
        ) : null}
        <ErpOperationalTable
          ariaLabel="Demandes de changement d'horaire"
          columns={changeRequestColumns}
          rows={changeRequests}
          getRowKey={(request) => request.id}
          state={state}
          loadingLabel="Chargement des demandes"
          emptyLabel="Aucune demande de changement"
          errorLabel="Impossible de charger les demandes"
          onRetry={() => void load()}
        />
      </StyledWorkflow>

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
          {schedules.length} horaire(s) · {rotations.length} rotation(s) ·{' '}
          {attendance?.employees.length ?? 0} collaborateur(s)
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
