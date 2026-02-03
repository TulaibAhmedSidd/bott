import mongoose, { Document, Schema } from "mongoose";

export interface IBotConfig extends mongoose.Document {
  symbol: string;
  tradeUSDT: number;
  dailyTarget: number;
  stopLoss: number;
  active: boolean;
  tradingMode: 'TESTNET' | 'LIVE';
  strategy: 'RSI' | 'MACD' | 'BOLLINGER' | 'DAILY_PCT';
  maxTrades?: number;
}

const BotConfigSchema = new mongoose.Schema<IBotConfig>({
  symbol: { type: String, required: true },
  tradeUSDT: { type: Number, required: true },
  dailyTarget: { type: Number, required: true },
  stopLoss: { type: Number, required: true },
  active: { type: Boolean, default: false },
  tradingMode: { type: String, enum: ['TESTNET', 'LIVE'], default: 'TESTNET' },
  strategy: { type: String, enum: ['RSI', 'MACD', 'BOLLINGER', 'DAILY_PCT'], default: 'RSI' },
  maxTrades: Number
});

export default (mongoose.models.BotConfig as mongoose.Model<IBotConfig>) ||
  mongoose.model<IBotConfig>("BotConfig", BotConfigSchema);
