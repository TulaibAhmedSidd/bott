import mongoose, { Document, Schema } from "mongoose";

export interface IBotConfig extends mongoose.Document {
  symbol: string;
  tradeUSDT: number;
  dailyTarget: number;
  stopLoss: number;
  active: boolean;
  tradingMode: 'TESTNET' | 'LIVE';
  strategy: string;
  maxTrades?: number;
}

const BotConfigSchema = new mongoose.Schema<IBotConfig>({
  symbol: { type: String, default: "BNB/USDT" },
  tradeUSDT: { type: Number, default: 10 },
  dailyTarget: { type: Number, default: 1 },
  stopLoss: { type: Number, default: 0.5 },
  active: { type: Boolean, default: false },
  tradingMode: { type: String, enum: ['TESTNET', 'LIVE'], default: 'TESTNET' },
  strategy: { type: String, default: 'BOLLINGER_RSI_EMA' },
  maxTrades: Number
});

export default (mongoose.models.BotConfig as mongoose.Model<IBotConfig>) ||
  mongoose.model<IBotConfig>("BotConfig", BotConfigSchema);
