
import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGO_URI;

let cached = global.mongoose;

if (!MONGODB_URI) {
  console.error('Please define the MONGODB_URI environment variable in .env.local');
}

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

async function connectDB() {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    mongoose.set("strictPopulate", false); // Add this line here

    cached.promise = mongoose
      .connect(MONGODB_URI, {
        // useNewUrlParser: true,
        // useUnifiedTopology: true,
      })
      .then((mongoose) => mongoose);
  }

  cached.conn = await cached.promise;
  return cached.conn;
}

export default connectDB;