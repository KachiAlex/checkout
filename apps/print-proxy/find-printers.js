#!/usr/bin/env node

/**
 * Helper script to find available printers and COM ports
 * Useful for configuring the print proxy
 */

const { SerialPort } = require('serialport');

console.log('🔍 Scanning for available printers...\n');

// Find serial ports
SerialPort.list()
  .then((ports) => {
    if (ports.length === 0) {
      console.log('❌ No serial ports found.');
      console.log('\n💡 Tips:');
      console.log('   - Connect your printer via USB');
      console.log('   - Check Device Manager for COM ports');
      console.log('   - Ensure printer drivers are installed');
      return;
    }

    console.log(`✅ Found ${ports.length} serial port(s):\n`);
    
    ports.forEach((port, index) => {
      console.log(`${index + 1}. ${port.path}`);
      if (port.manufacturer) console.log(`   Manufacturer: ${port.manufacturer}`);
      if (port.vendorId) console.log(`   Vendor ID: ${port.vendorId}`);
      if (port.productId) console.log(`   Product ID: ${port.productId}`);
      if (port.pnpId) console.log(`   PnP ID: ${port.pnpId}`);
      console.log('');
    });

    console.log('📝 Configuration:');
    console.log('   Use the "path" value above when registering your printer.');
    console.log('   Common baud rates: 9600, 19200, 38400, 57600, 115200');
    console.log('\n💡 For network printers:');
    console.log('   - Find printer IP from printer settings or router');
    console.log('   - Default port: 9100 (raw TCP/IP printing)');
  })
  .catch((error) => {
    console.error('❌ Error scanning ports:', error.message);
    console.log('\n💡 Make sure serialport is installed: npm install');
  });

