"use client";

import { useEffect, useRef, useState } from "react";
import {
  Bluetooth,
  BluetoothConnected,
  BluetoothOff,
  Power,
  RefreshCw,
  Eye,
  EyeOff,
  Send,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

/**
 * Common BLE service UUIDs that we hint to the browser so they show up in the
 * service list when present. Add more here as you encounter them on real
 * devices. The AC6328A's Jieli stack typically exposes a custom 16-bit service
 * in the 0xAE00 range plus the standard Device Information / Battery services.
 */
/**
 * Service UUIDs the browser is allowed to expose post-connect. Anything not in
 * this list is invisible to JS even if the device exposes it. Names below must
 * either be Bluetooth-SIG-blessed aliases or full 128-bit UUIDs — vendor names
 * like "nordic_uart_service" are NOT recognized and will reject the whole
 * requestDevice call.
 */
const OPTIONAL_SERVICES: BluetoothServiceUUID[] = [
  // Standard SIG services
  "generic_access",
  "generic_attribute",
  "device_information",
  "battery_service",
  "heart_rate",
  "current_time",
  "human_interface_device",
  "immediate_alert",
  "link_loss",
  "tx_power",
  "user_data",
  "blood_pressure",
  "cycling_power",
  "running_speed_and_cadence",
  "environmental_sensing",
  "pulse_oximeter",
  "weight_scale",
  "fitness_machine",
  // Nordic UART Service (de-facto serial protocol on many BLE MCUs)
  "6e400001-b5a3-f393-e0a9-e50e24dcca9e",
  // Common 16-bit vendor services (Jieli AC6328A / generic audio MCU stacks)
  0xae00,
  0xae30,
  0xfd00,
  0xfee0,
  0xfee7,
  0xffe0,
  0xffe5,
  0xfff0,
];

interface LogEntry {
  ts: number;
  level: "info" | "ok" | "warn" | "err";
  text: string;
}

interface CharView {
  service: BluetoothRemoteGATTService;
  char: BluetoothRemoteGATTCharacteristic;
  serviceUuid: string;
  charUuid: string;
  props: string[];
  value?: string;
  subscribed: boolean;
}

const CUSTOM_UUIDS_KEY = "soleiq.bt.customServiceUuids";

const isValidUuid = (s: string): boolean => {
  const t = s.trim().toLowerCase();
  if (!t) return false;
  if (/^0x[0-9a-f]{1,4}$/.test(t)) return true;
  if (/^[0-9a-f]{1,4}$/.test(t)) return true;
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(t))
    return true;
  return false;
};

const parseCustomUuids = (raw: string): BluetoothServiceUUID[] => {
  return raw
    .split(/[\s,]+/)
    .map((s) => s.trim())
    .filter(isValidUuid)
    .map((s) => {
      const t = s.toLowerCase();
      if (/^0x[0-9a-f]{1,4}$/.test(t)) return parseInt(t, 16);
      if (/^[0-9a-f]{1,4}$/.test(t)) return parseInt(t, 16);
      return t;
    });
};

const propList = (c: BluetoothRemoteGATTCharacteristic): string[] => {
  const p = c.properties;
  const out: string[] = [];
  if (p.read) out.push("read");
  if (p.write) out.push("write");
  if (p.writeWithoutResponse) out.push("writeNR");
  if (p.notify) out.push("notify");
  if (p.indicate) out.push("indicate");
  return out;
};

const hex = (data: DataView): string => {
  const parts: string[] = [];
  for (let i = 0; i < data.byteLength; i++) {
    parts.push(data.getUint8(i).toString(16).padStart(2, "0"));
  }
  return parts.join(" ");
};

const asAscii = (data: DataView): string => {
  let out = "";
  for (let i = 0; i < data.byteLength; i++) {
    const b = data.getUint8(i);
    out += b >= 0x20 && b <= 0x7e ? String.fromCharCode(b) : ".";
  }
  return out;
};

const fmtTime = (ts: number) =>
  new Date(ts).toLocaleTimeString(undefined, { hour12: false }) +
  "." +
  String(ts % 1000).padStart(3, "0");

const parseHex = (input: string): Uint8Array | null => {
  const cleaned = input.trim().replace(/0x/gi, "").replace(/[,\s]+/g, "");
  if (cleaned.length === 0 || cleaned.length % 2 !== 0) return null;
  if (!/^[0-9a-f]+$/i.test(cleaned)) return null;
  const out = new Uint8Array(cleaned.length / 2);
  for (let i = 0; i < cleaned.length; i += 2) {
    out[i / 2] = parseInt(cleaned.slice(i, i + 2), 16);
  }
  return out;
};

export default function BluetoothTestPage() {
  const [supported, setSupported] = useState<boolean | null>(null);
  const [device, setDevice] = useState<BluetoothDevice | null>(null);
  const [server, setServer] = useState<BluetoothRemoteGATTServer | null>(null);
  const [chars, setChars] = useState<CharView[]>([]);
  const [connecting, setConnecting] = useState(false);
  const [log, setLog] = useState<LogEntry[]>([]);
  const [customUuidsRaw, setCustomUuidsRaw] = useState("");
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof navigator !== "undefined") {
      setSupported(typeof navigator.bluetooth !== "undefined");
    }
    if (typeof localStorage !== "undefined") {
      setCustomUuidsRaw(localStorage.getItem(CUSTOM_UUIDS_KEY) ?? "");
    }
  }, []);

  useEffect(() => {
    if (typeof localStorage === "undefined") return;
    localStorage.setItem(CUSTOM_UUIDS_KEY, customUuidsRaw);
  }, [customUuidsRaw]);

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [log]);

  const append = (level: LogEntry["level"], text: string) =>
    setLog((prev) => [...prev, { ts: Date.now(), level, text }]);

  const requestAndConnect = async () => {
    if (!navigator.bluetooth) return;
    setConnecting(true);
    try {
      append("info", "Requesting device…");
      const extra = parseCustomUuids(customUuidsRaw);
      if (extra.length > 0) {
        append(
          "info",
          `Including ${extra.length} custom service UUID${extra.length === 1 ? "" : "s"}`
        );
      }
      const dev = await navigator.bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: [...OPTIONAL_SERVICES, ...extra],
      });
      setDevice(dev);
      append("ok", `Picked: ${dev.name ?? "(unnamed)"} · id ${dev.id}`);

      dev.addEventListener("gattserverdisconnected", () => {
        append("warn", "Disconnected.");
        setServer(null);
        setChars([]);
      });

      append("info", "Connecting GATT…");
      const gatt = await dev.gatt!.connect();
      setServer(gatt);
      append("ok", "GATT connected. Discovering services…");

      const services = await gatt.getPrimaryServices();
      const all: CharView[] = [];
      for (const svc of services) {
        const cs = await svc.getCharacteristics();
        for (const c of cs) {
          all.push({
            service: svc,
            char: c,
            serviceUuid: svc.uuid,
            charUuid: c.uuid,
            props: propList(c),
            subscribed: false,
          });
        }
      }
      setChars(all);
      append(
        "ok",
        `Found ${services.length} service${services.length === 1 ? "" : "s"}, ${all.length} characteristic${all.length === 1 ? "" : "s"}.`
      );
    } catch (e) {
      append("err", (e as Error).message);
    } finally {
      setConnecting(false);
    }
  };

  const disconnect = () => {
    if (server?.connected) server.disconnect();
    setServer(null);
    setDevice(null);
    setChars([]);
    append("info", "Manually disconnected.");
  };

  const readChar = async (cv: CharView) => {
    try {
      const v = await cv.char.readValue();
      const text = `${hex(v)}  |  "${asAscii(v)}"`;
      setChars((prev) =>
        prev.map((p) => (p === cv ? { ...p, value: text } : p))
      );
      append("ok", `read ${short(cv.charUuid)} → ${text}`);
    } catch (e) {
      append("err", `read ${short(cv.charUuid)}: ${(e as Error).message}`);
    }
  };

  const writeChar = async (cv: CharView, raw: string) => {
    const bytes = parseHex(raw);
    if (!bytes) {
      append("err", "Write: input must be hex (e.g. 01 02 ff)");
      return;
    }
    try {
      const buf = bytes.buffer.slice(
        bytes.byteOffset,
        bytes.byteOffset + bytes.byteLength
      ) as ArrayBuffer;
      if (cv.char.properties.writeWithoutResponse) {
        await cv.char.writeValueWithoutResponse(buf);
      } else {
        await cv.char.writeValueWithResponse(buf);
      }
      append(
        "ok",
        `wrote ${bytes.length} byte${bytes.length === 1 ? "" : "s"} to ${short(
          cv.charUuid
        )}`
      );
    } catch (e) {
      append("err", `write ${short(cv.charUuid)}: ${(e as Error).message}`);
    }
  };

  const toggleNotify = async (cv: CharView) => {
    try {
      if (cv.subscribed) {
        await cv.char.stopNotifications();
        setChars((prev) =>
          prev.map((p) => (p === cv ? { ...p, subscribed: false } : p))
        );
        append("info", `unsubscribed ${short(cv.charUuid)}`);
      } else {
        await cv.char.startNotifications();
        cv.char.addEventListener("characteristicvaluechanged", (ev) => {
          const v = (ev.target as BluetoothRemoteGATTCharacteristic).value;
          if (!v) return;
          const text = `${hex(v)}  |  "${asAscii(v)}"`;
          setChars((prev) =>
            prev.map((p) => (p.char === cv.char ? { ...p, value: text } : p))
          );
          append("ok", `notify ${short(cv.charUuid)} → ${text}`);
        });
        setChars((prev) =>
          prev.map((p) => (p === cv ? { ...p, subscribed: true } : p))
        );
        append("ok", `subscribed ${short(cv.charUuid)}`);
      }
    } catch (e) {
      append("err", `notify ${short(cv.charUuid)}: ${(e as Error).message}`);
    }
  };

  if (supported === false) {
    return (
      <UnsupportedView />
    );
  }

  return (
    <div className="min-h-screen bg-warmGray-50/40">
      <header className="border-b border-warmGray-100 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-xs text-warmGray-600 hover:text-brand">
              ← Home
            </Link>
            <span className="text-warmGray-100">|</span>
            <h1 className="flex items-center gap-2 text-xl font-semibold text-warmGray-800">
              <Bluetooth className="h-5 w-5 text-brand" /> BLE test
            </h1>
            {device && (
              <span
                className={cn(
                  "ml-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
                  server?.connected
                    ? "bg-teal-50 text-teal-800"
                    : "bg-warmGray-50 text-warmGray-600"
                )}
              >
                {server?.connected ? (
                  <BluetoothConnected className="h-3 w-3" />
                ) : (
                  <BluetoothOff className="h-3 w-3" />
                )}
                {device.name ?? "Unnamed device"}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {!server?.connected ? (
              <Button
                size="sm"
                onClick={requestAndConnect}
                disabled={connecting}
              >
                <Bluetooth className="mr-1.5 h-4 w-4" />
                {connecting ? "Connecting…" : "Scan & connect"}
              </Button>
            ) : (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={requestAndConnect}
                >
                  <RefreshCw className="mr-1.5 h-4 w-4" />
                  Reconnect
                </Button>
                <Button size="sm" variant="outline" onClick={disconnect}>
                  <Power className="mr-1.5 h-4 w-4" />
                  Disconnect
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-5xl gap-6 px-6 py-8 lg:grid-cols-[1fr_360px]">
        <section className="space-y-4">
          {chars.length === 0 ? (
            <EmptyState
              supported={!!supported}
              connected={!!server?.connected}
              deviceName={device?.name ?? null}
            />
          ) : (
            chars.reduce<JSX.Element[]>((acc, cv, i) => {
              const prev = i === 0 ? null : chars[i - 1];
              if (!prev || prev.serviceUuid !== cv.serviceUuid) {
                acc.push(
                  <h2
                    key={`hdr-${cv.serviceUuid}-${i}`}
                    className="mt-2 text-xs font-semibold uppercase tracking-wide text-warmGray-600"
                  >
                    Service · <span className="font-mono">{cv.serviceUuid}</span>
                  </h2>
                );
              }
              acc.push(
                <CharRow
                  key={`${cv.serviceUuid}-${cv.charUuid}-${i}`}
                  cv={cv}
                  onRead={() => readChar(cv)}
                  onWrite={(raw) => writeChar(cv, raw)}
                  onToggleNotify={() => toggleNotify(cv)}
                />
              );
              return acc;
            }, [])
          )}
        </section>

        <aside className="space-y-4">
          <div>
            <h2 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-warmGray-600">
              Custom service UUIDs
            </h2>
            <textarea
              value={customUuidsRaw}
              onChange={(e) => setCustomUuidsRaw(e.target.value)}
              placeholder={"0xAE00\n6e400001-b5a3-f393-e0a9-e50e24dcca9e"}
              rows={3}
              className="w-full rounded-2xl border border-warmGray-100 bg-white p-2 font-mono text-[11px] outline-none focus:border-brand"
            />
            <p className="mt-1 text-[10px] leading-snug text-warmGray-600">
              One per line or comma-separated. Required for any 128-bit vendor
              UUID not in the built-in list. Saved locally in your browser.
            </p>
          </div>

          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-warmGray-600">
              Event log
            </h2>
            <button
              onClick={() => setLog([])}
              className="inline-flex items-center text-xs text-warmGray-600 hover:text-warmGray-800"
            >
              <Trash2 className="mr-1 h-3 w-3" /> clear
            </button>
          </div>
          <div
            ref={logRef}
            className="h-[60vh] overflow-y-auto rounded-2xl border border-warmGray-100 bg-warmGray-800 p-3 font-mono text-[11px] leading-snug text-warmGray-100"
          >
            {log.length === 0 ? (
              <p className="text-warmGray-600">
                Idle. Tap "Scan & connect" to begin.
              </p>
            ) : (
              log.map((e, i) => (
                <p key={i} className={LOG_CLASS[e.level]}>
                  <span className="opacity-60">[{fmtTime(e.ts)}]</span> {e.text}
                </p>
              ))
            )}
          </div>
          <p className="text-[11px] text-warmGray-600">
            Web Bluetooth works in Chrome, Edge, Opera (desktop + Android). It is
            <span className="font-semibold"> not</span> available in Safari or on
            iOS. Requires HTTPS in production; localhost is fine for dev.
          </p>
        </aside>
      </main>
    </div>
  );
}

const LOG_CLASS: Record<LogEntry["level"], string> = {
  info: "text-warmGray-100",
  ok: "text-teal-100",
  warn: "text-amber-100",
  err: "text-red-200",
};

function short(uuid: string): string {
  // Compress full UUIDs of standard form 0000XXXX-0000-1000-8000-00805f9b34fb to 0xXXXX.
  const m = uuid.match(
    /^0000([0-9a-f]{4})-0000-1000-8000-00805f9b34fb$/i
  );
  return m ? `0x${m[1]}` : uuid.slice(0, 8) + "…";
}

function CharRow({
  cv,
  onRead,
  onWrite,
  onToggleNotify,
}: {
  cv: CharView;
  onRead: () => void;
  onWrite: (raw: string) => void;
  onToggleNotify: () => void;
}) {
  const [write, setWrite] = useState("");
  const canRead = cv.char.properties.read;
  const canWrite =
    cv.char.properties.write || cv.char.properties.writeWithoutResponse;
  const canNotify =
    cv.char.properties.notify || cv.char.properties.indicate;

  return (
    <Card className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="font-mono text-xs text-warmGray-800">{cv.charUuid}</p>
          <div className="mt-1 flex flex-wrap gap-1">
            {cv.props.map((p) => (
              <span
                key={p}
                className="rounded-full bg-blue-50 px-1.5 py-0.5 text-[10px] font-medium text-brand"
              >
                {p}
              </span>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-1">
          {canRead && (
            <Button size="sm" variant="outline" onClick={onRead}>
              <Eye className="mr-1 h-3.5 w-3.5" /> Read
            </Button>
          )}
          {canNotify && (
            <Button
              size="sm"
              variant={cv.subscribed ? "primary" : "outline"}
              onClick={onToggleNotify}
            >
              {cv.subscribed ? (
                <EyeOff className="mr-1 h-3.5 w-3.5" />
              ) : (
                <Eye className="mr-1 h-3.5 w-3.5" />
              )}
              {cv.subscribed ? "Stop" : "Subscribe"}
            </Button>
          )}
        </div>
      </div>

      {cv.value && (
        <pre className="overflow-x-auto rounded-lg bg-warmGray-50 p-2 font-mono text-[11px] text-warmGray-800">
          {cv.value}
        </pre>
      )}

      {canWrite && (
        <div className="flex items-center gap-2">
          <Input
            value={write}
            onChange={(e) => setWrite(e.target.value)}
            placeholder="Hex bytes, e.g. 01 02 ff"
            className="h-9 font-mono text-xs"
          />
          <Button
            size="sm"
            onClick={() => onWrite(write)}
            disabled={!write.trim()}
          >
            <Send className="mr-1 h-3.5 w-3.5" /> Write
          </Button>
        </div>
      )}
    </Card>
  );
}

function EmptyState({
  supported,
  connected,
  deviceName,
}: {
  supported: boolean;
  connected: boolean;
  deviceName: string | null;
}) {
  if (connected) {
    return (
      <Card className="p-8 text-center">
        <BluetoothConnected className="mx-auto h-10 w-10 text-teal-600" />
        <h2 className="mt-3 text-lg font-semibold text-warmGray-800">
          Connected to {deviceName ?? "device"} — but no GATT services exposed
        </h2>
        <p className="mt-2 text-sm text-warmGray-600">
          The peripheral accepted the connection but isn't advertising any
          readable services or characteristics.
        </p>
        <div className="mx-auto mt-4 max-w-md rounded-2xl bg-warmGray-50 p-4 text-left text-xs leading-relaxed text-warmGray-800">
          <p className="mb-2 font-semibold">Common cause</p>
          <p>
            In <span className="font-mono">nRF Connect</span> you set up an{" "}
            <span className="font-semibold">Advertiser</span> but no{" "}
            <span className="font-semibold">Server</span>. Advertisers only
            broadcast presence — they expose nothing on connect.
          </p>
          <p className="mt-3 font-semibold">Fix</p>
          <p>
            On your phone → nRF Connect → Peripheral tab → tap{" "}
            <span className="font-semibold">Add Server</span> →{" "}
            <span className="font-semibold">Battery Service</span> (or any
            sample) → enable it. Then click Reconnect above.
          </p>
        </div>
      </Card>
    );
  }
  return (
    <Card className="p-8 text-center">
      <Bluetooth className="mx-auto h-10 w-10 text-warmGray-100" />
      <h2 className="mt-3 text-lg font-semibold text-warmGray-800">
        No device connected
      </h2>
      <p className="mt-1 text-sm text-warmGray-600">
        Tap <span className="font-semibold">Scan &amp; connect</span> above. A
        native picker opens listing nearby BLE peripherals.
      </p>
      <p className="mt-4 text-[11px] text-warmGray-600">
        Targets that have been tested: any BLE peripheral (phone advertising,
        fitness band, ESP32, Jieli AC6328A dev kits, nRF52 devkits, etc.).
        Bluetooth Classic devices (e.g. AB5607E SPP-only audio MCUs) won't
        appear — browsers can only see BLE GATT.
      </p>
      {!supported && (
        <p className="mt-3 text-xs text-risk-medium">
          This browser doesn't support Web Bluetooth.
        </p>
      )}
    </Card>
  );
}

function UnsupportedView() {
  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-3 px-6 text-center">
      <BluetoothOff className="h-12 w-12 text-warmGray-100" />
      <h1 className="text-xl font-semibold text-warmGray-800">
        Web Bluetooth isn't available
      </h1>
      <p className="text-sm text-warmGray-600">
        Open this page in <span className="font-semibold">Chrome</span>,{" "}
        <span className="font-semibold">Edge</span>, or{" "}
        <span className="font-semibold">Opera</span> on desktop or Android.
        Safari, iOS, and Firefox don't ship the Web Bluetooth API.
      </p>
      <Link href="/" className="mt-3 text-sm font-medium text-brand">
        Back to home
      </Link>
    </div>
  );
}
