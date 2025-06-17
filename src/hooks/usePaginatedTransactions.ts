import { useMemo } from 'react';
import useSWR from 'swr';

import { getTransactions } from '~/server/actions/tableGeneral';
import type { TransactionRecord } from '~/types';
import { getDateKey, toColombiaDate } from '~/utils/dateUtils';

interface DateFilter {
  startDate: Date | null;
  endDate: Date | null;
}

export function usePaginatedTransactions(
  currentPage: number,
  _dateFilter: { startDate: Date | null; endDate: Date | null } // Add underscore to mark as intentionally unused
) {
  const { data: transactions = [], isLoading } = useSWR(
    '/api/transactions',
    getTransactions
  );

  const { groupedByDate, totalPages } = useMemo(() => {
    const groups = new Map<string, TransactionRecord[]>();

    transactions.forEach((record) => {
      const dateKey = getDateKey(new Date(record.fecha));
      const existingGroup = groups.get(dateKey) ?? [];
      groups.set(dateKey, [...existingGroup, record]);
    });

    // Sort records within each group by date
    groups.forEach((records, key) => {
      const sortedRecords = [...records].sort((a, b) => {
        const dateA = toColombiaDate(new Date(b.fecha));
        const dateB = toColombiaDate(new Date(a.fecha));
        return dateA.getTime() - dateB.getTime();
      });
      groups.set(key, sortedRecords);
    });

    // Get sorted dates and calculate total pages
    const sortedDates = Array.from(groups.keys()).sort((a, b) =>
      b.localeCompare(a)
    );
    const pages = sortedDates.length;

    return {
      groupedByDate: groups,
      totalPages: pages,
    };
  }, [transactions]);

  const currentPageData = useMemo(() => {
    // Get sorted dates
    const dates = Array.from(groupedByDate.keys()).sort((a, b) =>
      b.localeCompare(a)
    );

    // Get current date based on page number
    const currentDate = dates[currentPage - 1];
    if (!currentDate) return [];

    // Return records for current date
    return groupedByDate.get(currentDate) ?? [];
  }, [groupedByDate, currentPage]);

  return {
    currentPageData,
    isLoading,
    totalPages,
  };
}
