import * as React from 'react'
import { Search, X, Filter, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { cn } from '@/lib/utils'

export interface FilterOption {
  value: string
  label: string
  icon?: React.ReactNode
  color?: string
}

export interface FilterConfig {
  id: string
  type: 'select' | 'checkbox' | 'date'
  label: string
  placeholder?: string
  options?: FilterOption[]
  value: string | boolean
  onChange: (value: string | boolean) => void
  allLabel?: string
  width?: string
}

interface FilterBarProps {
  search?: string
  onSearchChange?: (value: string) => void
  searchPlaceholder?: string
  filters: FilterConfig[]
  onClearAll?: () => void
  className?: string
  rightContent?: React.ReactNode
  compact?: boolean
}

export function FilterBar({
  search,
  onSearchChange,
  searchPlaceholder = 'Rechercher...',
  filters,
  onClearAll,
  className,
  rightContent,
  compact = false,
}: FilterBarProps) {
  const [isOpen, setIsOpen] = React.useState(false)

  // Count active filters
  const activeFilters = filters.filter((f) => {
    if (f.type === 'checkbox') return f.value === true
    if (f.type === 'date') return f.value && f.value !== ''
    return f.value && f.value !== 'all' && f.value !== ''
  })

  const hasActiveFilters = activeFilters.length > 0 || (search && search.length > 0)

  // Get active filter labels for display
  const getActiveFilterLabels = () => {
    return activeFilters.map((f) => {
      if (f.type === 'checkbox') {
        return { id: f.id, label: f.label }
      }
      if (f.type === 'date') {
        const dateValue = f.value as string
        const formattedDate = dateValue ? new Date(dateValue).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }) : ''
        return { id: f.id, label: `${f.label}: ${formattedDate}` }
      }
      const option = f.options?.find((o) => o.value === f.value)
      return { id: f.id, label: option?.label || String(f.value) }
    })
  }

  const removeFilter = (filterId: string) => {
    const filter = filters.find((f) => f.id === filterId)
    if (filter) {
      if (filter.type === 'checkbox') {
        filter.onChange(false)
      } else if (filter.type === 'date') {
        filter.onChange('')
      } else {
        filter.onChange('all')
      }
    }
  }

  const activeLabels = getActiveFilterLabels()

  return (
    <div
      className={cn(
        'rounded-xl border bg-gradient-to-b from-card to-card/80 shadow-sm',
        className
      )}
    >
      <div className="p-3 sm:p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          {/* Search and Filters */}
          <div className="flex flex-col sm:flex-row flex-1 gap-3 items-start sm:items-center">
            {/* Search */}
            {onSearchChange && (
              <div className="relative w-full sm:w-auto sm:min-w-[200px] sm:max-w-sm flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                <Input
                  placeholder={searchPlaceholder}
                  value={search}
                  onChange={(e) => onSearchChange(e.target.value)}
                  className="pl-9 h-10 bg-background/60 border-muted-foreground/20 focus:bg-background transition-colors"
                />
                {search && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 text-muted-foreground hover:text-foreground"
                    onClick={() => onSearchChange('')}
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            )}

            {/* Desktop Filters */}
            <div className="hidden lg:flex flex-wrap items-center gap-2">
              {filters.map((filter) => (
                <FilterItem key={filter.id} filter={filter} compact={compact} />
              ))}

              {/* Clear All Button */}
              {hasActiveFilters && onClearAll && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onClearAll}
                  className="h-9 px-2.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                >
                  <X className="h-4 w-4 mr-1" />
                  Effacer
                </Button>
              )}
            </div>

            {/* Mobile Filter Toggle */}
            <div className="lg:hidden w-full">
              <Collapsible open={isOpen} onOpenChange={setIsOpen}>
                <div className="flex items-center gap-2">
                  <CollapsibleTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className={cn(
                        'h-9 gap-2 bg-background/60',
                        activeFilters.length > 0 && 'border-primary/50'
                      )}
                    >
                      <Filter className="h-4 w-4" />
                      Filtres
                      {activeFilters.length > 0 && (
                        <Badge
                          variant="secondary"
                          className="h-5 w-5 p-0 flex items-center justify-center text-[10px] bg-primary text-primary-foreground"
                        >
                          {activeFilters.length}
                        </Badge>
                      )}
                      <ChevronDown
                        className={cn(
                          'h-4 w-4 transition-transform',
                          isOpen && 'rotate-180'
                        )}
                      />
                    </Button>
                  </CollapsibleTrigger>

                  {hasActiveFilters && onClearAll && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={onClearAll}
                      className="h-9 px-2 text-muted-foreground hover:text-destructive"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>

                <CollapsibleContent className="pt-3">
                  <div className="flex flex-wrap gap-2">
                    {filters.map((filter) => (
                      <FilterItem key={filter.id} filter={filter} compact={compact} />
                    ))}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </div>
          </div>

          {/* Right Content (view toggles, etc.) */}
          {rightContent && (
            <div className="flex items-center gap-2">{rightContent}</div>
          )}
        </div>

        {/* Active Filters Pills - Desktop */}
        {activeLabels.length > 0 && (
          <div className="hidden lg:flex flex-wrap gap-1.5 mt-3 pt-3 border-t border-dashed">
            <span className="text-xs text-muted-foreground mr-1 self-center">
              Filtres actifs:
            </span>
            {activeLabels.map((item) => (
              <Badge
                key={item.id}
                variant="secondary"
                className="h-6 gap-1 pr-1 bg-primary/10 text-primary hover:bg-primary/20 cursor-pointer transition-colors"
                onClick={() => removeFilter(item.id)}
              >
                {item.label}
                <X className="h-3 w-3" />
              </Badge>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

interface FilterItemProps {
  filter: FilterConfig
  compact?: boolean
}

function FilterItem({ filter, compact }: FilterItemProps) {
  if (filter.type === 'checkbox') {
    return (
      <div className="flex items-center gap-2 h-9 px-3 rounded-md border bg-background/60 border-muted-foreground/20">
        <Checkbox
          id={filter.id}
          checked={filter.value as boolean}
          onCheckedChange={(checked) => filter.onChange(checked as boolean)}
        />
        <Label
          htmlFor={filter.id}
          className="font-normal text-sm cursor-pointer whitespace-nowrap"
        >
          {filter.label}
        </Label>
      </div>
    )
  }

  if (filter.type === 'date') {
    const isActive = filter.value && filter.value !== ''
    return (
      <div className="relative">
        <Input
          type="date"
          value={filter.value as string || ''}
          onChange={(e) => filter.onChange(e.target.value)}
          placeholder={filter.placeholder || filter.label}
          className={cn(
            'h-9 text-sm bg-background/60 border-muted-foreground/20 focus:bg-background transition-colors',
            filter.width || 'w-[140px]',
            compact && 'w-[120px]',
            isActive && 'border-primary/50 bg-primary/5'
          )}
        />
        {!filter.value && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground pointer-events-none">
            {filter.label}
          </span>
        )}
      </div>
    )
  }

  const isActive = filter.value && filter.value !== 'all' && filter.value !== ''

  return (
    <Select
      value={filter.value as string || 'all'}
      onValueChange={(v) => filter.onChange(v === 'all' ? '' : v)}
    >
      <SelectTrigger
        className={cn(
          'h-9 text-sm bg-background/60 border-muted-foreground/20 focus:bg-background transition-colors',
          filter.width || 'w-[150px]',
          compact && 'w-[130px]',
          isActive && 'border-primary/50 bg-primary/5'
        )}
      >
        <SelectValue placeholder={filter.placeholder || filter.label} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">{filter.allLabel || `Tous`}</SelectItem>
        {filter.options?.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            <div className="flex items-center gap-2">
              {option.color && (
                <div
                  className="h-2.5 w-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: option.color }}
                />
              )}
              {option.icon}
              <span>{option.label}</span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
