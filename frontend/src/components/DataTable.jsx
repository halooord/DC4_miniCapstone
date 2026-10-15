import EmptyState from './EmptyState.jsx';
import Spinner from './Spinner.jsx';

export default function DataTable({ columns, rows, loading = false, rowKey = 'id', emptyTitle = 'No records found' }) {
  if (loading) return <div className="p-4"><Spinner /></div>;
  if (!rows.length) return <EmptyState title={emptyTitle} />;
  return (
    <div className="table-responsive">
      <table className="table table-hover align-middle mb-0">
        <thead className="table-light"><tr>{columns.map((column) => <th key={column.key} scope="col">{column.label}</th>)}</tr></thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row[rowKey]}>
              {columns.map((column) => (
                <td key={column.key}>{column.render ? column.render(row) : (row[column.key] ?? '—')}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
