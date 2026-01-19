const __vite__mapDeps = (
  i,
  m = __vite__mapDeps,
  d = m.f ||
    (m.f = [
      "assets/printerDeviceService-C5B92oVi.js",
      "assets/index-L_FkDW6m.js",
      "assets/index-Bn3Ax6d6.css",
    ]),
) => i.map((i) => d[i]);
var e = Object.defineProperty,
  t = (t, n, r) =>
    ((t, n, r) =>
      n in t
        ? e(t, n, { enumerable: !0, configurable: !0, writable: !0, value: r })
        : (t[n] = r))(t, "symbol" != typeof n ? n + "" : n, r);
import { a as n, e as r, A as i, _ as s } from "./index-L_FkDW6m.js";
const o = () => {
  if ("undefined" == typeof window) return "";
  const e = localStorage.getItem("printProxyUrl");
  if (e && "" !== e.trim()) return e;
  return (() => {
    if ("undefined" == typeof window) return !1;
    const e = window.location.hostname;
    return (
      "localhost" === e ||
      "127.0.0.1" === e ||
      e.endsWith(".local") ||
      "capacitor://localhost" === e
    );
  })()
    ? "ws://localhost:8080"
    : "";
};
const a = new (class {
  constructor() {
    (t(this, "ws", null),
      t(this, "connectionPromise", null),
      t(this, "registeredPrinters", new Map()),
      t(this, "messageHandlers", new Map()));
  }
  async getReceipt(e) {
    const t = n.getState().accessToken;
    if (!t) throw new Error("Not authenticated");
    return (
      await r.get(`${i}/api/v1/receipts/${e}`, {
        headers: { Authorization: `Bearer ${t}` },
      })
    ).data.receipt;
  }
  async sendEmailReceipt(e, t) {
    const s = n.getState().accessToken;
    if (!s) throw new Error("Not authenticated");
    try {
      return (
        await r.post(
          `${i}/api/v1/receipts/${e}/email`,
          { email: t },
          { headers: { Authorization: `Bearer ${s}` } },
        )
      ).data.success;
    } catch (o) {
      return !1;
    }
  }
  async connect() {
    return this.connectionPromise
      ? this.connectionPromise
      : this.ws && this.ws.readyState === WebSocket.OPEN
        ? Promise.resolve()
        : ((this.connectionPromise = new Promise((e, t) => {
            try {
              const n = o();
              if (!n || "" === n.trim())
                return (
                  (this.connectionPromise = null),
                  void t(new Error("Print proxy URL not configured"))
                );
              ((this.ws = new WebSocket(n)),
                (this.ws.onopen = () => {
                  ((this.connectionPromise = null), e());
                }),
                (this.ws.onerror = (e) => {
                  ((this.connectionPromise = null),
                    t(new Error("Failed to connect to print proxy")));
                }),
                (this.ws.onclose = () => {
                  ((this.ws = null), (this.connectionPromise = null));
                }),
                (this.ws.onmessage = (e) => {
                  try {
                    const t = JSON.parse(e.data);
                    this.handleMessage(t);
                  } catch (t) {}
                }),
                setTimeout(() => {
                  var e;
                  (null == (e = this.ws) ? void 0 : e.readyState) !==
                    WebSocket.OPEN &&
                    ((this.connectionPromise = null),
                    t(new Error("Connection timeout")));
                }, 5e3));
            } catch (n) {
              ((this.connectionPromise = null), t(n));
            }
          })),
          this.connectionPromise);
  }
  handleMessage(e) {
    var t;
    if (
      !e.error &&
      (e.success && (null == (t = e.message) || t.includes("registered")),
      e.type && this.messageHandlers.has(e.type))
    ) {
      this.messageHandlers.get(e.type)(e);
    }
  }
  async registerPrinter(e, t, n) {
    try {
      if (
        (await this.connect(),
        !this.ws || this.ws.readyState !== WebSocket.OPEN)
      )
        throw new Error("Not connected to print proxy");
      return new Promise((r) => {
        (this.messageHandlers.set(`register-${e}`, (i) => {
          (i.success
            ? (this.registeredPrinters.set(e, { id: e, type: t, config: n }),
              r(!0))
            : r(!1),
            this.messageHandlers.delete(`register-${e}`));
        }),
          this.ws &&
            this.ws.send(
              JSON.stringify({
                type: "register-printer",
                printerId: e,
                printerType: t,
                config: n,
              }),
            ),
          setTimeout(() => {
            this.messageHandlers.has(`register-${e}`) &&
              (this.messageHandlers.delete(`register-${e}`), r(!1));
          }, 5e3));
      });
    } catch (r) {
      return !1;
    }
  }
  async listPrinters() {
    try {
      if (
        (await this.connect(),
        !this.ws || this.ws.readyState !== WebSocket.OPEN)
      )
        throw new Error("Not connected to print proxy");
      return new Promise((e) => {
        (this.messageHandlers.set("list-printers", (t) => {
          (t.success && t.printers ? e(t.printers) : e([]),
            this.messageHandlers.delete("list-printers"));
        }),
          this.ws.send(JSON.stringify({ type: "list-printers" })),
          setTimeout(() => {
            this.messageHandlers.has("list-printers") &&
              (this.messageHandlers.delete("list-printers"), e([]));
          }, 5e3));
      });
    } catch (e) {
      return [];
    }
  }
  async printReceipt(e, t) {
    try {
      const s = n.getState().accessToken;
      if (!s) throw new Error("Not authenticated");
      const o = await r.get(`${i}/api/v1/receipts/${e}/print`, {
          headers: { Authorization: `Bearer ${s}` },
        }),
        { escpos: a } = o.data;
      if (
        (await this.connect(),
        !this.ws || this.ws.readyState !== WebSocket.OPEN)
      )
        throw new Error("Not connected to print proxy");
      const c = t || "default-printer";
      return new Promise((t) => {
        (this.messageHandlers.set(`print-${e}`, (n) => {
          (n.success ? t(!0) : t(!1),
            this.messageHandlers.delete(`print-${e}`));
        }),
          this.ws.send(
            JSON.stringify({
              type: "print",
              printerId: c,
              data: a,
              format: "escpos",
            }),
          ),
          setTimeout(() => {
            this.messageHandlers.has(`print-${e}`) &&
              (this.messageHandlers.delete(`print-${e}`), t(!1));
          }, 1e4));
      });
    } catch (s) {
      return !1;
    }
  }
  async printReceiptToSerial(e, t) {
    try {
      const o = n.getState().accessToken;
      if (!o) throw new Error("Not authenticated");
      const a = await r.get(`${i}/api/v1/receipts/${e}/print`, {
          headers: { Authorization: `Bearer ${o}` },
        }),
        { escpos: c } = a.data,
        d = new TextEncoder().encode(c),
        { writeToSerialPort: l } = await s(
          async () => {
            const { writeToSerialPort: e } = await import(
              "./printerDeviceService-C5B92oVi.js"
            );
            return { writeToSerialPort: e };
          },
          __vite__mapDeps([0, 1, 2]),
        );
      return (await l(t, d), !0);
    } catch (o) {
      return !1;
    }
  }
  async printReceiptToBluetooth(e, t) {
    try {
      const o = n.getState().accessToken;
      if (!o) throw new Error("Not authenticated");
      const a = await r.get(`${i}/api/v1/receipts/${e}/print`, {
          headers: { Authorization: `Bearer ${o}` },
        }),
        { escpos: c } = a.data,
        d = new TextEncoder().encode(c),
        { writeToBluetoothPrinter: l } = await s(
          async () => {
            const { writeToBluetoothPrinter: e } = await import(
              "./printerDeviceService-C5B92oVi.js"
            );
            return { writeToBluetoothPrinter: e };
          },
          __vite__mapDeps([0, 1, 2]),
        );
      return (await l(t, d), !0);
    } catch (o) {
      return !1;
    }
  }
  async printReceiptBrowser(e) {
    try {
      const t = await this.getReceipt(e),
        n = window.open("", "_blank");
      if (!n)
        throw new Error(
          "Popup blocked. Please allow popups to print receipts.",
        );
      const r = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
      window.screen.width;
      return (
        n.document.write(
          `\n        <!DOCTYPE html>\n        <html>\n          <head>\n            <meta charset="UTF-8">\n            <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">\n            <title>Receipt - Order ${e}</title>\n            <style>\n              * {\n                box-sizing: border-box;\n                margin: 0;\n                padding: 0;\n              }\n              \n              html, body {\n                width: 100%;\n                height: 100%;\n                overflow-x: hidden;\n              }\n              \n              body {\n                font-family: 'Courier New', 'Courier', monospace;\n                font-size: ${r ? "10px" : "12px"};\n                line-height: 1.4;\n                padding: ${r ? "10px" : "20px"};\n                white-space: pre-wrap;\n                word-wrap: break-word;\n                overflow-wrap: break-word;\n                background: white;\n                color: black;\n                margin: 0 auto;\n                max-width: 100%;\n                width: 100%;\n              }\n              \n              pre {\n                font-family: inherit;\n                font-size: inherit;\n                line-height: inherit;\n                white-space: pre-wrap;\n                word-wrap: break-word;\n                overflow-wrap: break-word;\n                max-width: 100%;\n                width: 100%;\n                margin: 0;\n                padding: 0;\n                overflow-x: auto;\n                -webkit-overflow-scrolling: touch;\n              }\n              \n              @media screen {\n                body {\n                  max-width: ${r ? "100%" : "80mm"};\n                  margin: 0 auto;\n                  padding: ${r ? "15px" : "20px"};\n                }\n              }\n              \n              @media print {\n                @page {\n                  size: ${r ? "A4" : "80mm"} auto;\n                  margin: ${r ? "5mm" : "0"};\n                }\n                body {\n                  margin: 0;\n                  padding: 10mm;\n                  font-size: ${r ? "9px" : "12px"};\n                  max-width: 100%;\n                  width: 100%;\n                }\n                pre {\n                  max-width: 100%;\n                  width: 100%;\n                  overflow: visible;\n                }\n              }\n              \n              @media screen and (max-width: 480px) {\n                body {\n                  font-size: 9px;\n                  padding: 10px;\n                }\n              }\n              \n              @media screen and (min-width: 481px) and (max-width: 768px) {\n                body {\n                  font-size: 10px;\n                  padding: 15px;\n                }\n              }\n            </style>\n          </head>\n          <body>\n            <pre>${t.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</pre>\n            <script>\n              (function() {\n                // Ensure content is loaded before printing\n                if (document.readyState === 'complete') {\n                  setTimeout(function() {\n                    window.print();\n                  }, 250);\n                } else {\n                  window.onload = function() {\n                    setTimeout(function() {\n                      window.print();\n                    }, 250);\n                  };\n                }\n                \n                // Close window after printing (if supported)\n                window.onafterprint = function() {\n                  setTimeout(function() {\n                    window.close();\n                  }, 100);\n                };\n                \n                // Fallback: close after a delay if onafterprint doesn't fire\n                setTimeout(function() {\n                  if (!document.hidden) {\n                    // Window is still visible, user might have cancelled print\n                    // Don't auto-close, let user close manually\n                  }\n                }, 5000);\n              })();\n            <\/script>\n          </body>\n        </html>\n      `,
        ),
        n.document.close(),
        !0
      );
    } catch (t) {
      return !1;
    }
  }
  async isAvailable() {
    var e;
    try {
      return (
        !!o() &&
        (await this.connect(),
        (null == (e = this.ws) ? void 0 : e.readyState) === WebSocket.OPEN)
      );
    } catch (t) {
      return !1;
    }
  }
  hasConfiguredProxy() {
    const e = o();
    return Boolean(e && "" !== e.trim());
  }
  disconnect() {
    (this.ws && (this.ws.close(), (this.ws = null)),
      (this.connectionPromise = null),
      this.messageHandlers.clear());
  }
})();
export { a as r };
