import * as chrono from "chrono-node";

export function extractDeadline(text) {
  const results = chrono.parse(text);
  return results.length > 0 ? results[0].start.date() : null;
}