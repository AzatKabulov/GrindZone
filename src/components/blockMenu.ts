import { router } from 'expo-router';

import { BLOCK_CATEGORIES, blockColor } from '@/lib/categories';
import { addDays, fmtDuration, fmtMin, niceLabel } from '@/lib/date';
import { haptic } from '@/lib/haptics';
import { deleteBlock, duplicateBlock, shiftBlock } from '@/store/actions';
import type { Block } from '@/store/data';
import { useMenu } from '@/store/menu';

/** Press-and-hold menu for a time block: edit, move, duplicate or delete without opening it. */
export function openBlockMenu(block: Block, accent: string) {
  haptic.medium();
  const cat = BLOCK_CATEGORIES[block.category];
  useMenu.getState().open({
    kicker: `${niceLabel(block.date).toUpperCase()} · ${fmtMin(block.start_min)}–${fmtMin(block.end_min)}`,
    title: block.title || cat.label,
    subtitle: `${cat.label.charAt(0)}${cat.label.slice(1).toLowerCase()} · ${fmtDuration(block.end_min - block.start_min).toLowerCase()}${block.note ? ` · ${block.note}` : ''}`,
    color: blockColor(block.category, accent),
    actions: [
      { label: 'Edit', icon: 'create-outline', run: () => router.push({ pathname: '/block/[id]', params: { id: block.id } }) },
      { label: 'Move 30 min later', icon: 'arrow-down-outline', run: () => shiftBlock(block.id, 30) },
      { label: 'Duplicate to tomorrow', icon: 'copy-outline', run: () => duplicateBlock(block.id, addDays(block.date, 1)) },
      { label: 'Delete', icon: 'trash-outline', danger: true, run: () => deleteBlock(block.id) },
    ],
  });
}
