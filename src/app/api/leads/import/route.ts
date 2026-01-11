import { NextRequest, NextResponse } from "next/server";

const ALLOWED_HOSTS = new Set(["docs.google.com", "drive.google.com"]);
const MAX_CSV_CHARS = 2_000_000;

function isAllowedHost(hostname: string) {
  if (ALLOWED_HOSTS.has(hostname)) return true;
  if (hostname === "googleusercontent.com") return true;
  if (hostname.endsWith(".googleusercontent.com")) return true;
  return false;
}

function toCsvUrl(rawUrl: string) {
  const url = rawUrl.trim();
  if (!url) return "";

  // If user already provides a direct CSV URL
  if (url.includes("format=csv") || url.endsWith(".csv")) return url;

  // Google Sheets share URL -> export CSV
  const m = url.match(/https?:\/\/docs\.google\.com\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (!m) return url;

  const spreadsheetId = m[1];
  const gidMatch = url.match(/[#&?]gid=(\d+)/);
  const gid = gidMatch?.[1];

  const exportUrl = new URL(`https://docs.google.com/spreadsheets/d/${spreadsheetId}/export`);
  exportUrl.searchParams.set("format", "csv");
  if (gid) exportUrl.searchParams.set("gid", gid);
  return exportUrl.toString();
}

function normalizeUsername(u: string) {
  const raw = u.trim().replace(/^"|"$/g, "");
  if (!raw) return "";

  const lower = raw.toLowerCase();
  if (
    lower === "username" ||
    lower === "user" ||
    lower === "url" ||
    lower === "link" ||
    lower === "profile" ||
    lower === "instagram" ||
    lower === "ig"
  ) {
    return "";
  }

  // Support instagram profile URLs in cells (common when exporting lead lists)
  const m = raw.match(/instagram\.com\/(?:@)?([^/?#]+)/i);
  const fromUrl = m?.[1] ? decodeURIComponent(m[1]) : "";
  const candidate = fromUrl || (raw.startsWith("@") ? raw.slice(1) : raw);

  const candidateLower = candidate.toLowerCase();
  if (
    candidateLower === "p" ||
    candidateLower === "reel" ||
    candidateLower === "reels" ||
    candidateLower === "stories" ||
    candidateLower === "explore"
  ) {
    return "";
  }

  // Instagram usernames: 1-30 chars, letters/numbers/._
  if (!/^[a-zA-Z0-9._]{1,30}$/.test(candidate)) return "";
  return candidate;
}

function extractUsernamesFromCsv(csv: string) {
  const usernames: string[] = [];
  const seen = new Set<string>();

  const lines = csv.split(/\r?\n/);
  for (const line of lines) {
    if (!line.trim()) continue;

    // naive CSV split: good enough for a single-column sheet / simple CSV
    const cells = line.split(",");
    for (const cell of cells) {
      const normalized = normalizeUsername(cell);
      if (!normalized) continue;
      const key = normalized.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      usernames.push(normalized);
    }
  }

  return usernames;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const rawUrl = body?.url as string | undefined;

    if (!rawUrl) {
      return NextResponse.json({ error: "url is required" }, { status: 400 });
    }

    const csvUrl = toCsvUrl(rawUrl);

    let parsed: URL;
    try {
      parsed = new URL(csvUrl);
    } catch {
      return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
    }

    if (parsed.protocol !== "https:") {
      return NextResponse.json({ error: "Only https URLs are allowed" }, { status: 400 });
    }

    if (!isAllowedHost(parsed.hostname)) {
      return NextResponse.json(
        {
          error:
            "Only Google Sheets URLs are supported (docs.google.com). Share the sheet as 'Anyone with the link'.",
        },
        { status: 400 }
      );
    }

    const res = await fetch(csvUrl, { cache: "no-store" });
    const finalUrl = res.url ? new URL(res.url) : parsed;
    if (!isAllowedHost(finalUrl.hostname)) {
      return NextResponse.json(
        { error: "Blocked redirect to a non-Google domain." },
        { status: 400 }
      );
    }

    const text = await res.text();

    if (text.length > MAX_CSV_CHARS) {
      return NextResponse.json(
        { error: "Sheet CSV is too large to import." },
        { status: 400 }
      );
    }

    if (!res.ok) {
      return NextResponse.json(
        {
          error: `Failed to fetch sheet (HTTP ${res.status}). Make sure it is public (Anyone with the link).`,
        },
        { status: 400 }
      );
    }

    // Google returns HTML when not public/authorized
    if (/<html[\s>]/i.test(text) && !text.includes(",")) {
      return NextResponse.json(
        {
          error:
            "Sheet did not return CSV. Ensure the Google Sheet is shared as 'Anyone with the link' and try again.",
        },
        { status: 400 }
      );
    }

    const usernames = extractUsernamesFromCsv(text);

    if (usernames.length === 0) {
      return NextResponse.json(
        {
          error:
            "No usernames found. Put Instagram usernames in the sheet (one per row or column).",
        },
        { status: 400 }
      );
    }

    return NextResponse.json({ usernames });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
