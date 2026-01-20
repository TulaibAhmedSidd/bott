import mongoose from "mongoose";

const TradeSchema = new mongoose.Schema({
  symbol: String,
  side: { type: String, enum: ["BUY", "SELL"] },
  price: Number,
  entryPrice: Number   ,
  quantity: Number,
  pnl: Number,
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.models.Trade ||
  mongoose.model("Trade", TradeSchema);
