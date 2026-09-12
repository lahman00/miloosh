import "./_load-env";
import { readQueue, countByQueueState } from "@/lib/social/queue";
import { getAllChannelHealth } from "@/lib/social/channels/registry";
import { getSocialStrategy } from "@/lib/social/strategy";

/** Usage: npx tsx --env-file=.env.local scripts/social/status.ts */
async function main() {
  const strategy = getSocialStrategy();
  const queue = await readQueue();
  const counts = countByQueueState(queue);
  const health = getAllChannelHealth();

  console.log(`Social system status — ${new Date().toISOString().slice(0, 10)}`);
  console.log(`Paused: ${strategy.paused}`);
  console.log(`\nQueue (${queue.length} total):`);
  for (const [state, count] of Object.entries(counts)) console.log(`  ${state}: ${count}`);

  console.log(`\nChannel health:`);
  for (const [channel, h] of Object.entries(health)) {
    if (channel === "facebook" && h.status === "READY") {
      const pageId = process.env.SOCIAL_FACEBOOK_PAGE_ID;
      const token = process.env.SOCIAL_FACEBOOK_PAGE_ACCESS_TOKEN;
      if (pageId && token) {
        try {
          const url = new URL(`https://graph.facebook.com/v21.0/${pageId}`);
          url.searchParams.set("fields", "id,name");
          url.searchParams.set("access_token", token);
          const response = await fetch(url);
          if (response.ok) {
            console.log(`  facebook: CONNECTED — Page token authenticated by a read-only Graph API probe.`);
            continue;
          }
          const payload = await response.json().catch(() => ({})) as { error?: { code?: number; type?: string } };
          const authFailure = response.status === 401 || response.status === 403 || payload.error?.code === 190 || payload.error?.type === "OAuthException";
          console.log(`  facebook: ${authFailure ? "NEEDS_OWNER_AUTH" : "ERROR"} — Config is present but the read-only provider probe failed (HTTP ${response.status}${payload.error?.code ? ` / code ${payload.error.code}` : ""}).`);
          continue;
        } catch (error) {
          console.log(`  facebook: ERROR — Config is present but the read-only provider probe could not complete (${error instanceof Error ? error.name : "network error"}).`);
          continue;
        }
      }
    }
    console.log(`  ${channel}: ${h.status} — ${h.detail}`);
  }

  const nextScheduled = queue
    .filter((e) => e.state === "SCHEDULED")
    .sort((a, b) => (a.scheduledFor ?? "").localeCompare(b.scheduledFor ?? ""))
    .slice(0, 5);
  if (nextScheduled.length) {
    console.log(`\nNext scheduled:`);
    for (const e of nextScheduled) console.log(`  ${e.scheduledFor} — [${e.pillar}] ${e.topic}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
