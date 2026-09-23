import { supabaseFetch } from "../api/_auth.js";

const DEFAULT_MONTHLY_BUDGET_USD = 30;
const DEFAULT_MONTHLY_WARNING_USD = 20;
const DEFAULT_REQUEST_RESERVE_USD = 0.05;

function positiveNumber(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export function aiBudgetConfig() {
  const monthlyBudgetUsd = positiveNumber(process.env.OPENAI_MONTHLY_BUDGET_USD, DEFAULT_MONTHLY_BUDGET_USD);
  const warningUsd = Math.min(
    monthlyBudgetUsd,
    positiveNumber(process.env.OPENAI_MONTHLY_WARNING_USD, DEFAULT_MONTHLY_WARNING_USD)
  );
  return {
    monthlyBudgetUsd,
    warningUsd,
    requestReserveUsd: Math.min(
      monthlyBudgetUsd,
      positiveNumber(process.env.OPENAI_MAX_COST_PER_REQUEST_USD, DEFAULT_REQUEST_RESERVE_USD)
    )
  };
}

function currentMonthStart() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
}

export async function monthlyAiSpend() {
  const from = encodeURIComponent(currentMonthStart());
  const result = await supabaseFetch(`/ai_task_audit_logs?select=metadata,created_at&created_at=gte.${from}&order=created_at.desc&limit=10000`);
  if (!result.ok) return 0;
  const rows = await result.json().catch(() => []);
  return rows.reduce((total, row) => {
    const cost = Number(row?.metadata?.estimated_cost_usd);
    return total + (Number.isFinite(cost) && cost > 0 ? cost : 0);
  }, 0);
}

function rounded(value, digits = 4) {
  return Number(Number(value || 0).toFixed(digits));
}

export function aiBudgetSnapshot(spentUsd) {
  const config = aiBudgetConfig();
  const spent = Math.max(0, Number(spentUsd) || 0);
  return {
    currency: "USD",
    spent_usd: rounded(spent),
    warning_usd: rounded(config.warningUsd, 2),
    budget_usd: rounded(config.monthlyBudgetUsd, 2),
    remaining_usd: rounded(Math.max(0, config.monthlyBudgetUsd - spent)),
    warning: spent >= config.warningUsd,
    blocked: spent + config.requestReserveUsd > config.monthlyBudgetUsd
  };
}

export async function ensureAiBudgetAvailable() {
  const spent = await monthlyAiSpend();
  const budget = aiBudgetSnapshot(spent);
  return {
    allowed: !budget.blocked,
    budget,
    error: budget.blocked
      ? `Budget AI mensile raggiunto (${budget.budget_usd} USD). Il servizio ripartira automaticamente il prossimo mese.`
      : ""
  };
}

export function estimateOpenAiCost(model, usage = {}) {
  const normalizedModel = String(model || "").toLowerCase();
  const rates = normalizedModel.includes("gpt-6-luna")
    ? { input: 0.10, cached: 0.01, output: 0.50 }
    : { input: 2.00, cached: 0.50, output: 8.00 };
  const inputTokens = Math.max(0, Number(usage.input_tokens) || 0);
  const outputTokens = Math.max(0, Number(usage.output_tokens) || 0);
  const cachedTokens = Math.min(inputTokens, Math.max(0, Number(usage.input_tokens_details?.cached_tokens) || 0));
  const uncachedTokens = Math.max(0, inputTokens - cachedTokens);
  const estimatedCostUsd = (
    uncachedTokens * rates.input
    + cachedTokens * rates.cached
    + outputTokens * rates.output
  ) / 1_000_000;
  return {
    model: String(model || ""),
    input_tokens: inputTokens,
    cached_input_tokens: cachedTokens,
    output_tokens: outputTokens,
    estimated_cost_usd: rounded(estimatedCostUsd, 8)
  };
}
