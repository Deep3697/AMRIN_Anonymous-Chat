import { GoogleGenerativeAI } from "@google/generative-ai";
import { Message } from "../models/message.model.js";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

function cosineSimilarity(a, b) {
  const dot = a.reduce((sum, val, i) => sum + val * b[i], 0);
  const magA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
  const magB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
  return dot / (magA * magB);
}

export async function getEmbedding(text) {
  const model = genAI.getGenerativeModel({ model: "gemini-embedding-001" });
  const result = await model.embedContent(text);
  return result.embedding.values;
}

export async function isDuplicate(threadId, embedding, threshold = 0.87) {
  const recentMessages = await Message.find({
    threadId,
    embedding: { $exists: true, $ne: [] },
    createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
  })
    .select("embedding")
    .sort({ createdAt: -1 })
    .limit(200); // bounds the comparison cost regardless of how large the group's history grows

  return recentMessages.some((m) => cosineSimilarity(embedding, m.embedding) >= threshold);
}