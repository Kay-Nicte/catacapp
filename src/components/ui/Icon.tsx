import React from "react";
import {
  X,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  Check,
  Pencil,
  Plus,
  PawPrint,
  Calendar,
  Home,
  List,
  Stethoscope,
  ShieldCheck,
  Settings,
  Gem,
  User,
  Mail,
  Lock,
  Utensils,
  Droplet,
  Moon,
  Dumbbell,
  Trash2,
  Clock,
  Eye,
  EyeOff,
  ArrowLeft,
  Bell,
  AlertTriangle,
  Palette,
  Smartphone,
  Sun,
  Download,
  FileText,
  LogOut,
  XCircle,
  CheckCircle,
  PauseCircle,
  CircleAlert,
  BarChart3,
  FlaskConical,
  Tv,
  Languages,
  AlarmClock,
  RefreshCw,
  CloudUpload,
  CloudDownload,
  Link,
  LogIn,
  Info,
  Square,
  CheckSquare,
  LucideIcon,
} from "lucide-react-native";

// Icon name mapping from Ionicons to Lucide
const iconMap: Record<string, LucideIcon> = {
  // Close/X
  "close": X,
  "close-outline": X,
  "close-circle": XCircle,
  "close-circle-outline": XCircle,

  // Chevrons
  "chevron-forward": ChevronRight,
  "chevron-forward-outline": ChevronRight,
  "chevron-back": ChevronLeft,
  "chevron-back-outline": ChevronLeft,
  "chevron-down": ChevronDown,
  "chevron-down-outline": ChevronDown,
  "chevron-up": ChevronUp,
  "chevron-up-outline": ChevronUp,

  // Check/Confirm
  "checkmark": Check,
  "checkmark-outline": Check,
  "checkmark-circle": CheckCircle,
  "checkmark-circle-outline": CheckCircle,

  // Edit
  "pencil": Pencil,
  "pencil-outline": Pencil,
  "create": Pencil,
  "create-outline": Pencil,

  // Add
  "add": Plus,
  "add-outline": Plus,
  "add-circle": Plus,
  "add-circle-outline": Plus,

  // Pet/Paw
  "paw": PawPrint,
  "paw-outline": PawPrint,

  // Calendar
  "calendar": Calendar,
  "calendar-outline": Calendar,

  // Home
  "home": Home,
  "home-outline": Home,

  // List
  "list": List,
  "list-outline": List,

  // Medical
  "medkit": Stethoscope,
  "medkit-outline": Stethoscope,

  // Shield/Vaccine
  "shield-checkmark": ShieldCheck,
  "shield-checkmark-outline": ShieldCheck,

  // Settings
  "settings": Settings,
  "settings-outline": Settings,

  // Premium/Diamond
  "diamond": Gem,
  "diamond-outline": Gem,

  // User/Person
  "person": User,
  "person-outline": User,

  // Mail
  "mail": Mail,
  "mail-outline": Mail,

  // Lock
  "lock-closed": Lock,
  "lock-closed-outline": Lock,

  // Food/Restaurant
  "restaurant": Utensils,
  "restaurant-outline": Utensils,

  // Water/Poop
  "water": Droplet,
  "water-outline": Droplet,

  // Sleep/Moon
  "moon": Moon,
  "moon-outline": Moon,

  // Weight/Fitness
  "fitness": Dumbbell,
  "fitness-outline": Dumbbell,

  // Trash/Delete
  "trash": Trash2,
  "trash-outline": Trash2,

  // Time/Clock
  "time": Clock,
  "time-outline": Clock,

  // Eye (visibility)
  "eye": Eye,
  "eye-outline": Eye,
  "eye-off": EyeOff,
  "eye-off-outline": EyeOff,

  // Back arrow
  "arrow-back": ArrowLeft,
  "arrow-back-outline": ArrowLeft,

  // Notifications
  "notifications": Bell,
  "notifications-outline": Bell,

  // Warning
  "warning": AlertTriangle,
  "warning-outline": AlertTriangle,

  // Theme/Palette
  "color-palette": Palette,
  "color-palette-outline": Palette,

  // Phone
  "phone-portrait": Smartphone,
  "phone-portrait-outline": Smartphone,

  // Sun
  "sunny": Sun,
  "sunny-outline": Sun,

  // Download
  "download": Download,
  "download-outline": Download,

  // Document
  "document-text": FileText,
  "document-text-outline": FileText,

  // Logout
  "log-out": LogOut,
  "log-out-outline": LogOut,

  // Pause
  "pause-circle": PauseCircle,
  "pause-circle-outline": PauseCircle,

  // Stats
  "stats-chart": BarChart3,
  "stats-chart-outline": BarChart3,

  // Flask/Test
  "flask": FlaskConical,
  "flask-outline": FlaskConical,

  // TV
  "tv": Tv,
  "tv-outline": Tv,

  // Walk
  "walk": PawPrint,
  "walk-outline": PawPrint,

  // Language
  "language": Languages,
  "language-outline": Languages,

  // Alarm
  "alarm": AlarmClock,
  "alarm-outline": AlarmClock,

  // Refresh
  "refresh": RefreshCw,
  "refresh-outline": RefreshCw,

  // Cloud
  "cloud-upload": CloudUpload,
  "cloud-upload-outline": CloudUpload,
  "cloud-download": CloudDownload,
  "cloud-download-outline": CloudDownload,

  // Link
  "link": Link,
  "link-outline": Link,

  // Enter/Login
  "enter": LogIn,
  "enter-outline": LogIn,

  // Info
  "information-circle": Info,
  "information-circle-outline": Info,

  // Checkbox
  "checkbox": CheckSquare,
  "checkbox-outline": CheckSquare,
  "square-outline": Square,
  "square": Square,
};

interface IconProps {
  name: string;
  size?: number;
  color?: string;
  strokeWidth?: number;
}

export function Icon({ name, size = 24, color = "#000", strokeWidth = 2 }: IconProps) {
  const IconComponent = iconMap[name];

  if (!IconComponent) {
    console.warn(`Icon "${name}" not found in icon map`);
    return null;
  }

  return <IconComponent size={size} color={color} strokeWidth={strokeWidth} />;
}

export default Icon;
