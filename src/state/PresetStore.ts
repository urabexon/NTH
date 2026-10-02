import { presetStoreSchema, type Preset, type PresetStoreData, type Snapshot } from './schema';

export const PRESET_STORAGE_KEY = 'nth.presets.v1';
export const PRESET_SLOTS = 9;

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export class PresetStore {
  private data: PresetStoreData = { v: 1, slots: {} };

  constructor(private readonly storage: StorageLike | null) {
    this.load();
  }

  get(slot: number): Preset | null {
    return this.data.slots[String(slot)] ?? null;
  }

  list(): readonly (Preset | null)[] {
    return Array.from({ length: PRESET_SLOTS }, (_, i) => this.get(i + 1));
  }

  save(slot: number, snapshot: Snapshot, name = `Slot ${String(slot)}`): void {
    if (!Number.isInteger(slot) || slot < 1 || slot > PRESET_SLOTS) {
      throw new Error(`Preset slot must be 1..${String(PRESET_SLOTS)}, got ${String(slot)}`);
    }
    this.data = { v: 1, slots: { ...this.data.slots, [String(slot)]: { name, snapshot } } };
    this.persist();
  }

  clear(slot: number): void {
    const key = String(slot);
    const slots = Object.fromEntries(Object.entries(this.data.slots).filter(([k]) => k !== key));
    this.data = { v: 1, slots };
    this.persist();
  }

  private load(): void {
    const raw = this.storage?.getItem(PRESET_STORAGE_KEY);
    if (!raw) return;
    try {
      this.data = presetStoreSchema.parse(JSON.parse(raw));
    } catch {
      this.data = { v: 1, slots: {} };
    }
  }

  private persist(): void {
    this.storage?.setItem(PRESET_STORAGE_KEY, JSON.stringify(this.data));
  }
}
