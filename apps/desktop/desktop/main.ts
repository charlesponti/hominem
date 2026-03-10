import { app, BrowserWindow } from "electron";
import { spawn } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

let server: any;

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function createWindow() {
  const win = new BrowserWindow({
    width: 900,
    height: 700,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });
  win.loadURL("http://localhost:6001");
}

app.whenReady().then(() => {
  // start the Bun web server in background
  const serverScript = path.resolve(__dirname, "../src/web.ts");
  server = spawn("bun", ["--hot", serverScript], {
    cwd: path.resolve(__dirname, ".."),
    stdio: "inherit",
    env: { ...process.env, PORT: "6001" },
  });

  createWindow();
});

app.on("window-all-closed", () => {
  if (server) server.kill();
  if (process.platform !== "darwin") {
    app.quit();
  }
});
