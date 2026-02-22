import { requireAuth } from "../auth.js";
import { supabase } from "../supabaseClient.js";
import { fmtMoney } from "../utils.js";
import { loadPortfolios } from "../portfolioSelect.js";
import { wireNav } from "../_nav.js";

await wireNav();
await requireAuth();

const portfolioSelect = document.getElementById("portfolioSelect");
const fyYear = document.getElementById("fyYear");
const plBody = document.querySelector("#plTable tbody");
const bsBody = document.querySelector("#bsTable tbody");
const msg = document.getElementById("msg");

function showMsg(text, isError=false){
  msg.classList.remove("hidden");
  msg.classList.toggle("error", isError);
  msg.classList.toggle("ok", !isError);
  msg.textContent = text;
}

await loadPortfolios(portfolioSelect);

async function load(){
  msg.classList.add("hidden");
  plBody.innerHTML = "";
  bsBody.innerHTML = "";

  const portfolioId = portfolioSelect.value;
  if (!portfolioId) return;

  const y = Number(fyYear.value);

  const { data: pl, error: e1 } = await supabase
    .from("fs_profit_loss")
    .select("*")
    .eq("portfolio_id", portfolioId)
    .eq("fy_year", y)
    .maybeSingle();
  if (e1) return showMsg(e1.message, true);
  if (!pl) return showMsg("No financial statements computed yet. Run Recalculate on Dashboard.", true);

  const plLines = [
    ["Sales", pl.sales],
    ["Less: purchase", -pl.purchases],
    ["Less: commission", -pl.commission],
    ["Gross profit", pl.gross_profit],
    ["Add: dividend income", pl.dividend_income],
    ["Add: unrealised capital gain/(loss)", pl.unrealised_gl],
    ["Less: other costs", -pl.other_costs],
    ["Profit before tax", pl.profit_before_tax],
    ["Tax: actual tax", -pl.actual_tax],
    ["Tax: provision for additional tax", -pl.additional_tax_provision],
    ["Net profit", pl.net_profit],
  ];
  for (const [name, val] of plLines){
    const tr = document.createElement("tr");
    tr.innerHTML = `<td>${name}</td><td>${fmtMoney(val ?? 0)}</td>`;
    plBody.appendChild(tr);
  }

  const { data: bs, error: e2 } = await supabase
    .from("fs_position")
    .select("*")
    .eq("portfolio_id", portfolioId)
    .eq("fy_year", y)
    .maybeSingle();
  if (e2) return showMsg(e2.message, true);

  const bsLines = [
    ["Cash", bs.cash_balance],
    ["Investments (fair value)", bs.investments_fv],
    ["Deferred tax asset", bs.deferred_tax_asset],
    ["Deferred tax liability", -bs.deferred_tax_liability],
    ["Net assets", bs.net_assets],
    ["Equity", bs.equity],
  ];
  for (const [name, val] of bsLines){
    const tr = document.createElement("tr");
    tr.innerHTML = `<td>${name}</td><td>${fmtMoney(val ?? 0)}</td>`;
    bsBody.appendChild(tr);
  }
}

document.getElementById("btnLoad").addEventListener("click", load);
await load();
