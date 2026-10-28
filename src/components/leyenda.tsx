import type { FormaLeyenda, ItemLeyenda } from '../lib/simbologia';
import { formatoEntero } from '../lib/simbologia';

function Muestra({ forma, color }: { forma: FormaLeyenda; color: string }) {
  return (
    <span className="inline-flex h-5 w-6 shrink-0 items-center justify-center rounded bg-fondo/80 ring-1 ring-linea/80">
      <svg viewBox="0 0 18 14" className="h-3.5 w-[18px]" aria-hidden="true">
        {forma === 'area' && (
          <rect x="1" y="1.5" width="16" height="11" rx="2" fill={color} stroke="rgba(255, 255, 255, 0.25)" strokeWidth="1" />
        )}
        {forma === 'linea' && (
          <line x1="1.5" y1="7" x2="16.5" y2="7" stroke={color} strokeWidth="2.8" strokeLinecap="round" />
        )}
        {forma === 'guiones' && (
          <line x1="1.5" y1="7" x2="16.5" y2="7" stroke={color} strokeWidth="2.2" strokeDasharray="3.5 2.5" strokeLinecap="round" />
        )}
        {forma === 'punto' && (
          <circle cx="9" cy="7" r="4.8" fill={color} stroke="#ffffff" strokeWidth="1.4" />
        )}
        {forma === 'rombo' && (
          <rect x="4.5" y="2.5" width="9" height="9" fill={color} stroke="#ffffff" strokeWidth="1" transform="rotate(45 9 7)" />
        )}
        {forma === 'engranaje' && (
          <g fill={color} stroke="#0a0e17" strokeWidth="1">
            <path d="M9 10a1.8 1.8 0 1 0 0-3.6A1.8 1.8 0 0 0 9 10Z"/>
            <path d="M14 9a1 1 0 0 0 .2 1.1l.04.04a1.2 1.2 0 1 1-1.7 1.7l-.04-.04a1 1 0 0 0-1.1-.2 1 1 0 0 0-.6.9V13a1.2 1.2 0 1 1-2.4 0v-.4a1 1 0 0 0-.6-.9 1 1 0 0 0-1.1.2l-.04.04a1.2 1.2 0 1 1-1.7-1.7l.04-.04a1 1 0 0 0 .2-1.1 1 1 0 0 0-.9-.6H4a1.2 1.2 0 1 1 0-2.4h.4a1 1 0 0 0 .9-.6 1 1 0 0 0-.2-1.1l-.04-.04a1.2 1.2 0 1 1 1.7-1.7l.04.04a1 1 0 0 0 1.1.2 1 1 0 0 0 .6-.9V3a1.2 1.2 0 1 1 2.4 0v.4a1 1 0 0 0 .6.9 1 1 0 0 0 1.1-.2l.04-.04a1.2 1.2 0 1 1 1.7 1.7l-.04.04a1 1 0 0 0-.2 1.1 1 1 0 0 0 .9.6h.4a1.2 1.2 0 1 1 0 2.4h-.4a1 1 0 0 0-.9.6Z"/>
          </g>
        )}
      </svg>
    </span>
  );
}

export default function Leyenda({ items }: { items: ItemLeyenda[] }) {
  return (
    <ul className="space-y-1.5">
      {items.map((i, idx) => (
        <li key={`${i.etiqueta}-${idx}`} className="flex items-center gap-2.5 text-[13px] leading-snug">
          <Muestra forma={i.forma} color={i.color} />
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline justify-between gap-2">
              <span className="truncate font-medium text-tinta">{i.etiqueta}</span>
              {i.conteo !== undefined && (
                <span className="shrink-0 font-mono text-[11.5px] font-medium text-tinta-suave">
                  {formatoEntero(i.conteo)}
                </span>
              )}
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
