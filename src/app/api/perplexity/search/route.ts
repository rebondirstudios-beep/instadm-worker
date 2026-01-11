import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/clerk";

function extractUsernames(text: string) {
  const out: string[] = [];
  const seen = new Set<string>();

  const lines = String(text)
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  for (const lineRaw of lines) {
    // Strip bullets / numbering / quotes
    let line = lineRaw
      .replace(/^[-*•\u2022]+\s*/g, "")
      .replace(/^\d+[.)]\s*/g, "")
      .replace(/^@/, "")
      .replace(/^['"`]/, "")
      .replace(/['"`,.;:]+$/g, "")
      .replace(/^[*_]+/, "")
      .replace(/[*_]+$/, "")
      .trim();

    // If the model returns URLs, try to pull the username portion.
    const urlMatch = line.match(/instagram\.com\/([a-zA-Z0-9._]{1,30})/i);
    if (urlMatch?.[1]) line = urlMatch[1];

    // Only accept pure usernames (no spaces or extra tokens)
    if (!/^[a-zA-Z0-9._]{1,30}$/.test(line)) continue;
    const key = line.toLowerCase();
    if (key === "username") continue;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(line);
  }

  return out;
}

function verifyUsernames(usernames: string[], apiKey: string, maxResults: number): Promise<string[]> {
  const batch = usernames.slice(0, maxResults);
  const system =
    "You are a verification assistant. For each username in the list, ONLY reply with the username if it is a real, active Instagram account that matches the description. If not, reply with nothing. Do NOT add explanations. Output one username per line, no @ symbols.";

  return fetch("https://api.perplexity.ai/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "sonar",
      messages: [
        { role: "system", content: system },
        { role: "user", content: batch.join("\n") },
      ],
      temperature: 0.1,
    }),
  })
    .then((res) => {
      if (!res.ok) throw new Error(`Perplexity error (HTTP ${res.status})`);
      return res.json();
    })
    .then((data: any) => {
      const content = data?.choices?.[0]?.message?.content || data?.choices?.[0]?.delta?.content || "";
      return extractUsernames(String(content));
    });
}

async function callPerplexity(system: string, userPrompt: string, apiKey: string) {
  const res = await fetch("https://api.perplexity.ai/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "sonar",
      messages: [
        { role: "system", content: system },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.2,
    }),
  });

  const data = (await res.json().catch(() => ({}))) as any;
  if (!res.ok) {
    throw new Error(data?.error?.message || `Perplexity error (HTTP ${res.status})`);
  }

  const raw = data?.choices?.[0]?.message?.content || data?.choices?.[0]?.delta?.content || "";
  return { raw: String(raw) };
}

export async function POST(request: NextRequest) {
  try {
    const clerkUser = await requireAuth();
    if (clerkUser instanceof NextResponse) return clerkUser;

    const body = await request.json().catch(() => ({}));
    const prompt = typeof body?.prompt === "string" ? body.prompt.trim() : "";
    const maxResultsRaw = body?.maxResults;
    const maxResults =
      typeof maxResultsRaw === "number"
        ? Math.max(1, Math.min(100, Math.floor(maxResultsRaw)))
        : typeof maxResultsRaw === "string"
          ? Math.max(1, Math.min(100, Math.floor(Number(maxResultsRaw) || 20)))
          : 20;
    const verify = typeof body?.verify === "boolean" ? body.verify : false;
    const initialUsernames = Array.isArray(body?.initialUsernames) ? body.initialUsernames : [];

    if (!prompt && !initialUsernames.length) {
      return NextResponse.json({ error: "prompt or initialUsernames is required" }, { status: 400 });
    }

    const apiKey = process.env.PERPLEXITY_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Missing PERPLEXITY_API_KEY in .env.local" },
        { status: 500 }
      );
    }

    let usernames: string[] = [];
    let raw = "";
    let warning = "";

    if (initialUsernames.length) {
      usernames = initialUsernames;
    } else {
      const system1 =
        "Return ONLY a newline-separated list of Instagram usernames (no URLs, no explanations, no extra text). " +
        "Each line must be a single username token matching ^[a-zA-Z0-9._]{1,30}$. No @ symbol. " +
        "Provide up to " +
        String(maxResults) +
        " usernames.";

      const r1 = await callPerplexity(system1, prompt, apiKey);
      raw = r1.raw;
      usernames = extractUsernames(raw).slice(0, maxResults);

      if (usernames.length === 0) {
        const system2 =
          "You MUST output ONLY Instagram usernames, one per line, and NOTHING else. " +
          "No headings, no descriptions, no markdown, no bullets. " +
          "If you cannot find usernames, output nothing.";
        const r2 = await callPerplexity(system2, prompt, apiKey);
        raw = r2.raw;
        usernames = extractUsernames(raw).slice(0, maxResults);
        if (usernames.length === 0) {
          warning =
            "No Instagram usernames were found for that prompt. Try wording like: 'Instagram usernames of architects in Bangalore' or include '@' / 'instagram.com' in your instruction.";
        }
      }
    }

    if (verify && usernames.length) {
      usernames = await verifyUsernames(usernames, apiKey, maxResults);
    }

    return NextResponse.json({ usernames, raw, warning });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
