import { requireAuth } from "../auth.js";
import { uploadToBucket, callFn } from "../api.js";
import { sha256Hex, setHTML, show, hide } from "../utils.js";
import { loadPortfolios } from "../portfolioSelect.js";
import { wireNav } from "../_nav.js";
import { parseDividendPDF } from "../parseDividendPDF.js";

await wireNav();
await requireAuth();

const portfolioSelect = document.getElementById("portfolioSelect");
const pdfFile = document.getElementById("pdfFile");
const reportLabel = document.getElementById("reportLabel");
const btnPreview = document.getElementById("btnPreview");
const btnImport = document.getElementById("btnImport");
const msg = document.getElementById("msg");
const tbody = document.querySelector("#previewTable tbody");

let parsed = [];

function showMsg(text, isError=false){
  msg.classList.remove("hidden");
  msg.classList.toggle("error", isError);
  msg.classList.toggle("ok", !isError);
  msg.textContent = text;
}

await loadPortfolios(portfolioSelect);

pdfFile.addEventListener("change", () => {
  btnPreview.disabled = !pdfFile.files?.length;
  btnImport.disabled = true;
  hide("msg");
  tbody.innerHTML = "";
  parsed = [];
});

btnPreview.addEventListener("click", async () => {
  hide("msg");
  tbody.innerHTML = "";
  parsed = [];
  try{
    const file = pdfFile.files[0];
    showMsg("Parsing PDF…");
    parsed = await parseDividendPDF(file);
    if (!parsed.length){
      return showMsg("No dividend rows detected. Ensure you uploaded the CDC Dividend Summary report PDF.", true);
    }
    showMsg(`Parsed ${parsed.length} dividend rows. Review preview then Import.`, false);
    for (const r of parsed.slice(0,15)){
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${r.payment_date}</td><td>${r.issue_date}</td><td>${r.symbol}</td><td>${r.securities}</td>
        <td>${r.gross_amount}</td><td>${r.tax_withheld}</td><td>${r.zakat ?? 0}</td><td>${r.net_amount}</td>
      `;
      tbody.appendChild(tr);
    }
    btnImport.disabled = false;
  }catch(err){
    showMsg(err.message ?? String(err), true);
  }
});

btnImport.addEventListener("click", async () => {
  hide("msg");
  const portfolioId = portfolioSelect.value;
  if (!portfolioId) return showMsg("Select a portfolio first.", true);
  if (!parsed.length) return showMsg("Preview first.", true);

  try{
    const file = pdfFile.files[0];

    const fileHash = await sha256Hex(`${file.name}:${file.size}:${file.lastModified}`);
    const path = `${portfolioId}/dividend_reports/${new Date().toISOString().slice(0,10)}_${fileHash}.pdf`;
    showMsg("Uploading PDF…");
    await uploadToBucket("imports", path, file);

    showMsg("Sending parsed dividends to server…");
    const res = await callFn("upsert_dividends_json", {
      portfolio_id: portfolioId,
      source_label: reportLabel.value?.trim() || null,
      storage_path: path,
      dividends: parsed,
    });

    showMsg(`Imported: ${res.inserted} | Duplicates skipped: ${res.skipped} | Errors: ${res.errors?.length ?? 0}`);
    btnImport.disabled = true;
  }catch(err){
    showMsg(err.message ?? String(err), true);
  }
});
