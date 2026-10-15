import { useSearchParams } from 'react-router-dom';
import Button from './Button.jsx';

export default function Pagination({ meta }) {
  const [searchParams, setSearchParams] = useSearchParams();
  if (!meta || meta.last_page <= 1) return null;

  const current = meta.current_page;
  const last = meta.last_page;
  function go(page) {
    if (page < 1 || page > last) return;
    const next = new URLSearchParams(searchParams);
    next.set('page', String(page));
    setSearchParams(next);
  }

  return (
    <nav className="d-flex flex-wrap gap-2 align-items-center justify-content-between mt-3" aria-label="Table pagination">
      <span className="small text-secondary">Page {current} of {last} · {meta.total} records</span>
      <div className="d-flex gap-2">
        <Button variant="outline-secondary" disabled={current <= 1} onClick={() => go(current - 1)}>Previous</Button>
        <Button variant="outline-secondary" disabled={current >= last} onClick={() => go(current + 1)}>Next</Button>
      </div>
    </nav>
  );
}
