import React from 'react';

import { bancoOptions } from '~/utils/constants';
import {
  fromDatetimeLocalStringToColombiaDate,
  toColombiaDatetimeLocalString,
} from '~/utils/dateUtils';

import type { CuadreData, ExtendedSummaryRecord } from '~/types';

interface CuadreTableBodyProps {
  groupedRecords: {
    asesor: string;
    fechas: {
      fecha: Date;
      records: ExtendedSummaryRecord[];
    }[];
  }[];
  isDeleteMode: boolean;
  rowsToDelete: Set<string>;
  editValues: Record<string, Partial<CuadreData>>;
  handleDeleteSelect: (id: string) => void;
  handleLocalEdit: (
    id: string,
    field: keyof CuadreData,
    value: string | number | boolean | Date | null
  ) => void;
  getEmitidoPorClass: (emitidoPor: string) => string | undefined;
}

const CuadreTableBody: React.FC<CuadreTableBodyProps> = ({
  groupedRecords,
  isDeleteMode,
  rowsToDelete,
  editValues,
  handleDeleteSelect,
  handleLocalEdit,
  getEmitidoPorClass,
}) => (
  <>
    {groupedRecords.map((asesorGroup) => (
      <React.Fragment key={asesorGroup.asesor}>
        {asesorGroup.fechas.map((fechaGroup) => (
          <React.Fragment
            key={
              asesorGroup.asesor +
              '__' +
              fechaGroup.fecha.toLocaleDateString('es-CO')
            }
          >
            <tr>
              <td
                colSpan={isDeleteMode ? 12 : 11}
                className="border-b border-gray-400 bg-gray-200 px-4 py-2 text-left text-lg font-bold"
              >
                <span className="text-blue-900">Asesor:</span>{' '}
                {asesorGroup.asesor} &nbsp;|&nbsp;
                <span className="text-gray-700">Fecha:</span>{' '}
                {fechaGroup.fecha.toLocaleDateString('es-CO')}
              </td>
            </tr>
            {fechaGroup.records.map((record) => (
              <tr key={record.id} className="border-b hover:bg-gray-50">
                {isDeleteMode && (
                  <td className="cuadre-cell">
                    <div className="flex h-full items-center justify-center">
                      <input
                        type="checkbox"
                        checked={rowsToDelete.has(record.id)}
                        onChange={() => handleDeleteSelect(record.id)}
                        className="h-4 w-4 rounded border-gray-600"
                      />
                    </div>
                  </td>
                )}
                <td className="cuadre-cell font-lexend">
                  {new Date(record.fecha).toLocaleDateString('es-CO')}
                </td>
                <td className="cuadre-cell font-lexend font-bold uppercase">
                  {record.placa}
                </td>
                <td className="cuadre-cell font-lexend">
                  <div className={getEmitidoPorClass(record.emitidoPor)}>
                    {record.emitidoPor}
                  </div>
                </td>
                <td className="cuadre-cell font-lexend font-semibold">
                  {record.asesor}
                </td>
                <td className="cuadre-cell font-lexend">
                  $ {Number(record.tarifaServicio).toLocaleString('es-CO')}
                </td>
                <td className="cuadre-cell font-lexend font-bold">
                  $
                  {(
                    record.precioNeto + (record.tarifaServicio ?? 0)
                  ).toLocaleString('es-CO')}
                </td>
                <td className="cuadre-cell">
                  <select
                    value={editValues[record.id]?.banco ?? record.banco ?? ''}
                    onChange={(e) =>
                      handleLocalEdit(record.id, 'banco', e.target.value)
                    }
                    className="cuadre-select font-lexend text-xs"
                    style={{ fontSize: '0.75rem' }}
                    title={editValues[record.id]?.banco ?? record.banco ?? ''}
                  >
                    <option value="">Seleccionar...</option>
                    {bancoOptions.map((option) => (
                      <option key={option} value={option} title={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="cuadre-cell">
                  <div style={{ position: 'relative', width: '100%' }}>
                    <span
                      style={{
                        position: 'absolute',
                        left: 10,
                        top: '50%',
                        transform: 'translateY(-50%)',
                        color: '#888',
                        pointerEvents: 'none',
                        fontSize: '1rem',
                      }}
                    >
                      $
                    </span>
                    <input
                      type="number"
                      value={
                        editValues[record.id]?.monto !== undefined
                          ? editValues[record.id]?.monto === 0
                            ? ''
                            : String(Number(editValues[record.id]?.monto))
                          : record.monto === 0 ||
                              record.monto === undefined ||
                              record.monto === null
                            ? ''
                            : String(Number(record.monto))
                      }
                      onChange={(e) =>
                        handleLocalEdit(
                          record.id,
                          'monto',
                          e.target.value === '' ? 0 : Number(e.target.value)
                        )
                      }
                      className="cuadre-input font-lexend"
                      style={{
                        paddingLeft: '1.5rem',
                        appearance: 'textfield',
                        WebkitAppearance: 'none',
                        MozAppearance: 'textfield',
                        marginLeft: 0,
                        width: '90%',
                      }}
                    />
                  </div>
                </td>
                <td
                  className="cuadre-cell date-column font-lexend"
                  title={
                    (editValues[record.id]?.fechaCliente
                      ? new Date(editValues[record.id]?.fechaCliente ?? '')
                      : record.fechaCliente
                        ? new Date(record.fechaCliente)
                        : null
                    )?.toLocaleString('es-CO', { hour12: true }) ?? ''
                  }
                >
                  <input
                    type="datetime-local"
                    value={
                      editValues[record.id]?.fechaCliente
                        ? toColombiaDatetimeLocalString(
                            new Date(editValues[record.id]?.fechaCliente ?? '')
                          )
                        : record.fechaCliente
                          ? toColombiaDatetimeLocalString(
                              new Date(record.fechaCliente)
                            )
                          : ''
                    }
                    onChange={(e) =>
                      handleLocalEdit(
                        record.id,
                        'fechaCliente',
                        e.target.value
                          ? fromDatetimeLocalStringToColombiaDate(
                              e.target.value
                            )
                          : null
                      )
                    }
                    className="cuadre-input"
                    style={{ width: '100px' }}
                  />
                </td>
                <td className="cuadre-cell border-r-0">
                  <input
                    type="text"
                    value={
                      editValues[record.id]?.referencia ??
                      record.referencia ??
                      ''
                    }
                    onChange={(e) =>
                      handleLocalEdit(record.id, 'referencia', e.target.value)
                    }
                    className="cuadre-input font-lexend"
                  />
                </td>
                <td
                  className="cuadre-cell font-lexend"
                  style={{
                    width: '3.5rem',
                    minWidth: '3.5rem',
                    maxWidth: '3.5rem',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={editValues[record.id]?.pagado ?? !!record.pagado}
                    onChange={(e) =>
                      handleLocalEdit(record.id, 'pagado', e.target.checked)
                    }
                  />
                </td>
              </tr>
            ))}
          </React.Fragment>
        ))}
      </React.Fragment>
    ))}
  </>
);

export default CuadreTableBody;
