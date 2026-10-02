import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { FriendlyError } from "./properties";

export type Conversation = Tables<"conversations"> & {
  properties: { name: string } | null;
  messages: Pick<Tables<"messages">, "body" | "created_at" | "sender_type" | "read_at">[];
};

const fail = (error: unknown): never => {
  console.error(error);
  throw new FriendlyError("Les messages ne sont pas disponibles pour le moment. Réessayez.");
};

export async function listConversations(orgId: string) {
  const { data, error } = await supabase
    .from("conversations")
    .select("*,properties(name),messages(id,body,created_at,sender_type,read_at)")
    .eq("organization_id", orgId)
    .order("last_message_at", { ascending: false });
  if (error) return fail(error);
  return data as Conversation[];
}

export async function getConversation(id: string) {
  const [{ data: conversation, error }, { data: messages, error: messageError }] =
    await Promise.all([
      supabase.from("conversations").select("*,properties(name)").eq("id", id).maybeSingle(),
      supabase.from("messages").select("*").eq("conversation_id", id).order("created_at"),
    ]);
  if (error || messageError) return fail(error ?? messageError);
  if (!conversation) return null;
  await supabase
    .from("messages")
    .update({ read_at: new Date().toISOString() })
    .eq("conversation_id", id)
    .eq("sender_type", "guest")
    .is("read_at", null);
  return { conversation, messages: messages ?? [] };
}

export async function sendManagerReply(conversationId: string, body: string) {
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) return fail(new Error("not authenticated"));
  const { error } = await supabase.from("messages").insert({
    conversation_id: conversationId,
    sender_type: "manager",
    sender_user_id: user.user.id,
    body: body.trim().slice(0, 2000),
  });
  if (error) return fail(error);
  const { error: updateError } = await supabase
    .from("conversations")
    .update({ last_message_at: new Date().toISOString() })
    .eq("id", conversationId);
  if (updateError) fail(updateError);
}

export async function setConversationStatus(id: string, status: "open" | "resolved") {
  const { error } = await supabase.from("conversations").update({ status }).eq("id", id);
  if (error) fail(error);
}
