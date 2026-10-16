import PopupOffer from "../models/PopupOffer.js";
import { cloudinary } from "../middleware/upload.js";

const getCloudinaryPublicId = (url = "") => {
  if (!url) return null;
  try {
    const file = url.split("/").pop().split(".")[0];
    return `apple-it-zone/popup-offers/${file}`;
  } catch {
    return null;
  }
};

const toResponse = (popupOffer) => ({
  _id: popupOffer?._id || null,
  image: popupOffer?.image || "",
  enabled: popupOffer?.enabled ?? false,
  delaySeconds: popupOffer?.delaySeconds ?? 30,
  maxShowsPerDay: popupOffer?.maxShowsPerDay ?? 1,
  createdAt: popupOffer?.createdAt || null,
  updatedAt: popupOffer?.updatedAt || null,
});

export const getPopupOffer = async (req, res) => {
  try {
    const popupOffer = await PopupOffer.findOne().sort({ createdAt: 1 });
    res.json({ success: true, popupOffer: toResponse(popupOffer) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updatePopupOffer = async (req, res) => {
  try {
    const popupOffer = await PopupOffer.findOne().sort({ createdAt: 1 });
    const updates = {
      enabled: req.body.enabled === "true" || req.body.enabled === true,
      updatedBy: req.user?._id || null,
    };

    const delaySeconds = Number(req.body.delaySeconds);
    const maxShowsPerDay = Number(req.body.maxShowsPerDay);
    if (!Number.isInteger(delaySeconds) || delaySeconds < 30 || delaySeconds > 300) {
      return res.status(400).json({
        success: false,
        message: "Popup delay must be between 30 seconds and 5 minutes",
      });
    }
    if (!Number.isInteger(maxShowsPerDay) || maxShowsPerDay < 1 || maxShowsPerDay > 3) {
      return res.status(400).json({
        success: false,
        message: "Popup frequency must be between 1 and 3 times per day",
      });
    }
    updates.delaySeconds = delaySeconds;
    updates.maxShowsPerDay = maxShowsPerDay;

    if (req.file) {
      const oldId = getCloudinaryPublicId(popupOffer?.image);
      if (oldId) {
        try {
          await cloudinary.uploader.destroy(oldId);
        } catch {
          // Keep the database update working if cleanup is unavailable.
        }
      }
      updates.image = req.file.path;
    } else if (req.body.removeImage === "true") {
      const oldId = getCloudinaryPublicId(popupOffer?.image);
      if (oldId) {
        try {
          await cloudinary.uploader.destroy(oldId);
        } catch {
          // Keep the database update working if cleanup is unavailable.
        }
      }
      updates.image = "";
      updates.enabled = false;
    }

    const saved = await PopupOffer.findOneAndUpdate(
      {},
      { $set: updates },
      {
        new: true,
        upsert: true,
        setDefaultsOnInsert: true,
        runValidators: true,
      },
    );

    res.json({ success: true, popupOffer: toResponse(saved) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
