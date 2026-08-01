import {
  payrollDeclarationEvidenceSchema,
  payrollDeclarationExportSchema,
  payrollDeclarationSchema,
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
});
