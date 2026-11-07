import type { DeviceInfo } from "@whoscooked/game-core";

/** Coarse device facts stored with a play (PRD section 5). No fingerprinting. */
export function detectDevice(refreshHz: number | null, inputType: string): DeviceInfo {
  const coarse = window.matchMedia("(pointer: coarse)").matches;
  const shortSide = Math.min(window.screen.width, window.screen.height);
  const deviceClass: DeviceInfo["deviceClass"] = !coarse ? "desktop" : shortSide >= 600 ? "tablet" : "phone";
  return { deviceClass, browser: detectBrowser(navigator.userAgent), refreshHz, inputType };
}

export function detectBrowser(ua: string): string {
  if (/BytedanceWebview|musical_ly|TikTok/i.test(ua)) return "tiktok-inapp";
  if (/Instagram/i.test(ua)) return "instagram-inapp";
  if (/FBAN|FBAV/i.test(ua)) return "facebook-inapp";
  if (/SamsungBrowser/i.test(ua)) return "samsung";
  if (/Edg\//i.test(ua)) return "edge";
  if (/Firefox|FxiOS/i.test(ua)) return "firefox";
  if (/CriOS|Chrome/i.test(ua)) return "chrome";
  if (/Safari/i.test(ua)) return "safari";
  return "other";
}
