import React, { useState, useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useAgent } from '../../context/AgentContext';
import { ScheduleBlock, ScheduleCategory } from '../../types';
import { Card } from '../common/Card';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';
import { TimelineBlock } from './TimelineBlock';
import { BlockEditorModal } from './BlockEditorModal';
import {
  CalendarDays,
  Plus,
  RotateCcw,
  Sparkles,
  CheckCircle2,
  Filter,
} from 'lucide-react';

export const ScheduleTimeline: React.FC = () => {
  const {
    scheduleBlocks,
    completedCount,
    totalBlocksCount,
    progressPercentage,
    toggleTaskCompletion,
    updateScheduleBlock,
    reorderScheduleBlocks,
    addScheduleBlock,
    resetSchedule,
  } = useAgent();

  const [activeCategoryFilter, setActiveCategoryFilter] = useState<ScheduleCategory | 'all'>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBlock, setEditingBlock] = useState<ScheduleBlock | null>(null);

  // Category counts
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {
      all: scheduleBlocks.length,
      deep_work: 0,
      meeting: 0,
      commute: 0,
      break: 0,
      general: 0,
    };
    scheduleBlocks.forEach((b) => {
      if (counts[b.category] !== undefined) {
        counts[b.category]++;
      } else {
        counts.general++;
      }
    });
    return counts;
  }, [scheduleBlocks]);

  // Filtered blocks based on selected chip
  const filteredBlocks = useMemo(() => {
    if (activeCategoryFilter === 'all') return scheduleBlocks;
    return scheduleBlocks.filter((b) => b.category === activeCategoryFilter);
  }, [scheduleBlocks, activeCategoryFilter]);

  const handleOpenAddModal = () => {
    setEditingBlock(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (block: ScheduleBlock) => {
    setEditingBlock(block);
    setIsModalOpen(true);
  };

  const handleSaveModal = (data: {
    time: string;
    activity: string;
    category: ScheduleCategory;
    location?: string;
    context?: string;
    completed?: boolean;
  }) => {
    if (editingBlock) {
      updateScheduleBlock(editingBlock.id, data);
    } else {
      addScheduleBlock({
        time: data.time,
        activity: data.activity,
        category: data.category,
        location: data.location,
        context: data.context,
        completed: data.completed || false,
      });
    }
  };

  const handleDeleteBlock = (blockId: string) => {
    const idx = scheduleBlocks.findIndex((b) => b.id === blockId);
    if (idx !== -1) {
      reorderScheduleBlocks(idx, scheduleBlocks.length - 1);
    }
  };

  return (
    <Card surface="card" className="p-5 sm:p-6 space-y-5 shadow-lg relative overflow-hidden card-highlight-glow">
      {/* Subtle grid pattern background */}
      <div className="absolute inset-0 bg-grid-subtle opacity-15 pointer-events-none" />

      {/* ── Header: Title, Actions & Live Progress ──────────────────── */}
      <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-hairline pb-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-emerald-500/10 dark:bg-emerald-500/15 border border-emerald-500/25 text-emerald-600 dark:text-emerald-400 shadow-inner">
              <CalendarDays className="w-4 h-4" />
            </div>
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-900 dark:text-white font-mono">
              24-Hour Visual Schedule Timeline
            </h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-gray-400 mt-1 font-sans">
            Hour-by-hour focus blueprint synchronized with AI commute and workload recommendations
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            icon={<RotateCcw className="w-3.5 h-3.5 text-slate-500 dark:text-gray-400" />}
            onClick={resetSchedule}
            title="Reset to raw Gemini AI plan"
            className="text-xs font-mono"
          >
            Reset Plan
          </Button>
          <Button
            variant="primary"
            size="sm"
            icon={<Plus className="w-3.5 h-3.5" />}
            onClick={handleOpenAddModal}
            className="text-xs"
          >
            Add Block
          </Button>
        </div>
      </div>

      {/* ── Interactive Task Completion Progress Bar ────────────────── */}
      <div className="p-3.5 rounded-xl bg-surface-elevated/70 border border-hairline flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center text-emerald-600 dark:text-emerald-400 flex-shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-800 dark:text-gray-200">
                Daily Focus Progress
              </span>
              <Badge variant="emerald" size="sm" className="font-mono tabular-nums text-[10px] py-0 px-1.5">
                {progressPercentage}% DONE
              </Badge>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-gray-400">
              <span className="font-mono text-emerald-600 dark:text-emerald-400 font-semibold tabular-nums">
                {completedCount}
              </span>{' '}
              of{' '}
              <span className="font-mono text-slate-700 dark:text-gray-300 font-semibold tabular-nums">
                {totalBlocksCount}
              </span>{' '}
              scheduled slots completed
            </p>
          </div>
        </div>

        {/* Visual Progress Bar */}
        <div className="w-full sm:w-64 space-y-1">
          <div className="h-2 w-full bg-surface-card rounded-full overflow-hidden border border-hairline">
            <motion.div
              className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${progressPercentage}%` }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
            />
          </div>
          <div className="flex justify-between text-[10px] font-mono text-slate-400 dark:text-gray-500 tabular-nums">
            <span>0%</span>
            <span>50%</span>
            <span>100%</span>
          </div>
        </div>
      </div>

      {/* ── Category Filter Chips ──────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-1.5 pt-1">
        <span className="text-xs font-mono text-slate-500 dark:text-gray-500 mr-1 flex items-center gap-1">
          <Filter className="w-3 h-3" /> Filter:
        </span>

        {/* All */}
        <button
          type="button"
          onClick={() => setActiveCategoryFilter('all')}
          className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-all cursor-pointer ${
            activeCategoryFilter === 'all'
              ? 'bg-slate-900 text-white dark:bg-white/10 dark:text-white border-slate-900 dark:border-white/30 shadow-xs'
              : 'bg-surface-elevated border-hairline text-slate-600 dark:text-gray-400 hover:text-slate-900 dark:hover:text-gray-200 hover:bg-surface-active'
          }`}
        >
          All <span className="text-[10px] font-mono ml-1 opacity-70 tabular-nums">({categoryCounts.all})</span>
        </button>

        {/* Deep Work */}
        <button
          type="button"
          onClick={() => setActiveCategoryFilter('deep_work')}
          className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-all cursor-pointer ${
            activeCategoryFilter === 'deep_work'
              ? 'bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 border-indigo-500/40 shadow-xs'
              : 'bg-surface-elevated border-hairline text-slate-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-300 hover:bg-surface-active'
          }`}
        >
          Deep Work{' '}
          <span className="text-[10px] font-mono ml-1 opacity-70 tabular-nums">({categoryCounts.deep_work})</span>
        </button>

        {/* Meetings */}
        <button
          type="button"
          onClick={() => setActiveCategoryFilter('meeting')}
          className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-all cursor-pointer ${
            activeCategoryFilter === 'meeting'
              ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/40 shadow-xs'
              : 'bg-surface-elevated border-hairline text-slate-600 dark:text-gray-400 hover:text-amber-600 dark:hover:text-amber-300 hover:bg-surface-active'
          }`}
        >
          Meetings{' '}
          <span className="text-[10px] font-mono ml-1 opacity-70 tabular-nums">({categoryCounts.meeting})</span>
        </button>

        {/* Commute */}
        <button
          type="button"
          onClick={() => setActiveCategoryFilter('commute')}
          className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-all cursor-pointer ${
            activeCategoryFilter === 'commute'
              ? 'bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 border-cyan-500/40 shadow-xs'
              : 'bg-surface-elevated border-hairline text-slate-600 dark:text-gray-400 hover:text-cyan-600 dark:hover:text-cyan-300 hover:bg-surface-active'
          }`}
        >
          Commute{' '}
          <span className="text-[10px] font-mono ml-1 opacity-70 tabular-nums">({categoryCounts.commute})</span>
        </button>

        {/* Breaks */}
        <button
          type="button"
          onClick={() => setActiveCategoryFilter('break')}
          className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-all cursor-pointer ${
            activeCategoryFilter === 'break'
              ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/40 shadow-xs'
              : 'bg-surface-elevated border-hairline text-slate-600 dark:text-gray-400 hover:text-emerald-600 dark:hover:text-emerald-300 hover:bg-surface-active'
          }`}
        >
          Breaks & Outdoor{' '}
          <span className="text-[10px] font-mono ml-1 opacity-70 tabular-nums">({categoryCounts.break})</span>
        </button>
      </div>

      {/* ── Chronological Schedule Blocks ──────────────────────────── */}
      <div className="space-y-2.5 min-h-[160px]">
        <AnimatePresence mode="popLayout">
          {filteredBlocks.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="py-10 text-center rounded-xl bg-surface-elevated/40 border border-dashed border-hairline space-y-3"
            >
              <div className="w-10 h-10 rounded-full bg-slate-200/50 dark:bg-white/5 border border-hairline flex items-center justify-center text-slate-400 dark:text-gray-400 mx-auto">
                <Sparkles className="w-5 h-5 text-slate-400 dark:text-gray-500" />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-800 dark:text-gray-300">
                  No schedule blocks matching "{activeCategoryFilter}"
                </p>
                <p className="text-[11px] text-slate-500 dark:text-gray-500 mt-0.5">
                  Try switching filters or add a new custom block to this category.
                </p>
              </div>
              <div className="flex justify-center gap-2 pt-1">
                <Button variant="ghost" size="sm" onClick={() => setActiveCategoryFilter('all')}>
                  Show All Blocks
                </Button>
                <Button variant="primary" size="sm" onClick={handleOpenAddModal}>
                  Add Block
                </Button>
              </div>
            </motion.div>
          ) : (
            filteredBlocks.map((block) => {
              const originalIndex = scheduleBlocks.findIndex((b) => b.id === block.id);
              return (
                <TimelineBlock
                  key={block.id}
                  block={block}
                  index={originalIndex !== -1 ? originalIndex : 0}
                  totalBlocks={scheduleBlocks.length}
                  onToggleComplete={toggleTaskCompletion}
                  onUpdate={updateScheduleBlock}
                  onReorder={reorderScheduleBlocks}
                  onEditModal={handleOpenEditModal}
                  onDelete={handleDeleteBlock}
                />
              );
            })
          )}
        </AnimatePresence>
      </div>

      {/* ── Add / Edit Modal ───────────────────────────────────────── */}
      <BlockEditorModal
        isOpen={isModalOpen}
        initialBlock={editingBlock}
        onClose={() => {
          setIsModalOpen(false);
          setEditingBlock(null);
        }}
        onSave={handleSaveModal}
      />
    </Card>
  );
};
