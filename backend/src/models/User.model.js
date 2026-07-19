import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  FullName: {
    type: String,
    required: true
  },
  Email: {
    type: String,
    required: true
  },
  Password: {
    type: String,
    required: true
  },
},{
  timestamps: true,
});