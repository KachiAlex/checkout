#!/usr/bin/env node

/**
 * Local Print Proxy Server
 *
 * Bridges web application to ESC/POS printers via WebSocket
 * Receives print jobs from the POS frontend and forwards to local printers
 */

const WebSocket = require("ws");
const { SerialPort } = require("serialport"); // For USB/Serial printers
const net = require("net"); // For network printers
const http = require("http");

const PORT = process.env.PRINT_PROXY_PORT || 8080;
const SERIAL_BAUD_RATE = parseInt(process.env.SERIAL_BAUD_RATE || "9600", 10);

// Store active printer connections
const printers = new Map();

// Create HTTP server for health checks
const server = http.createServer((req, res) => {
  if (req.url === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: "ok", printers: printers.size }));
  } else {
    res.writeHead(404);
    res.end("Not found");
  }
});

// Create WebSocket server
const wss = new WebSocket.Server({ server });

wss.on("connection", (ws, req) => {
  console.log("Client connected");

  ws.on("message", async (data) => {
    try {
      const message = JSON.parse(data.toString());

      switch (message.type) {
        case "register-printer":
          await handleRegisterPrinter(ws, message);
          break;

        case "print":
          await handlePrint(ws, message);
          break;

        case "list-printers":
          handleListPrinters(ws);
          break;

        default:
          ws.send(JSON.stringify({ error: "Unknown message type" }));
      }
    } catch (error) {
      console.error("Error handling message:", error);
      ws.send(JSON.stringify({ error: error.message }));
    }
  });

  ws.on("close", () => {
    console.log("Client disconnected");
    // Clean up printer registrations for this client
    for (const [printerId, printer] of printers.entries()) {
      if (printer.ws === ws) {
        printers.delete(printerId);
      }
    }
  });

  ws.on("error", (error) => {
    console.error("WebSocket error:", error);
  });
});

async function handleRegisterPrinter(ws, message) {
  const { printerId, type, config } = message;

  try {
    let connection;

    if (type === "serial") {
      // Serial/USB printer
      connection = new SerialPort({
        path: config.path,
        baudRate: config.baudRate || SERIAL_BAUD_RATE,
      });
    } else if (type === "network") {
      // Network printer (TCP/IP)
      connection = new net.Socket();
      await new Promise((resolve, reject) => {
        connection.connect(config.port || 9100, config.host, () => {
          resolve();
        });
        connection.on("error", reject);
      });
    } else {
      throw new Error(`Unsupported printer type: ${type}`);
    }

    printers.set(printerId, {
      type,
      connection,
      ws,
      config,
    });

    ws.send(
      JSON.stringify({
        success: true,
        message: `Printer ${printerId} registered`,
      }),
    );
  } catch (error) {
    ws.send(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
    );
  }
}

async function handlePrint(ws, message) {
  const { printerId, data, format } = message;

  const printer = printers.get(printerId);
  if (!printer) {
    ws.send(
      JSON.stringify({
        success: false,
        error: `Printer ${printerId} not found`,
      }),
    );
    return;
  }

  try {
    const printData =
      format === "escpos" ? Buffer.from(data, "utf-8") : Buffer.from(data);

    if (printer.type === "serial") {
      await new Promise((resolve, reject) => {
        printer.connection.write(printData, (error) => {
          if (error) reject(error);
          else resolve();
        });
      });
    } else if (printer.type === "network") {
      printer.connection.write(printData);
    }

    ws.send(
      JSON.stringify({
        success: true,
        message: "Print job sent",
      }),
    );
  } catch (error) {
    ws.send(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
    );
  }
}

function handleListPrinters(ws) {
  const printerList = Array.from(printers.keys()).map((id) => {
    const printer = printers.get(id);
    return {
      id,
      type: printer.type,
      config: printer.config,
    };
  });

  ws.send(
    JSON.stringify({
      success: true,
      printers: printerList,
    }),
  );
}

server.listen(PORT, () => {
  console.log(`Print Proxy Server running on port ${PORT}`);
  console.log(`WebSocket endpoint: ws://localhost:${PORT}`);
});
