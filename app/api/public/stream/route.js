import { appEventEmitter, getPublicState } from "@/lib/store.mjs";

export const dynamic = "force-dynamic"; // Ensure this route is never cached

export async function GET(req) {
  const stream = new ReadableStream({
    async start(controller) {
      // Helper function to send data to the client
      const sendUpdate = (data) => {
        try {
          const payload = `data: ${JSON.stringify(data)}\n\n`;
          controller.enqueue(new TextEncoder().encode(payload));
        } catch (error) {
          console.error("Error sending SSE update:", error);
        }
      };

      // Send initial data as soon as the client connects
      try {
        const initialState = await getPublicState();
        sendUpdate(initialState);
      } catch (error) {
        console.error("Error sending initial SSE state:", error);
      }

      // Listen for updates from the event emitter
      appEventEmitter.on("stateUpdate", sendUpdate);

      // Handle client disconnect
      req.signal.addEventListener("abort", () => {
        appEventEmitter.off("stateUpdate", sendUpdate);
      });
    },
    cancel() {
      // Fallback cleanup if the stream is canceled
      // The abort event listener on req.signal usually handles this
    }
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive"
    }
  });
}
