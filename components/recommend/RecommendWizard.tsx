"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Bot,
  Building2,
  Compass,
  Globe,
  ShieldQuestion,
  SlidersHorizontal,
  Users,
} from "lucide-react";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { OptionButton } from "@/components/recommend/OptionButton";
import { ToggleCard } from "@/components/recommend/ToggleCard";
import type { RecommendationAnswers } from "@/lib/recommend/types";
import { RECOMMEND_DOMAINS, DOMAIN_META } from "@/lib/recommend/domains";
import { DEFAULT_ANSWERS, answersToSearchParams } from "@/lib/recommend/query";
import { trackEvent } from "@/lib/analytics/track";

const STEPS = ["What you need", "Your team", "Budget & industry", "Fine-tune"] as const;

export function RecommendWizard({ initialAnswers = DEFAULT_ANSWERS }: { initialAnswers?: RecommendationAnswers }) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<RecommendationAnswers>(initialAnswers);
  const [showNeedChoices, setShowNeedChoices] = useState(initialAnswers.primaryNeed !== "ecommerce_platform");
  const [integrationsInput, setIntegrationsInput] = useState("");

  const isLastStep = step === STEPS.length - 1;

  useEffect(() => {
    // Fired once per mount, deliberately not tied to `step` — this marks
    // the start of a wizard session, not each step transition.
    trackEvent({ type: "recommend_started", path: "/recommend" });
  }, []);

  function update<K extends keyof RecommendationAnswers>(key: K, value: RecommendationAnswers[K]) {
    setAnswers((prev) => ({ ...prev, [key]: value }));
  }

  function selectPrimaryNeed(domain: RecommendationAnswers["primaryNeed"]) {
    setAnswers((prev) => ({
      ...prev,
      primaryNeed: domain,
      ecommerceSituation: domain === "ecommerce_platform" ? prev.ecommerceSituation : "not-sure",
    }));
    trackEvent({
      type: "recommend_need_selected",
      path: "/recommend",
      domain: domain ?? "not_sure",
    });
  }

  function selectEcommerceSituation(situation: RecommendationAnswers["ecommerceSituation"]) {
    update("ecommerceSituation", situation);
    trackEvent({ type: "recommend_ecommerce_situation_selected", path: "/recommend", situation });
  }

  function handleSubmit() {
    const finalAnswers: RecommendationAnswers = {
      ...answers,
      requiredIntegrations: integrationsInput
        .split(",")
        .map((value) => value.trim())
        .filter((value) => value.length > 0)
        .slice(0, 10),
    };

    trackEvent({
      type: "recommend_completed",
      path: "/recommend",
      domain: finalAnswers.primaryNeed ?? "not_sure",
    });

    const params = answersToSearchParams(finalAnswers);
    router.push(`/recommend/results?${params.toString()}`);
  }

  return (
    <Card className="mx-auto max-w-2xl">
      <div className="flex items-center gap-2">
        {STEPS.map((label, index) => (
          <div key={label} className="flex flex-1 flex-col gap-2">
            <div
              className={`h-1.5 rounded-full transition ${
                index <= step ? "bg-white" : "bg-white/10"
              }`}
            />
            <span
              className={`hidden text-xs font-medium sm:block ${
                index === step ? "text-white" : "text-zinc-400"
              }`}
            >
              {label}
            </span>
          </div>
        ))}
      </div>

      <div className="mt-8 min-h-[22rem]">
        {step === 0 ? (
          <div className="space-y-8">
          {!showNeedChoices && answers.primaryNeed === "ecommerce_platform" ? (
            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
              <p className="text-sm leading-6 text-zinc-300">
                You&apos;re evaluating an ecommerce platform decision. Start with the situation you&apos;re in.
              </p>
              <Button type="button" variant="ghost" className="mt-2 px-0" onClick={() => setShowNeedChoices(true)}>
                Choose a different type of software
              </Button>
            </div>
          ) : null}
          {showNeedChoices ? (
          <fieldset>
            <legend className="text-sm font-semibold text-white">What are you trying to do?</legend>
            <p className="mt-1 text-xs text-zinc-400">
              Pick the one that&apos;s closest — you can fine-tune the details next.
            </p>
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {RECOMMEND_DOMAINS.map((domain) => {
                const meta = DOMAIN_META[domain];
                return (
                  <OptionButton
                    key={domain}
                    selected={answers.primaryNeed === domain}
                    onClick={() => selectPrimaryNeed(domain)}
                    title={meta.label}
                    description={meta.description}
                  />
                );
              })}
              <OptionButton
                selected={answers.primaryNeed === null}
                onClick={() => selectPrimaryNeed(null)}
                title="Not sure yet"
                description="Show me relevant options based on team size and budget alone"
                className="sm:col-span-2"
              />
            </div>
          </fieldset>
          ) : null}
          {answers.primaryNeed === "ecommerce_platform" ? (
            <fieldset>
              <legend className="text-sm font-semibold text-white">What best describes your situation?</legend>
              <div className="mt-3 grid grid-cols-1 gap-3">
                {([
                  ["new", "Starting from scratch"],
                  ["repair", "Fixing the store I already have"],
                  ["embed", "Keeping my website, changing the commerce layer"],
                  ["migrate", "Moving an existing store to a different platform"],
                  ["not-sure", "Not sure yet"],
                ] as const).map(([value, label]) => (
                  <OptionButton key={value} title={label} selected={answers.ecommerceSituation === value} onClick={() => selectEcommerceSituation(value)} />
                ))}
              </div>
            </fieldset>
          ) : null}
          </div>
        ) : null}

        {step === 1 ? (
          <div className="space-y-8">
            <fieldset>
              <legend className="flex items-center gap-2 text-sm font-semibold text-white">
                <Users className="h-4 w-4" /> Team size
              </legend>
              <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
                {(
                  [
                    ["solo", "Just me"],
                    ["small", "Small (2-10)"],
                    ["medium", "Medium (11-50)"],
                    ["large", "Large (51+)"],
                    ["unspecified", "Not sure"],
                  ] as const
                ).map(([value, label]) => (
                  <OptionButton
                    key={value}
                    selected={answers.teamSize === value}
                    onClick={() => update("teamSize", value)}
                    title={label}
                  />
                ))}
              </div>
            </fieldset>

            <fieldset>
              <legend className="flex items-center gap-2 text-sm font-semibold text-white">
                <Building2 className="h-4 w-4" /> Company stage
              </legend>
              <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {(
                  [
                    ["startup", "Startup"],
                    ["growth", "Growth"],
                    ["enterprise", "Enterprise"],
                    ["unspecified", "Not sure"],
                  ] as const
                ).map(([value, label]) => (
                  <OptionButton
                    key={value}
                    selected={answers.companyStage === value}
                    onClick={() => update("companyStage", value)}
                    title={label}
                  />
                ))}
              </div>
            </fieldset>

            <fieldset>
              <legend className="flex items-center gap-2 text-sm font-semibold text-white">
                <Globe className="h-4 w-4" /> How does your team work?
              </legend>
              <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {(
                  [
                    ["remote", "Remote"],
                    ["office", "In-office"],
                    ["hybrid", "Hybrid"],
                    ["unspecified", "Not sure"],
                  ] as const
                ).map(([value, label]) => (
                  <OptionButton
                    key={value}
                    selected={answers.workStyle === value}
                    onClick={() => update("workStyle", value)}
                    title={label}
                  />
                ))}
              </div>
            </fieldset>
          </div>
        ) : null}

        {step === 2 ? (
          <div className="space-y-8">
            <fieldset>
              <legend className="text-sm font-semibold text-white">Budget</legend>
              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
                {(
                  [
                    ["free", "Free only", "Must have a free tier or be open source"],
                    ["low", "Low cost", "Free tier or affordable entry plan is fine"],
                    ["flexible", "Flexible", "Budget isn't the main constraint"],
                  ] as const
                ).map(([value, label, description]) => (
                  <OptionButton
                    key={value}
                    selected={answers.budget === value}
                    onClick={() => update("budget", value)}
                    title={label}
                    description={description}
                  />
                ))}
              </div>
            </fieldset>

            <fieldset>
              <legend className="text-sm font-semibold text-white">
                Industry <span className="font-normal text-zinc-400">(optional)</span>
              </legend>
              <input
                value={answers.industry}
                onChange={(event) => update("industry", event.target.value)}
                type="text"
                placeholder="e.g. Healthcare, e-commerce, education"
                aria-label="Industry"
                className="mt-3 min-h-12 w-full rounded-xl border border-white/15 bg-white/5 px-4 text-sm text-white outline-none placeholder:text-zinc-500 focus:border-accent focus:bg-white/[0.07] focus-visible:ring-2 focus-visible:ring-accent"
              />
              <p className="mt-2 text-xs text-zinc-400">
                We collect this, but no product in our dataset is tagged by industry yet — so it
                won&apos;t affect your results. We&apos;d rather tell you that than pretend it
                does.
              </p>
            </fieldset>
          </div>
        ) : null}

        {step === 3 ? (
          <div className="space-y-8">
            <fieldset>
              <legend className="text-sm font-semibold text-white">
                Tools you need it to work with{" "}
                <span className="font-normal text-zinc-400">(optional, comma-separated)</span>
              </legend>
              <input
                value={integrationsInput}
                onChange={(event) => setIntegrationsInput(event.target.value)}
                type="text"
                placeholder="e.g. Slack, Google Drive"
                aria-label="Tools you need it to work with"
                className="mt-3 min-h-12 w-full rounded-xl border border-white/15 bg-white/5 px-4 text-sm text-white outline-none placeholder:text-zinc-500 focus:border-accent focus:bg-white/[0.07] focus-visible:ring-2 focus-visible:ring-accent"
              />
            </fieldset>

            <fieldset>
              <legend className="flex items-center gap-2 text-sm font-semibold text-white">
                <SlidersHorizontal className="h-4 w-4" /> Simple or powerful?
              </legend>
              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
                {(
                  [
                    ["simple", "Keep it simple", "Easy to learn, minimal setup"],
                    ["powerful", "Give me power", "Advanced, full-featured"],
                    ["no-preference", "No preference", ""],
                  ] as const
                ).map(([value, label, description]) => (
                  <OptionButton
                    key={value}
                    selected={answers.difficultyPreference === value}
                    onClick={() => update("difficultyPreference", value)}
                    title={label}
                    description={description || undefined}
                  />
                ))}
              </div>
            </fieldset>

            <ToggleCard
              selected={answers.needsAi}
              onClick={() => update("needsAi", !answers.needsAi)}
              icon={Bot}
              title="AI features"
              description="AI-assisted workflows matter to me"
            />

            {answers.primaryNeed === "time_tracking" ? (
              <fieldset>
                <legend className="flex items-center gap-2 text-sm font-semibold text-white">
                  <ShieldQuestion className="h-4 w-4" /> Employee monitoring
                </legend>
                <p className="mt-1 text-xs text-zinc-400">
                  Some time trackers include screenshots or activity monitoring. Does that matter to you?
                </p>
                <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
                  {(
                    [
                      ["prefer-lightweight", "Keep it lightweight", "No screenshots or activity monitoring"],
                      ["comfortable", "Monitoring is fine", "I need visibility into team activity"],
                      ["no-preference", "No preference", ""],
                    ] as const
                  ).map(([value, label, description]) => (
                    <OptionButton
                      key={value}
                      selected={answers.monitoringSensitivity === value}
                      onClick={() => update("monitoringSensitivity", value)}
                      title={label}
                      description={description || undefined}
                    />
                  ))}
                </div>
              </fieldset>
            ) : null}
          </div>
        ) : null}
      </div>

      {step === 0 && answers.primaryNeed === null ? (
        <p className="mt-4 flex items-center gap-2 text-xs text-zinc-400">
          <Compass className="h-3.5 w-3.5 shrink-0" /> Pick a need above, or continue with &quot;Not sure yet.&quot;
        </p>
      ) : null}

      <div className="mt-8 flex items-center justify-between border-t border-white/10 pt-6">
        <Button
          type="button"
          variant="ghost"
          onClick={() => setStep((current) => Math.max(0, current - 1))}
          disabled={step === 0}
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>

        {isLastStep ? (
          <Button type="button" onClick={handleSubmit}>
            Get my recommendations
            <ArrowRight className="h-4 w-4" />
          </Button>
        ) : (
          <Button type="button" onClick={() => setStep((current) => Math.min(STEPS.length - 1, current + 1))}>
            Next
            <ArrowRight className="h-4 w-4" />
          </Button>
        )}
      </div>
    </Card>
  );
}
