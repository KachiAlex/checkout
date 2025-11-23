# Print Proxy Setup Guide

Complete guide to setting up the print proxy server for POS printers and cash registers.

## Quick Start

### 1. Install Dependencies

```bash
cd apps/print-proxy
npm install
```

### 2. Find Your Printer

**Windows:**
- Open Device Manager → Ports (COM & LPT)
- Look for your printer (e.g., "USB Serial Port (COM3)")

**Or use the helper script:**
```bash
node find-printers.js
```

### 3. Start the Server

**Windows:**
```bash
npm start
```
Or double-click `start.bat`

**Linux/Mac:**
```bash
npm start
```

The server will start on `ws://localhost:8080`

### 4. Configure in POS App

1. Open POS Settings → Receipt Printer
2. Set Print Proxy URL: `ws://localhost:8080`
3. Register your printer (see below)

## Printer Registration

### Serial/USB Printers

**In POS Settings:**
- Printer ID: `pos-printer` (or any name)
- Type: Serial/USB
- Port Path: `COM3` (or from find-printers.js)
- Baud Rate: `9600` (check printer manual)

### Network Printers

**In POS Settings:**
- Printer ID: `network-printer` (or any name)
- Type: Network (TCP/IP)
- Host/IP: `192.168.1.100` (your printer's IP)
- Port: `9100` (default for raw TCP/IP)

## Cash Register Configuration

Most cash registers use ESC/POS compatible printers. Common brands:

- **Epson TM Series**: Serial/USB, Baud: 9600
- **Star Micronics**: Serial/USB, Baud: 9600
- **Citizen**: Serial/USB, Baud: 9600
- **Bixolon**: Serial/USB or Network

**Steps:**
1. Connect cash register to computer (USB/Serial/Network)
2. Find COM port or IP address
3. Register in POS Settings (same as printer registration)
4. Test with a receipt print

## Testing

1. Start print proxy server
2. In POS, check Settings → Receipt Printer status
3. Should show "✓ Connected to print proxy"
4. Complete a test sale and print receipt

## Troubleshooting

**Server won't start:**
- Check port 8080 is not in use
- Try different port: `PRINT_PROXY_PORT=8081 npm start`

**Printer not found:**
- Verify printer is powered on
- Check COM port is correct
- Install printer drivers
- On Linux: `sudo usermod -a -G dialout $USER`

**Connection refused:**
- Ensure server is running
- Check firewall allows port 8080
- For mobile: use computer's IP instead of localhost

**Print jobs fail:**
- Check printer has paper
- Verify ESC/POS compatibility
- Check server console for errors
- Try different baud rate

## Network Access (for Mobile Devices)

1. Find your computer's IP:
   - Windows: `ipconfig` → IPv4 Address
   - Linux/Mac: `ifconfig` or `ip addr`

2. Use in POS: `ws://192.168.1.100:8080` (replace with your IP)

3. Ensure firewall allows port 8080

## Environment Variables

Create `.env` file (optional):
```
PRINT_PROXY_PORT=8080
SERIAL_BAUD_RATE=9600
```

## Security

- Only accessible on local network
- Do not expose to internet
- Consider authentication for production

For detailed cash register setup, see `CASH_REGISTER_SETUP.md`

