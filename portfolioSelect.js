import { supabase } from "../supabaseClient.js";

export async function loadPortfolios(selectEl){
  const { data, error } = await supabase
    .from("portfolios")
    .select("id,name")
    .order("created_at", { ascending: false });
  if (error) throw error;

  selectEl.innerHTML = "";
  if (!data.length){
    const opt = document.createElement("option");
    opt.value = "";
    opt.textContent = "No portfolios (create one)";
    selectEl.appendChild(opt);
    return [];
  }
  for (const p of data){
    const opt = document.createElement("option");
    opt.value = p.id;
    opt.textContent = p.name;
    selectEl.appendChild(opt);
  }
  return data;
}
