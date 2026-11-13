// The sheet's first tab as rows: header matching, needed columns, the row limit
// (openspec/specs/lead-sourcing/spec.md, "Sheet layout").

/** The most data rows (below the header) a sync reads. */
export const MAX_SHEET_ROWS = 2000;

/** The columns the tool reads, by the key it uses for each. */
export const sheetColumns = {
  business: 'Business',
  buyerType: 'Buyer type',
  cityArea: 'City / area',
  language: 'Language',
  whyTheyFit: 'Why they fit',
  notes: 'Notes',
  ownerFounder: 'Owner / founder (public)',
  websiteInstagram: 'Website / Instagram',
  email: 'Email',
  emailSent: 'Email sent',
  responded: 'Responded',
} as const;

export type SheetColumn = keyof typeof sheetColumns;

const neededColumns: SheetColumn[] = ['business', 'buyerType', 'email'];

// Other header texts accepted for a column.
const headerAliases: Partial<Record<SheetColumn, string[]>> = {
  ownerFounder: ['Owner / founder'],
};

/** One data row: each column's cell exactly as read, empty when the column or cell is missing. */
export type SheetRow = Record<SheetColumn, string> & {
  // Its position in the tab, the header being row 1.
  rowNumber: number;
};

/** The sheet cannot be read as leads: the message is shown to the owner as is. */
export class SheetLayoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SheetLayoutError';
  }
}

const foldHeader = (text: string) => text.trim().replace(/\s+/g, ' ').toLowerCase();

// "no "A" column", "no "A" column and no "B" column", "no "A" column, no "B" column and no "C" column".
function missingMessage(names: string[]): string {
  const parts = names.map((name) => `no "${name}" column`);
  const last = parts.pop()!;
  return `The sheet has ${parts.length ? `${parts.join(', ')} and ${last}` : last}`;
}

/**
 * Reads the first tab's values (row 1 the header) into data rows. Columns are found by header,
 * ignoring case and extra spaces, in any order; with two columns of one name the first counts.
 * Empty rows are left out. Throws a SheetLayoutError when a needed column is missing (each one
 * named) or when there are more than MAX_SHEET_ROWS rows below the header.
 */
export function readSheetRows(values: string[][]): SheetRow[] {
  const header = values[0] ?? [];
  const positions = new Map<string, number>();
  header.forEach((cell, index) => {
    const key = foldHeader(cell ?? '');
    if (key && !positions.has(key)) positions.set(key, index);
  });

  const columnIndex = new Map<SheetColumn, number>();
  for (const [column, name] of Object.entries(sheetColumns) as [SheetColumn, string][]) {
    const names = [name, ...(headerAliases[column] ?? [])];
    const found = names
      .map((text) => positions.get(foldHeader(text)))
      .find((at) => at !== undefined);
    if (found !== undefined) columnIndex.set(column, found);
  }

  const missing = neededColumns.filter((column) => !columnIndex.has(column));
  if (missing.length > 0) {
    throw new SheetLayoutError(missingMessage(missing.map((column) => sheetColumns[column])));
  }
  if (values.length - 1 > MAX_SHEET_ROWS) {
    throw new SheetLayoutError('The sheet has more than 2,000 rows');
  }

  const rows: SheetRow[] = [];
  values.slice(1).forEach((cells, index) => {
    // An empty row in the middle is neither imported nor listed.
    if (cells.every((cell) => !cell?.trim())) return;
    const row = { rowNumber: index + 2 } as SheetRow;
    for (const column of Object.keys(sheetColumns) as SheetColumn[]) {
      const at = columnIndex.get(column);
      row[column] = at === undefined ? '' : (cells[at] ?? '');
    }
    rows.push(row);
  });
  return rows;
}
