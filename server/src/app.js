import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

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

// We export the app to be imported in index.js
export { app };
