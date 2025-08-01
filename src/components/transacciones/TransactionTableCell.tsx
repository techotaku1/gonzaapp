import React, { useEffect, useState } from 'react';

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
  className?: string;
  style?: React.CSSProperties;
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
    // Solo lee el estado global, no lo cambia aquí
    const [expanded, setExpanded] = useState(
      typeof window !== 'undefined' ? window.__fechaColExpand : false
    );

    useEffect(() => {
      if (!isFecha) return;
      const update = () => setExpanded(window.__fechaColExpand);
      window.__fechaColExpandListeners.add(update);
      setExpanded(window.__fechaColExpand);
      return () => {
        window.__fechaColExpandListeners.delete(update);
      };
    }, [isFecha]);

    const fechaCellClasses = isFecha
      ? expanded
        ? 'table-cell whitespace-nowrap pl-2 transition-all duration-200 min-w-[120px] max-w-[180px] w-[140px] overflow-visible'
        : 'table-cell whitespace-nowrap pl-2 transition-all duration-200 min-w-[32px] max-w-[32px] w-[32px] overflow-hidden text-center'
      : (className ?? 'table-cell whitespace-nowrap');

    return (
      <td className={fechaCellClasses} style={style}>
        {isFecha ? (
          expanded ? (
            <div className="flex w-full items-center gap-2">
              <div className="flex-1">{renderInput(row, field, type)}</div>
            </div>
          ) : (
            // Mostrar el icono de calendario en todas las filas cuando está retraída
            <Calendar size={20} className="mx-auto text-gray-500" />
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
