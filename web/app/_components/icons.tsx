/**
 * The app's icon vocabulary, drawn by Lucide.
 *
 * These used to be 29 hand-drawn inline SVGs. Lucide is the same 24×24 grid
 * with the same currentColor + stroke-width contract, so nothing about how
 * icons are used had to change — `<Icon name="flame" size={18} />` still works
 * everywhere, and the whole set now reads as one family instead of 29
 * individual drawings.
 *
 * `IconName` stays our own vocabulary rather than Lucide's: call sites say what
 * an icon *means* here ("pulse" for heart-rate work, "run" for a session), so
 * swapping the underlying drawing is a one-line change in the map below.
 *
 * Brand marks are deliberately NOT here. SphereMark (LoginStep) and TierMedal
 * (MemberApp) are identity, not iconography, and stay hand-drawn.
 */
import type { SVGProps } from 'react';
import {
  Activity,
  ArrowDown,
  ArrowUp,
  BarChart3,
  Bell,
  Brain,
  Check,
  ChevronLeft,
  Dumbbell,
  Flag,
  Flame,
  Footprints,
  Gift,
  Heart,
  Info,
  Lock,
  MapPin,
  Orbit,
  PersonStanding,
  Play,
  Plus,
  RefreshCw,
  Sparkles,
  Target,
  TrendingUp,
  Trophy,
  Users,
  X,
  Zap,
  type LucideIcon,
} from 'lucide-react';

export type IconName =
  | 'flame'
  | 'dumbbell'
  | 'pulse'
  | 'mobility'
  | 'heart'
  | 'zap'
  | 'flag'
  | 'brain'
  | 'chevron-left'
  | 'check'
  | 'plus'
  | 'close'
  | 'info'
  | 'trend'
  | 'run'
  | 'bell'
  | 'gift'
  | 'lock'
  | 'trophy'
  | 'target'
  | 'pin'
  | 'arrow-up'
  | 'arrow-down'
  | 'refresh'
  | 'play'
  | 'users'
  | 'sparkle'
  | 'orbit'
  | 'bar-chart';

const ICONS: Record<IconName, LucideIcon> = {
  flame: Flame,
  dumbbell: Dumbbell,
  // Heart-rate and cardio work, so the ECG trace rather than a heart shape:
  // "heart" is its own icon and means recovery.
  pulse: Activity,
  mobility: PersonStanding,
  heart: Heart,
  zap: Zap,
  flag: Flag,
  brain: Brain,
  'chevron-left': ChevronLeft,
  check: Check,
  plus: Plus,
  close: X,
  info: Info,
  trend: TrendingUp,
  run: Footprints,
  bell: Bell,
  gift: Gift,
  lock: Lock,
  trophy: Trophy,
  target: Target,
  pin: MapPin,
  'arrow-up': ArrowUp,
  'arrow-down': ArrowDown,
  refresh: RefreshCw,
  play: Play,
  users: Users,
  sparkle: Sparkles,
  orbit: Orbit,
  'bar-chart': BarChart3,
};

/**
 * Icons are decorative next to a text label, so they stay out of the
 * accessibility tree unless a caller passes its own aria attributes.
 */
export function Icon({
  name,
  size = 24,
  ...props
}: { name: IconName; size?: number } & SVGProps<SVGSVGElement>) {
  const Glyph = ICONS[name];
  return <Glyph width={size} height={size} strokeWidth={1.75} aria-hidden="true" {...props} />;
}
