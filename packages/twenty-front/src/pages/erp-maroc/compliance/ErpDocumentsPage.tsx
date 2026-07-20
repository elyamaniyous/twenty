import {
  ErpOperationalTable,
  type ErpOperationalTableColumn,
} from '@/erp-maroc/components/ErpOperationalTable';
import {
  StyledErpWorkspaceContent,
  StyledErpWorkspaceField,
  StyledErpWorkspaceFormGrid,
  StyledErpWorkspaceInlineActions,
  StyledErpWorkspaceInput,
  StyledErpWorkspacePanel,
  StyledErpWorkspacePanelTitle,
  StyledErpWorkspaceSelect,
  StyledErpWorkspaceSummary,
  ErpWorkspaceSummaryItem,
  StyledErpWorkspaceTabs,
  StyledErpWorkspaceTextarea,
  StyledErpWorkspaceToolbar,
  readFileAsBase64,
} from '@/erp-maroc/components/ErpComplianceUi';
import { ErpPageShell } from '@/erp-maroc/components/ErpPageShell';
import { useErpMarocContext } from '@/erp-maroc/context/useErpMarocContext';
import { useSnackBar } from '@/ui/feedback/snack-bar-manager/hooks/useSnackBar';
import { useEffect, useState } from 'react';
import {
  erpDocumentContentSchema,
  erpDocumentListSchema,
  erpDocumentSchema,
  erpPurchaseOrderListSchema,
  erpSupplierInvoiceSchema,
  type ErpDocument,
  type ErpPurchaseOrder,
} from 'twenty-shared/erp-maroc';
import {
  IconCheck,
  IconDownload,
  IconRefresh,
  IconUpload,
} from 'twenty-ui/display';
import { Button, TabButton } from 'twenty-ui/input';

type View = 'library' | 'ocr';
type DocumentType = ErpDocument['type'];

const documentTypeLabels: Record<DocumentType, string> = {
  SUPPLIER_INVOICE: 'Facture fournisseur',
  CUSTOMER_INVOICE: 'Facture client',
  BANK_STATEMENT: 'Relevé bancaire',
  RECEIPT: 'Justificatif',
  CONTRACT: 'Contrat',
  FISCAL: 'Fiscal',
  PAYROLL: 'Paie',
  OTHER: 'Autre',
};

const downloadBase64 = (filename: string, mimeType: string, value: string) => {
  const bytes = Uint8Array.from(atob(value), (character) =>
    character.charCodeAt(0),
  );
  const url = URL.createObjectURL(new Blob([bytes], { type: mimeType }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
};

const buildInvoiceTemplate = (
  document: ErpDocument,
  purchaseOrder: ErpPurchaseOrder | undefined,
) => {
  const extracted =
    document.extractedData && typeof document.extractedData === 'object'
      ? document.extractedData
      : {};
  if (!purchaseOrder) return JSON.stringify(extracted, null, 2);
  const input = extracted as Record<string, unknown>;
  return JSON.stringify(
    {
      ...input,
      externalReference: input.externalReference ?? '',
      issueDate: input.issueDate ?? new Date().toISOString().slice(0, 10),
      dueDate: input.dueDate ?? new Date().toISOString().slice(0, 10),
      lines:
        input.lines ??
        purchaseOrder.lines.map((line) => ({
          purchaseOrderLineId: line.id,
          quantity: line.quantity,
          unitPriceHtCents: line.unitPriceHtCents,
        })),
    },
    null,
    2,
  );
};

export const ErpDocumentsPage = () => {
  const { client, context } = useErpMarocContext();
  const { enqueueErrorSnackBar, enqueueSuccessSnackBar } = useSnackBar();
  const [view, setView] = useState<View>('library');
  const [documents, setDocuments] = useState<ErpDocument[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<ErpPurchaseOrder[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [generation, setGeneration] = useState(0);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<DocumentType | ''>('');
  const [uploadType, setUploadType] =
    useState<DocumentType>('SUPPLIER_INVOICE');
  const [title, setTitle] = useState('');
  const [tags, setTags] = useState('');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [purchaseOrderId, setPurchaseOrderId] = useState('');
  const [ocrJson, setOcrJson] = useState('{}');
  const canManage = context?.role !== 'COMMERCIAL';

  useEffect(() => {
    const abortController = new AbortController();
    setState('loading');
    const query: Record<string, string> = {};
    if (search.trim()) query.search = search.trim();
    if (filterType) query.type = filterType;
    Promise.all([
      client.request({
        method: 'GET',
        path: '/documents',
        query: Object.keys(query).length ? query : undefined,
        schema: erpDocumentListSchema,
        signal: abortController.signal,
      }),
      client.request({
        method: 'GET',
        path: '/purchase-orders',
        schema: erpPurchaseOrderListSchema,
        signal: abortController.signal,
      }),
    ])
      .then(([loadedDocuments, loadedPurchaseOrders]) => {
        if (abortController.signal.aborted) return;
        setDocuments(loadedDocuments);
        setPurchaseOrders(loadedPurchaseOrders);
        setSelectedId((current) => current || loadedDocuments[0]?.id || '');
        setPurchaseOrderId(
          (current) =>
            current ||
            loadedPurchaseOrders.find(
              (order) =>
                order.status === 'RECEIVED' ||
                order.status === 'PARTIALLY_RECEIVED',
            )?.id ||
            loadedPurchaseOrders[0]?.id ||
            '',
        );
        setState('ready');
      })
      .catch(() => {
        if (!abortController.signal.aborted) setState('error');
      });
    return () => abortController.abort();
  }, [client, filterType, generation, search]);

  const selected =
    documents.find((document) => document.id === selectedId) ?? null;
  const selectedPurchaseOrder = purchaseOrders.find(
    (order) => order.id === purchaseOrderId,
  );
  const refresh = () => setGeneration((value) => value + 1);

  useEffect(() => {
    if (selected)
      setOcrJson(buildInvoiceTemplate(selected, selectedPurchaseOrder));
  }, [selected, selectedPurchaseOrder]);

  const upload = async () => {
    if (!uploadFile || uploadFile.size > 20 * 1024 * 1024) {
      enqueueErrorSnackBar({
        message: 'Sélectionnez un PDF, PNG ou JPEG de 20 Mo maximum',
      });
      return;
    }
    setBusyId('upload');
    try {
      await client
        .createMutationIntent(
          {
            method: 'POST',
            path: '/documents',
            schema: erpDocumentSchema,
            body: {
              type: uploadType,
              filename: uploadFile.name,
              title: title.trim() || uploadFile.name,
              tags: tags
                .split(',')
                .map((tag) => tag.trim())
                .filter(Boolean),
              contentBase64: await readFileAsBase64(uploadFile),
            },
          },
          { idempotency: 'forbidden' },
        )
        .execute();
      enqueueSuccessSnackBar({ message: 'Document déposé dans la GED' });
      setUploadFile(null);
      setTitle('');
      refresh();
    } catch {
      enqueueErrorSnackBar({ message: 'Dépôt du document impossible' });
    } finally {
      setBusyId(null);
    }
  };

  const downloadOriginal = async (document: ErpDocument) => {
    setBusyId(document.id);
    try {
      const file = await client.request({
        method: 'GET',
        path: `/documents/${document.id}/content`,
        schema: erpDocumentContentSchema,
      });
      downloadBase64(file.filename, file.mimeType, file.contentBase64);
    } catch {
      enqueueErrorSnackBar({ message: 'Document indisponible' });
    } finally {
      setBusyId(null);
    }
  };

  const retryOcr = async (document: ErpDocument) => {
    setBusyId(document.id);
    try {
      await client
        .createMutationIntent(
          {
            method: 'POST',
            path: `/documents/${document.id}/ocr/retry`,
            schema: erpDocumentSchema,
          },
          { idempotency: 'forbidden' },
        )
        .execute();
      enqueueSuccessSnackBar({ message: 'OCR remis en file' });
      refresh();
    } catch {
      enqueueErrorSnackBar({ message: 'Relance OCR impossible' });
    } finally {
      setBusyId(null);
    }
  };

  const parseOcr = () => {
    try {
      const parsed: unknown = JSON.parse(ocrJson);
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed))
        throw new Error();
      return parsed;
    } catch {
      enqueueErrorSnackBar({
        message: 'Les données OCR corrigées ne sont pas un objet JSON valide',
      });
      return null;
    }
  };

  const validateOcr = async () => {
    if (!selected) return;
    const extractedData = parseOcr();
    if (!extractedData) return;
    setBusyId(selected.id);
    try {
      await client
        .createMutationIntent(
          {
            method: 'POST',
            path: `/documents/${selected.id}/ocr/validate`,
            schema: erpDocumentSchema,
            body: { extractedData, validationNotes: 'Contrôle humain Zowka' },
          },
          { idempotency: 'forbidden' },
        )
        .execute();
      enqueueSuccessSnackBar({ message: 'Extraction OCR validée' });
      refresh();
    } catch {
      enqueueErrorSnackBar({ message: 'Validation OCR impossible' });
    } finally {
      setBusyId(null);
    }
  };

  const createSupplierInvoice = async () => {
    if (!selected || !purchaseOrderId) return;
    const corrected = parseOcr();
    if (!corrected) return;
    setBusyId(selected.id);
    try {
      await client
        .createMutationIntent(
          {
            method: 'POST',
            path: `/documents/${selected.id}/create-supplier-invoice`,
            schema: erpSupplierInvoiceSchema,
            body: { purchaseOrderId, ...corrected },
          },
          { idempotency: 'forbidden' },
        )
        .execute();
      enqueueSuccessSnackBar({
        message: 'Facture fournisseur créée depuis la GED',
      });
      refresh();
    } catch {
      enqueueErrorSnackBar({
        message:
          'Création comptable impossible. Vérifiez les lignes de commande.',
      });
    } finally {
      setBusyId(null);
    }
  };

  const columns: ErpOperationalTableColumn<ErpDocument>[] = [
    {
      key: 'date',
      header: 'Déposé le',
      width: '130px',
      render: (row) => row.createdAt.slice(0, 10),
    },
    {
      key: 'title',
      header: 'Document',
      width: '280px',
      render: (row) => row.title,
    },
    {
      key: 'type',
      header: 'Type',
      width: '170px',
      render: (row) => documentTypeLabels[row.type],
    },
    {
      key: 'status',
      header: 'Traitement',
      width: '150px',
      render: (row) => row.status,
    },
    {
      key: 'confidence',
      header: 'Confiance OCR',
      width: '130px',
      align: 'right',
      render: (row) =>
        row.ocrConfidenceBasisPoints === null
          ? '—'
          : `${(row.ocrConfidenceBasisPoints / 100).toFixed(1)} %`,
    },
    {
      key: 'tags',
      header: 'Tags',
      width: '180px',
      render: (row) => row.tags.join(', ') || '—',
    },
    {
      key: 'actions',
      header: 'Actions',
      width: '280px',
      render: (row) => (
        <StyledErpWorkspaceInlineActions>
          <Button
            title="Ouvrir"
            ariaLabel="Ouvrir dans la GED"
            variant={selectedId === row.id ? 'primary' : 'secondary'}
            onClick={() => {
              setSelectedId(row.id);
              setView('ocr');
            }}
          />
          <Button
            title="Télécharger"
            ariaLabel="Télécharger le document"
            Icon={IconDownload}
            variant="secondary"
            disabled={busyId !== null}
            onClick={() => void downloadOriginal(row)}
          />
          {row.type === 'SUPPLIER_INVOICE' &&
          (row.status === 'FAILED' || row.status === 'UPLOADED') ? (
            <Button
              title="Relancer OCR"
              ariaLabel="Relancer OCR"
              Icon={IconRefresh}
              variant="secondary"
              disabled={!canManage || busyId !== null}
              onClick={() => void retryOcr(row)}
            />
          ) : null}
        </StyledErpWorkspaceInlineActions>
      ),
    },
  ];

  const pendingOcr = documents.filter((document) =>
    ['OCR_PENDING', 'OCR_PROCESSING', 'REVIEW_REQUIRED'].includes(
      document.status,
    ),
  ).length;

  return (
    <ErpPageShell
      title="GED et OCR comptable"
      description="Documents, classement, recherche et validation des factures fournisseurs"
      actions={
        <Button
          title="Actualiser"
          ariaLabel="Actualiser"
          Icon={IconRefresh}
          variant="secondary"
          onClick={refresh}
        />
      }
      state={state}
      loadingLabel="Chargement de la GED"
      errorLabel="Impossible de charger la GED"
      onRetry={refresh}
    >
      <StyledErpWorkspaceTabs role="tablist" aria-label="GED comptable">
        <TabButton
          id="documents-library"
          title="Bibliothèque"
          active={view === 'library'}
          onClick={() => setView('library')}
        />
        <TabButton
          id="documents-ocr"
          title="Contrôle OCR"
          active={view === 'ocr'}
          onClick={() => setView('ocr')}
        />
      </StyledErpWorkspaceTabs>
      <StyledErpWorkspaceSummary>
        <ErpWorkspaceSummaryItem label="Documents" value={documents.length} />
        <ErpWorkspaceSummaryItem label="OCR à traiter" value={pendingOcr} />
        <ErpWorkspaceSummaryItem
          label="Validés"
          value={
            documents.filter((document) => document.status === 'VALIDATED')
              .length
          }
        />
      </StyledErpWorkspaceSummary>
      <StyledErpWorkspaceToolbar>
        <StyledErpWorkspaceField>
          Recherche
          <StyledErpWorkspaceInput
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </StyledErpWorkspaceField>
        <StyledErpWorkspaceField>
          Type
          <StyledErpWorkspaceSelect
            value={filterType}
            onChange={(event) =>
              setFilterType(event.target.value as DocumentType | '')
            }
          >
            <option value="">Tous</option>
            {Object.entries(documentTypeLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </StyledErpWorkspaceSelect>
        </StyledErpWorkspaceField>
      </StyledErpWorkspaceToolbar>
      <StyledErpWorkspaceContent>
        {view === 'library' ? (
          <>
            <StyledErpWorkspacePanel>
              <StyledErpWorkspacePanelTitle>
                Ajouter un document
              </StyledErpWorkspacePanelTitle>
              <StyledErpWorkspaceFormGrid>
                <StyledErpWorkspaceField>
                  Type
                  <StyledErpWorkspaceSelect
                    value={uploadType}
                    onChange={(event) =>
                      setUploadType(event.target.value as DocumentType)
                    }
                  >
                    {Object.entries(documentTypeLabels).map(
                      ([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ),
                    )}
                  </StyledErpWorkspaceSelect>
                </StyledErpWorkspaceField>
                <StyledErpWorkspaceField>
                  Titre
                  <StyledErpWorkspaceInput
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                  />
                </StyledErpWorkspaceField>
                <StyledErpWorkspaceField>
                  Tags séparés par virgule
                  <StyledErpWorkspaceInput
                    value={tags}
                    onChange={(event) => setTags(event.target.value)}
                  />
                </StyledErpWorkspaceField>
                <StyledErpWorkspaceField>
                  Fichier
                  <StyledErpWorkspaceInput
                    type="file"
                    accept="application/pdf,image/png,image/jpeg"
                    onChange={(event) =>
                      setUploadFile(event.target.files?.[0] ?? null)
                    }
                  />
                </StyledErpWorkspaceField>
                <Button
                  title="Déposer"
                  ariaLabel="Déposer le document"
                  Icon={IconUpload}
                  variant="primary"
                  disabled={!canManage || !uploadFile || busyId !== null}
                  onClick={() => void upload()}
                />
              </StyledErpWorkspaceFormGrid>
            </StyledErpWorkspacePanel>
            <ErpOperationalTable
              ariaLabel="Bibliothèque documentaire"
              columns={columns}
              rows={documents}
              getRowKey={(row) => row.id}
              emptyLabel="Aucun document"
            />
          </>
        ) : null}
        {view === 'ocr' ? (
          <StyledErpWorkspacePanel>
            <StyledErpWorkspacePanelTitle>
              Contrôle humain avant création comptable
            </StyledErpWorkspacePanelTitle>
            {selected ? (
              <StyledErpWorkspaceFormGrid>
                <StyledErpWorkspaceField>
                  Document
                  <StyledErpWorkspaceSelect
                    value={selectedId}
                    onChange={(event) => setSelectedId(event.target.value)}
                  >
                    {documents
                      .filter(
                        (document) => document.type === 'SUPPLIER_INVOICE',
                      )
                      .map((document) => (
                        <option key={document.id} value={document.id}>
                          {document.title} · {document.status}
                        </option>
                      ))}
                  </StyledErpWorkspaceSelect>
                </StyledErpWorkspaceField>
                <StyledErpWorkspaceField>
                  Commande fournisseur
                  <StyledErpWorkspaceSelect
                    value={purchaseOrderId}
                    onChange={(event) => setPurchaseOrderId(event.target.value)}
                  >
                    {purchaseOrders.map((order) => (
                      <option key={order.id} value={order.id}>
                        {order.number} · {order.supplier.name}
                      </option>
                    ))}
                  </StyledErpWorkspaceSelect>
                </StyledErpWorkspaceField>
                <StyledErpWorkspaceField>
                  Données extraites et corrigées
                  <StyledErpWorkspaceTextarea
                    value={ocrJson}
                    onChange={(event) => setOcrJson(event.target.value)}
                  />
                </StyledErpWorkspaceField>
                <StyledErpWorkspaceInlineActions>
                  {selected.status === 'REVIEW_REQUIRED' ? (
                    <Button
                      title="Valider l'OCR"
                      ariaLabel="Valider les données OCR"
                      Icon={IconCheck}
                      variant="primary"
                      disabled={!canManage || busyId !== null}
                      onClick={() => void validateOcr()}
                    />
                  ) : null}
                  {selected.status === 'VALIDATED' &&
                  !selected.linkedEntityId ? (
                    <Button
                      title="Créer la facture"
                      ariaLabel="Créer la facture fournisseur"
                      variant="primary"
                      disabled={
                        !canManage || !purchaseOrderId || busyId !== null
                      }
                      onClick={() => void createSupplierInvoice()}
                    />
                  ) : null}
                  <Button
                    title="Télécharger l'original"
                    ariaLabel="Télécharger l'original"
                    Icon={IconDownload}
                    variant="secondary"
                    disabled={busyId !== null}
                    onClick={() => void downloadOriginal(selected)}
                  />
                </StyledErpWorkspaceInlineActions>
              </StyledErpWorkspaceFormGrid>
            ) : null}
          </StyledErpWorkspacePanel>
        ) : null}
      </StyledErpWorkspaceContent>
    </ErpPageShell>
  );
};
