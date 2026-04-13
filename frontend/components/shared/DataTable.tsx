'use client';

import { ArrowDown, ArrowUp, ArrowUpDown, Search } from 'lucide-react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

import { EmptyState } from '@/components/shared/EmptyState';
import { type Permission } from '@/lib/constants';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';

export type DataTableColumn<T> = {
  key: string;
  header: string;
  sortable?: boolean;
  className?: string;
  headerClassName?: string;
  accessor?: (row: T) => React.ReactNode;
};

type DataTableProps<T> = {
  columns: DataTableColumn<T>[];
  data: T[];
  rowKey: (row: T) => string;
  loading?: boolean;
  total?: number;
  page?: number;
  pageSize?: number;
  selectable?: boolean;
  selectedRowKeys?: string[];
  onSelectionChange?: (keys: string[]) => void;
  searchPlaceholder?: string;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyIcon?: React.ComponentType<{ className?: string }>;
  emptyAction?: React.ReactNode;
  emptyActionPermission?: Permission;
  className?: string;
  pageParamKey?: string;
  pageSizeParamKey?: string;
  queryParamKey?: string;
  sortByParamKey?: string;
  sortOrderParamKey?: string;
};

export function DataTable<T>({
  columns,
  data,
  rowKey,
  loading = false,
  total = 0,
  page = 1,
  pageSize = 10,
  selectable = false,
  selectedRowKeys,
  onSelectionChange,
  searchPlaceholder = 'Rechercher...',
  emptyTitle = 'Aucun resultat',
  emptyDescription = 'Aucune donnee ne correspond a vos criteres.',
  emptyIcon,
  emptyAction,
  emptyActionPermission,
  className,
  pageParamKey = 'page',
  pageSizeParamKey = 'page_size',
  queryParamKey = 'q',
  sortByParamKey = 'sort_by',
  sortOrderParamKey = 'sort_order',
}: DataTableProps<T>) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const sortBy = searchParams.get(sortByParamKey) || '';
  const sortOrder = searchParams.get(sortOrderParamKey) || 'asc';
  const searchParamsString = searchParams.toString();
  const [query, setQuery] = useState(searchParams.get(queryParamKey) ?? '');

  useEffect(() => {
    setQuery(searchParams.get(queryParamKey) ?? '');
  }, [queryParamKey, searchParams]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      const currentQuery = searchParams.get(queryParamKey) ?? '';
      const nextQuery = query.trim();

      if (currentQuery === nextQuery && (searchParams.get(pageParamKey) ?? '1') === '1') {
        return;
      }

      if (query.trim()) {
        params.set(queryParamKey, nextQuery);
      } else {
        params.delete(queryParamKey);
      }
      params.set(pageParamKey, '1');
      router.replace(`${pathname}?${params.toString()}`);
    }, 350);

    return () => clearTimeout(timeout);
  }, [pageParamKey, pathname, query, queryParamKey, router, searchParams]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const setParamAndNavigate = (updater: (params: URLSearchParams) => void) => {
    const params = new URLSearchParams(searchParams.toString());
    updater(params);
    const next = params.toString();
    if (next === searchParamsString) return;
    router.replace(`${pathname}?${next}`);
  };

  const onSort = (columnKey: string) => {
    setParamAndNavigate((params) => {
      const currentSortBy = params.get(sortByParamKey);
      const currentSortOrder = params.get(sortOrderParamKey) || 'asc';

      if (currentSortBy === columnKey) {
        params.set(sortOrderParamKey, currentSortOrder === 'asc' ? 'desc' : 'asc');
      } else {
        params.set(sortByParamKey, columnKey);
        params.set(sortOrderParamKey, 'asc');
      }
      params.set(pageParamKey, '1');
    });
  };

  const currentSelection = selectedRowKeys ?? [];
  const selectableKeys = useMemo(() => data.map(rowKey), [data, rowKey]);
  const allCurrentChecked =
    selectableKeys.length > 0 && selectableKeys.every((key) => currentSelection.includes(key));

  const updateSelection = (nextSelection: string[]) => {
    onSelectionChange?.(nextSelection);
  };

  const toggleAllCurrentRows = (checked: boolean) => {
    if (checked) {
      const merged = Array.from(new Set([...currentSelection, ...selectableKeys]));
      updateSelection(merged);
      return;
    }

    updateSelection(currentSelection.filter((key) => !selectableKeys.includes(key)));
  };

  const toggleOneRow = (key: string, checked: boolean) => {
    if (checked) {
      updateSelection(Array.from(new Set([...currentSelection, key])));
      return;
    }

    updateSelection(currentSelection.filter((value) => value !== key));
  };

  const renderSortIcon = (columnKey: string) => {
    if (sortBy !== columnKey) return <ArrowUpDown className="h-3.5 w-3.5 opacity-60" />;
    return sortOrder === 'desc' ? <ArrowDown className="h-3.5 w-3.5" /> : <ArrowUp className="h-3.5 w-3.5" />;
  };

  return (
    <div className={cn('space-y-4', className)}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-sm">
          <Search className="pointer-events-none absolute top-2 left-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={searchPlaceholder}
            className="pl-8"
          />
        </div>
        <div className="text-sm text-muted-foreground">{total} element(s)</div>
      </div>

      <div className="overflow-x-auto rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow>
              {selectable ? (
                <TableHead className="w-10">
                  <Checkbox
                    checked={allCurrentChecked}
                    onCheckedChange={(value) => toggleAllCurrentRows(Boolean(value))}
                    aria-label="Selectionner toutes les lignes"
                  />
                </TableHead>
              ) : null}
              {columns.map((column) => (
                <TableHead key={column.key} className={column.headerClassName}>
                  {column.sortable ? (
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => onSort(column.key)}
                      className="h-8 gap-1 px-1.5"
                    >
                      {column.header}
                      {renderSortIcon(column.key)}
                    </Button>
                  ) : (
                    column.header
                  )}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>

          <TableBody>
            {loading
              ? Array.from({ length: Math.min(pageSize, 8) }).map((_, index) => (
                  <TableRow key={`skeleton-${index}`}>
                    {selectable ? (
                      <TableCell>
                        <Skeleton className="h-4 w-4" />
                      </TableCell>
                    ) : null}
                    {columns.map((column) => (
                      <TableCell key={`${column.key}-skeleton-${index}`}>
                        <Skeleton className="h-4 w-full max-w-[180px]" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              : null}

            {!loading && data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length + (selectable ? 1 : 0)} className="p-6">
                  <EmptyState
                    icon={emptyIcon}
                    title={emptyTitle}
                    description={emptyDescription}
                    action={emptyAction}
                    actionPermission={emptyActionPermission}
                    className="border-none"
                  />
                </TableCell>
              </TableRow>
            ) : null}

            {!loading && data.length > 0
              ? data.map((row) => {
                  const key = rowKey(row);
                  const checked = currentSelection.includes(key);

                  return (
                    <TableRow key={key} data-state={checked ? 'selected' : undefined}>
                      {selectable ? (
                        <TableCell>
                          <Checkbox
                            checked={checked}
                            onCheckedChange={(value) => toggleOneRow(key, Boolean(value))}
                            aria-label="Selectionner la ligne"
                          />
                        </TableCell>
                      ) : null}
                      {columns.map((column) => (
                        <TableCell key={`${key}-${column.key}`} className={column.className}>
                          {column.accessor ? column.accessor(row) : null}
                        </TableCell>
                      ))}
                    </TableRow>
                  );
                })
              : null}
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-sm text-muted-foreground">
          Page {page} / {totalPages}
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={page <= 1}
            onClick={() =>
              setParamAndNavigate((params) => {
                params.set(pageParamKey, String(Math.max(1, page - 1)));
                if (!params.get(pageSizeParamKey)) {
                  params.set(pageSizeParamKey, String(pageSize));
                }
              })
            }
          >
            Precedent
          </Button>

          <Button
            type="button"
            variant="outline"
            disabled={page >= totalPages}
            onClick={() =>
              setParamAndNavigate((params) => {
                params.set(pageParamKey, String(Math.min(totalPages, page + 1)));
                if (!params.get(pageSizeParamKey)) {
                  params.set(pageSizeParamKey, String(pageSize));
                }
              })
            }
          >
            Suivant
          </Button>
        </div>
      </div>
    </div>
  );
}
