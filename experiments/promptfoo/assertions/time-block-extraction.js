const { parseModelJson } = require('./json-utils');

const FIELDS = [
  'primary_intent',
  'title',
  'target_title',
  'participants',
  'location',
  'duration',
  'start_time',
  'end_time',
  'scheduling_window_start',
  'scheduling_window_end',
  'deadline_fixed',
  'recurrence_rule',
];

function parseList(value) {
  return value ? value.split(/[|,]/).map((item) => item.trim()).filter(Boolean) : [];
}

function normalize(value) {
  return String(value).trim().toLowerCase();
}

function sameInstant(actual, expected) {
  const actualTime = Date.parse(actual);
  const expectedTime = Date.parse(expected);
  return Number.isFinite(actualTime) && actualTime === expectedTime;
}

module.exports = function (output, context) {
  let block;
  try {
    block = parseModelJson(output);
  } catch (error) {
    return { pass: false, score: 0, reason: `Invalid JSON: ${error.message}` };
  }

  const problems = [];
  for (const field of FIELDS) {
    if (!(field in block)) problems.push(`Missing required field ${field}`);
  }

  const expectedIntent = context.vars.expectedIntent;
  if (block.primary_intent !== expectedIntent) {
    problems.push(`Expected intent ${expectedIntent}, got ${JSON.stringify(block.primary_intent)}`);
  }

  if (context.vars.expectedTitlePattern) {
    const pattern = new RegExp(context.vars.expectedTitlePattern, 'i');
    if (typeof block.title !== 'string' || !pattern.test(block.title)) {
      problems.push(`Title ${JSON.stringify(block.title)} does not match ${pattern}`);
    }
  }

  if (context.vars.expectedTargetTitlePattern) {
    const pattern = new RegExp(context.vars.expectedTargetTitlePattern, 'i');
    if (typeof block.target_title !== 'string' || !pattern.test(block.target_title)) {
      problems.push(`Target title ${JSON.stringify(block.target_title)} does not match ${pattern}`);
    }
  }

  if (context.vars.expectedDuration !== undefined) {
    const expectedDuration = Number(context.vars.expectedDuration);
    if (block.duration !== expectedDuration) {
      problems.push(`Expected duration ${expectedDuration}, got ${JSON.stringify(block.duration)}`);
    }
  }

  if (context.vars.expectedStartTime) {
    if (typeof block.start_time !== 'string' || !sameInstant(block.start_time, context.vars.expectedStartTime)) {
      problems.push(`Expected start_time ${context.vars.expectedStartTime}, got ${JSON.stringify(block.start_time)}`);
    }
  }

  if (context.vars.expectedEndTime) {
    if (typeof block.end_time !== 'string' || !sameInstant(block.end_time, context.vars.expectedEndTime)) {
      problems.push(`Expected end_time ${context.vars.expectedEndTime}, got ${JSON.stringify(block.end_time)}`);
    }
  }

  if (context.vars.expectedDeadline && block.deadline_fixed !== context.vars.expectedDeadline) {
    problems.push(`Expected deadline_fixed ${context.vars.expectedDeadline}, got ${JSON.stringify(block.deadline_fixed)}`);
  }

  if (context.vars.expectedRecurrenceRule) {
    const actualRule = typeof block.recurrence_rule === 'string'
      ? block.recurrence_rule.replace(/^RRULE:/i, '')
      : block.recurrence_rule;
    if (actualRule !== context.vars.expectedRecurrenceRule) {
      problems.push(`Expected recurrence_rule ${context.vars.expectedRecurrenceRule}, got ${JSON.stringify(block.recurrence_rule)}`);
    }
  }

  if (context.vars.expectedWindowStart) {
    if (typeof block.scheduling_window_start !== 'string' || !sameInstant(block.scheduling_window_start, context.vars.expectedWindowStart)) {
      problems.push(`Expected scheduling_window_start ${context.vars.expectedWindowStart}, got ${JSON.stringify(block.scheduling_window_start)}`);
    }
  }

  if (context.vars.expectedWindowEnd) {
    if (typeof block.scheduling_window_end !== 'string' || !sameInstant(block.scheduling_window_end, context.vars.expectedWindowEnd)) {
      problems.push(`Expected scheduling_window_end ${context.vars.expectedWindowEnd}, got ${JSON.stringify(block.scheduling_window_end)}`);
    }
  }

  const expectedParticipants = parseList(context.vars.expectedParticipants).map(normalize).sort();
  if (expectedParticipants.length) {
    if (!Array.isArray(block.participants)) {
      problems.push(`Expected participants ${expectedParticipants.join(', ')}, got ${JSON.stringify(block.participants)}`);
    } else {
      const actualParticipants = block.participants.map(normalize).sort();
      if (actualParticipants.join('|') !== expectedParticipants.join('|')) {
        problems.push(`Expected participants ${expectedParticipants.join(', ')}, got ${actualParticipants.join(', ')}`);
      }
    }
  }

  for (const field of parseList(context.vars.nullFields)) {
    if (block[field] !== null) {
      problems.push(`Expected ${field} to be null, got ${JSON.stringify(block[field])}`);
    }
  }

  return problems.length
    ? { pass: false, score: 0, reason: problems.join('; ') }
    : { pass: true, score: 1, reason: 'All structured time-block assertions passed' };
};
