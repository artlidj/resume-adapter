import cors from "cors";
import express from "express";
import { adaptRouter } from "./routes/adapt.js";

const app = express();
const port = Number(process.env.PORT ?? 8787);
const webOrigin = process.env.WEB_ORIGIN ?? "http://localhost:5173";

app.use(cors({ origin: webOrigin }));
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use(adaptRouter);

app.listen(port, () => {
  console.log(`API listening on http://localhost:${port}`);
});
