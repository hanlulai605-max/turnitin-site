import { NextRequest, NextResponse } from "next/server";
import { getOrderByOrderId } from "@/lib/db";
import fs from "fs";
import path from "path";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  const { orderId } = await params;
  const order = getOrderByOrderId(orderId);
  if (!order) return NextResponse.json({ error: "订单不存在" }, { status: 404 });
  if (order.status !== "done") return NextResponse.json({ error: "检测尚未完成" }, { status: 400 });

  // 优先本地文件
  if (order.report_file) {
    const fullPath = path.resolve(order.report_file);
    if (fs.existsSync(fullPath)) {
      const buf = fs.readFileSync(fullPath);
      const filename = (order.filename || "report").replace(/\.[^.]+$/, "") + "_检测报告.pdf";
      return new NextResponse(buf, {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="${encodeURIComponent(filename)}"`,
        },
      });
    }
  }

  // 降级：上游报告链接
  if (order.report_url) {
    return NextResponse.redirect(order.report_url);
  }

  return NextResponse.json({ error: "报告文件不存在" }, { status: 404 });
}
