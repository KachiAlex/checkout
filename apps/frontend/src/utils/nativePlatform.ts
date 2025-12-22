import { Capacitor } from "@capacitor/core";

export const isNativePlatform =
  typeof Capacitor?.isNativePlatform === "function"
    ? () => Capacitor.isNativePlatform()
    : typeof Capacitor?.getPlatform === "function"
      ? () => Capacitor.getPlatform() !== "web"
      : () => false;
