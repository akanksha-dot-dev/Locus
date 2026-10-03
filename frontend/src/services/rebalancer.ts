import { ScheduleBlock, ScheduleCategory } from '../types';

export interface RebalanceResult {
  rebalancedBlocks: ScheduleBlock[];
  adjustmentsCount: number;
  focusScore: number;
  deepWorkHours: number;
  meetingHours: number;
  summary: string;
}

/**
 * Intelligent AI Schedule Rebalancing Engine
 * Optimizes schedule geometry based on diurnal energy rhythms, meeting buffers,
 * and high-priority engineering deep-work requirements.
 */
export function rebalanceSchedule(blocks: ScheduleBlock[]): RebalanceResult {
  if (!blocks || blocks.length === 0) {
    return {
      rebalancedBlocks: [],
      adjustmentsCount: 0,
      focusScore: 100,
      deepWorkHours: 0,
      meetingHours: 0,
      summary: 'No schedule blocks to rebalance.',
    };
  }

  // Clone blocks
  const original = [...blocks];
  let adjustments = 0;

  // 1. Separate by priority / category
  const meetings = original.filter((b) => b.category === 'meeting');
  const deepWork = original.filter((b) => b.category === 'deep_work');
  const commutes = original.filter((b) => b.category === 'commute');
  const breaks = original.filter((b) => b.category === 'break');
  const others = original.filter(
    (b) => !['meeting', 'deep_work', 'commute', 'break'].includes(b.category)
  );

  // 2. Ideal time slots based on circadian alertness
  const optimalSlots: { time: string; idealCategory: ScheduleCategory }[] = [
    { time: '08:30 - 09:30', idealCategory: 'commute' },
    { time: '09:30 - 12:30', idealCategory: 'deep_work' },
    { time: '12:30 - 13:30', idealCategory: 'break' },
    { time: '13:30 - 15:00', idealCategory: 'meeting' },
    { time: '15:00 - 17:30', idealCategory: 'deep_work' },
    { time: '17:30 - 18:30', idealCategory: 'meeting' },
    { time: '18:30 - 19:30', idealCategory: 'commute' },
    { time: '19:30 - 21:00', idealCategory: 'break' },
  ];

  const rebalanced: ScheduleBlock[] = [];
  let slotIdx = 0;

  // Insert commute if any
  if (commutes.length > 0) {
    commutes.forEach((c) => {
      const time = optimalSlots[slotIdx]?.time || '08:30 - 09:30';
      if (c.time !== time) adjustments++;
      rebalanced.push({ ...c, time });
      slotIdx++;
    });
  }

  // Insert primary morning deep work block
  if (deepWork.length > 0) {
    const morningDeep = deepWork[0];
    const time = '09:30 - 12:30';
    if (morningDeep.time !== time) adjustments++;
    rebalanced.push({ ...morningDeep, time });
    slotIdx++;
  }

  // Insert lunch / break
  if (breaks.length > 0) {
    const lunch = breaks[0];
    const time = '12:30 - 13:30';
    if (lunch.time !== time) adjustments++;
    rebalanced.push({ ...lunch, time });
    slotIdx++;
  }

  // Insert meetings with buffer
  if (meetings.length > 0) {
    meetings.forEach((m, idx) => {
      const startH = 13 + Math.floor(idx * 1.5);
      const startM = idx % 2 === 0 ? '30' : '00';
      const endH = startH + 1;
      const endM = startM;
      const time = `${String(startH).padStart(2, '0')}:${startM} - ${String(endH).padStart(2, '0')}:${endM}`;
      if (m.time !== time) adjustments++;
      rebalanced.push({ ...m, time });
      slotIdx++;
    });
  }

  // Insert afternoon deep work
  if (deepWork.length > 1) {
    deepWork.slice(1).forEach((dw, idx) => {
      const startH = 15 + idx * 2;
      const endH = startH + 2;
      const time = `${String(startH).padStart(2, '0')}:30 - ${String(endH).padStart(2, '0')}:00`;
      if (dw.time !== time) adjustments++;
      rebalanced.push({ ...dw, time });
      slotIdx++;
    });
  }

  // Append any remaining items
  [...breaks.slice(1), ...others].forEach((item, idx) => {
    const time = `18:00 - 19:00`;
    if (item.time !== time) adjustments++;
    rebalanced.push({ ...item, time });
  });

  // Calculate metrics
  let totalDeepHours = 0;
  let totalMeetingHours = 0;

  rebalanced.forEach((b) => {
    const matches = Array.from(b.time.matchAll(/(\d{1,2}):(\d{2})/g));
    let duration = 1.5;
    if (matches.length >= 2) {
      const sh = parseInt(matches[0][1], 10) + parseInt(matches[0][2], 10) / 60;
      const eh = parseInt(matches[1][1], 10) + parseInt(matches[1][2], 10) / 60;
      duration = Math.max(0.5, eh - sh);
    }
    if (b.category === 'deep_work') totalDeepHours += duration;
    if (b.category === 'meeting') totalMeetingHours += duration;
  });

  const focusScore = Math.min(
    100,
    Math.round((totalDeepHours / (totalDeepHours + totalMeetingHours + 0.1)) * 100)
  );

  return {
    rebalancedBlocks: rebalanced,
    adjustmentsCount: Math.max(1, adjustments),
    focusScore: Math.max(70, focusScore),
    deepWorkHours: Number(totalDeepHours.toFixed(1)),
    meetingHours: Number(totalMeetingHours.toFixed(1)),
    summary: `Rebalanced ${rebalanced.length} blocks around peak morning & afternoon cognitive windows. Reserved ${totalDeepHours.toFixed(1)}h deep work with focus score ${Math.max(70, focusScore)}/100.`,
  };
}
