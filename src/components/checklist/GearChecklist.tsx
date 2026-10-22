// GEAR's indgang til Checklist mode (fra teambattle-workspace/checklist-kit).
// Kun en admin-session (admin-login på forsiden, kode tjekket på serveren)
// får laget. Ret ALDRIG i de kopierede cm*-filer her — ret i kittet og
// kopiér videre, så alle apps følger med.
import ChecklistMode from './ChecklistMode';
import { GEAR_SCREENS } from './cmScreens';
import { supabase } from '@/lib/supabase';
import { useAdminSession } from '@/lib/adminSession';
import { version } from '../../../package.json';

export default function GearChecklist() {
  const session = useAdminSession();
  return (
    <ChecklistMode
      app="gear"
      appName="GEAR"
      version={version}
      isAdmin={!!session}
      supabase={supabase}
      screens={GEAR_SCREENS}
      getContext={() => ({ user: session?.name || undefined })}
    />
  );
}
