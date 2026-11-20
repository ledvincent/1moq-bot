// The sheet link the owner saves on Settings (app_setting `sheet.link`).

/** The saved link: the address as given, and the spreadsheet id read from it. */
export interface SheetLink {
  url: string;
  spreadsheetId: string;
}

/** The app_setting key of the sheet link. */
export const SHEET_LINK_SETTING = 'sheet.link';

const SPREADSHEET_PATH = /^\/spreadsheets\/d\/([A-Za-z0-9_-]{10,})(?:\/|$)/;

/**
 * The spreadsheet id of a Google Sheets address (docs.google.com/spreadsheets/d/<id>/…, over
 * HTTPS, any tab or gid: the tab is ignored), or null for anything else.
 */
export function spreadsheetIdOf(link: string): string | null {
  let url: URL;
  try {
    url = new URL(link.trim());
  } catch {
    return null;
  }
  if (url.protocol !== 'https:' || url.hostname !== 'docs.google.com') return null;
  if (url.username || url.password || url.port) return null;
  return SPREADSHEET_PATH.exec(url.pathname)?.[1] ?? null;
}
