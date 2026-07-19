import mongoose from "mongoose";

export const connectDB= async ()=>{
  try{
    const cont= await mongoose.connect(process.env.MONGO_URI);
    console.log(`MongoDB connected: ${cont.connection.host}`);
  } catch (error) {
    console.error("Error connecting to MongoDB:", error);
    process.exit(1);
  }
}