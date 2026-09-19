import express from "express";
import 'dotenv/config';
import cors from "cors";

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