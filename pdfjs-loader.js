/**
 * PDF.js loader (ESM build).
 * Uses CDN to avoid bundling. Works in static hosting.
 */
import * as pdfjsLib from "https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/+esm";
pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.worker.mjs";
export { pdfjsLib };
