import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";
import { ToastMascot, type ToastMascotProps } from "@whoscooked/brand";

/**
 * Renders the pure ToastMascot component to SVG markup in the browser, so the
 * canvas game and the share card use the exact same toast as the UI.
 */
export function toastSvg(props: ToastMascotProps): string {
  const host = document.createElement("div");
  const root = createRoot(host);
  flushSync(() => root.render(<ToastMascot {...props} title={null} size={200} />));
  const svg = host.innerHTML.replace("<svg", '<svg xmlns="http://www.w3.org/2000/svg"');
  root.unmount();
  return svg;
}

/** Extra room above the slice so smoke isn't clipped when the SVG becomes an image. */
export const TOAST_IMAGE_TOP = 50;

/** Raster toast, 200 x (240 + TOAST_IMAGE_TOP) units at `scale`. */
export async function toastImage(props: ToastMascotProps, scale: number): Promise<HTMLImageElement> {
  const h = 240 + TOAST_IMAGE_TOP;
  const svg = toastSvg(props)
    .replace(/width="200" height="240"/, `width="${200 * scale}" height="${h * scale}"`)
    .replace('viewBox="0 0 200 240"', `viewBox="0 ${-TOAST_IMAGE_TOP} 200 ${h}"`);
  const img = new Image();
  img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  await img.decode();
  return img;
}
