import mongoose from "mongoose";

export const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(`MongoDB Connected: ${conn.connection.host}`);

    // Automatically clean up stale Email_1 index if it exists in the database
    try {
      await mongoose.connection.collection("users").dropIndex("Email_1");
      console.log("Dropped stale Email_1 index from users collection");
    } catch (e) {
      // Index does not exist or was already removed
    }
  } catch (error) {
    console.log("Error in connecting to MongoDB", error);
    process.exit(1); // 1 means failure
  }
};
