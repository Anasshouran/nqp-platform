import LuggageIcon from '@mui/icons-material/Luggage';
import AssignmentIcon from '@mui/icons-material/Assignment';
import FlightTakeoffIcon from '@mui/icons-material/FlightTakeoff';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import MedicalServicesIcon from '@mui/icons-material/MedicalServices';
import QrCode2Icon from '@mui/icons-material/QrCode2';
import SearchIcon from '@mui/icons-material/Search';
import EditIcon from '@mui/icons-material/Edit';
import InventoryIcon from '@mui/icons-material/Inventory';
import SendIcon from '@mui/icons-material/Send';
import FactCheckIcon from '@mui/icons-material/FactCheck';
import ScienceIcon from '@mui/icons-material/Science';
import BiotechIcon from '@mui/icons-material/Biotech';
import BadgeIcon from '@mui/icons-material/Badge';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import TaskAltIcon from '@mui/icons-material/TaskAlt';
import FlightIcon from '@mui/icons-material/Flight';
import GroupsIcon from '@mui/icons-material/Groups';
import SyncIcon from '@mui/icons-material/Sync';
import CodeIcon from '@mui/icons-material/Code';
import DirectionsBoatIcon from '@mui/icons-material/DirectionsBoat';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import InfoIcon from '@mui/icons-material/Info';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import PublicIcon from '@mui/icons-material/Public';
import NotificationsIcon from '@mui/icons-material/Notifications';
import EventIcon from '@mui/icons-material/Event';
import CoronavirusIcon from '@mui/icons-material/Coronavirus';
import AssessmentIcon from '@mui/icons-material/Assessment';
import PendingActionsIcon from '@mui/icons-material/PendingActions';
import ResultIcon from '@mui/icons-material/FactCheck';
import ReportIcon from '@mui/icons-material/Report';
import VerifiedIcon from '@mui/icons-material/Verified';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import BarChartIcon from '@mui/icons-material/BarChart';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import AppsIcon from '@mui/icons-material/Apps';
import TaskIcon from '@mui/icons-material/Task';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import HealthAndSafetyIcon from '@mui/icons-material/HealthAndSafety';

export type IconComponent = typeof AppsIcon;

const map: Record<string, IconComponent> = {
  luggage: LuggageIcon,
  assignment: AssignmentIcon,
  flight_takeoff: FlightTakeoffIcon,
  upload_file: UploadFileIcon,
  medical: MedicalServicesIcon,
  qr_code: QrCode2Icon,
  search: SearchIcon,
  edit: EditIcon,
  inventory: InventoryIcon,
  send: SendIcon,
  fact_check: FactCheckIcon,
  science: ScienceIcon,
  biotech: BiotechIcon,
  badge: BadgeIcon,
  account_balance: AccountBalanceWalletIcon,
  task_alt: TaskAltIcon,
  flight: FlightIcon,
  groups: GroupsIcon,
  sync: SyncIcon,
  code: CodeIcon,
  directions_boat: DirectionsBoatIcon,
  local_shipping: LocalShippingIcon,
  info: InfoIcon,
  menu_book: MenuBookIcon,
  warning: WarningAmberIcon,
  public: PublicIcon,
  notifications: NotificationsIcon,
  event: EventIcon,
  coronavirus: CoronavirusIcon,
  assessment: AssessmentIcon,
  pending_actions: PendingActionsIcon,
  result: ResultIcon,
  report: ReportIcon,
  verified: VerifiedIcon,
  swap: SwapHorizIcon,
  bar_chart: BarChartIcon,
  smart_toy: SmartToyIcon,
  apps: AppsIcon,
  account: AccountCircleIcon,
  health: HealthAndSafetyIcon,
  food: BiotechIcon,
  lab: ScienceIcon,
  monitor: AssessmentIcon,
  insect: CoronavirusIcon,
};

export const iconFor = (key?: string): IconComponent => (key && map[key] ? map[key] : TaskIcon);
