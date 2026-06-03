import { useState, useEffect, useRef } from "react";
import { Loader2, Download } from "lucide-react";
import { SettingRow } from "./SettingRow";

interface UpdateInfo {
  current: string;
  latest: string;
  title: string;
  downloadUrl: string;
}

interface UpdateSectionProps {
  updateInfo: UpdateInfo | null;
  updatesChecked: boolean;
  currentVersion: string | null;
  onCheckForUpdates: () => Promise<UpdateInfo | null>;
}

export function UpdateSection({
  updateInfo,
  updatesChecked,
  currentVersion,
  onCheckForUpdates,
}: UpdateSectionProps) {
  const [checking, setChecking] = useState(false);
  const [localUpdateInfo, setLocalUpdateInfo] = useState<UpdateInfo | null>(
    updateInfo,
  );
  const [checked, setChecked] = useState(updatesChecked);
  const checkedTimer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    setLocalUpdateInfo(updateInfo);
    setChecked(updatesChecked);

    if (updatesChecked && !updateInfo) {
      checkedTimer.current = setTimeout(() => setChecked(false), 3000);
    }

    return () => clearTimeout(checkedTimer.current);
  }, [updatesChecked, updateInfo]);

  const handleCheck = async () => {
    clearTimeout(checkedTimer.current);
    setChecking(true);
    const info = await onCheckForUpdates();
    setLocalUpdateInfo(info);
    setChecked(true);
    setChecking(false);

    if (!info) {
      checkedTimer.current = setTimeout(() => setChecked(false), 3000);
    }
  };

  return (
    <>
      <SettingRow label="Version">
        <span className="text-xs text-muted-foreground">
          {currentVersion ? `v${currentVersion}` : "..."}
        </span>
      </SettingRow>

      <SettingRow label="Updates">
        {localUpdateInfo ? (
          <button
            onClick={() =>
              window.electronAPI?.openExternal(localUpdateInfo.downloadUrl)
            }
            className="h-6 inline-flex items-center gap-1.5 rounded-md bg-primary px-2.5 text-[11px] font-medium text-primary-foreground shadow hover:bg-primary/90 transition-colors"
          >
            <Download className="w-3 h-3" />
            Update to v{localUpdateInfo.latest}
          </button>
        ) : checked ? (
          <button
            disabled={true}
            className="h-6 inline-flex items-center gap-1.5 rounded-md px-2.5 text-[11px] font-medium bg-muted text-muted-foreground transition-colors disabled:opacity-50"
          >
            {checking && <Loader2 className="w-3 h-3 animate-spin" />}
            {checking ? "Checking..." : "Up to date"}
          </button>
        ) : (
          <button
            onClick={handleCheck}
            disabled={checking}
            className="h-6 inline-flex items-center gap-1.5 rounded-md px-2.5 text-[11px] font-medium bg-muted text-foreground hover:bg-muted/80 transition-colors disabled:opacity-50"
          >
            {checking && <Loader2 className="w-3 h-3 animate-spin" />}
            {checking ? "Checking..." : "Check for updates"}
          </button>
        )}
      </SettingRow>

      {localUpdateInfo && (
        <p className="text-xs text-muted-foreground">
          {localUpdateInfo.title} (v{localUpdateInfo.latest}) is available. You
          are on v{currentVersion}.
        </p>
      )}
    </>
  );
}
