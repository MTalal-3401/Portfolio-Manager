import { supabase } from "supabaseClient.js";

/**
 * Call an Edge Function and return JSON.
 */
export async function callFn(name, payload){
  const { data, error } = await supabase.functions.invoke(name, { body: payload });
  if (error) throw error;
  return data;
}

/**
 * Upload file to Supabase Storage bucket.
 */
export async function uploadToBucket(bucket, path, file){
  const { data, error } = await supabase.storage.from(bucket).upload(path, file, { upsert: true });
  if (error) throw error;
  return data;
}
