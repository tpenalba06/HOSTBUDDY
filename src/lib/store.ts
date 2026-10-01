// Phase 1 local persistence (autosave). Will be replaced by Lovable Cloud tables.
import type { ImportResult } from "./import-engine/types";

export interface User { firstName: string; email: string }

const KEY_USER = "hb.user";
const KEY_DRAFT = "hb.draft";

const read = <T,>(k: string): T | null => {
  if (typeof window === "undefined") return null;
  try { return JSON.parse(localStorage.getItem(k) || "null"); } catch { return null; }
};
const write = (k: string, v: unknown) => localStorage.setItem(k, JSON.stringify(v));

export const getUser = () => read<User>(KEY_USER);
export const setUser = (u: User) => write(KEY_USER, u);
export const signOut = () => localStorage.removeItem(KEY_USER);

export const getDraft = () => read<ImportResult>(KEY_DRAFT);
export const saveDraft = (d: ImportResult) => write(KEY_DRAFT, d);
