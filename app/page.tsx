import { redirect } from "next/navigation";
import { requireUser } from "@/lib/session";

export default async function Home() {
  const s = await requireUser();
  if (!s) redirect("/login");
  if (s.role === "admin" || s.role === "super") redirect("/admin");
  redirect("/mine");
}
