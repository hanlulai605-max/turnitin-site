import { NextRequest, NextResponse } from "next/server";
import { getOrderByCode } from "@/lib/db";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code")?.trim();
  if (!code) return NextResponse.json({ error: "请输入兑换码" }, { status: 400 });

  const orders = getOrderByCode(code) as any[];
  if (!orders || orders.length === 0) {
    return NextResponse.json({ error: "未找到此兑换码的提交记录" }, { status: 404 });
  }

  // 返回最新一条
  const latest = orders[0];
  const hasLocalReport = !!latest.report_file;
  return NextResponse.json({
    orderId: latest.order_id,
    status: latest.status,
    reportUrl: latest.report_url,
    reportFile: latest.report_file,
    downloadUrl: hasLocalReport ? `/api/report/${latest.order_id}` : (latest.report_url || ""),
    hasLocalReport,
    message: latest.message,
    filename: latest.filename,
    createdAt: latest.created_at,
    allOrders: orders.map(o => ({
      orderId: o.order_id,
      status: o.status,
      filename: o.filename,
      reportUrl: o.report_url,
      reportFile: o.report_file,
      hasLocalReport: !!o.report_file,
      downloadUrl: o.report_file ? `/api/report/${o.order_id}` : o.report_url,
      createdAt: o.created_at,
    })),
  });
}
