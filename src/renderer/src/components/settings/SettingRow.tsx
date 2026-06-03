export function SettingRow({
  label,
  value,
  children,
}: {
  label: string;
  value?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <span className="text-sm text-foreground">{label}</span>
        {value && (
          <span className="text-xs text-muted-foreground">({value})</span>
        )}
      </div>
      {children}
    </div>
  );
}
