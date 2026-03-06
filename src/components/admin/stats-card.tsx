type StatsCardProps = {
  label: string;
  value: string | number;
  icon: string;
  trend?: string;
};

export function StatsCard({ label, value, icon, trend }: StatsCardProps) {
  return (
    <div className="bg-white border border-stone-200 rounded-xl p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-stone-500">{label}</p>
          <p className="text-2xl font-medium text-stone-900 mt-1">{value}</p>
          {trend && (
            <p className="text-xs text-stone-400 mt-1">{trend}</p>
          )}
        </div>
        <div className="p-2 bg-stone-100 rounded-lg">
          <iconify-icon icon={icon} width="24" height="24" />
        </div>
      </div>
    </div>
  );
}
