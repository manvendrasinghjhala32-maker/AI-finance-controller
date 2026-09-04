import React from 'react';

/**
 * Lightweight, robust Markdown & Table parser for AI Financial Copilot messages.
 * Uses theme palette: #212121 (main), #171717 (card), #2F2F2F (input/table header), #3A3A3A (hover).
 */
export function MarkdownMessage({ content }) {
  if (!content) return null;

  const lines = content.split('\n');
  const elements = [];
  let inTable = false;
  let tableHeader = [];
  let tableRows = [];

  const flushTable = (key) => {
    if (tableHeader.length > 0 || tableRows.length > 0) {
      elements.push(
        <div key={`table-${key}`} className="my-2.5 overflow-x-auto rounded border border-[#1E2638] bg-[#0E131E]">
          <table className="min-w-full text-xs text-left">
            {tableHeader.length > 0 && (
              <thead className="bg-[#141A27] text-slate-300 font-semibold border-b border-[#1E2638]">
                <tr>
                  {tableHeader.map((th, i) => (
                    <th key={i} className="px-3 py-2 whitespace-nowrap font-mono text-emerald-400 text-[10px] uppercase">
                      {formatInlineText(th)}
                    </th>
                  ))}
                </tr>
              </thead>
            )}
            <tbody className="divide-y divide-[#1E2638] text-slate-200">
              {tableRows.map((row, rIdx) => (
                <tr key={rIdx} className="hover:bg-[#141A27] transition-colors">
                  {row.map((cell, cIdx) => (
                    <td key={cIdx} className="px-3 py-1.5 whitespace-nowrap font-mono text-xs">
                      {formatInlineText(cell)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
      tableHeader = [];
      tableRows = [];
      inTable = false;
    }
  };

  lines.forEach((line, idx) => {
    const trimmed = line.trim();

    // Check for Markdown table line
    if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
      const cells = trimmed
        .split('|')
        .slice(1, -1)
        .map((c) => c.trim());

      // Check if it's separator row |---|---|
      if (cells.every((c) => /^:?-+:?$/.test(c))) {
        inTable = true;
      } else if (!inTable && tableHeader.length === 0) {
        tableHeader = cells;
      } else {
        tableRows.push(cells);
      }
      return;
    } else if (inTable || tableHeader.length > 0) {
      flushTable(idx);
    }

    // Headers
    if (trimmed.startsWith('### ')) {
      elements.push(
        <h3 key={idx} className="text-sm font-bold text-emerald-400 mt-3 mb-1.5 flex items-center gap-1.5 border-b border-[#2F2F2F] pb-1 font-mono">
          {formatInlineText(trimmed.replace('### ', ''))}
        </h3>
      );
    } else if (trimmed.startsWith('## ')) {
      elements.push(
        <h2 key={idx} className="text-base font-extrabold text-white mt-4 mb-2">
          {formatInlineText(trimmed.replace('## ', ''))}
        </h2>
      );
    } else if (trimmed.startsWith('# ')) {
      elements.push(
        <h1 key={idx} className="text-lg font-black text-white mt-4 mb-2">
          {formatInlineText(trimmed.replace('# ', ''))}
        </h1>
      );
    }
    // Bullet items
    else if (trimmed.startsWith('- ') || trimmed.startsWith('• ') || trimmed.startsWith('* ')) {
      const bulletText = trimmed.replace(/^[-•*]\s+/, '');
      elements.push(
        <div key={idx} className="flex items-start gap-2 my-1 text-xs sm:text-sm text-slate-200 leading-relaxed pl-1">
          <span className="text-emerald-400 font-bold mt-0.5">•</span>
          <span className="flex-1">{formatInlineText(bulletText)}</span>
        </div>
      );
    }
    // Numbered lists
    else if (/^\d+\.\s+/.test(trimmed)) {
      const numMatch = trimmed.match(/^(\d+)\.\s+(.*)/);
      if (numMatch) {
        elements.push(
          <div key={idx} className="flex items-start gap-2 my-1.5 text-xs sm:text-sm text-slate-200 leading-relaxed pl-1">
            <span className="w-5 h-5 rounded-full bg-[#2F2F2F] text-emerald-400 border border-emerald-500/40 flex-shrink-0 flex items-center justify-center font-mono text-[11px] font-bold mt-0.5">
              {numMatch[1]}
            </span>
            <span className="flex-1">{formatInlineText(numMatch[2])}</span>
          </div>
        );
      }
    }
    // Empty line
    else if (!trimmed) {
      elements.push(<div key={idx} className="h-1.5" />);
    }
    // Normal paragraph
    else {
      elements.push(
        <p key={idx} className="my-1 text-xs sm:text-sm text-slate-200 leading-relaxed">
          {formatInlineText(trimmed)}
        </p>
      );
    }
  });

  // Flush table if file ended while in table
  if (inTable || tableHeader.length > 0) {
    flushTable('end');
  }

  return <div className="space-y-0.5">{elements}</div>;
}

/**
 * Parses inline styling: **bold**, `code`, and currency highlights
 */
function formatInlineText(text) {
  if (!text) return '';

  const parts = [];
  const regex = /(\*\*.*?\*\*|`.*?`)/g;
  let lastIdx = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIdx) {
      parts.push(text.substring(lastIdx, match.index));
    }
    const token = match[0];
    if (token.startsWith('**') && token.endsWith('**')) {
      const boldContent = token.slice(2, -2);
      parts.push(
        <strong key={match.index} className="font-bold text-white tracking-wide">
          {boldContent}
        </strong>
      );
    } else if (token.startsWith('`') && token.endsWith('`')) {
      const codeContent = token.slice(1, -1);
      parts.push(
        <code key={match.index} className="px-1.5 py-0.5 mx-0.5 rounded bg-[#141A27] text-emerald-300 border border-[#1E2638] font-mono text-[11px]">
          {codeContent}
        </code>
      );
    }
    lastIdx = regex.lastIndex;
  }

  if (lastIdx < text.length) {
    parts.push(text.substring(lastIdx));
  }

  return parts.length > 0 ? parts : text;
}
