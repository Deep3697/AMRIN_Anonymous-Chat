import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import authRoutes from "./routes/auth.routes.js";
import messageRoutes from "./routes/message.routes.js";
import batchRoutes from "./routes/batch.routes.js";
import groupRoutes from "./routes/group.routes.js";
import conversationRoutes from "./routes/conversation.routes.js";
import monitorRoutes from "./routes/monitor.routes.js";
import helpRoutes from "./routes/help.routes.js";
import reportRoutes from "./routes/report.routes.js";
import canteenRoutes from "./routes/canteen.routes.js";
import blockRoutes from "./routes/block.routes.js";
import banRoutes from "./routes/ban.routes.js";
import banAppealRoutes from "./routes/banAppeal.routes.js";
import muteRoutes from "./routes/mute.routes.js";
import adminStatsRoutes from "./routes/adminStats.routes.js";


const app = express();
app.set("trust proxy", 1);

const staticOrigins = [
  process.env.FRONTEND_URL ? process.env.FRONTEND_URL.replace(/\/+$/, "") : null,
  "https://amrin-anonymous-chat.vercel.app",
  "http://localhost:5173",
  "http://localhost:5174",
  "http://localhost:3000",
].filter(Boolean);

export const corsOriginChecker = (origin, callback) => {
  if (!origin) return callback(null, true);
  const clean = origin.replace(/\/+$/, "");
  if (
    staticOrigins.includes(clean) ||
    clean.endsWith(".vercel.app") ||
    /^https?:\/\/localhost(:\d+)?$/.test(clean)
  ) {
    return callback(null, true);
  }
  return callback(null, false);
};

app.use(cors({
  origin: corsOriginChecker,
  credentials: true
}));

// Middlewares to parse JSON bodies and cookies
app.use(express.json());
app.use(cookieParser());


// Base Route
app.get('/', (req, res) => {
  res.send('Server is running successfully!');
});

app.use("/api/auth", authRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/batches", batchRoutes);
app.use("/api/groups", groupRoutes);
app.use("/api/conversations", conversationRoutes);
app.use("/api/monitor", monitorRoutes);
app.use("/api/help", helpRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/canteen", canteenRoutes);
app.use("/api/block", blockRoutes);
app.use("/api/bans", banRoutes);
app.use("/api/ban-appeals", banAppealRoutes);
app.use("/api/mutes", muteRoutes);
app.use("/api/admin", adminStatsRoutes);

// We export the app to be imported in index.js
export { app };
