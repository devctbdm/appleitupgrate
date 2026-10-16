import multer from "multer";
import { v2 as cloudinary } from "cloudinary";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import dotenv from "dotenv";

dotenv.config();

// ---- Configure Cloudinary ----
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// ---- Configure Multer Storage (Cloudinary) ----
const productStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "apple-it-zone/products",
    allowed_formats: ["jpg", "jpeg", "png", "gif", "webp"],
    transformation: [{ width: 800, height: 800, crop: "limit" }],
    public_id: (_req, _file) => {
      const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
      return `product-${uniqueSuffix}`;
    },
  },
});

const categoryStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "apple-it-zone/categories",
    allowed_formats: ["jpg", "jpeg", "png", "gif", "webp"],
    transformation: [{ width: 600, height: 600, crop: "limit" }],
    public_id: (_req, _file) => {
      const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
      return `category-${uniqueSuffix}`;
    },
  },
});

const sliderStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "apple-it-zone/sliders",
    allowed_formats: ["jpg", "jpeg", "png", "gif", "webp"],
    transformation: [{ width: 1600, height: 600, crop: "limit" }],
    public_id: (_req, _file) => {
      const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
      return `slider-${uniqueSuffix}`;
    },
  },
});

const offerStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "apple-it-zone/offers",
    allowed_formats: ["jpg", "jpeg", "png", "gif", "webp"],
    transformation: [{ width: 1000, height: 1000, crop: "limit" }],
    public_id: (_req, _file) => {
      const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
      return `offer-${uniqueSuffix}`;
    },
  },
});

const popupOfferStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "apple-it-zone/popup-offers",
    allowed_formats: ["jpg", "jpeg", "png", "gif", "webp"],
    transformation: [{ width: 900, height: 900, crop: "limit" }],
    public_id: (_req, _file) => {
      const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
      return `popup-offer-${uniqueSuffix}`;
    },
  },
});

// ---- Multer instances with file filter ----
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];

const fileFilter = (req, file, cb) => {
  if (ALLOWED_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Only JPG, PNG, GIF, and WebP images are allowed!"), false);
  }
};

const logoStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "apple-it-zone/logo",
    allowed_formats: ["jpg", "jpeg", "png", "gif", "webp"],
    transformation: [{ width: 600, height: 200, crop: "limit" }],
    public_id: (_req, _file) => {
      const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
      return `logo-${uniqueSuffix}`;
    },
  },
});

const physicalStoreStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "apple-it-zone/physical-stores",
    allowed_formats: ["jpg", "jpeg", "png", "gif", "webp"],
    transformation: [{ width: 2000, height: 800, crop: "limit" }],
    public_id: (_req, _file) => {
      const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
      return `physical-store-banner-${uniqueSuffix}`;
    },
  },
});

const productUpload = multer({
  storage: productStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter,
});

const categoryUpload = multer({
  storage: categoryStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter,
});

const sliderUpload = multer({
  storage: sliderStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter,
});

const offerUpload = multer({
  storage: offerStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter,
});

const popupOfferUpload = multer({
  storage: popupOfferStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter,
});

const physicalStoreUpload = multer({
  storage: physicalStoreStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter,
});

const logoUpload = multer({
  storage: logoStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter,
});

// ---- Middleware exports ----
export const uploadSingle = productUpload.single("image");
export const uploadMultiple = productUpload.array("images", 10);
export const uploadCategoryFields = categoryUpload.fields([
  { name: "image", maxCount: 1 },
  { name: "banner", maxCount: 1 },
]);
export const uploadSliderImage = sliderUpload.single("image");
export const uploadOfferImage = offerUpload.single("image");
export const uploadPopupOfferImage = popupOfferUpload.single("image");
export const uploadPhysicalStoreBanner = physicalStoreUpload.single("image");
export const uploadStoreLogo = logoUpload.single("image");
export { cloudinary };
