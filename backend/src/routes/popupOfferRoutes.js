import express from "express";
import { adminOnly, protect } from "../middleware/auth.js";
import { uploadPopupOfferImage } from "../middleware/upload.js";
import {
  getPopupOffer,
  updatePopupOffer,
} from "../controllers/popupOfferController.js";

const router = express.Router();

router.get("/", getPopupOffer);
router.put("/", protect, adminOnly, uploadPopupOfferImage, updatePopupOffer);

export default router;
