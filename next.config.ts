import type { NextConfig } from "next";
import pkg from "./package.json";

// 生产 nginx 反代子路径；本机 dev 也带前缀，保证两边一致。
const BASE_PATH = process.env.BASE_PATH ?? "/d100";

const nextConfig: NextConfig = {
  // better-sqlite3 是原生模块，必须外部化，不能被打包
  serverExternalPackages: ["better-sqlite3", "exceljs"],
  basePath: BASE_PATH,
  trailingSlash: true,
  turbopack: {
    root: __dirname,
  },
  env: {
    // 客户端 fetch / window.location 用得到 basePath（Next 的 basePath
    // 只自动给 <Link>/router.push 加前缀，原生 fetch 要手动拼，见 lib/url.ts）
    NEXT_PUBLIC_BASE_PATH: BASE_PATH,
    NEXT_PUBLIC_APP_VERSION: pkg.version,
  },
  experimental: {
    // Excel 名单上传可能超过默认 body 限制，提到 50mb
    proxyClientMaxBodySize: "50mb",
  },
};

export default nextConfig;
