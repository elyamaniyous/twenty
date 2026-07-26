import { z } from 'zod';

import {
  instantSchema,
  nullableInstantSchema,
  nullableUuidSchema,
  uuidSchema,
} from './erp-maroc-contracts';

const nullableStringSchema = z.string().nullable();
const nullableIntegerSchema = z.number().int().nullable();
const countSchema = z.number().int().nonnegative();

export const marketingConsentStatusSchema = z.enum([
  'UNKNOWN',
  'OPTED_IN',
  'OPTED_OUT',
]);
export const marketingLifecycleStageSchema = z.enum([
  'LEAD',
  'PROSPECT',
  'CUSTOMER',
  'LOYAL',
  'ADVOCATE',
]);
export const marketingSegmentStatusSchema = z.enum([
  'SYNCING',
  'ACTIVE',
  'SYNC_ERROR',
  'ARCHIVED',
]);
export const marketingCampaignStatusSchema = z.enum([
  'DRAFT',
  'SCHEDULED',
  'SENT',
  'FAILED',
  'ARCHIVED',
]);
export const marketingAutomationStatusSchema = z.enum([
  'DRAFT',
  'ACTIVE',
  'PAUSED',
  'ARCHIVED',
]);
export const marketingAutomationTriggerSchema = z.enum([
  'CONTACT_OPTED_IN',
  'SCORE_THRESHOLD_REACHED',
  'MANUAL',
]);
export const marketingAutomationRunStatusSchema = z.enum([
  'COMPLETED',
  'FAILED',
  'SKIPPED',
]);
export const marketingEventTypeSchema = z.enum([
  'CONTACT_OPTED_IN',
  'FORM_SUBMITTED',
  'PAGE_VISITED',
  'EMAIL_OPENED',
  'EMAIL_CLICKED',
  'OPPORTUNITY_CREATED',
  'PURCHASE_COMPLETED',
  'UNSUBSCRIBED',
]);

export const marketingContactSchema = z.object({
  id: uuidSchema,
  organisationId: uuidSchema,
  societeId: uuidSchema,
  tierId: nullableUuidSchema,
  twentyPersonId: nullableStringSchema,
  email: z.string().email(),
  firstName: nullableStringSchema,
  lastName: nullableStringSchema,
  phone: nullableStringSchema,
  lifecycleStage: marketingLifecycleStageSchema,
  consentStatus: marketingConsentStatusSchema,
  consentSource: nullableStringSchema,
  consentAt: nullableInstantSchema,
  unsubscribedAt: nullableInstantSchema,
  emailBlacklisted: z.boolean(),
  brevoContactId: nullableStringSchema,
  lastSyncedAt: nullableInstantSchema,
  lastSyncError: nullableStringSchema,
  tags: z.array(z.string()),
  score: z.number().int(),
  createdAt: instantSchema,
  updatedAt: instantSchema,
  tier: z.object({ name: z.string() }).nullable().optional(),
});
export const marketingContactListSchema = z.array(marketingContactSchema);

export const marketingSegmentSchema = z.object({
  id: uuidSchema,
  organisationId: uuidSchema,
  societeId: uuidSchema,
  name: z.string(),
  description: nullableStringSchema,
  lifecycleStage: marketingLifecycleStageSchema.nullable(),
  minScore: nullableIntegerSchema,
  maxScore: nullableIntegerSchema,
  status: marketingSegmentStatusSchema,
  brevoListId: nullableIntegerSchema,
  lastSyncedAt: nullableInstantSchema,
  lastSyncError: nullableStringSchema,
  createdByTwentyUserId: z.string(),
  createdAt: instantSchema,
  updatedAt: instantSchema,
  _count: z
    .object({
      members: countSchema,
      campaigns: countSchema,
    })
    .optional(),
});
export const marketingSegmentListSchema = z.array(marketingSegmentSchema);

export const marketingCampaignSchema = z.object({
  id: uuidSchema,
  organisationId: uuidSchema,
  societeId: uuidSchema,
  segmentId: uuidSchema,
  name: z.string(),
  subject: z.string(),
  previewText: nullableStringSchema,
  htmlContent: z.string(),
  status: marketingCampaignStatusSchema,
  brevoCampaignId: nullableIntegerSchema,
  scheduledAt: nullableInstantSchema,
  sentAt: nullableInstantSchema,
  recipientsCount: countSchema,
  deliveredCount: countSchema,
  openedCount: countSchema,
  clickedCount: countSchema,
  unsubscribedCount: countSchema,
  hardBouncedCount: countSchema,
  lastSyncedAt: nullableInstantSchema,
  lastProviderError: nullableStringSchema,
  createdByTwentyUserId: z.string(),
  createdAt: instantSchema,
  updatedAt: instantSchema,
  segment: z.object({ id: uuidSchema, name: z.string() }),
});
export const marketingCampaignListSchema = z.array(marketingCampaignSchema);

export const marketingAutomationSchema = z.object({
  id: uuidSchema,
  organisationId: uuidSchema,
  societeId: uuidSchema,
  segmentId: nullableUuidSchema,
  name: z.string(),
  trigger: marketingAutomationTriggerSchema,
  status: marketingAutomationStatusSchema,
  emailSubject: z.string(),
  emailHtmlContent: z.string(),
  minimumScore: nullableIntegerSchema,
  createdByTwentyUserId: z.string(),
  activatedAt: nullableInstantSchema,
  createdAt: instantSchema,
  updatedAt: instantSchema,
  segment: z.object({ id: uuidSchema, name: z.string() }).nullable(),
  _count: z.object({ runs: countSchema }),
});
export const marketingAutomationListSchema = z.array(marketingAutomationSchema);

export const marketingScoringRuleSchema = z.object({
  id: uuidSchema,
  organisationId: uuidSchema,
  societeId: uuidSchema,
  name: z.string(),
  eventType: marketingEventTypeSchema,
  points: z.number().int(),
  isActive: z.boolean(),
  createdByTwentyUserId: z.string(),
  createdAt: instantSchema,
  updatedAt: instantSchema,
});
export const marketingScoringRuleListSchema = z.array(
  marketingScoringRuleSchema,
);

export const marketingEventSchema = z.object({
  id: uuidSchema,
  organisationId: uuidSchema,
  societeId: uuidSchema,
  contactId: uuidSchema,
  scoringRuleId: nullableUuidSchema,
  eventType: marketingEventTypeSchema,
  source: z.string(),
  externalId: nullableStringSchema,
  pointsApplied: z.number().int(),
  scoreBefore: z.number().int(),
  scoreAfter: z.number().int(),
  metadata: z.record(z.unknown()),
  occurredAt: instantSchema,
  triggeredByTwentyUserId: z.string(),
  createdAt: instantSchema,
  contact: z.object({
    id: uuidSchema,
    email: z.string().email(),
    firstName: nullableStringSchema,
    lastName: nullableStringSchema,
  }),
  scoringRule: z.object({ id: uuidSchema, name: z.string() }).nullable(),
});
export const marketingEventListSchema = z.array(marketingEventSchema);

export const marketingAutomationRunSchema = z.object({
  id: uuidSchema,
  organisationId: uuidSchema,
  societeId: uuidSchema,
  automationId: uuidSchema,
  contactId: uuidSchema,
  status: marketingAutomationRunStatusSchema,
  providerMessageId: nullableStringSchema,
  error: nullableStringSchema,
  triggeredByTwentyUserId: z.string(),
  startedAt: instantSchema,
  finishedAt: instantSchema,
  automation: z.object({ name: z.string() }),
  contact: z.object({
    email: z.string().email(),
    firstName: nullableStringSchema,
    lastName: nullableStringSchema,
  }),
});

export const marketingOverviewSchema = z.object({
  connectorConfigured: z.boolean(),
  counts: z.object({
    contacts: countSchema,
    optedInContacts: countSchema,
    segments: countSchema,
    campaigns: countSchema,
    activeAutomations: countSchema,
    activeScoringRules: countSchema,
    events30d: countSchema,
  }),
  averageScore: z.number().int(),
  recentRuns: z.array(marketingAutomationRunSchema),
});

export const marketingTierImportResultSchema = z.object({
  imported: countSchema,
  updated: countSchema,
  skipped: countSchema,
});

export const marketingSegmentSyncResultSchema = z.object({
  segmentId: uuidSchema,
  memberCount: countSchema,
  removedCount: countSchema,
  processId: nullableIntegerSchema,
});

export type MarketingContact = z.infer<typeof marketingContactSchema>;
export type MarketingSegment = z.infer<typeof marketingSegmentSchema>;
export type MarketingCampaign = z.infer<typeof marketingCampaignSchema>;
export type MarketingAutomation = z.infer<typeof marketingAutomationSchema>;
export type MarketingScoringRule = z.infer<typeof marketingScoringRuleSchema>;
export type MarketingEvent = z.infer<typeof marketingEventSchema>;
export type MarketingOverview = z.infer<typeof marketingOverviewSchema>;
