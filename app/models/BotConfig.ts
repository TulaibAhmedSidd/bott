import mongoose from "mongoose";

const BotConfigSchema = new mongoose.Schema({
  symbol: { type: String, required: true },
  tradeUSDT: { type: Number, required: true },
  dailyTarget: { type: Number, required: true },
  stopLoss: { type: Number, required: true },
  active: { type: Boolean, default: false },
  tradingMode: { type: String, enum: ['TESTNET', 'LIVE'], default: 'TESTNET' },
  strategy: { type: String, enum: ['RSI', 'MACD', 'BOLLINGER'], default: 'RSI' }
});

export default mongoose.models.BotConfig ||
  mongoose.model("BotConfig", BotConfigSchema);
