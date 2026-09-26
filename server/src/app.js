import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import authRoutes from "./routes/auth.routes.js";
import messageRoutes from "./routes/message.routes.js";
import batchRoutes from "./routes/batch.routes.js";
import groupRoutes from "./routes/group.routes.js";
import conversationRoutes from "./routes/conversation.routes.js";
import monitorRoutes from "./routes/monitor.routes.js";


const app = express();

app.use(cors({
  origin: [
    process.env.FRONTEND_URL           
  ],
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

// We export the app to be imported in index.js
export { app };
