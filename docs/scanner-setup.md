# Barcode/QR Scanner Setup Guide

This POS system supports multiple types of barcode and QR code scanners:

## Supported Scanner Types

### 1. USB HID Keyboard Scanners (Most Common)
**How it works:** Scanners that act as USB keyboards - they type the barcode when scanned.

**Setup:**
- Simply plug in the USB scanner
- Make sure the scanner is in "HID Keyboard" mode (most default)
- The scanner input field will automatically detect rapid input
- No additional configuration needed!

**Features:**
- Auto-detects rapid input (scanner vs manual typing)
- Automatically processes barcode after 150ms of no input
- Works immediately after connection

**Common Brands:**
- Symbol/Zebra scanners
- Honeywell scanners
- Generic USB barcode scanners
- Most handheld scanners

---

### 2. Bluetooth HID Scanners
**How it works:** Wireless scanners that also act as keyboards via Bluetooth.

**Setup:**
1. Make sure your scanner is in pairing mode
2. In the POS app, click the **"📡 Bluetooth"** button
3. Select your scanner from the Bluetooth device list
4. Once paired, it works just like a USB scanner

**Requirements:**
- Chrome/Edge browser (desktop or Android)
- Web Bluetooth API support
- Scanner must support HID profile

**Note:** Some browsers (Safari, Firefox) don't support Web Bluetooth API yet.

---

### 3. Camera-Based QR Code Scanning
**How it works:** Uses your device's camera to scan QR codes and barcodes.

**Setup:**
1. Click the **"📷 Camera"** button in the scanner interface
2. Allow camera access when prompted
3. Point the camera at a QR code or barcode
4. The code will be automatically detected and processed

**Features:**
- Works with any device that has a camera
- Supports QR codes and many barcode formats
- Real-time scanning with visual feedback

**Best For:**
- QR code payments
- Customer mobile QR codes
- Quick inventory checks with phone camera

---

## Scanner Modes

The scanner component has three modes:

### Keyboard Mode (Default)
- **For:** USB and Bluetooth HID scanners
- **Input:** Scanners type characters automatically
- **Auto-detect:** Detects rapid input and processes automatically
- **Manual:** Can also type barcode and press Enter

### Camera Mode
- **For:** QR codes and barcodes via camera
- **Activation:** Click "Camera" button
- **Usage:** Point camera at code
- **Stop:** Click "Stop Camera" button

### Bluetooth Mode
- **For:** Pairing Bluetooth scanners
- **Activation:** Click "Bluetooth" button
- **Once paired:** Works in keyboard mode

---

## Troubleshooting

### USB Scanner Not Working

1. **Check Connection:**
   - Ensure scanner is plugged in
   - Try a different USB port
   - Check if scanner needs drivers

2. **Scanner Mode:**
   - Some scanners have multiple modes (HID, Serial, etc.)
   - Set scanner to "HID Keyboard" or "USB Keyboard" mode
   - Check scanner manual for mode switching

3. **Browser Focus:**
   - Make sure the scanner input field is focused
   - Click in the input field if scans aren't detected
   - The field should auto-focus automatically

4. **Test Scanner:**
   - Scan a barcode in any text field (Notepad, etc.)
   - If it types there, it should work in the POS app

### Bluetooth Scanner Issues

1. **Browser Support:**
   - Only Chrome/Edge support Web Bluetooth
   - Safari and Firefox don't support it yet
   - Use Chrome/Edge or switch to USB scanner

2. **Pairing:**
   - Make sure scanner is in pairing mode
   - Scanner should be discoverable
   - Check scanner battery level

3. **Permission:**
   - Allow Bluetooth access in browser settings
   - Check browser permissions for the site

### Camera Not Working

1. **Permissions:**
   - Allow camera access when prompted
   - Check browser settings if permission denied
   - Some browsers require HTTPS for camera access

2. **Device:**
   - Ensure device has a camera
   - Check if camera is being used by another app
   - Try refreshing the page

3. **Lighting:**
   - Ensure good lighting for scanning
   - Hold camera steady
   - Keep code in focus

---

## Scanner Configuration

The scanner auto-detects input speed:
- **Fast input** (< 100ms between characters) = Scanner input
- **Slow input** (> 100ms between characters) = Manual typing

Auto-scan triggers after 150ms of no input when:
- Input length >= 4 characters
- Input is not empty

---

## Best Practices

1. **USB Scanners:**
   - Keep scanner input field visible
   - Don't click away from the field during scanning
   - Use scanner's "Enter" key if auto-detect doesn't work

2. **Bluetooth Scanners:**
   - Pair once, use multiple times
   - Keep scanner charged
   - Re-pair if connection drops

3. **Camera Scanning:**
   - Use in well-lit areas
   - Hold device steady
   - Ensure QR code is clear and readable

---

## Testing Your Scanner

1. **USB/Bluetooth:**
   - Open the checkout or inventory page
   - The scanner input field should be focused (blue border)
   - Scan any barcode
   - Barcode should appear and be processed automatically

2. **Camera:**
   - Click "Camera" button
   - Point at any QR code
   - Code should be detected automatically

---

## Supported Barcode Formats

- **EAN-13** (European Article Number)
- **EAN-8**
- **UPC-A** (Universal Product Code)
- **UPC-E**
- **Code 128**
- **Code 39**
- **ITF** (Interleaved 2 of 5)
- **QR Code**
- **Data Matrix**
- And more...

---

## Need Help?

If your scanner isn't working:
1. Check this guide first
2. Verify scanner is in HID mode
3. Test scanner in a text editor
4. Check browser console for errors
5. Contact support with scanner model and browser details

