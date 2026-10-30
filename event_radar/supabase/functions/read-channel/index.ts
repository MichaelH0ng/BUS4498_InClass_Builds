// Club Event Radar: the GroupMe reader (Supabase Edge Function "read-channel").
// POST: read the new messages in the GroupMe group, hand each one to the agent (submit-event), and post the
//       agent's decision back to the chat. A scheduled job calls this every minute.
// GET: report whether the reader is ready, and the bookmark. GET ...?check=groupme asks GroupMe whether the
//      token and the group work (results only, never the values).
import { createClient } from "npm:@supabase/supabase-js@2.117.2";

const SOURCE = "groupme";
const API = "https://api.groupme.com/v3";
const BATCH = 20; // messages handled per run
const THREAD_MINUTES = 10; // how far back to look for the sender's earlier messages
const THREAD_MAX = 4;
const MAX_ANNOUNCEMENT = 2000;
const MAX_CHAT_REPLY = 900; // GroupMe allows 1000 characters

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "apikey, content-type, authorization, x-client-info",
  "Access-Control-Max-Age": "86400",
};

type Message = {
  id: string;
  text: string | null;
  name: string;
  sender_id: string;
  sender_type: string;
  system: boolean;
  created_at: number; // unix seconds
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

function secretKey(): string {
  const raw = Deno.env.get("SUPABASE_SECRET_KEYS");
  if (raw) {
    try {
      const keys = JSON.parse(raw);
      if (keys?.default) return keys.default;
    } catch (_) { /* fall through to the old key */ }
  }
  return Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
}

function config() {
  return {
    token: Deno.env.get("GROUPME_TOKEN") ?? "",
    groupId: Deno.env.get("GROUPME_GROUP_ID") ?? "",
    botId: Deno.env.get("GROUPME_BOT_ID") ?? "",
  };
}

// Message ids are long numbers (more digits than a normal number holds), so compare them as BigInt.
function byId(a: Message, b: Message): number {
  const x = BigInt(a.id), y = BigInt(b.id);
  return x < y ? -1 : x > y ? 1 : 0;
}

// Ask GroupMe for messages. `status` 304 means nothing new.
async function fetchMessages(token: string, groupId: string, query: Record<string, string>) {
  const url = `${API}/groups/${encodeURIComponent(groupId)}/messages?${new URLSearchParams(query)}`;
  const response = await fetch(url, { headers: { "X-Access-Token": token } });
  if (response.status === 304) return { status: 304, messages: [] as Message[] };
  if (!response.ok) throw new Error(`GroupMe answered ${response.status} when reading messages`);
  const data = await response.json();
  return { status: response.status, messages: (data?.response?.messages ?? []) as Message[] };
}

function isPersonMessage(m: Message): boolean {
  return m.sender_type === "user" && !m.system && typeof m.text === "string" && m.text.trim() !== "";
}

// The same sender's messages from the few minutes before this one, oldest first.
async function senderThread(token: string, groupId: string, message: Message): Promise<string[]> {
  try {
    const { messages } = await fetchMessages(token, groupId, { before_id: message.id, limit: "20" });
    const cutoff = message.created_at - THREAD_MINUTES * 60;
    return messages
      .filter((m) => isPersonMessage(m) && m.sender_id === message.sender_id && m.created_at >= cutoff)
      .sort(byId)
      .slice(-THREAD_MAX)
      .map((m) => m.text!.trim());
  } catch (error) {
    console.error("could not read the sender's earlier messages", error);
    return []; // the thread is only extra context
  }
}

async function sendToChat(botId: string, text: string) {
  if (!botId) return;
  try {
    const response = await fetch(`${API}/bots/post`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bot_id: botId, text: text.slice(0, MAX_CHAT_REPLY) }),
    });
    if (!response.ok) console.error("chat reply failed", response.status);
  } catch (error) {
    console.error("chat reply failed", error);
  }
}

// Plain words for the chat, built from the agent's answer.
function chatReply(name: string, answer: Record<string, unknown>): string {
  const first = name.split(" ")[0] || "there";
  if (!answer.ok) return `Sorry ${first}, I couldn't read that post just now. Please send it again in a minute.`;
  const event = answer.event as Record<string, unknown> | undefined;
  const title = typeof event?.title === "string" && event.title ? ` "${event.title}"` : "";
  const reasons = Array.isArray(answer.reasons) ? (answer.reasons as string[]).join(" ") : "";
  switch (answer.status) {
    case "published":
      return `✅ Thanks ${first}! Your event${title} is on the board.`;
    case "waiting":
      return `⏳ Thanks ${first}! Your post${title} is saved and waiting for a moderator. ${reasons}`.trim();
    case "rejected":
      return `🚫 ${first}, I didn't post that. ${reasons}`.trim();
    case "duplicate":
      return `${first}, that event is already posted.`;
    default:
      return String(answer.message ?? "");
  }
}

async function handlePost(): Promise<Response> {
  const { token, groupId, botId } = config();
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const key = secretKey();
  if (!token || !groupId) return json({ ok: false, message: "GroupMe isn't set up: GROUPME_TOKEN or GROUPME_GROUP_ID is missing in Supabase Secrets." }, 503);
  if (!supabaseUrl || !key) return json({ ok: false, message: "The reader can't reach the database yet." }, 503);

  const db = createClient(supabaseUrl, key, { auth: { persistSession: false } });
  const { data: cursor, error: cursorError } = await db
    .from("channel_cursor")
    .select("last_id, read_count")
    .eq("source", SOURCE)
    .maybeSingle();
  if (cursorError) {
    console.error("could not read the bookmark", cursorError);
    return json({ ok: false, message: "Could not read the bookmark." }, 500);
  }

  const save = async (lastId: string, readCount: number) => {
    const { error } = await db
      .from("channel_cursor")
      .upsert({ source: SOURCE, last_id: lastId, read_count: readCount, updated_at: new Date().toISOString() });
    if (error) console.error("could not save the bookmark", error);
    return !error;
  };

  try {
    // First run: remember the newest message and stop. Old history is never read.
    if (!cursor) {
      const { messages } = await fetchMessages(token, groupId, { limit: "1" });
      const newest = messages.sort(byId).at(-1);
      await save(newest?.id ?? "0", 0);
      return json({ ok: true, first_run: true, message: "The reader is set up. It will read messages sent from now on.", read: 0 });
    }

    const { status, messages } = await fetchMessages(token, groupId, { after_id: cursor.last_id, limit: String(BATCH) });
    if (status === 304 || messages.length === 0) {
      await save(cursor.last_id, cursor.read_count); // nothing new, but record that the reader ran
      return json({ ok: true, read: 0, message: "No new messages." });
    }

    messages.sort(byId); // oldest first
    let lastId = cursor.last_id;
    let readCount = cursor.read_count;
    const results: Array<{ id: string; outcome: string }> = [];

    for (const message of messages.slice(0, BATCH)) {
      let outcome = "skipped";
      if (isPersonMessage(message)) {
        const text = message.text!.trim().slice(0, MAX_ANNOUNCEMENT);
        const thread = await senderThread(token, groupId, message);
        // The agent allows calls without a sign-in token (verify_jwt is off for it).
        const response = await fetch(`${supabaseUrl}/functions/v1/submit-event`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            announcement: text,
            source: SOURCE,
            source_id: message.id,
            source_name: message.name,
            thread,
          }),
        });
        const answer = await response.json().catch(() => ({ ok: false })) as Record<string, unknown>;
        outcome = answer.ok ? String(answer.status) : "error";
        if (answer.already_read !== true) await sendToChat(botId, chatReply(message.name ?? "", answer));
        else outcome = "already read";
      }
      // Move the bookmark past every message read, including the ones skipped.
      lastId = message.id;
      readCount += 1;
      await save(lastId, readCount);
      results.push({ id: message.id, outcome });
    }
    return json({ ok: true, read: results.length, results, last_message_id: lastId });
  } catch (error) {
    console.error("reader failed", error);
    return json({ ok: false, message: "The reader couldn't finish this run. It will try again next time." }, 502);
  }
}

// GET ?check=groupme: does the token work, and is the group found? Results only, never values.
async function checkGroupMe(): Promise<Record<string, unknown>> {
  const { token, groupId, botId } = config();
  const result: Record<string, unknown> = {
    token_saved: !!token,
    group_id_saved: !!groupId,
    bot_id_saved: !!botId,
    token_works: false,
    group_found: false,
  };
  if (!token || !groupId) {
    return { ...result, working: false, message: "GROUPME_TOKEN or GROUPME_GROUP_ID isn't saved in Supabase Secrets yet." };
  }
  try {
    const response = await fetch(`${API}/groups/${encodeURIComponent(groupId)}`, { headers: { "X-Access-Token": token } });
    result.groupme_status = response.status;
    if (response.status === 401) {
      return { ...result, working: false, message: "GroupMe refused the token. Check GROUPME_TOKEN." };
    }
    if (response.status === 404) {
      return { ...result, working: false, token_works: true, message: "The token works, but GroupMe doesn't know that group id. Check GROUPME_GROUP_ID." };
    }
    if (!response.ok) {
      return { ...result, working: false, message: `GroupMe answered ${response.status}.` };
    }
    const group = (await response.json())?.response ?? {};
    return {
      ...result,
      working: true,
      token_works: true,
      group_found: true,
      group_name: group.name ?? "",
      members: Array.isArray(group.members) ? group.members.length : null,
      message: botId
        ? "The token and the group work, and a bot is saved for replies."
        : "The token and the group work. No bot is saved, so the reader will not reply in the chat.",
    };
  } catch (_) {
    return { ...result, working: false, message: "Couldn't reach GroupMe." };
  }
}

// GET: the reader's status. With ?check=groupme the same answer also holds GroupMe's side, under "groupme".
async function handleGet(req: Request): Promise<Response> {
  const { token, groupId, botId } = config();
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const key = secretKey();
  let lastMessageId = "";
  let readCount = 0;
  let lastRun = "";
  if (supabaseUrl && key) {
    const db = createClient(supabaseUrl, key, { auth: { persistSession: false } });
    const { data } = await db.from("channel_cursor").select("last_id, read_count, updated_at").eq("source", SOURCE).maybeSingle();
    if (data) {
      lastMessageId = data.last_id;
      readCount = data.read_count;
      lastRun = data.updated_at;
    }
  }
  const ready = !!token && !!groupId && !!supabaseUrl && !!key;
  const answer: Record<string, unknown> = {
    ok: true,
    ready,
    last_message_id: lastMessageId,
    read_count: readCount,
    last_run: lastRun,
    bot: !!botId,
    message: ready
      ? "The GroupMe reader is running."
      : "The GroupMe reader is running, but GROUPME_TOKEN or GROUPME_GROUP_ID isn't saved in Supabase Secrets yet.",
  };
  if (new URL(req.url).searchParams.get("check") === "groupme") answer.groupme = await checkGroupMe();
  return json(answer);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS_HEADERS });
  try {
    if (req.method === "GET") return await handleGet(req);
    if (req.method === "POST") return await handlePost(); // the body is ignored
    return json({ ok: false, message: "Use GET to check the reader or POST to read new messages." }, 405);
  } catch (error) {
    console.error("unexpected error", error);
    return json({ ok: false, message: "Something went wrong inside the reader." }, 500);
  }
});
