import {
  e,
  A as t,
  a as s,
  r as a,
  z as r,
  j as n,
  B as i,
  L as l,
} from "./index-B6jbneE4.js";
import { T as o } from "./ThemeToggle-DfPDAVEh.js";
import { r as c } from "./receiptService-BgCBi_qq.js";
import { u as d, f as m } from "./scannerDeviceService-Mvko7imL.js";
import {
  listPrinterDevices as x,
  isSerialAPISupported as h,
  getAvailableSerialPorts as p,
  isBluetoothAPISupported as u,
  requestSerialPrinter as y,
  getSerialPortInfo as b,
  connectSerialPort as f,
  registerPrinterDevice as g,
  requestBluetoothPrinter as j,
  connectBluetoothPrinter as N,
  closeSerialPort as v,
} from "./printerDeviceService-BWUaYqX2.js";
import { f as w } from "./format-CiGwivc0.js";
async function k(s, a) {
  const { data: r } = await e.patch(`${t}/api/v1/users/${s}`, a);
  return r;
}
class C {
  static async getPaymentSettings() {
    const a = s.getState().accessToken;
    if (!a) throw new Error("Not authenticated");
    return (
      await e.get(`${t}/api/v1/payment-settings`, {
        headers: { Authorization: `Bearer ${a}` },
      })
    ).data;
  }
  static async updatePaymentSettings(a) {
    const r = s.getState().accessToken;
    if (!r) throw new Error("Not authenticated");
    return (
      await e.put(`${t}/api/v1/payment-settings`, a, {
        headers: { Authorization: `Bearer ${r}` },
      })
    ).data;
  }
}
function S({ onClose: e }) {
  const { user: t, accessToken: i } = s(),
    [l, o] = a.useState([]),
    [d, m] = a.useState(!1),
    [w, k] = a.useState(null),
    [C, S] = a.useState(null),
    [I, P] = a.useState([]);
  a.useEffect(() => {
    i && (B(), A());
  }, [i]);
  const B = async () => {
      if (i) {
        m(!0);
        try {
          const e = await x(t?.locationId);
          o(e);
        } catch (e) {
          r.error("Failed to load printers");
        } finally {
          m(!1);
        }
      }
    },
    A = async () => {
      if (h())
        try {
          const e = await p();
          P(e);
        } catch (e) {}
    };
  return n.jsxs("div", {
    className: "theme-surface rounded-2xl border theme-border p-6 space-y-6",
    children: [
      n.jsxs("div", {
        className: "flex items-center justify-between",
        children: [
          n.jsx("h2", {
            className: "text-xl font-semibold theme-text-primary",
            children: "Printer Devices",
          }),
          e &&
            n.jsx("button", {
              onClick: e,
              className:
                "theme-chip rounded-full border p-2 transition hover:bg-white/10",
              children: "✕",
            }),
        ],
      }),
      n.jsxs("div", {
        className: "grid grid-cols-1 sm:grid-cols-2 gap-4",
        children: [
          n.jsx("button", {
            onClick: async () => {
              if (h()) {
                k("usb");
                try {
                  const e = await y();
                  if (!e) throw new Error("No port selected");
                  const s = await b(e);
                  await f(e, {
                    baudRate: 9600,
                    dataBits: 8,
                    stopBits: 1,
                    parity: "none",
                  });
                  const a =
                      s.vendorId && s.productId
                        ? `usb_${s.vendorId}_${s.productId}`
                        : `usb_serial_${Date.now()}`,
                    n = await g({
                      identifier: a,
                      name: s.deviceName || "USB Serial Printer",
                      type: "usb",
                      connectionType: "serial",
                      hardwareId: a,
                      vendorId: s.vendorId,
                      productId: s.productId,
                      locationId: t?.locationId,
                      config: {
                        baudRate: 9600,
                        dataBits: 8,
                        stopBits: 1,
                        parity: "none",
                      },
                      metadata: { portInfo: s },
                    });
                  ((n.port = e),
                    o([...l, n]),
                    r.success(`Connected to ${n.name}`));
                } catch (e) {
                  r.error(e.message || "Failed to connect USB printer");
                } finally {
                  k(null);
                }
              } else
                r.error(
                  "Web Serial API not supported. Use Chrome/Edge on desktop.",
                );
            },
            disabled: null !== w || !h(),
            className:
              "theme-surface rounded-xl border theme-border p-4 hover:border-sky-400/50 transition disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation",
            children: n.jsxs("div", {
              className: "flex items-center gap-3",
              children: [
                n.jsx("span", { className: "text-2xl", children: "🔌" }),
                n.jsxs("div", {
                  className: "text-left",
                  children: [
                    n.jsx("p", {
                      className: "font-semibold theme-text-primary",
                      children: "USB Printer",
                    }),
                    n.jsx("p", {
                      className: "text-xs theme-text-secondary",
                      children:
                        "usb" === w
                          ? "Connecting..."
                          : h()
                            ? "Connect via USB Serial"
                            : "Not supported",
                    }),
                  ],
                }),
              ],
            }),
          }),
          n.jsx("button", {
            onClick: async () => {
              if (u()) {
                k("bluetooth");
                try {
                  const e = await j();
                  if (!e) throw new Error("No Bluetooth device selected");
                  const s = await N(e);
                  if (!s) throw new Error("Failed to get write characteristic");
                  const a = e.id || `bluetooth_${Date.now()}`,
                    n = await g({
                      identifier: a,
                      name: e.name || "Bluetooth Printer",
                      type: "bluetooth",
                      connectionType: "bluetooth",
                      hardwareId: e.id,
                      locationId: t?.locationId,
                      metadata: { deviceId: e.id },
                    });
                  ((n.bluetoothDevice = e),
                    (n.characteristic = s),
                    o([...l, n]),
                    r.success(`Connected to ${n.name}`));
                } catch (e) {
                  r.error(e.message || "Failed to connect Bluetooth printer");
                } finally {
                  k(null);
                }
              } else
                r.error(
                  "Web Bluetooth API not supported. Use Chrome/Edge on desktop or Android.",
                );
            },
            disabled: null !== w || !u(),
            className:
              "theme-surface rounded-xl border theme-border p-4 hover:border-sky-400/50 transition disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation",
            children: n.jsxs("div", {
              className: "flex items-center gap-3",
              children: [
                n.jsx("span", { className: "text-2xl", children: "📶" }),
                n.jsxs("div", {
                  className: "text-left",
                  children: [
                    n.jsx("p", {
                      className: "font-semibold theme-text-primary",
                      children: "Bluetooth Printer",
                    }),
                    n.jsx("p", {
                      className: "text-xs theme-text-secondary",
                      children:
                        "bluetooth" === w
                          ? "Connecting..."
                          : u()
                            ? "Connect via Bluetooth"
                            : "Not supported",
                    }),
                  ],
                }),
              ],
            }),
          }),
        ],
      }),
      n.jsxs("div", {
        children: [
          n.jsx("h3", {
            className: "text-lg font-semibold theme-text-primary mb-4",
            children: "Connected Printers",
          }),
          d
            ? n.jsx("p", {
                className: "theme-text-secondary text-sm",
                children: "Loading printers...",
              })
            : 0 === l.length
              ? n.jsxs("div", {
                  className:
                    "theme-surface rounded-xl border border-dashed theme-border p-8 text-center",
                  children: [
                    n.jsx("p", {
                      className: "theme-text-secondary text-sm",
                      children: "No printers connected",
                    }),
                    n.jsx("p", {
                      className: "theme-text-secondary text-xs mt-2",
                      children:
                        "Connect a USB or Bluetooth printer to get started",
                    }),
                  ],
                })
              : n.jsx("div", {
                  className: "space-y-3",
                  children: l.map((e) =>
                    n.jsx(
                      "div",
                      {
                        className:
                          "theme-surface rounded-xl border theme-border p-4",
                        children: n.jsxs("div", {
                          className: "flex items-start justify-between gap-4",
                          children: [
                            n.jsxs("div", {
                              className: "flex-1",
                              children: [
                                n.jsxs("div", {
                                  className: "flex items-center gap-2 mb-2",
                                  children: [
                                    n.jsx("h4", {
                                      className:
                                        "font-semibold theme-text-primary",
                                      children: e.name,
                                    }),
                                    n.jsx("span", {
                                      className:
                                        "px-2 py-1 rounded-full text-xs " +
                                        ("usb" === e.type
                                          ? "bg-blue-500/20 text-blue-400"
                                          : "bluetooth" === e.type
                                            ? "bg-purple-500/20 text-purple-400"
                                            : "bg-gray-500/20 text-gray-400"),
                                      children: e.type.toUpperCase(),
                                    }),
                                  ],
                                }),
                                n.jsxs("div", {
                                  className:
                                    "text-sm theme-text-secondary space-y-1",
                                  children: [
                                    n.jsxs("p", {
                                      children: [
                                        "Connection: ",
                                        e.connectionType,
                                      ],
                                    }),
                                    e.config?.baudRate &&
                                      n.jsxs("p", {
                                        children: [
                                          "Baud Rate: ",
                                          e.config.baudRate,
                                        ],
                                      }),
                                    e.lastUsedAt &&
                                      n.jsxs("p", {
                                        children: [
                                          "Last Used:",
                                          " ",
                                          new Date(
                                            e.lastUsedAt,
                                          ).toLocaleString(),
                                        ],
                                      }),
                                  ],
                                }),
                              ],
                            }),
                            n.jsxs("div", {
                              className: "flex gap-2",
                              children: [
                                n.jsx("button", {
                                  onClick: () =>
                                    (async (e) => {
                                      if (i) {
                                        S(e.id);
                                        try {
                                          const t = "test-print";
                                          if (
                                            "serial" === e.connectionType &&
                                            e.port
                                          )
                                            await c.printReceiptToSerial(
                                              t,
                                              e.port,
                                            );
                                          else {
                                            if (
                                              "bluetooth" !==
                                                e.connectionType ||
                                              !e.characteristic
                                            )
                                              return void r.error(
                                                "Printer not connected",
                                              );
                                            await c.printReceiptToBluetooth(
                                              t,
                                              e.characteristic,
                                            );
                                          }
                                          r.success(
                                            "Test print sent successfully",
                                          );
                                        } catch (t) {
                                          r.error(
                                            t.message || "Test print failed",
                                          );
                                        } finally {
                                          S(null);
                                        }
                                      } else r.error("Not authenticated");
                                    })(e),
                                  disabled: C === e.id,
                                  className:
                                    "px-4 py-2 rounded-lg bg-sky-500/20 text-sky-400 text-sm font-medium hover:bg-sky-500/30 transition disabled:opacity-50 touch-manipulation",
                                  children:
                                    C === e.id ? "Printing..." : "Test Print",
                                }),
                                n.jsx("button", {
                                  onClick: () =>
                                    (async (e) => {
                                      try {
                                        (e.port && (await v(e.port)),
                                          e.bluetoothDevice?.gatt &&
                                            e.bluetoothDevice.gatt.disconnect(),
                                          o(l.filter((t) => t.id !== e.id)),
                                          r.success("Printer disconnected"));
                                      } catch (t) {
                                        r.error("Failed to disconnect printer");
                                      }
                                    })(e),
                                  className:
                                    "px-4 py-2 rounded-lg bg-red-500/20 text-red-400 text-sm font-medium hover:bg-red-500/30 transition touch-manipulation",
                                  children: "Disconnect",
                                }),
                              ],
                            }),
                          ],
                        }),
                      },
                      e.id,
                    ),
                  ),
                }),
        ],
      }),
      n.jsxs("div", {
        className: "theme-surface rounded-xl border theme-border p-4",
        children: [
          n.jsx("h4", {
            className: "font-semibold theme-text-primary mb-2",
            children: "About Printer Connections",
          }),
          n.jsxs("ul", {
            className:
              "text-sm theme-text-secondary space-y-1 list-disc list-inside",
            children: [
              n.jsx("li", {
                children:
                  "USB printers: Requires Chrome/Edge browser with Web Serial API support",
              }),
              n.jsx("li", {
                children:
                  "Bluetooth printers: Requires HTTPS or localhost, Chrome/Edge on desktop or Android",
              }),
              n.jsx("li", {
                children:
                  "Most USB scanners work automatically as keyboards - no setup needed",
              }),
              n.jsx("li", {
                children:
                  "Printers are registered per location and can be used by all staff",
              }),
            ],
          }),
        ],
      }),
    ],
  });
}
function I() {
  const { accessToken: i, user: l } = s(),
    [o, c] = a.useState({
      companyName: "",
      logoUrl: "",
      address: "",
      phone: "",
      email: "",
      website: "",
      headerInfo: "",
      footerMessage: "Thank you for your purchase!",
    }),
    [d, m] = a.useState(!1),
    [x, h] = a.useState(!1),
    [p, u] = a.useState(!1),
    [y, b] = a.useState(null),
    f = a.useCallback(async () => {
      if (i) {
        m(!0);
        try {
          const s = await e.get(`${t}/api/v1/customization`, {
            headers: { Authorization: `Bearer ${i}` },
          });
          (c(s.data), s.data.logoUrl && b(s.data.logoUrl));
        } catch (s) {
          404 !== s.response?.status &&
            r.error("Failed to load customization settings");
        } finally {
          m(!1);
        }
      }
    }, [i]);
  a.useEffect(() => {
    f();
  }, [f]);
  return d
    ? n.jsxs("div", {
        className: "text-center py-8",
        children: [
          n.jsx("div", {
            className:
              "inline-block h-6 w-6 animate-spin rounded-full border-2 border-sky-400 border-t-transparent",
          }),
          n.jsx("p", {
            className: "theme-text-secondary mt-2 text-sm",
            children: "Loading customization settings...",
          }),
        ],
      })
    : n.jsxs("form", {
        onSubmit: async (s) => {
          if ((s.preventDefault(), i)) {
            h(!0);
            try {
              (await e.put(`${t}/api/v1/customization`, o, {
                headers: { Authorization: `Bearer ${i}` },
              }),
                r.success("Customization settings saved successfully"));
            } catch (a) {
              r.error(
                a.response?.data?.message ||
                  "Failed to save customization settings",
              );
            } finally {
              h(!1);
            }
          }
        },
        className: "space-y-4 sm:space-y-6",
        children: [
          n.jsxs("div", {
            className: "grid gap-4 sm:gap-6 md:grid-cols-2",
            children: [
              n.jsxs("div", {
                className: "md:col-span-2",
                children: [
                  n.jsxs("label", {
                    className:
                      "theme-text-secondary mb-2 block text-sm font-medium",
                    children: [
                      "Institution/Company Name ",
                      n.jsx("span", {
                        className: "text-rose-400",
                        children: "*",
                      }),
                    ],
                  }),
                  n.jsx("input", {
                    type: "text",
                    value: o.companyName,
                    onChange: (e) => c({ ...o, companyName: e.target.value }),
                    placeholder: "Enter your company or institution name",
                    className:
                      "theme-surface w-full rounded-xl border px-4 py-3 text-sm theme-text-primary focus:border-sky-400 focus:outline-none",
                    required: !0,
                  }),
                  n.jsx("p", {
                    className: "theme-text-secondary mt-1 text-xs",
                    children:
                      "This will appear at the top of receipts, above the branch name.",
                  }),
                ],
              }),
              n.jsxs("div", {
                className: "md:col-span-2",
                children: [
                  n.jsx("label", {
                    className:
                      "theme-text-secondary mb-2 block text-sm font-medium",
                    children: "Company Logo",
                  }),
                  n.jsxs("div", {
                    className: "space-y-3",
                    children: [
                      n.jsxs("div", {
                        className: "flex flex-col sm:flex-row gap-3",
                        children: [
                          n.jsxs("label", {
                            className: "flex-1 cursor-pointer",
                            children: [
                              n.jsx("input", {
                                type: "file",
                                accept: "image/*",
                                onChange: async (s) => {
                                  const a = s.target.files?.[0];
                                  if (a)
                                    if (a.type.startsWith("image/"))
                                      if (a.size > 5242880)
                                        r.error(
                                          "Image size must be less than 5MB",
                                        );
                                      else {
                                        u(!0);
                                        try {
                                          const s = new FormData();
                                          (s.append("file", a),
                                            s.append("folder", "logos"),
                                            s.append(
                                              "tenantId",
                                              l?.tenantId || "",
                                            ));
                                          const n = (
                                              await e.post(
                                                `${t}/api/v1/upload`,
                                                s,
                                                {
                                                  headers: {
                                                    Authorization: `Bearer ${i}`,
                                                  },
                                                },
                                              )
                                            ).data.url,
                                            d = { ...o, logoUrl: n };
                                          (c(d),
                                            b(n),
                                            await e.put(
                                              `${t}/api/v1/customization`,
                                              d,
                                              {
                                                headers: {
                                                  Authorization: `Bearer ${i}`,
                                                },
                                              },
                                            ),
                                            r.success(
                                              "Logo uploaded and saved successfully",
                                            ));
                                        } catch (n) {
                                          r.error(
                                            n.response?.data?.message ||
                                              "Failed to upload logo",
                                          );
                                        } finally {
                                          (u(!1), (s.target.value = ""));
                                        }
                                      }
                                    else r.error("Please select an image file");
                                },
                                disabled: p,
                                className: "hidden",
                              }),
                              n.jsx("div", {
                                className:
                                  "theme-surface flex items-center justify-center gap-2 rounded-xl border border-dashed px-4 py-3 text-sm transition hover:border-sky-400 hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-50 touch-manipulation min-h-[44px]",
                                children: p
                                  ? n.jsxs(n.Fragment, {
                                      children: [
                                        n.jsx("div", {
                                          className:
                                            "h-4 w-4 animate-spin rounded-full border-2 border-sky-400 border-t-transparent",
                                        }),
                                        n.jsx("span", {
                                          className: "theme-text-secondary",
                                          children: "Uploading...",
                                        }),
                                      ],
                                    })
                                  : n.jsxs(n.Fragment, {
                                      children: [
                                        n.jsx("span", {
                                          className: "text-lg",
                                          children: "📁",
                                        }),
                                        n.jsx("span", {
                                          className:
                                            "theme-text-primary font-medium",
                                          children: "Choose Image File",
                                        }),
                                      ],
                                    }),
                              }),
                            ],
                          }),
                          n.jsx("div", {
                            className: "flex-1",
                            children: n.jsx("input", {
                              type: "url",
                              value: o.logoUrl,
                              onChange: (e) => {
                                (c({ ...o, logoUrl: e.target.value }),
                                  b(e.target.value));
                              },
                              placeholder: "Or enter logo URL",
                              className:
                                "theme-surface w-full rounded-xl border px-4 py-3 text-sm theme-text-primary focus:border-sky-400 focus:outline-none",
                            }),
                          }),
                        ],
                      }),
                      n.jsx("p", {
                        className: "theme-text-secondary text-xs",
                        children:
                          "Upload an image file (PNG, JPG, etc.) or enter a URL. Max file size: 5MB. The logo will appear at the top of receipts.",
                      }),
                      (y || o.logoUrl) &&
                        n.jsxs("div", {
                          className: "mt-3",
                          children: [
                            n.jsx("p", {
                              className:
                                "theme-text-secondary mb-2 text-xs font-medium",
                              children: "Logo Preview:",
                            }),
                            n.jsx("div", {
                              className:
                                "inline-block rounded-lg border border-white/10 bg-white/5 p-2",
                              children: n.jsx("img", {
                                src: y || o.logoUrl,
                                alt: "Logo preview",
                                className:
                                  "max-h-20 max-w-full rounded object-contain",
                                onError: (e) => {
                                  ((e.target.style.display = "none"),
                                    r.error(
                                      "Failed to load logo image. Please check the URL or upload a new image.",
                                    ));
                                },
                              }),
                            }),
                            o.logoUrl &&
                              n.jsx("button", {
                                type: "button",
                                onClick: async () => {
                                  try {
                                    const s = { ...o, logoUrl: "" };
                                    (c(s),
                                      b(null),
                                      i &&
                                        (await e.put(
                                          `${t}/api/v1/customization`,
                                          s,
                                          {
                                            headers: {
                                              Authorization: `Bearer ${i}`,
                                            },
                                          },
                                        ),
                                        r.success(
                                          "Logo removed successfully",
                                        )));
                                  } catch (s) {
                                    r.error("Failed to remove logo");
                                  }
                                },
                                className:
                                  "theme-text-secondary mt-2 text-xs underline hover:text-sky-400",
                                children: "Remove logo",
                              }),
                          ],
                        }),
                    ],
                  }),
                ],
              }),
              n.jsxs("div", {
                className: "md:col-span-2",
                children: [
                  n.jsx("label", {
                    className:
                      "theme-text-secondary mb-2 block text-sm font-medium",
                    children: "Address",
                  }),
                  n.jsx("input", {
                    type: "text",
                    value: o.address || "",
                    onChange: (e) => c({ ...o, address: e.target.value }),
                    placeholder: "123 Main Street, City, State, ZIP",
                    className:
                      "theme-surface w-full rounded-xl border px-4 py-3 text-sm theme-text-primary focus:border-sky-400 focus:outline-none",
                  }),
                  n.jsx("p", {
                    className: "theme-text-secondary mt-1 text-xs",
                    children:
                      "Company address that will appear in the receipt header.",
                  }),
                ],
              }),
              n.jsxs("div", {
                children: [
                  n.jsx("label", {
                    className:
                      "theme-text-secondary mb-2 block text-sm font-medium",
                    children: "Phone Number",
                  }),
                  n.jsx("input", {
                    type: "text",
                    value: o.phone || "",
                    onChange: (e) => c({ ...o, phone: e.target.value }),
                    placeholder: "+1 (555) 123-4567",
                    className:
                      "theme-surface w-full rounded-xl border px-4 py-3 text-sm theme-text-primary focus:border-sky-400 focus:outline-none",
                  }),
                  n.jsx("p", {
                    className: "theme-text-secondary mt-1 text-xs",
                    children: "Contact phone number for receipts.",
                  }),
                ],
              }),
              n.jsxs("div", {
                children: [
                  n.jsx("label", {
                    className:
                      "theme-text-secondary mb-2 block text-sm font-medium",
                    children: "Email",
                  }),
                  n.jsx("input", {
                    type: "email",
                    value: o.email || "",
                    onChange: (e) => c({ ...o, email: e.target.value }),
                    placeholder: "contact@company.com",
                    className:
                      "theme-surface w-full rounded-xl border px-4 py-3 text-sm theme-text-primary focus:border-sky-400 focus:outline-none",
                  }),
                  n.jsx("p", {
                    className: "theme-text-secondary mt-1 text-xs",
                    children: "Contact email for receipts.",
                  }),
                ],
              }),
              n.jsxs("div", {
                children: [
                  n.jsx("label", {
                    className:
                      "theme-text-secondary mb-2 block text-sm font-medium",
                    children: "Website",
                  }),
                  n.jsx("input", {
                    type: "url",
                    value: o.website || "",
                    onChange: (e) => c({ ...o, website: e.target.value }),
                    placeholder: "https://www.company.com",
                    className:
                      "theme-surface w-full rounded-xl border px-4 py-3 text-sm theme-text-primary focus:border-sky-400 focus:outline-none",
                  }),
                  n.jsx("p", {
                    className: "theme-text-secondary mt-1 text-xs",
                    children: "Company website URL.",
                  }),
                ],
              }),
              n.jsxs("div", {
                className: "md:col-span-2",
                children: [
                  n.jsx("label", {
                    className:
                      "theme-text-secondary mb-2 block text-sm font-medium",
                    children: "Additional Header Information",
                  }),
                  n.jsx("input", {
                    type: "text",
                    value: o.headerInfo || "",
                    onChange: (e) => c({ ...o, headerInfo: e.target.value }),
                    placeholder: "Registration No: ABC123 | Tax ID: 123456789",
                    className:
                      "theme-surface w-full rounded-xl border px-4 py-3 text-sm theme-text-primary focus:border-sky-400 focus:outline-none",
                  }),
                  n.jsx("p", {
                    className: "theme-text-secondary mt-1 text-xs",
                    children:
                      "Additional information to display in receipt header (e.g., registration number, tax ID, etc.).",
                  }),
                ],
              }),
              n.jsxs("div", {
                className: "md:col-span-2",
                children: [
                  n.jsx("label", {
                    className:
                      "theme-text-secondary mb-2 block text-sm font-medium",
                    children: "Footer Message",
                  }),
                  n.jsx("input", {
                    type: "text",
                    value: o.footerMessage,
                    onChange: (e) => c({ ...o, footerMessage: e.target.value }),
                    placeholder: "Thank you for your purchase!",
                    className:
                      "theme-surface w-full rounded-xl border px-4 py-3 text-sm theme-text-primary focus:border-sky-400 focus:outline-none",
                  }),
                  n.jsx("p", {
                    className: "theme-text-secondary mt-1 text-xs",
                    children:
                      "This message will appear at the bottom of receipts.",
                  }),
                ],
              }),
            ],
          }),
          n.jsxs("div", {
            className: "flex flex-col sm:flex-row gap-3 pt-2",
            children: [
              n.jsx("button", {
                type: "submit",
                disabled: x,
                className:
                  "rounded-full bg-gradient-to-r from-sky-400 to-blue-500 px-6 py-3 text-sm font-semibold text-white transition hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-50 touch-manipulation",
                children: x ? "Saving..." : "Save Customization",
              }),
              n.jsx("button", {
                type: "button",
                onClick: f,
                disabled: x,
                className:
                  "theme-chip rounded-full border px-6 py-3 text-sm font-semibold transition hover:border-sky-400 disabled:opacity-50 touch-manipulation",
                children: "Reset",
              }),
            ],
          }),
        ],
      });
}
function P({ title: e, description: t, children: s }) {
  return n.jsxs("section", {
    className:
      "theme-card rounded-xl sm:rounded-2xl lg:rounded-3xl border p-4 sm:p-5 lg:p-6 backdrop-blur-xl",
    children: [
      n.jsxs("header", {
        className: "mb-3 sm:mb-4 space-y-1",
        children: [
          n.jsx("h2", {
            className:
              "theme-text-primary text-base sm:text-lg lg:text-xl font-semibold",
            children: e,
          }),
          t &&
            n.jsx("p", {
              className: "theme-text-secondary text-xs sm:text-sm",
              children: t,
            }),
        ],
      }),
      s,
    ],
  });
}
function B() {
  const {
      user: x,
      tenant: h,
      accessToken: p,
    } = s((e) => ({
      user: e.user,
      tenant: e.tenant,
      accessToken: e.accessToken,
    })),
    [u, y] = a.useState(""),
    [b, f] = a.useState(""),
    [g, j] = a.useState(""),
    [N, v] = a.useState(!1),
    [B, A] = a.useState(!1),
    [T, U] = a.useState(!1),
    [$, L] = a.useState([]),
    [K, R] = a.useState({
      name: "",
      email: "",
      role: "cashier",
      locationId: "",
      pin: "",
    }),
    [D, F] = a.useState(!1),
    [z, E] = a.useState(!1),
    M = ["monnify", "opay", "palmpay", "firstbank"],
    [_, q] = a.useState("monnify"),
    [O, W] = a.useState({
      monnify: {
        enabled: !1,
        apiKey: "",
        secretKey: "",
        contractCode: "",
        merchantId: "",
        terminalId: "",
        webhookSecret: "",
      },
      opay: {
        enabled: !1,
        apiKey: "",
        secretKey: "",
        contractCode: "",
        merchantId: "",
        terminalId: "",
        webhookSecret: "",
      },
      palmpay: {
        enabled: !1,
        apiKey: "",
        secretKey: "",
        contractCode: "",
        merchantId: "",
        terminalId: "",
        webhookSecret: "",
      },
      firstbank: {
        enabled: !1,
        apiKey: "",
        secretKey: "",
        contractCode: "",
        merchantId: "",
        terminalId: "",
        webhookSecret: "",
      },
    }),
    [G, Q] = a.useState(!1),
    [H, Z] = a.useState(!1),
    [V, Y] = a.useState({ description: "", percentage: "", enabled: !1 }),
    [J, X] = a.useState(!1),
    [ee, te] = a.useState(null),
    [se, ae] = a.useState(""),
    [re, ne] = a.useState(""),
    [ie, le] = a.useState(!1),
    [oe, ce] = a.useState(
      localStorage.getItem("printProxyUrl") || "ws://localhost:8080",
    ),
    [de, me] = a.useState([]),
    [xe, he] = a.useState(!1),
    [pe, ue] = a.useState({
      id: "default-printer",
      type: "serial",
      path: "",
      host: "",
      port: "9100",
      baudRate: "9600",
    }),
    [ye, be] = a.useState(!1),
    [fe, ge] = a.useState(null),
    [je, Ne] = a.useState([]),
    [ve, we] = a.useState(!1),
    [ke, Ce] = a.useState(x?.locationId || ""),
    [Se, Ie] = a.useState(!1),
    [Pe, Be] = a.useState(!1),
    [Ae, Te] = a.useState(null),
    [Ue, $e] = a.useState({
      name: "",
      address: "",
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
    }),
    { devices: Le } = d(),
    [Ke, Re] = a.useState(!1),
    [De, Fe] = a.useState([]),
    ze = a.useMemo(
      () => "admin" === x?.role || x?.isPlatformAdmin,
      [x?.role, x?.isPlatformAdmin],
    );
  a.useEffect(() => {
    (async () => {
      if (ze) {
        A(!0);
        try {
          const s = await (async function () {
            const { data: s } = await e.get(`${t}/api/v1/users`);
            return s;
          })();
          L(s);
        } catch (s) {
          r.error(s?.response?.data?.message || "Unable to load users");
        } finally {
          A(!1);
        }
      }
    })();
  }, [ze]);
  const Ee = a.useCallback(async () => {
    if (ze) {
      he(!0);
      try {
        const e = await c.listPrinters();
        me(e);
      } catch (e) {
      } finally {
        he(!1);
      }
    }
  }, [ze]);
  a.useEffect(() => {
    if (!ze) return void ge(null);
    (async () => {
      try {
        const e = new Promise((e) => {
            setTimeout(() => e(!1), 3e3);
          }),
          t = c.isAvailable().catch(() => !1),
          s = await Promise.race([t, e]);
        (ge(s), s && Ee());
      } catch {
        ge(!1);
      }
    })();
  }, [oe, ze, Ee]);
  const Me = a.useCallback((e) => {
      const t = e.activeGateway || "monnify";
      q(t);
      const s = e.gateways || {};
      W({
        monnify: {
          enabled: s.monnify?.enabled ?? e.monnifyEnabled ?? !1,
          apiKey: s.monnify?.apiKey ?? e.monnifyApiKey ?? "",
          secretKey: s.monnify?.secretKey ?? e.monnifySecretKey ?? "",
          contractCode: s.monnify?.contractCode ?? e.monnifyContractCode ?? "",
          merchantId: s.monnify?.merchantId ?? "",
          terminalId: s.monnify?.terminalId ?? "",
          webhookSecret:
            s.monnify?.webhookSecret ?? e.monnifyWebhookSecret ?? "",
        },
        opay: {
          enabled: s.opay?.enabled ?? !1,
          apiKey: s.opay?.apiKey ?? "",
          secretKey: s.opay?.secretKey ?? "",
          contractCode: s.opay?.contractCode ?? "",
          merchantId: s.opay?.merchantId ?? "",
          terminalId: s.opay?.terminalId ?? "",
          webhookSecret: s.opay?.webhookSecret ?? "",
        },
        palmpay: {
          enabled: s.palmpay?.enabled ?? !1,
          apiKey: s.palmpay?.apiKey ?? "",
          secretKey: s.palmpay?.secretKey ?? "",
          contractCode: s.palmpay?.contractCode ?? "",
          merchantId: s.palmpay?.merchantId ?? "",
          terminalId: s.palmpay?.terminalId ?? "",
          webhookSecret: s.palmpay?.webhookSecret ?? "",
        },
        firstbank: {
          enabled: s.firstbank?.enabled ?? !1,
          apiKey: s.firstbank?.apiKey ?? "",
          secretKey: s.firstbank?.secretKey ?? "",
          contractCode: s.firstbank?.contractCode ?? "",
          merchantId: s.firstbank?.merchantId ?? "",
          terminalId: s.firstbank?.terminalId ?? "",
          webhookSecret: s.firstbank?.webhookSecret ?? "",
        },
      });
    }, []),
    _e = a.useCallback((e) => {
      Y({
        description: e?.description || "",
        percentage: null != e?.percentage ? e.percentage.toString() : "",
        enabled: Boolean(e?.enabled),
      });
    }, []);
  (a.useEffect(() => {
    (async () => {
      if (ze) {
        F(!0);
        try {
          const e = await C.getPaymentSettings();
          Me(e);
        } catch (e) {
        } finally {
          F(!1);
        }
      }
    })();
  }, [ze, Me]),
    a.useEffect(() => {
      (async () => {
        if (ze) {
          Q(!0);
          try {
            const s = await e.get(`${t}/api/v1/tax-settings`, {
              headers: { Authorization: `Bearer ${p}` },
            });
            _e(s.data);
          } catch (s) {
          } finally {
            Q(!1);
          }
        }
      })();
    }, [ze, p, _e]),
    a.useEffect(() => {
      let s = !1;
      return (
        (async () => {
          if (p) {
            we(!0);
            try {
              const a = await e.get(`${t}/api/v1/locations`, {
                headers: { Authorization: `Bearer ${p}` },
                timeout: 2e4,
              });
              s || Ne(a.data || []);
            } catch (a) {
              s || Ne([]);
            } finally {
              s || we(!1);
            }
          }
        })(),
        () => {
          s = !0;
        }
      );
    }, [p]),
    a.useEffect(() => {
      Ce(x?.locationId || "");
    }, [x?.locationId]),
    a.useEffect(() => {
      0 !== je.length &&
        (K.locationId || R((e) => ({ ...e, locationId: je[0].id })));
    }, [je, K.locationId]),
    a.useEffect(() => {
      if (!ze) return void Fe([]);
      (async () => {
        if (p) {
          Re(!0);
          try {
            const e = await m(x?.locationId);
            Fe(e);
          } catch (e) {
          } finally {
            Re(!1);
          }
        }
      })();
    }, [p, x?.locationId, ze]));
  const qe = async () => {
      if (ee)
        if (!se || se.length < 4 || se.length > 64)
          r.error("PIN must be between 4 and 64 characters");
        else if (se === re) {
          le(!0);
          try {
            (await (async function (s, a) {
              await e.patch(`${t}/api/v1/users/${s}/reset-pin`, { pin: a });
            })(ee.id, se),
              r.success(`PIN reset successfully for ${ee.name}`),
              X(!1),
              te(null),
              ae(""),
              ne(""));
          } catch (s) {
            r.error(s?.response?.data?.message || "Unable to reset PIN");
          } finally {
            le(!1);
          }
        } else r.error("PINs do not match");
    },
    Oe = async (s) => {
      if (window.confirm(`Delete user ${s.name}? This cannot be undone.`))
        try {
          (await (async function (s) {
            await e.delete(`${t}/api/v1/users/${s}`);
          })(s.id),
            L((e) => e.filter((e) => e.id !== s.id)),
            r.success(`Deleted user ${s.name}`));
        } catch (a) {
          r.error(a?.response?.data?.message || "Unable to delete user");
        }
    },
    [We, Ge] = a.useState("general"),
    Qe = [
      { id: "general", label: "General", icon: "⚙️" },
      { id: "receipts", label: "Receipts", icon: "🧾" },
      ...(ze ? [{ id: "payments", label: "Payments", icon: "💳" }] : []),
      ...(ze ? [{ id: "users", label: "Users & Locations", icon: "👥" }] : []),
      { id: "devices", label: "Devices", icon: "🔌" },
    ];
  return n.jsxs("div", {
    className:
      "theme-background min-h-screen w-full overflow-x-hidden page-with-nav",
    children: [
      n.jsxs("div", {
        className:
          "relative mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-4 sm:gap-6 lg:gap-8 px-3 sm:px-4 lg:px-6 py-4 sm:py-6 lg:py-10",
        children: [
          n.jsxs("div", {
            className: "flex items-start gap-3 sm:gap-4",
            children: [
              n.jsx(i, {
                size: 40,
                backgroundClassName: "bg-white/90 dark:bg-white/10",
                className:
                  "ring-1 ring-slate-200/40 dark:ring-white/10 flex-shrink-0 sm:w-[56px] sm:h-[56px]",
              }),
              n.jsxs("div", {
                className: "space-y-1 sm:space-y-2 min-w-0 flex-1",
                children: [
                  n.jsx("h1", {
                    className:
                      "theme-text-primary text-xl sm:text-2xl lg:text-3xl font-semibold tracking-tight",
                    children: "Settings",
                  }),
                  n.jsx("p", {
                    className: "theme-text-secondary text-xs sm:text-sm",
                    children:
                      "Manage your account, company profile, and workspace preferences.",
                  }),
                ],
              }),
            ],
          }),
          n.jsx("div", {
            className:
              "theme-card rounded-xl sm:rounded-2xl border p-2 sm:p-3 backdrop-blur-xl",
            children: n.jsx("div", {
              className: "flex flex-wrap gap-2 sm:gap-3 overflow-x-auto",
              children: Qe.map((e) =>
                n.jsxs(
                  "button",
                  {
                    onClick: () => Ge(e.id),
                    className:
                      "flex items-center gap-2 rounded-lg px-4 sm:px-5 py-2 sm:py-2.5 text-xs sm:text-sm font-semibold transition-all touch-manipulation min-h-[44px] " +
                      (We === e.id
                        ? "bg-sky-500/20 text-sky-400 ring-1 ring-sky-500/30"
                        : "text-slate-400 hover:bg-white/5 hover:text-slate-300"),
                    children: [
                      n.jsx("span", {
                        className: "text-base sm:text-lg",
                        children: e.icon,
                      }),
                      n.jsx("span", { children: e.label }),
                    ],
                  },
                  e.id,
                ),
              ),
            }),
          }),
          n.jsxs("div", {
            className: "space-y-4 sm:space-y-6",
            children: [
              "general" === We &&
                n.jsxs(n.Fragment, {
                  children: [
                    n.jsx(P, {
                      title: "My Location",
                      description:
                        "Set your location for checkout. This is required to process orders.",
                      children: n.jsx("div", {
                        className: "space-y-4",
                        children: ve
                          ? n.jsxs("div", {
                              className: "text-center py-8",
                              children: [
                                n.jsx("div", {
                                  className:
                                    "inline-block h-6 w-6 animate-spin rounded-full border-2 border-sky-400 border-t-transparent",
                                }),
                                n.jsx("p", {
                                  className:
                                    "theme-text-secondary mt-2 text-sm",
                                  children: "Loading locations...",
                                }),
                              ],
                            })
                          : 0 === je.length
                            ? n.jsxs("div", {
                                className:
                                  "rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4",
                                children: [
                                  n.jsx("p", {
                                    className:
                                      "theme-text-primary text-sm font-semibold text-amber-400 mb-2",
                                    children: "⚠️ No Locations Available",
                                  }),
                                  n.jsx("p", {
                                    className: "theme-text-secondary text-xs",
                                    children:
                                      "No locations have been created for your tenant. Please contact your administrator to create a location.",
                                  }),
                                ],
                              })
                            : n.jsxs(n.Fragment, {
                                children: [
                                  n.jsxs("div", {
                                    children: [
                                      n.jsx("label", {
                                        className:
                                          "theme-text-primary mb-2 block text-sm font-medium",
                                        children: "Select Location",
                                      }),
                                      n.jsxs("select", {
                                        value: ke,
                                        onChange: (e) => Ce(e.target.value),
                                        className:
                                          "theme-text-primary w-full rounded-xl border border-white/20 bg-transparent px-4 py-2 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-400/20",
                                        children: [
                                          n.jsx("option", {
                                            value: "",
                                            children:
                                              "-- No Location Selected --",
                                          }),
                                          je.map((e) =>
                                            n.jsxs(
                                              "option",
                                              {
                                                value: e.id,
                                                children: [
                                                  e.name,
                                                  " ",
                                                  e.address
                                                    ? `(${e.address})`
                                                    : "",
                                                ],
                                              },
                                              e.id,
                                            ),
                                          ),
                                        ],
                                      }),
                                      !x?.locationId &&
                                        n.jsx("p", {
                                          className:
                                            "theme-text-secondary mt-2 text-xs text-amber-400",
                                          children:
                                            "⚠️ Location is required to process orders. Please select a location.",
                                        }),
                                    ],
                                  }),
                                  n.jsx("button", {
                                    onClick: async () => {
                                      if (p) {
                                        Ie(!0);
                                        try {
                                          (await e.patch(
                                            `${t}/api/v1/users/me/location`,
                                            { locationId: ke || void 0 },
                                            {
                                              headers: {
                                                Authorization: `Bearer ${p}`,
                                              },
                                            },
                                          ),
                                            r.success(
                                              "Location updated successfully",
                                            ),
                                            x &&
                                              s.setState({
                                                user: {
                                                  ...x,
                                                  locationId: ke || void 0,
                                                },
                                              }));
                                        } catch (a) {
                                          r.error(
                                            a.response?.data?.message ||
                                              "Failed to update location",
                                          );
                                        } finally {
                                          Ie(!1);
                                        }
                                      } else r.error("Not authenticated");
                                    },
                                    disabled:
                                      Se || ke === (x?.locationId || ""),
                                    className:
                                      "w-full rounded-full bg-gradient-to-r from-sky-400 to-blue-500 px-6 py-2 font-semibold text-white transition hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-50",
                                    children: Se
                                      ? "Updating..."
                                      : "Save Location",
                                  }),
                                  x?.locationId &&
                                    n.jsx("div", {
                                      className:
                                        "rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3",
                                      children: n.jsxs("p", {
                                        className:
                                          "theme-text-primary text-sm font-semibold text-emerald-400",
                                        children: [
                                          "✓ Current Location:",
                                          " ",
                                          je.find((e) => e.id === x.locationId)
                                            ?.name || x.locationId,
                                        ],
                                      }),
                                    }),
                                ],
                              }),
                      }),
                    }),
                    n.jsx(P, {
                      title: "Security",
                      description:
                        "Keep your point-of-sale secure by rotating staff PINs regularly.",
                      children: n.jsxs("form", {
                        className: "space-y-4",
                        onSubmit: async (s) => {
                          if ((s.preventDefault(), u && b && g))
                            if (b === g)
                              if (b.length < 4 || b.length > 64)
                                r.error(
                                  "PIN must be between 4 and 64 characters",
                                );
                              else
                                try {
                                  (v(!0),
                                    await (async function (s) {
                                      await e.patch(
                                        `${t}/api/v1/users/me/change-pin`,
                                        s,
                                      );
                                    })({ currentPin: u, newPin: b }),
                                    r.success("PIN updated"),
                                    y(""),
                                    f(""),
                                    j(""));
                                } catch (a) {
                                  r.error(
                                    a?.response?.data?.message ||
                                      "Unable to update PIN",
                                  );
                                } finally {
                                  v(!1);
                                }
                            else
                              r.error("New PIN and confirmation do not match");
                          else r.error("Fill in all fields");
                        },
                        children: [
                          n.jsxs("div", {
                            className: "grid gap-4 md:grid-cols-3",
                            children: [
                              n.jsxs("div", {
                                className: "flex flex-col gap-2",
                                children: [
                                  n.jsx("label", {
                                    htmlFor: "current-pin",
                                    className:
                                      "theme-text-secondary text-sm font-medium",
                                    children: "Current PIN",
                                  }),
                                  n.jsx("input", {
                                    id: "current-pin",
                                    type: "password",
                                    value: u,
                                    onChange: (e) => y(e.target.value),
                                    className:
                                      "theme-surface rounded-2xl border px-4 py-3 text-center text-lg outline-none focus:ring-2 focus:ring-sky-400",
                                    maxLength: 64,
                                    autoComplete: "current-password",
                                    required: !0,
                                  }),
                                ],
                              }),
                              n.jsxs("div", {
                                className: "flex flex-col gap-2",
                                children: [
                                  n.jsx("label", {
                                    htmlFor: "new-pin",
                                    className:
                                      "theme-text-secondary text-sm font-medium",
                                    children: "New PIN",
                                  }),
                                  n.jsx("input", {
                                    id: "new-pin",
                                    type: "password",
                                    value: b,
                                    onChange: (e) => f(e.target.value),
                                    className:
                                      "theme-surface rounded-2xl border px-4 py-3 text-center text-lg outline-none focus:ring-2 focus:ring-sky-400",
                                    maxLength: 64,
                                    autoComplete: "new-password",
                                    required: !0,
                                  }),
                                ],
                              }),
                              n.jsxs("div", {
                                className: "flex flex-col gap-2",
                                children: [
                                  n.jsx("label", {
                                    htmlFor: "confirm-pin",
                                    className:
                                      "theme-text-secondary text-sm font-medium",
                                    children: "Confirm PIN",
                                  }),
                                  n.jsx("input", {
                                    id: "confirm-pin",
                                    type: "password",
                                    value: g,
                                    onChange: (e) => j(e.target.value),
                                    className:
                                      "theme-surface rounded-2xl border px-4 py-3 text-center text-lg outline-none focus:ring-2 focus:ring-sky-400",
                                    maxLength: 64,
                                    required: !0,
                                  }),
                                ],
                              }),
                            ],
                          }),
                          n.jsx("button", {
                            type: "submit",
                            disabled: N,
                            className:
                              "inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-emerald-400 via-emerald-500 to-emerald-400 px-6 py-3 text-sm font-semibold text-emerald-950 shadow-[0_25px_45px_-30px_rgba(16,185,129,0.65)] transition hover:shadow-[0_30px_60px_-35px_rgba(16,185,129,0.8)] disabled:cursor-not-allowed disabled:opacity-50",
                            children: N ? "Updating..." : "Update PIN",
                          }),
                        ],
                      }),
                    }),
                    n.jsx(P, {
                      title: "Company profile",
                      description:
                        "Customize how your company appears across receipts, reports, and internal dashboards.",
                      children: n.jsxs("div", {
                        className: "grid gap-4 md:grid-cols-2",
                        children: [
                          n.jsxs("div", {
                            className: "flex flex-col gap-2",
                            children: [
                              n.jsx("label", {
                                htmlFor: "company-name",
                                className:
                                  "theme-text-secondary text-sm font-medium",
                                children: "Company name",
                              }),
                              n.jsx("input", {
                                id: "company-name",
                                type: "text",
                                value: h?.name ?? "",
                                placeholder: "Your company name",
                                className:
                                  "theme-surface rounded-2xl border px-4 py-3 outline-none focus:ring-2 focus:ring-sky-400",
                                disabled: !0,
                              }),
                              n.jsxs("p", {
                                className: "theme-text-secondary text-xs",
                                children: [
                                  "Slug:",
                                  " ",
                                  n.jsx("span", {
                                    className:
                                      "theme-text-primary font-medium lowercase",
                                    children: h?.slug ?? "n/a",
                                  }),
                                ],
                              }),
                            ],
                          }),
                          n.jsxs("div", {
                            className: "flex flex-col gap-2",
                            children: [
                              n.jsx("label", {
                                className:
                                  "theme-text-secondary text-sm font-medium",
                                children: "Subscription plan",
                              }),
                              n.jsxs("div", {
                                className:
                                  "theme-surface rounded-2xl border px-4 py-3",
                                children: [
                                  n.jsxs("p", {
                                    className:
                                      "theme-text-primary text-sm font-semibold capitalize",
                                    children: [
                                      h?.plan ?? "unassigned",
                                      " plan",
                                    ],
                                  }),
                                  n.jsxs("div", {
                                    className:
                                      "theme-text-secondary mt-1 text-xs space-y-1",
                                    children: [
                                      n.jsxs("p", {
                                        children: [
                                          "Status:",
                                          " ",
                                          n.jsx("span", {
                                            className:
                                              "theme-text-primary font-semibold capitalize",
                                            children: h?.status ?? "pending",
                                          }),
                                        ],
                                      }),
                                      n.jsxs("p", {
                                        children: [
                                          "Seats:",
                                          " ",
                                          n.jsx("span", {
                                            className:
                                              "theme-text-primary font-semibold",
                                            children:
                                              void 0 !== h?.seatLimit
                                                ? h.seatLimit
                                                : "unlimited",
                                          }),
                                        ],
                                      }),
                                      h?.billingCycleStart &&
                                        h?.billingCycleEnd &&
                                        n.jsxs("p", {
                                          children: [
                                            "Cycle:",
                                            " ",
                                            n.jsxs("span", {
                                              className:
                                                "theme-text-primary font-medium",
                                              children: [
                                                new Date(
                                                  h.billingCycleStart,
                                                ).toLocaleDateString(),
                                                " ",
                                                "—",
                                                " ",
                                                new Date(
                                                  h.billingCycleEnd,
                                                ).toLocaleDateString(),
                                              ],
                                            }),
                                          ],
                                        }),
                                      n.jsx("p", {
                                        children:
                                          "Licensing management will be enabled soon.",
                                      }),
                                    ],
                                  }),
                                ],
                              }),
                            ],
                          }),
                        ],
                      }),
                    }),
                  ],
                }),
              "receipts" === We &&
                n.jsxs(n.Fragment, {
                  children: [
                    ze &&
                      n.jsx(P, {
                        title: "Receipt Customization",
                        description:
                          "Customize how your receipts appear. Configure company name, logo, and footer message for printed and digital receipts.",
                        children: n.jsx(I, {}),
                      }),
                    ze &&
                      n.jsx(P, {
                        title: "Tax Settings",
                        description:
                          "Configure tax settings for your tenant. Cashiers can toggle tax on/off at checkout.",
                        children: G
                          ? n.jsxs("div", {
                              className: "py-8 text-center",
                              children: [
                                n.jsx("div", {
                                  className:
                                    "inline-block h-8 w-8 animate-spin rounded-full border-4 border-sky-400 border-t-transparent",
                                }),
                                n.jsx("p", {
                                  className:
                                    "theme-text-secondary mt-2 text-sm",
                                  children: "Loading tax settings...",
                                }),
                              ],
                            })
                          : n.jsxs("div", {
                              className: "space-y-4",
                              children: [
                                n.jsxs("div", {
                                  className:
                                    "flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3",
                                  children: [
                                    n.jsxs("div", {
                                      children: [
                                        n.jsx("h3", {
                                          className:
                                            "theme-text-primary text-sm font-semibold",
                                          children: "Enable Tax",
                                        }),
                                        n.jsx("p", {
                                          className:
                                            "theme-text-secondary text-xs",
                                          children:
                                            "When enabled, tax can be applied at checkout (cashiers can toggle it on/off)",
                                        }),
                                      ],
                                    }),
                                    n.jsxs("label", {
                                      className:
                                        "relative inline-flex cursor-pointer items-center",
                                      children: [
                                        n.jsx("input", {
                                          type: "checkbox",
                                          checked: V.enabled,
                                          onChange: (e) =>
                                            Y({
                                              ...V,
                                              enabled: e.target.checked,
                                            }),
                                          className: "peer sr-only",
                                        }),
                                        n.jsx("div", {
                                          className:
                                            "peer h-6 w-11 rounded-full bg-gray-600 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-sky-500 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-sky-300",
                                        }),
                                      ],
                                    }),
                                  ],
                                }),
                                V.enabled &&
                                  n.jsxs("div", {
                                    className:
                                      "space-y-4 rounded-2xl border border-white/10 bg-white/5 p-4",
                                    children: [
                                      n.jsxs("div", {
                                        children: [
                                          n.jsx("label", {
                                            className:
                                              "theme-text-primary mb-2 block text-sm font-medium",
                                            children: "Tax Description",
                                          }),
                                          n.jsx("input", {
                                            type: "text",
                                            value: V.description,
                                            onChange: (e) =>
                                              Y({
                                                ...V,
                                                description: e.target.value,
                                              }),
                                            placeholder:
                                              "e.g., VAT, Sales Tax, GST",
                                            className:
                                              "theme-text-primary w-full rounded-xl border border-white/20 bg-transparent px-4 py-2 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-400/20",
                                          }),
                                          n.jsx("p", {
                                            className:
                                              "theme-text-secondary mt-1 text-xs",
                                            children:
                                              "This name will appear on receipts and at checkout",
                                          }),
                                        ],
                                      }),
                                      n.jsxs("div", {
                                        children: [
                                          n.jsx("label", {
                                            className:
                                              "theme-text-primary mb-2 block text-sm font-medium",
                                            children: "Tax Percentage",
                                          }),
                                          n.jsxs("div", {
                                            className:
                                              "flex items-center gap-2",
                                            children: [
                                              n.jsx("input", {
                                                type: "number",
                                                value: V.percentage,
                                                onChange: (e) =>
                                                  Y({
                                                    ...V,
                                                    percentage: e.target.value,
                                                  }),
                                                placeholder: "7.5",
                                                min: "0",
                                                max: "100",
                                                step: "0.1",
                                                className:
                                                  "theme-text-primary w-full rounded-xl border border-white/20 bg-transparent px-4 py-2 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-400/20",
                                              }),
                                              n.jsx("span", {
                                                className:
                                                  "theme-text-secondary text-sm",
                                                children: "%",
                                              }),
                                            ],
                                          }),
                                          n.jsx("p", {
                                            className:
                                              "theme-text-secondary mt-1 text-xs",
                                            children:
                                              "Enter the tax percentage (e.g., 7.5 for 7.5%)",
                                          }),
                                        ],
                                      }),
                                      n.jsx("div", {
                                        className: "flex gap-3 pt-2",
                                        children: n.jsx("button", {
                                          onClick: async () => {
                                            if (!V.description || !V.percentage)
                                              return void r.error(
                                                "Please fill in tax description and percentage",
                                              );
                                            const s = parseFloat(V.percentage);
                                            if (isNaN(s) || s < 0 || s > 100)
                                              r.error(
                                                "Please enter a valid tax percentage (0-100)",
                                              );
                                            else {
                                              Z(!0);
                                              try {
                                                const a = (
                                                  await e.put(
                                                    `${t}/api/v1/tax-settings`,
                                                    {
                                                      enabled: V.enabled,
                                                      description:
                                                        V.description,
                                                      percentage: s,
                                                    },
                                                    {
                                                      headers: {
                                                        Authorization: `Bearer ${p}`,
                                                      },
                                                    },
                                                  )
                                                ).data;
                                                (_e(a),
                                                  r.success(
                                                    "Tax settings saved successfully",
                                                  ));
                                              } catch (a) {
                                                r.error(
                                                  a?.response?.data?.message ||
                                                    "Failed to save tax settings",
                                                );
                                              } finally {
                                                Z(!1);
                                              }
                                            }
                                          },
                                          disabled: H,
                                          className:
                                            "rounded-full bg-gradient-to-r from-sky-400 via-sky-500 to-sky-400 px-6 py-2 font-semibold text-white shadow-lg transition hover:shadow-sky-900/70 disabled:cursor-not-allowed disabled:opacity-50",
                                          children: H
                                            ? "Saving..."
                                            : "Save Settings",
                                        }),
                                      }),
                                    ],
                                  }),
                              ],
                            }),
                      }),
                  ],
                }),
              "payments" === We &&
                ze &&
                n.jsx(P, {
                  title: "Payment Gateway",
                  description:
                    "Configure payment gateway settings for card and QR code payments.",
                  children: D
                    ? n.jsxs("div", {
                        className: "text-center py-8",
                        children: [
                          n.jsx("div", {
                            className:
                              "inline-block h-8 w-8 animate-spin rounded-full border-4 border-sky-400 border-t-transparent",
                          }),
                          n.jsx("p", {
                            className: "theme-text-secondary mt-2 text-sm",
                            children: "Loading payment settings...",
                          }),
                        ],
                      })
                    : n.jsxs("div", {
                        className: "space-y-4",
                        children: [
                          n.jsxs("div", {
                            className:
                              "flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 md:flex-row md:items-center md:justify-between",
                            children: [
                              n.jsxs("div", {
                                children: [
                                  n.jsx("h3", {
                                    className:
                                      "theme-text-primary text-sm font-semibold",
                                    children: "Active Payment Gateway",
                                  }),
                                  n.jsx("p", {
                                    className: "theme-text-secondary text-xs",
                                    children:
                                      "Choose which provider your tenant will use for card/QR payments.",
                                  }),
                                ],
                              }),
                              n.jsxs("select", {
                                value: _,
                                onChange: (e) => q(e.target.value),
                                className:
                                  "mt-2 w-full rounded-xl border border-white/20 bg-slate-900 px-3 py-2 text-sm text-slate-100 md:mt-0 md:w-64",
                                children: [
                                  n.jsx("option", {
                                    value: "monnify",
                                    children: "Monnify",
                                  }),
                                  n.jsx("option", {
                                    value: "opay",
                                    children: "Opay",
                                  }),
                                  n.jsx("option", {
                                    value: "palmpay",
                                    children: "Palmpay",
                                  }),
                                  n.jsx("option", {
                                    value: "firstbank",
                                    children: "FirstBank",
                                  }),
                                ],
                              }),
                            ],
                          }),
                          (() => {
                            const e = O[_],
                              t = (e) =>
                                W((t) => ({ ...t, [_]: { ...t[_], ...e } })),
                              s = "monnify" === _,
                              a = "opay" === _,
                              i = "palmpay" === _,
                              l = "firstbank" === _,
                              o =
                                "monnify" === _
                                  ? "Monnify"
                                  : "opay" === _
                                    ? "Opay"
                                    : "palmpay" === _
                                      ? "Palmpay"
                                      : "FirstBank";
                            return n.jsxs("div", {
                              className:
                                "space-y-4 rounded-2xl border border-white/10 bg-white/5 p-4",
                              children: [
                                n.jsxs("div", {
                                  className:
                                    "flex items-center justify-between",
                                  children: [
                                    n.jsxs("div", {
                                      children: [
                                        n.jsxs("h3", {
                                          className:
                                            "theme-text-primary text-sm font-semibold",
                                          children: ["Enable ", o, " Payments"],
                                        }),
                                        n.jsxs("p", {
                                          className:
                                            "theme-text-secondary text-xs",
                                          children: [
                                            "When enabled, card and QR payments can be routed through ",
                                            o,
                                            ".",
                                          ],
                                        }),
                                      ],
                                    }),
                                    n.jsxs("label", {
                                      className:
                                        "relative inline-flex cursor-pointer items-center",
                                      children: [
                                        n.jsx("input", {
                                          type: "checkbox",
                                          checked: e.enabled,
                                          onChange: (e) =>
                                            t({ enabled: e.target.checked }),
                                          className: "peer sr-only",
                                        }),
                                        n.jsx("div", {
                                          className:
                                            "peer h-6 w-11 rounded-full bg-gray-600 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-sky-500 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-sky-300",
                                        }),
                                      ],
                                    }),
                                  ],
                                }),
                                e.enabled &&
                                  n.jsxs(n.Fragment, {
                                    children: [
                                      n.jsxs("div", {
                                        children: [
                                          n.jsxs("label", {
                                            className:
                                              "theme-text-primary mb-2 block text-sm font-medium",
                                            children: [o, " API Key"],
                                          }),
                                          n.jsx("input", {
                                            type: "text",
                                            value: e.apiKey,
                                            onChange: (e) =>
                                              t({ apiKey: e.target.value }),
                                            placeholder: "Enter API Key",
                                            className:
                                              "theme-text-primary w-full rounded-xl border border-white/20 bg-transparent px-4 py-2 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-400/20",
                                          }),
                                        ],
                                      }),
                                      n.jsxs("div", {
                                        children: [
                                          n.jsxs("label", {
                                            className:
                                              "theme-text-primary mb-2 block text-sm font-medium",
                                            children: [o, " Secret Key"],
                                          }),
                                          n.jsx("input", {
                                            type: "password",
                                            value: e.secretKey,
                                            onChange: (e) =>
                                              t({ secretKey: e.target.value }),
                                            placeholder: "Enter Secret Key",
                                            className:
                                              "theme-text-primary w-full rounded-xl border border-white/20 bg-transparent px-4 py-2 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-400/20",
                                          }),
                                        ],
                                      }),
                                      s &&
                                        n.jsxs("div", {
                                          children: [
                                            n.jsx("label", {
                                              className:
                                                "theme-text-primary mb-2 block text-sm font-medium",
                                              children: "Monnify Contract Code",
                                            }),
                                            n.jsx("input", {
                                              type: "text",
                                              value: e.contractCode,
                                              onChange: (e) =>
                                                t({
                                                  contractCode: e.target.value,
                                                }),
                                              placeholder:
                                                "Enter Contract Code",
                                              className:
                                                "theme-text-primary w-full rounded-xl border border-white/20 bg-transparent px-4 py-2 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-400/20",
                                            }),
                                          ],
                                        }),
                                      (a || i || l) &&
                                        n.jsxs(n.Fragment, {
                                          children: [
                                            n.jsxs("div", {
                                              children: [
                                                n.jsx("label", {
                                                  className:
                                                    "theme-text-primary mb-2 block text-sm font-medium",
                                                  children: "Merchant ID",
                                                }),
                                                n.jsx("input", {
                                                  type: "text",
                                                  value: e.merchantId,
                                                  onChange: (e) =>
                                                    t({
                                                      merchantId:
                                                        e.target.value,
                                                    }),
                                                  placeholder:
                                                    "Enter Merchant ID",
                                                  className:
                                                    "theme-text-primary w-full rounded-xl border border-white/20 bg-transparent px-4 py-2 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-400/20",
                                                }),
                                              ],
                                            }),
                                            n.jsxs("div", {
                                              children: [
                                                n.jsx("label", {
                                                  className:
                                                    "theme-text-primary mb-2 block text-sm font-medium",
                                                  children: "Terminal ID",
                                                }),
                                                n.jsx("input", {
                                                  type: "text",
                                                  value: e.terminalId,
                                                  onChange: (e) =>
                                                    t({
                                                      terminalId:
                                                        e.target.value,
                                                    }),
                                                  placeholder:
                                                    "Enter Terminal ID",
                                                  className:
                                                    "theme-text-primary w-full rounded-xl border border-white/20 bg-transparent px-4 py-2 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-400/20",
                                                }),
                                              ],
                                            }),
                                          ],
                                        }),
                                      n.jsxs("div", {
                                        children: [
                                          n.jsx("label", {
                                            className:
                                              "theme-text-primary mb-2 block text-sm font-medium",
                                            children:
                                              "Webhook Secret (Optional)",
                                          }),
                                          n.jsx("input", {
                                            type: "password",
                                            value: e.webhookSecret,
                                            onChange: (e) =>
                                              t({
                                                webhookSecret: e.target.value,
                                              }),
                                            placeholder: "Enter webhook secret",
                                            className:
                                              "theme-text-primary w-full rounded-xl border border-white/20 bg-transparent px-4 py-2 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-400/20",
                                          }),
                                        ],
                                      }),
                                      n.jsx("div", {
                                        className: "flex gap-3 pt-2",
                                        children: n.jsx("button", {
                                          onClick: async () => {
                                            if (
                                              "monnify" !== _ ||
                                              (e.apiKey &&
                                                e.secretKey &&
                                                e.contractCode)
                                            ) {
                                              E(!0);
                                              try {
                                                const e = (e, t) => {
                                                    const s = {
                                                      enabled: t.enabled,
                                                    };
                                                    return (
                                                      t.apiKey &&
                                                        !t.apiKey.includes(
                                                          "...",
                                                        ) &&
                                                        (s.apiKey = t.apiKey),
                                                      t.secretKey &&
                                                        !t.secretKey.includes(
                                                          "...",
                                                        ) &&
                                                        (s.secretKey =
                                                          t.secretKey),
                                                      t.contractCode &&
                                                        !t.contractCode.includes(
                                                          "...",
                                                        ) &&
                                                        (s.contractCode =
                                                          t.contractCode),
                                                      t.merchantId &&
                                                        !t.merchantId.includes(
                                                          "...",
                                                        ) &&
                                                        (s.merchantId =
                                                          t.merchantId),
                                                      t.terminalId &&
                                                        !t.terminalId.includes(
                                                          "...",
                                                        ) &&
                                                        (s.terminalId =
                                                          t.terminalId),
                                                      t.webhookSecret &&
                                                        !t.webhookSecret.includes(
                                                          "...",
                                                        ) &&
                                                        (s.webhookSecret =
                                                          t.webhookSecret),
                                                      s
                                                    );
                                                  },
                                                  t = {};
                                                M.forEach((s) => {
                                                  t[s] = e(s, O[s]);
                                                });
                                                const s = O.monnify,
                                                  a = {
                                                    activeGateway: _,
                                                    monnifyEnabled: s.enabled,
                                                    gateways: t,
                                                  },
                                                  n =
                                                    await C.updatePaymentSettings(
                                                      a,
                                                    );
                                                (Me(n),
                                                  r.success(
                                                    "Payment settings saved successfully",
                                                  ));
                                              } catch (t) {
                                                r.error(
                                                  t?.response?.data?.message ||
                                                    "Failed to save payment settings",
                                                );
                                              } finally {
                                                E(!1);
                                              }
                                            } else
                                              r.error(
                                                "Please fill in API Key, Secret Key, and Contract Code",
                                              );
                                          },
                                          disabled: z,
                                          className:
                                            "rounded-full bg-gradient-to-r from-sky-400 via-sky-500 to-sky-400 px-6 py-2 font-semibold text-white shadow-lg transition hover:shadow-sky-900/70 disabled:cursor-not-allowed disabled:opacity-50",
                                          children: z
                                            ? "Saving..."
                                            : "Save Settings",
                                        }),
                                      }),
                                    ],
                                  }),
                              ],
                            });
                          })(),
                        ],
                      }),
                }),
              "users" === We &&
                ze &&
                n.jsxs(n.Fragment, {
                  children: [
                    n.jsx(P, {
                      title: "Location Management",
                      description:
                        "Create and manage store locations. Users can be assigned to specific locations.",
                      children: n.jsxs("div", {
                        className: "space-y-4 sm:space-y-6",
                        children: [
                          n.jsxs("div", {
                            className:
                              "rounded-xl sm:rounded-2xl border border-white/10 bg-white/5 p-3 sm:p-4",
                            children: [
                              n.jsx("h3", {
                                className:
                                  "theme-text-primary mb-3 sm:mb-4 text-xs sm:text-sm font-semibold",
                                children: Ae
                                  ? "Edit Location"
                                  : "Create New Location",
                              }),
                              n.jsxs("form", {
                                onSubmit: (s) => {
                                  (s.preventDefault(),
                                    Ae
                                      ? (async (s) => {
                                          if (p && Ue.name.trim()) {
                                            Be(!0);
                                            try {
                                              (await e.patch(
                                                `${t}/api/v1/locations/${s}`,
                                                {
                                                  name: Ue.name.trim(),
                                                  address:
                                                    Ue.address.trim() || void 0,
                                                  timezone: Ue.timezone,
                                                },
                                                {
                                                  headers: {
                                                    Authorization: `Bearer ${p}`,
                                                  },
                                                },
                                              ),
                                                r.success(
                                                  "Location updated successfully",
                                                ),
                                                Te(null),
                                                $e({
                                                  name: "",
                                                  address: "",
                                                  timezone:
                                                    Intl.DateTimeFormat().resolvedOptions()
                                                      .timeZone || "UTC",
                                                }));
                                              const a = await e.get(
                                                `${t}/api/v1/locations`,
                                                {
                                                  headers: {
                                                    Authorization: `Bearer ${p}`,
                                                  },
                                                },
                                              );
                                              Ne(a.data || []);
                                            } catch (a) {
                                              r.error(
                                                a.response?.data?.message ||
                                                  "Failed to update location",
                                              );
                                            } finally {
                                              Be(!1);
                                            }
                                          } else
                                            r.error(
                                              "Location name is required",
                                            );
                                        })(Ae)
                                      : (async (s) => {
                                          if (
                                            (s.preventDefault(),
                                            p && Ue.name.trim())
                                          ) {
                                            Be(!0);
                                            try {
                                              (await e.post(
                                                `${t}/api/v1/locations`,
                                                {
                                                  name: Ue.name.trim(),
                                                  address:
                                                    Ue.address.trim() || void 0,
                                                  timezone: Ue.timezone,
                                                },
                                                {
                                                  headers: {
                                                    Authorization: `Bearer ${p}`,
                                                  },
                                                },
                                              ),
                                                r.success(
                                                  `Location "${Ue.name}" created successfully`,
                                                ),
                                                $e({
                                                  name: "",
                                                  address: "",
                                                  timezone:
                                                    Intl.DateTimeFormat().resolvedOptions()
                                                      .timeZone || "UTC",
                                                }));
                                              const s = await e.get(
                                                `${t}/api/v1/locations`,
                                                {
                                                  headers: {
                                                    Authorization: `Bearer ${p}`,
                                                  },
                                                },
                                              );
                                              Ne(s.data || []);
                                            } catch (a) {
                                              r.error(
                                                a.response?.data?.message ||
                                                  "Failed to create location",
                                              );
                                            } finally {
                                              Be(!1);
                                            }
                                          } else
                                            r.error(
                                              "Location name is required",
                                            );
                                        })(s));
                                },
                                className: "space-y-3 sm:space-y-4",
                                children: [
                                  n.jsxs("div", {
                                    className:
                                      "grid gap-3 sm:gap-4 md:grid-cols-2",
                                    children: [
                                      n.jsxs("div", {
                                        children: [
                                          n.jsxs("label", {
                                            className:
                                              "theme-text-secondary mb-1.5 sm:mb-2 block text-[10px] sm:text-xs font-medium",
                                            children: [
                                              "Location Name",
                                              " ",
                                              n.jsx("span", {
                                                className: "text-rose-500",
                                                children: "*",
                                              }),
                                            ],
                                          }),
                                          n.jsx("input", {
                                            type: "text",
                                            value: Ue.name,
                                            onChange: (e) =>
                                              $e({
                                                ...Ue,
                                                name: e.target.value,
                                              }),
                                            placeholder:
                                              "e.g., Main Store, Downtown Branch",
                                            className:
                                              "theme-text-primary w-full rounded-xl border border-white/20 bg-transparent px-3 sm:px-4 py-2 text-xs sm:text-sm focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-400/20",
                                            required: !0,
                                          }),
                                        ],
                                      }),
                                      n.jsxs("div", {
                                        children: [
                                          n.jsx("label", {
                                            className:
                                              "theme-text-secondary mb-1.5 sm:mb-2 block text-[10px] sm:text-xs font-medium",
                                            children: "Timezone",
                                          }),
                                          n.jsx("input", {
                                            type: "text",
                                            value: Ue.timezone,
                                            onChange: (e) =>
                                              $e({
                                                ...Ue,
                                                timezone: e.target.value,
                                              }),
                                            placeholder: "UTC",
                                            className:
                                              "theme-text-primary w-full rounded-xl border border-white/20 bg-transparent px-3 sm:px-4 py-2 text-xs sm:text-sm focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-400/20",
                                          }),
                                        ],
                                      }),
                                    ],
                                  }),
                                  n.jsxs("div", {
                                    children: [
                                      n.jsx("label", {
                                        className:
                                          "theme-text-secondary mb-1.5 sm:mb-2 block text-[10px] sm:text-xs font-medium",
                                        children: "Address",
                                      }),
                                      n.jsx("textarea", {
                                        value: Ue.address,
                                        onChange: (e) =>
                                          $e({
                                            ...Ue,
                                            address: e.target.value,
                                          }),
                                        placeholder:
                                          "Street address, city, state, zip code",
                                        rows: 2,
                                        className:
                                          "theme-text-primary w-full rounded-xl border border-white/20 bg-transparent px-3 sm:px-4 py-2 text-xs sm:text-sm focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-400/20",
                                      }),
                                    ],
                                  }),
                                  n.jsxs("div", {
                                    className:
                                      "flex flex-col sm:flex-row gap-2 sm:gap-3",
                                    children: [
                                      n.jsx("button", {
                                        type: "submit",
                                        disabled: Pe || !Ue.name.trim(),
                                        className:
                                          "rounded-full bg-gradient-to-r from-sky-400 to-blue-500 px-4 sm:px-6 py-2 text-xs sm:text-sm font-semibold text-white transition hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-50 touch-manipulation",
                                        children: Pe
                                          ? "Saving..."
                                          : Ae
                                            ? "Update Location"
                                            : "Create Location",
                                      }),
                                      Ae &&
                                        n.jsx("button", {
                                          type: "button",
                                          onClick: () => {
                                            (Te(null),
                                              $e({
                                                name: "",
                                                address: "",
                                                timezone:
                                                  Intl.DateTimeFormat().resolvedOptions()
                                                    .timeZone || "UTC",
                                              }));
                                          },
                                          className:
                                            "theme-chip rounded-full border px-4 sm:px-6 py-2 text-xs sm:text-sm font-semibold transition hover:border-sky-400 touch-manipulation",
                                          children: "Cancel",
                                        }),
                                    ],
                                  }),
                                ],
                              }),
                            ],
                          }),
                          n.jsxs("div", {
                            className:
                              "rounded-2xl border border-white/10 bg-white/5 p-4",
                            children: [
                              n.jsx("h3", {
                                className:
                                  "theme-text-primary mb-4 text-sm font-semibold",
                                children: "All Locations",
                              }),
                              ve
                                ? n.jsxs("div", {
                                    className: "text-center py-8",
                                    children: [
                                      n.jsx("div", {
                                        className:
                                          "inline-block h-6 w-6 animate-spin rounded-full border-2 border-sky-400 border-t-transparent",
                                      }),
                                      n.jsx("p", {
                                        className:
                                          "theme-text-secondary mt-2 text-sm",
                                        children: "Loading locations...",
                                      }),
                                    ],
                                  })
                                : 0 === je.length
                                  ? n.jsx("div", {
                                      className: "text-center py-8",
                                      children: n.jsx("p", {
                                        className:
                                          "theme-text-secondary text-sm",
                                        children:
                                          "No locations created yet. Create your first location above.",
                                      }),
                                    })
                                  : n.jsx("div", {
                                      className: "space-y-2",
                                      children: je.map((s) =>
                                        n.jsxs(
                                          "div",
                                          {
                                            className:
                                              "flex items-center justify-between rounded-xl border border-white/10 bg-white/5 p-3",
                                            children: [
                                              n.jsxs("div", {
                                                className: "flex-1",
                                                children: [
                                                  n.jsx("p", {
                                                    className:
                                                      "theme-text-primary text-sm font-semibold",
                                                    children: s.name,
                                                  }),
                                                  s.address &&
                                                    n.jsx("p", {
                                                      className:
                                                        "theme-text-secondary text-xs mt-1",
                                                      children: s.address,
                                                    }),
                                                  n.jsxs("p", {
                                                    className:
                                                      "theme-text-secondary text-xs mt-1",
                                                    children: [
                                                      "Timezone: ",
                                                      s.timezone || "UTC",
                                                    ],
                                                  }),
                                                ],
                                              }),
                                              n.jsxs("div", {
                                                className:
                                                  "flex items-center gap-2",
                                                children: [
                                                  n.jsx("button", {
                                                    onClick: () =>
                                                      ((e) => {
                                                        (Te(e.id),
                                                          $e({
                                                            name: e.name,
                                                            address:
                                                              e.address || "",
                                                            timezone:
                                                              e.timezone ||
                                                              Intl.DateTimeFormat().resolvedOptions()
                                                                .timeZone ||
                                                              "UTC",
                                                          }));
                                                      })(s),
                                                    disabled: Ae === s.id,
                                                    className:
                                                      "theme-chip rounded-full border px-3 py-1 text-xs font-semibold transition hover:border-sky-400 disabled:opacity-50",
                                                    children: "Edit",
                                                  }),
                                                  n.jsx("button", {
                                                    onClick: () =>
                                                      (async (s) => {
                                                        if (
                                                          window.confirm(
                                                            "Are you sure you want to delete this location? This action cannot be undone.",
                                                          )
                                                        )
                                                          if (p)
                                                            try {
                                                              (await e.delete(
                                                                `${t}/api/v1/locations/${s}`,
                                                                {
                                                                  headers: {
                                                                    Authorization: `Bearer ${p}`,
                                                                  },
                                                                },
                                                              ),
                                                                r.success(
                                                                  "Location deleted successfully",
                                                                ));
                                                              const a =
                                                                await e.get(
                                                                  `${t}/api/v1/locations`,
                                                                  {
                                                                    headers: {
                                                                      Authorization: `Bearer ${p}`,
                                                                    },
                                                                  },
                                                                );
                                                              (Ne(a.data || []),
                                                                ke === s &&
                                                                  Ce(""));
                                                            } catch (a) {
                                                              r.error(
                                                                a.response?.data
                                                                  ?.message ||
                                                                  "Failed to delete location",
                                                              );
                                                            }
                                                          else
                                                            r.error(
                                                              "Not authenticated",
                                                            );
                                                      })(s.id),
                                                    className:
                                                      "theme-chip rounded-full border border-red-500/60 px-3 py-1 text-xs font-semibold text-red-200 transition hover:bg-red-500/20",
                                                    children: "Delete",
                                                  }),
                                                ],
                                              }),
                                            ],
                                          },
                                          s.id,
                                        ),
                                      ),
                                    }),
                            ],
                          }),
                        ],
                      }),
                    }),
                    n.jsx(P, {
                      title: "User management",
                      description:
                        "Invite new team members and maintain access across the company.",
                      children: n.jsxs("div", {
                        className: "grid gap-6 xl:grid-cols-[2fr,3fr]",
                        children: [
                          n.jsxs("form", {
                            className: "space-y-3",
                            onSubmit: async (s) => {
                              if (
                                (s.preventDefault(),
                                K.name.trim() && K.email.trim())
                              ) {
                                U(!0);
                                try {
                                  const s = await (async function (s) {
                                    const { data: a } = await e.post(
                                      `${t}/api/v1/users`,
                                      s,
                                    );
                                    return a;
                                  })({
                                    name: K.name.trim(),
                                    email: K.email.trim().toLowerCase(),
                                    role: K.role,
                                    locationId: K.locationId || void 0,
                                    pin: K.pin || void 0,
                                  });
                                  (L((e) => [s.user, ...e]),
                                    r.success(
                                      s.temporaryPin
                                        ? `User ${s.user.name} created. Temporary PIN: ${s.temporaryPin}`
                                        : `User ${s.user.name} created`,
                                    ),
                                    R({
                                      name: "",
                                      email: "",
                                      role: "cashier",
                                      locationId: "",
                                      pin: "",
                                    }));
                                } catch (a) {
                                  r.error(
                                    a?.response?.data?.message ||
                                      "Unable to create user",
                                  );
                                } finally {
                                  U(!1);
                                }
                              } else r.error("Name and email are required");
                            },
                            children: [
                              n.jsxs("div", {
                                className: "flex flex-col gap-2",
                                children: [
                                  n.jsx("label", {
                                    className:
                                      "theme-text-secondary text-sm font-medium",
                                    htmlFor: "user-name",
                                    children: "Full name",
                                  }),
                                  n.jsx("input", {
                                    id: "user-name",
                                    type: "text",
                                    value: K.name,
                                    onChange: (e) =>
                                      R((t) => ({
                                        ...t,
                                        name: e.target.value,
                                      })),
                                    className:
                                      "theme-surface rounded-2xl border px-4 py-3 outline-none focus:ring-2 focus:ring-sky-400",
                                    required: !0,
                                  }),
                                ],
                              }),
                              n.jsxs("div", {
                                className: "flex flex-col gap-2",
                                children: [
                                  n.jsx("label", {
                                    className:
                                      "theme-text-secondary text-sm font-medium",
                                    htmlFor: "user-email",
                                    children: "Email",
                                  }),
                                  n.jsx("input", {
                                    id: "user-email",
                                    type: "email",
                                    value: K.email,
                                    onChange: (e) =>
                                      R((t) => ({
                                        ...t,
                                        email: e.target.value,
                                      })),
                                    className:
                                      "theme-surface rounded-2xl border px-4 py-3 outline-none focus:ring-2 focus:ring-sky-400",
                                    required: !0,
                                  }),
                                ],
                              }),
                              n.jsxs("div", {
                                className: "flex flex-col gap-2",
                                children: [
                                  n.jsx("label", {
                                    className:
                                      "theme-text-secondary text-sm font-medium",
                                    htmlFor: "user-role",
                                    children: "Role",
                                  }),
                                  n.jsxs("select", {
                                    id: "user-role",
                                    value: K.role,
                                    onChange: (e) =>
                                      R((t) => ({
                                        ...t,
                                        role: e.target.value,
                                      })),
                                    className:
                                      "theme-surface rounded-2xl border px-4 py-3 outline-none focus:ring-2 focus:ring-sky-400",
                                    children: [
                                      n.jsx("option", {
                                        value: "admin",
                                        children: "Admin",
                                      }),
                                      n.jsx("option", {
                                        value: "manager",
                                        children: "Manager",
                                      }),
                                      n.jsx("option", {
                                        value: "cashier",
                                        children: "Cashier",
                                      }),
                                    ],
                                  }),
                                ],
                              }),
                              n.jsxs("div", {
                                className: "flex flex-col gap-2",
                                children: [
                                  n.jsx("label", {
                                    className:
                                      "theme-text-secondary text-sm font-medium",
                                    htmlFor: "user-location",
                                    children: "Location (optional)",
                                  }),
                                  n.jsxs("select", {
                                    id: "user-location",
                                    value: K.locationId,
                                    onChange: (e) =>
                                      R((t) => ({
                                        ...t,
                                        locationId: e.target.value,
                                      })),
                                    className:
                                      "theme-surface rounded-2xl border px-4 py-3 outline-none focus:ring-2 focus:ring-sky-400",
                                    children: [
                                      n.jsx("option", {
                                        value: "",
                                        children: "-- No Location --",
                                      }),
                                      je.map((e) =>
                                        n.jsxs(
                                          "option",
                                          {
                                            value: e.id,
                                            children: [
                                              e.name,
                                              " ",
                                              e.address ? `(${e.address})` : "",
                                            ],
                                          },
                                          e.id,
                                        ),
                                      ),
                                    ],
                                  }),
                                ],
                              }),
                              n.jsxs("div", {
                                className: "flex flex-col gap-2",
                                children: [
                                  n.jsx("label", {
                                    className:
                                      "theme-text-secondary text-sm font-medium",
                                    htmlFor: "user-pin",
                                    children: "Initial PIN (optional)",
                                  }),
                                  n.jsx("input", {
                                    id: "user-pin",
                                    type: "text",
                                    value: K.pin,
                                    onChange: (e) =>
                                      R((t) => ({ ...t, pin: e.target.value })),
                                    className:
                                      "theme-surface rounded-2xl border px-4 py-3 outline-none focus:ring-2 focus:ring-sky-400",
                                    placeholder:
                                      "Optional passphrase (4-64 characters)",
                                    maxLength: 64,
                                  }),
                                  n.jsx("p", {
                                    className: "theme-text-secondary text-xs",
                                    children:
                                      "Leave blank to auto-generate a temporary numeric PIN, or enter a custom passphrase (4–64 characters) and share it securely.",
                                  }),
                                ],
                              }),
                              n.jsx("button", {
                                type: "submit",
                                disabled: T,
                                className:
                                  "rounded-full bg-gradient-to-r from-sky-500 via-blue-600 to-indigo-500 px-6 py-3 text-sm font-semibold text-white shadow-[0_20px_45px_-30px_rgba(37,99,235,0.65)] transition hover:shadow-[0_25px_60px_-30px_rgba(37,99,235,0.75)] disabled:cursor-not-allowed disabled:opacity-60",
                                children: T ? "Adding user…" : "Add user",
                              }),
                            ],
                          }),
                          n.jsxs("div", {
                            className: "space-y-3",
                            children: [
                              n.jsxs("div", {
                                className: "flex items-center justify-between",
                                children: [
                                  n.jsx("h3", {
                                    className:
                                      "theme-text-primary text-sm font-semibold",
                                    children: "Team members",
                                  }),
                                  B &&
                                    n.jsx("span", {
                                      className: "theme-text-secondary text-xs",
                                      children: "Loading…",
                                    }),
                                ],
                              }),
                              n.jsx("div", {
                                className:
                                  "overflow-hidden rounded-2xl border border-white/10",
                                children: n.jsxs("table", {
                                  className:
                                    "min-w-full divide-y divide-white/10 text-sm",
                                  children: [
                                    n.jsx("thead", {
                                      className:
                                        "theme-surface text-xs uppercase tracking-[0.2em] theme-text-secondary",
                                      children: n.jsxs("tr", {
                                        children: [
                                          n.jsx("th", {
                                            className: "px-4 py-2",
                                            children: "Name",
                                          }),
                                          n.jsx("th", {
                                            className: "px-4 py-2",
                                            children: "Email",
                                          }),
                                          n.jsx("th", {
                                            className: "px-4 py-2",
                                            children: "Role",
                                          }),
                                          n.jsx("th", {
                                            className: "px-4 py-2",
                                            children: "Location",
                                          }),
                                          n.jsx("th", {
                                            className: "px-4 py-2",
                                            children: "Actions",
                                          }),
                                        ],
                                      }),
                                    }),
                                    n.jsxs("tbody", {
                                      children: [
                                        $.map((e) =>
                                          n.jsxs(
                                            "tr",
                                            {
                                              className:
                                                "theme-surface border-t border-white/5",
                                              children: [
                                                n.jsxs("td", {
                                                  className:
                                                    "px-4 py-2 theme-text-primary font-semibold",
                                                  children: [
                                                    e.name,
                                                    e.isPlatformAdmin &&
                                                      n.jsx("span", {
                                                        className:
                                                          "ml-2 rounded-full bg-purple-500/20 px-2 py-0.5 text-[10px] font-semibold text-purple-100",
                                                        children: "Platform",
                                                      }),
                                                  ],
                                                }),
                                                n.jsx("td", {
                                                  className:
                                                    "px-4 py-2 theme-text-secondary lowercase",
                                                  children: e.email ?? "—",
                                                }),
                                                n.jsx("td", {
                                                  className:
                                                    "px-4 py-2 theme-text-secondary capitalize",
                                                  children: n.jsxs("select", {
                                                    value: e.role,
                                                    onChange: (t) =>
                                                      (async (e, t) => {
                                                        if (e.role !== t)
                                                          try {
                                                            const s = await k(
                                                              e.id,
                                                              { role: t },
                                                            );
                                                            (L((t) =>
                                                              t.map((t) =>
                                                                t.id === e.id
                                                                  ? s
                                                                  : t,
                                                              ),
                                                            ),
                                                              r.success(
                                                                `Updated ${e.name} to ${t}`,
                                                              ));
                                                          } catch (s) {
                                                            r.error(
                                                              s?.response?.data
                                                                ?.message ||
                                                                "Unable to update role",
                                                            );
                                                          }
                                                      })(e, t.target.value),
                                                    className:
                                                      "rounded-full border border-white/20 bg-transparent px-2 py-1 text-xs",
                                                    children: [
                                                      n.jsx("option", {
                                                        value: "admin",
                                                        children: "Admin",
                                                      }),
                                                      n.jsx("option", {
                                                        value: "manager",
                                                        children: "Manager",
                                                      }),
                                                      n.jsx("option", {
                                                        value: "cashier",
                                                        children: "Cashier",
                                                      }),
                                                    ],
                                                  }),
                                                }),
                                                n.jsx("td", {
                                                  className:
                                                    "px-4 py-2 theme-text-secondary",
                                                  children: n.jsxs("select", {
                                                    value: e.locationId || "",
                                                    onChange: (t) => {
                                                      const s =
                                                        t.target.value ||
                                                        void 0;
                                                      (async (e, t) => {
                                                        if (e.locationId !== t)
                                                          try {
                                                            const s = await k(
                                                              e.id,
                                                              { locationId: t },
                                                            );
                                                            (L((t) =>
                                                              t.map((t) =>
                                                                t.id === e.id
                                                                  ? s
                                                                  : t,
                                                              ),
                                                            ),
                                                              r.success(
                                                                `Updated ${e.name}'s location`,
                                                              ));
                                                          } catch (s) {
                                                            r.error(
                                                              s?.response?.data
                                                                ?.message ||
                                                                "Unable to update location",
                                                            );
                                                          }
                                                      })(e, s);
                                                    },
                                                    className:
                                                      "rounded-full border border-white/20 bg-transparent px-2 py-1 text-xs",
                                                    children: [
                                                      n.jsx("option", {
                                                        value: "",
                                                        children:
                                                          "-- No Location --",
                                                      }),
                                                      je.map((e) =>
                                                        n.jsx(
                                                          "option",
                                                          {
                                                            value: e.id,
                                                            children: e.name,
                                                          },
                                                          e.id,
                                                        ),
                                                      ),
                                                    ],
                                                  }),
                                                }),
                                                n.jsx("td", {
                                                  className: "px-4 py-2",
                                                  children: n.jsxs("div", {
                                                    className:
                                                      "flex flex-wrap gap-2",
                                                    children: [
                                                      n.jsx("button", {
                                                        onClick: () =>
                                                          ((e) => {
                                                            (te(e),
                                                              ae(""),
                                                              ne(""),
                                                              X(!0));
                                                          })(e),
                                                        className:
                                                          "theme-chip rounded-full border px-3 py-1 text-xs font-semibold transition hover:border-sky-400 hover:text-sky-200",
                                                        children: "Reset PIN",
                                                      }),
                                                      !e.isPlatformAdmin &&
                                                        n.jsx("button", {
                                                          onClick: () => Oe(e),
                                                          className:
                                                            "theme-chip rounded-full border border-red-500/60 px-3 py-1 text-xs font-semibold text-red-200 transition hover:bg-red-500/20",
                                                          children: "Delete",
                                                        }),
                                                    ],
                                                  }),
                                                }),
                                              ],
                                            },
                                            e.id,
                                          ),
                                        ),
                                        0 === $.length &&
                                          !B &&
                                          n.jsx("tr", {
                                            children: n.jsx("td", {
                                              className:
                                                "px-4 py-4 text-center theme-text-secondary",
                                              colSpan: 5,
                                              children:
                                                "No users yet. Add your first teammate.",
                                            }),
                                          }),
                                      ],
                                    }),
                                  ],
                                }),
                              }),
                            ],
                          }),
                        ],
                      }),
                    }),
                  ],
                }),
              "devices" === We &&
                n.jsxs(n.Fragment, {
                  children: [
                    ze &&
                      n.jsx(P, {
                        title: "Barcode/QR Scanners",
                        description:
                          "Configure and manage barcode and QR code scanners for product lookup.",
                        children: D
                          ? n.jsxs("div", {
                              className: "py-8 text-center",
                              children: [
                                n.jsx("div", {
                                  className:
                                    "inline-block h-8 w-8 animate-spin rounded-full border-4 border-sky-400 border-t-transparent",
                                }),
                                n.jsx("p", {
                                  className:
                                    "theme-text-secondary mt-2 text-sm",
                                  children: "Loading payment settings...",
                                }),
                              ],
                            })
                          : n.jsxs("div", {
                              className: "space-y-4",
                              children: [
                                n.jsxs("div", {
                                  className:
                                    "flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 md:flex-row md:items-center md:justify-between",
                                  children: [
                                    n.jsxs("div", {
                                      children: [
                                        n.jsx("h3", {
                                          className:
                                            "theme-text-primary text-sm font-semibold",
                                          children: "Active Payment Gateway",
                                        }),
                                        n.jsx("p", {
                                          className:
                                            "theme-text-secondary text-xs",
                                          children:
                                            "Choose which provider your tenant will use for card/QR payments.",
                                        }),
                                      ],
                                    }),
                                    n.jsxs("select", {
                                      value: _,
                                      onChange: (e) => q(e.target.value),
                                      className:
                                        "mt-2 w-full rounded-xl border border-white/20 bg-slate-900 px-3 py-2 text-sm text-slate-100 md:mt-0 md:w-64",
                                      children: [
                                        n.jsx("option", {
                                          value: "monnify",
                                          children: "Monnify",
                                        }),
                                        n.jsx("option", {
                                          value: "opay",
                                          children: "Opay",
                                        }),
                                        n.jsx("option", {
                                          value: "palmpay",
                                          children: "Palmpay",
                                        }),
                                        n.jsx("option", {
                                          value: "firstbank",
                                          children: "FirstBank",
                                        }),
                                      ],
                                    }),
                                  ],
                                }),
                                (() => {
                                  const e = O[_],
                                    t = (e) =>
                                      W((t) => ({
                                        ...t,
                                        [_]: { ...t[_], ...e },
                                      })),
                                    s = "monnify" === _,
                                    a = "opay" === _,
                                    i = "palmpay" === _,
                                    l = "firstbank" === _,
                                    o =
                                      "monnify" === _
                                        ? "Monnify"
                                        : "opay" === _
                                          ? "Opay"
                                          : "palmpay" === _
                                            ? "Palmpay"
                                            : "FirstBank";
                                  return n.jsxs("div", {
                                    className:
                                      "space-y-4 rounded-2xl border border-white/10 bg-white/5 p-4",
                                    children: [
                                      n.jsxs("div", {
                                        className:
                                          "flex items-center justify-between",
                                        children: [
                                          n.jsxs("div", {
                                            children: [
                                              n.jsxs("h3", {
                                                className:
                                                  "theme-text-primary text-sm font-semibold",
                                                children: [
                                                  "Enable ",
                                                  o,
                                                  " Payments",
                                                ],
                                              }),
                                              n.jsxs("p", {
                                                className:
                                                  "theme-text-secondary text-xs",
                                                children: [
                                                  "When enabled, card and QR payments can be routed through ",
                                                  o,
                                                  ".",
                                                ],
                                              }),
                                            ],
                                          }),
                                          n.jsxs("label", {
                                            className:
                                              "relative inline-flex cursor-pointer items-center",
                                            children: [
                                              n.jsx("input", {
                                                type: "checkbox",
                                                checked: e.enabled,
                                                onChange: (e) =>
                                                  t({
                                                    enabled: e.target.checked,
                                                  }),
                                                className: "peer sr-only",
                                              }),
                                              n.jsx("div", {
                                                className:
                                                  "peer h-6 w-11 rounded-full bg-gray-600 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-sky-500 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-sky-300",
                                              }),
                                            ],
                                          }),
                                        ],
                                      }),
                                      e.enabled &&
                                        n.jsxs(n.Fragment, {
                                          children: [
                                            n.jsxs("div", {
                                              children: [
                                                n.jsxs("label", {
                                                  className:
                                                    "theme-text-primary mb-2 block text-sm font-medium",
                                                  children: [o, " API Key"],
                                                }),
                                                n.jsx("input", {
                                                  type: "text",
                                                  value: e.apiKey,
                                                  onChange: (e) =>
                                                    t({
                                                      apiKey: e.target.value,
                                                    }),
                                                  placeholder: "Enter API Key",
                                                  className:
                                                    "theme-text-primary w-full rounded-xl border border-white/20 bg-transparent px-4 py-2 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-400/20",
                                                }),
                                              ],
                                            }),
                                            n.jsxs("div", {
                                              children: [
                                                n.jsxs("label", {
                                                  className:
                                                    "theme-text-primary mb-2 block text-sm font-medium",
                                                  children: [o, " Secret Key"],
                                                }),
                                                n.jsx("input", {
                                                  type: "password",
                                                  value: e.secretKey,
                                                  onChange: (e) =>
                                                    t({
                                                      secretKey: e.target.value,
                                                    }),
                                                  placeholder:
                                                    "Enter Secret Key",
                                                  className:
                                                    "theme-text-primary w-full rounded-xl border border-white/20 bg-transparent px-4 py-2 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-400/20",
                                                }),
                                              ],
                                            }),
                                            s &&
                                              n.jsxs("div", {
                                                children: [
                                                  n.jsx("label", {
                                                    className:
                                                      "theme-text-primary mb-2 block text-sm font-medium",
                                                    children:
                                                      "Monnify Contract Code",
                                                  }),
                                                  n.jsx("input", {
                                                    type: "text",
                                                    value: e.contractCode,
                                                    onChange: (e) =>
                                                      t({
                                                        contractCode:
                                                          e.target.value,
                                                      }),
                                                    placeholder:
                                                      "Enter Contract Code",
                                                    className:
                                                      "theme-text-primary w-full rounded-xl border border-white/20 bg-transparent px-4 py-2 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-400/20",
                                                  }),
                                                ],
                                              }),
                                            (a || i || l) &&
                                              n.jsxs(n.Fragment, {
                                                children: [
                                                  n.jsxs("div", {
                                                    children: [
                                                      n.jsx("label", {
                                                        className:
                                                          "theme-text-primary mb-2 block text-sm font-medium",
                                                        children: "Merchant ID",
                                                      }),
                                                      n.jsx("input", {
                                                        type: "text",
                                                        value: e.merchantId,
                                                        onChange: (e) =>
                                                          t({
                                                            merchantId:
                                                              e.target.value,
                                                          }),
                                                        placeholder:
                                                          "Enter Merchant ID",
                                                        className:
                                                          "theme-text-primary w-full rounded-xl border border-white/20 bg-transparent px-4 py-2 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-400/20",
                                                      }),
                                                    ],
                                                  }),
                                                  n.jsxs("div", {
                                                    children: [
                                                      n.jsx("label", {
                                                        className:
                                                          "theme-text-primary mb-2 block text-sm font-medium",
                                                        children: "Terminal ID",
                                                      }),
                                                      n.jsx("input", {
                                                        type: "text",
                                                        value: e.terminalId,
                                                        onChange: (e) =>
                                                          t({
                                                            terminalId:
                                                              e.target.value,
                                                          }),
                                                        placeholder:
                                                          "Enter Terminal ID",
                                                        className:
                                                          "theme-text-primary w-full rounded-xl border border-white/20 bg-transparent px-4 py-2 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-400/20",
                                                      }),
                                                    ],
                                                  }),
                                                ],
                                              }),
                                            n.jsxs("div", {
                                              children: [
                                                n.jsx("label", {
                                                  className:
                                                    "theme-text-primary mb-2 block text-sm font-medium",
                                                  children:
                                                    "Webhook Secret (Optional)",
                                                }),
                                                n.jsx("input", {
                                                  type: "password",
                                                  value: e.webhookSecret,
                                                  onChange: (e) =>
                                                    t({
                                                      webhookSecret:
                                                        e.target.value,
                                                    }),
                                                  placeholder:
                                                    "Enter webhook secret",
                                                  className:
                                                    "theme-text-primary w-full rounded-xl border border-white/20 bg-transparent px-4 py-2 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-400/20",
                                                }),
                                              ],
                                            }),
                                            n.jsx("div", {
                                              className: "flex gap-3 pt-2",
                                              children: n.jsx("button", {
                                                onClick: async () => {
                                                  if (
                                                    "monnify" !== _ ||
                                                    (e.apiKey &&
                                                      e.secretKey &&
                                                      e.contractCode)
                                                  ) {
                                                    E(!0);
                                                    try {
                                                      const e = (e, t) => {
                                                          const s = {
                                                            enabled: t.enabled,
                                                          };
                                                          return (
                                                            t.apiKey &&
                                                              !t.apiKey.includes(
                                                                "...",
                                                              ) &&
                                                              (s.apiKey =
                                                                t.apiKey),
                                                            t.secretKey &&
                                                              !t.secretKey.includes(
                                                                "...",
                                                              ) &&
                                                              (s.secretKey =
                                                                t.secretKey),
                                                            t.contractCode &&
                                                              !t.contractCode.includes(
                                                                "...",
                                                              ) &&
                                                              (s.contractCode =
                                                                t.contractCode),
                                                            t.merchantId &&
                                                              !t.merchantId.includes(
                                                                "...",
                                                              ) &&
                                                              (s.merchantId =
                                                                t.merchantId),
                                                            t.terminalId &&
                                                              !t.terminalId.includes(
                                                                "...",
                                                              ) &&
                                                              (s.terminalId =
                                                                t.terminalId),
                                                            t.webhookSecret &&
                                                              !t.webhookSecret.includes(
                                                                "...",
                                                              ) &&
                                                              (s.webhookSecret =
                                                                t.webhookSecret),
                                                            s
                                                          );
                                                        },
                                                        t = {};
                                                      M.forEach((s) => {
                                                        t[s] = e(s, O[s]);
                                                      });
                                                      const s = O.monnify,
                                                        a = {
                                                          activeGateway: _,
                                                          monnifyEnabled:
                                                            s.enabled,
                                                          gateways: t,
                                                        },
                                                        n =
                                                          await C.updatePaymentSettings(
                                                            a,
                                                          );
                                                      (Me(n),
                                                        r.success(
                                                          "Payment settings saved successfully",
                                                        ));
                                                    } catch (t) {
                                                      r.error(
                                                        t?.response?.data
                                                          ?.message ||
                                                          "Failed to save payment settings",
                                                      );
                                                    } finally {
                                                      E(!1);
                                                    }
                                                  } else
                                                    r.error(
                                                      "Please fill in API Key, Secret Key, and Contract Code",
                                                    );
                                                },
                                                disabled: z,
                                                className:
                                                  "rounded-full bg-gradient-to-r from-sky-400 via-sky-500 to-sky-400 px-6 py-2 font-semibold text-white shadow-lg transition hover:shadow-sky-900/70 disabled:cursor-not-allowed disabled:opacity-50",
                                                children: z
                                                  ? "Saving..."
                                                  : "Save Settings",
                                              }),
                                            }),
                                          ],
                                        }),
                                    ],
                                  });
                                })(),
                              ],
                            }),
                      }),
                    ze &&
                      n.jsx(P, {
                        title: "Tax Settings",
                        description:
                          "Configure tax settings for your tenant. Cashiers can toggle tax on/off at checkout.",
                        children: G
                          ? n.jsxs("div", {
                              className: "py-8 text-center",
                              children: [
                                n.jsx("div", {
                                  className:
                                    "inline-block h-8 w-8 animate-spin rounded-full border-4 border-sky-400 border-t-transparent",
                                }),
                                n.jsx("p", {
                                  className:
                                    "theme-text-secondary mt-2 text-sm",
                                  children: "Loading tax settings...",
                                }),
                              ],
                            })
                          : n.jsxs("div", {
                              className: "space-y-4",
                              children: [
                                n.jsxs("div", {
                                  className:
                                    "flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3",
                                  children: [
                                    n.jsxs("div", {
                                      children: [
                                        n.jsx("h3", {
                                          className:
                                            "theme-text-primary text-sm font-semibold",
                                          children: "Enable Tax",
                                        }),
                                        n.jsx("p", {
                                          className:
                                            "theme-text-secondary text-xs",
                                          children:
                                            "When enabled, tax can be applied at checkout (cashiers can toggle it on/off)",
                                        }),
                                      ],
                                    }),
                                    n.jsxs("label", {
                                      className:
                                        "relative inline-flex cursor-pointer items-center",
                                      children: [
                                        n.jsx("input", {
                                          type: "checkbox",
                                          checked: V.enabled,
                                          onChange: (e) =>
                                            Y({
                                              ...V,
                                              enabled: e.target.checked,
                                            }),
                                          className: "peer sr-only",
                                        }),
                                        n.jsx("div", {
                                          className:
                                            "peer h-6 w-11 rounded-full bg-gray-600 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-sky-500 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-sky-300",
                                        }),
                                      ],
                                    }),
                                  ],
                                }),
                                V.enabled &&
                                  n.jsxs("div", {
                                    className:
                                      "space-y-4 rounded-2xl border border-white/10 bg-white/5 p-4",
                                    children: [
                                      n.jsxs("div", {
                                        children: [
                                          n.jsx("label", {
                                            className:
                                              "theme-text-primary mb-2 block text-sm font-medium",
                                            children: "Tax Description",
                                          }),
                                          n.jsx("input", {
                                            type: "text",
                                            value: V.description,
                                            onChange: (e) =>
                                              Y({
                                                ...V,
                                                description: e.target.value,
                                              }),
                                            placeholder:
                                              "e.g., VAT, Sales Tax, GST",
                                            className:
                                              "theme-text-primary w-full rounded-xl border border-white/20 bg-transparent px-4 py-2 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-400/20",
                                          }),
                                          n.jsx("p", {
                                            className:
                                              "theme-text-secondary mt-1 text-xs",
                                            children:
                                              "This name will appear on receipts and at checkout",
                                          }),
                                        ],
                                      }),
                                      n.jsxs("div", {
                                        children: [
                                          n.jsx("label", {
                                            className:
                                              "theme-text-primary mb-2 block text-sm font-medium",
                                            children: "Tax Percentage",
                                          }),
                                          n.jsxs("div", {
                                            className:
                                              "flex items-center gap-2",
                                            children: [
                                              n.jsx("input", {
                                                type: "number",
                                                value: V.percentage,
                                                onChange: (e) =>
                                                  Y({
                                                    ...V,
                                                    percentage: e.target.value,
                                                  }),
                                                placeholder: "7.5",
                                                min: "0",
                                                max: "100",
                                                step: "0.1",
                                                className:
                                                  "theme-text-primary w-full rounded-xl border border-white/20 bg-transparent px-4 py-2 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-400/20",
                                              }),
                                              n.jsx("span", {
                                                className:
                                                  "theme-text-secondary text-sm",
                                                children: "%",
                                              }),
                                            ],
                                          }),
                                          n.jsx("p", {
                                            className:
                                              "theme-text-secondary mt-1 text-xs",
                                            children:
                                              "Enter the tax percentage (e.g., 7.5 for 7.5%)",
                                          }),
                                        ],
                                      }),
                                      n.jsx("div", {
                                        className: "flex gap-3 pt-2",
                                        children: n.jsx("button", {
                                          onClick: async () => {
                                            if (!V.description || !V.percentage)
                                              return void r.error(
                                                "Please fill in tax description and percentage",
                                              );
                                            const s = parseFloat(V.percentage);
                                            if (isNaN(s) || s < 0 || s > 100)
                                              r.error(
                                                "Tax percentage must be between 0 and 100",
                                              );
                                            else {
                                              Z(!0);
                                              try {
                                                const a = (
                                                  await e.put(
                                                    `${t}/api/v1/tax-settings`,
                                                    {
                                                      description:
                                                        V.description,
                                                      percentage: s,
                                                      enabled: V.enabled,
                                                    },
                                                    {
                                                      headers: {
                                                        Authorization: `Bearer ${p}`,
                                                      },
                                                    },
                                                  )
                                                ).data;
                                                (Y({
                                                  description:
                                                    a.description || "",
                                                  percentage:
                                                    a.percentage?.toString() ||
                                                    "",
                                                  enabled: a.enabled || !1,
                                                }),
                                                  r.success(
                                                    "Tax settings saved successfully",
                                                  ));
                                              } catch (a) {
                                                r.error(
                                                  a?.response?.data?.message ||
                                                    "Failed to save tax settings",
                                                );
                                              } finally {
                                                Z(!1);
                                              }
                                            }
                                          },
                                          disabled: H,
                                          className:
                                            "rounded-full bg-gradient-to-r from-sky-400 via-sky-500 to-sky-400 px-6 py-2 font-semibold text-white shadow-lg transition hover:shadow-sky-900/70 disabled:cursor-not-allowed disabled:opacity-50",
                                          children: H
                                            ? "Saving..."
                                            : "Save Settings",
                                        }),
                                      }),
                                    ],
                                  }),
                              ],
                            }),
                      }),
                    ze &&
                      n.jsx(P, {
                        title: "Barcode/QR Scanners",
                        description:
                          "Configure and manage barcode and QR code scanners for checkout.",
                        children: n.jsxs("div", {
                          className: "space-y-6",
                          children: [
                            n.jsxs("div", {
                              className: "grid gap-4 md:grid-cols-3",
                              children: [
                                n.jsxs("div", {
                                  className:
                                    "rounded-2xl border border-sky-500/30 bg-sky-500/10 p-4",
                                  children: [
                                    n.jsx("div", {
                                      className: "text-3xl mb-2",
                                      children: "🔌",
                                    }),
                                    n.jsx("h4", {
                                      className:
                                        "theme-text-primary mb-2 text-sm font-semibold text-sky-400",
                                      children: "USB Scanners",
                                    }),
                                    n.jsx("p", {
                                      className: "theme-text-secondary text-xs",
                                      children:
                                        "Most USB barcode scanners work automatically as keyboards. Just plug in and scan - no setup needed!",
                                    }),
                                    n.jsxs("div", {
                                      className:
                                        "mt-3 pt-3 border-t border-sky-500/20",
                                      children: [
                                        n.jsxs("p", {
                                          className:
                                            "theme-text-secondary text-xs",
                                          children: [
                                            n.jsx("strong", {
                                              className: "theme-text-primary",
                                              children: "Works with:",
                                            }),
                                            " ",
                                            "Any USB HID scanner",
                                          ],
                                        }),
                                        n.jsxs("p", {
                                          className:
                                            "theme-text-secondary text-xs mt-1",
                                          children: [
                                            n.jsx("strong", {
                                              className: "theme-text-primary",
                                              children: "Browser:",
                                            }),
                                            " ",
                                            "All browsers",
                                          ],
                                        }),
                                      ],
                                    }),
                                  ],
                                }),
                                n.jsxs("div", {
                                  className:
                                    "rounded-2xl border border-purple-500/30 bg-purple-500/10 p-4",
                                  children: [
                                    n.jsx("div", {
                                      className: "text-3xl mb-2",
                                      children: "📡",
                                    }),
                                    n.jsx("h4", {
                                      className:
                                        "theme-text-primary mb-2 text-sm font-semibold text-purple-400",
                                      children: "Bluetooth Scanners",
                                    }),
                                    n.jsx("p", {
                                      className: "theme-text-secondary text-xs",
                                      children:
                                        "Pair Bluetooth scanners via your system's Bluetooth settings first. After pairing, they'll work automatically.",
                                    }),
                                    n.jsxs("div", {
                                      className:
                                        "mt-3 pt-3 border-t border-purple-500/20",
                                      children: [
                                        n.jsxs("p", {
                                          className:
                                            "theme-text-secondary text-xs",
                                          children: [
                                            n.jsx("strong", {
                                              className: "theme-text-primary",
                                              children: "Works with:",
                                            }),
                                            " ",
                                            "Bluetooth HID scanners",
                                          ],
                                        }),
                                        n.jsxs("p", {
                                          className:
                                            "theme-text-secondary text-xs mt-1",
                                          children: [
                                            n.jsx("strong", {
                                              className: "theme-text-primary",
                                              children: "Pairing:",
                                            }),
                                            " ",
                                            "System Bluetooth (not browser)",
                                          ],
                                        }),
                                        n.jsxs("p", {
                                          className:
                                            "theme-text-secondary text-xs mt-1",
                                          children: [
                                            n.jsx("strong", {
                                              className: "theme-text-primary",
                                              children: "Note:",
                                            }),
                                            " ",
                                            "Pair in OS settings, then use in app",
                                          ],
                                        }),
                                      ],
                                    }),
                                  ],
                                }),
                                n.jsxs("div", {
                                  className:
                                    "rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4",
                                  children: [
                                    n.jsx("div", {
                                      className: "text-3xl mb-2",
                                      children: "📷",
                                    }),
                                    n.jsx("h4", {
                                      className:
                                        "theme-text-primary mb-2 text-sm font-semibold text-emerald-400",
                                      children: "Camera Scanner",
                                    }),
                                    n.jsx("p", {
                                      className: "theme-text-secondary text-xs",
                                      children:
                                        "Use your device's camera to scan QR codes and barcodes. Click the camera button in checkout.",
                                    }),
                                    n.jsxs("div", {
                                      className:
                                        "mt-3 pt-3 border-t border-emerald-500/20",
                                      children: [
                                        n.jsxs("p", {
                                          className:
                                            "theme-text-secondary text-xs",
                                          children: [
                                            n.jsx("strong", {
                                              className: "theme-text-primary",
                                              children: "Works with:",
                                            }),
                                            " ",
                                            "Any device with camera",
                                          ],
                                        }),
                                        n.jsxs("p", {
                                          className:
                                            "theme-text-secondary text-xs mt-1",
                                          children: [
                                            n.jsx("strong", {
                                              className: "theme-text-primary",
                                              children: "Browser:",
                                            }),
                                            " ",
                                            "All modern browsers",
                                          ],
                                        }),
                                        n.jsxs("p", {
                                          className:
                                            "theme-text-secondary text-xs mt-1",
                                          children: [
                                            n.jsx("strong", {
                                              className: "theme-text-primary",
                                              children: "Requires:",
                                            }),
                                            " ",
                                            "Camera permission",
                                          ],
                                        }),
                                      ],
                                    }),
                                  ],
                                }),
                              ],
                            }),
                            n.jsxs("div", {
                              className:
                                "rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4",
                              children: [
                                n.jsx("h4", {
                                  className:
                                    "theme-text-primary mb-3 text-sm font-semibold text-amber-400",
                                  children: "🚀 Quick Setup Guide",
                                }),
                                n.jsxs("ol", {
                                  className:
                                    "theme-text-secondary space-y-2 text-xs list-decimal list-inside",
                                  children: [
                                    n.jsxs("li", {
                                      children: [
                                        n.jsx("strong", {
                                          className: "theme-text-primary",
                                          children: "USB Scanner:",
                                        }),
                                        " ",
                                        "Simply plug in your USB scanner. It will work immediately - just scan barcodes and they'll appear in the checkout input field.",
                                      ],
                                    }),
                                    n.jsxs("li", {
                                      children: [
                                        n.jsx("strong", {
                                          className: "theme-text-primary",
                                          children: "Bluetooth Scanner:",
                                        }),
                                        " ",
                                        "Pair via your system's Bluetooth settings first (Windows Settings, macOS System Preferences, or Linux Bluetooth manager). After pairing, the scanner will work automatically.",
                                      ],
                                    }),
                                    n.jsxs("li", {
                                      children: [
                                        n.jsx("strong", {
                                          className: "theme-text-primary",
                                          children: "Camera Scanner:",
                                        }),
                                        " ",
                                        "Click the camera button in checkout and allow camera access when prompted. Point at QR codes or barcodes to scan.",
                                      ],
                                    }),
                                    n.jsxs("li", {
                                      children: [
                                        n.jsx("strong", {
                                          className: "theme-text-primary",
                                          children: "Registration:",
                                        }),
                                        " ",
                                        "Scanners are automatically registered when first used. You can view registered scanners in the checkout page.",
                                      ],
                                    }),
                                  ],
                                }),
                              ],
                            }),
                            n.jsxs("div", {
                              className:
                                "rounded-2xl border border-white/10 bg-white/5 p-4",
                              children: [
                                n.jsx("h4", {
                                  className:
                                    "theme-text-primary mb-3 text-sm font-semibold",
                                  children: "🔧 Troubleshooting",
                                }),
                                n.jsxs("div", {
                                  className:
                                    "space-y-3 text-xs theme-text-secondary",
                                  children: [
                                    n.jsxs("div", {
                                      children: [
                                        n.jsx("strong", {
                                          className: "theme-text-primary",
                                          children: "USB scanner not working?",
                                        }),
                                        n.jsxs("ul", {
                                          className:
                                            "mt-1 ml-4 list-disc space-y-1",
                                          children: [
                                            n.jsx("li", {
                                              children:
                                                'Make sure the scanner is in "HID Keyboard" mode (most default)',
                                            }),
                                            n.jsx("li", {
                                              children:
                                                "Try unplugging and reconnecting the scanner",
                                            }),
                                            n.jsx("li", {
                                              children:
                                                "Check that the checkout input field is focused",
                                            }),
                                            n.jsx("li", {
                                              children:
                                                "Some scanners need drivers - check manufacturer website",
                                            }),
                                          ],
                                        }),
                                      ],
                                    }),
                                    n.jsxs("div", {
                                      children: [
                                        n.jsx("strong", {
                                          className: "theme-text-primary",
                                          children:
                                            "Bluetooth scanner not working?",
                                        }),
                                        n.jsxs("ul", {
                                          className:
                                            "mt-1 ml-4 list-disc space-y-1",
                                          children: [
                                            n.jsx("li", {
                                              children:
                                                "Pair the scanner via your system's Bluetooth settings first (not browser)",
                                            }),
                                            n.jsx("li", {
                                              children:
                                                "Make sure scanner is in pairing/discoverable mode",
                                            }),
                                            n.jsx("li", {
                                              children:
                                                "Check that Bluetooth is enabled on your computer",
                                            }),
                                            n.jsx("li", {
                                              children:
                                                "After system pairing, the scanner should appear in the Devices section",
                                            }),
                                            n.jsx("li", {
                                              children:
                                                "If using HID mode, scanner will type into input fields automatically",
                                            }),
                                          ],
                                        }),
                                      ],
                                    }),
                                    n.jsxs("div", {
                                      children: [
                                        n.jsx("strong", {
                                          className: "theme-text-primary",
                                          children: "Camera not working?",
                                        }),
                                        n.jsxs("ul", {
                                          className:
                                            "mt-1 ml-4 list-disc space-y-1",
                                          children: [
                                            n.jsx("li", {
                                              children:
                                                "Allow camera access when prompted",
                                            }),
                                            n.jsx("li", {
                                              children:
                                                "Check browser settings if permission was denied",
                                            }),
                                            n.jsx("li", {
                                              children:
                                                "Ensure no other app is using the camera",
                                            }),
                                            n.jsx("li", {
                                              children:
                                                "Try refreshing the page and granting permission again",
                                            }),
                                          ],
                                        }),
                                      ],
                                    }),
                                  ],
                                }),
                              ],
                            }),
                          ],
                        }),
                      }),
                    ze &&
                      n.jsx(P, {
                        title: "Receipt Printer",
                        description:
                          "Connect your receipt printer for automatic printing",
                        children: n.jsxs("div", {
                          className: "space-y-6",
                          children: [
                            n.jsxs("div", {
                              className:
                                "rounded-2xl border border-white/10 bg-white/5 p-4",
                              children: [
                                n.jsxs("div", {
                                  className:
                                    "flex items-center justify-between mb-4",
                                  children: [
                                    n.jsxs("div", {
                                      className: "flex items-center gap-3",
                                      children: [
                                        n.jsx("div", {
                                          className:
                                            "h-3 w-3 rounded-full " +
                                            (fe
                                              ? "bg-emerald-400"
                                              : !1 === fe
                                                ? "bg-red-400"
                                                : "bg-yellow-400 animate-pulse"),
                                        }),
                                        n.jsxs("div", {
                                          children: [
                                            n.jsx("h3", {
                                              className:
                                                "theme-text-primary text-sm font-semibold",
                                              children:
                                                null === fe
                                                  ? "Connecting..."
                                                  : fe
                                                    ? "Connected"
                                                    : "Not Connected",
                                            }),
                                            n.jsx("p", {
                                              className:
                                                "theme-text-secondary text-xs mt-0.5",
                                              children:
                                                null === fe
                                                  ? "Checking printer connection..."
                                                  : fe
                                                    ? "Your printer is ready to use"
                                                    : "Connect to print proxy server to enable printing",
                                            }),
                                          ],
                                        }),
                                      ],
                                    }),
                                    fe &&
                                      n.jsx("button", {
                                        onClick: Ee,
                                        disabled: xe,
                                        className:
                                          "theme-chip rounded-full border px-3 py-1.5 text-xs font-semibold transition hover:border-sky-400",
                                        children: xe ? "..." : "🔄",
                                      }),
                                  ],
                                }),
                                !fe &&
                                  n.jsxs("div", {
                                    className:
                                      "mt-4 pt-4 border-t border-white/10",
                                    children: [
                                      n.jsx("label", {
                                        className:
                                          "theme-text-primary mb-2 block text-xs font-medium",
                                        children: "Print Server URL",
                                      }),
                                      n.jsxs("div", {
                                        className: "flex gap-2",
                                        children: [
                                          n.jsx("input", {
                                            type: "text",
                                            value: oe,
                                            onChange: (e) => ce(e.target.value),
                                            placeholder: "ws://localhost:8080",
                                            className:
                                              "theme-text-primary flex-1 rounded-lg border border-white/20 bg-transparent px-3 py-2 text-sm focus:border-sky-400 focus:outline-none focus:ring-1 focus:ring-sky-400/20",
                                          }),
                                          n.jsx("button", {
                                            onClick: () => {
                                              ze &&
                                                (localStorage.setItem(
                                                  "printProxyUrl",
                                                  oe,
                                                ),
                                                r.success(
                                                  "Print proxy URL saved. Reconnecting...",
                                                ),
                                                c.disconnect(),
                                                setTimeout(() => {
                                                  c.isAvailable()
                                                    .then(ge)
                                                    .catch(() => ge(!1));
                                                }, 1e3));
                                            },
                                            className:
                                              "rounded-lg bg-gradient-to-r from-sky-400 to-blue-500 px-4 py-2 text-sm font-semibold text-white transition hover:shadow-lg whitespace-nowrap",
                                            children: "Connect",
                                          }),
                                        ],
                                      }),
                                      n.jsxs("p", {
                                        className:
                                          "theme-text-secondary mt-1.5 text-xs",
                                        children: [
                                          "Default:",
                                          " ",
                                          n.jsx("code", {
                                            className:
                                              "px-1 py-0.5 rounded bg-black/20",
                                            children: "ws://localhost:8080",
                                          }),
                                        ],
                                      }),
                                    ],
                                  }),
                              ],
                            }),
                            fe &&
                              n.jsxs("details", {
                                className:
                                  "rounded-2xl border border-white/10 bg-white/5 p-4",
                                open: 0 === de.length,
                                children: [
                                  n.jsx("summary", {
                                    className:
                                      "theme-text-primary cursor-pointer text-sm font-semibold list-none mb-4",
                                    children: n.jsxs("span", {
                                      className:
                                        "flex items-center justify-between",
                                      children: [
                                        n.jsx("span", {
                                          children: "➕ Add Printer",
                                        }),
                                        de.length > 0 &&
                                          n.jsxs("span", {
                                            className:
                                              "theme-text-secondary text-xs font-normal",
                                            children: [
                                              "(",
                                              de.length,
                                              " registered)",
                                            ],
                                          }),
                                      ],
                                    }),
                                  }),
                                  n.jsxs("form", {
                                    onSubmit: async (e) => {
                                      if (ze) {
                                        (e.preventDefault(), be(!0));
                                        try {
                                          const e = {};
                                          if ("serial" === pe.type) {
                                            if (!pe.path)
                                              return void r.error(
                                                "Please enter printer path (e.g., COM3 on Windows, /dev/ttyUSB0 on Linux)",
                                              );
                                            ((e.path = pe.path),
                                              (e.baudRate = parseInt(
                                                pe.baudRate,
                                                10,
                                              )));
                                          } else {
                                            if (!pe.host)
                                              return void r.error(
                                                "Please enter printer host/IP address",
                                              );
                                            ((e.host = pe.host),
                                              (e.port = parseInt(pe.port, 10)));
                                          }
                                          (await c.registerPrinter(
                                            pe.id,
                                            pe.type,
                                            e,
                                          ))
                                            ? (r.success(
                                                `Printer "${pe.id}" registered successfully`,
                                              ),
                                              ue({
                                                id: "default-printer",
                                                type: "serial",
                                                path: "",
                                                host: "",
                                                port: "9100",
                                                baudRate: "9600",
                                              }),
                                              await Ee())
                                            : r.error(
                                                "Failed to register printer. Check print proxy connection.",
                                              );
                                        } catch (t) {
                                          r.error(
                                            t.message ||
                                              "Failed to register printer",
                                          );
                                        } finally {
                                          be(!1);
                                        }
                                      }
                                    },
                                    className: "space-y-4 mt-4",
                                    children: [
                                      n.jsxs("div", {
                                        className: "grid gap-4 md:grid-cols-2",
                                        children: [
                                          n.jsxs("div", {
                                            children: [
                                              n.jsx("label", {
                                                className:
                                                  "theme-text-secondary mb-1 block text-xs font-medium",
                                                children: "Printer ID",
                                              }),
                                              n.jsx("input", {
                                                type: "text",
                                                value: pe.id,
                                                onChange: (e) =>
                                                  ue({
                                                    ...pe,
                                                    id: e.target.value,
                                                  }),
                                                placeholder: "default-printer",
                                                className:
                                                  "theme-text-primary w-full rounded-xl border border-white/20 bg-transparent px-3 py-2 text-sm focus:border-sky-400 focus:outline-none",
                                                required: !0,
                                              }),
                                            ],
                                          }),
                                          n.jsxs("div", {
                                            children: [
                                              n.jsx("label", {
                                                className:
                                                  "theme-text-secondary mb-1 block text-xs font-medium",
                                                children: "Printer Type",
                                              }),
                                              n.jsxs("select", {
                                                value: pe.type,
                                                onChange: (e) =>
                                                  ue({
                                                    ...pe,
                                                    type: e.target.value,
                                                  }),
                                                className:
                                                  "theme-text-primary w-full rounded-xl border border-white/20 bg-transparent px-3 py-2 text-sm focus:border-sky-400 focus:outline-none",
                                                children: [
                                                  n.jsx("option", {
                                                    value: "serial",
                                                    children: "Serial/USB",
                                                  }),
                                                  n.jsx("option", {
                                                    value: "network",
                                                    children:
                                                      "Network (TCP/IP)",
                                                  }),
                                                ],
                                              }),
                                            ],
                                          }),
                                        ],
                                      }),
                                      "serial" === pe.type
                                        ? n.jsxs(n.Fragment, {
                                            children: [
                                              n.jsxs("div", {
                                                children: [
                                                  n.jsx("label", {
                                                    className:
                                                      "theme-text-secondary mb-1 block text-xs font-medium",
                                                    children: "Port Path *",
                                                  }),
                                                  n.jsx("input", {
                                                    type: "text",
                                                    value: pe.path,
                                                    onChange: (e) =>
                                                      ue({
                                                        ...pe,
                                                        path: e.target.value,
                                                      }),
                                                    placeholder:
                                                      "COM3 (Windows) or /dev/ttyUSB0 (Linux/Mac)",
                                                    className:
                                                      "theme-text-primary w-full rounded-xl border border-white/20 bg-transparent px-3 py-2 text-sm focus:border-sky-400 focus:outline-none",
                                                    required: !0,
                                                  }),
                                                ],
                                              }),
                                              n.jsxs("div", {
                                                children: [
                                                  n.jsx("label", {
                                                    className:
                                                      "theme-text-secondary mb-1 block text-xs font-medium",
                                                    children: "Baud Rate",
                                                  }),
                                                  n.jsx("input", {
                                                    type: "number",
                                                    value: pe.baudRate,
                                                    onChange: (e) =>
                                                      ue({
                                                        ...pe,
                                                        baudRate:
                                                          e.target.value,
                                                      }),
                                                    placeholder: "9600",
                                                    className:
                                                      "theme-text-primary w-full rounded-xl border border-white/20 bg-transparent px-3 py-2 text-sm focus:border-sky-400 focus:outline-none",
                                                  }),
                                                ],
                                              }),
                                            ],
                                          })
                                        : n.jsx(n.Fragment, {
                                            children: n.jsxs("div", {
                                              className:
                                                "grid gap-4 md:grid-cols-2",
                                              children: [
                                                n.jsxs("div", {
                                                  children: [
                                                    n.jsx("label", {
                                                      className:
                                                        "theme-text-secondary mb-1 block text-xs font-medium",
                                                      children:
                                                        "Host/IP Address *",
                                                    }),
                                                    n.jsx("input", {
                                                      type: "text",
                                                      value: pe.host,
                                                      onChange: (e) =>
                                                        ue({
                                                          ...pe,
                                                          host: e.target.value,
                                                        }),
                                                      placeholder:
                                                        "192.168.1.100",
                                                      className:
                                                        "theme-text-primary w-full rounded-xl border border-white/20 bg-transparent px-3 py-2 text-sm focus:border-sky-400 focus:outline-none",
                                                      required: !0,
                                                    }),
                                                  ],
                                                }),
                                                n.jsxs("div", {
                                                  children: [
                                                    n.jsx("label", {
                                                      className:
                                                        "theme-text-secondary mb-1 block text-xs font-medium",
                                                      children: "Port",
                                                    }),
                                                    n.jsx("input", {
                                                      type: "number",
                                                      value: pe.port,
                                                      onChange: (e) =>
                                                        ue({
                                                          ...pe,
                                                          port: e.target.value,
                                                        }),
                                                      placeholder: "9100",
                                                      className:
                                                        "theme-text-primary w-full rounded-xl border border-white/20 bg-transparent px-3 py-2 text-sm focus:border-sky-400 focus:outline-none",
                                                    }),
                                                  ],
                                                }),
                                              ],
                                            }),
                                          }),
                                      n.jsx("button", {
                                        type: "submit",
                                        disabled: ye,
                                        className:
                                          "w-full rounded-full bg-gradient-to-r from-emerald-400 to-teal-500 px-6 py-2 font-semibold text-white transition hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-50",
                                        children: ye
                                          ? "Registering..."
                                          : "Register Printer",
                                      }),
                                    ],
                                  }),
                                ],
                              }),
                            fe &&
                              de.length > 0 &&
                              n.jsxs("div", {
                                className:
                                  "rounded-2xl border border-white/10 bg-white/5 p-4",
                                children: [
                                  n.jsx("h3", {
                                    className:
                                      "theme-text-primary mb-3 text-sm font-semibold",
                                    children: "Registered Printers",
                                  }),
                                  n.jsx("div", {
                                    className: "space-y-2",
                                    children: de.map((e) =>
                                      n.jsxs(
                                        "div",
                                        {
                                          className:
                                            "flex items-center justify-between rounded-xl border border-white/10 bg-white/5 p-3",
                                          children: [
                                            n.jsxs("div", {
                                              children: [
                                                n.jsx("p", {
                                                  className:
                                                    "theme-text-primary text-sm font-semibold",
                                                  children: e.id,
                                                }),
                                                n.jsx("p", {
                                                  className:
                                                    "theme-text-secondary text-xs",
                                                  children:
                                                    "serial" === e.type
                                                      ? `Serial: ${e.config.path} @ ${e.config.baudRate} baud`
                                                      : `Network: ${e.config.host}:${e.config.port}`,
                                                }),
                                              ],
                                            }),
                                            n.jsx("span", {
                                              className:
                                                "theme-chip rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-400",
                                              children: "Active",
                                            }),
                                          ],
                                        },
                                        e.id,
                                      ),
                                    ),
                                  }),
                                ],
                              }),
                            !fe &&
                              n.jsxs("details", {
                                className:
                                  "rounded-2xl border border-white/10 bg-white/5 p-4",
                                children: [
                                  n.jsx("summary", {
                                    className:
                                      "theme-text-primary cursor-pointer text-sm font-semibold list-none",
                                    children: n.jsxs("span", {
                                      className: "flex items-center gap-2",
                                      children: [
                                        n.jsx("span", { children: "ℹ️" }),
                                        n.jsx("span", {
                                          children: "Need help setting up?",
                                        }),
                                      ],
                                    }),
                                  }),
                                  n.jsxs("div", {
                                    className:
                                      "mt-3 pt-3 border-t border-white/10",
                                    children: [
                                      n.jsx("p", {
                                        className:
                                          "theme-text-secondary mb-3 text-xs",
                                        children:
                                          "To enable automatic printing, you need to run a print proxy server on the computer connected to your printer:",
                                      }),
                                      n.jsxs("ol", {
                                        className:
                                          "theme-text-secondary space-y-2 text-xs list-decimal list-inside ml-2",
                                        children: [
                                          n.jsx("li", {
                                            children:
                                              "Install Node.js on the computer with the printer",
                                          }),
                                          n.jsxs("li", {
                                            children: [
                                              "Open terminal in",
                                              " ",
                                              n.jsx("code", {
                                                className:
                                                  "px-1 py-0.5 rounded bg-black/20",
                                                children: "apps/print-proxy",
                                              }),
                                              " ",
                                              "folder",
                                            ],
                                          }),
                                          n.jsxs("li", {
                                            children: [
                                              "Run",
                                              " ",
                                              n.jsx("code", {
                                                className:
                                                  "px-1 py-0.5 rounded bg-black/20",
                                                children: "npm install",
                                              }),
                                            ],
                                          }),
                                          n.jsxs("li", {
                                            children: [
                                              "Run",
                                              " ",
                                              n.jsx("code", {
                                                className:
                                                  "px-1 py-0.5 rounded bg-black/20",
                                                children: "node server.js",
                                              }),
                                            ],
                                          }),
                                          n.jsxs("li", {
                                            children: [
                                              "Enter the server URL above (usually",
                                              " ",
                                              n.jsx("code", {
                                                className:
                                                  "px-1 py-0.5 rounded bg-black/20",
                                                children: "ws://localhost:8080",
                                              }),
                                              ")",
                                            ],
                                          }),
                                        ],
                                      }),
                                    ],
                                  }),
                                ],
                              }),
                          ],
                        }),
                      }),
                    ze &&
                      n.jsx(P, {
                        title: "USB & Bluetooth Printers",
                        description:
                          "Connect POS printers directly via USB Serial or Bluetooth. No proxy server needed!",
                        children: n.jsx(S, {}),
                      }),
                    ze &&
                      n.jsxs(P, {
                        title: "Devices",
                        description:
                          "View and manage connected devices including scanners, printers, and cash registers.",
                        children: [
                          n.jsx("div", {
                            className: "flex justify-end",
                            children: n.jsx(l, {
                              to: "/checkout",
                              className:
                                "theme-chip rounded-full border px-4 py-2 text-xs font-semibold transition hover:border-emerald-300/60 hover:text-emerald-100",
                              children: "← Back to Checkout",
                            }),
                          }),
                          n.jsxs("div", {
                            className:
                              "rounded-2xl border border-white/10 bg-white/5 p-4",
                            children: [
                              n.jsxs("div", {
                                className:
                                  "flex items-center justify-between mb-4",
                                children: [
                                  n.jsx("h3", {
                                    className:
                                      "theme-text-primary text-sm font-semibold",
                                    children: "Connected Devices",
                                  }),
                                  n.jsx("button", {
                                    onClick: async () => {
                                      Re(!0);
                                      try {
                                        const e = await m(x?.locationId);
                                        (Fe(e), r.success("Devices refreshed"));
                                      } catch (e) {
                                        r.error("Failed to refresh devices");
                                      } finally {
                                        Re(!1);
                                      }
                                    },
                                    disabled: Ke,
                                    className:
                                      "theme-chip rounded-full border px-4 py-2 text-xs font-semibold transition hover:border-sky-400 disabled:opacity-50",
                                    children: Ke ? "Loading..." : "🔄 Refresh",
                                  }),
                                ],
                              }),
                              Ke
                                ? n.jsxs("div", {
                                    className: "text-center py-8",
                                    children: [
                                      n.jsx("div", {
                                        className:
                                          "inline-block h-6 w-6 animate-spin rounded-full border-2 border-sky-400 border-t-transparent",
                                      }),
                                      n.jsx("p", {
                                        className:
                                          "theme-text-secondary mt-2 text-sm",
                                        children: "Loading devices...",
                                      }),
                                    ],
                                  })
                                : 0 === De.length &&
                                    0 === Le.length &&
                                    0 === de.length
                                  ? n.jsxs("div", {
                                      className: "text-center py-8",
                                      children: [
                                        n.jsx("div", {
                                          className: "text-4xl mb-3",
                                          children: "📱",
                                        }),
                                        n.jsx("p", {
                                          className:
                                            "theme-text-primary text-sm font-semibold mb-1",
                                          children: "No devices connected",
                                        }),
                                        n.jsx("p", {
                                          className:
                                            "theme-text-secondary text-xs",
                                          children:
                                            "Connect USB devices or pair Bluetooth devices via system settings to see them here.",
                                        }),
                                      ],
                                    })
                                  : n.jsxs("div", {
                                      className: "space-y-3",
                                      children: [
                                        De.map((e) =>
                                          n.jsxs(
                                            "div",
                                            {
                                              className:
                                                "flex items-center justify-between rounded-xl border border-white/10 bg-white/5 p-3",
                                              children: [
                                                n.jsxs("div", {
                                                  className:
                                                    "flex items-center gap-3",
                                                  children: [
                                                    n.jsxs("div", {
                                                      className: "text-2xl",
                                                      children: [
                                                        "usb" === e.type &&
                                                          "🔌",
                                                        "bluetooth" ===
                                                          e.type && "📡",
                                                        "camera" === e.type &&
                                                          "📷",
                                                      ],
                                                    }),
                                                    n.jsxs("div", {
                                                      children: [
                                                        n.jsx("p", {
                                                          className:
                                                            "theme-text-primary text-sm font-semibold",
                                                          children: e.name,
                                                        }),
                                                        n.jsxs("p", {
                                                          className:
                                                            "theme-text-secondary text-xs",
                                                          children: [
                                                            "usb" === e.type &&
                                                              "USB Scanner",
                                                            "bluetooth" ===
                                                              e.type &&
                                                              "Bluetooth Scanner",
                                                            "camera" ===
                                                              e.type &&
                                                              "Camera Scanner",
                                                            " • ",
                                                            "Connected",
                                                            " ",
                                                            w(
                                                              new Date(
                                                                e.connectedAt,
                                                              ),
                                                              "MMM dd, yyyy",
                                                            ),
                                                            e.lastUsedAt &&
                                                              ` • Last used ${w(new Date(e.lastUsedAt), "MMM dd, HH:mm")}`,
                                                          ],
                                                        }),
                                                      ],
                                                    }),
                                                  ],
                                                }),
                                                n.jsxs("div", {
                                                  className:
                                                    "flex items-center gap-2",
                                                  children: [
                                                    e.isActive &&
                                                      n.jsx("span", {
                                                        className:
                                                          "theme-chip rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-400",
                                                        children: "Active",
                                                      }),
                                                    "bluetooth" === e.type &&
                                                      n.jsx("span", {
                                                        className:
                                                          "theme-chip rounded-full border border-purple-500/30 bg-purple-500/10 px-3 py-1 text-xs font-semibold text-purple-400",
                                                        children:
                                                          "System Paired",
                                                      }),
                                                  ],
                                                }),
                                              ],
                                            },
                                            e.id,
                                          ),
                                        ),
                                        Le.filter(
                                          (e) => !De.find((t) => t.id === e.id),
                                        ).map((e) =>
                                          n.jsxs(
                                            "div",
                                            {
                                              className:
                                                "flex items-center justify-between rounded-xl border border-white/10 bg-white/5 p-3",
                                              children: [
                                                n.jsxs("div", {
                                                  className:
                                                    "flex items-center gap-3",
                                                  children: [
                                                    n.jsxs("div", {
                                                      className: "text-2xl",
                                                      children: [
                                                        "usb" === e.type &&
                                                          "🔌",
                                                        "bluetooth" ===
                                                          e.type && "📡",
                                                        "camera" === e.type &&
                                                          "📷",
                                                      ],
                                                    }),
                                                    n.jsxs("div", {
                                                      children: [
                                                        n.jsx("p", {
                                                          className:
                                                            "theme-text-primary text-sm font-semibold",
                                                          children: e.name,
                                                        }),
                                                        n.jsxs("p", {
                                                          className:
                                                            "theme-text-secondary text-xs",
                                                          children: [
                                                            "usb" === e.type &&
                                                              "USB Scanner",
                                                            "bluetooth" ===
                                                              e.type &&
                                                              "Bluetooth Scanner",
                                                            "camera" ===
                                                              e.type &&
                                                              "Camera Scanner",
                                                            " • ",
                                                            "Connected",
                                                            " ",
                                                            w(
                                                              new Date(
                                                                e.connectedAt,
                                                              ),
                                                              "MMM dd, yyyy",
                                                            ),
                                                          ],
                                                        }),
                                                      ],
                                                    }),
                                                  ],
                                                }),
                                                n.jsxs("div", {
                                                  className:
                                                    "flex items-center gap-2",
                                                  children: [
                                                    e.isActive &&
                                                      n.jsx("span", {
                                                        className:
                                                          "theme-chip rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-400",
                                                        children: "Active",
                                                      }),
                                                    "bluetooth" === e.type &&
                                                      n.jsx("span", {
                                                        className:
                                                          "theme-chip rounded-full border border-purple-500/30 bg-purple-500/10 px-3 py-1 text-xs font-semibold text-purple-400",
                                                        children:
                                                          "System Paired",
                                                      }),
                                                  ],
                                                }),
                                              ],
                                            },
                                            e.id,
                                          ),
                                        ),
                                        de.map((e) =>
                                          n.jsxs(
                                            "div",
                                            {
                                              className:
                                                "flex items-center justify-between rounded-xl border border-white/10 bg-white/5 p-3",
                                              children: [
                                                n.jsxs("div", {
                                                  className:
                                                    "flex items-center gap-3",
                                                  children: [
                                                    n.jsx("div", {
                                                      className: "text-2xl",
                                                      children: "🖨️",
                                                    }),
                                                    n.jsxs("div", {
                                                      children: [
                                                        n.jsx("p", {
                                                          className:
                                                            "theme-text-primary text-sm font-semibold",
                                                          children: e.id,
                                                        }),
                                                        n.jsxs("p", {
                                                          className:
                                                            "theme-text-secondary text-xs",
                                                          children: [
                                                            "serial" === e.type
                                                              ? `Serial/USB: ${e.config.path} @ ${e.config.baudRate} baud`
                                                              : `Network: ${e.config.host}:${e.config.port}`,
                                                            " • ",
                                                            "Receipt Printer",
                                                          ],
                                                        }),
                                                      ],
                                                    }),
                                                  ],
                                                }),
                                                n.jsx("span", {
                                                  className:
                                                    "theme-chip rounded-full border border-sky-500/30 bg-sky-500/10 px-3 py-1 text-xs font-semibold text-sky-400",
                                                  children:
                                                    "serial" === e.type
                                                      ? "USB"
                                                      : "Network",
                                                }),
                                              ],
                                            },
                                            e.id,
                                          ),
                                        ),
                                      ],
                                    }),
                            ],
                          }),
                          n.jsxs("div", {
                            className:
                              "rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 mt-4",
                            children: [
                              n.jsx("h4", {
                                className:
                                  "theme-text-primary mb-2 text-sm font-semibold text-amber-400",
                                children: "ℹ️ Device Management Notes",
                              }),
                              n.jsxs("ul", {
                                className:
                                  "theme-text-secondary space-y-1 text-xs list-disc list-inside",
                                children: [
                                  n.jsxs("li", {
                                    children: [
                                      n.jsx("strong", {
                                        className: "theme-text-primary",
                                        children: "USB Devices:",
                                      }),
                                      " ",
                                      "Automatically detected when plugged in. No configuration needed.",
                                    ],
                                  }),
                                  n.jsxs("li", {
                                    children: [
                                      n.jsx("strong", {
                                        className: "theme-text-primary",
                                        children: "Bluetooth Devices:",
                                      }),
                                      " ",
                                      "Must be paired via system Bluetooth settings first. After pairing, they'll appear here automatically.",
                                    ],
                                  }),
                                  n.jsxs("li", {
                                    children: [
                                      n.jsx("strong", {
                                        className: "theme-text-primary",
                                        children: "Printers:",
                                      }),
                                      " ",
                                      "Configure in the Receipt Printer section below. Requires print proxy server.",
                                    ],
                                  }),
                                  n.jsxs("li", {
                                    children: [
                                      n.jsx("strong", {
                                        className: "theme-text-primary",
                                        children: "Cash Registers:",
                                      }),
                                      " ",
                                      "Configure as network printers in the Receipt Printer section.",
                                    ],
                                  }),
                                ],
                              }),
                            ],
                          }),
                        ],
                      }),
                    n.jsx(P, {
                      title: "Workspace",
                      description:
                        "Control interface preferences for all team members.",
                      children: n.jsxs("div", {
                        className: "grid gap-4 md:grid-cols-2",
                        children: [
                          n.jsxs("div", {
                            className:
                              "flex items-center justify-between rounded-2xl border border-white/10 bg-white/5/0 px-4 py-3",
                            children: [
                              n.jsxs("div", {
                                children: [
                                  n.jsx("h3", {
                                    className:
                                      "theme-text-primary text-sm font-semibold",
                                    children: "Theme",
                                  }),
                                  n.jsx("p", {
                                    className: "theme-text-secondary text-xs",
                                    children:
                                      "Toggle between light and dark modes. Preference is stored per device.",
                                  }),
                                ],
                              }),
                              n.jsx(o, {}),
                            ],
                          }),
                          n.jsxs("div", {
                            className:
                              "flex items-center justify-between rounded-2xl border border-white/10 bg-white/5/0 px-4 py-3",
                            children: [
                              n.jsxs("div", {
                                children: [
                                  n.jsx("h3", {
                                    className:
                                      "theme-text-primary text-sm font-semibold",
                                    children: "Sound effects",
                                  }),
                                  n.jsx("p", {
                                    className: "theme-text-secondary text-xs",
                                    children:
                                      "Audio cues will be available in a future release.",
                                  }),
                                ],
                              }),
                              n.jsx("span", {
                                className:
                                  "theme-chip rounded-full border px-3 py-1 text-xs font-semibold",
                                children: "Coming soon",
                              }),
                            ],
                          }),
                        ],
                      }),
                    }),
                  ],
                }),
            ],
          }),
          n.jsxs("div", {
            className: "theme-text-secondary text-xs",
            children: [
              "Logged in as",
              " ",
              n.jsx("span", {
                className: "theme-text-primary font-medium",
                children: x?.name,
              }),
              " ",
              "on tenant",
              " ",
              n.jsx("span", {
                className: "theme-text-primary font-medium lowercase",
                children: h?.slug ?? "unknown",
              }),
              ". Role:",
              " ",
              n.jsx("span", {
                className: "theme-text-primary font-medium capitalize",
                children: x?.role ?? "unknown",
              }),
            ],
          }),
        ],
      }),
      J &&
        ee &&
        n.jsx("div", {
          className:
            "fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4",
          children: n.jsxs("div", {
            className:
              "theme-card w-full max-w-md rounded-2xl border p-6 backdrop-blur-xl",
            children: [
              n.jsxs("h3", {
                className: "theme-text-primary mb-2 text-lg font-semibold",
                children: ["Reset PIN for ", ee.name],
              }),
              n.jsx("p", {
                className: "theme-text-secondary mb-6 text-sm",
                children: "Enter a new PIN for this user (4-64 characters)",
              }),
              n.jsxs("div", {
                className: "space-y-4",
                children: [
                  n.jsxs("div", {
                    children: [
                      n.jsx("label", {
                        className:
                          "theme-text-primary mb-2 block text-sm font-medium",
                        children: "New PIN",
                      }),
                      n.jsx("input", {
                        type: "password",
                        value: se,
                        onChange: (e) => ae(e.target.value),
                        placeholder: "Enter new PIN",
                        minLength: 4,
                        maxLength: 64,
                        className:
                          "theme-surface w-full rounded-xl border px-4 py-3 text-sm theme-text-primary focus:border-sky-400 focus:outline-none",
                        autoFocus: !0,
                      }),
                    ],
                  }),
                  n.jsxs("div", {
                    children: [
                      n.jsx("label", {
                        className:
                          "theme-text-primary mb-2 block text-sm font-medium",
                        children: "Confirm PIN",
                      }),
                      n.jsx("input", {
                        type: "password",
                        value: re,
                        onChange: (e) => ne(e.target.value),
                        placeholder: "Confirm new PIN",
                        minLength: 4,
                        maxLength: 64,
                        onKeyDown: (e) => {
                          "Enter" === e.key && se && re && qe();
                        },
                        className:
                          "theme-surface w-full rounded-xl border px-4 py-3 text-sm theme-text-primary focus:border-sky-400 focus:outline-none",
                      }),
                    ],
                  }),
                ],
              }),
              n.jsxs("div", {
                className: "mt-6 flex gap-3",
                children: [
                  n.jsx("button", {
                    onClick: qe,
                    disabled:
                      ie ||
                      !se ||
                      !re ||
                      se !== re ||
                      se.length < 4 ||
                      se.length > 64,
                    className:
                      "flex-1 rounded-full bg-gradient-to-r from-sky-400 via-sky-500 to-sky-400 px-6 py-3 font-semibold text-white shadow-lg transition hover:shadow-sky-900/70 disabled:cursor-not-allowed disabled:opacity-50",
                    children: ie ? "Resetting..." : "Reset PIN",
                  }),
                  n.jsx("button", {
                    onClick: () => {
                      (X(!1), te(null), ae(""), ne(""));
                    },
                    disabled: ie,
                    className:
                      "theme-chip rounded-full border px-6 py-3 font-semibold transition hover:border-sky-400 hover:text-sky-200 disabled:cursor-not-allowed disabled:opacity-50",
                    children: "Cancel",
                  }),
                ],
              }),
            ],
          }),
        }),
    ],
  });
}
export { B as SettingsPage };
