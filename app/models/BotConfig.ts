import mongoose from "mongoose";

const BotConfigSchema = new mongoose.Schema({
  symbol: { type: String, required: true },
  tradeUSDT: { type: Number, required: true },
  dailyTarget: { type: Number, required: true },
  stopLoss: { type: Number, required: true },
  active: { type: Boolean, default: false },
});

export default mongoose.models.BotConfig ||
  mongoose.model("BotConfig", BotConfigSchema);
