export type PrototypePanelId = 'brief' | 'timeline' | 'packet';

export interface PrototypePanel {
  id: PrototypePanelId;
  label: string;
}

export interface PrototypePrepTask {
  id: string;
  label: string;
}

export interface PrototypeStage {
  id: string;
  label: string;
  shortLabel: string;
  scheduled: string;
  owner: string;
  summary: string;
  nextAction: string;
  prepTasks: PrototypePrepTask[];
}

export interface PrototypeTimelineEvent {
  id: string;
  label: string;
  date: string;
  detail: string;
}

export interface PrototypePacketItem {
  id: string;
  label: string;
  detail: string;
  freshness: string;
}

export interface PrototypeSignal {
  label: string;
  value: string;
  detail: string;
}

export interface PrototypeApplicationCockpitData {
  role: string;
  company: string;
  location: string;
  arrangement: string;
  updatedAt: string;
  status: string;
  currentStageId: string;
  focusSummary: string;
  compensationSummary: string;
  packetSummary: string;
  responseTempo: string;
  source: string;
  recruiter: string;
  stages: PrototypeStage[];
  panels: PrototypePanel[];
  timeline: PrototypeTimelineEvent[];
  packet: PrototypePacketItem[];
  signals: PrototypeSignal[];
  strengths: string[];
  risks: string[];
}

export interface ApplicationCockpitVariantProps {
  data: PrototypeApplicationCockpitData;
  activeStageId: string;
  activePanel: PrototypePanelId;
  onStageChange: (stageId: string) => void;
  onPanelChange: (panelId: PrototypePanelId) => void;
}

export const applicationCockpitPrototype: PrototypeApplicationCockpitData = {
  role: 'Staff Product Designer',
  company: 'Ramp',
  location: 'New York, NY',
  arrangement: 'Hybrid · 3 days onsite',
  updatedAt: 'Updated 42 minutes ago',
  status: 'Onsite loop in progress',
  currentStageId: 'onsite',
  focusSummary:
    'Strong systems story, unusually sharp portfolio proof, and a recruiter who keeps moving the process forward.',
  compensationSummary: '$228k target total comp · leveling conversation still open',
  packetSummary: 'Resume v7, portfolio deep-dive, and a tailored metrics sheet are all attached.',
  responseTempo: 'Replies typically land within 18–24 hours',
  source: 'Warm intro from former design manager',
  recruiter: 'Avery Collins',
  panels: [
    { id: 'brief', label: 'Brief' },
    { id: 'timeline', label: 'Timeline' },
    { id: 'packet', label: 'Packet' },
  ],
  stages: [
    {
      id: 'applied',
      label: 'Applied',
      shortLabel: 'Apply',
      scheduled: 'Aug 2',
      owner: 'You',
      summary:
        'Tailored the application around design systems migration and multi-product adoption proof.',
      nextAction: 'Keep the metrics sheet handy for later interviews.',
      prepTasks: [
        { id: 'applied-metrics', label: 'Archive the migration metrics note' },
        { id: 'applied-links', label: 'Save the portfolio links that were submitted' },
      ],
    },
    {
      id: 'recruiter',
      label: 'Recruiter screen',
      shortLabel: 'Screen',
      scheduled: 'Aug 5',
      owner: 'Avery Collins',
      summary:
        'Comp expectations and location fit were greenlit with no pushback on the target band.',
      nextAction: 'Keep the relocation stance crisp if the team asks again.',
      prepTasks: [
        { id: 'recruiter-band', label: 'Rehearse the compensation anchor in one sentence' },
        { id: 'recruiter-relocate', label: 'Prepare the hybrid-work answer' },
      ],
    },
    {
      id: 'hiring-manager',
      label: 'Hiring manager',
      shortLabel: 'Manager',
      scheduled: 'Aug 9',
      owner: 'Mina Patel',
      summary:
        'The manager leaned hard on systems thinking, influence, and how you sequence design debt cleanups.',
      nextAction: 'Lead with the onboarding redesign and the API token rollout story.',
      prepTasks: [
        { id: 'manager-story', label: 'Trim the onboarding case study to a 4-minute version' },
        { id: 'manager-sequence', label: 'Write the design debt sequencing answer on one card' },
      ],
    },
    {
      id: 'onsite',
      label: 'Onsite loop',
      shortLabel: 'Onsite',
      scheduled: 'Fri · 2:00 PM',
      owner: 'Panel of 4',
      summary:
        'Presentation panel, systems critique, and a collaboration round all happen in one session.',
      nextAction:
        'Tighten the 30-60-90 close and keep one tradeoff story ready for the critique round.',
      prepTasks: [
        { id: 'onsite-deck', label: 'Cut the deck to 11 slides' },
        { id: 'onsite-close', label: 'Practice the 30-60-90 wrap once out loud' },
        { id: 'onsite-tradeoff', label: 'Pick one strong tradeoff example for critique' },
      ],
    },
  ],
  timeline: [
    {
      id: 'timeline-1',
      label: 'Applied with tailored packet',
      date: 'Aug 2',
      detail:
        'Resume v7 and the metrics sheet emphasized design-system adoption across three product lines.',
    },
    {
      id: 'timeline-2',
      label: 'Recruiter screen completed',
      date: 'Aug 5',
      detail:
        'Target range and hybrid expectations were aligned; recruiter called out the proof density as a strength.',
    },
    {
      id: 'timeline-3',
      label: 'Hiring manager conversation',
      date: 'Aug 9',
      detail:
        'Strong signal on systems thinking. Follow-up note asked for more detail on cross-functional influence.',
    },
    {
      id: 'timeline-4',
      label: 'Onsite scheduled',
      date: 'Aug 14',
      detail: 'Four-round loop confirmed for Friday with a presentation and critique session.',
    },
  ],
  packet: [
    {
      id: 'packet-resume',
      label: 'Resume v7',
      detail: 'Tailored to design systems and platform leadership.',
      freshness: 'Edited today',
    },
    {
      id: 'packet-portfolio',
      label: 'Portfolio deep-dive',
      detail: 'Three case studies, with one migration and one growth narrative.',
      freshness: 'Last refreshed yesterday',
    },
    {
      id: 'packet-sheet',
      label: 'Metrics sheet',
      detail: 'Adoption, latency, and team-efficiency proof points in a single page.',
      freshness: 'Prepared for onsite',
    },
  ],
  signals: [
    {
      label: 'Fit signal',
      value: 'High',
      detail: 'Manager response asked for more depth, not less.',
    },
    {
      label: 'Process speed',
      value: 'Fast',
      detail: 'Each step moved within one business day.',
    },
    {
      label: 'Leverage',
      value: 'Open',
      detail: 'Leveling and scope are still being shaped.',
    },
  ],
  strengths: [
    'Portfolio proof matches the role unusually well.',
    'Warm intro gave you context before the first screen.',
    'Comp expectations stayed inside the recruiter’s band.',
  ],
  risks: [
    'Presentation deck still has too much setup before the payoff.',
    'Hybrid expectation may come back if scope expands to adjacent teams.',
  ],
};

export function getActiveStage(data: PrototypeApplicationCockpitData, activeStageId: string) {
  return data.stages.find((stage) => stage.id === activeStageId) ?? data.stages[0];
}

export function getStageProgress(data: PrototypeApplicationCockpitData, activeStageId: string) {
  const activeIndex = Math.max(
    0,
    data.stages.findIndex((stage) => stage.id === activeStageId),
  );

  return {
    activeIndex,
    percent: ((activeIndex + 1) / data.stages.length) * 100,
  };
}
