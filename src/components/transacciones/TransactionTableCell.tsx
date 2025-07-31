import React, { useEffect, useRef, useState } from 'react';

import { Calendar } from 'lucide-react';

import type { InputType } from './TransactionTableRow';
import type { TransactionRecord } from '~/types';

interface TransactionTableCellProps {
  row: TransactionRecord;
  field: keyof TransactionRecord;
  type?: InputType;
  renderInput: (
    row: TransactionRecord,
    field: keyof TransactionRecord,
    type?: InputType
  ) => React.ReactNode;
  index?: number;
  className?: string; // Permitir className opcional
  style?: React.CSSProperties; // Nueva prop para estilos específicos
}

// Estado global para expandir/retraer todas las celdas de fecha
declare global {
  interface Window {
    __fechaColExpand: boolean;
    __fechaColExpandListeners: Set<() => void>;
  }
}
if (typeof window !== 'undefined') {
  window.__fechaColExpand = window.__fechaColExpand ?? false;
  window.__fechaColExpandListeners =
    window.__fechaColExpandListeners ?? new Set();
}

const TransactionTableCell: React.FC<TransactionTableCellProps> = React.memo(
  ({ row, field, type = 'text', renderInput, className, style }) => {
    const isFecha = field === 'fecha';
    const cellRef = useRef<HTMLTableCellElement>(null);

    // Estado local sincronizado con el global
    const [expanded, setExpanded] = useState(
      typeof window !== 'undefined' ? window.__fechaColExpand : false
    );

    // Sincroniza el estado local con el global y listeners
    useEffect(() => {
      if (!isFecha) return;
      const update = () => setExpanded(window.__fechaColExpand);
      window.__fechaColExpandListeners.add(update);
      setExpanded(window.__fechaColExpand);
      return () => {
        window.__fechaColExpandListeners.delete(update);
      };
    }, [isFecha]);

    // Cierra la celda expandida al hacer click fuera (solo si está expandido)
    useEffect(() => {
      if (!isFecha || !expanded) return;
      const handleClickOutside = (event: MouseEvent) => {
        if (
          cellRef.current &&
          !cellRef.current.contains(event.target as Node)
        ) {
          window.__fechaColExpand = false;
          window.__fechaColExpandListeners.forEach((fn) => fn());
        }
      };
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }, [expanded, isFecha]);

    const fechaCellClasses = isFecha
      ? expanded
        ? 'table-cell whitespace-nowrap pl-2 transition-all duration-200 min-w-[120px] max-w-[180px] w-[140px] overflow-visible'
        : 'table-cell whitespace-nowrap pl-2 transition-all duration-200 min-w-[32px] max-w-[32px] w-[32px] overflow-hidden text-center'
      : (className ?? 'table-cell whitespace-nowrap');

    return (
      <td
        ref={isFecha ? cellRef : undefined}
        className={fechaCellClasses}
        style={style}
      >
        {isFecha ? (
          expanded ? (
            <div className="flex w-full items-center gap-2">
              <div className="flex-1">{renderInput(row, field, type)}</div>
            </div>
          ) : (
            <button
              type="button"
              className="flex h-8 w-full items-center justify-center"
              onClick={() => {
                window.__fechaColExpand = true;
                window.__fechaColExpandListeners.forEach((fn) => fn());
              }}
              tabIndex={0}
              aria-label="Expandir fecha"
              style={{ minWidth: 32, maxWidth: 32 }}
            >
              <Calendar size={20} className="text-gray-500" />
            </button>
          )
        ) : (
          <div className="w-full truncate overflow-hidden">
            {renderInput(row, field, type)}
          </div>
        )}
      </td>
    );
  }
);

export default TransactionTableCell;
