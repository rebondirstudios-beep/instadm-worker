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

function extractInstagramUsernamesFromUrl(url: string) {
  try {
    const u = new URL(url);
    if (!/^(www\.)?instagram\.com$/i.test(u.hostname)) return [];
    const parts = u.pathname.split("/").filter(Boolean);
    if (!parts.length) return [];
    const first = parts[0];
    const reserved = new Set([
      "p",
      "reel",
      "tv",
      "stories",
      "explore",
      "tags",
      "accounts",
      "about",
      "developer",
      "press",
      "legal",
      "directory",
    ]);
    if (reserved.has(first.toLowerCase())) return [];
    if (!/^[a-zA-Z0-9._]{1,30}$/.test(first)) return [];
    if (parts.length > 1 && reserved.has(parts[1]?.toLowerCase?.() || "")) return [];
    return [first];
  } catch {
    return [];
  }
}

function extractUsernamesFromLinks(links: string[]) {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const link of links) {
    for (const u of extractInstagramUsernamesFromUrl(link)) {
      const key = u.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(u);
    }
  }
  return out;
}

function dedupeUsernames(usernames: string[]) {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const u of usernames) {
    const key = String(u || "").toLowerCase();
    if (!key) continue;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(u);
  }
  return out;
}

async function generateQueries(prompt: string, apiKey: string | undefined, maxQueries: number) {
  const clean = prompt.replace(/\s+/g, " ").trim();
  const base1 = `site:instagram.com ${clean} -inurl:explore -inurl:tags -inurl:p -inurl:reel -inurl:tv`;
  const base2 = `site:instagram.com \"${clean}\" -inurl:explore -inurl:tags -inurl:p -inurl:reel -inurl:tv`;
  const bases = [base1, base2].filter(Boolean);
  if (!apiKey) return bases.slice(0, maxQueries);

  try {
    const system =
      "You generate Google search queries that find Instagram profile pages for the described niche. " +
      "Return ONLY queries, one per line. No bullets, no numbering. Keep each query short.";
    const userPrompt =
      `Goal: find Instagram profile usernames for: ${clean}\n` +
      `Return up to ${Math.max(2, Math.min(8, maxQueries))} search queries. Use site:instagram.com and exclude explore/tags/posts.`;
    const r = await callPerplexity(system, userPrompt, apiKey);
    const extra = String(r.raw)
      .split(/\r?\n/)
      .map((s) => s.trim())
      .filter(Boolean)
      .map((s) => s.replace(/^[-*•\u2022]+\s*/g, "").replace(/^\d+[.)]\s*/g, "").trim())
      .filter(Boolean);
    return dedupeUsernames([...bases, ...extra]).slice(0, maxQueries);
  } catch {
    return bases.slice(0, maxQueries);
  }
}

async function searchViaSerpApi(query: string, apiKey: string): Promise<string[]> {
  const url = new URL("https://serpapi.com/search.json");
  url.searchParams.set("engine", "google");
  url.searchParams.set("q", query);
  url.searchParams.set("api_key", apiKey);
  url.searchParams.set("num", "10");

  const res = await fetch(url.toString(), { method: "GET" });
  if (!res.ok) throw new Error(`SerpAPI error (HTTP ${res.status})`);
  const data = (await res.json().catch(() => ({}))) as any;
  const links: string[] = [];
  const organic = Array.isArray(data?.organic_results) ? data.organic_results : [];
  for (const item of organic) {
    const link = typeof item?.link === "string" ? item.link : "";
    if (link) links.push(link);
  }
  return links;
}

async function searchViaGoogleCse(query: string, apiKey: string, cx: string): Promise<string[]> {
  const url = new URL("https://www.googleapis.com/customsearch/v1");
  url.searchParams.set("key", apiKey);
  url.searchParams.set("cx", cx);
  url.searchParams.set("q", query);

  const res = await fetch(url.toString(), { method: "GET" });
  if (!res.ok) throw new Error(`Google CSE error (HTTP ${res.status})`);
  const data = (await res.json().catch(() => ({}))) as any;
  const items = Array.isArray(data?.items) ? data.items : [];
  const links: string[] = [];
  for (const item of items) {
    const link = typeof item?.link === "string" ? item.link : "";
    if (link) links.push(link);
  }
  return links;
}

function verifyUsernames(usernames: string[], apiKey: string, maxResults: number, contextPrompt: string): Promise<string[]> {
  const batch = usernames.slice(0, maxResults);
  const system =
    "You are a strict verification assistant. Only output Instagram usernames that are real profile accounts and relevant to the described lead criteria. " +
    "Remove non-profiles (posts/reels/tags), obvious spam, and anything that doesn't match. " +
    "Output ONLY usernames, one per line. No @ symbols, no explanations.";

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
        { role: "user", content: `Lead criteria: ${contextPrompt}\n\nCandidates:\n${batch.join("\n")}` },
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
    const providerRequested = typeof body?.provider === "string" ? body.provider.trim() : "";
    const mode = typeof body?.mode === "string" ? body.mode.trim() : "";

    if (!prompt && !initialUsernames.length) {
      return NextResponse.json({ error: "prompt or initialUsernames is required" }, { status: 400 });
    }

    const perplexityKey = process.env.PERPLEXITY_API_KEY;
    const serpApiKey = process.env.SERPAPI_API_KEY;
    const googleCseKey = process.env.GOOGLE_CSE_API_KEY;
    const googleCseCx = process.env.GOOGLE_CSE_CX;

    let usernames: string[] = [];
    let raw = "";
    let warning = "";

    if (initialUsernames.length) {
      usernames = initialUsernames;
    } else {
      const wantsSearch = mode === "search" || providerRequested === "serpapi" || providerRequested === "google_cse";
      const canUseSerpApi = !!serpApiKey;
      const canUseGoogleCse = !!googleCseKey && !!googleCseCx;
      const provider =
        mode === "llm"
          ? "perplexity"
          : providerRequested === "perplexity"
            ? "perplexity"
            : providerRequested === "serpapi"
          ? "serpapi"
          : providerRequested === "google_cse"
            ? "google_cse"
            : wantsSearch
              ? canUseSerpApi
                ? "serpapi"
                : canUseGoogleCse
                  ? "google_cse"
                  : "perplexity"
              : canUseSerpApi
                ? "serpapi"
                : canUseGoogleCse
                  ? "google_cse"
                  : "perplexity";

      if (provider !== "perplexity") {
        const queries = await generateQueries(prompt, perplexityKey, 6);
        const links: string[] = [];
        for (const q of queries) {
          if (provider === "serpapi" && serpApiKey) {
            links.push(...(await searchViaSerpApi(q, serpApiKey)));
          }
          if (provider === "google_cse" && googleCseKey && googleCseCx) {
            links.push(...(await searchViaGoogleCse(q, googleCseKey, googleCseCx)));
          }
          usernames = dedupeUsernames([...usernames, ...extractUsernamesFromLinks(links)]);
          if (usernames.length >= maxResults) break;
        }
        raw = links.slice(0, 50).join("\n");
        usernames = usernames.slice(0, maxResults);
        if (!usernames.length) {
          warning = "No leads found from web search. Try a clearer niche + location (e.g. 'wedding photographers in Austin').";
        }
      }

      if (!usernames.length) {
        if (!perplexityKey) {
          return NextResponse.json(
            { error: "Missing PERPLEXITY_API_KEY in .env.local" },
            { status: 500 }
          );
        }

        const system1 =
          "Return ONLY a newline-separated list of Instagram usernames for real profile accounts. " +
          "No URLs, no explanations. Each line must match ^[a-zA-Z0-9._]{1,30}$. No @ symbol. " +
          "Do not include instagram.com paths like /p/ or /reel/.";

        const r1 = await callPerplexity(system1, prompt, perplexityKey);
        raw = r1.raw;
        usernames = extractUsernames(raw).slice(0, maxResults);

        if (usernames.length === 0) {
          const system2 =
            "Output ONLY Instagram usernames, one per line, and NOTHING else. " +
            "No headings, no descriptions, no markdown, no bullets. " +
            "If you cannot find usernames, output nothing.";
          const r2 = await callPerplexity(system2, prompt, perplexityKey);
          raw = r2.raw;
          usernames = extractUsernames(raw).slice(0, maxResults);
          if (usernames.length === 0) {
            warning =
              "No Instagram usernames were found for that prompt. Try wording like: 'Instagram usernames of architects in Bangalore' or include '@' / 'instagram.com' in your instruction.";
          }
        }
      }
    }

    if (verify && usernames.length) {
      if (!perplexityKey) {
        return NextResponse.json(
          { error: "Missing PERPLEXITY_API_KEY in .env.local" },
          { status: 500 }
        );
      }
      usernames = await verifyUsernames(usernames, perplexityKey, maxResults, prompt || "");
    }

    return NextResponse.json({ usernames, raw, warning });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
