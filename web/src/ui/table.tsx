import type { ReactNode } from 'react';

export function Table({ head, rows }: { head: string[]; rows: ReactNode[][] }) {
  return (
    <table className="table">
      <thead>
        <tr>
          {head.map((cell) => (
            <th key={cell} scope="col">
              {cell}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, index) => (
          <tr key={index}>
            {row.map((cell, column) => (
              <td key={column}>{cell}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
