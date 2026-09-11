import { handleQuestions } from "./routes/questions";
import { handleHealth } from "./routes/health";
import { handleTaunts } from "./routes/taunts";
import { handleSfx } from "./routes/sfx";
import type { Env } from "./types";

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      let response: Response;

      if (path === "/api/questions" && request.method === "POST") {
        response = await handleQuestions(request, env);
      } else if (path === "/api/health") {
        response = handleHealth();
      } else if (path.startsWith("/api/taunts")) {
        response = await handleTaunts(request, env, path);
      } else if (path.startsWith("/api/sfx")) {
        response = await handleSfx(request, env, path);
      } else {
        response = new Response("Not found", { status: 404 });
      }

      Object.entries(corsHeaders).forEach(([key, value]) => {
        response.headers.set(key, value);
      });

      return response;
    } catch (err) {
      console.error(err);
      return Response.json(
        { error: "Internal server error" },
        { status: 500, headers: corsHeaders },
      );
    }
  },
};
