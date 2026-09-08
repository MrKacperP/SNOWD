"use client";
import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
export function useAdminSelection() {
  const params = useSearchParams();
  const id = params.get('id');
  const [selected, setSelected] = useState<string | null>(id);
  useEffect(() => { setSelected(id); }, [id]);
  return [selected, setSelected] as const;
}
