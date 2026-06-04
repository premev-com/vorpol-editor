import { Loader2, Download, RefreshCw } from "lucide-react";
import { SettingRow } from "./SettingRow";

type UpdateStatus =
  | "idle"
  | "checking"
  | "available"
  | "downloading"
  | "downloaded"
  | "up-to-date"
  | "error";

interface UpdateSectionProps {
  updateStatus: UpdateStatus;
  updateVersion: string | null;
  downloadProgress: number;
  currentVersion: string | null;
}

export function UpdateSection({
  updateStatus,
  updateVersion,
  downloadProgress,
  currentVersion,
}: UpdateSectionProps) {
  const handleClick = () => {
    if (updateStatus === "available") {
      window.electronAPI.downloadUpdate();
    } else if (updateStatus === "downloaded") {
      window.electronAPI.installUpdate();
    } else if (updateStatus === "idle" || updateStatus === "error") {
      window.electronAPI.checkForUpdates();
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
        {updateStatus === "available" && (
          <button
            onClick={handleClick}
            className="h-6 inline-flex items-center gap-1.5 rounded-md bg-primary px-2.5 text-[11px] font-medium text-primary-foreground shadow hover:bg-primary/90 transition-colors"
          >
            <Download className="w-3 h-3" />
            Update to v{updateVersion}
          </button>
        )}

        {updateStatus === "downloading" && (
          <button
            disabled
            className="h-6 inline-flex items-center gap-1.5 rounded-md px-2.5 text-[11px] font-medium bg-muted text-muted-foreground"
          >
            <Download className="w-3 h-3" />
            {Math.round(downloadProgress)}%
          </button>
        )}

        {updateStatus === "downloaded" && (
          <button
            onClick={handleClick}
            className="h-6 inline-flex items-center gap-1.5 rounded-md bg-primary px-2.5 text-[11px] font-medium text-primary-foreground shadow hover:bg-primary/90 transition-colors"
          >
            <RefreshCw className="w-3 h-3" />
            Restart to install
          </button>
        )}

        {updateStatus === "checking" && (
          <button
            disabled
            className="h-6 inline-flex items-center gap-1.5 rounded-md px-2.5 text-[11px] font-medium bg-muted text-muted-foreground"
          >
            <Loader2 className="w-3 h-3 animate-spin" />
            Checking...
          </button>
        )}

        {updateStatus === "up-to-date" && (
          <span className="text-[11px] font-medium text-muted-foreground">
            Up to date
          </span>
        )}

        {(updateStatus === "idle" || updateStatus === "error") && (
          <button
            onClick={handleClick}
            className="h-6 inline-flex items-center gap-1.5 rounded-md px-2.5 text-[11px] font-medium bg-muted text-foreground hover:bg-muted/80 transition-colors"
          >
            Check for updates
          </button>
        )}
      </SettingRow>

      {updateStatus === "available" && updateVersion && (
        <p className="text-xs text-muted-foreground">
          v{updateVersion} is available. You are on v{currentVersion}.
        </p>
      )}

      {updateStatus === "error" && (
        <p className="text-xs text-red-400">
          Update check failed. Click to retry.
        </p>
      )}
    </>
  );
}
