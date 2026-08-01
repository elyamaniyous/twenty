import {
  ErpOperationalTable,
  type ErpOperationalTableColumn,
} from '@/erp-maroc/components/ErpOperationalTable';
import {
  ErpStatusBadge,
  type ErpStatusTone,
} from '@/erp-maroc/components/ErpStatusBadge';
import { useErpMarocContext } from '@/erp-maroc/context/useErpMarocContext';
import { styled } from '@linaria/react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  payrollDeclarationEvidenceSchema,
  payrollDeclarationExportSchema,
  payrollDeclarationListSchema,
  payrollDeclarationSchema,
  type PayrollDeclaration,
  type PayrollDeclarationStatus,
} from 'twenty-shared/erp-maroc';
import {
  IconCheck,
  IconDownload,
  IconEye,
  IconRefresh,
  IconSend,
  IconUpload,
  IconX,
} from 'twenty-ui/display';
import { Button } from 'twenty-ui/input';
import { themeCssVariables } from 'twenty-ui/theme-constants';

type PayrollDeclarationsPanelProps = { query: string };
type DeclarationKind = 'CNSS' | 'IR';
type ReceiptOutcome = 'ACKNOWLEDGED' | 'ACCEPTED' | 'REJECTED';

const statusAppearance: Record<
  PayrollDeclarationStatus,
  { label: string; tone: ErpStatusTone }
> = {
  GENERATED: { label: 'À corriger', tone: 'warning' },
  INTERNALLY_VALIDATED: { label: 'Validée', tone: 'info' },
  SUBMITTED: { label: 'Déposée', tone: 'warning' },
  ACKNOWLEDGED: { label: 'Accusé reçu', tone: 'info' },
  EXTERNALLY_ACCEPTED: { label: 'Acceptée', tone: 'success' },
  REJECTED: { label: 'Rejetée', tone: 'danger' },
};

const StyledPanel = styled.div`
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  min-height: 0;
`;

const StyledControls = styled.section`
  align-items: end;
  border-bottom: 1px solid ${themeCssVariables.border.color.light};
  display: flex;
  flex: 0 0 auto;
  flex-wrap: wrap;
  gap: ${themeCssVariables.spacing[2]};
  padding: ${themeCssVariables.spacing[3]};
`;

const StyledField = styled.label`
  color: ${themeCssVariables.font.color.secondary};
  display: flex;
  flex-direction: column;
  font-size: ${themeCssVariables.font.size.sm};
  gap: ${themeCssVariables.spacing[1]};
  min-width: 140px;
`;

const StyledInput = styled.input`
  background: ${themeCssVariables.background.primary};
  border: 1px solid ${themeCssVariables.border.color.medium};
  border-radius: ${themeCssVariables.border.radius.sm};
  box-sizing: border-box;
  color: ${themeCssVariables.font.color.primary};
  font: inherit;
  height: 32px;
  min-width: 140px;
  padding: 0 ${themeCssVariables.spacing[2]};
`;

const StyledSelect = styled.select`
  background: ${themeCssVariables.background.primary};
  border: 1px solid ${themeCssVariables.border.color.medium};
  border-radius: ${themeCssVariables.border.radius.sm};
  color: ${themeCssVariables.font.color.primary};
  font: inherit;
  height: 32px;
  min-width: 150px;
  padding: 0 ${themeCssVariables.spacing[2]};
`;

const StyledWorkflow = styled.section`
  border-bottom: 1px solid ${themeCssVariables.border.color.light};
  display: flex;
  flex: 0 0 auto;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[2]};
  padding: ${themeCssVariables.spacing[3]};
`;

const StyledWorkflowHeader = styled.div`
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: ${themeCssVariables.spacing[2]};
  justify-content: space-between;
`;

const StyledWorkflowTitle = styled.strong`
  color: ${themeCssVariables.font.color.primary};
  font-size: ${themeCssVariables.font.size.md};
  letter-spacing: 0;
`;

const StyledTimeline = styled.div`
  display: flex;
  gap: ${themeCssVariables.spacing[3]};
  overflow-x: auto;
`;

const StyledEvent = styled.div`
  border-left: 2px solid ${themeCssVariables.border.color.medium};
  color: ${themeCssVariables.font.color.secondary};
  display: flex;
  flex: 0 0 220px;
  flex-direction: column;
  font-size: ${themeCssVariables.font.size.sm};
  gap: ${themeCssVariables.spacing[1]};
  padding-left: ${themeCssVariables.spacing[2]};
`;

const StyledFeedback = styled.div<{ danger: boolean }>`
  background: ${({ danger }) =>
    danger
      ? themeCssVariables.tag.background.red
      : themeCssVariables.tag.background.green};
  color: ${({ danger }) =>
    danger ? themeCssVariables.tag.text.red : themeCssVariables.tag.text.green};
  font-size: ${themeCssVariables.font.size.sm};
  padding: ${themeCssVariables.spacing[2]} ${themeCssVariables.spacing[3]};
`;

const StyledActions = styled.div`
  align-items: end;
  display: flex;
  flex-wrap: wrap;
  gap: ${themeCssVariables.spacing[2]};
`;

const StyledHiddenInput = styled.input`
  display: none;
`;

const currentMonth = new Date().toISOString().slice(0, 7);
const dateTime = new Intl.DateTimeFormat('fr-MA', {
  dateStyle: 'short',
  timeStyle: 'short',
});

const declarationLabel = (kind: string) =>
  kind.startsWith('CNSS_BDS_')
    ? `CNSS BDS ${kind.endsWith('XML') ? 'XML' : 'TXT'}`
    : `IR salaires ${kind.endsWith('XML') ? 'XML' : 'CSV'}`;

const downloadText = (
  filename: string,
  contentType: string,
  content: string,
) => {
  const url = URL.createObjectURL(new Blob([content], { type: contentType }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
};

const fileToBase64 = async (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('File read failed'));
    reader.onload = () => {
      if (typeof reader.result !== 'string') {
        reject(new Error('File read did not produce a data URL'));
        return;
      }
      resolve(reader.result.slice(reader.result.indexOf(',') + 1));
    };
    reader.readAsDataURL(file);
  });

export const PayrollDeclarationsPanel = ({
  query,
}: PayrollDeclarationsPanelProps) => {
  const { client, context } = useErpMarocContext();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [declarations, setDeclarations] = useState<PayrollDeclaration[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [periodKey, setPeriodKey] = useState(currentMonth);
  const [kind, setKind] = useState<DeclarationKind>('CNSS');
  const [format, setFormat] = useState('xml');
  const [channel, setChannel] = useState('DAMANCOM');
  const [externalReference, setExternalReference] = useState('');
  const [receiptOutcome, setReceiptOutcome] =
    useState<ReceiptOutcome>('ACKNOWLEDGED');
  const [receiptMessage, setReceiptMessage] = useState('');
  const [evidence, setEvidence] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<{
    message: string;
    danger: boolean;
  } | null>(null);

  const canOperate = ['OWNER', 'ADMIN', 'COMPTABLE'].includes(
    context?.role ?? '',
  );

  const load = useCallback(async () => {
    try {
      const rows = await client.request({
        method: 'GET',
        path: '/payroll/declarations',
        schema: payrollDeclarationListSchema,
      });
      setDeclarations(rows);
      setSelectedId((current) =>
        current !== null && rows.some(({ id }) => id === current)
          ? current
          : null,
      );
    } catch {
      setFeedback({
        message: 'Le centre de déclarations ne peut pas être chargé.',
        danger: true,
      });
    }
  }, [client]);

  useEffect(() => {
    void load();
  }, [load]);

  const selected =
    declarations.find((declaration) => declaration.id === selectedId) ?? null;
  const normalizedQuery = query.trim().toLocaleLowerCase('fr');
  const filtered = useMemo(
    () =>
      declarations.filter((declaration) =>
        [
          declaration.kind,
          declaration.periodKey,
          declaration.filename,
          declaration.validationStatus,
          declaration.externalReference ?? '',
        ].some((value) =>
          value.toLocaleLowerCase('fr').includes(normalizedQuery),
        ),
      ),
    [declarations, normalizedQuery],
  );

  const generate = async () => {
    setBusy(true);
    setFeedback(null);
    try {
      const exported = await client.request({
        method: 'GET',
        path: kind === 'CNSS' ? '/payroll/cnss/bds' : '/payroll/ir/export',
        query: { periodKey, format },
        schema: payrollDeclarationExportSchema,
      });
      downloadText(exported.filename, exported.contentType, exported.content);
      setFeedback({
        message: exported.validation.valid
          ? `${exported.filename} généré et contrôlé par Zowka. Le dépôt externe reste requis.`
          : `${exported.filename} généré avec ${exported.validation.errors.length} anomalie(s) à corriger.`,
        danger: !exported.validation.valid,
      });
      await load();
      setSelectedId(exported.submissionId);
    } catch {
      setFeedback({
        message: "L'export n'a pas pu être généré.",
        danger: true,
      });
    } finally {
      setBusy(false);
    }
  };

  const submit = async () => {
    if (selected === null) return;
    setBusy(true);
    setFeedback(null);
    try {
      await client
        .createMutationIntent(
          {
            method: 'POST',
            path: `/payroll/declarations/${selected.id}/submit`,
            schema: payrollDeclarationSchema,
            body: {
              channel,
              externalReference: externalReference.trim() || null,
            },
          },
          { idempotency: 'required' },
        )
        .execute();
      setFeedback({
        message: 'Dépôt enregistré dans la chronologie réglementaire.',
        danger: false,
      });
      await load();
    } catch {
      setFeedback({
        message: "Le dépôt n'a pas été enregistré.",
        danger: true,
      });
    } finally {
      setBusy(false);
    }
  };

  const recordReceipt = async () => {
    if (selected === null) return;
    setBusy(true);
    setFeedback(null);
    try {
      const evidenceBody =
        evidence === null
          ? undefined
          : {
              filename: evidence.name,
              contentType: evidence.type || 'application/octet-stream',
              contentBase64: await fileToBase64(evidence),
            };
      await client
        .createMutationIntent(
          {
            method: 'POST',
            path: `/payroll/declarations/${selected.id}/receipts`,
            schema: payrollDeclarationSchema,
            body: {
              outcome: receiptOutcome,
              externalReference: externalReference.trim() || null,
              message: receiptMessage.trim() || null,
              evidence: evidenceBody,
            },
          },
          { idempotency: 'required' },
        )
        .execute();
      setEvidence(null);
      setReceiptMessage('');
      setFeedback({
        message: 'Accusé et preuve enregistrés dans le dossier.',
        danger: false,
      });
      await load();
    } catch {
      setFeedback({
        message:
          "L'accusé n'a pas été enregistré. Vérifiez la référence et le justificatif.",
        danger: true,
      });
    } finally {
      setBusy(false);
    }
  };

  const downloadEvidence = async (eventId: string) => {
    try {
      const evidenceDocument = await client.request({
        method: 'GET',
        path: `/payroll/declaration-events/${eventId}/evidence`,
        schema: payrollDeclarationEvidenceSchema,
      });
      const bytes = Uint8Array.from(
        atob(evidenceDocument.contentBase64),
        (character) => character.charCodeAt(0),
      );
      const url = URL.createObjectURL(
        new Blob([bytes], { type: evidenceDocument.contentType }),
      );
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = evidenceDocument.filename;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch {
      setFeedback({
        message: 'Le justificatif ne peut pas être téléchargé.',
        danger: true,
      });
    }
  };

  const columns: ErpOperationalTableColumn<PayrollDeclaration>[] = [
    {
      key: 'kind',
      header: 'Déclaration',
      width: '190px',
      render: (row) => declarationLabel(row.kind),
    },
    {
      key: 'period',
      header: 'Période',
      width: '110px',
      render: (row) => row.periodKey,
    },
    {
      key: 'attempt',
      header: 'Tentative',
      width: '90px',
      align: 'right',
      render: (row) => row.attemptNumber,
    },
    {
      key: 'status',
      header: 'Statut',
      width: '150px',
      render: (row) => {
        const appearance = statusAppearance[row.validationStatus];
        return (
          <ErpStatusBadge label={appearance.label} tone={appearance.tone} />
        );
      },
    },
    {
      key: 'reference',
      header: 'Référence externe',
      width: '190px',
      render: (row) => row.externalReference ?? '—',
    },
    {
      key: 'generated',
      header: 'Générée le',
      width: '150px',
      render: (row) => dateTime.format(new Date(row.generatedAt)),
    },
    {
      key: 'events',
      header: 'Événements',
      width: '100px',
      align: 'right',
      render: (row) => row.events.length,
    },
    {
      key: 'open',
      header: 'Dossier',
      width: '80px',
      align: 'center',
      render: (row) => (
        <Button
          title="Ouvrir le dossier"
          ariaLabel={`Ouvrir ${declarationLabel(row.kind)} ${row.periodKey}`}
          Icon={IconEye}
          variant="secondary"
          onClick={() => {
            setSelectedId(row.id);
            setChannel(row.kind.startsWith('CNSS') ? 'DAMANCOM' : 'SIMPL_IR');
            setExternalReference(row.externalReference ?? '');
          }}
        />
      ),
    },
  ];

  return (
    <StyledPanel>
      <StyledControls aria-label="Génération des déclarations">
        <StyledField>
          Déclaration
          <StyledSelect
            value={kind}
            onChange={(event) => {
              const nextKind = event.target.value as DeclarationKind;
              setKind(nextKind);
              setFormat('xml');
              setChannel(nextKind === 'CNSS' ? 'DAMANCOM' : 'SIMPL_IR');
            }}
          >
            <option value="CNSS">CNSS BDS</option>
            <option value="IR">IR salaires</option>
          </StyledSelect>
        </StyledField>
        <StyledField>
          Période
          <StyledInput
            type={kind === 'CNSS' ? 'month' : 'text'}
            value={periodKey}
            placeholder={kind === 'IR' ? 'YYYY ou YYYY-MM' : undefined}
            onChange={(event) => setPeriodKey(event.target.value)}
          />
        </StyledField>
        <StyledField>
          Format
          <StyledSelect
            value={format}
            onChange={(event) => setFormat(event.target.value)}
          >
            <option value="xml">XML</option>
            <option value={kind === 'CNSS' ? 'txt' : 'csv'}>
              {kind === 'CNSS' ? 'TXT' : 'CSV'}
            </option>
          </StyledSelect>
        </StyledField>
        <Button
          title="Générer et télécharger"
          ariaLabel="Générer et télécharger la déclaration"
          Icon={IconDownload}
          accent="blue"
          disabled={busy || periodKey.trim() === ''}
          onClick={() => void generate()}
        />
        <Button
          title="Actualiser"
          ariaLabel="Actualiser les déclarations"
          Icon={IconRefresh}
          variant="secondary"
          disabled={busy}
          onClick={() => void load()}
        />
      </StyledControls>
      {feedback !== null ? (
        <StyledFeedback danger={feedback.danger}>
          {feedback.message}
        </StyledFeedback>
      ) : null}
      {selected !== null ? (
        <StyledWorkflow aria-label="Dossier de déclaration sélectionné">
          <StyledWorkflowHeader>
            <StyledWorkflowTitle>
              {declarationLabel(selected.kind)} · {selected.periodKey} ·
              tentative {selected.attemptNumber}
            </StyledWorkflowTitle>
            <Button
              title="Fermer le dossier"
              ariaLabel="Fermer le dossier de déclaration"
              Icon={IconX}
              variant="secondary"
              onClick={() => setSelectedId(null)}
            />
          </StyledWorkflowHeader>
          {canOperate &&
          selected.validationStatus === 'INTERNALLY_VALIDATED' ? (
            <StyledActions>
              <StyledField>
                Canal de dépôt
                <StyledSelect
                  value={channel}
                  onChange={(event) => setChannel(event.target.value)}
                >
                  <option value="DAMANCOM">DAMANCOM</option>
                  <option value="SIMPL_IR">SIMPL IR</option>
                  <option value="MANUAL">Dépôt manuel</option>
                </StyledSelect>
              </StyledField>
              <StyledField>
                Référence, si disponible
                <StyledInput
                  value={externalReference}
                  onChange={(event) => setExternalReference(event.target.value)}
                />
              </StyledField>
              <Button
                title="Enregistrer le dépôt"
                ariaLabel="Enregistrer le dépôt externe"
                Icon={IconSend}
                accent="blue"
                disabled={busy}
                onClick={() => void submit()}
              />
            </StyledActions>
          ) : null}
          {canOperate &&
          (selected.validationStatus === 'SUBMITTED' ||
            selected.validationStatus === 'ACKNOWLEDGED') ? (
            <StyledActions>
              <StyledField>
                Résultat externe
                <StyledSelect
                  value={receiptOutcome}
                  onChange={(event) =>
                    setReceiptOutcome(event.target.value as ReceiptOutcome)
                  }
                >
                  {selected.validationStatus === 'SUBMITTED' ? (
                    <option value="ACKNOWLEDGED">Accusé reçu</option>
                  ) : null}
                  <option value="ACCEPTED">Acceptée</option>
                  <option value="REJECTED">Rejetée</option>
                </StyledSelect>
              </StyledField>
              <StyledField>
                Référence externe
                <StyledInput
                  value={externalReference}
                  onChange={(event) => setExternalReference(event.target.value)}
                />
              </StyledField>
              <StyledField>
                Message ou motif
                <StyledInput
                  value={receiptMessage}
                  onChange={(event) => setReceiptMessage(event.target.value)}
                />
              </StyledField>
              <StyledHiddenInput
                ref={fileInputRef}
                type="file"
                accept=".pdf,.xml,.txt,.csv,application/pdf,text/plain,text/csv,application/xml"
                onChange={(event) => {
                  const file = event.target.files?.[0] ?? null;
                  if (file !== null && file.size > 2_097_152) {
                    setFeedback({
                      message: 'Le justificatif ne doit pas dépasser 2 Mo.',
                      danger: true,
                    });
                    setEvidence(null);
                  } else {
                    setEvidence(file);
                  }
                  event.target.value = '';
                }}
              />
              <Button
                title={evidence?.name ?? 'Joindre un justificatif'}
                ariaLabel="Joindre un justificatif externe"
                Icon={IconUpload}
                variant="secondary"
                disabled={busy}
                onClick={() => fileInputRef.current?.click()}
              />
              <Button
                title="Enregistrer l’accusé"
                ariaLabel="Enregistrer l'accusé externe"
                Icon={receiptOutcome === 'REJECTED' ? IconX : IconCheck}
                accent="blue"
                disabled={
                  busy ||
                  (externalReference.trim() === '' && evidence === null) ||
                  (receiptOutcome === 'ACCEPTED' &&
                    externalReference.trim() === '') ||
                  (receiptOutcome === 'REJECTED' &&
                    receiptMessage.trim() === '')
                }
                onClick={() => void recordReceipt()}
              />
            </StyledActions>
          ) : null}
          <StyledTimeline aria-label="Chronologie de la déclaration">
            {selected.events.length === 0 ? (
              <StyledEvent>Aucun dépôt externe enregistré.</StyledEvent>
            ) : (
              selected.events.map((event) => (
                <StyledEvent key={event.id}>
                  <strong>{statusAppearance[event.statusAfter].label}</strong>
                  <span>{dateTime.format(new Date(event.occurredAt))}</span>
                  <span>{event.externalReference ?? event.message ?? '—'}</span>
                  {event.evidenceFilename !== null ? (
                    <Button
                      title={event.evidenceFilename}
                      ariaLabel={`Télécharger ${event.evidenceFilename}`}
                      Icon={IconDownload}
                      variant="secondary"
                      onClick={() => void downloadEvidence(event.id)}
                    />
                  ) : null}
                </StyledEvent>
              ))
            )}
          </StyledTimeline>
        </StyledWorkflow>
      ) : null}
      <ErpOperationalTable
        ariaLabel="Déclarations sociales et IR"
        columns={columns}
        rows={filtered}
        getRowKey={(row) => row.id}
        emptyLabel="Aucune déclaration générée"
      />
    </StyledPanel>
  );
};
