import mongoose, { Document, Schema } from "mongoose";

export interface IBotState extends mongoose.Document {
    symbol?: string;
    status: 'IDLE' | 'BUYING' | 'HOLDING' | 'SELLING' | 'STOPPED';
    indicatorValue?: string;
    isRunning?: boolean;
    entryPrice?: number;
    exitPrice?: number;
    quantity?: number;
    realizedPnL: number;
    dailyPnL: number;
    lastPrice?: number;
    updatedAt: Date;
    stopLossPct?: number;
    targetPct?: number;
    tradeUSDT?: number;
    lastReset?: string;
    strategy: string;
    maxTrades?: number;
    tradeCount: number;
}

const BotStateSchema = new mongoose.Schema<IBotState>({
    symbol: String,

    status: {
        type: String,
        enum: ["IDLE", "BUYING", "HOLDING", "SELLING", "STOPPED"],
        default: "IDLE",
    },
    indicatorValue: String, // e.g. "RSI=45.2" or "MACD=..."
    isRunning: Boolean,
    entryPrice: Number,
    exitPrice: Number,
    quantity: Number,
    realizedPnL: { type: Number, default: 0 },
    dailyPnL: { type: Number, default: 0 },
    lastPrice: Number,
    updatedAt: { type: Date, default: Date.now },
    stopLossPct: Number,
    targetPct: Number,
    tradeUSDT: Number,
    lastReset: String,
    strategy: { type: String, default: 'RSI' },
    maxTrades: Number,
    tradeCount: { type: Number, default: 0 }
});

export default (mongoose.models.BotState as mongoose.Model<IBotState>) ||
    mongoose.model<IBotState>("BotState", BotStateSchema);
