import { describe, expect, it } from "vitest";
import {
  classifyAdminApprovalVisible,
  classifyChallenge,
  classifyEducationalPostsPolicy,
  classifyGroupPrivacy,
  classifyLinksPolicy,
  classifyMembership,
  classifySessionState,
  containsLink,
  DEFAULT_AUTONOMOUS_POLICY,
  deriveRulesConfidence,
  detectPromoRestrictionVisible,
  enrichFailure,
  evaluateAutonomousWrite,
  evaluateLinkPolicy,
  groupContextUrl,
  groupUrlFromPostUrl,
  isFirstContributionToGroup,
  isSafetyShutdownStatus,
  normalizedTextSha256,
  parseFacebookTask,
  sanitizeFacebookUrl,
  textSha256,
  verifyPublishedUrl,
  type ActionLogEntry,
} from "@/scripts/facebook/worker";

describe("Facebook worker task contract", () => {
  it("accepts all supported read commands", () => {
    expect(parseFacebookTask({ command: "facebook_status" }).command).toBe("facebook_status");
    expect(parseFacebookTask({ command: "facebook_open_group", group_url: "https://www.facebook.com/groups/DigitalDefyned/" }).command).toBe("facebook_open_group");
    expect(parseFacebookTask({ command: "facebook_rules", group_url: "https://www.facebook.com/groups/1576497699334353" }).command).toBe("facebook_rules");
    expect(parseFacebookTask({ command: "facebook_open_post", post_url: "https://www.facebook.com/groups/alpha/posts/999/" }).command).toBe("facebook_open_post");
    expect(parseFacebookTask({ command: "facebook_notifications" }).command).toBe("facebook_notifications");
  });

  it("preserves exact supplied write copy for posts and comments", () => {
    const postText = "Exact post copy.\n\nKeep spacing.";
    const post = parseFacebookTask({ command: "facebook_create_post", group_url: "https://www.facebook.com/groups/alpha/", text: postText });
    if (post.command !== "facebook_create_post") throw new Error("unexpected task type");
    expect(post.text).toBe(postText);

    const commentText = "Exact comment copy.";
    const comment = parseFacebookTask({ command: "facebook_comment", post_url: "https://www.facebook.com/groups/alpha/posts/999/", text: commentText });
    if (comment.command !== "facebook_comment") throw new Error("unexpected task type");
    expect(comment.text).toBe(commentText);
  });

  it("rejects non-facebook URLs, non-group URLs, and unknown fields", () => {
    expect(() => parseFacebookTask({ command: "facebook_open_group", group_url: "https://example.com/groups/test/" })).toThrow();
    expect(() => parseFacebookTask({ command: "facebook_open_group", group_url: "https://www.facebook.com/zuck" })).toThrow();
    expect(() => parseFacebookTask({ command: "facebook_comment", post_url: "https://www.facebook.com/groups/alpha/", text: "hi" })).toThrow();
    expect(() => parseFacebookTask({ command: "facebook_status", password: "never" })).toThrow();
  });

  it("rejects every command outside the strict allowlist", () => {
    for (const command of [
      "facebook_like",
      "facebook_react",
      "facebook_invite",
      "facebook_friend_request",
      "facebook_message",
      "facebook_join",
      "facebook_leave",
      "facebook_settings",
      "facebook_delete",
      "facebook_admin_action",
    ]) {
      expect(() => parseFacebookTask({ command })).toThrow();
    }
  });

  it("never returns tracking parameters or fragments in sanitized Facebook URLs", () => {
    expect(sanitizeFacebookUrl("https://www.facebook.com/groups/alpha/?ref=abc&fbclid=xyz#comment_123")).toBe("https://www.facebook.com/groups/alpha/");
  });

  it("derives the owning group from a post URL and from either write command", () => {
    expect(groupUrlFromPostUrl("https://www.facebook.com/groups/alpha/posts/999/")).toBe("https://www.facebook.com/groups/alpha/");
    const post = parseFacebookTask({ command: "facebook_create_post", group_url: "https://www.facebook.com/groups/alpha/", text: "x" });
    const comment = parseFacebookTask({ command: "facebook_comment", post_url: "https://www.facebook.com/groups/alpha/posts/999/", text: "x" });
    if (post.command !== "facebook_create_post" || comment.command !== "facebook_comment") throw new Error("unexpected task types");
    expect(groupContextUrl(post)).toBe("https://www.facebook.com/groups/alpha/");
    expect(groupContextUrl(comment)).toBe("https://www.facebook.com/groups/alpha/");
  });
});

describe("autonomous Facebook write policy", () => {
  const now = new Date("2026-08-31T12:00:00Z");
  const post = parseFacebookTask({ request_id: "p1", command: "facebook_create_post", group_url: "https://www.facebook.com/groups/alpha/", text: "Useful exact post copy." });
  const comment = parseFacebookTask({ request_id: "c1", command: "facebook_comment", post_url: "https://www.facebook.com/groups/alpha/posts/999/", text: "Useful exact reply." });
  if (post.command !== "facebook_create_post" || comment.command !== "facebook_comment") throw new Error("unexpected task types");
  const enabled = { ...DEFAULT_AUTONOMOUS_POLICY, autonomous_write_enabled: true };

  const action = (command: ActionLogEntry["command"], hoursAgo: number, overrides: Partial<ActionLogEntry> = {}): ActionLogEntry => ({
    timestamp: new Date(now.getTime() - hoursAgo * 3_600_000).toISOString(),
    request_id: `x-${hoursAgo}`,
    command,
    group_name: "Alpha",
    group_url: "https://www.facebook.com/groups/alpha/",
    published_url: "https://www.facebook.com/groups/alpha/posts/1/",
    had_miloosh_link: false,
    text_sha256: `hash-${hoursAgo}`,
    normalized_text_sha256: `norm-${hoursAgo}`,
    rule_confidence: "VERIFIED_CURRENT",
    ...overrides,
  });

  it("blocks when disabled and permits a bounded fresh write when enabled", () => {
    expect(evaluateAutonomousWrite(post, DEFAULT_AUTONOMOUS_POLICY, [], now).status).toBe("AUTONOMOUS_WRITE_DISABLED");
    expect(evaluateAutonomousWrite(post, enabled, [], now)).toEqual({ allowed: true, status: "AUTONOMOUS_EXECUTION_ALLOWED" });
  });

  it("enforces the daily write cap, daily post cap, and rolling 7-day post cap", () => {
    expect(evaluateAutonomousWrite(comment, enabled, [action("facebook_create_post", 2), action("facebook_comment", 3)], now).status).toBe("DAILY_WRITE_CAP");
    expect(evaluateAutonomousWrite(post, enabled, [action("facebook_create_post", 2)], now).status).toBe("DAILY_POST_CAP");
    expect(
      evaluateAutonomousWrite(
        post,
        enabled,
        [
          action("facebook_create_post", 25, { group_url: "https://www.facebook.com/groups/other/" }),
          action("facebook_create_post", 50, { group_url: "https://www.facebook.com/groups/other2/" }),
          action("facebook_create_post", 100, { group_url: "https://www.facebook.com/groups/other3/" }),
        ],
        now,
      ).status,
    ).toBe("ROLLING_7_DAY_POST_CAP");
  });

  it("enforces the 60-minute interval and exact duplicate-text rejection", () => {
    expect(evaluateAutonomousWrite(post, enabled, [action("facebook_comment", 0.5, { group_url: "https://www.facebook.com/groups/other/" })], now).status).toBe("WRITE_INTERVAL_LIMIT");
    expect(
      evaluateAutonomousWrite(post, enabled, [action("facebook_create_post", 80, { text_sha256: textSha256(post.text), group_url: "https://www.facebook.com/groups/other/" })], now).status,
    ).toBe("DUPLICATE_TEXT");
  });

  it("rejects substantially-identical copy posted to a different group, without ever storing the exact text", () => {
    const actions = [action("facebook_create_post", 80, { normalized_text_sha256: normalizedTextSha256("Useful   EXACT post copy!!"), group_url: "https://www.facebook.com/groups/other/" })];
    expect(evaluateAutonomousWrite(post, enabled, actions, now).status).toBe("CROSS_GROUP_DUPLICATE_CONTENT");
  });

  it("blocks a second standalone post to the same group inside 72 hours but allows a comment reply there", () => {
    const actions = [action("facebook_create_post", 48)];
    expect(evaluateAutonomousWrite(post, enabled, actions, now).status).toBe("SAME_GROUP_POST_COOLDOWN");
    expect(evaluateAutonomousWrite(comment, enabled, actions, now)).toEqual({ allowed: true, status: "AUTONOMOUS_EXECUTION_ALLOWED" });
  });

  it("recognizes every hard safety shutdown status", () => {
    for (const status of [
      "CAPTCHA",
      "SUSPICIOUS_LOGIN",
      "ACCOUNT_VERIFICATION",
      "ACCOUNT_RESTRICTION",
      "GROUP_POSTING_RESTRICTION",
      "MODERATOR_WARNING",
      "RATE_LIMIT",
      "GROUP_REJECTED",
      "GROUP_UNAVAILABLE",
      "SECURITY_CHECKPOINT",
      "AMBIGUOUS_RULES_AT_WRITE_TIME",
    ]) {
      expect(isSafetyShutdownStatus(status)).toBe(true);
    }
    expect(isSafetyShutdownStatus("READ_ONLY_COMPLETE")).toBe(false);
  });
});

describe("link policy gate at write time", () => {
  it("permits link-free copy regardless of rules confidence", () => {
    expect(containsLink("No links here, just advice.")).toBe(false);
    expect(evaluateLinkPolicy("No links here, just advice.", "unknown", true)).toEqual({ allowed: true, status: "NO_LINK" });
  });

  it("permits a link only when current rules explicitly allow it", () => {
    expect(containsLink("See https://example.com for more.")).toBe(true);
    expect(evaluateLinkPolicy("See https://example.com for more.", "allowed", false)).toEqual({ allowed: true, status: "LINKS_ALLOWED_BY_RULES" });
  });

  it("blocks a link on a group's first contribution unless rules explicitly allow it", () => {
    expect(evaluateLinkPolicy("See https://example.com for more.", "conditional", true).status).toBe("FIRST_CONTRIBUTION_LINKS_NOT_PERMITTED");
    expect(evaluateLinkPolicy("See https://example.com for more.", "unknown", true).status).toBe("FIRST_CONTRIBUTION_LINKS_NOT_PERMITTED");
  });

  it("blocks a link on a later contribution when rules prohibit it or leave it unclear", () => {
    expect(evaluateLinkPolicy("See https://example.com for more.", "prohibited", false).status).toBe("LINKS_PROHIBITED_BY_RULES");
    expect(evaluateLinkPolicy("See https://example.com for more.", "conditional", false).status).toBe("LINKS_POLICY_UNCLEAR");
  });

  it("tracks first contribution per group from the action log alone", () => {
    const entries: ActionLogEntry[] = [
      {
        timestamp: "2026-08-30T00:00:00Z",
        request_id: null,
        command: "facebook_create_post",
        group_name: "Alpha",
        group_url: "https://www.facebook.com/groups/alpha/",
        published_url: "https://www.facebook.com/groups/alpha/posts/1/",
        had_miloosh_link: false,
        text_sha256: "a",
        normalized_text_sha256: "b",
        rule_confidence: "VERIFIED_CURRENT",
      },
    ];
    expect(isFirstContributionToGroup(entries, "https://www.facebook.com/groups/alpha/")).toBe(false);
    expect(isFirstContributionToGroup(entries, "https://www.facebook.com/groups/beta/")).toBe(true);
  });
});

describe("page-signal classification (pure — no browser needed)", () => {
  it("classifies session state conservatively, defaulting to LOGIN_REQUIRED when unsure", () => {
    expect(classifySessionState({ hasPasswordField: false, hasAuthenticatedNav: true })).toBe("AUTHENTICATED");
    expect(classifySessionState({ hasPasswordField: true, hasAuthenticatedNav: false })).toBe("LOGIN_REQUIRED");
    expect(classifySessionState({ hasPasswordField: false, hasAuthenticatedNav: false })).toBe("LOGIN_REQUIRED");
  });

  it("detects hard safety challenges from a checkpoint URL or visible page text", () => {
    expect(classifyChallenge({ pathname: "/checkpoint/608/", bodyText: "" })).toBe("SECURITY_CHECKPOINT");
    expect(classifyChallenge({ pathname: "/", bodyText: "Please complete this CAPTCHA to continue" })).toBe("CAPTCHA");
    expect(classifyChallenge({ pathname: "/", bodyText: "We noticed unusual activity on your account" })).toBe("SUSPICIOUS_LOGIN");
    expect(classifyChallenge({ pathname: "/", bodyText: "Your account has been restricted" })).toBe("ACCOUNT_RESTRICTION");
    expect(classifyChallenge({ pathname: "/", bodyText: "You're temporarily blocked from posting in groups" })).toBe("GROUP_POSTING_RESTRICTION");
    expect(classifyChallenge({ pathname: "/", bodyText: "The admin has sent you a warning about this post" })).toBe("MODERATOR_WARNING");
    expect(classifyChallenge({ pathname: "/", bodyText: "Everything looks normal here" })).toBeNull();
  });

  it("classifies group privacy and membership from visible text", () => {
    expect(classifyGroupPrivacy("This is a Public group. 1.2K members.")).toBe("public");
    expect(classifyGroupPrivacy("Private group · 340 members")).toBe("private");
    expect(classifyGroupPrivacy("")).toBe("unknown");
    expect(classifyMembership("Your request to join is pending approval")).toBe("pending_request");
    expect(classifyMembership("You're a member of this group")).toBe("member");
    expect(classifyMembership("Join Group")).toBe("not_member");
  });

  it("derives rules confidence, defaulting to UNKNOWN whenever the page is ambiguous (fail closed for writes)", () => {
    expect(deriveRulesConfidence({ rulesHeadingFound: true, ruleItemsCount: 3, membersOnlyNotice: false })).toBe("VERIFIED_CURRENT");
    expect(deriveRulesConfidence({ rulesHeadingFound: true, ruleItemsCount: 0, membersOnlyNotice: false })).toBe("PARTIAL");
    expect(deriveRulesConfidence({ rulesHeadingFound: false, ruleItemsCount: 0, membersOnlyNotice: false })).toBe("UNKNOWN");
    expect(deriveRulesConfidence({ rulesHeadingFound: true, ruleItemsCount: 5, membersOnlyNotice: true })).toBe("UNKNOWN");
  });

  it("classifies links/self-promotion, educational-post, promo-day, and admin-approval policy from visible rules text", () => {
    expect(classifyLinksPolicy("No links or self-promotion of any kind.")).toBe("prohibited");
    expect(classifyLinksPolicy("Self-promotion allowed only on Saturday promo threads.")).toBe("conditional");
    expect(classifyLinksPolicy("Resource links are welcome if relevant.")).toBe("allowed");
    expect(classifyLinksPolicy("Be nice to each other.")).toBe("unknown");

    expect(classifyEducationalPostsPolicy("Educational content is welcome here.")).toBe("allowed");
    expect(classifyEducationalPostsPolicy("No blog posts, only questions and discussions allowed.")).toBe("prohibited");
    expect(classifyEducationalPostsPolicy("Educational content only on Tuesdays, otherwise add value before promoting.")).toBe("conditional");

    expect(detectPromoRestrictionVisible("Self-promotion is limited to Friday promo threads.")).toBe(true);
    expect(detectPromoRestrictionVisible("Just be respectful.")).toBe(false);

    expect(classifyAdminApprovalVisible("All posts require approval from an admin before appearing.")).toBe(true);
    expect(classifyAdminApprovalVisible("No approval needed to post here.")).toBe(false);
    expect(classifyAdminApprovalVisible("Please be kind to each other.")).toBe("unknown");
  });
});

describe("structured failures and publish verification", () => {
  it("enriches any non-ok result with reason/retryable/human_action_required (no composer found -> structured error)", () => {
    expect(enrichFailure({ ok: false, status: "POST_COMPOSER_NOT_FOUND" })).toEqual({
      ok: false,
      status: "POST_COMPOSER_NOT_FOUND",
      reason: "POST_COMPOSER_NOT_FOUND",
      retryable: false,
      human_action_required: false,
    });
    expect(enrichFailure({ ok: false, status: "LOGIN_REQUIRED" }).human_action_required).toBe(true);
  });

  it("never reports success without a captured live URL, and never retries an ambiguous submission", () => {
    expect(verifyPublishedUrl(null)).toEqual({ ok: false, status: "AMBIGUOUS_SUBMISSION_NOT_RETRIED" });
    expect(verifyPublishedUrl("https://www.facebook.com/groups/alpha/posts/123/")).toEqual({ ok: true, status: "PUBLISHED" });
  });
});
