import { NextRequest, NextResponse } from "next/server";
import { getOrderByOrderId, updateOrderStatus } from "@/lib/db";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

const WORKER_KEY = process.env.WORKER_KEY || "worker456";

function checkAuth(req: NextRequest) {
  return req.headers.get("x-worker-key") === WORKER_KEY;
}

export async function POST(req: NextRequest) {
  if (!checkAuth(req)) return NextResponse.json({ error: "未授权" }, { status: 401 });

  const form = await req.formData();
  const orderId = (form.get("orderId") as string)?.trim();
  const report = form.get("report") as File | null;
  const status = (form.get("status") as string)?.trim() || "done";
  const message = (form.get("message") as string)?.trim() || "";

  if (!orderId) return NextResponse.json({ error: "缺少 orderId" }, { status: 400 });
  const order = getOrderByOrderId(orderId);
  if (!order) return NextResponse.json({ error: "订单不存在" }, { status: 404 });

  const reportsDir = path.join(process.cwd(), "data", "reports");
  await mkdir(reportsDir, { recursive: true });

  let reportFile = order.report_file;
  if (report) {
    const ext = path.extname(report.name) || ".pdf";
    const safeName = `${orderId}${ext}`;
    const fullPath = path.join(reportsDir, safeName);
    const buf = Buffer.from(await report.arrayBuffer());
    await writeFile(fullPath, buf);
    reportFile = fullPath;
  }

  updateOrderStatus(orderId, status, {
    reportFile: reportFile || undefined,
    message: message || undefined,
  });

  return NextResponse.json({ ok: true, orderId, reportFile });
}

export const runtime = "nodejs";
