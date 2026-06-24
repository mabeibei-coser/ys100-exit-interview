import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "离职访谈记录 · 永升服务",
  description: "一线离职员工电话回访记录工具",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
