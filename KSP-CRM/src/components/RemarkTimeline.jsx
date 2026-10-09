import React from 'react';

// Remarks ek lambi string me save hote hain, har entry is tarah:
//   📅 09 Oct 2026, 01:20 pm | 👤 Shiva (GST Note)
//   💬 done
// Yeh function us string ko alag-alag entries me todta hai taaki har remark apne card me dikhe.
export const parseRemarkEntries = (text) => {
  const entries = [];
  let current = null;

  String(text || '')
    .replace(/([^\n])📅/g, '$1\n📅') // header hamesha nayi line se shuru ho
    .split(/\r?\n/)
    .forEach(line => {
      const t = line.trim();
      if (!t || /^-{5,}$/.test(t)) return; // khali line / separator

      if (t.startsWith('📅')) {
        const [datePart, ...rest] = t.replace(/^📅\s*/, '').split('|');
        let author = rest.join('|').replace(/^\s*👤\s*/, '').trim();
        let tag = '';
        const tagMatch = author.match(/^(.*?)\s*\(([^)]+)\)\s*$/);
        if (tagMatch) { author = tagMatch[1].trim(); tag = tagMatch[2].trim(); }

        current = { date: datePart.trim(), author: author || 'User', tag, lines: [] };
        entries.push(current);
      } else {
        if (!current) {
          current = { date: '', author: 'System', tag: '', lines: [] };
          entries.push(current);
        }
        current.lines.push(t);
      }
    });

  return entries.map((e, idx) => ({ ...e, id: idx, searchText: `${e.tag} ${e.lines.join(' ')}`.toLowerCase() }));
};

const renderLine = (line, idx) => {
  // 💬 = insaan ka likha note, baaki system ki entries
  if (line.startsWith('💬')) {
    const text = line.replace(/^💬\s*(Note:\s*)?/i, '');
    return <p key={idx} className="text-[13px] text-slate-800 font-medium bg-white border border-slate-200 rounded-xl rounded-tl-sm px-3 py-2 whitespace-pre-wrap break-words">{text}</p>;
  }
  if (line.startsWith('-')) {
    return <p key={idx} className="text-xs text-slate-600 pl-3 border-l-2 border-slate-200 break-words">{line.replace(/^-\s*/, '')}</p>;
  }
  return <p key={idx} className="text-xs font-semibold text-slate-600 break-words">{line}</p>;
};

// entries = parseRemarkEntries(...) ka (filter kiya hua) result. Sabse naya remark sabse upar.
const RemarkTimeline = ({ entries = [], emptyText = 'No notes recorded yet.' }) => {
  if (entries.length === 0) {
    return <p className="text-xs text-slate-400 italic text-center py-8">{emptyText}</p>;
  }

  return (
    <div className="space-y-3">
      {[...entries].reverse().map(entry => (
        <div key={entry.id} className="flex gap-3">
          <div className="h-8 w-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-black shrink-0 mt-0.5">
            {entry.author.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
              <span className="text-xs font-bold text-slate-800">{entry.author}</span>
              {entry.tag && <span className="text-[9px] font-bold uppercase tracking-wider bg-amber-50 text-amber-700 border border-amber-100 px-1.5 py-0.5 rounded">{entry.tag}</span>}
              {entry.date && <span className="text-[10px] font-semibold text-slate-400 ml-auto whitespace-nowrap">{entry.date}</span>}
            </div>
            <div className="mt-1.5 space-y-1.5">
              {entry.lines.map(renderLine)}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default RemarkTimeline;
