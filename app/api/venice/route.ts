import {headers} from "next/headers";

const TARGET = "https://venicediscordinteractions-vxybsaualq-uc.a.run.app/web/ask";

export async function POST(request: Request) {
  const requestHeaders = await headers();
  const email = requestHeaders.get("oai-authenticated-user-email");
  if (!email) return Response.json({error: "sign_in_required"}, {status: 401});
  const token = process.env.VENICE_WEB_BRIDGE_TOKEN ?? "";
  if (token.length < 32) return Response.json({error: "carrier_unconfigured"}, {status: 503});
  const input = await request.json().catch(() => null) as {prompt?: unknown} | null;
  const prompt = typeof input?.prompt === "string" ? input.prompt.trim().slice(0, 2000) : "";
  if (!prompt) return Response.json({error: "prompt_required"}, {status: 400});
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(email));
  const userId = Array.from(new Uint8Array(digest).slice(0, 12), byte => byte.toString(16).padStart(2, "0")).join("");
  const response = await fetch(TARGET, {
    method: "POST",
    headers: {"Authorization": `Bearer ${token}`, "Content-Type": "application/json"},
    body: JSON.stringify({prompt, userId}),
  });
  const body = await response.text();
  return new Response(body, {
    status: response.status,
    headers: {"Content-Type": response.headers.get("Content-Type") ?? "application/json", "Cache-Control": "no-store"},
  });
}
