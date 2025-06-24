import React from 'react';

import { useQuery } from '@tanstack/react-query';

import HeaderTitles from './HeaderTitles';
import TransactionTableRow, { InputType } from './TransactionTableRow';

import type { TransactionRecord } from '~/types';

interface Props {
  onRowSelect: (id: string, precioNeto: number) => void;
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
  isDeleteMode: boolean;
  isAsesorSelectionMode: boolean;
  selectedRows: Set<string>;
  rowsToDelete: Set<string>;
  handleDeleteSelect: (id: string) => void;
  searchTerm: string;
  searchTrigger: number;
}

const TransactionSearchRemote: React.FC<Props> = ({
  onRowSelect,
  renderCheckbox,
  renderAsesorSelect,
  renderInput,
  getEmitidoPorClass,
  isDeleteMode,
  isAsesorSelectionMode,
  selectedRows,
  rowsToDelete,
  handleDeleteSelect,
  searchTerm,
  searchTrigger,
}) => {
  const { data: results = [], error } = useQuery<TransactionRecord[]>({
    queryKey: ['transactions-search', searchTerm, searchTrigger],
    queryFn: async (): Promise<TransactionRecord[]> => {
      if (!searchTerm) return [];
      const res = await fetch(
        `/api/transactions/search?query=${encodeURIComponent(searchTerm)}`
      );
      if (!res.ok) throw new Error('Error buscando transacciones');
      return res.json() as Promise<TransactionRecord[]>;
    },
    enabled: !!searchTerm, // Solo buscar si hay término
    retry: 1,
    staleTime: 1000 * 60, // 1 minuto
  });

  return (
    <div className="mb-6">
      {/* El input de búsqueda se elimina, solo se muestra la tabla si hay resultados */}
      {error && (
        <div className="mb-2 text-red-600">{(error as Error).message}</div>
      )}
      <div
        className="table-container"
        style={{ borderRadius: '8px', padding: '1rem' }}
      >
        <div
          className="table-scroll-container"
          style={{ overflowX: 'auto', overflowY: 'auto' }}
        >
          <table className="w-full text-left text-sm text-gray-600">
            <HeaderTitles isDeleteMode={isDeleteMode} />
            <tbody>
              {results.length > 0 ? (
                (results as TransactionRecord[]).map(
                  (row: TransactionRecord, index: number) => (
                    <TransactionTableRow
                      key={row.id}
                      row={row}
                      isDeleteMode={isDeleteMode}
                      isAsesorSelectionMode={isAsesorSelectionMode}
                      selectedRows={selectedRows}
                      rowsToDelete={rowsToDelete}
                      handleInputChange={() => {
                        /* Solo lectura en búsqueda remota */
                      }}
                      handleRowSelect={onRowSelect}
                      handleDeleteSelect={handleDeleteSelect}
                      renderCheckbox={renderCheckbox}
                      renderAsesorSelect={renderAsesorSelect}
                      renderInput={renderInput}
                      getEmitidoPorClass={getEmitidoPorClass}
                      _index={index}
                    />
                  )
                )
              ) : (
                <tr>
                  <td colSpan={24} className="py-8 text-center text-gray-400">
                    No hay resultados para la búsqueda.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default TransactionSearchRemote;
