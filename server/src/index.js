import dns from "node:dns";
dns.setServers(["8.8.8.8", "1.1.1.1"]); // Force Node to use Google/Cloudflare DNS

import 'dotenv/config'; // Must be loaded before app.js so process.env is ready
import connectDB from "./db/index.js"; 
import { app } from "./app.js";

const port = process.env.PORT || 3000;

// Connect to the database first
connectDB()
  .then(() => {
    // Only start the server if the DB connection is successful
    app.listen(port, () => {
      console.log(`Server is running at http://localhost:${port}`);
    });
  })
  .catch((err) => {
    console.log("MongoDB connection failed !!! ", err);
  });