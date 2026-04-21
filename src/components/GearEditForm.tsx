import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import {
  createGeartype,
  getGeartypes,
  updateGear,
  uploadGearImage,
  type Gear,
  type Geartype,
} from "@/lib/gearApi";

export default function GearEditForm({
  item,
  onSaved,
  onCancel,
}: {
  item: Gear;
  onSaved?: () => void;
  onCancel?: () => void;
}) {
  const [name, setName] = useState(item.name || "");
  const [location, setLocation] = useState(item.location || "Øst");
  const [serialNumbers, setSerialNumbers] = useState(item.serial_numbers || "");
  const [colorCode, setColorCode] = useState(item.color_code || "");
  const [description, setDescription] = useState(item.description || "");
  const [outOfService, setOutOfService] = useState(Boolean(item.out_of_service));
  const [outReason, setOutReason] = useState(item.out_of_service_reason || "");
  const [geartypes, setGeartypes] = useState<Geartype[]>([]);
  const [selectedGeartype, setSelectedGeartype] = useState<string>(item.geartype_id || "");
  const [newGearTypeName, setNewGearTypeName] = useState("");
  const [creatingType, setCreatingType] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [frequency, setFrequency] = useState(item.frequency || "");
  const [batteryChangeDate, setBatteryChangeDate] = useState(item.battery_change_date || "");
  const [emeiNumber, setEmeiNumber] = useState(item.emei_number || "");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getGeartypes().then(setGeartypes);
  }, []);

  const handleCreateGeartype = async () => {
    if (!newGearTypeName.trim()) return;
    setCreatingType(true);
    try {
      const created = await createGeartype({ name: newGearTypeName.trim() });
      setGeartypes((s) => [...s, created]);
      setSelectedGeartype(created.id);
      setNewGearTypeName("");
      toast.success("Geartype oprettet");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Kunne ikke oprette geartype");
    } finally {
      setCreatingType(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const updates: Partial<Gear> = {
        name,
        activity_slug: item.activity_slug,
        geartype_id: selectedGeartype || null,
        location,
        serial_numbers: serialNumbers || null,
        color_code: colorCode || null,
        description: description || null,
        out_of_service: outOfService,
        out_of_service_reason: outOfService ? outReason || null : null,
        frequency: frequency || null,
        battery_change_date: batteryChangeDate || null,
        emei_number: emeiNumber || null,
      };
      if (imageFile) {
        updates.image_url = await uploadGearImage(imageFile, item.activity_slug);
      }
      await updateGear(item.id, updates);
      toast.success("Gear opdateret");
      onSaved?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Kunne ikke opdatere gear");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 panel">
      <div>
        <label className="input-label">Geartype</label>
        <select
          value={selectedGeartype}
          onChange={(e) => setSelectedGeartype(e.target.value)}
          className="input"
        >
          <option value="">Vælg</option>
          {geartypes.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
        <div className="flex gap-2 mt-2">
          <input
            value={newGearTypeName}
            onChange={(e) => setNewGearTypeName(e.target.value)}
            placeholder="Ny geartype"
            className="input"
          />
          <button
            type="button"
            onClick={handleCreateGeartype}
            disabled={creatingType}
            className="ghost-btn whitespace-nowrap"
          >
            {creatingType ? "Opretter…" : "Opret type"}
          </button>
        </div>
      </div>

      <div>
        <label className="input-label">Navn</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          className="input"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
        <div>
          <label className="input-label">Placering</label>
          <select
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className="input"
          >
            <option>Øst</option>
            <option>Vest</option>
          </select>
        </div>
        <div>
          <label className="input-label">Serienummer</label>
          <input
            value={serialNumbers}
            onChange={(e) => setSerialNumbers(e.target.value)}
            className="input"
          />
        </div>
        <div>
          <label className="input-label">Farvekode</label>
          <input
            value={colorCode}
            onChange={(e) => setColorCode(e.target.value)}
            placeholder="#FF0000 eller rød"
            className="input"
          />
        </div>
        <div>
          <label className="input-label">Frekvens</label>
          <input
            value={frequency}
            onChange={(e) => setFrequency(e.target.value)}
            className="input"
          />
        </div>
      </div>

      <div>
        <label className="input-label">Beskrivelse</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          className="input"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="input-label">Batteriskift (dato)</label>
          <input
            type="date"
            value={batteryChangeDate}
            onChange={(e) => setBatteryChangeDate(e.target.value)}
            className="input [&::-webkit-calendar-picker-indicator]:invert"
          />
        </div>
        <div>
          <label className="input-label">EMEI-nummer (GPS)</label>
          <input
            value={emeiNumber}
            onChange={(e) => setEmeiNumber(e.target.value)}
            className="input"
          />
        </div>
      </div>

      <div>
        <label className="input-label">Nyt billede</label>
        <input
          type="file"
          accept="image/*"
          onChange={(e) => setImageFile(e.target.files?.[0] || null)}
          className="text-white/70 text-sm"
        />
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={outOfService}
          onChange={(e) => setOutOfService(e.target.checked)}
        />
        <span className="text-white/80">Ude af drift</span>
      </label>

      {outOfService && (
        <div>
          <label className="input-label">Forklaring</label>
          <input
            value={outReason}
            onChange={(e) => setOutReason(e.target.value)}
            className="input"
          />
        </div>
      )}

      <div className="flex gap-2">
        <button type="submit" disabled={saving} className="primary-btn">
          {saving ? "Gemmer…" : "Gem ændringer"}
        </button>
        <button type="button" onClick={onCancel} className="ghost-btn">
          Annuller
        </button>
      </div>
    </form>
  );
}
