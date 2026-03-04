import mongoose from "mongoose";
const { Schema } = mongoose;

const roomIds = ["R1", "R2", "R3", "R4", "R5", "R6", "R7", "R8"];

const roomInfoSchema = new Schema({
  roomId: {
    type: String,
    enum: roomIds,
    required: true,
  },
  price: {
    type: Number,
    required: true,
  },
  adults: {
    type: Number,
    required: true,
  },
  kids: {
    type: Number,
    required: true,
  },
  checkIn: {
    type: Date,
    required: true,
  },
  checkOut: {
    type: Date,
    required: true,
  },
});

const RoomInfo = mongoose.model("RoomInfo", roomInfoSchema);

const cartSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    roomInfo: [
      {
        type: Schema.Types.ObjectId,
        ref: "RoomInfo",
      },
    ],
  },
  { timestamps: true },
);

export const Cart = mongoose.model("Cart", cartSchema);
export { RoomInfo };
