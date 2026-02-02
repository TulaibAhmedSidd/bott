import mongoose from "mongoose";

const TradeSchema = new mongoose.Schema({
  symbol: String,
  side: { type: String, enum: ["BUY", "SELL", "START", "STOP"] },
  strategy: String,
  price: Number,
  entryPrice: Number,
  quantity: Number,
  pnl: Number,
  reason: String, // TARGET, STOP_LOSS, MANUAL
  balanceBefore: Number,
  balanceAfter: Number,
  createdAt: { type: Date, default: Date.now },
  endedAt: Date,
});

export default mongoose.models.Trade ||
  mongoose.model("Trade", TradeSchema);
