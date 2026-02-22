import { pdfjsLib } from "../pdfjs-loader.js";
import { parseNumber, parseDateDMY } from "../utils.js";

/**
 * Parse broker Transaction Statement (SR2758-like).
 *
 * We rely on extracted text items. The PDF's table rows typically include:
 * Date, BuyQty or SellQty, Rate, Comm, ADC, Taxes, Charges, Amount, Settlement, Side(B/P), Symbol
 *
 * This parser is designed to be resilient: it scans for the "With Tax & Commission" area
 * and then extracts rows by detecting date tokens (dd-mm-yy) and reading forward.
 */
export async function parseTransactionPDF(file){
  const buf = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buf }).promise;

  const tokens = [];
  for (let p = 1; p <= pdf.numPages; p++){
    const page = await pdf.getPage(p);
    const content = await page.getTextContent();
    for (const it of content.items){
      const str = String(it.str ?? "").trim();
      if (str) tokens.push(str);
    }
  }

  // Find start marker
  const startIdx = tokens.findIndex(t => t.toLowerCase().includes("with tax") && t.toLowerCase().includes("commission"));
  const work = startIdx >= 0 ? tokens.slice(startIdx) : tokens;

  const rows = [];
  for (let i = 0; i < work.length; i++){
    const d = parseDateDMY(work[i]);
    if (!d) continue;

    // Heuristic: after date we expect either "0" or qty and later settlement "T+1REG"
    // We'll search forward within a window and attempt to locate settlement, side (B/P) and symbol.
    const window = work.slice(i, i+80);

    const settlementIdx = window.findIndex(x => /^T\+\d+REG$/i.test(x));
    const symbolIdx = window.findIndex(x => /^[A-Z]{2,10}$/.test(x) && !["WEB","EMAIL","PHONES","FED","REG"].includes(x));
    const sideIdx = window.findIndex(x => x === "B" || x === "P");
    if (settlementIdx < 0 || symbolIdx < 0 || sideIdx < 0) continue;

    const settlement = window[settlementIdx];
    const symbol = window[symbolIdx];
    const side = window[sideIdx] === "B" ? "BUY" : "SELL";

    // Qty appears near the side area; the statement has Buy and Sell columns, one side 0.
    // We'll search backward from side token for the first numeric token that looks like qty.
    let qty = null;
    for (let k = sideIdx-1; k >= 0 && k >= sideIdx-10; k--){
      const v = parseNumber(window[k]);
      if (v !== null && Number.isFinite(v) && v >= 0){
        // quantities are usually integers and can be big
        qty = v;
        break;
      }
    }

    // Rate appears near beginning; search for first token with 4 decimals (e.g., 215.4900)
    let rate = null;
    for (const t of window){
      if (/^\d+\.\d{4}$/.test(t)){
        rate = parseNumber(t);
        break;
      }
    }

    // Charges fields: Comm, ADC, Taxes, Charges are often 0.3232, 2.91, 1.50, etc.
    // We use a heuristic: near the end before symbol are 4 numeric small values and then amount.
    // We'll get amount: token that looks like currency with comma OR has negative sign.
    let amount = null;
    for (const t of window){
      if (/^-?\d{1,3}(,\d{3})*(\.\d+)?$/.test(t) && (t.includes(",") || t.startsWith("-"))){
        const v = parseNumber(t);
        if (v !== null){
          amount = v;
          break;
        }
      }
    }

    // Now attempt to capture Comm/ADC/Taxes/Charges: look for 4 consecutive numbers before amount token.
    let comm=null, adc=null, taxes=null, charges=null;
    if (amount !== null){
      const amtIdx = window.findIndex(t => parseNumber(t) === amount && (t.includes(",") || t.startsWith("-")));
      if (amtIdx > 4){
        const cand = window.slice(amtIdx-20, amtIdx); // search area
        // pick last 4 small numbers
        const nums = cand.map(parseNumber).filter(v => v !== null && Math.abs(v) < 10000);
        if (nums.length >= 4){
          const last4 = nums.slice(-4);
          [comm, adc, taxes, charges] = last4;
        }
      }
    }

    // Basic sanity
    if (!qty || !rate || amount === null) continue;

    rows.push({
      trade_date: d,
      symbol,
      side,
      quantity: qty,
      rate,
      commission: comm ?? 0,
      adc: adc ?? 0,
      taxes: taxes ?? 0,
      charges: charges ?? 0,
      net_amount: amount,
      settlement,
    });

    // skip forward a bit to avoid re-detecting same row
    i += 5;
  }

  // de-dup within the parsed file itself
  const key = r => [r.trade_date,r.symbol,r.side,r.quantity,r.rate,r.net_amount,r.settlement].join("|");
  const seen = new Set();
  const unique = [];
  for (const r of rows){
    const k = key(r);
    if (seen.has(k)) continue;
    seen.add(k);
    unique.push(r);
  }
  return unique;
}
