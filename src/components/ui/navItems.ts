import { BookOpen, LayoutGrid, Scissors, Sprout } from 'lucide-react';
import type { TabId } from '../../types/models';

export const NAV_ITEMS: Array<{ id: TabId; label: string; icon: typeof LayoutGrid }> = [
  { id: 'overview', label: 'Tổng quan', icon: LayoutGrid },
  { id: 'trees', label: 'Cây', icon: Sprout },
  { id: 'pruning', label: 'Cắt tỉa', icon: Scissors },
  { id: 'reference', label: 'Tra cứu', icon: BookOpen },
];
