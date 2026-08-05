import {headers} from "next/headers";

const TARGET = "https://venicediscordinteractions-vxybsaualq-uc.a.run.app/web/speak";

export async function POST(request: Request) {
  const requestHeaders = await headers();
  const email = requestHeaders.get("oai-authenticated-user-email");
  if (!email) return Response.json({error: "sign_in_required"}, {status: 401});
  const token = process.env.VENICE_WEB_BRIDGE_TOKEN ?? "";
  if (token.length < 32) return Response.json({error: "carrier_unconfigured"}, {status: 503});
  const input = await request.json().catch(() => null) as {text?: unknown} | null;
  const text = typeof input?.text === "string" ? input.text.trim().slice(0, 1800) : "";
  if (!text) return Response.json({error: "text_required"}, {status: 400});
  const response = await fetch(TARGET, {
    method: "POST",
    headers: {"Authorization": `Bearer ${token}`, "Content-Type": "application/json"},
    body: JSON.stringify({text}),
  });
  const body = await response.arrayBuffer();
  return new Response(body, {
    status: response.status,
    headers: {
      "Content-Type": response.headers.get("Content-Type") ?? "application/json",
      "Cache-Control": "no-store",
      ...(response.headers.get("X-Venice-Voice") ? {"X-Venice-Voice": response.headers.get("X-Venice-Voice")!} : {}),
      ...(response.headers.get("X-Venice-Voice-Mode") ? {"X-Venice-Voice-Mode": response.headers.get("X-Venice-Voice-Mode")!} : {}),
    },
  });
}
