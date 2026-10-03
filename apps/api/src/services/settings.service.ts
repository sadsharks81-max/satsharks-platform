import { SettingModel } from "@satsharks/db";
import { DEFAULT_ROUTING_THRESHOLD_PERCENT, type AdaptiveSettings } from "@satsharks/types";

const ADAPTIVE_KEY = "adaptive";

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
};
