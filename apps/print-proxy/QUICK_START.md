# Print Proxy - Quick Start

## 🚀 Start the Server

**Windows:**

```bash
cd apps/print-proxy
npm install
npm start
```

Or double-click `start.bat`

**Server will run on:** `ws://localhost:8080`

## 🔍 Find Your Printer

```bash
npm run find-printers
```

This will show all available COM ports and USB devices.

## ⚙️ Configure in POS App

1. Open POS → **Settings** → **Receipt Printer**
2. Set **Print Proxy URL**: `ws://localhost:8080`
   - For mobile: Use your computer's IP (e.g., `ws://192.168.1.100:8080`)
3. Click **Save & Connect**

## printer Registration

### Serial/USB Printer:

- **Printer ID**: `pos-printer`
- **Type**: Serial/USB
- **Port Path**: `COM3` (from find-printers.js)
- **Baud Rate**: `9600`

### Network Printer:

- **Printer ID**: `network-printer`
- **Type**: Network (TCP/IP)
- **Host/IP**: `192.168.1.100` (printer's IP)
- **Port**: `9100`

## 💰 Cash Register Setup

Most cash registers work the same as printers:

1. Connect cash register to computer (USB/Serial/Network)
2. Find COM port or IP address
3. Register in POS Settings (same as printer)
4. Test print

**Common brands:** Epson TM, Star Micronics, Citizen, Bixolon

## ✅ Test

1. Server running? Check console: "Print Proxy Server running on port 8080"
2. In POS Settings, status should show "✓ Connected to print proxy"
3. Complete a sale and print receipt

## 🆘 Troubleshooting

**Server won't start:**

- Port 8080 in use? Try: `PRINT_PROXY_PORT=8081 npm start`

**Printer not found:**

- Check Device Manager for COM ports
- Install printer drivers
- Run `npm run find-printers`

**Connection refused:**

- Server running?
- Firewall blocking port 8080?
- For mobile: Use computer's IP, not localhost

**Need more help?** See `SETUP_GUIDE.md` or `CASH_REGISTER_SETUP.md`
