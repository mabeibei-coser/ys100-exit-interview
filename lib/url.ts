// Next 的 basePath 只自动给 <Link>/router.push 加前缀；客户端原生 fetch /
// window.location 不会自动加，需手动拼。客户端读 NEXT_PUBLIC_BASE_PATH。
const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

/** 给客户端 fetch / 跳转的路径拼上 basePath。传入以 / 开头的应用内路径。 */
export function withBase(p: string): string {
  if (!p.startsWith("/")) p = "/" + p;
  return BASE + p;
}
