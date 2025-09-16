import express, { type Request, Response, NextFunction } from "express";
import { spawn, ChildProcess } from "child_process";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";

const app = express();
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: false, limit: '50mb' }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

// Python backend integration
let pythonBackend: ChildProcess | null = null;

async function startPythonBackend(): Promise<void> {
  return new Promise((resolve, reject) => {
    log("Starting Python FastAPI backend...");
    
    pythonBackend = spawn("python3", ["knowledge_vault_backend.py"], {
      stdio: ["pipe", "pipe", "pipe"],
      env: { ...process.env, PORT: "8001" },
      cwd: process.cwd()
    });

    pythonBackend.stdout?.on("data", (data) => {
      const output = data.toString().trim();
      if (output) log(`[Python Backend] ${output}`);
    });

    pythonBackend.stderr?.on("data", (data) => {
      const output = data.toString().trim();
      if (output) log(`[Python Backend Error] ${output}`);
    });

    pythonBackend.on("error", (error) => {
      log(`Python backend spawn error: ${error.message}`);
      reject(error);
    });

    pythonBackend.on("exit", (code, signal) => {
      log(`Python backend exited with code ${code}, signal ${signal}`);
      if (code !== 0 && code !== null) {
        reject(new Error(`Python backend exited with code ${code}`));
      }
    });

    // Health check with retry
    const healthCheck = async (retries = 30): Promise<void> => {
      try {
        const response = await fetch("http://localhost:8001/health");
        if (response.ok) {
          log("✅ Python backend is healthy");
          resolve();
        } else {
          throw new Error(`Health check failed: ${response.status}`);
        }
      } catch (error) {
        if (retries > 0) {
          setTimeout(() => healthCheck(retries - 1), 1000);
        } else {
          reject(new Error("Python backend health check timeout"));
        }
      }
    };

    // Start health check after a brief delay
    setTimeout(() => healthCheck(), 2000);
  });
}

// Graceful shutdown
process.on("SIGTERM", () => {
  log("Received SIGTERM, shutting down gracefully...");
  if (pythonBackend) {
    pythonBackend.kill("SIGTERM");
  }
  process.exit(0);
});

process.on("SIGINT", () => {
  log("Received SIGINT, shutting down gracefully...");
  if (pythonBackend) {
    pythonBackend.kill("SIGTERM");
  }
  process.exit(0);
});

(async () => {
  try {
    // Start Python backend first
    await startPythonBackend();
    
    const server = await registerRoutes(app);

    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";

      res.status(status).json({ message });
      throw err;
    });

    // importantly only setup vite in development and after
    // setting up all the other routes so the catch-all route
    // doesn't interfere with the other routes
    if (app.get("env") === "development") {
      await setupVite(app, server);
    } else {
      serveStatic(app);
    }

    // ALWAYS serve the app on the port specified in the environment variable PORT
    // Other ports are firewalled. Default to 5000 if not specified.
    // this serves both the API and the client.
    // It is the only port that is not firewalled.
    const port = parseInt(process.env.PORT || '5000', 10);
    server.listen({
      port,
      host: "0.0.0.0",
      reusePort: true,
    }, () => {
      log(`serving on port ${port}`);
      log("🚀 Both Node.js frontend and Python backend are running");
    });
  } catch (error) {
    log(`Failed to start services: ${error}`);
    process.exit(1);
  }
})();
