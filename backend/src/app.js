import compression from "compression";
import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import morgan from "morgan";
// Import route files (with .js extension)
import { healthCheck } from "./config/database.js";
import { getRedis } from "./config/redis.js";
import analyticsRoutes from "./routes/analyticsRoutes.js";
import auditRoutes from "./routes/auditRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import cartRoutes from "./routes/cartRoutes.js";
import categoryRoutes from "./routes/categoryRoutes.js";
import customerRoutes from "./routes/customerRoutes.js";
import dashboardRoutes from "./routes/dashboardRoutes.js";
import holidayRoutes from "./routes/holidayRoutes.js";
import homeContentRoutes from "./routes/homeContentRoutes.js";
import homeSliderTextRoutes from "./routes/homeSliderTextRoutes.js";
import invoiceRoutes from "./routes/invoiceRoutes.js";
import maintenanceRoutes from "./routes/maintenanceRoutes.js";
import metaRoutes from "./routes/metaRoutes.js";
import notificationRoutes from "./routes/notificationRoutes.js";
import offerRoutes from "./routes/offerRoutes.js";
import orderRoutes from "./routes/orderRoutes.js";
import paymentRoutes from "./routes/paymentRoutes.js";
import paymentSettingsRoutes from "./routes/paymentSettingsRoutes.js";
import pcBuilderRoutes from "./routes/pcBuilderRoutes.js";
import popupOfferRoutes from "./routes/popupOfferRoutes.js";
import productRoutes from "./routes/productRoutes.js";
import promoRoutes from "./routes/promoRoutes.js";
import questionRoutes from "./routes/questionRoutes.js";
import reviewRoutes from "./routes/reviewRoutes.js";
import setupRoutes from "./routes/setupRoutes.js";
import sliderRoutes from "./routes/sliderRoutes.js";
import smsRoutes from "./routes/smsRoutes.js";
import storeRoutes from "./routes/storeRoutes.js";
import teamRoutes from "./routes/teamRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import visitorRoutes from "./routes/visitorRoutes.js";

// Set DNS servers to avoid DNS resolution issues
import { setServers } from "node:dns/promises";
setServers(["8.8.8.8", "1.1.1.1", "9.9.9.9"]);

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();

// ------- Trust proxy (correct req.ip behind Nginx/Cloudflare/load balancer) -------
// Without this, every visitor shares the proxy's IP -> rate limiters would lock
// everyone out together and session logs would record the wrong IP.
// TRUST_PROXY accepts:
//   'false'            -> app is exposed directly (no proxy)
//   '1' | number       -> number of trusted proxy hops (Nginx on same host = 1)
//   'true'             -> trust all hops (only ok if the proxy overwrites XFF)
//   'ip1,ip2'          -> explicit proxy IPs/CIDRs (e.g. your load balancer)
// Default when unset: 1 (the typical single-Nginx setup).
const trustProxyEnv = process.env.TRUST_PROXY;
let trustProxySetting;
if (trustProxyEnv === undefined || trustProxyEnv === "") {
  trustProxySetting = 1;
} else if (trustProxyEnv === "true") {
  trustProxySetting = true;
} else if (trustProxyEnv === "false") {
  trustProxySetting = false;
} else if (!Number.isNaN(Number(trustProxyEnv))) {
  trustProxySetting = Number(trustProxyEnv);
} else {
  trustProxySetting = trustProxyEnv.split(",").map((s) => s.trim());
}
app.set("trust proxy", trustProxySetting);

// Disable ETag so cached API responses don't come back as 304 (breaks axios validateStatus)
app.set("etag", false);

// ------- Middlewares -------

// 1. Security headers
app.use(helmet());

// 2. CORS (allow frontend and mobile apps)
const allowedOrigins = new Set([
  "http://localhost:3000",
  "https://mearn-apple-it-zone.vercel.app",
  process.env.FRONTEND_URL?.trim(),
  ...(process.env.CORS_ORIGINS || "").split(",").map((origin) => origin.trim()).filter(Boolean),
].filter(Boolean));
const corsOptions = {
  origin: (origin, callback) => {
    if (
      !origin ||
      allowedOrigins.has(origin) ||
      allowedOrigins.has("*")
    ) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200,
};
app.use(cors(corsOptions));

// Never cache API responses (auth data must stay fresh; avoids 304 breaking axios)
app.use("/api", (req, res, next) => {
  res.set("Cache-Control", "no-store");
  next();
});

// 3. Rate limiting (prevent brute force)
// General API limit: generous for a storefront (products, categories, cart, user, etc.)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // limit each IP to 1000 requests per windowMs
  message: "Too many requests from this IP, please try again later.",
});
app.use("/api", limiter);

// Stricter limiter for auth endpoints (brute-force protection)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // 50 login/register attempts per windowMs per IP
  message: "Too many login attempts from this IP, please try again later.",
});
app.use("/api/auth/login", authLimiter);
app.use("/api/auth/register", authLimiter);
app.use("/api/auth/forgot-password", authLimiter);
app.use("/api/auth/verify-otp", authLimiter);
// Very tight limit for the one-time initial setup endpoint. It only works
// while no super admin exists, but lock it down anyway so it can't be probed.
const setupLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 setup attempts per windowMs per IP
  message: "Too many setup attempts from this IP, please try again later.",
});
app.use("/api/setup", setupLimiter);

// 4. Logging (dev format)
if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
} else {
  app.use(morgan("combined"));
}

// 5. Compression (gzip)
app.use(compression());

// 6. Parse JSON and URL-encoded bodies
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// ------- Routes -------
app.use("/api/auth", authRoutes);
app.use("/api/setup", setupRoutes);
app.use("/api/products", productRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/invoices", invoiceRoutes);

app.use("/api/categories", categoryRoutes);
app.use("/api/users", userRoutes);
app.use("/api/customers", customerRoutes);
app.use("/api/team", teamRoutes);
app.use("/api/store", storeRoutes);

app.use("/api/reviews", reviewRoutes);
app.use("/api/questions", questionRoutes);
app.use("/api/promo", promoRoutes);
app.use("/api/sliders", sliderRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/audit", auditRoutes);
app.use("/api/payment-settings", paymentSettingsRoutes);
app.use("/api/payment", paymentRoutes);
app.use("/api/sms", smsRoutes);
app.use("/api/maintenance", maintenanceRoutes);
app.use("/api/meta", metaRoutes);
app.use("/api/visitors", visitorRoutes);
app.use("/api/offers", offerRoutes);
app.use("/api/popup-offer", popupOfferRoutes);
app.use("/api/holiday", holidayRoutes);
app.use("/api/home-slider-texts", homeSliderTextRoutes);
app.use("/api/home-content", homeContentRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/pc-builder", pcBuilderRoutes);

// Health check endpoint
app.get("/", (req, res) => {
  res
    .status(200)
    .json({ status: "OK", message: "Apple IT Zone backend is running" });
});

app.get("/api/health", async (req, res) => {
  const database = await healthCheck();
  const redisEnabled = process.env.REDIS_ENABLED !== "false";
  const redisReady = Boolean(getRedis());
  const services = {
    api: { status: "healthy", message: "API is responding" },
    database: {
      status: database.readyState === 1 ? "healthy" : "unhealthy",
      message: database.status,
      host: database.host,
      name: database.name,
    },
    redis: {
      status: !redisEnabled ? "disabled" : redisReady ? "healthy" : "unhealthy",
      message: !redisEnabled
        ? "Redis is disabled"
        : redisReady
          ? "Redis is connected"
          : "Redis is not ready",
    },
  };
  const overall = Object.values(services).some(
    (service) => service.status === "unhealthy",
  )
    ? "unhealthy"
    : "healthy";

  res.status(overall === "healthy" ? 200 : 503).json({
    success: overall === "healthy",
    status: overall,
    checkedAt: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
    memory: {
      usedMb: Math.round(process.memoryUsage().rss / 1024 / 1024),
      heapUsedMb: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
    },
    nodeVersion: process.version,
    services,
  });
});

// ------- Error Handling Middleware -------
app.use((err, req, res, _next) => {
  console.error("❌ Error:", err.stack);

  // Mongoose validation errors
  if (err.name === "ValidationError") {
    return res.status(400).json({
      success: false,
      message: "Validation error",
      errors: err.errors,
    });
  }

  // Duplicate key error (MongoDB)
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern)[0];
    return res.status(400).json({
      success: false,
      message: `Duplicate value for field: ${field}`,
    });
  }

  // JWT errors
  if (err.name === "JsonWebTokenError") {
    return res.status(401).json({ success: false, message: "Invalid token" });
  }

  // Default to 500
  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Internal Server Error",
  });
});

// Catch 404 and forward to error handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: "Route not found" });
});

export default app;
