import {
  hrCostCenterSchema,
  hrDepartmentSchema,
  hrDeadlineCenterSchema,
  hrEmployeeDetailSchema,
  hrEmployeeCrmLinkResultSchema,
  hrEmployeeDocumentSchema,
  hrEmployeeImportPreviewSchema,
  hrGradeSchema,
  hrJobPositionSchema,
  hrLeaveBalanceSchema,
  hrLeavePolicySchema,
  hrLeaveRequestSchema,
  hrLifecycleJourneySchema,
  hrMonthlyPeriodDetailSchema,
  hrOrganisationChartSchema,
  hrAttendanceMonthSchema,
  hrShiftRotationSchema,
  hrWorkPatternChangeRequestSchema,
  hrWorkCalendarSchema,
  hrWorkScheduleSchema,
} from './hr-core-contracts';

describe('HR monthly closing contracts', () => {
  it('parses a frozen payroll snapshot and its transmitted variable', () => {
    const organisationId = '11111111-1111-4111-8111-111111111111';
    const societeId = '22222222-2222-4222-8222-222222222222';
    const periodId = '33333333-3333-4333-8333-333333333333';
    const employeeId = '44444444-4444-4444-8444-444444444444';
    const now = '2026-07-30T12:00:00.000Z';
    const employee = {
      id: employeeId,
      employeeNumber: 'ZOW-001',
      firstName: 'Salma',
      lastName: 'Alaoui',
    };

    const period = hrMonthlyPeriodDetailSchema.parse({
      id: periodId,
      organisationId,
      societeId,
      month: '2026-06',
      status: 'TRANSMITTED',
      currentSnapshotVersion: 1,
      frozenSnapshotVersion: 1,
      sourceDigest: 'a'.repeat(64),
      employeeCount: 1,
      totalAnomalyCount: 0,
      totalWorkedMinutes: 9_600,
      totalOvertimeMinutes: 120,
      totalAbsenceDays: 1,
      totalPaidLeaveDays: 2,
      totalUnpaidLeaveDays: 0,
      reviewSubmittedAt: now,
      reviewSubmittedByTwentyUserId: 'hr-user',
      frozenAt: now,
      frozenByTwentyUserId: 'hr-user',
      transmittedAt: now,
      transmittedByTwentyUserId: 'payroll-user',
      reopenedAt: null,
      reopenedByTwentyUserId: null,
      reopenReason: null,
      createdByTwentyUserId: 'hr-user',
      createdAt: now,
      updatedAt: now,
      _count: { snapshots: 1, payrollVariables: 6 },
      snapshots: [
        {
          id: '55555555-5555-4555-8555-555555555555',
          organisationId,
          societeId,
          periodId,
          employeeId,
          version: 1,
          scheduledDays: 22,
          presentDays: 19,
          absentDays: 1,
          paidLeaveDays: 2,
          unpaidLeaveDays: 0,
          holidayDays: 0,
          lateMinutes: 15,
          workedMinutes: 9_600,
          overtimeMinutes: 120,
          anomalyCount: 0,
          pendingLeaveRequestCount: 0,
          sourceDigest: 'b'.repeat(64),
          details: { days: [] },
          generatedByTwentyUserId: 'hr-user',
          generatedAt: now,
          employee,
        },
      ],
      payrollVariables: [
        {
          id: '66666666-6666-4666-8666-666666666666',
          organisationId,
          societeId,
          periodId,
          employeeId,
          snapshotVersion: 1,
          kind: 'OVERTIME_MINUTES',
          unit: 'MINUTES',
          value: 120,
          sourceDigest: 'b'.repeat(64),
          generatedByTwentyUserId: 'payroll-user',
          createdAt: now,
          employee,
        },
      ],
    });

    expect(period.status).toBe('TRANSMITTED');
    expect(period.snapshots[0]?.anomalyCount).toBe(0);
    expect(period.payrollVariables[0]?.value).toBe(120);
  });
});

describe('HR leave management contracts', () => {
  it('parses an explained balance and a delegated two-step request', () => {
    const organisationId = '11111111-1111-4111-8111-111111111111';
    const societeId = '22222222-2222-4222-8222-222222222222';
    const employeeId = '33333333-3333-4333-8333-333333333333';
    const delegateEmployeeId = '44444444-4444-4444-8444-444444444444';
    const policyId = '55555555-5555-4555-8555-555555555555';
    const movementId = '66666666-6666-4666-8666-666666666666';
    const now = '2026-07-29T12:00:00.000Z';
    const employee = {
      id: employeeId,
      employeeNumber: 'ZOW-001',
      firstName: 'Salma',
      lastName: 'Alaoui',
    };
    const delegateEmployee = {
      id: delegateEmployeeId,
      employeeNumber: 'ZOW-002',
      firstName: 'Omar',
      lastName: 'Idrissi',
    };
    const policy = hrLeavePolicySchema.parse({
      id: policyId,
      organisationId,
      societeId,
      code: 'MA-MARRIAGE',
      name: 'Mariage du salarié',
      type: 'MARRIAGE',
      isPaid: true,
      deductsAnnualBalance: false,
      adultMonthlyAccrualDays: 0,
      minorMonthlyAccrualDays: 0,
      eligibilityMonths: 0,
      seniorityStepYears: 0,
      seniorityBonusDays: 0,
      annualCapDays: null,
      maximumWorkingDays: 4,
      paidWorkingDaysLimit: 2,
      minimumNoticeDays: 0,
      evidenceRequiredAfterDays: 1,
      managerApprovalRequired: true,
      hrApprovalRequired: true,
      allowNegativeBalance: true,
      isActive: true,
      sourceReference: 'Code du travail marocain, articles 274 et 276',
      createdByTwentyUserId: 'admin-user',
      createdAt: now,
      updatedAt: now,
    });

    const request = hrLeaveRequestSchema.parse({
      id: '77777777-7777-4777-8777-777777777777',
      organisationId,
      societeId,
      employeeId,
      delegateEmployeeId,
      policyId,
      supportingDocumentId: null,
      type: 'MARRIAGE',
      status: 'MANAGER_APPROVED',
      startDate: '2026-08-03T00:00:00.000Z',
      endDate: '2026-08-06T00:00:00.000Z',
      workingDays: 4,
      evidenceRequired: true,
      reason: 'Mariage',
      requestedByTwentyUserId: 'manager-user',
      managerApprovedAt: now,
      managerApprovedByTwentyUserId: 'manager-user',
      decidedAt: null,
      decidedByTwentyUserId: null,
      decisionReason: null,
      createdAt: now,
      updatedAt: now,
      employee,
      delegateEmployee,
      policy,
      supportingDocument: null,
    });
    const balance = hrLeaveBalanceSchema.parse({
      id: '88888888-8888-4888-8888-888888888888',
      employee,
      year: 2026,
      entitledDays: 10.5,
      carriedDays: 2,
      adjustmentDays: -0.5,
      consumedDays: 3,
      pendingDays: 2,
      availableDays: 7,
      movements: [
        {
          id: movementId,
          organisationId,
          societeId,
          employeeId,
          policyId,
          year: 2026,
          type: 'ADJUSTMENT',
          days: -0.5,
          effectiveDate: '2026-07-01',
          periodKey: 'manual:test',
          reason: 'Régularisation validée',
          createdByTwentyUserId: 'admin-user',
          createdAt: now,
        },
      ],
    });

    expect(request.startDate).toBe('2026-08-03');
    expect(request.delegateEmployee?.id).toBe(delegateEmployeeId);
    expect(policy.paidWorkingDaysLimit).toBe(2);
    expect(balance.movements[0]?.days).toBe(-0.5);
  });
});

describe('hrEmployeeDetailSchema', () => {
  it('parses the private employee record without exposing bank secrets', () => {
    const organisationId = '11111111-1111-4111-8111-111111111111';
    const societeId = '22222222-2222-4222-8222-222222222222';
    const employeeId = '33333333-3333-4333-8333-333333333333';
    const createdAt = '2026-01-05T12:00:00.000Z';
    const result = hrEmployeeDetailSchema.parse({
      id: employeeId,
      employeeNumber: 'ZOW-001',
      firstName: 'Salma',
      lastName: 'Alaoui',
      email: 'salma@zowka.com',
      phone: '+212600000000',
      address: 'Casablanca',
      cin: 'BK123456',
      cnssNumber: '123456789',
      jobTitle: 'Responsable administrative',
      department: 'Administration',
      contractType: 'CDI',
      hireDate: '2026-01-05',
      terminationDate: null,
      status: 'ACTIVE',
      baseSalaryCents: 950000,
      familyDependants: 1,
      createdAt,
      updatedAt: createdAt,
      privateProfile: {
        id: '44444444-4444-4444-8444-444444444444',
        organisationId,
        societeId,
        employeeId,
        birthDate: '1990-06-15',
        birthPlace: 'Rabat',
        nationalityCountryCode: 'MA',
        gender: 'FEMALE',
        maritalStatus: 'MARRIED',
        personalEmail: 'salma@example.com',
        personalPhone: '+212611111111',
        addressLine2: null,
        city: 'Casablanca',
        postalCode: '20000',
        createdAt,
        updatedAt: createdAt,
      },
      dependants: [
        {
          id: '55555555-5555-4555-8555-555555555555',
          organisationId,
          societeId,
          employeeId,
          firstName: 'Aya',
          lastName: 'Alaoui',
          relationship: 'CHILD',
          birthDate: '2020-02-10',
          isTaxDependant: true,
          hasDisability: false,
          validFrom: '2026-01-01',
          validTo: null,
          createdAt,
          updatedAt: createdAt,
        },
      ],
      emergencyContacts: [
        {
          id: '66666666-6666-4666-8666-666666666666',
          organisationId,
          societeId,
          employeeId,
          firstName: 'Omar',
          lastName: 'Alaoui',
          relationship: 'Conjoint',
          phone: '+212622222222',
          email: null,
          isPrimary: true,
          createdAt,
          updatedAt: createdAt,
        },
      ],
      bankAccounts: [
        {
          id: '77777777-7777-4777-8777-777777777777',
          organisationId,
          societeId,
          employeeId,
          bankName: 'Banque Zowka',
          accountHolderName: 'Salma Alaoui',
          ribLastFour: '1234',
          maskedRib: '**** **** **** **** **** 1234',
          effectiveFrom: '2026-01-05',
          effectiveTo: null,
          isPrimary: true,
          verifiedAt: createdAt,
          verifiedByTwentyUserId: 'admin-user',
          createdAt,
          updatedAt: createdAt,
          ribCiphertext: 'hr1:must-never-reach-the-client',
        },
      ],
      assignments: [],
      hrDocuments: [],
      hrLifecycleJourneys: [],
      leaveRequests: [
        {
          id: '88888888-8888-4888-8888-888888888888',
          type: 'SICK',
          status: 'APPROVED',
          startDate: '2026-07-01',
          endDate: '2026-07-02',
          workingDays: 2,
          createdAt,
          reason: 'must-remain-private',
        },
      ],
      leaveBalances: [
        {
          id: '99999999-9999-4999-8999-999999999999',
          year: 2026,
          entitledDays: 18,
          carriedDays: 2,
          adjustmentDays: 0,
          consumedDays: 2,
          availableDays: 18,
          updatedAt: createdAt,
        },
      ],
      payslips: [
        {
          id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
          periodKey: '2026-06',
          periodStart: '2026-06-01',
          periodEnd: '2026-06-30',
          status: 'PAID',
          grossSalaryCents: 950000,
          netSalaryCents: 810000,
          paidAt: createdAt,
          createdAt,
          calculation: { mustRemainServerSide: true },
        },
      ],
      history: [
        {
          id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
          action: 'HR_PRIVATE_PROFILE_UPDATED',
          actorTwentyUserId: 'admin-user',
          createdAt,
          metadata: { cin: 'must-remain-private' },
        },
      ],
      employmentContracts: [],
      crmLink: null,
      access: {
        role: 'HR_ADMIN',
        globalRole: 'COMMERCIAL',
        populationScope: 'ALL',
        permissions: ['HR_PRIVATE_READ', 'HR_PRIVATE_WRITE', 'HR_BANK_READ'],
        establishmentIds: [],
        employeeIds: [],
        isSystemAdministrator: false,
        canManageStructure: false,
        canReadPrivate: true,
        canWritePrivate: true,
        canReadBank: true,
        canWriteBank: false,
        canReadCompensation: false,
        canWriteContracts: false,
        canReadDocuments: true,
        canWriteDocuments: true,
        canReadTime: true,
        canWriteTime: true,
        canAdministerAccess: false,
      },
    });

    expect(result.bankAccounts[0]).toEqual({
      id: '77777777-7777-4777-8777-777777777777',
      organisationId,
      societeId,
      employeeId,
      bankName: 'Banque Zowka',
      accountHolderName: 'Salma Alaoui',
      ribLastFour: '1234',
      maskedRib: '**** **** **** **** **** 1234',
      effectiveFrom: '2026-01-05',
      effectiveTo: null,
      isPrimary: true,
      verifiedAt: createdAt,
      verifiedByTwentyUserId: 'admin-user',
      createdAt,
      updatedAt: createdAt,
    });
    expect(result.bankAccounts[0]).not.toHaveProperty('ribCiphertext');
    expect(result.leaveRequests[0]).not.toHaveProperty('reason');
    expect(result.payslips[0]).not.toHaveProperty('calculation');
    expect(result.history[0]).not.toHaveProperty('metadata');
  });

  it('parses only public CRM links and organisation chart fields', () => {
    const employeeId = '11111111-1111-4111-8111-111111111111';
    const personId = '22222222-2222-4222-8222-222222222222';
    const departmentId = '33333333-3333-4333-8333-333333333333';
    const teamId = '44444444-4444-4444-8444-444444444444';
    const now = '2026-07-29T08:00:00.000Z';
    const link = hrEmployeeCrmLinkResultSchema.parse({
      employeeId,
      twentyPersonId: personId,
      linkedAt: now,
      lastSyncedAt: now,
      syncedFields: ['firstName', 'email', 'jobTitle'],
      updatedAt: now,
      cin: 'must-not-be-accepted',
    });
    const chart = hrOrganisationChartSchema.parse({
      generatedAt: now,
      departments: [
        {
          id: departmentId,
          code: 'COM',
          name: 'Commercial',
          parentId: null,
          employeeCount: 1,
        },
      ],
      teams: [
        {
          id: teamId,
          code: 'VENTES',
          name: 'Ventes',
          departmentId,
          managerEmployeeId: employeeId,
          employeeCount: 1,
        },
      ],
      nodes: [
        {
          employeeId,
          employeeNumber: 'ZOW-001',
          firstName: 'Salma',
          lastName: 'Alaoui',
          jobTitle: 'Responsable commerciale',
          status: 'ACTIVE',
          department: {
            id: departmentId,
            code: 'COM',
            name: 'Commercial',
            parentId: null,
          },
          team: { id: teamId, code: 'VENTES', name: 'Ventes' },
          managerEmployeeId: employeeId,
          twentyPersonId: personId,
        },
      ],
      unassignedCount: 0,
      baseSalaryCents: 900_000,
    });

    expect(link).not.toHaveProperty('cin');
    expect(chart).not.toHaveProperty('baseSalaryCents');
    expect(chart.nodes[0]).not.toHaveProperty('email');
  });

  it('parses a guided lifecycle journey with its checklist', () => {
    const now = '2026-07-28T08:00:00.000Z';
    const journey = hrLifecycleJourneySchema.parse({
      id: '11111111-1111-4111-8111-111111111111',
      organisationId: '22222222-2222-4222-8222-222222222222',
      societeId: '33333333-3333-4333-8333-333333333333',
      employeeId: '44444444-4444-4444-8444-444444444444',
      type: 'ONBOARDING',
      status: 'ACTIVE',
      title: 'Intégration de Salma Alaoui',
      startDate: '2026-08-01',
      targetDate: '2026-08-31',
      notes: null,
      createdByTwentyUserId: 'hr-admin',
      completedAt: null,
      completedByTwentyUserId: null,
      cancelledAt: null,
      cancelledByTwentyUserId: null,
      cancellationReason: null,
      createdAt: now,
      updatedAt: now,
      employee: {
        id: '44444444-4444-4444-8444-444444444444',
        employeeNumber: 'ZOW-001',
        firstName: 'Salma',
        lastName: 'Alaoui',
        jobTitle: 'Responsable administrative',
        status: 'ACTIVE',
      },
      tasks: [
        {
          id: '55555555-5555-4555-8555-555555555555',
          organisationId: '22222222-2222-4222-8222-222222222222',
          societeId: '33333333-3333-4333-8333-333333333333',
          journeyId: '11111111-1111-4111-8111-111111111111',
          code: 'WELCOME',
          title: 'Réaliser l’accueil RH',
          description: 'Présentation et contacts.',
          sortOrder: 1,
          status: 'COMPLETED',
          dueDate: '2026-08-01',
          assigneeTwentyUserId: null,
          completedAt: now,
          completedByTwentyUserId: 'hr-admin',
          createdAt: now,
          updatedAt: now,
        },
      ],
    });

    expect(journey.tasks[0].status).toBe('COMPLETED');
  });

  it('parses autonomous grades and cost centers assigned to HR structure', () => {
    const organisationId = '11111111-1111-4111-8111-111111111111';
    const societeId = '22222222-2222-4222-8222-222222222222';
    const gradeId = '33333333-3333-4333-8333-333333333333';
    const costCenterId = '44444444-4444-4444-8444-444444444444';
    const now = '2026-07-27T10:00:00.000Z';
    const grade = hrGradeSchema.parse({
      id: gradeId,
      organisationId,
      societeId,
      code: 'G5',
      name: 'Cadre confirmé',
      level: 5,
      description: null,
      minSalaryCents: 1_200_000,
      maxSalaryCents: 2_500_000,
      isActive: true,
      createdAt: now,
      updatedAt: now,
      _count: { jobPositions: 1 },
    });
    const costCenter = hrCostCenterSchema.parse({
      id: costCenterId,
      organisationId,
      societeId,
      code: 'CC-COM',
      name: 'Commercial',
      description: null,
      isActive: true,
      createdAt: now,
      updatedAt: now,
      _count: { departments: 1 },
    });
    const department = hrDepartmentSchema.parse({
      id: '55555555-5555-4555-8555-555555555555',
      organisationId,
      societeId,
      establishmentId: null,
      costCenterId,
      parentId: null,
      code: 'COM',
      name: 'Commercial',
      costCenterCode: costCenter.code,
      isActive: true,
      createdAt: now,
      updatedAt: now,
      costCenter,
    });
    const position = hrJobPositionSchema.parse({
      id: '66666666-6666-4666-8666-666666666666',
      organisationId,
      societeId,
      departmentId: department.id,
      gradeId,
      code: 'KAM',
      title: 'Responsable grands comptes',
      grade: grade.name,
      description: null,
      isActive: true,
      createdAt: now,
      updatedAt: now,
      gradeRef: grade,
    });

    expect(department.costCenter?.code).toBe('CC-COM');
    expect(position.gradeRef?.level).toBe(5);
  });

  it('parses safe document versions and the HR deadline center', () => {
    const now = '2026-07-27T10:00:00.000Z';
    const version = {
      id: '11111111-1111-4111-8111-111111111111',
      organisationId: '22222222-2222-4222-8222-222222222222',
      societeId: '33333333-3333-4333-8333-333333333333',
      hrEmployeeDocumentId: '44444444-4444-4444-8444-444444444444',
      version: 2,
      filename: 'cin.pdf',
      mimeType: 'application/pdf',
      sizeBytes: 1024,
      issuedAt: '2026-01-01',
      expiresAt: '2026-08-10',
      notes: null,
      uploadedByTwentyUserId: 'hr-admin',
      createdAt: now,
      storageKey: 'must-not-reach-the-client',
    };
    const document = hrEmployeeDocumentSchema.parse({
      id: version.hrEmployeeDocumentId,
      organisationId: version.organisationId,
      societeId: version.societeId,
      employeeId: '55555555-5555-4555-8555-555555555555',
      category: 'IDENTITY',
      title: 'Carte d’identité nationale',
      isRequired: true,
      reminderDays: 30,
      isActive: true,
      createdByTwentyUserId: 'hr-admin',
      createdAt: now,
      updatedAt: now,
      versions: [version],
      latestVersion: version,
      versionCount: 1,
      status: 'EXPIRING',
      daysUntilExpiry: 14,
    });
    const center = hrDeadlineCenterSchema.parse({
      generatedAt: now,
      items: [
        {
          id: `document:${document.id}`,
          kind: 'DOCUMENT',
          severity: 'UPCOMING',
          title: document.title,
          dueDate: '2026-08-10',
          daysUntilDue: 14,
          employee: {
            id: document.employeeId,
            employeeNumber: 'ZOW-001',
            firstName: 'Salma',
            lastName: 'Alaoui',
          },
          documentId: document.id,
          contractId: null,
        },
      ],
    });

    expect(document.latestVersion).not.toHaveProperty('storageKey');
    expect(center.items[0]?.severity).toBe('UPCOMING');
  });

  it('parses an employee import preview with migration decisions', () => {
    const preview = hrEmployeeImportPreviewSchema.parse({
      fileName: 'migration-salaries.xlsx',
      previewDigest: 'a'.repeat(64),
      readyCount: 1,
      errorCount: 0,
      createCount: 0,
      migrateCount: 1,
      rows: [
        {
          rowNumber: 2,
          action: 'MIGRATE',
          existingEmployeeId: '11111111-1111-4111-8111-111111111111',
          establishmentId: null,
          departmentId: null,
          jobPositionId: null,
          contractNumber: 'CTR-ZOW-001-20260728',
          normalized: {
            employeeNumber: 'ZOW-001',
            firstName: 'Salma',
            lastName: 'Alaoui',
            cin: 'BK123456',
            cnssNumber: '123456789',
            email: 'salma@zowka.com',
            phone: '+212600000000',
            jobTitle: 'Responsable administrative',
            departmentName: 'Administration',
            contractType: 'CDI',
            hireDate: '2026-01-05',
            contractStartDate: '2026-01-05',
            contractEndDate: null,
            probationEndDate: null,
            baseSalaryCents: 950_000,
            weeklyHoursHundredths: 4_400,
            establishmentCode: null,
            departmentCode: null,
            jobPositionCode: null,
          },
          warnings: [
            'Le salarié existe sans contrat et sera complété par migration.',
          ],
          errors: [],
        },
      ],
    });

    expect(preview.rows[0]?.action).toBe('MIGRATE');
    expect(preview.readyCount).toBe(1);
  });

  it('parses work schedules and monthly attendance without client calculations', () => {
    const organisationId = '11111111-1111-4111-8111-111111111111';
    const societeId = '22222222-2222-4222-8222-222222222222';
    const scheduleId = '33333333-3333-4333-8333-333333333333';
    const employeeId = '44444444-4444-4444-8444-444444444444';
    const entryId = '55555555-5555-4555-8555-555555555555';
    const now = '2026-07-29T12:00:00.000Z';
    const calendar = hrWorkCalendarSchema.parse({
      id: '77777777-7777-4777-8777-777777777777',
      organisationId,
      societeId,
      teamId: null,
      code: 'MA',
      name: 'Calendrier Maroc',
      timezone: 'Africa/Casablanca',
      isActive: true,
      createdByTwentyUserId: 'admin-user',
      createdAt: now,
      updatedAt: now,
      team: null,
      days: [],
    });
    const schedule = hrWorkScheduleSchema.parse({
      id: scheduleId,
      organisationId,
      societeId,
      code: 'STD-44',
      name: 'Horaire standard',
      timezone: 'Africa/Casablanca',
      lateToleranceMinutes: 5,
      isActive: true,
      createdByTwentyUserId: 'admin-user',
      createdAt: now,
      updatedAt: now,
      days: [
        {
          id: '66666666-6666-4666-8666-666666666666',
          organisationId,
          societeId,
          workScheduleId: scheduleId,
          weekday: 1,
          isWorkingDay: true,
          startMinute: 510,
          endMinute: 1050,
          endsNextDay: false,
          breakMinutes: 60,
          createdAt: now,
          updatedAt: now,
        },
      ],
      _count: { assignments: 1 },
    });
    const rotation = hrShiftRotationSchema.parse({
      id: '88888888-8888-4888-8888-888888888888',
      organisationId,
      societeId,
      code: 'ROT-NUIT',
      name: 'Rotation nuit',
      timezone: 'Africa/Casablanca',
      cycleLengthDays: 2,
      lateToleranceMinutes: 5,
      isActive: true,
      createdByTwentyUserId: 'admin-user',
      createdAt: now,
      updatedAt: now,
      days: [
        {
          id: '99999999-9999-4999-8999-999999999999',
          organisationId,
          societeId,
          rotationId: '88888888-8888-4888-8888-888888888888',
          dayOffset: 0,
          label: 'Nuit',
          isWorkingDay: true,
          startMinute: 1320,
          endMinute: 360,
          endsNextDay: true,
          breakMinutes: 60,
          createdAt: now,
          updatedAt: now,
        },
      ],
      _count: { assignments: 1 },
    });
    const changeRequest = hrWorkPatternChangeRequestSchema.parse({
      id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      organisationId,
      societeId,
      employeeId,
      patternType: 'WORK_SCHEDULE',
      workScheduleId: scheduleId,
      rotationId: null,
      effectiveFrom: '2026-07-15',
      startOffset: 0,
      reason: 'Passage à un nouvel horaire',
      status: 'PENDING',
      requestedByTwentyUserId: 'hr-manager',
      requestedAt: now,
      reviewedByTwentyUserId: null,
      reviewedAt: null,
      reviewNote: null,
      appliedWorkScheduleAssignmentId: null,
      appliedShiftRotationAssignmentId: null,
      createdAt: now,
      updatedAt: now,
      employee: {
        id: employeeId,
        employeeNumber: 'ZOW-001',
        firstName: 'Salma',
        lastName: 'Alaoui',
      },
      workSchedule: schedule,
      rotation: null,
    });
    const month = hrAttendanceMonthSchema.parse({
      month: '2026-07',
      generatedAt: now,
      employees: [
        {
          employee: {
            id: employeeId,
            employeeNumber: 'ZOW-001',
            firstName: 'Salma',
            lastName: 'Alaoui',
          },
          summary: {
            scheduledDays: 1,
            presentDays: 1,
            absentDays: 0,
            leaveDays: 0,
            holidayDays: 0,
            lateCount: 1,
            lateMinutes: 10,
            workedMinutes: 480,
            overtimeMinutes: 0,
            anomalyCount: 0,
          },
          days: [
            {
              date: '2026-07-29',
              schedule: {
                id: schedule.id,
                code: schedule.code,
                name: schedule.name,
                timezone: schedule.timezone,
              },
              rotation: null,
              calendarDay: null,
              status: 'LATE',
              firstClockIn: '2026-07-29T07:45:00.000Z',
              lastClockOut: '2026-07-29T16:45:00.000Z',
              workedMinutes: 480,
              scheduledMinutes: 480,
              overtimeMinutes: 0,
              lateMinutes: 10,
              earlyLeaveMinutes: 0,
              breakMinutes: 60,
              anomalies: [],
              entries: [
                {
                  id: entryId,
                  organisationId,
                  societeId,
                  employeeId,
                  externalId: 'manual-1',
                  type: 'CLOCK_IN',
                  source: 'MANUAL',
                  status: 'ACTIVE',
                  workMode: 'ONSITE',
                  occurredAt: '2026-07-29T07:45:00.000Z',
                  localDate: '2026-07-29',
                  attendanceDate: '2026-07-29',
                  notes: null,
                  recordedByTwentyUserId: 'admin-user',
                  cancelledAt: null,
                  cancelledByTwentyUserId: null,
                  cancellationReason: null,
                  createdAt: now,
                  updatedAt: now,
                },
              ],
            },
          ],
        },
      ],
    });

    expect(month.employees[0]?.summary.lateMinutes).toBe(10);
    expect(calendar.code).toBe('MA');
    expect(rotation.days[0]?.endsNextDay).toBe(true);
    expect(changeRequest.status).toBe('PENDING');
    expect(
      hrWorkPatternChangeRequestSchema.safeParse({
        ...changeRequest,
        rotationId: rotation.id,
        rotation,
      }).success,
    ).toBe(false);
  });
});
