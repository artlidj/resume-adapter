import cors from "cors";
import express from "express";
import helmet from "helmet";
import { rateLimit } from "express-rate-limit";
import { adaptRouter } from "./routes/adapt.js";
import { fetchContentRouter } from "./routes/fetch-content.js";

const app = express();
const port = Number(process.env.PORT ?? 8787);
const webOrigin = process.env.WEB_ORIGIN ?? "http://localhost:5173";

app.use(helmet());
app.use(cors({ origin: webOrigin }));
app.use(express.json());

const adaptLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: "Too many requests, please try again later." },
  standardHeaders: true,
  legacyHeaders: false
});

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/adapt", adaptLimiter);
app.use(adaptRouter);
app.use(fetchContentRouter);

app.listen(port, () => {
  console.log(`API listening on http://localhost:${port}`);
});
