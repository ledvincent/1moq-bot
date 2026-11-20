import { SheetReadError, type SheetReadErrorKind, type SheetSource } from './sheet-source.ts';

/**
 * A SheetSource for tests: holds a grid (the first tab's values) per spreadsheet id, can fail
 * with any SheetReadError kind, and records every call. An unknown id fails as "not-found".
 */
export class FakeSheetSource implements SheetSource {
  readonly grids = new Map<string, string[][]>();
  readonly calls: string[] = [];
  failure: SheetReadErrorKind | null = null;
  // Runs before each read answers: lets a test act while a sync is reading.
  beforeAnswer: (() => Promise<void>) | null = null;

  setGrid(spreadsheetId: string, values: string[][]): void {
    this.grids.set(spreadsheetId, values);
  }

  async readFirstTab(spreadsheetId: string): Promise<string[][]> {
    this.calls.push(spreadsheetId);
    await this.beforeAnswer?.();
    if (this.failure) throw new SheetReadError(this.failure);
    const grid = this.grids.get(spreadsheetId);
    if (!grid) throw new SheetReadError('not-found');
    return grid.map((row) => [...row]);
  }
}
