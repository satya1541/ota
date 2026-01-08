import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface TableSkeletonProps {
  rows?: number;
  columns?: number;
}

/**
 * A skeleton loader for table content.
 * Shows animated placeholders while data is loading.
 */
export function TableSkeleton({ rows = 5, columns = 5 }: TableSkeletonProps) {
  return (
    <div className="bg-white/5 border-none shadow-2xl ring-1 ring-white/10 rounded-3xl overflow-hidden backdrop-blur-md">
      <Table>
        <TableHeader className="bg-white/5">
          <TableRow className="hover:bg-transparent border-none">
            {Array.from({ length: columns }).map((_, i) => (
              <TableHead key={i} className="px-6">
                <Skeleton className="h-4 w-20 bg-white/10" />
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: rows }).map((_, rowIndex) => (
            <TableRow key={rowIndex} className="border-b border-white/5">
              {Array.from({ length: columns }).map((_, colIndex) => (
                <TableCell key={colIndex} className="px-6 py-4">
                  {colIndex === 0 ? (
                    <div className="flex items-center gap-3">
                      <Skeleton className="h-4 w-4 rounded bg-white/10" />
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-24 bg-white/10" />
                        <Skeleton className="h-3 w-16 bg-white/5" />
                      </div>
                    </div>
                  ) : colIndex === columns - 1 ? (
                    <div className="flex justify-end gap-2">
                      <Skeleton className="h-8 w-8 rounded-lg bg-white/10" />
                      <Skeleton className="h-8 w-8 rounded-lg bg-white/10" />
                    </div>
                  ) : (
                    <Skeleton className="h-4 w-16 bg-white/10" />
                  )}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

/**
 * A skeleton loader for stat cards.
 */
export function StatCardsSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="bg-card border-none shadow-sm ring-1 ring-border/50 rounded-2xl p-4 flex items-center gap-3 md:gap-4"
        >
          <Skeleton className="h-10 w-10 rounded-xl bg-white/10" />
          <div className="space-y-2 flex-1">
            <Skeleton className="h-3 w-12 bg-white/10" />
            <Skeleton className="h-6 w-8 bg-white/10" />
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * A skeleton loader for device rows.
 */
export function DeviceRowSkeleton() {
  return (
    <div className="flex items-center space-x-4 p-4 border-b border-white/5">
      <Skeleton className="h-4 w-4 rounded bg-white/10" />
      <div className="space-y-2 flex-1">
        <Skeleton className="h-4 w-32 bg-white/10" />
        <Skeleton className="h-3 w-24 bg-white/5" />
      </div>
      <Skeleton className="h-6 w-16 rounded-full bg-white/10" />
      <Skeleton className="h-4 w-20 bg-white/10" />
      <div className="flex gap-2">
        <Skeleton className="h-8 w-8 rounded-lg bg-white/10" />
        <Skeleton className="h-8 w-8 rounded-lg bg-white/10" />
      </div>
    </div>
  );
}

export default TableSkeleton;
