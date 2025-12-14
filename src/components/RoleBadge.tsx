import { Badge } from '@/components/ui/badge';
import { Shield, Gavel, User } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

type RoleType = 'organizer' | 'judge' | 'participant' | 'member';

interface RoleBadgeProps {
  role: RoleType;
  size?: 'sm' | 'md' | 'lg';
  showTooltip?: boolean;
  className?: string;
}

const roleConfig: Record<RoleType, { 
  icon: typeof Shield; 
  label: string; 
  shortLabel: string;
  color: string;
  tooltip: string;
}> = {
  organizer: {
    icon: Shield,
    label: 'Organizer Mode',
    shortLabel: 'ORG',
    color: 'bg-orange-500/10 text-orange-600 border-orange-500/30 hover:bg-orange-500/20',
    tooltip: 'Can comment and moderate rooms, but cannot change team work.'
  },
  judge: {
    icon: Gavel,
    label: 'Judge View',
    shortLabel: 'JUDGE',
    color: 'bg-purple-500/10 text-purple-600 border-purple-500/30 hover:bg-purple-500/20',
    tooltip: 'Can review and score submissions, but cannot edit team work.'
  },
  participant: {
    icon: User,
    label: 'Participant',
    shortLabel: 'PARTICIPANT',
    color: 'bg-primary/10 text-primary border-primary/30',
    tooltip: 'Full access to edit and collaborate.'
  },
  member: {
    icon: User,
    label: 'Member',
    shortLabel: 'MEMBER',
    color: 'bg-primary/10 text-primary border-primary/30',
    tooltip: 'Full access to edit and collaborate.'
  }
};

const RoleBadge = ({ role, size = 'md', showTooltip = true, className = '' }: RoleBadgeProps) => {
  const config = roleConfig[role];
  const Icon = config.icon;

  const sizeClasses = {
    sm: 'text-xs px-1.5 py-0.5',
    md: 'text-xs px-2 py-1',
    lg: 'text-sm px-3 py-1.5'
  };

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-3.5 h-3.5',
    lg: 'w-4 h-4'
  };

  const badge = (
    <Badge 
      variant="outline" 
      className={`gap-1 font-medium ${config.color} ${sizeClasses[size]} ${className}`}
    >
      <Icon className={iconSizes[size]} />
      {size === 'sm' ? config.shortLabel : config.label}
    </Badge>
  );

  if (!showTooltip) return badge;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        {badge}
      </TooltipTrigger>
      <TooltipContent>
        <p className="max-w-xs">{config.tooltip}</p>
      </TooltipContent>
    </Tooltip>
  );
};

export default RoleBadge;
