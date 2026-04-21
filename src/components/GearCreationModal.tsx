import { X } from "lucide-react";
import GearForm from "./GearForm";

export default function GearCreationModal({
  isOpen,
  onClose,
  activitySlug,
  onCreated,
}: {
  isOpen: boolean;
  onClose: () => void;
  activitySlug: string;
  onCreated?: () => void;
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80" onClick={onClose} />
      <div className="relative panel w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold tracking-wider uppercase">Opret nyt gear</h2>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-white/10">
            <X className="w-4 h-4 text-white/60" />
          </button>
        </div>
        <GearForm
          activitySlug={activitySlug}
          onCreated={() => {
            onCreated?.();
            onClose();
          }}
        />
      </div>
    </div>
  );
}
