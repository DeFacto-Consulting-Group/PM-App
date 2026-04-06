import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface AuditEntry {
  id: string;
  timestamp: string;
  user: string;
  action: string;
  entity_type: string;
  entity_id: string;
  details: string;
}

const ACTION_COLORS: Record<string, string> = {
  create: "bg-green-100 text-green-800 border-green-200",
  update: "bg-blue-100 text-blue-800 border-blue-200",
  delete: "bg-red-100 text-red-800 border-red-200",
  status_change: "bg-amber-100 text-amber-800 border-amber-200",
  login: "bg-purple-100 text-purple-800 border-purple-200",
};

const mockAuditLog: AuditEntry[] = [
  {
    id: "a1",
    timestamp: "2026-03-11T14:32:00Z",
    user: "John Harrison",
    action: "update",
    entity_type: "Project",
    entity_id: "0001-2026",
    details: "Updated status from Approved to Active",
  },
  {
    id: "a2",
    timestamp: "2026-03-11T13:15:00Z",
    user: "Sarah Chen",
    action: "create",
    entity_type: "Task",
    entity_id: "0002-2026",
    details: "Created task: Expert report draft",
  },
  {
    id: "a3",
    timestamp: "2026-03-11T11:45:00Z",
    user: "Michael Torres",
    action: "status_change",
    entity_type: "Task",
    entity_id: "0003-2026",
    details: "Task 'Cost estimate report' moved to Internal Review",
  },
  {
    id: "a4",
    timestamp: "2026-03-11T10:20:00Z",
    user: "Emily Walsh",
    action: "update",
    entity_type: "Project",
    entity_id: "0004-2026",
    details: "Updated property location and narrative",
  },
  {
    id: "a5",
    timestamp: "2026-03-10T16:50:00Z",
    user: "Robert Kim",
    action: "create",
    entity_type: "Project",
    entity_id: "0005-2026",
    details: "Created new project: Downtown Retail ADR",
  },
  {
    id: "a6",
    timestamp: "2026-03-10T15:30:00Z",
    user: "John Harrison",
    action: "status_change",
    entity_type: "Project",
    entity_id: "0006-2026",
    details: "Submitted for conflict review",
  },
  {
    id: "a7",
    timestamp: "2026-03-10T14:10:00Z",
    user: "Sarah Chen",
    action: "login",
    entity_type: "Session",
    entity_id: "\u2014",
    details: "User signed in from 192.168.1.45",
  },
  {
    id: "a8",
    timestamp: "2026-03-10T11:05:00Z",
    user: "Michael Torres",
    action: "update",
    entity_type: "Task",
    entity_id: "0008-2026",
    details: "Updated due date for building envelope assessment",
  },
  {
    id: "a9",
    timestamp: "2026-03-09T17:20:00Z",
    user: "Emily Walsh",
    action: "create",
    entity_type: "Deliverable",
    entity_id: "0004-2026",
    details: "Uploaded PCA inspection photos",
  },
  {
    id: "a10",
    timestamp: "2026-03-09T14:00:00Z",
    user: "John Harrison",
    action: "delete",
    entity_type: "Task",
    entity_id: "0001-2026",
    details: "Removed duplicate task: Site photo collection",
  },
];

function formatTimestamp(ts: string) {
  const d = new Date(ts);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function AuditLogPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Audit Log</h1>
        <p className="text-muted-foreground">System activity history</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>Narrow down activity records</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="entity-type">Entity Type</Label>
              <Input id="entity-type" placeholder="e.g. Project, Task" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="user-filter">User</Label>
              <Input id="user-filter" placeholder="e.g. John Harrison" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="date-range">Date Range</Label>
              <Input id="date-range" type="date" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Activity</CardTitle>
          <CardDescription>
            {mockAuditLog.length} entries
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date/Time</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Entity</TableHead>
                <TableHead>Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mockAuditLog.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell className="text-xs text-muted-foreground">
                    {formatTimestamp(entry.timestamp)}
                  </TableCell>
                  <TableCell className="font-medium">{entry.user}</TableCell>
                  <TableCell>
                    <Badge
                      className={
                        ACTION_COLORS[entry.action] ??
                        "bg-gray-100 text-gray-700 border-gray-200"
                      }
                      variant="outline"
                    >
                      {entry.action.replace("_", " ")}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div>
                      <span className="text-sm">{entry.entity_type}</span>
                      <span className="ml-1.5 font-mono text-xs text-muted-foreground">
                        {entry.entity_id}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="max-w-xs truncate text-sm text-muted-foreground">
                    {entry.details}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
