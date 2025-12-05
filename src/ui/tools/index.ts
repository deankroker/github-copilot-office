import { getDocumentContent } from "./getDocumentContent";
import { setDocumentContent } from "./setDocumentContent";
import { getSelection } from "./getSelection";
import { webFetch } from "./webFetch";
import { getPresentationContent } from "./getPresentationContent";
import { setPresentationContent } from "./setPresentationContent";

export const wordTools = [
  getDocumentContent,
  setDocumentContent,
  getSelection,
  webFetch,
];

export const powerpointTools = [
  getPresentationContent,
  setPresentationContent,
  webFetch,
];

export function getToolsForHost(host: typeof Office.HostType[keyof typeof Office.HostType]) {
  switch (host) {
    case Office.HostType.Word:
      return wordTools;
    case Office.HostType.PowerPoint:
      return powerpointTools;
    default:
      return [];
  }
}
