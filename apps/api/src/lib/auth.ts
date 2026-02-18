import type { Request } from "express";
import { getUserFromToken } from "./supabase.js";

export function readBearerToken(req: Request): string | null {
  const authHeader = req.header("authorization");
  if (!authHeader) return null;

  const [scheme, token] = authHeader.split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !token) return null;

  return token;
}

export async function resolveUserId(req: Request): Promise<string | null> {
  const token = readBearerToken(req);
  if (!token) return null;

  const user = await getUserFromToken(token);
  return user?.id ?? null;
}
