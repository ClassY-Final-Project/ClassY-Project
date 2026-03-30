import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createProxyMiddleware } from "http-proxy-middleware";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 4600;

app.use(
  "/proxy/web",
  createProxyMiddleware({
    target: "http://localhost:3000",
    changeOrigin: true,
    pathRewrite: { "^/proxy/web": "" },
    logLevel: "warn",
  }),
);

app.use(
  "/proxy/ai",
  createProxyMiddleware({
    target: "http://localhost:8000",
    changeOrigin: true,
    pathRewrite: { "^/proxy/ai": "" },
    logLevel: "warn",
  }),
);

app.use(express.static(path.join(__dirname, "public")));

app.get("/health", (_req, res) => {
  res.json({ status: "ok", app: "tester-ui" });
});

app.listen(PORT, () => {
  console.log(`Tester UI running on http://localhost:${PORT}`);
});
