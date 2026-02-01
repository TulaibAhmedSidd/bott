import mongoose from "mongoose";

const BotStateSchema = new mongoose.Schema({
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
});

export default mongoose.models.BotState ||
    mongoose.model("BotState", BotStateSchema);
