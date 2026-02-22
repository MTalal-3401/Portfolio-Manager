import { pdfjsLib } from "../pdfjs-loader.js";
import { parseNumber, parseDateDMY, parseDateSlash } from "../utils.js";

/**
 * Parse CDC Dividend / Zakat & Tax Deduction Summary PDF.
 *
 * Rows include:
 * Payment Date, Dividend Issue Date, SYMBOL - NAME, ... No. of Securities, Gross Dividend, Tax, JH's Tax, Zakat, Net Dividend
 */
export async function parseDividendPDF(file){
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

  // We scan for Payment Date tokens (dd/mm/yyyy or dd-mm-yyyy) then interpret the row.
  const rows = [];
  for (let i = 0; i < tokens.length; i++){
    const pay = parseDateSlash(tokens[i]) || parseDateDMY(tokens[i]);
    if (!pay) continue;

    const issue = parseDateSlash(tokens[i+1]) || parseDateDMY(tokens[i+1]);
    if (!issue) continue;

    // Next token often is SYMBOL or "EFERT - ..." (we want symbol)
    const symTok = tokens[i+2] ?? "";
    const sym = symTok.split("-")[0].trim().toUpperCase();
    if (!/^[A-Z]{2,10}$/.test(sym)) continue;

    // Find securities count and amounts later in the row.
    // We'll search forward within a window for pattern: securities (int) then gross, tax, jh, zakat, net.
    const window = tokens.slice(i, i+40);

    // securities: first large-ish int after filer status
    let securities = null;
    for (const t of window){
      const v = parseNumber(t);
      if (v !== null && Number.isFinite(v) && v >= 1 && v === Math.floor(v) && v < 10_000_000){
        // ensure it's not year
        if (v >= 2000 && v <= 2100) continue;
        securities = v;
        break;
      }
    }

    // amounts: look for 5 money tokens with commas and decimals
    const money = window
      .filter(t => /^\d{1,3}(,\d{3})*(\.\d{2})$/.test(t))
      .map(parseNumber)
      .filter(v => v !== null);

    // In your report: gross, tax, jhTax, zakat, net (jhTax & zakat often 0.00)
    if (money.length < 3 || securities === null) continue;

    // Choose last 5 if available else infer: gross, tax, jh, zakat, net from end
    let gross=null, tax=null, jhTax=0, zakat=0, net=null;
    if (money.length >= 5){
      const last5 = money.slice(-5);
      [gross, tax, jhTax, zakat, net] = last5;
    }else{
      // fallback: assume gross, tax, net are the last 3
      const last3 = money.slice(-3);
      [gross, tax, net] = last3;
    }

    rows.push({
      payment_date: pay,
      issue_date: issue,
      symbol: sym,
      securities,
      gross_amount: gross ?? 0,
      tax_withheld: tax ?? 0,
      jh_tax: jhTax ?? 0,
      zakat: zakat ?? 0,
      net_amount: net ?? ((gross ?? 0) - (tax ?? 0) - (jhTax ?? 0) - (zakat ?? 0)),
    });

    i += 8;
  }

  // de-dup within file
  const key = r => [r.payment_date,r.symbol,r.gross_amount,r.tax_withheld,r.net_amount,r.securities].join("|");
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
