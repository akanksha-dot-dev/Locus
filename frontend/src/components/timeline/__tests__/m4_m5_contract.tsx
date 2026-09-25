import React from 'react';
import { ScheduleTimeline } from '../ScheduleTimeline';
import { TimelineBlock } from '../TimelineBlock';
import { BlockEditorModal } from '../BlockEditorModal';
import { WorkloadMatrix } from '../../workload/WorkloadMatrix';
import { JiraSprintHUD } from '../../workload/JiraSprintHUD';
import { GitHubReviewHUD } from '../../workload/GitHubReviewHUD';
import { ArtifactExportBar } from '../../artifacts/ArtifactExportBar';
import { IntegrationGrid } from '../../artifacts/IntegrationGrid';
import { TelemetryDrawer } from '../../telemetry/TelemetryDrawer';
import { TerminalLogFeed } from '../../telemetry/TerminalLogFeed';
import { generateICS, generateMarkdown, generateJSON } from '../../../services/export';
import { audioService, playTone, setMuted, isMuted } from '../../../services/audio';
import { ScheduleBlock, JiraTicket, GitHubPR, GitHubIssue, AgentResponse, TerminalLog } from '../../../types';

/**
 * Type & Contract Verification Suite for M4 & M5 Components and Services
 */
export function TestM4M5Contract() {
  const sampleBlock: ScheduleBlock = {
    id: 'block-1',
    time: '09:00 - 11:30',
    activity: 'Deep Work: Core Pipeline Engineering',
    category: 'deep_work',
    location: 'Office Desk 4B',
    context: 'Resolve PR reviews and Jira blockers',
    completed: false,
  };

  const sampleTicket: JiraTicket = {
    key: 'DEV-402',
    summary: 'Implement LangGraph multi-node checkpoint resilience',
    priority: 'Highest',
    status: 'In Progress',
    estimated_hours: 3.5,
  };

  const samplePR: GitHubPR = {
    number: 142,
    title: 'feat: add reactive schedule reordering and instant ICS export',
    author: 'alexchen',
    state: 'open',
    is_draft: false,
    days_old: 3,
    estimated_hours: 1.5,
  };

  const sampleIssue: GitHubIssue = {
    number: 89,
    title: 'Bug: WebSocket timeout on cold start',
    state: 'open',
    days_old: 4,
    author: 'dev',
  };

  const sampleLog: TerminalLog = {
    id: 'log-1',
    timestamp: '14:23:05',
    type: 'tool',
    source: 'jira.issues.list',
    message: 'Fetched 4 active sprint tickets from Atlassian Jira API',
    latencyMs: 142,
  };

  return (
    <div>
      {/* M4: Schedule Timeline */}
      <ScheduleTimeline />

      {/* M4: TimelineBlock */}
      <TimelineBlock
        block={sampleBlock}
        index={0}
        totalBlocks={3}
        onToggleComplete={(id) => console.log('Toggle:', id)}
        onUpdate={(id, updates) => console.log('Update:', id, updates)}
        onReorder={(src, dst) => console.log('Reorder:', src, dst)}
      />

      {/* M4: BlockEditorModal */}
      <BlockEditorModal
        isOpen={true}
        initialBlock={sampleBlock}
        onClose={() => {}}
        onSave={(data) => console.log('Save block:', data)}
      />

      {/* M4: WorkloadMatrix */}
      <WorkloadMatrix />

      {/* M4: JiraSprintHUD */}
      <JiraSprintHUD tickets={[sampleTicket]} totalHours={3.5} />

      {/* M4: GitHubReviewHUD */}
      <GitHubReviewHUD prs={[samplePR]} issues={[sampleIssue]} totalReviewHours={1.5} />

      {/* M5: ArtifactExportBar */}
      <ArtifactExportBar />

      {/* M5: IntegrationGrid */}
      <IntegrationGrid />

      {/* M5: TelemetryDrawer */}
      <TelemetryDrawer />

      {/* M5: TerminalLogFeed */}
      <TerminalLogFeed logs={[sampleLog]} maxHeight="h-64" autoScroll={true} />
    </div>
  );
}
