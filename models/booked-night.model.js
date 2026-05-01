import mongoose from "mongoose";

const { Schema } = mongoose;

const BookedNightSchema = new Schema(
  {
    bookingId: {
      type: Schema.Types.ObjectId,
      ref: "Booking",
      required: true,
      index: true,
    },
    roomId: {
      type: String,
      required: true,
      index: true,
    },
    date: {
      type: Date,
      required: true,
    },
  },
  { timestamps: true }
);

// Enforces one confirmed booking per room-night.
BookedNightSchema.index({ roomId: 1, date: 1 }, { unique: true });

export const BookedNight = mongoose.model("BookedNight", BookedNightSchema);
