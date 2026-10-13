import fs from "fs";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "data");
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const CODES_FILE = path.join(DATA_DIR, "codes.json");
const ORDERS_FILE = path.join(DATA_DIR, "orders.json");

type Code = {
  id: number;
  code: string;
  edition: string;
  total: number;
  used: number;
  active: number;
  created_at: string;
  notes: string;
};

type Order = {
  id: number;
  order_id: string;
  code: string;
  filename: string;
  stored_path: string;
  status: "pending" | "processing" | "done" | "failed";
  report_file: string;
  report_url: string;
  message: string;
  created_at: string;
  updated_at: string;
};

function readJSON<T>(file: string, empty: T): T {
  try {
    if (!fs.existsSync(file)) return empty;
    return JSON.parse(fs.readFileSync(file, "utf-8")) as T;
  } catch {
    return empty;
  }
}

function writeJSON<T>(file: string, data: T) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2), "utf-8");
}

function now() {
  return new Date().toISOString().replace("T", " ").slice(0, 19);
}

// === 卡密 ===

export function validateCode(code: string) {
  const codes = readJSON<Code[]>(CODES_FILE, []);
  const row = codes.find((c) => c.code === code && c.active === 1);
  if (!row) return { ok: false, error: "兑换码无效或已被禁用" };
  if (row.used >= row.total) return { ok: false, error: "兑换码已用完" };
  return { ok: true, code: row };
}

export function markCodeUsed(code: string) {
  const codes = readJSON<Code[]>(CODES_FILE, []);
  const row = codes.find((c) => c.code === code);
  if (row) row.used += 1;
  writeJSON(CODES_FILE, codes);
}

export function bulkInsertCodes(codeList: string[], edition = "standard", notes = "") {
  let codes = readJSON<Code[]>(CODES_FILE, []);
  let nextId = codes.length > 0 ? Math.max(...codes.map((c) => c.id)) + 1 : 1;
  let added = 0;
  for (const raw of codeList) {
    const c = raw.trim();
    if (!c) continue;
    if (codes.some((x) => x.code === c)) continue;
    codes.push({
      id: nextId++,
      code: c,
      edition,
      total: 1,
      used: 0,
      active: 1,
      created_at: now(),
      notes,
    });
    added++;
  }
  writeJSON(CODES_FILE, codes);
  return added;
}

export function listCodes(limit = 100) {
  const codes = readJSON<Code[]>(CODES_FILE, []);
  return codes.sort((a, b) => b.id - a.id).slice(0, limit);
}

// === 订单 ===

export function createOrder(code: string, filename: string, storedPath: string) {
  const orders = readJSON<Order[]>(ORDERS_FILE, []);
  const orderId = "TT" + Date.now().toString(36).toUpperCase() + Math.random().toString(36).slice(2, 6).toUpperCase();
  const newOrder: Order = {
    id: orders.length > 0 ? Math.max(...orders.map((o) => o.id)) + 1 : 1,
    order_id: orderId,
    code,
    filename,
    stored_path: storedPath,
    status: "pending",
    report_file: "",
    report_url: "",
    message: "",
    created_at: now(),
    updated_at: now(),
  };
  orders.push(newOrder);
  writeJSON(ORDERS_FILE, orders);
  return orderId;
}

export function getOrderByCode(code: string) {
  const orders = readJSON<Order[]>(ORDERS_FILE, []);
  return orders
    .filter((o) => o.code === code)
    .sort((a, b) => b.id - a.id)
    .slice(0, 10);
}

export function getOrderByOrderId(orderId: string) {
  const orders = readJSON<Order[]>(ORDERS_FILE, []);
  return orders.find((o) => o.order_id === orderId);
}

export function updateOrderStatus(
  orderId: string,
  status: string,
  opts?: { reportUrl?: string; reportFile?: string; message?: string }
) {
  const orders = readJSON<Order[]>(ORDERS_FILE, []);
  const o = orders.find((x) => x.order_id === orderId);
  if (!o) return;
  o.status = status as Order["status"];
  if (opts?.reportUrl !== undefined) o.report_url = opts.reportUrl;
  if (opts?.reportFile !== undefined) o.report_file = opts.reportFile;
  if (opts?.message !== undefined) o.message = opts.message;
  o.updated_at = now();
  writeJSON(ORDERS_FILE, orders);
}

export function listOrders(status?: string, limit = 100) {
  let orders = readJSON<Order[]>(ORDERS_FILE, []);
  if (status) orders = orders.filter((o) => o.status === status);
  return orders.sort((a, b) => b.id - a.id).slice(0, limit);
}

export function listPendingOrders(limit = 50) {
  let orders = readJSON<Order[]>(ORDERS_FILE, []);
  return orders
    .filter((o) => o.status === "pending" || o.status === "processing")
    .sort((a, b) => a.id - b.id)
    .slice(0, limit);
}
