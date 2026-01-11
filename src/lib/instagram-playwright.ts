type SendDmOptions = {
  loginUsername: string;
  loginPassword: string;
  recipientUsername: string;
  text: string;
  proxy: string | null;
  storageStateJson: string | null;
  headless: boolean;
};

type SendDmResult = {
  ok: boolean;
  storageStateJson: string | null;
  error: string | null;
  debugTrace?: string[];
  screenshotPath?: string | null;
};

async function withTimeout<T>(label: string, ms: number, fn: () => Promise<T>): Promise<T> {
  let timeout: any;
  try {
    return await Promise.race([
      fn(),
      new Promise<T>((_, reject) => {
        timeout = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
      }),
    ]);
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

async function getPlaywright() {
  // Edge runtime can't run Playwright.
  const runtime = (globalThis as any).EdgeRuntime ? "edge" : "nodejs";
  console.error("[DEBUG] getPlaywright runtime:", runtime);
  if ((globalThis as any).EdgeRuntime) return { mod: null, error: "This route is running in Edge runtime. Set runtime='nodejs' and restart next dev." };
  try {
    const mod = await import("playwright");
    return { mod, error: null as string | null };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to load Playwright";
    console.error("[DEBUG] Playwright import error:", e);
    return { mod: null, error: msg };
  }
}

function parseProxy(proxy: string | null): { server: string; username?: string; password?: string } | undefined {
  if (!proxy) return undefined;

  try {
    const obj = JSON.parse(proxy);
    const type = String(obj?.type || "http");
    const host = String(obj?.host || "");
    const port = String(obj?.port || "");
    if (!host || !port) return undefined;
    const server = `${type}://${host}:${port}`;
    const username = obj?.username ? String(obj.username) : undefined;
    const password = obj?.password ? String(obj.password) : undefined;
    return { server, ...(username ? { username } : {}), ...(password ? { password } : {}) };
  } catch {
    return undefined;
  }
}

async function safeClick(page: any, selectors: string[]) {
  for (const s of selectors) {
    const el = page.locator(s).first();
    if (await el.count()) {
      try {
        await el.click({ timeout: 2000 });
        return true;
      } catch {
        // ignore
      }
    }
  }
  return false;
}

async function waitForComposer(page: any, timeoutMs: number) {
  const textarea = page.locator("textarea[placeholder='Message...'], textarea").first();
  const textbox = page
    .locator("div[role='textbox'][contenteditable='true'], div[contenteditable='true'][role='textbox']")
    .first();

  try {
    await textarea.waitFor({ state: "visible", timeout: timeoutMs });
    return { kind: "textarea" as const, textarea, textbox };
  } catch {
    // ignore
  }

  await textbox.waitFor({ state: "visible", timeout: timeoutMs });
  return { kind: "textbox" as const, textarea, textbox };
}

async function getStorageStateJsonSafe(context: any) {
  try {
    const storageState = await context.storageState();
    return JSON.stringify(storageState);
  } catch {
    return null;
  }
}

export async function sendInstagramDmWithPlaywright(opts: SendDmOptions): Promise<SendDmResult> {
  const loaded = await getPlaywright();
  const pw = loaded.mod as any;
  if (!pw) {
    return {
      ok: false,
      storageStateJson: opts.storageStateJson,
      error:
        loaded.error ||
        "Playwright is not available. Ensure playwright is installed in this project and Next is using Node runtime.",
      debugTrace: ["playwright_load_failed"],
      screenshotPath: null,
    };
  }

  const { chromium } = pw;

  const proxy = parseProxy(opts.proxy);

  const browser = await chromium.launch({ headless: opts.headless, ...(proxy ? { proxy } : {}) });
  const context = await browser.newContext({
    ...(opts.storageStateJson
      ? (() => {
          try {
            return { storageState: JSON.parse(opts.storageStateJson) };
          } catch {
            return {};
          }
        })()
      : {}),
  });

  const page = await context.newPage();
  page.setDefaultTimeout(60000);
  page.setDefaultNavigationTimeout(60000);

  const trace: string[] = [];
  let lastScreenshot: string | null = null;
  const t = (msg: string) => {
    const line = `[${new Date().toISOString()}] ${msg}`;
    trace.push(line);
    console.log(line);
  };

  try {
    // Hard timeout for each recipient attempt so the automation loop always proceeds.
    return await withTimeout("playwright_send", opts.headless ? 90000 : 180000, async () => {
    t("goto /direct/inbox (login check)");
    await page.goto("https://www.instagram.com/direct/inbox/", { waitUntil: "domcontentloaded" });

    await safeClick(page, [
      "button:has-text('Only allow essential cookies')",
      "button:has-text('Allow essential and optional cookies')",
      "button:has-text('Allow all cookies')",
    ]);

    const loginFormVisible = await page
      .locator(
        "input[name='username'], input[autocomplete='username'], input[aria-label*='username'], input[aria-label*='email'], input[aria-label*='Phone number']"
      )
      .first()
      .isVisible({ timeout: 2000 })
      .catch(() => false);
    const url = page.url();
    t(`inbox url=${url}`);
    const isLoggedIn = !loginFormVisible && !url.includes("/accounts/login") && !url.includes("checkpoint") && !url.includes("challenge") && !url.includes("two_factor");

    if (!isLoggedIn) {
      t("goto /accounts/login");
      await page.goto("https://www.instagram.com/accounts/login/", { waitUntil: "domcontentloaded" });

      const usernameInput = page
        .locator(
          "input[name='username'], input[autocomplete='username'], input[aria-label*='username'], input[aria-label*='email'], input[aria-label*='Phone number']"
        )
        .first();
      const passwordInput = page
        .locator(
          "input[name='password'], input[autocomplete='current-password'], input[aria-label*='Password']"
        )
        .first();

      const canAutoFill = await usernameInput.isVisible({ timeout: 5000 }).catch(() => false);
      if (canAutoFill) {
        t("login form detected: autofill credentials");
        await usernameInput.fill(opts.loginUsername);
        await passwordInput.fill(opts.loginPassword);
        await page.locator("button[type='submit']").click();
      } else {
        // If IG changes the login form, allow manual login when headless=false.
        if (opts.headless) {
          throw new Error("Login form not detected (step=login_form). Try headless=false.");
        }
        t("login form not detected: waiting for manual login");
      }

      // Give time for OTP/2FA/challenge pages to load
      await page.waitForTimeout(12000);

      const challenge = page.url().includes("challenge") || page.url().includes("two_factor") || page.url().includes("checkpoint");
      if (challenge) {
        t(`challenge detected url=${page.url()}`);
        // If headless is off, give the user time to complete the challenge manually
        if (!opts.headless) {
          // Wait up to 60 seconds for user to complete 2FA/OTP
          for (let i = 0; i < 12; i++) {
            await page.waitForTimeout(5000);
            const stillChallenge = page.url().includes("challenge") || page.url().includes("two_factor") || page.url().includes("checkpoint");
            if (!stillChallenge) break;
          }
          // Extra wait after challenge completion to let page load
          await page.waitForTimeout(5000);
          t(`challenge wait done url=${page.url()}`);
        } else {
          return {
            ok: false,
            storageStateJson: opts.storageStateJson,
            error: "Instagram requires verification (2FA/challenge). Run in headless=false and complete login, then retry.",
            debugTrace: trace,
            screenshotPath: null,
          };
        }
      }

      // In headless=false, allow additional time for manual OTP/login completion.
      await page.waitForSelector("a[href='/direct/inbox/']", { timeout: opts.headless ? 30000 : 180000 });
      const nowLoggedIn = (await page.locator("a[href='/direct/inbox/']").count()) > 0;
      if (!nowLoggedIn) {
        return {
          ok: false,
          storageStateJson: opts.storageStateJson,
          error: "Login failed (could not detect inbox). Check username/password or complete verification.",
          debugTrace: trace,
          screenshotPath: null,
        };
      }
      t("login ok (inbox detected)");
    }

    const recipient = String(opts.recipientUsername || "").replace(/^@/, "").trim();
    if (!recipient) throw new Error("Invalid recipient username");

    t(`goto profile @${recipient}`);
    await page.goto(`https://www.instagram.com/${recipient}/`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2500);

    // If IG redirects away from the profile, report it clearly.
    const profileUrl = page.url();
    if (profileUrl.includes("/accounts/login") || profileUrl.includes("checkpoint") || profileUrl.includes("challenge") || profileUrl.includes("two_factor")) {
      throw new Error("Instagram session not authenticated (step=profile_open)");
    }

    // Handle 404 / unavailable.
    const notAvailable =
      (await page
        .locator("text=Sorry, this page isn't available.")
        .first()
        .isVisible({ timeout: 1000 })
        .catch(() => false)) ||
      (await page
        .locator("text=Profile isn't available")
        .first()
        .isVisible({ timeout: 1000 })
        .catch(() => false)) ||
      (await page
        .locator("text=Profile isn’t available")
        .first()
        .isVisible({ timeout: 1000 })
        .catch(() => false)) ||
      (await page
        .locator("text=The link you followed may be broken")
        .first()
        .isVisible({ timeout: 1000 })
        .catch(() => false));
    if (notAvailable) {
      throw new Error(`Profile @${recipient} not available (step=profile_open)`);
    }

    const isPrivate = await page
      .locator("text=This Account is Private")
      .first()
      .isVisible({ timeout: 1000 })
      .catch(() => false) ||
      await page
        .locator("text=This account is private")
        .first()
        .isVisible({ timeout: 1000 })
        .catch(() => false) ||
      await page
        .locator("text=Private Account")
        .first()
        .isVisible({ timeout: 1000 })
        .catch(() => false);

    await safeClick(page, ["button:has-text('Not Now')"]);

    const messageSelectors = [
      "button:has-text('Message')",
      "div[role='button']:has-text('Message')",
      "a:has-text('Message')",
      "button:has-text('Send message')",
      "div[role='button']:has-text('Send message')",
      "button[aria-label*='Message']",
      "div[aria-label*='Message']",
    ];

    let messageBtn: any = null;
    for (const selector of messageSelectors) {
      try {
        const el = page.locator(selector).first();
        if (await el.isVisible({ timeout: 2000 })) {
          messageBtn = el;
          break;
        }
      } catch {
        // ignore
      }
    }

    if (!messageBtn) {
      // If the account is private, try following first (sometimes Message appears after follow).
      if (isPrivate) {
        t("private account detected: attempting Follow/Request");
        const followed = await safeClick(page, [
          "button:has-text('Follow')",
          "div[role='button']:has-text('Follow')",
          "button:has-text('Request')",
          "div[role='button']:has-text('Request')",
        ]);
        if (followed) {
          t("Follow/Request clicked; waiting for UI to update");
          await page.waitForTimeout(3000);
          for (const selector of messageSelectors) {
            try {
              const el = page.locator(selector).first();
              if (await el.isVisible({ timeout: 2000 })) {
                messageBtn = el;
                t("Message button appeared after Follow/Request");
                break;
              }
            } catch {
              // ignore
            }
          }
        } else {
          t("no Follow/Request button found");
        }
      }

      if (!messageBtn) {
        throw new Error(
          isPrivate
            ? "Cannot message this user (private account / not approved) (step=message_button)"
            : "Could not find Message button on profile (step=message_button)"
        );
      }
    }

    t("click Message");

    await messageBtn.scrollIntoViewIfNeeded().catch(() => {});

    // Clicking Message can trigger a navigation into /direct/ or open an in-page composer.
    // Wait for either before trying to type, to avoid "execution context destroyed" crashes.
    const waitForDirect = page
      .waitForURL((u: any) => String(u).includes("/direct/"), { timeout: 15000 })
      .catch(() => null);

    try {
      await Promise.all([waitForDirect, messageBtn.click({ timeout: 8000 })]);
    } catch {
      await Promise.all([waitForDirect, messageBtn.click({ timeout: 8000, force: true })]);
    }

    const composer = await waitForComposer(page, opts.headless ? 15000 : 30000).catch(() => null);
    if (!composer) {
      throw new Error("Could not find message input (step=compose)");
    }

    t(`composer ready kind=${composer.kind}`);

    if (composer.kind === "textarea") {
      await composer.textarea.click({ timeout: 8000 });
      await composer.textarea.fill(opts.text);
    } else {
      await composer.textbox.click({ timeout: 8000 });
      await page.keyboard.type(opts.text, { delay: 10 });
    }

    const clickedSend = await safeClick(page, ["div[role='button']:has-text('Send')", "button:has-text('Send')"]);
    if (!clickedSend) {
      await page.keyboard.press("Enter");
    }

    t("send triggered");

    await page.waitForTimeout(2000);

    const storageStateJson = await getStorageStateJsonSafe(context);

    return {
      ok: true,
      storageStateJson: storageStateJson ?? opts.storageStateJson,
      error: null,
      debugTrace: trace,
      screenshotPath: null,
    };
    });
  } catch (e) {
    // Persist session even when sending fails (so future attempts don't re-login).
    const storageStateJson = await getStorageStateJsonSafe(context);
    try {
      lastScreenshot = `playwright-failure-${Date.now()}.png`;
      await page.screenshot({ path: lastScreenshot, fullPage: true });
    } catch {
      // ignore
    }
    return {
      ok: false,
      storageStateJson: storageStateJson ?? opts.storageStateJson,
      error: e instanceof Error ? e.message : "Failed to send via Playwright",
      debugTrace: trace,
      screenshotPath: lastScreenshot,
    };
  } finally {
    await context.close().catch(() => {});
    await browser.close().catch(() => {});
  }
}
