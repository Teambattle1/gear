import type { CmScreenDef } from './cmCore';

/**
 * Checklist mode — SKÆRM → FIL for GEAR. Skærmnøglen er ruten; filen er det,
 * Claude Code åbner først. Ny rute i App.tsx = én række her. Præcise stier
 * FØR `:param`-stier (første match vinder).
 */
export const GEAR_SCREENS: CmScreenDef[] = [
  { path: '/', label: 'Forside', file: 'src/pages/Landing.tsx' },
  { path: '/vedligeholdelse', label: 'Vedligeholdelse', file: 'src/pages/Maintenance.tsx' },
  { path: '/find', label: 'Find udstyr (GPS)', file: 'src/pages/FindEquipment.tsx' },
  { path: '/teambox', label: 'TeamBox Hub', file: 'src/pages/TeamBox.tsx' },
  { path: '/aktivitet/:slug', label: 'Aktivitet · udstyr', file: 'src/pages/ActivityGear.tsx' },
];
