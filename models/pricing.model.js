import mongoose from "mongoose";
const { Schema } = mongoose;
const roomIds = ["R1", "R2", "R3", "R4", "R5", "R6", "R7", "R8"];

const basePriceSchema = new Schema({
  roomId: {
    type: String,
    enum: roomIds,
    required: true,
    unique: true,
  },

  pricePerNight: {
    type: Number,
    required: true,
  },
});

const variablePriceSchema = new Schema({
  roomId: {
    type: String,
    enum: roomIds,
    required: true,
  },

  pricePerNight: {
    type: Number,
    required: true,
  },

  reason: {
    type: String,
    required: true,
  },

  from: {
    type: Date,
    required: true,
  },

  to: {
    type: Date,
    required: true,
  },
});

variablePriceSchema.index({ roomId: 1, from: 1, to: 1 });

export const BasePrice = mongoose.model("BasePrice", basePriceSchema);
export const VariablePrice = mongoose.model(
  "VariablePrice",
  variablePriceSchema,
);
