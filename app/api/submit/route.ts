import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { validateCode, markCodeUsed, createOrder } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const code = (form.get("code") as string)?.trim();
    const document = form.get("document") as File | null;

    if (!code) return NextResponse.json({ error: "请输入兑换码" }, { status: 400 });
    if (!document) return NextResponse.json({ error: "请上传检测文件" }, { status: 400 });

    // 卡密验证
    const v = validateCode(code);
    if (!v.ok) return NextResponse.json({ error: v.error }, { status: 400 });

    // 文件校验
    const maxSize = 50 * 1024 * 1024;
    if (document.size > maxSize) return NextResponse.json({ error: "文件超过 50MB" }, { status: 400 });

    const allowedExt = [".pdf", ".doc", ".docx", ".txt", ".rtf", ".pptx"];
    const ext = path.extname(document.name).toLowerCase();
    if (!allowedExt.includes(ext)) return NextResponse.json({ error: "不支持的文件格式" }, { status: 400 });

    // 保存文件
    const uploadDir = path.join(process.cwd(), "data", "uploads");
    await mkdir(uploadDir, { recursive: true });
    const safeName = `${Date.now()}_${Math.random().toString(36).slice(2)}${ext}`;
    const storedPath = path.join(uploadDir, safeName);
    const buf = Buffer.from(await document.arrayBuffer());
    await writeFile(storedPath, buf);

    // 标记卡密已使用
    markCodeUsed(code);

    // 创建订单
    const orderId = createOrder(code, document.name, storedPath);

    return NextResponse.json({
      ok: true,
      orderId,
      message: "提交成功！检测完成后可在'查询报告'页面下载报告。",
    });
  } catch (err: any) {
    console.error("submit error:", err);
    return NextResponse.json({ error: "服务器错误" }, { status: 500 });
  }
}
