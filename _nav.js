import { supabase } from "../supabaseClient.js";
import { signOut } from "../auth.js";

export async function wireNav(){
  const login = document.getElementById("navLogin");
  const logout = document.getElementById("navLogout");
  if (!login || !logout) return;

  const { data: { session } } = await supabase.auth.getSession();
  if (session){
    login.classList.add("hidden");
    logout.classList.remove("hidden");
    logout.addEventListener("click", async (e) => {
      e.preventDefault();
      await signOut();
    });
  }else{
    login.classList.remove("hidden");
    logout.classList.add("hidden");
  }
}
