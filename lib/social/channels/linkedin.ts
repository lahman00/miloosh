import { assertMutationAllowed } from "@/lib/deployment/mutation-policy";
import { createHmac } from "node:crypto";
import type { ChannelVariant, PublishResult } from "@/lib/social/types";
import { type SocialAdapter, buildPublishResult, defaultFormat, envAll, missingEnvNames } from "@/lib/social/channels/types";
import { claimLinkedInDelivery, recordLinkedInDelivery, releaseLinkedInDelivery } from "@/lib/social/linkedin-delivery-claims";

/**
 * LinkedIn Company Page adapter. It fails closed until the production
 * environment has both approved API access and the required credentials.
 *
 * Real research (2026-08-16, directly fetched from learn.microsoft.com/
 * linkedin, re-verified 2026-08-19): posting to a LinkedIn COMPANY PAGE
 * requires the Community Management API (w_organization_social scope,
 * /rest/posts, organization URN as author, Linkedin-Version header) —
 * gated behind LinkedIn's formal partner-application process: legal-
 * entity verification, a Page-admin app-association check, a Development
 * Tier review, then a Standard Tier review requiring a narrated
 * screencast of the working OAuth flow. LinkedIn explicitly reserves the
 * right to decline qualified applicants and publishes no guaranteed
 * review timeline or self-serve fee.
 *
 * 2026-08-19 update: current third-party integrator guides report the
 * partner program may now be closed to NEW applicants entirely ("if you
 * weren't already a partner when applications closed, you can't apply")
 * — not independently confirmed against LinkedIn's own docs, which don't
 * state this directly, but it's consistent with the access-request-form
 * + review language LinkedIn's own docs do show. Treat as: this may be
 * harder than "apply and wait," not easier — verify current status
 * directly with LinkedIn before assuming the partner path is even open.
 *
 * The only self-serve, no-approval LinkedIn product ("Share on
 * LinkedIn", w_member_social) posts to a PERSONAL profile, not a company
 * page — not a fit for Miloosh's brand page.
 *
 * The implementation is ready for POST /rest/posts, but production has
 * no LinkedIn credentials today. SETUP_REQUIRED is therefore the only
 * live outcome until the external access gate is completed.
 */

const CHAR_LIMIT = 3000;
const DIRECT_ENV = ["SOCIAL_LINKEDIN_ACCESS_TOKEN", "SOCIAL_LINKEDIN_ORGANIZATION_ID", "SOCIAL_LINKEDIN_VERSION"];
const MAKE_ENV = ["MAKE_LINKEDIN_WEBHOOK_URL", "MAKE_LINKEDIN_WEBHOOK_SECRET"];
const BUFFER_ENV = ["SOCIAL_LINKEDIN_BUFFER_API_KEY", "SOCIAL_LINKEDIN_BUFFER_CHANNEL_ID"];
const BUFFER_API = "https://api.buffer.com";
const ORGANIZATION_ID = "141163964";
const ORGANIZATION_URN = `urn:li:organization:${ORGANIZATION_ID}`;

export type LinkedInTransport = "direct" | "make" | "buffer";

export function getLinkedInTransport(): LinkedInTransport {
  const value = process.env.LINKEDIN_TRANSPORT;
  return value === "buffer" || value === "make" ? value : "direct";
}

function requiredEnv(): string[] {
  const transport = getLinkedInTransport();
  return transport === "buffer" ? BUFFER_ENV : transport === "make" ? MAKE_ENV : DIRECT_ENV;
}

type BufferPost = { id: string; status: string; sentAt?: string | null; externalLink?: string | null };
type BufferGraphqlResult = { data?: { createPost?: { post?: BufferPost; message?: string }; post?: BufferPost }; errors?: Array<{ message?: string; extensions?: { code?: string } }> };

async function bufferRequest(query: string, variables: Record<string, unknown>): Promise<{ response: Response; result: BufferGraphqlResult }> {
  const response = await fetch(BUFFER_API, { method: "POST", headers: { Authorization: `Bearer ${process.env.SOCIAL_LINKEDIN_BUFFER_API_KEY!}`, "Content-Type": "application/json" }, body: JSON.stringify({ query, variables }), signal: AbortSignal.timeout(20_000) });
  const result = await response.json() as BufferGraphqlResult;
  return { response, result };
}

function bufferError(result: BufferGraphqlResult): { message: string; rateLimited: boolean } | null {
  const graph = result.errors?.[0];
  if (graph) return { message: graph.message || "Buffer GraphQL error", rateLimited: graph.extensions?.code === "RATE_LIMIT_EXCEEDED" };
  const typed = result.data?.createPost?.message;
  return typed ? { message: typed, rateLimited: false } : null;
}

function resultFromBufferPost(post: BufferPost, body: string, link: string, independentlyRead = false): PublishResult {
  if (post.status === "sent") return buildPublishResult({ channel: "linkedin", status: "PUBLISHED", text: body, link, transport: "buffer", bufferPostId: post.id, postUrl: post.externalLink ?? null, verified: independentlyRead, targetId: process.env.SOCIAL_LINKEDIN_BUFFER_CHANNEL_ID, error: post.externalLink ? "Buffer reports the post as sent to LinkedIn." : "Buffer reports the post as sent to LinkedIn; Buffer did not return externalLink this time." });
  if (post.status === "error") return buildPublishResult({ channel: "linkedin", status: "FAILED", text: body, link, transport: "buffer", bufferPostId: post.id, targetId: process.env.SOCIAL_LINKEDIN_BUFFER_CHANNEL_ID, error: "Buffer reports a definite LinkedIn publication failure." });
  return buildPublishResult({ channel: "linkedin", status: "PENDING_CONFIRMATION", text: body, link, transport: "buffer", bufferPostId: post.id, targetId: process.env.SOCIAL_LINKEDIN_BUFFER_CHANNEL_ID, error: `Buffer accepted the post with status ${post.status}; LinkedIn publication is not yet confirmed.` });
}

async function publishViaBuffer(variant: ChannelVariant, body: string, options: { entryId?: string }): Promise<PublishResult> {
  if (!envAll(BUFFER_ENV) || !options.entryId) return buildPublishResult({ channel: "linkedin", status: "SETUP_REQUIRED", text: body, link: variant.link ?? "", transport: "buffer", targetId: process.env.SOCIAL_LINKEDIN_BUFFER_CHANNEL_ID, error: `Missing ${[...missingEnvNames(BUFFER_ENV), ...(!options.entryId ? ["stable queue entry ID"] : [])].join(", ")}.` });
  const providerIdentity = `linkedin:${options.entryId}`;
  if (!(await claimLinkedInDelivery(providerIdentity))) {
    return buildPublishResult({ channel: "linkedin", status: "DUPLICATE_SKIPPED", text: body, link: variant.link ?? "", transport: "buffer", targetId: process.env.SOCIAL_LINKEDIN_BUFFER_CHANNEL_ID, error: `Durable provider claim already exists for ${providerIdentity}; no Buffer mutation was attempted.` });
  }
  try {
    const query = `mutation CreateLinkedInPost($input: CreatePostInput!) { createPost(input: $input) { ... on PostActionSuccess { post { id status sentAt externalLink } } ... on MutationError { message } } }`;
    const assets = variant.imageUrl ? [{ image: { url: variant.imageUrl } }] : [];
    const { response, result } = await bufferRequest(query, { input: { text: body, channelId: process.env.SOCIAL_LINKEDIN_BUFFER_CHANNEL_ID, schedulingType: "automatic", mode: "shareNow", assets, source: `miloosh:${providerIdentity}` } });
    const error = bufferError(result);
    if (!response.ok || error) {
      const retryable = response.status === 429 || error?.rateLimited;
      const definiteFailure = Boolean(error) || (response.status >= 400 && response.status < 500);
      if (definiteFailure) await releaseLinkedInDelivery(providerIdentity);
      return buildPublishResult({ channel: "linkedin", status: retryable ? "RATE_LIMITED" : "FAILED", text: body, link: variant.link ?? "", transport: "buffer", targetId: process.env.SOCIAL_LINKEDIN_BUFFER_CHANNEL_ID, error: `Buffer API ${error?.message || `HTTP ${response.status}`}` });
    }
    const post = result.data?.createPost?.post;
    if (!post?.id) return buildPublishResult({ channel: "linkedin", status: "FAILED", text: body, link: variant.link ?? "", transport: "buffer", targetId: process.env.SOCIAL_LINKEDIN_BUFFER_CHANNEL_ID, error: "Buffer returned success without a Buffer post ID; unknown publication outcome, so automatic retry is withheld." });
    await recordLinkedInDelivery(providerIdentity, { bufferPostId: post.id, status: post.status, channelId: process.env.SOCIAL_LINKEDIN_BUFFER_CHANNEL_ID });
    return resultFromBufferPost(post, body, variant.link ?? "");
  } catch (error) {
    return buildPublishResult({ channel: "linkedin", status: "FAILED", text: body, link: variant.link ?? "", transport: "buffer", targetId: process.env.SOCIAL_LINKEDIN_BUFFER_CHANNEL_ID, error: `Buffer request failed with unknown publication outcome: ${error instanceof Error ? error.message : String(error)}` });
  }
}

/** Safe read-only reconciliation for a previously accepted Buffer post. */
export async function reconcileBufferLinkedInPost(bufferPostId: string, text = "", link = ""): Promise<PublishResult> {
  if (!envAll(BUFFER_ENV)) return buildPublishResult({ channel: "linkedin", status: "SETUP_REQUIRED", text, link, transport: "buffer", bufferPostId, targetId: process.env.SOCIAL_LINKEDIN_BUFFER_CHANNEL_ID, error: `Missing ${missingEnvNames(BUFFER_ENV).join(", ")}.` });
  try {
    const query = `query ReconcileLinkedInPost($input: PostInput!) { post(input: $input) { id status sentAt externalLink } }`;
    const { response, result } = await bufferRequest(query, { input: { id: bufferPostId } });
    const graph = result.errors?.[0];
    if (!response.ok || graph) return buildPublishResult({ channel: "linkedin", status: response.status === 429 || graph?.extensions?.code === "RATE_LIMIT_EXCEEDED" ? "RATE_LIMITED" : "FAILED", text, link, transport: "buffer", bufferPostId, targetId: process.env.SOCIAL_LINKEDIN_BUFFER_CHANNEL_ID, error: `Buffer reconciliation ${graph?.message || `HTTP ${response.status}`}` });
    const post = result.data?.post;
    if (!post || post.id !== bufferPostId) return buildPublishResult({ channel: "linkedin", status: "FAILED", text, link, transport: "buffer", bufferPostId, targetId: process.env.SOCIAL_LINKEDIN_BUFFER_CHANNEL_ID, error: "Buffer reconciliation returned no matching post; definite lookup failure." });
    return resultFromBufferPost(post, text, link, true);
  } catch (error) {
    return buildPublishResult({ channel: "linkedin", status: "FAILED", text, link, transport: "buffer", bufferPostId, targetId: process.env.SOCIAL_LINKEDIN_BUFFER_CHANNEL_ID, error: `Buffer reconciliation failed with unknown outcome: ${error instanceof Error ? error.message : String(error)}` });
  }
}

export async function verifyBufferLinkedInChannel(): Promise<{ id: string; name: string; displayName: string | null; descriptor: string; service: string; type: string; isDisconnected: boolean; isLocked: boolean }> {
  if (!envAll(BUFFER_ENV)) throw new Error(`Missing ${missingEnvNames(BUFFER_ENV).join(", ")}.`);
  const query = `query VerifyLinkedInChannel($input: ChannelInput!) { channel(input: $input) { id name displayName descriptor service type isDisconnected isLocked } }`;
  const response = await fetch(BUFFER_API, { method: "POST", headers: { Authorization: `Bearer ${process.env.SOCIAL_LINKEDIN_BUFFER_API_KEY!}`, "Content-Type": "application/json" }, body: JSON.stringify({ query, variables: { input: { id: process.env.SOCIAL_LINKEDIN_BUFFER_CHANNEL_ID } } }), signal: AbortSignal.timeout(20_000) });
  const result = await response.json() as { data?: { channel?: { id: string; name: string; displayName: string | null; descriptor: string; service: string; type: string; isDisconnected: boolean; isLocked: boolean } }; errors?: Array<{ message?: string }> };
  if (!response.ok || result.errors?.length || !result.data?.channel) throw new Error(result.errors?.[0]?.message || `Buffer channel query HTTP ${response.status}`);
  if (result.data.channel.id !== process.env.SOCIAL_LINKEDIN_BUFFER_CHANNEL_ID) throw new Error("Buffer returned a different channel identity.");
  return result.data.channel;
}

export async function verifyBufferLinkedInTarget(): Promise<{
  bufferAuthenticated: true;
  channel: Awaited<ReturnType<typeof verifyBufferLinkedInChannel>>;
  target: "company_page";
}> {
  const channel = await verifyBufferLinkedInChannel();
  const service = channel.service.toLowerCase();
  const targetMetadata = `${channel.type} ${channel.descriptor}`.toLowerCase();
  const isLinkedIn = service.includes("linkedin");
  const isPersonalProfile = /personal|profile|member/.test(targetMetadata);
  const isCompanyPage = /organization|organisation|company|page/.test(targetMetadata);

  if (!isLinkedIn || isPersonalProfile || !isCompanyPage) {
    throw new Error("Configured Buffer channel is not a LinkedIn Company Page.");
  }

  return { bufferAuthenticated: true, channel, target: "company_page" };
}

async function publishViaMake(variant: ChannelVariant, body: string, options: { entryId?: string; scheduledAt?: string | null }): Promise<PublishResult> {
  const env = envAll(MAKE_ENV);
  if (!env || !options.entryId) return buildPublishResult({ channel: "linkedin", status: "SETUP_REQUIRED", text: body, link: variant.link ?? "", transport: "make", error: `Missing ${[...missingEnvNames(MAKE_ENV), ...(!options.entryId ? ["stable queue entry ID"] : [])].join(", ")}.` });
  const payload = JSON.stringify({ postId: options.entryId, idempotencyKey: `linkedin:${options.entryId}`, text: body, url: variant.link, scheduledAt: options.scheduledAt ?? null, organizationId: ORGANIZATION_ID, organizationUrn: ORGANIZATION_URN });
  const timestamp = Date.now().toString();
  const signature = `sha256=${createHmac("sha256", env.MAKE_LINKEDIN_WEBHOOK_SECRET!).update(`${timestamp}.${payload}`).digest("hex")}`;
  try {
    const response = await fetch(env.MAKE_LINKEDIN_WEBHOOK_URL!, { method: "POST", headers: { Authorization: `Bearer ${env.MAKE_LINKEDIN_WEBHOOK_SECRET}`, "Content-Type": "application/json", "X-Miloosh-Timestamp": timestamp, "X-Miloosh-Signature": signature, "Idempotency-Key": `linkedin:${options.entryId}` }, body: payload, signal: AbortSignal.timeout(20_000) });
    const raw = (await response.text()).slice(0, 2_000);
    if (!response.ok) return buildPublishResult({ channel: "linkedin", status: response.status === 429 ? "RATE_LIMITED" : "FAILED", text: body, link: variant.link ?? "", transport: "make", error: `Make webhook HTTP ${response.status}: ${raw}` });
    let result: { status?: string; executionId?: string; linkedinPostId?: string; linkedinPostUrl?: string; error?: string } = {};
    try { result = raw ? JSON.parse(raw) : {}; } catch { /* A 2xx without a definitive JSON result is acceptance only. */ }
    if (result.status === "published" && result.linkedinPostId) return buildPublishResult({ channel: "linkedin", status: "PUBLISHED", text: body, link: variant.link ?? "", transport: "make", executionId: result.executionId, postId: result.linkedinPostId, linkedinPostId: result.linkedinPostId, postUrl: result.linkedinPostUrl ?? null, verified: true });
    if (result.status === "failed") return buildPublishResult({ channel: "linkedin", status: "FAILED", text: body, link: variant.link ?? "", transport: "make", executionId: result.executionId, error: result.error || "Make reported a definite LinkedIn module failure." });
    return buildPublishResult({ channel: "linkedin", status: "PENDING_CONFIRMATION", text: body, link: variant.link ?? "", transport: "make", executionId: result.executionId, error: "Make accepted the request but did not return a definitive LinkedIn post ID; awaiting authenticated reconciliation." });
  } catch (error) {
    return buildPublishResult({ channel: "linkedin", status: "FAILED", text: body, link: variant.link ?? "", transport: "make", error: `Make request failed with unknown publication outcome: ${error instanceof Error ? error.message : String(error)}` });
  }
}

async function publishDirect(variant: ChannelVariant, body: string): Promise<PublishResult> {
  if (!envAll(DIRECT_ENV)) return buildPublishResult({ channel: "linkedin", status: "SETUP_REQUIRED", text: body, link: variant.link ?? "", transport: "direct", error: `Missing ${missingEnvNames(DIRECT_ENV).join(", ")} and/or LinkedIn Community Management API access (w_organization_social).` });
  try {
    const response = await fetch("https://api.linkedin.com/rest/posts", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.SOCIAL_LINKEDIN_ACCESS_TOKEN!}`, "Content-Type": "application/json", "Linkedin-Version": process.env.SOCIAL_LINKEDIN_VERSION!, "X-Restli-Protocol-Version": "2.0.0" },
      body: JSON.stringify({ author: `urn:li:organization:${process.env.SOCIAL_LINKEDIN_ORGANIZATION_ID!}`, commentary: body, visibility: "PUBLIC", distribution: { feedDistribution: "MAIN_FEED", targetEntities: [], thirdPartyDistributionChannels: [] }, lifecycleState: "PUBLISHED", isReshareDisabledByAuthor: false }),
    });
    if (!response.ok) {
      const detail = (await response.text()).slice(0, 500);
      return buildPublishResult({ channel: "linkedin", status: response.status === 429 ? "RATE_LIMITED" : "FAILED", text: body, link: variant.link ?? "", transport: "direct", error: `LinkedIn Posts API HTTP ${response.status}: ${detail}` });
    }
    const postId = response.headers.get("x-restli-id");
    if (!postId) return buildPublishResult({ channel: "linkedin", status: "FAILED", text: body, link: variant.link ?? "", transport: "direct", error: "LinkedIn returned success without x-restli-id; publication identity is unknown, so automatic retry is withheld." });
    return buildPublishResult({ channel: "linkedin", status: "PUBLISHED", text: body, link: variant.link ?? "", transport: "direct", postId, linkedinPostId: postId, verified: false });
  } catch (error) {
    return buildPublishResult({ channel: "linkedin", status: "FAILED", text: body, link: variant.link ?? "", transport: "direct", error: `LinkedIn request failed with unknown publication outcome; inspect the Page before retrying: ${error instanceof Error ? error.message : String(error)}` });
  }
}

export const linkedinAdapter: SocialAdapter = {
  channel: "linkedin",
  requiredEnv: [...DIRECT_ENV, ...MAKE_ENV, ...BUFFER_ENV, "LINKEDIN_TRANSPORT"],
  charLimit: CHAR_LIMIT,
  isConfigured: () => envAll(requiredEnv()) !== null,
  missingEnv: () => missingEnvNames(requiredEnv()),
  format: (text, link) => defaultFormat(text, link, CHAR_LIMIT),

  async publish(variant: ChannelVariant, options): Promise<PublishResult> {
    if (!options.dryRun) await assertMutationAllowed();
    const body = defaultFormat(variant.text, variant.link, CHAR_LIMIT);
    const transport = getLinkedInTransport();
    if (options.dryRun) return buildPublishResult({ channel: "linkedin", status: "DRY_RUN", text: body, link: variant.link ?? "", transport, targetId: transport === "buffer" ? process.env.SOCIAL_LINKEDIN_BUFFER_CHANNEL_ID ?? null : null });
    return transport === "buffer" ? publishViaBuffer(variant, body, options) : transport === "make" ? publishViaMake(variant, body, options) : publishDirect(variant, body);
  },
};
