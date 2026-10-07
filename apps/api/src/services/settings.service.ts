import { SettingModel } from "@satsharks/db";
import { DEFAULT_PRICING, DEFAULT_ROUTING_THRESHOLD_PERCENT, type AdaptiveSettings, type ConversionTables, type PricingContent } from "@satsharks/types";
import { conversionTablesSchema, pricingContentSchema } from "@satsharks/validation";
import { emptyConversionTables } from "./scoring";

const ADAPTIVE_KEY = "adaptive";
const SCORING_KEY = "scoring.conversionTables";
const PRICING_KEY = "pricing";

// Scores are read for every attempt in a list, so the tables are kept in memory briefly. Saving
// clears the copy at once on this instance.
const TABLES_TTL_MS = 30_000;
let tablesCache: { value: ConversionTables; expires: number } | null = null;

export const settingsService = {
  async getAdaptive(): Promise<AdaptiveSettings> {
    const stored = await SettingModel.findOne({ key: ADAPTIVE_KEY }).lean();
    const value = (stored?.value ?? {}) as Partial<AdaptiveSettings>;
    return {
      routingThresholdPercent:
        typeof value.routingThresholdPercent === "number" ? value.routingThresholdPercent : DEFAULT_ROUTING_THRESHOLD_PERCENT,
    };
  },

  // Applies to mocks whose Module 1 is submitted after the change; finished routing is never redone.
  async setAdaptive(settings: AdaptiveSettings, userId: string): Promise<AdaptiveSettings> {
    await SettingModel.updateOne({ key: ADAPTIVE_KEY }, { $set: { value: settings, updatedBy: userId } }, { upsert: true });
    return this.getAdaptive();
  },

  async getConversionTables(): Promise<ConversionTables> {
    if (tablesCache && tablesCache.expires > Date.now()) return tablesCache.value;
    const stored = await SettingModel.findOne({ key: SCORING_KEY }).lean();
    // A stored value that no longer validates (e.g. the format changed) is treated as missing.
    const parsed = conversionTablesSchema.safeParse(stored?.value);
    const value = parsed.success ? parsed.data : emptyConversionTables();
    tablesCache = { value, expires: Date.now() + TABLES_TTL_MS };
    return value;
  },

  // Finished attempts keep the score they were given; attempts finished before any table existed
  // are scored the next time they are read.
  async setConversionTables(tables: ConversionTables, userId: string): Promise<ConversionTables> {
    await SettingModel.updateOne({ key: SCORING_KEY }, { $set: { value: tables, updatedBy: userId } }, { upsert: true });
    tablesCache = null;
    return this.getConversionTables();
  },

  // Shown on the public pricing page. Until an admin saves their own, the proposal's plans.
  async getPricing(): Promise<PricingContent> {
    const stored = await SettingModel.findOne({ key: PRICING_KEY }).lean();
    const parsed = pricingContentSchema.safeParse(stored?.value);
    return parsed.success ? (parsed.data as PricingContent) : DEFAULT_PRICING;
  },

  async setPricing(pricing: PricingContent, userId: string): Promise<PricingContent> {
    await SettingModel.updateOne({ key: PRICING_KEY }, { $set: { value: pricing, updatedBy: userId } }, { upsert: true });
    return this.getPricing();
  },
};
