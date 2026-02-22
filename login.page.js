import { supabase } from "supabaseClient.js";
import { qs, setHTML, show, hide } from "utils.js";
import { wireNav } from "_nav.js";

await wireNav();

const email = document.getElementById("email");
const password = document.getElementById("password");
const msg = document.getElementById("msg");

function showMsg(html, isError=false){
  msg.classList.remove("hidden");
  msg.classList.toggle("error", isError);
  msg.classList.toggle("ok", !isError);
  msg.innerHTML = html;
}

document.getElementById("btnLogin").addEventListener("click", async () => {
  hide("msg");
  try{
    const { error } = await supabase.auth.signInWithPassword({
      email: email.value.trim(),
      password: password.value,
    });
    if (error) throw error;
    const next = qs("next");
    location.href = next ? decodeURIComponent(next) : "./dashboard.html";
  }catch(err){
    showMsg(err.message ?? String(err), true);
  }
});

document.getElementById("btnSignup").addEventListener("click", async () => {
  hide("msg");
  try{
    const { error } = await supabase.auth.signUp({
      email: email.value.trim(),
      password: password.value,
    });
    if (error) throw error;
    showMsg("Account created. Check your email for confirmation (if enabled), then login.");
  }catch(err){
    showMsg(err.message ?? String(err), true);
  }
});
