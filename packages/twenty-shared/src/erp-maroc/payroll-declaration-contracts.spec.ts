import {
  payrollDeclarationEvidenceSchema,
  payrollDeclarationExportSchema,
  payrollDeclarationSchema,
  payrollClosingPreviewSchema,
} from './payroll-regulatory-contracts';

const id = '11111111-1111-4111-8111-111111111111';

describe('payroll declaration contracts', () => {
  it('parses a submitted declaration and its evidence metadata', () => {
    expect(
      payrollDeclarationSchema.parse({
        id,
        organisationId: id,
        societeId: id,
        exerciceId: null,
        kind: 'CNSS_BDS_XML',
        periodKey: '2026-07',
        formatVersion: 'DAMANCOM-ZOWKA-2026.1',
        filename: 'CNSS-BDS-2026-07.xml',
        contentType: 'application/xml; charset=utf-8',
        payloadSha256: 'a'.repeat(64),
        validationStatus: 'SUBMITTED',
        validationReport: { valid: true },
        generatedByTwentyUserId: 'payroll-manager',
        generatedAt: '2026-08-01T10:00:00.000Z',
        attemptNumber: 1,
        previousSubmissionId: null,
        submittedAt: '2026-08-01T11:00:00.000Z',
        submittedByTwentyUserId: 'payroll-manager',
        submissionChannel: 'DAMANCOM',
        externallyValidatedAt: null,
        externallyValidatedBy: null,
        externalReference: 'DEPOT-001',
        rejectionReason: null,
        createdAt: '2026-08-01T10:00:00.000Z',
        updatedAt: '2026-08-01T11:00:00.000Z',
        previousSubmission: null,
        events: [
          {
            id,
            type: 'SUBMITTED',
            statusAfter: 'SUBMITTED',
            occurredAt: '2026-08-01T11:00:00.000Z',
            actorTwentyUserId: 'payroll-manager',
            externalReference: 'DEPOT-001',
            message: 'Dépôt via DAMANCOM',
            evidenceFilename: null,
            evidenceContentType: null,
            evidencePayloadSha256: null,
            evidenceSizeBytes: null,
          },
        ],
      }),
    ).toMatchObject({ validationStatus: 'SUBMITTED', attemptNumber: 1 });
  });

  it('parses exports and downloadable evidence', () => {
    expect(
      payrollDeclarationExportSchema.parse({
        submissionId: id,
        attemptNumber: 2,
        previousSubmissionId: id,
        filename: 'IR-SALAIRES-2026.csv',
        contentType: 'text/csv; charset=utf-8',
        content: 'csv',
        payloadSha256: 'b'.repeat(64),
        validation: {
          valid: true,
          errors: [],
          warnings: ['Validation DGI requise'],
          validator: 'ZOWKA-IR-SALAIRES-CANDIDATE-2026.1',
          checkedAt: '2026-08-01T10:00:00.000Z',
          externalAcceptanceRequired: true,
        },
        employees: 4,
      }),
    ).toMatchObject({ attemptNumber: 2 });
    expect(
      payrollDeclarationEvidenceSchema.parse({
        id,
        filename: 'accuse.pdf',
        contentType: 'application/pdf',
        contentBase64: 'cGRm',
        payloadSha256: 'c'.repeat(64),
        sizeBytes: 3,
      }),
    ).toMatchObject({ filename: 'accuse.pdf' });
  });

  it('parses the regulatory calendar and signed closing dossier', () => {
    const deadline = {
      code: 'CNSS_MONTHLY',
      label: 'Déclaration et cotisations CNSS',
      periodKey: '2026-07',
      dueDate: '2026-08-10',
      portal: 'DAMANCOM',
      ruleVersion: 'MA-CNSS-DEADLINE-2026.1-CANDIDATE',
      sourceLabel: 'CNSS / portail DAMANCOM',
      sourceUrl: 'https://www.damancom.ma/',
      sourceArticle: null,
      requiresExpertReview: true,
      status: 'COMPLETED',
      declarationId: id,
      declarationStatus: 'EXTERNALLY_ACCEPTED',
      attemptNumber: 1,
      externalReference: 'CNSS-OK-1',
    } as const;
    expect(
      payrollClosingPreviewSchema.parse({
        periodKey: '2026-07',
        generatedAt: '2026-08-02T10:00:00.000Z',
        ready: true,
        checks: [
          {
            code: 'PAYSLIPS_PAID',
            label: 'Tous les bulletins sont payés',
            passed: true,
            blocking: true,
            detail: '4/4 payé(s)',
          },
        ],
        totals: {
          employeeCount: 4,
          totalGrossCents: 2_000_000,
          totalNetCents: 1_500_000,
          totalEmployerCostCents: 2_400_000,
          totalCnssCents: 300_000,
          totalAmoCents: 100_000,
          totalIrCents: 100_000,
        },
        proofs: {
          hrMonthlyPeriodId: id,
          payslipIds: [id],
          payrollAccountingEntryIds: [id],
          paymentBatchId: id,
          paymentBatchAttemptNumber: 1,
          settlementAccountingEntryId: id,
          cnssDeclarationId: id,
          cnssEvidenceEventId: id,
          irDeclarationId: id,
          irEvidenceEventId: id,
        },
        deadlines: [deadline],
        latestDossier: {
          id,
          organisationId: id,
          societeId: id,
          periodKey: '2026-07',
          version: 1,
          status: 'CLOSED',
          previousDossierId: null,
          snapshot: { schemaVersion: 'ZOWKA-PAYROLL-CLOSING-2026.1' },
          snapshotSha256: 'd'.repeat(64),
          closedAt: '2026-08-02T09:00:00.000Z',
          closedByTwentyUserId: 'admin',
          closeIdempotencyKey: 'closing-key-1',
          reopenedAt: null,
          reopenedByTwentyUserId: null,
          reopenReason: null,
          reopenIdempotencyKey: null,
          createdAt: '2026-08-02T09:00:00.000Z',
          updatedAt: '2026-08-02T09:00:00.000Z',
        },
      }),
    ).toMatchObject({ ready: true, deadlines: [{ status: 'COMPLETED' }] });
  });
});
