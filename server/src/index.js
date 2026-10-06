import dns from "node:dns";
dns.setServers(["8.8.8.8", "1.1.1.1"]); // Force Node to use Google/Cloudflare DNS

import "dotenv/config";
import http from "http";
import { Server } from "socket.io";
import { app } from "./app.js";
import connectDB from "./db/index.js";
import { initSocket } from "./sockets/index.js";
import { setIO } from "./utils/socketIO.js";
import { startSlotRollupJob } from "./jobs/slotRollup.job.js";
import { startBanExpiryJob } from "./jobs/banExpiry.job.js";

const PORT = process.env.PORT || 3000;
const httpServer = http.createServer(app);

const allowedOrigins = [
  process.env.FRONTEND_URL ? process.env.FRONTEND_URL.replace(/\/$/, "") : null,
  "https://amrin-anonymous-chat.vercel.app",
  "http://localhost:5173",
  "http://localhost:3000",
].filter(Boolean);

const io = new Server(httpServer, {
  cors: {
    origin: allowedOrigins,
    credentials: true,
  },
});
setIO(io);
initSocket(io);

// Connect to the database first, then start the server
connectDB()
  .then(() => {
    httpServer.listen(PORT, () => {
      console.log(`Server is running at http://localhost:${PORT}`);
    });
    startSlotRollupJob();
    startBanExpiryJob()
  })
  .catch((err) => {
    console.log("MongoDB connection failed !!! ", err);
  });