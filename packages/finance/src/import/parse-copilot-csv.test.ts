import { describe, expect, it } from 'vitest';

import { parseCopilotCsv } from './parse-copilot-csv';

const headers =
  'date,name,amount,status,category,parent category,excluded,tags,type,account,account mask,note,recurring';

function csvRow(values: string[]): string {
  return values.map((value) => `"${value.replaceAll('"', '""')}"`).join(',');
}

describe('parseCopilotCsv', () => {
  it('parses the Copilot contract and preserves raw fields', () => {
    const input = `${headers}\n${csvRow(['2026-01-02', 'Coffee', '4.50', 'posted', 'Food', 'Daily', 'false', 'coffee;work', 'regular', 'Checking', '1234', 'Morning', 'weekly'])}`;
    const result = parseCopilotCsv(input);

    expect('rows' in result).toBe(true);
    if (!('rows' in result)) return;
    expect(result.rows[0]).toMatchObject({
      date: '2026-01-02',
      amount: '4.50',
      status: 'posted',
      type: 'regular',
      accountMask: '1234',
      tags: ['coffee', 'work'],
      excluded: false,
    });
    expect(result.rows[0]?.raw.recurring).toBe('weekly');
  });

  it('rejects a non-Copilot header set', () => {
    const result = parseCopilotCsv('date,description,amount\n2026-01-01,Coffee,1');
    expect(result).toEqual(expect.objectContaining({ kind: 'malformed-file' }));
  });

  it('keeps valid rows and caps invalid-row details', () => {
    const input = `${headers}\n${csvRow(['2026-01-02', 'Good', '4.50', 'posted', '', '', 'false', '', 'regular', 'Checking', '1234', '', ''])}\n${csvRow(['bad-date', 'Bad', 'nope', 'posted', '', '', 'false', '', 'regular', 'Checking', '1234', '', ''])}`;
    const result = parseCopilotCsv(input);

    expect('rows' in result).toBe(true);
    if (!('rows' in result)) return;
    expect(result.rows).toHaveLength(1);
    expect(result.invalidRows).toHaveLength(1);
  });
});
