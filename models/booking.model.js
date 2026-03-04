import mongoose from "mongoose";
const { Schema } = mongoose;

const roomIds = ["R1", "R2", "R3", "R4", "R5", "R6", "R7", "R8"];

const bookingRoomSchema = new Schema({
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

const BookingSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    guest: {
      name: {
        type: String,
        required: true,
      },
      email: {
        type: String,
        required: true,
      },
      phone: {
        type: String,
        required: true,
      },
    },

    rooms: [bookingRoomSchema],

    totalAmount: {
      type: Number,
      required: true,
    },
    amountPaid: {
      type: Number,
      required: true,
    },

    // Razorpay payment fields
    razorpayOrderId: String,
    razorpayPaymentId: String,
    razorpaySignature: String,

    status: {
      type: String,
      enum: ["pending", "confirmed", "cancelled", "blocked"],
      default: "pending",
    },
  },
  { timestamps: true },
);

export const Booking = mongoose.model("Booking", BookingSchema);
