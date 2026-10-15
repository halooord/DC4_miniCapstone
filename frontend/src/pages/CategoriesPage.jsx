import ResourceManager from '../components/ResourceManager.jsx';

const fields = [
  { name: 'name', label: 'Category name', required: true, maxLength: 100 },
  { name: 'description', label: 'Description (optional)', multiline: true, maxLength: 500 },
];
const columns = [
  { key: 'name', label: 'Category', render: (row) => <span className="fw-semibold">{row.name}</span> },
  { key: 'description', label: 'Description', render: (row) => row.description || '—' },
  { key: 'products_count', label: 'Products', render: (row) => row.products_count ?? '—' },
];

export default function CategoriesPage() {
  return <ResourceManager title="Categories" singular="Category" description="Organize inventory into product categories."
    endpoint="/categories" fields={fields} columns={columns} />;
}
