// Where the sheet's values come from: Google's Sheets API in the tool (google-sheet-source.ts),
// a fake in tests (fake-sheet-source.ts). Tests never call Google.

/** Why the sheet could not be read; the sync turns each kind into a reason the owner reads. */
export type SheetReadErrorKind =
  'not-shared' | 'not-found' | 'unavailable' | 'access-refused' | 'not-set-up';

export class SheetReadError extends Error {
  readonly kind: SheetReadErrorKind;

  constructor(kind: SheetReadErrorKind, message: string = kind) {
    super(message);
    this.name = 'SheetReadError';
    this.kind = kind;
  }
}

/** Reads a spreadsheet, read-only. */
export interface SheetSource {
  /**
   * The first tab's values, row 1 (the header) first, as the sheet shows them (a ticked
   * checkbox reads "TRUE"), at most 2,002 rows. Throws a SheetReadError when the sheet cannot
   * be read.
   */
  readFirstTab(spreadsheetId: string): Promise<string[][]>;
}
