import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export type AdaptationLogPayload = {
  userId: string | null;
  sourceFilename: string;
  status: "success" | "error";
  jobDescriptionLength: number;
  matchScore: number | null;
  keywordsUsed: string[];
  durationMs: number;
  errorMessage: string | null;
};

let client: SupabaseClient | null | undefined;

function getClient(): SupabaseClient | null {
  if (client !== undefined) return client;

  const url = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    client = null;
    return client;
  }

  client = createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });

  return client;
}

export function hasSupabaseConfig(): boolean {
  return getClient() !== null;
}

export async function saveAdaptationLog(payload: AdaptationLogPayload): Promise<void> {
  const supabase = getClient();
  if (!supabase) return;

  const { error } = await supabase.from("adaptations").insert({
    user_id: payload.userId,
    source_filename: payload.sourceFilename,
    status: payload.status,
    job_description_length: payload.jobDescriptionLength,
    match_score: payload.matchScore,
    keywords_used: payload.keywordsUsed,
    duration_ms: payload.durationMs,
    error_message: payload.errorMessage
  });

  if (error) {
    throw new Error(`Failed to save adaptation log: ${error.message}`);
  }
}

export async function getUserFromToken(accessToken: string): Promise<{ id: string } | null> {
  const supabase = getClient();
  if (!supabase) return null;

  const { data, error } = await supabase.auth.getUser(accessToken);
  if (error) return null;

  return data.user ? { id: data.user.id } : null;
}
