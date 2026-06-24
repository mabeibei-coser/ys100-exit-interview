import { buildReport } from "@/lib/aggregate";
import ReportView from "./report-view";

export const dynamic = "force-dynamic";

export default function AdminDashboard() {
  const report = buildReport();
  return <ReportView report={report} />;
}
