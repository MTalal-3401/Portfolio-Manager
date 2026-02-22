import { supabase } from "./supabaseClient.js";

export async function requireAuth(redirectTo="../pages/login.html"){
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    const next = encodeURIComponent(location.pathname + location.search);
    location.href = `${redirectTo}?next=${next}`;
    throw new Error("Not authenticated");
  }
  return session;
}

export async function signOut(){
  await supabase.auth.signOut();
  location.href = "../pages/login.html";
}
