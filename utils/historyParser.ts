// utils/historyParser.ts
export interface HistoryNote {
  date: string;
  text: string;
  isPivot?: boolean; // To distinguish pivot notes visually
}

export const parseHistoryString = (fullHistoryString: string | undefined): HistoryNote[] => {
  if (!fullHistoryString || fullHistoryString.trim().length === 0) {
    return [];
  }

  // Remove the "HISTÓRICO: " prefix if present
  const historyContent = fullHistoryString.startsWith("HISTÓRICO: ")
    ? fullHistoryString.substring("HISTÓRICO: ".length)
    : fullHistoryString;

  // Split by double newline to get individual entries
  const entries = historyContent.split('\n\n').filter(Boolean);

  return entries.map(entry => {
    const match = entry.match(/^\[(\d{2}\/\d{2}\/\d{4})\]\s*(.*)/);
    if (match) {
      const date = match[1];
      const text = match[2];
      const isPivot = text.startsWith("ESTRATÉGIA PIVOTADA:");
      return { date, text, isPivot };
    }
    // Fallback for entries that don't match the expected format
    return { date: 'Data Inválida', text: entry };
  });
};