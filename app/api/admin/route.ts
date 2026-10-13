import { NextRequest, NextResponse } from "next/server";
import { bulkInsertCodes, listCodes, listOrders, updateOrderStatus } from "@/lib/db";

// 简单的管理员密码（可在 .env 中覆盖）
const ADMIN_KEY = process.env.ADMIN_KEY || "admin123";

function checkAuth(req: NextRequest) {
  const auth = req.headers.get("x-admin-key") || req.nextUrl.searchParams.get("key");
  return auth === ADMIN_KEY;
}

// GET - 查看数据
export async function GET(req: NextRequest) {
  if (!checkAuth(req)) return NextResponse.json({ error: "未授权" }, { status: 401 });
  const { tab, status, limit } = req.nextUrl.searchParams;
  if (tab === "codes") {
    return NextResponse.json({ codes: listCodes(parseInt(limit || "100")) });
  }
  return NextResponse.json({ orders: listOrders(status || undefined, parseInt(limit || "100")) });
}

// POST - 写入数据
export async function POST(req: NextRequest) {
  if (!checkAuth(req)) return NextResponse.json({ error: "未授权" }, { status: 401 });
  const body = await req.json();
  const { action } = body;

  if (action === "import-codes") {
    const codes: string[] = (body.codes || []).map((c: string) => c.trim()).filter(Boolean);
    const edition = body.edition || "standard";
    const notes = body.notes || "";
    const count = bulkInsertCodes(codes, edition, notes);
    return NextResponse.json({ ok: true, imported: count, total: codes.length });
  }

  if (action === "update-order") {
    const { orderId, status, reportUrl, reportFile, message } = body;
    if (!orderId) return NextResponse.json({ error: "缺少 orderId" }, { status: 400 });
    updateOrderStatus(orderId, status || "pending", { reportUrl, reportFile, message });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "未知 action" }, { status: 400 });
}
