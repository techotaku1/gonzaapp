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
}

const TransactionTableCell: React.FC<TransactionTableCellProps> = React.memo(
  ({ row, field, type = 'text', renderInput, index }) => {
    return (
      <td
        className={`table-cell whitespace-nowrap${index !== undefined ? `border-r-0` : ''}`}
      >
        {renderInput(row, field, type)}
      </td>
    );
  }
);

export default TransactionTableCell;
