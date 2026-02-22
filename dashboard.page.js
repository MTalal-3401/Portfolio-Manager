import { requireAuth } from "../auth.js";
import { supabase } from "../supabaseClient.js";
import { callFn } from "../api.js";
import { fmtMoney, setText, setHTML, show, hide } from "../utils.js";
import { loadPortfolios } from "../portfolioSelect.js";
import { wireNav } from "../_nav.js";

await wireNav();
await requireAuth();

const portfolioSelect = document.getElementById("portfolioSelect");
const holdingsBody = document.querySelector("#holdingsTable tbody");
const dashMsg = document.getElementById("dashMsg");

function msg(text, isError=false){
  dashMsg.classList.remove("hidden");
  dashMsg.classList.toggle("error", isError);
  dashMsg.classList.toggle("ok", !isError);
  dashMsg.textContent = text;
}

async function refresh(){
  hide("dashMsg");
  const portfolioId = portfolioSelect.value;
  if (!portfolioId) return;

  // Latest net worth
  const { data: latest, error: e1 } = await supabase
    .from("daily_portfolio_values")
    .select("date,cash_balance,holdings_value,net_worth")
    .eq("portfolio_id", portfolioId)
    .order("date", { ascending: false })
    .limit(1);
  if (e1) throw e1;
  if (!latest.length){
    setText("netWorth","—"); setText("cash","—"); setText("holdings","—");
    setText("asOf","No computed data yet. Run Recalculate.");
    holdingsBody.innerHTML = "";
    return;
  }
  const L = latest[0];
  setText("netWorth", fmtMoney(L.net_worth));
  setText("cash", fmtMoney(L.cash_balance));
  setText("holdings", fmtMoney(L.holdings_value));
  setText("asOf", `As of ${L.date}`);
  setText("cashAsOf", `As of ${L.date}`);
  setText("holdingsAsOf", `As of ${L.date}`);

  // Holdings snapshot view
  const { data: hs, error: e2 } = await supabase
    .from("v_holdings_snapshot")
    .select("*")
    .eq("portfolio_id", portfolioId)
    .order("symbol", { ascending: true });
  if (e2) throw e2;

  holdingsBody.innerHTML = "";
  for (const r of hs){
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${r.symbol}</td>
      <td>${r.quantity}</td>
      <td>${r.last_close ?? ""}</td>
      <td>${fmtMoney(r.market_value ?? 0)}</td>
    `;
    holdingsBody.appendChild(tr);
  }
}

await loadPortfolios(portfolioSelect);
await refresh();

document.getElementById("btnRefresh").addEventListener("click", refresh);

document.getElementById("btnCreatePortfolio").addEventListener("click", async () => {
  const name = prompt("Portfolio name (e.g., Talal PSX)");
  if (!name) return;
  const { error } = await supabase.from("portfolios").insert({ name });
  if (error) return msg(error.message, true);
  await loadPortfolios(portfolioSelect);
  msg("Portfolio created.");
});

document.getElementById("btnAddOpeningCash").addEventListener("click", async () => {
  const portfolioId = portfolioSelect.value;
  if (!portfolioId) return;
  const amount = Number(prompt("Opening cash amount (PKR)"));
  if (!Number.isFinite(amount)) return;
  const date = prompt("Date (YYYY-MM-DD)", new Date().toISOString().slice(0,10));
  if (!date) return;
  const { error } = await supabase.from("cash_journal").insert({
    portfolio_id: portfolioId,
    date,
    type: "opening_balance",
    amount,
    notes: "Opening cash",
  });
  if (error) return msg(error.message, true);
  msg("Opening cash saved. Run Recalculate.");
});

document.getElementById("btnRecalc").addEventListener("click", async () => {
  const portfolioId = portfolioSelect.value;
  if (!portfolioId) return;
  msg("Recalculating…");
  try{
    const data = await callFn("recalc_portfolio", { portfolio_id: portfolioId });
    msg(`Recalc done. Updated days: ${data.updated_days ?? "?"}, FY: ${data.fy_year ?? "?"}.`);
    await refresh();
  }catch(err){
    msg(err.message ?? String(err), true);
  }
});
