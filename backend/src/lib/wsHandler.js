import WebSocket from "ws";

const WebSocketServer = WebSocket.Server || WebSocket.WebSocketServer;
import { generateGroqChat } from "../services/groqService.js";

/**
 * Live WebSocket Handler for Speech-to-Speech & Real-time AI Assistant
 */
export function setupWebSocketServer(server) {
  const wss = new WebSocketServer({ server, path: "/ws/live-tutor" });

  wss.on("connection", (ws) => {
    console.log("[WebSocket] Client connected to Live AI Tutor stream.");

    // Send initial status
    ws.send(
      JSON.stringify({
        type: "key_status",
        data: { engine: "Groq (Llama 3.3)" },
      })
    );

    ws.on("message", async (rawMessage) => {
      try {
        const payload = JSON.parse(rawMessage.toString());
        const { type, data } = payload;

        if (type === "ping") {
          ws.send(JSON.stringify({ type: "pong" }));
          return;
        }

        if (type === "chat_turn" || type === "audio_turn") {
          const { message, mode, targetLanguage, level, scenario, history } = data;

          ws.send(JSON.stringify({ type: "thinking", message: "Aura is processing..." }));

          const responseData = await generateGroqChat({
            message,
            mode,
            targetLanguage,
            level,
            scenario,
            history,
          });

          ws.send(
            JSON.stringify({
              type: "ai_response",
              data: responseData,
            })
          );
        }
      } catch (err) {
        console.error("[WebSocket] Error processing message:", err);
        ws.send(
          JSON.stringify({
            type: "error",
            message: err.message || "Failed to process WebSocket turn",
          })
        );
      }
    });

    ws.on("close", () => {
      console.log("[WebSocket] Client disconnected.");
    });

    ws.on("error", (err) => {
      console.error("[WebSocket] Socket error:", err);
    });
  });

  return wss;
}
