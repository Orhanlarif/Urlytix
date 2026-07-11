import { ReactNode } from 'react';

export function DataTable({
  headings,
  children,
}: {
  headings: string[];
  children: ReactNode;
}) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-800">
      <table className="w-full min-w-[680px] border-collapse text-left text-sm">
        <thead className="bg-slate-950 text-xs uppercase tracking-wide text-slate-500">
          <tr>
            {headings.map((heading) => (
              <th key={heading} scope="col" className="px-4 py-3 font-medium">
                {heading}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800 bg-slate-950/50">{children}</tbody>
      </table>
    </div>
  );
}
