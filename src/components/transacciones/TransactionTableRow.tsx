import React from 'react';

import TransactionTableCell from './TransactionTableCell';
import { generateDynamicColorStyle } from './TransactionTableInputs';

import type { TransactionRecord } from '~/types';

export type InputValue = string | number | boolean | Date | null;
export type InputType = 'text' | 'number' | 'date' | 'checkbox';

interface TransactionTableRowProps {
  row: TransactionRecord;
  _editValues?: Partial<TransactionRecord>; // prefijo _ para evitar warning de unused
  isDeleteMode: boolean;
  isAsesorSelectionMode: boolean;
  selectedRows: Set<string>;
  rowsToDelete: Set<string>;
  _selectedAsesores?: Set<string>; // prefijo _ para evitar warning de unused
  handleInputChange: (
    id: string,
    field: keyof TransactionRecord,
    value: InputValue
  ) => void;
  handleRowSelect: (id: string, precioNeto: number) => void;
  handleDeleteSelect: (id: string) => void;
  renderCheckbox: (
    id: string,
    field: keyof TransactionRecord,
    value: boolean,
    disabled?: boolean
  ) => React.ReactNode;
  renderAsesorSelect: (row: TransactionRecord) => React.ReactNode;
  renderInput: (
    row: TransactionRecord,
    field: keyof TransactionRecord,
    type?: InputType
  ) => React.ReactNode;
  getEmitidoPorClass: (emitidoPor: string) => string;
  getTramiteColorClass?: (tramite: string) => string;
  coloresOptions?: { nombre: string; valor: string; intensidad: number }[]; // Nueva prop
  tramiteOptions?: { nombre: string; color?: string }[]; // Nueva prop
}

const TransactionTableRow: React.FC<TransactionTableRowProps> = React.memo(
  ({
    row,
    isDeleteMode,
    isAsesorSelectionMode,
    selectedRows,
    rowsToDelete,
    handleRowSelect,
    handleDeleteSelect,
    renderCheckbox,
    renderAsesorSelect,
    renderInput,
    getEmitidoPorClass,
    getTramiteColorClass,
    coloresOptions = [],
    tramiteOptions = [],
  }) => {
    // Determinar qué clase y estilo aplicar basándose en el tipo de trámite
    const getRowClassAndStyle = () => {
      // Si es SOAT, usar el sistema de emitidoPor existente SOLO cuando está pagado
      if (row.tramite.toUpperCase() === 'SOAT') {
        if (row.pagado) {
          return {
            className: getEmitidoPorClass(row.emitidoPor),
            style: {},
          };
        } else {
          return { className: '', style: {} };
        }
      }

      // Para otros trámites (NO SOAT), usar el nuevo sistema de colores dinámicos SIEMPRE
      // (sin importar si está pagado o no)
      const dynamicStyle = generateDynamicColorStyle(
        row.tramite,
        tramiteOptions,
        coloresOptions
      );
      const className = getTramiteColorClass
        ? getTramiteColorClass(row.tramite)
        : '';

      return {
        className,
        style: dynamicStyle,
      };
    };

    const { className: rowClass, style: rowStyle } = getRowClassAndStyle();

    return (
      <tr className={`border-b hover:bg-gray-50 ${rowClass}`} style={rowStyle}>
        {isDeleteMode ? (
          <td className="table-cell h-full border-r border-gray-600 px-0.5 py-0.5">
            <div className="flex h-full items-center justify-center">
              <input
                type="checkbox"
                checked={rowsToDelete.has(row.id)}
                onChange={() => handleDeleteSelect(row.id)}
                className="h-4 w-4 rounded border-gray-600"
              />
            </div>
          </td>
        ) : null}
        <TransactionTableCell
          row={row}
          field="fecha"
          type="date"
          renderInput={renderInput}
          index={0}
        />
        <TransactionTableCell
          row={row}
          field="tramite"
          renderInput={renderInput}
          index={1}
        />
        <td className="table-checkbox-cell whitespace-nowrap">
          <div className="table-checkbox-wrapper">
            <label className="check-label">
              <input
                type="checkbox"
                checked={selectedRows.has(row.id)}
                onChange={() => handleRowSelect(row.id, row.precioNeto)}
                disabled={row.pagado}
                className="sr-only"
              />
              <div className="checkmark" />
            </label>
          </div>
        </td>
        <td className="table-checkbox-cell whitespace-nowrap">
          <div className="table-checkbox-wrapper">
            {renderCheckbox(row.id, 'pagado', row.pagado)}
          </div>
        </td>
        <TransactionTableCell
          row={row}
          field="boletasRegistradas"
          type="number"
          renderInput={renderInput}
          index={4}
        />
        <TransactionTableCell
          row={row}
          field="emitidoPor"
          renderInput={renderInput}
          index={5}
        />
        <TransactionTableCell
          row={row}
          field="placa"
          renderInput={renderInput}
        />
        <TransactionTableCell
          row={row}
          field="tipoDocumento"
          renderInput={renderInput}
          index={7}
        />
        <TransactionTableCell
          row={row}
          field="numeroDocumento"
          renderInput={renderInput}
          index={8}
        />
        <TransactionTableCell
          row={row}
          field="nombre"
          renderInput={renderInput}
          index={9}
        />
        <TransactionTableCell
          row={row}
          field="cilindraje"
          type="number"
          renderInput={renderInput}
          index={10}
        />
        <TransactionTableCell
          row={row}
          field="tipoVehiculo"
          renderInput={renderInput}
          index={11}
        />
        <TransactionTableCell
          row={row}
          field="celular"
          renderInput={renderInput}
          index={12}
        />
        <TransactionTableCell
          row={row}
          field="ciudad"
          renderInput={renderInput}
          index={13}
        />
        <td className="table-cell whitespace-nowrap">
          {isAsesorSelectionMode
            ? renderAsesorSelect(row)
            : renderInput(row, 'asesor')}
        </td>
        <TransactionTableCell
          row={row}
          field="novedad"
          renderInput={renderInput}
          index={15}
        />
        <TransactionTableCell
          row={row}
          field="precioNeto"
          type="number"
          renderInput={renderInput}
          index={16}
        />
        <TransactionTableCell
          row={row}
          field="tarifaServicio"
          type="number"
          renderInput={renderInput}
          index={17}
        />
        <td className="table-checkbox-cell whitespace-nowrap">
          <div className="table-checkbox-wrapper">
            {renderCheckbox(row.id, 'comisionExtra', row.comisionExtra)}
          </div>
        </td>
        <TransactionTableCell
          row={row}
          field="impuesto4x1000"
          type="number"
          renderInput={renderInput}
          index={19}
        />
        <TransactionTableCell
          row={row}
          field="gananciaBruta"
          type="number"
          renderInput={renderInput}
          index={20}
        />
        <td className="table-checkbox-cell whitespace-nowrap">
          <div className="table-checkbox-wrapper">
            {renderCheckbox(row.id, 'rappi', row.rappi)}
          </div>
        </td>
        <TransactionTableCell
          row={row}
          field="observaciones"
          renderInput={renderInput}
        />
      </tr>
    );
  }
);

export default TransactionTableRow;
