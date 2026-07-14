import { test, expect, CASH_GAME_ID } from "./fixtures.js";

/**
 * Reconnect / catch-up (WS Action Bus, Phase 3 / plan §5.5).
 *
 * KNOWN LIMITATION (documented, not faked): the real UI has NO in-place WS
 * auto-reconnect — GameStateContext's `ws.onclose` only nulls the socket ref and
 * never re-subscribes (verified in src/context/GameStateContext.tsx). So the
 * plan's literal "drop WS mid-hand -> UI resubscribes on its own" is infeasible
 * without new UI code (out of scope for Phase 3). This spec instead exercises the
 * feasible recovery path: force a mid-hand drop via /__control/disconnect, then
 * recover by re-opening the table (a user-driven resubscribe), and assert the
 * catch-up frame renders correctly with a clean, strictly-monotonic commit log
 * and no stale commit / page errors.
 */

const STUB = "http://localhost:8546";

type BusHandle = { commitLog: Array<{ seq: number }> };

test("recovers and renders catch-up state after a mid-hand WS drop", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));

  await test.step("open the seeded table and sit down (mid-hand)", async () => {
    await page.goto(`/table/${CASH_GAME_ID}`);
    await expect(page.getByText("Click to Join").first()).toBeVisible({ timeout: 15_000 });
    await page.getByText("Seat 5", { exact: true }).click();
    const confirm = page.getByRole("button", { name: /Confirm & Join Seat 5/i });
    await expect(confirm).toBeVisible();
    await confirm.click();
    await expect(page.locator(".btn-call")).toBeVisible({ timeout: 15_000 });
  });

  await test.step("force a mid-hand WS drop", async () => {
    const res = await fetch(`${STUB}/__control/disconnect`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ gameId: CASH_GAME_ID })
    });
    expect(res.ok).toBeTruthy();
  });

  await test.step("recover by re-opening the table (user-driven resubscribe)", async () => {
    await page.goto(`/table/${CASH_GAME_ID}`);
    // Catch-up: the current hand renders again — it is still our turn to CALL.
    await expect(page.locator(".btn-call")).toBeVisible({ timeout: 15_000 });
  });

  await test.step("the commit log is clean and strictly monotonic after recovery", async () => {
    const seqs = await page.evaluate(
      () => (window as unknown as { __B52_BUS__?: BusHandle }).__B52_BUS__?.commitLog.map((e) => e.seq) ?? []
    );
    expect(seqs.length).toBeGreaterThan(0);
    for (let i = 1; i < seqs.length; i++) {
      expect(seqs[i]).toBeGreaterThan(seqs[i - 1]);
    }
  });

  expect(errors, `page errors: ${errors.join(" | ")}`).toHaveLength(0);
});
