import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ScheduleBlock, ScheduleCategory } from '../../types';
import { Button } from '../common/Button';
import {
  X,
  Clock,
  Code2,
  Users,
  Navigation,
  Coffee,
  Sparkles,
  MapPin,
  FileText,
  AlertCircle,
} from 'lucide-react';

export interface BlockEditorModalProps {
  isOpen: boolean;
  initialBlock?: ScheduleBlock | null;
  onClose: () => void;
  onSave: (blockData: {
    time: string;
    activity: string;
    category: ScheduleCategory;
    location?: string;
    context?: string;
    completed?: boolean;
  }) => void;
}

export const BlockEditorModal: React.FC<BlockEditorModalProps> = ({
  isOpen,
  initialBlock,
  onClose,
  onSave,
}) => {
  const [time, setTime] = useState('');
  const [activity, setActivity] = useState('');
  const [category, setCategory] = useState<ScheduleCategory>('deep_work');
  const [location, setLocation] = useState('');
  const [context, setContext] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialBlock) {
      setTime(initialBlock.time || '');
      setActivity(initialBlock.activity || '');
      setCategory(initialBlock.category || 'deep_work');
      setLocation(initialBlock.location || '');
      setContext(initialBlock.context || '');
    } else {
      setTime('14:00 - 15:30');
      setActivity('');
      setCategory('deep_work');
      setLocation('');
      setContext('');
    }
    setError(null);
  }, [initialBlock, isOpen]);

  // Handle ESC key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activity.trim()) {
      setError('Please provide an activity title.');
      return;
    }
    if (!time.trim()) {
      setError('Please specify a time range (e.g. 09:00 - 10:30).');
      return;
    }

    onSave({
      time: time.trim(),
      activity: activity.trim(),
      category,
      location: location.trim() || undefined,
      context: context.trim() || undefined,
      completed: initialBlock ? initialBlock.completed : false,
    });
    onClose();
  };

  const categories: { key: ScheduleCategory; label: string; icon: React.ReactNode; color: string }[] = [
    { key: 'deep_work', label: 'Deep Work', icon: <Code2 className="w-4 h-4" />, color: 'border-indigo-500/40 text-indigo-400 bg-indigo-500/10' },
    { key: 'meeting', label: 'Meeting', icon: <Users className="w-4 h-4" />, color: 'border-amber-500/40 text-amber-400 bg-amber-500/10' },
    { key: 'commute', label: 'Commute', icon: <Navigation className="w-4 h-4" />, color: 'border-cyan-500/40 text-cyan-400 bg-cyan-500/10' },
    { key: 'break', label: 'Break & Outdoor', icon: <Coffee className="w-4 h-4" />, color: 'border-emerald-500/40 text-emerald-400 bg-emerald-500/10' },
    { key: 'general', label: 'General', icon: <Clock className="w-4 h-4" />, color: 'border-gray-500/40 text-gray-400 bg-gray-500/10' },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop Blur Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/75 backdrop-blur-sm"
          />

          {/* Modal Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
            className="relative w-full max-w-lg rounded-2xl bg-surface-elevated border border-hairline-strong shadow-2xl p-6 overflow-hidden z-10"
          >
            {/* Ambient Corner Glow */}
            <div className="absolute -top-16 -right-16 w-36 h-36 rounded-full bg-indigo-500/10 blur-2xl pointer-events-none" />

            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-hairline pb-4 mb-5">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-indigo-500/15 border border-indigo-500/30 text-indigo-400">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h3 id="modal-title" className="text-base font-semibold text-white tracking-tight">
                    {initialBlock ? 'Edit Schedule Block' : 'Add Custom Focus Block'}
                  </h3>
                  <p className="text-xs text-gray-400">
                    {initialBlock ? 'Update activity time, category, or notes' : 'Insert a bespoke slot into your daily timeline'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close dialog"
                className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Validation Alert */}
            {error && (
              <div className="mb-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Category Selector Chips */}
              <div>
                <label className="text-xs font-mono uppercase tracking-wider text-gray-300 block mb-2">
                  Category Type
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {categories.map((cat) => (
                    <button
                      key={cat.key}
                      type="button"
                      onClick={() => setCategory(cat.key)}
                      className={`p-2 rounded-lg border text-xs flex items-center gap-2 transition-all cursor-pointer ${
                        category === cat.key
                          ? `${cat.color} font-semibold ring-1 ring-indigo-500/30 shadow-sm`
                          : 'bg-surface-card border-hairline text-gray-400 hover:bg-surface-active hover:text-gray-200'
                      }`}
                    >
                      {cat.icon}
                      <span className="truncate">{cat.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Time Range */}
              <div>
                <label className="text-xs font-mono uppercase tracking-wider text-gray-300 block mb-1.5">
                  Time Slot Range
                </label>
                <div className="relative">
                  <Clock className="w-4 h-4 absolute left-3 top-2.5 text-gray-400 pointer-events-none" />
                  <input
                    type="text"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    placeholder="e.g. 10:00 - 11:30 or 14:00"
                    className="w-full text-xs font-mono bg-surface-card border border-hairline rounded-lg pl-9 pr-3 py-2 text-gray-100 placeholder-gray-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/40 tabular-nums"
                  />
                </div>
              </div>

              {/* Activity Description */}
              <div>
                <label className="text-xs font-mono uppercase tracking-wider text-gray-300 block mb-1.5">
                  Activity Title <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  value={activity}
                  onChange={(e) => {
                    setActivity(e.target.value);
                    if (error) setError(null);
                  }}
                  placeholder="e.g. Core Algorithm Refactor & PR Reviews"
                  className="w-full text-xs bg-surface-card border border-hairline rounded-lg px-3 py-2 text-gray-100 placeholder-gray-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/40"
                  autoFocus
                />
              </div>

              {/* Location & Context */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-mono uppercase tracking-wider text-gray-300 block mb-1.5">
                    Location (Optional)
                  </label>
                  <div className="relative">
                    <MapPin className="w-4 h-4 absolute left-3 top-2.5 text-gray-400 pointer-events-none" />
                    <input
                      type="text"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      placeholder="e.g. Office Desk / Remote"
                      className="w-full text-xs bg-surface-card border border-hairline rounded-lg pl-9 pr-3 py-2 text-gray-100 placeholder-gray-500 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-mono uppercase tracking-wider text-gray-300 block mb-1.5">
                    Context / Notes
                  </label>
                  <div className="relative">
                    <FileText className="w-4 h-4 absolute left-3 top-2.5 text-gray-400 pointer-events-none" />
                    <input
                      type="text"
                      value={context}
                      onChange={(e) => setContext(e.target.value)}
                      placeholder="e.g. Sprint blocker"
                      className="w-full text-xs bg-surface-card border border-hairline rounded-lg pl-9 pr-3 py-2 text-gray-100 placeholder-gray-500 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-hairline flex items-center justify-end gap-2.5">
                <Button type="button" variant="ghost" size="sm" onClick={onClose}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary" size="sm">
                  {initialBlock ? 'Update Block' : 'Add to Schedule'}
                </Button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
