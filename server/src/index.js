import dns from "node:dns";
dns.setServers(["8.8.8.8", "1.1.1.1"]); // Force Node to use Google/Cloudflare DNS
import express from "express";
import 'dotenv/config';
import cors from "cors";
import connectDB from "./db/index.js"; 

connectDB();
const app = express();
const port = process.env.PORT||3000;

app.use(cors({
  origin: [
    process.env.FRONTEND_URL           
  ],
  credentials: true  
}));
app.use(express.json());

app.get('/', (req, res) => {
  res.send('Server is running successfully!');
});

app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});