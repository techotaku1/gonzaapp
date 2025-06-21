import React from 'react';

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
}

const TransactionTableCell: React.FC<TransactionTableCellProps> = React.memo(
  ({ row, field, type = 'text', renderInput}) => {
    const cellClasses =
      field === 'fecha'
        ? 'table-cell whitespace-nowrap pl-2'
        : 'table-cell whitespace-nowrap';
    return <td className={cellClasses}>{renderInput(row, field, type)}</td>;
  }
);

export default TransactionTableCell;
