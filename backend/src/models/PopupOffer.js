import mongoose from "mongoose";

const popupOfferSchema = new mongoose.Schema(
  {
    image: { type: String, default: "" },
    enabled: { type: Boolean, default: false },
    delaySeconds: { type: Number, default: 30, min: 30, max: 300 },
    maxShowsPerDay: { type: Number, default: 1, min: 1, max: 3 },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { timestamps: true },
);

export default mongoose.models.PopupOffer ||
  mongoose.model("PopupOffer", popupOfferSchema);
