const isNonNegativeSafeInteger = (value: number): boolean =>
  Number.isSafeInteger(value) && value >= 0;

export const clampCreditAllocation = (
  availableCreditCents: number,
  targetOutstandingCents: number,
  requestedCents: number,
): number => {
  if (
    !isNonNegativeSafeInteger(availableCreditCents) ||
    !isNonNegativeSafeInteger(targetOutstandingCents) ||
    !isNonNegativeSafeInteger(requestedCents)
  ) {
    return 0;
  }

  return Math.min(availableCreditCents, targetOutstandingCents, requestedCents);
};
