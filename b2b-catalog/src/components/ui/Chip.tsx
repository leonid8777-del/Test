interface ChipProps {
  label: string;
  variant?: 'category' | 'condition' | 'unit' | 'export' | 'status';
  size?: 'sm' | 'md';
}

const variantStyles: Record<string, string> = {
  category: 'bg-blue-50 text-blue-700 border-blue-200',
  condition: 'bg-green-50 text-green-700 border-green-200',
  unit: 'bg-purple-50 text-purple-700 border-purple-200',
  export: 'bg-orange-50 text-orange-700 border-orange-200',
  status: 'bg-gray-50 text-gray-700 border-gray-200',
};

export function Chip({ label, variant = 'status', size = 'sm' }: ChipProps) {
  const sizeClass = size === 'sm' ? 'text-[10px] px-1.5 py-0.5' : 'text-xs px-2 py-1';
  return (
    <span
      className={`inline-flex items-center rounded-full border font-medium ${variantStyles[variant]} ${sizeClass}`}
    >
      {label}
    </span>
  );
}
