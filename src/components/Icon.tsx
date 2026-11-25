import { Ionicons } from '@expo/vector-icons';
import { SymbolView, type SymbolWeight } from 'expo-symbols';
import type { ComponentProps } from 'react';
import { Platform, type StyleProp, type ViewStyle } from 'react-native';
import type { SFSymbol } from 'sf-symbols-typescript';

type Ion = ComponentProps<typeof Ionicons>['name'];

/** SF Symbols on iOS, Ionicons fallback elsewhere (web preview / Android). */
export const ICONS = {
  today: { sf: 'bolt.fill', ion: 'flash' },
  tasks: { sf: 'checklist', ion: 'list' },
  plan: { sf: 'calendar.day.timeline.left', ion: 'calendar' },
  goals: { sf: 'target', ion: 'locate' },
  notes: { sf: 'note.text', ion: 'document-text' },
  plus: { sf: 'plus', ion: 'add' },
  plusCircle: { sf: 'plus.circle.fill', ion: 'add-circle' },
  check: { sf: 'checkmark', ion: 'checkmark' },
  checkCircle: { sf: 'checkmark.circle.fill', ion: 'checkmark-circle' },
  trash: { sf: 'trash', ion: 'trash-outline' },
  trashFill: { sf: 'trash.fill', ion: 'trash' },
  pin: { sf: 'pin.fill', ion: 'pin' },
  pinOff: { sf: 'pin.slash', ion: 'pin-outline' },
  flame: { sf: 'flame.fill', ion: 'flame' },
  trophy: { sf: 'trophy.fill', ion: 'trophy' },
  medal: { sf: 'medal.fill', ion: 'medal' },
  levelUp: { sf: 'arrow.up.forward.circle.fill', ion: 'arrow-up-circle' },
  chevronRight: { sf: 'chevron.right', ion: 'chevron-forward' },
  chevronLeft: { sf: 'chevron.left', ion: 'chevron-back' },
  chevronDown: { sf: 'chevron.down', ion: 'chevron-down' },
  calendar: { sf: 'calendar', ion: 'calendar' },
  clock: { sf: 'clock.fill', ion: 'time' },
  flag: { sf: 'flag.fill', ion: 'flag' },
  person: { sf: 'person.crop.circle.fill', ion: 'person-circle' },
  ellipsis: { sf: 'ellipsis', ion: 'ellipsis-horizontal' },
  copy: { sf: 'doc.on.doc', ion: 'copy-outline' },
  repeat: { sf: 'arrow.trianglehead.2.clockwise', ion: 'repeat' },
  sync: { sf: 'arrow.triangle.2.circlepath', ion: 'sync' },
  cloud: { sf: 'icloud.fill', ion: 'cloud' },
  moon: { sf: 'moon.fill', ion: 'moon' },
  sun: { sf: 'sun.max.fill', ion: 'sunny' },
  phone: { sf: 'iphone', ion: 'phone-portrait' },
  haptics: { sf: 'waveform', ion: 'pulse' },
  logout: { sf: 'rectangle.portrait.and.arrow.right', ion: 'log-out-outline' },
  search: { sf: 'magnifyingglass', ion: 'search' },
  compose: { sf: 'square.and.pencil', ion: 'create-outline' },
  sparkles: { sf: 'sparkles', ion: 'sparkles' },
  xmark: { sf: 'xmark', ion: 'close' },
  envelope: { sf: 'envelope.fill', ion: 'mail' },
  lock: { sf: 'lock.fill', ion: 'lock-closed' },
  eye: { sf: 'eye', ion: 'eye-outline' },
  eyeSlash: { sf: 'eye.slash', ion: 'eye-off-outline' },
  inbox: { sf: 'tray.fill', ion: 'file-tray' },
  text: { sf: 'text.alignleft', ion: 'reorder-three' },
  target: { sf: 'target', ion: 'locate' },
  undo: { sf: 'arrow.uturn.backward', ion: 'arrow-undo' },
  paintbrush: { sf: 'paintbrush.fill', ion: 'color-palette' },
  circleHalf: { sf: 'circle.lefthalf.filled', ion: 'contrast' },
  timer: { sf: 'timer', ion: 'timer-outline' },
  // block categories
  deep: { sf: 'bolt.fill', ion: 'flash' },
  train: { sf: 'figure.strengthtraining.traditional', ion: 'barbell' },
  learn: { sf: 'book.fill', ion: 'book' },
  build: { sf: 'hammer.fill', ion: 'hammer' },
  admin: { sf: 'tray.full.fill', ion: 'file-tray-full' },
  recover: { sf: 'leaf.fill', ion: 'leaf' },
  social: { sf: 'person.2.fill', ion: 'people' },
  // goal pillars
  body: { sf: 'figure.run', ion: 'body' },
  mind: { sf: 'brain.head.profile.fill', ion: 'bulb' },
  wealth: { sf: 'dollarsign', ion: 'cash' },
  craft: { sf: 'hammer.fill', ion: 'hammer' },
  spirit: { sf: 'flame.fill', ion: 'flame' },
  brotherhood: { sf: 'person.2.fill', ion: 'people' },
} satisfies Record<string, { sf: SFSymbol; ion: Ion }>;

export type IconName = keyof typeof ICONS;

export function sfName(name: IconName): SFSymbol {
  return ICONS[name].sf;
}

export function Icon({
  name,
  size = 20,
  color,
  weight = 'regular',
  style,
}: {
  name: IconName;
  size?: number;
  color: string;
  weight?: SymbolWeight;
  style?: StyleProp<ViewStyle>;
}) {
  const def = ICONS[name];
  if (Platform.OS === 'ios') {
    return (
      <SymbolView
        name={def.sf}
        size={size}
        tintColor={color}
        weight={weight}
        resizeMode="scaleAspectFit"
        style={[{ width: size, height: size }, style]}
      />
    );
  }
  return <Ionicons name={def.ion} size={size * 0.95} color={color} style={style as never} />;
}
