import { getDatabase } from "./mongodb.mjs";
import { randomUUID } from "crypto";

/**
 * Adds a log entry to the system_logs collection.
 * @param {string} actor - The person/role performing the action (e.g. "Admin", "Driver Bilis 01")
 * @param {string} action - Short description of the action (e.g. "Mulai Tracking", "Login")
 * @param {string} type - "INFO", "WARNING", "ERROR", "SUCCESS"
 */
export async function addLog(actor, action, type = "INFO") {
  try {
    const db = await getDatabase();
    const logsCol = db.collection("system_logs");
    
    await logsCol.insertOne({
      id: randomUUID(),
      timestamp: new Date(),
      actor,
      action,
      type
    });
  } catch (err) {
    console.error("Gagal menyimpan log:", err);
  }
}

/**
 * Fetches the latest logs.
 * @param {number} limit - Number of logs to retrieve
 */
export async function getRecentLogs(limit = 50) {
  try {
    const db = await getDatabase();
    const logsCol = db.collection("system_logs");
    
    const logs = await logsCol.find({})
      .sort({ timestamp: -1 })
      .limit(limit)
      .toArray();
      
    return logs.map(l => ({
      id: l.id,
      timestamp: l.timestamp.toISOString(),
      actor: l.actor,
      action: l.action,
      type: l.type
    }));
  } catch (err) {
    console.error("Gagal mengambil log:", err);
    return [];
  }
}
