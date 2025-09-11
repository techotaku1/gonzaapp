import React from 'react';

import TransactionTableCell from './TransactionTableCell';
import {
  generateDynamicColorStyle,
  getEmitidoPorStyleAndClass,
} from './TransactionTableInputs';

import type { TransactionRecord } from '~/types';

export type InputValue = string | number | boolean | Date | null;
export type InputType = 'text' | 'number' | 'date' | 'checkbox';

interface TransactionTableRowProps {
  row: TransactionRecord;
  _editValues?: Partial<TransactionRecord>;
  isDeleteMode: boolean;
  isAsesorSelectionMode: boolean;
  _selectedRows: Set<string>;
  rowsToDelete: Set<string>;
  _selectedAsesores?: Set<string>;
  handleInputChange: (
    id: string,
    field: keyof TransactionRecord,
    value: InputValue
  ) => void;
  _handleRowSelect: (id: string, precioNeto: number) => void;
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
  _getEmitidoPorClass: (emitidoPor: string) => string;
  getTramiteColorClass?: (tramite: string) => string;
  coloresOptions?: { nombre: string; valor: string; intensidad: number }[];
  tramiteOptions?: { nombre: string; color?: string }[];
  emitidoPorWithColors?: { nombre: string; color?: string }[];
  onDeleteAsesorAction?: (nombre: string) => void;
  userRole?: 'admin' | 'empleado'; // NUEVO
}

const TransactionTableRow: React.FC<TransactionTableRowProps> = React.memo(
  ({
    row,
    isDeleteMode,
    isAsesorSelectionMode: _isAsesorSelectionMode,
    _selectedRows,
    rowsToDelete,
    _handleRowSelect,
    handleDeleteSelect,
    renderCheckbox,
    renderAsesorSelect: _renderAsesorSelect,
    renderInput,
    _getEmitidoPorClass,
    getTramiteColorClass,
    coloresOptions = [],
    tramiteOptions = [],
    emitidoPorWithColors = [],
    onDeleteAsesorAction: _onDeleteAsesorAction,
    userRole, // NUEVO
  }) => {
    // DEBUG: Verifica si el campo llega al frontend
    console.log('ROW DEBUG:', row);

    // Determinar qué clase y estilo aplicar basándose en el tipo de trámite
    const getRowClassAndStyle = () => {
      // Si es SOAT, usar el sistema de emitidoPor (estático + dinámico)
      if (row.tramite.toUpperCase() === 'SOAT') {
        const { className, style } = getEmitidoPorStyleAndClass(
          row.emitidoPor,
          row.pagado,
          emitidoPorWithColors,
          coloresOptions
        );

        // DEBUG: Verificar qué está pasando
        console.log('SOAT Row Debug:', {
          emitidoPor: row.emitidoPor,
          pagado: row.pagado,
          className,
          style,
          emitidoPorWithColors: emitidoPorWithColors.find(
            (e) => e.nombre === row.emitidoPor
          ),
          hasColor: emitidoPorWithColors.some(
            (e) => e.nombre === row.emitidoPor && e.color
          ),
        });

        return { className, style };
      }

      // Para otros trámites (NO SOAT), usar el sistema de colores dinámicos SIEMPRE
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

    // NUEVO: Determina si la fila está bloqueada para empleados
    const isRowLocked =
      userRole === 'empleado' && row.boleta === true && row.pagado === true;

    return (
      <tr
        className={`group border-b hover:bg-gray-50 ${rowClass}`}
        style={rowStyle}
        data-placa={row.placa?.toUpperCase() || ''}
      >
        {/* Eliminar */}
        {isDeleteMode ? (
          <td className="table-cell h-full border-r border-gray-600 px-0.5 py-0.5">
            <div className="flex h-full items-center justify-center">
              <input
                type="checkbox"
                checked={rowsToDelete.has(row.id)}
                onChange={() => handleDeleteSelect(row.id)}
                className="h-4 w-4 rounded border-gray-600"
                disabled={isRowLocked}
                style={isRowLocked ? { cursor: 'not-allowed' } : undefined}
              />
            </div>
          </td>
        ) : null}
        {/* Creador */}
        <td className="table-cell text-center font-bold whitespace-nowrap text-purple-700">
          {row.createdByInitial ?? ''}
        </td>
        <TransactionTableCell
          row={row}
          field="fecha"
          type="date"
          renderInput={renderInput}
          index={0}
          isRowLocked={isRowLocked}
        />
        <TransactionTableCell
          row={row}
          field="tramite"
          renderInput={renderInput}
          index={1}
          isRowLocked={isRowLocked}
        />
        {/* Boleta */}
        <td className="table-checkbox-cell whitespace-nowrap">
          <div className="table-checkbox-wrapper">
            {renderCheckbox(
              row.id,
              'boleta',
              _selectedRows.has(row.id),
              isRowLocked
            )}
          </div>
        </td>
        {/* Pagado */}
        <td className="table-checkbox-cell whitespace-nowrap">
          <div className="table-checkbox-wrapper">
            {renderCheckbox(
              row.id,
              'pagado',
              row.pagado,
              isRowLocked || row.boleta !== true // Deshabilita si boleta no es true
            )}
          </div>
        </td>
        <TransactionTableCell
          row={row}
          field="boletasRegistradas"
          type="number"
          renderInput={renderInput}
          index={4}
          isRowLocked={isRowLocked}
        />
        <TransactionTableCell
          row={row}
          field="emitidoPor"
          renderInput={renderInput}
          index={5}
          className="table-cell whitespace-nowrap"
          isRowLocked={isRowLocked}
        />
        <TransactionTableCell
          row={row}
          field="placa"
          renderInput={renderInput}
          isRowLocked={isRowLocked}
        />
        <TransactionTableCell
          row={row}
          field="tipoDocumento"
          renderInput={renderInput}
          index={7}
          isRowLocked={isRowLocked}
        />
        <TransactionTableCell
          row={row}
          field="numeroDocumento"
          renderInput={renderInput}
          index={8}
          isRowLocked={isRowLocked}
        />
        <TransactionTableCell
          row={row}
          field="nombre"
          renderInput={renderInput}
          index={9}
          isRowLocked={isRowLocked}
        />
        <TransactionTableCell
          row={row}
          field="cilindraje"
          type="number"
          renderInput={renderInput}
          index={10}
          isRowLocked={isRowLocked}
        />
        <TransactionTableCell
          row={row}
          field="tipoVehiculo"
          renderInput={renderInput}
          index={11}
          isRowLocked={isRowLocked}
        />
        <TransactionTableCell
          row={row}
          field="celular"
          renderInput={renderInput}
          index={12}
          isRowLocked={isRowLocked}
        />
        <TransactionTableCell
          row={row}
          field="ciudad"
          renderInput={renderInput}
          index={13}
          isRowLocked={isRowLocked}
        />
        {/* Asesor: si está en modo selección por asesor, usa el renderAsesorSelect */}
        {_isAsesorSelectionMode ? (
          <td className="table-cell whitespace-nowrap">
            {_renderAsesorSelect(row)}
          </td>
        ) : (
          <TransactionTableCell
            row={row}
            field="asesor"
            renderInput={(rowArg, fieldArg, typeArg) =>
              renderInput(rowArg, fieldArg, typeArg)
            }
            isRowLocked={isRowLocked}
          />
        )}
        <TransactionTableCell
          row={row}
          field="novedad"
          renderInput={renderInput}
          index={15}
          isRowLocked={isRowLocked}
        />
        <TransactionTableCell
          row={row}
          field="precioNeto"
          type="number"
          renderInput={renderInput}
          index={16}
          isRowLocked={isRowLocked}
        />
        <TransactionTableCell
          row={row}
          field="tarifaServicio"
          type="number"
          renderInput={renderInput}
          index={17}
          isRowLocked={isRowLocked}
        />
        <td className="table-checkbox-cell whitespace-nowrap">
          <div className="table-checkbox-wrapper">
            {renderCheckbox(
              row.id,
              'comisionExtra',
              row.comisionExtra,
              isRowLocked
            )}
          </div>
        </td>
        <TransactionTableCell
          row={row}
          field="impuesto4x1000"
          type="number"
          renderInput={renderInput}
          index={19}
          isRowLocked={isRowLocked}
        />
        <TransactionTableCell
          row={row}
          field="gananciaBruta"
          type="number"
          renderInput={renderInput}
          index={20}
          isRowLocked={isRowLocked}
        />
        <td className="table-checkbox-cell whitespace-nowrap">
          <div className="table-checkbox-wrapper">
            {renderCheckbox(row.id, 'rappi', row.rappi, isRowLocked)}
          </div>
        </td>
        <TransactionTableCell
          row={row}
          field="observaciones"
          renderInput={renderInput}
          isRowLocked={isRowLocked}
        />
      </tr>
    );
  }
);

export default TransactionTableRow;
