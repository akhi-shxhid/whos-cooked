/**
 * Typed analytics events (PRD section 24). Never send names, emails, or raw
 * personal text: properties are limited to the typed fields below.
 *
 * TODO(M4-owner): needs a PostHog EU Cloud project key. Until a transport is set
 * and the player has consented where required (PRD section 22), events stay in
 * memory and nothing leaves the device.
 */

export type AnalyticsEvent =
  | "landing_viewed" | "age_confirmed" | "game_started" | "calibration_completed"
  | "round_started" | "round_completed" | "game_abandoned" | "score_revealed"
  | "result_saved" | "challenge_created" | "challenge_shared" | "challenge_opened"
  | "challenge_started" | "challenge_completed" | "duo_result_viewed" | "rematch_started"
  | "report_preview_viewed" | "checkout_started" | "purchase_completed" | "purchase_failed"
  | "subscription_started" | "subscription_canceled" | "daily_started" | "daily_completed"
  | "streak_extended" | "room_created" | "room_joined" | "focus_day_completed"
  | "push_opted_in" | "email_opted_in" | "leaderboard_posted" | "mission_completed" | "level_up";

export interface EventProperties {
  source?: string;
  creator_code?: string;
  campaign?: string;
  country?: string;
  locale?: string;
  device_class?: string;
  browser?: string;
  scoring_version?: string;
  variant?: string;
  round?: number;
  cooked_score?: number;
  level?: string;
  share_method?: "native" | "copy" | "download";
}

export interface TrackedEvent {
  event: AnalyticsEvent;
  properties: EventProperties;
  at: number;
}

export type Transport = (e: TrackedEvent) => void;

const buffer: TrackedEvent[] = [];
let transport: Transport | null = null;

/** Install a transport (PostHog) once consent allows. Flushes buffered events. */
export function setTransport(t: Transport | null) {
  transport = t;
  if (t) for (const e of buffer.splice(0)) t(e);
}

export function track(event: AnalyticsEvent, properties: EventProperties = {}) {
  const e: TrackedEvent = { event, properties, at: Date.now() };
  if (transport) transport(e);
  else if (buffer.length < 200) buffer.push(e);
}

/** For tests and debugging. */
export function bufferedEvents(): readonly TrackedEvent[] {
  return buffer;
}
