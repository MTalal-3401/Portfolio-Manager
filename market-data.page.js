import { requireAuth } from "../auth.js";
import { uploadToBucket, callFn } from "../api.js";
import { sha256Hex } from "../utils.js";
import { wireNav } from "./_nav.js";

await wireNav();
await requireAuth();

const csvFile = document.getElementById("csvFile");
const btnUpload = document.getElementById("btnUpload");
const notes = document.getElementById("notes");
const msg = document.getElementById("msg");

function showMsg(text, isError=false){
  msg.classList.remove("hidden");
  msg.classList.toggle("error", isError);
  msg.classList.toggle("ok", !isError);
  msg.textContent = text;
}

csvFile.addEventListener("change", () => {
  btnUpload.disabled = !csvFile.files?.length;
  msg.classList.add("hidden");
});

btnUpload.addEventListener("click", async () => {
  try{
    const f = csvFile.files[0];
    const fileHash = await sha256Hex(`${f.name}:${f.size}:${f.lastModified}`);
    const path = `market_data/eod_${new Date().toISOString().slice(0,10)}_${fileHash}.csv`;

    showMsg("Uploading CSV…");
    await uploadToBucket("imports", path, f);

    showMsg("Importing CSV into shared prices…");
    const res = await callFn("import_eod_csv", { storage_path: path, notes: notes.value?.trim() || null });

    showMsg(`Upserted rows: ${res.upserted} | Symbols created: ${res.symbols_created} | Errors: ${res.errors?.length ?? 0}`);
    btnUpload.disabled = true;
  }catch(err){
    showMsg(err.message ?? String(err), true);
  }
});
