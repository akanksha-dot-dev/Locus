import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ScheduleBlock, ScheduleCategory } from '../../types';
import { CATEGORY_CONFIG, cn } from '../../constants/theme';
import {
  Check,
  ChevronUp,
  ChevronDown,
  Pencil,
  MapPin,
  FileText,
  Save,
  X,
  Code2,
  Users,
  Navigation,
  Coffee,
  Clock,
  Sparkles,
  Trash2,
} from 'lucide-react';

export interface TimelineBlockProps {
  block: ScheduleBlock;
  index: number;
  totalBlocks: number;
  onToggleComplete: (id: string) => void;
  onUpdate: (id: string, updates: Partial<ScheduleBlock>) => void;
  onReorder: (sourceIndex: number, destIndex: number) => void;
  onEditModal?: (block: ScheduleBlock) => void;
  onDelete?: (id: string) => void;
}

export const TimelineBlock: React.FC<TimelineBlockProps> = ({
  block,
  index,
  totalBlocks,
  onToggleComplete,
  onUpdate,
  onReorder,
  onEditModal,
  onDelete,
}) => {
  const [isInlineEditing, setIsInlineEditing] = useState(false);
  const [editTime, setEditTime] = useState(block.time);
  const [editActivity, setEditActivity] = useState(block.activity);
  const [editLocation, setEditLocation] = useState(block.location || '');
  const [editContext, setEditContext] = useState(block.context || '');
  const [editCategory, setEditCategory] = useState<ScheduleCategory>(block.category);

  const categoryCfg = CATEGORY_CONFIG[block.category] || CATEGORY_CONFIG.general;

  const handleSaveInline = () => {
    if (!editActivity.trim()) return;
    onUpdate(block.id, {
      time: editTime.trim() || block.time,
      activity: editActivity.trim(),
      location: editLocation.trim() || undefined,
      context: editContext.trim() || undefined,
      category: editCategory,
    });
    setIsInlineEditing(false);
  };

  const handleCancelInline = () => {
    setEditTime(block.time);
    setEditActivity(block.activity);
    setEditLocation(block.location || '');
    setEditContext(block.context || '');
    setEditCategory(block.category);
    setIsInlineEditing(false);
  };

  const renderCategoryIcon = (category: ScheduleCategory) => {
    const iconClass = 'w-3.5 h-3.5';
    switch (category) {
      case 'deep_work':
        return <Code2 className={iconClass} />;
      case 'meeting':
        return <Users className={iconClass} />;
      case 'commute':
        return <Navigation className={iconClass} />;
      case 'break':
        return <Coffee className={iconClass} />;
      default:
        return <Clock className={iconClass} />;
    }
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      className={cn(
        'group relative rounded-xl border transition-all duration-200 overflow-hidden shadow-xs',
        block.completed
          ? 'bg-surface-elevated/40 border-hairline/60 opacity-65'
          : 'bg-surface-elevated/70 border-hairline hover:border-hairline-hover hover:bg-surface-active'
      )}
    >
      <div className="p-3.5 sm:p-4">
        {isInlineEditing ? (
          /* Inline Editing Form */
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-hairline pb-2">
              <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5 font-mono">
                <Pencil className="w-3.5 h-3.5" /> Inline Block Editor
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleSaveInline}
                  className="px-2.5 py-1 text-xs rounded-md bg-indigo-600 hover:bg-indigo-500 text-white flex items-center gap-1 cursor-pointer font-medium"
                >
                  <Save className="w-3 h-3" /> Save
                </button>
                <button
                  type="button"
                  onClick={handleCancelInline}
                  className="px-2 py-1 text-xs rounded-md bg-surface-card hover:bg-surface-active text-slate-600 dark:text-gray-400 hover:text-slate-900 dark:hover:text-gray-200 border border-hairline flex items-center gap-1 cursor-pointer"
                >
                  <X className="w-3 h-3" /> Cancel
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div>
                <label className="text-[10px] uppercase font-mono text-slate-500 dark:text-gray-400 block mb-1">Time Slot</label>
                <input
                  type="text"
                  value={editTime}
                  onChange={(e) => setEditTime(e.target.value)}
                  placeholder="e.g. 09:00 - 10:30"
                  className="w-full text-xs font-mono bg-surface-card border border-hairline rounded-md px-2.5 py-1.5 text-slate-800 dark:text-gray-200 focus:outline-none focus:border-indigo-500 tabular-nums shadow-inner"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="text-[10px] uppercase font-mono text-slate-500 dark:text-gray-400 block mb-1">Category</label>
                <select
                  value={editCategory}
                  onChange={(e) => setEditCategory(e.target.value as ScheduleCategory)}
                  className="w-full text-xs bg-surface-card border border-hairline rounded-md px-2 py-1.5 text-slate-800 dark:text-gray-200 focus:outline-none focus:border-indigo-500 shadow-inner"
                >
                  <option value="deep_work">Deep Work</option>
                  <option value="meeting">Meeting</option>
                  <option value="commute">Commute</option>
                  <option value="break">Break & Outdoor</option>
                  <option value="general">General</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-[10px] uppercase font-mono text-slate-500 dark:text-gray-400 block mb-1">Activity Title</label>
              <input
                type="text"
                value={editActivity}
                onChange={(e) => setEditActivity(e.target.value)}
                placeholder="Activity description"
                className="w-full text-xs bg-surface-card border border-hairline rounded-md px-2.5 py-1.5 text-slate-800 dark:text-gray-200 focus:outline-none focus:border-indigo-500 shadow-inner"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] uppercase font-mono text-slate-500 dark:text-gray-400 block mb-1">Location</label>
                <input
                  type="text"
                  value={editLocation}
                  onChange={(e) => setEditLocation(e.target.value)}
                  placeholder="e.g. Office Desk, Home, Flight"
                  className="w-full text-xs bg-surface-card border border-hairline rounded-md px-2.5 py-1.5 text-slate-800 dark:text-gray-200 focus:outline-none focus:border-indigo-500 shadow-inner"
                />
              </div>
              <div>
                <label className="text-[10px] uppercase font-mono text-slate-500 dark:text-gray-400 block mb-1">Context / Notes</label>
                <input
                  type="text"
                  value={editContext}
                  onChange={(e) => setEditContext(e.target.value)}
                  placeholder="Contextual details"
                  className="w-full text-xs bg-surface-card border border-hairline rounded-md px-2.5 py-1.5 text-slate-800 dark:text-gray-200 focus:outline-none focus:border-indigo-500 shadow-inner"
                />
              </div>
            </div>
          </div>
        ) : (
          /* Normal Display View */
          <div className="flex items-start gap-3">
            {/* Interactive Checkbox */}
            <button
              type="button"
              onClick={() => onToggleComplete(block.id)}
              aria-label={block.completed ? 'Mark task incomplete' : 'Mark task complete'}
              className={cn(
                'mt-0.5 w-5 h-5 rounded-md border flex items-center justify-center transition-all cursor-pointer flex-shrink-0',
                block.completed
                  ? 'bg-emerald-500 border-emerald-400 text-white shadow-xs'
                  : 'bg-surface-card border-hairline hover:border-hairline-hover text-transparent hover:text-slate-400 dark:hover:text-gray-500'
              )}
            >
              <Check className="w-3.5 h-3.5 stroke-[3]" />
            </button>

            {/* Block Body */}
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-1.5">
                {/* Time Badge with Tabular Numbers */}
                <span className="text-xs font-mono font-semibold text-slate-800 dark:text-gray-200 tracking-tight tabular-nums flex items-center gap-1">
                  <Clock className="w-3 h-3 text-slate-400 dark:text-gray-400" />
                  {block.time}
                </span>

                {/* Category Pill */}
                <span
                  className={cn(
                    'inline-flex items-center gap-1 text-[11px] px-2.5 py-0.5 rounded-full border font-medium select-none shadow-2xs',
                    categoryCfg.badgeClass
                  )}
                >
                  {renderCategoryIcon(block.category)}
                  {categoryCfg.label}
                </span>

                {/* Optional Location Chip */}
                {block.location && (
                  <span className="inline-flex items-center gap-1 text-[11px] text-slate-600 dark:text-gray-400 font-mono bg-surface-card px-2 py-0.5 rounded border border-hairline">
                    <MapPin className="w-3 h-3 text-slate-400 dark:text-gray-500" />
                    {block.location}
                  </span>
                )}
              </div>

              {/* Activity Title with Reactive Strikethrough */}
              <p
                className={cn(
                  'text-sm font-medium transition-colors leading-relaxed',
                  block.completed
                    ? 'line-through text-slate-400 dark:text-gray-500'
                    : 'text-slate-900 dark:text-gray-100 group-hover:text-indigo-600 dark:group-hover:text-white'
                )}
              >
                {block.activity}
              </p>

              {/* Context / Notes */}
              {block.context && (
                <p className="text-xs text-slate-500 dark:text-gray-400 mt-1 flex items-start gap-1.5 leading-normal">
                  <FileText className="w-3 h-3 text-slate-400 dark:text-gray-500 mt-0.5 flex-shrink-0" />
                  <span>{block.context}</span>
                </p>
              )}
            </div>

            {/* Action & Reordering Controls */}
            <div className="flex items-center gap-1 flex-shrink-0 opacity-80 group-hover:opacity-100 transition-opacity">
              {/* Up Button */}
              <button
                type="button"
                disabled={index === 0}
                onClick={() => onReorder(index, index - 1)}
                title="Move earlier"
                aria-label="Move block up"
                className="p-1.5 rounded bg-surface-card hover:bg-surface-active text-slate-500 dark:text-gray-400 hover:text-slate-900 dark:hover:text-gray-200 border border-hairline disabled:opacity-30 disabled:pointer-events-none cursor-pointer transition-colors shadow-2xs"
              >
                <ChevronUp className="w-3.5 h-3.5" />
              </button>

              {/* Down Button */}
              <button
                type="button"
                disabled={index === totalBlocks - 1}
                onClick={() => onReorder(index, index + 1)}
                title="Move later"
                aria-label="Move block down"
                className="p-1.5 rounded bg-surface-card hover:bg-surface-active text-slate-500 dark:text-gray-400 hover:text-slate-900 dark:hover:text-gray-200 border border-hairline disabled:opacity-30 disabled:pointer-events-none cursor-pointer transition-colors shadow-2xs"
              >
                <ChevronDown className="w-3.5 h-3.5" />
              </button>

              {/* Quick Inline Edit Toggle */}
              <button
                type="button"
                onClick={() => setIsInlineEditing(true)}
                title="Quick inline edit"
                aria-label="Edit block inline"
                className="p-1.5 rounded bg-surface-card hover:bg-surface-active text-slate-500 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-300 border border-hairline cursor-pointer transition-colors shadow-2xs"
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>

              {/* Full Modal Edit Button */}
              {onEditModal && (
                <button
                  type="button"
                  onClick={() => onEditModal(block)}
                  title="Full modal editor"
                  aria-label="Open modal editor"
                  className="p-1.5 rounded bg-surface-card hover:bg-surface-active text-slate-500 dark:text-gray-400 hover:text-cyan-600 dark:hover:text-cyan-300 border border-hairline cursor-pointer transition-colors hidden sm:inline-flex shadow-2xs"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                </button>
              )}

              {/* Delete Button (if custom block) */}
              {onDelete && (
                <button
                  type="button"
                  onClick={() => onDelete(block.id)}
                  title="Delete block"
                  aria-label="Delete block"
                  className="p-1.5 rounded bg-surface-card hover:bg-rose-500/10 text-slate-500 dark:text-gray-400 hover:text-rose-600 dark:hover:text-rose-400 border border-hairline cursor-pointer transition-colors shadow-2xs"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
};
