# Print Proxy Server

A local WebSocket server that bridges the POS web application to ESC/POS receipt printers.

## Features

- **Serial/USB Printer Support**: Connect to printers via COM ports (Windows) or device paths (Linux/Mac)
- **Network Printer Support**: Connect to network printers via TCP/IP
- **WebSocket Interface**: Secure communication between web app and local printer
- **Multiple Printers**: Register and manage multiple printers

## Installation

1. Navigate to the print-proxy directory:

   ```bash
   cd apps/print-proxy
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

## Usage

### Start the Server

```bash
npm start
```

Or for development with auto-reload:

```bash
npm run dev
```

The server will start on port 8080 by default (configurable via `PRINT_PROXY_PORT` environment variable).

### Configuration

Set environment variables (optional):

- `PRINT_PROXY_PORT`: WebSocket server port (default: 8080)
- `SERIAL_BAUD_RATE`: Serial port baud rate (default: 9600)

Example:

```bash
PRINT_PROXY_PORT=8080 SERIAL_BAUD_RATE=9600 npm start
```

## Printer Setup

### Serial/USB Printers

1. Find your printer's port:
   - **Windows**: Check Device Manager → Ports (COM & LPT). Usually `COM3`, `COM4`, etc.
   - **Linux/Mac**: Usually `/dev/ttyUSB0`, `/dev/ttyACM0`, or `/dev/cu.usbserial-*`

2. In the POS Settings page:
   - Set Print Proxy URL: `ws://localhost:8080` (or your server address)
   - Register a new printer:
     - Type: Serial/USB
     - Printer ID: `default-printer` (or any name)
     - Port Path: Your printer's port (e.g., `COM3` or `/dev/ttyUSB0`)
     - Baud Rate: Usually `9600` (check your printer manual)

### Network Printers

1. Find your printer's IP address and port:
   - Check printer settings or network configuration
   - Default port is usually `9100` (raw TCP/IP printing)

2. In the POS Settings page:
   - Set Print Proxy URL: `ws://localhost:8080` (or your server address)
   - Register a new printer:
     - Type: Network (TCP/IP)
     - Printer ID: `default-printer` (or any name)
     - Host/IP Address: Your printer's IP (e.g., `192.168.1.100`)
     - Port: Usually `9100`

## WebSocket API

The server accepts the following message types:

### Register Printer

```json
{
  "type": "register-printer",
  "printerId": "default-printer",
  "printerType": "serial",
  "config": {
    "path": "COM3",
    "baudRate": 9600
  }
}
```

### Print

```json
{
  "type": "print",
  "printerId": "default-printer",
  "data": "<ESC/POS commands>",
  "format": "escpos"
}
```

### List Printers

```json
{
  "type": "list-printers"
}
```

## Troubleshooting

### Printer Not Found

- Verify the printer is connected and powered on
- Check the port/path is correct
- On Windows, ensure the printer driver is installed
- On Linux, ensure your user has permission to access the device (may need to add user to `dialout` group)

### Connection Refused

- Ensure the print proxy server is running
- Check firewall settings allow connections on port 8080
- Verify the WebSocket URL in Settings matches the server address

### Print Jobs Not Printing

- Check printer is online and has paper
- Verify printer supports ESC/POS commands
- Check server console for error messages
- Try restarting the print proxy server

## Security Notes

- The print proxy should only be accessible on your local network
- For production, consider adding authentication
- Do not expose the print proxy to the public internet
