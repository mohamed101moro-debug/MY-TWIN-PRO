export interface VisionResult { scene: string; place: string; }

/** Ephemeral local presentation state; never populated from a cloud sensor upload. */
export const sharedPresence: { place: string; vision_summary: string } = { place: '', vision_summary: '' };

export function resetSharedPresence(): void {
  sharedPresence.place = '';
  sharedPresence.vision_summary = '';
}

/**
 * Cloud vision remains disabled until a versioned, revocable consent flow and
 * provider/data-retention policy are implemented and approved.
 */
export async function shareVision(_userId: string, _lang: string): Promise<VisionResult | null> {
  return null;
}
