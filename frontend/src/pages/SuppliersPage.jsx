import ResourceManager from '../components/ResourceManager.jsx';

const fields = [
  { name: 'name', label: 'Supplier name', required: true, maxLength: 150 },
  { name: 'contact_person', label: 'Contact person (optional)', maxLength: 100 },
  { name: 'phone', label: 'Phone (optional)', type: 'tel', maxLength: 30 },
  { name: 'address', label: 'Address (optional)', maxLength: 255 },
];
const columns = [
  { key: 'name', label: 'Supplier', render: (row) => <span className="fw-semibold">{row.name}</span> },
  { key: 'contact_person', label: 'Contact person', render: (row) => row.contact_person || '—' },
  { key: 'phone', label: 'Phone', render: (row) => row.phone || '—' },
  { key: 'address', label: 'Address', render: (row) => row.address || '—' },
  { key: 'products_count', label: 'Products', render: (row) => row.products_count ?? '—' },
];

export default function SuppliersPage() {
  return <ResourceManager title="Suppliers" singular="Supplier" description="View and manage your shop's poultry suppliers."
    endpoint="/suppliers" fields={fields} columns={columns} />;
}
