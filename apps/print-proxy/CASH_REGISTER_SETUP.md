# Cash Register Integration Guide

This guide explains how to configure the print proxy to work with cash registers and POS receipt printers.

## Overview

The print proxy server bridges your POS web application to physical receipt printers and cash registers. It supports:
- **Serial/USB Printers**: Direct connection via COM ports (Windows) or device paths (Linux/Mac)
- **Network Printers**: Connection via TCP/IP (Ethernet or Wi-Fi)
- **Cash Registers**: Most modern cash registers support ESC/POS printing

## Quick Start

### 1. Start the Print Proxy Server

**Windows:**
```bash
cd apps/print-proxy
npm install
npm start
```

Or double-click `start.bat`

**Linux/Mac:**
```bash
cd apps/print-proxy
npm install
npm start
```

The server will start on port 8080 by default.

### 2. Configure in POS Settings

1. Open your POS application
2. Go to **Settings** → **Receipt Printer**
3. Set **Print Proxy WebSocket URL**: `ws://localhost:8080`
   - For mobile devices, use your computer's IP: `ws://192.168.1.100:8080`
4. Click **Save & Connect**

## Printer Configuration

### Serial/USB Printers (Most Common)

**Step 1: Find Your Printer Port**

**Windows:**
1. Open Device Manager
2. Expand "Ports (COM & LPT)"
3. Find your printer (usually shows as "USB Serial Port" or similar)
4. Note the COM port number (e.g., COM3, COM4)

**Linux:**
```bash
ls /dev/ttyUSB* /dev/ttyACM* /dev/cu.*
```

**Mac:**
```bash
ls /dev/cu.usbserial-* /dev/cu.usbmodem*
```

**Step 2: Register Printer in POS**

1. In Settings → Receipt Printer
2. Click **Register New Printer**
3. Fill in:
   - **Printer ID**: `pos-printer` or `cash-register`
   - **Type**: Serial/USB
   - **Port Path**: Your COM port (e.g., `COM3` or `/dev/ttyUSB0`)
   - **Baud Rate**: Usually `9600` (check your printer manual)

### Network Printers (Ethernet/Wi-Fi)

**Step 1: Find Printer IP Address**

1. Print a network configuration page from your printer
2. Or check your router's connected devices list
3. Or use printer's menu: Settings → Network → TCP/IP

**Step 2: Register Printer in POS**

1. In Settings → Receipt Printer
2. Click **Register New Printer**
3. Fill in:
   - **Printer ID**: `network-printer`
   - **Type**: Network (TCP/IP)
   - **Host/IP Address**: Your printer's IP (e.g., `192.168.1.100`)
   - **Port**: Usually `9100` (raw TCP/IP printing)

## Cash Register Setup

Most modern cash registers use ESC/POS compatible printers. Follow these steps:

### Common Cash Register Brands

**Epson TM Series:**
- Type: Serial/USB or Network
- Baud Rate: 9600 or 19200
- Port: Check Device Manager for COM port

**Star Micronics:**
- Type: Serial/USB
- Baud Rate: 9600
- Port: Check Device Manager

**Citizen:**
- Type: Serial/USB
- Baud Rate: 9600
- Port: Check Device Manager

**Bixolon:**
- Type: Serial/USB or Network
- Baud Rate: 9600
- Port: COM port or IP address

### Configuration Steps

1. **Connect Cash Register to Computer**
   - USB: Connect via USB cable
   - Serial: Connect via serial cable (may need USB-to-Serial adapter)
   - Network: Connect to same network as your computer

2. **Install Printer Drivers** (if needed)
   - Windows usually auto-detects
   - Check Device Manager to confirm connection

3. **Register in POS**
   - Use the steps above for Serial/USB or Network printers
   - Test print to verify connection

## Testing

### Test Print Connection

1. In POS Settings → Receipt Printer
2. Check **Printer Status** - should show "✓ Connected to print proxy"
3. Complete a test sale
4. Click **Print Receipt** - should print successfully

### Troubleshooting

**Printer Not Found:**
- Verify printer is powered on and connected
- Check port/path is correct
- On Windows, ensure printer driver is installed
- On Linux, ensure user has permission: `sudo usermod -a -G dialout $USER`

**Connection Refused:**
- Ensure print proxy server is running
- Check firewall allows port 8080
- Verify WebSocket URL matches server address
- For mobile: Use computer's IP instead of localhost

**Print Jobs Not Printing:**
- Check printer has paper and is online
- Verify printer supports ESC/POS commands
- Check server console for error messages
- Try restarting print proxy server

**Cash Register Not Responding:**
- Verify cash register is in "POS mode" or "Receipt mode"
- Check cash register settings allow external printing
- Some cash registers require specific initialization commands
- Check cash register manual for ESC/POS compatibility

## Advanced Configuration

### Multiple Printers

You can register multiple printers for different purposes:
- `pos-printer`: Main receipt printer
- `kitchen-printer`: Kitchen order printer
- `cash-register`: Cash register printer

### Custom Baud Rates

Some printers require different baud rates:
- 9600: Most common
- 19200: Some Epson models
- 38400: High-speed printers
- 115200: Fast network printers

Set in printer registration or via environment variable:
```bash
SERIAL_BAUD_RATE=19200 npm start
```

### Network Configuration

For mobile devices or remote access:
1. Find your computer's IP address:
   - Windows: `ipconfig` (look for IPv4 Address)
   - Linux/Mac: `ifconfig` or `ip addr`
2. Use that IP in WebSocket URL: `ws://192.168.1.100:8080`
3. Ensure firewall allows connections on port 8080

## Security Notes

- Print proxy should only be accessible on local network
- Do not expose to public internet
- Consider adding authentication for production use
- Use firewall rules to restrict access

## Support

For issues or questions:
1. Check server console for error messages
2. Verify printer compatibility with ESC/POS
3. Test with printer's test print function
4. Check printer manual for specific requirements

