import { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.poscheckout.app",
  appName: "Checkout POS",
  webDir: "dist",
  server: {
    androidScheme: "https",
  },
};

export default config;
