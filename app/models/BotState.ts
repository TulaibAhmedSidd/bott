import mongoose from "mongoose";

const BotStateSchema = new mongoose.Schema({
    symbol: String,

    status: {
        type: String,
        enum: ["IDLE", "BUYING", "HOLDING", "SELLING", "STOPPED"],
        default: "IDLE",
    },
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
