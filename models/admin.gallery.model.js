import mongoose from "mongoose";

const MAX_IMAGES = 6;

const gallerySchema = new mongoose.Schema(
  {
    allImages: {
      type: [String],
      validate: {
        validator: (v) => v.length <= MAX_IMAGES,
        message: `allImages cannot exceed ${MAX_IMAGES} images`,
      },
    },
    rooms: {
      type: [String],
      validate: {
        validator: (v) => v.length <= MAX_IMAGES,
        message: `rooms cannot exceed ${MAX_IMAGES} images`,
      },
    },
    exterior: {
      type: [String],
      validate: {
        validator: (v) => v.length <= MAX_IMAGES,
        message: `exterior cannot exceed ${MAX_IMAGES} images`,
      },
    },
    dining: {
      type: [String],
      validate: {
        validator: (v) => v.length <= MAX_IMAGES,
        message: `dining cannot exceed ${MAX_IMAGES} images`,
      },
    },
  },
  { timestamps: true }
);

export const Gallery = mongoose.model("Gallery", gallerySchema);
