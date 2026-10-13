import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "论文检测服务 · Turnitin",
  description: "Turnitin 论文相似度检测 · 在线提交 · 快速出报告",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
