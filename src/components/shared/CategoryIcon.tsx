import {
  BarChart3,
  BookOpen,
  Briefcase,
  Calculator,
  Compass,
  Cpu,
  FileText,
  Globe,
  GraduationCap,
  Laptop,
  Landmark,
  Library,
  MessageSquare,
  Microscope,
  Scale,
} from 'lucide-react';

const ICON_MAP = {
  BookOpen,
  Briefcase,
  Laptop,
  Calculator,
  Scale,
  BarChart3,
  MessageSquare,
  Microscope,
  GraduationCap,
  Landmark,
  FileText,
  Globe,
  Cpu,
  Compass,
  Library,
} as const;

export type CategoryIconName = keyof typeof ICON_MAP;

export const AVAILABLE_CATEGORY_ICONS: CategoryIconName[] = Object.keys(
  ICON_MAP
) as CategoryIconName[];

export function CategoryIcon({
  name,
  className = 'w-5 h-5',
}: {
  name?: string | null;
  className?: string;
}) {
  const IconComponent =
    (name && ICON_MAP[name as CategoryIconName]) || BookOpen;
  return <IconComponent className={className} />;
}

