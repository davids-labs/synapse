import { parseCsv, stringifyCsv } from '../src/main/csvUtils';

describe('csvUtils', () => {
  it('parses quoted csv rows with embedded commas and quotes', () => {
    const parsed = parseCsv(
      'title,config\n"Practice Bank","{""sortBy"":""difficulty"",""filterTags"":[""exam""]}"',
    );

    expect(parsed.headers).toEqual(['title', 'config']);
    expect(parsed.rows[0].title).toBe('Practice Bank');
    expect(parsed.rows[0].config).toContain('"sortBy"');
  });

  it('stringifies rows back into csv text', () => {
    const csv = stringifyCsv(
      [
        {
          module_id: 'practice-bank',
          title: 'Practice Bank',
          config: '{"sortBy":"difficulty"}',
        },
      ],
      ['module_id', 'title', 'config'],
    );

    expect(csv).toContain('module_id,title,config');
    expect(csv).toContain('Practice Bank');
  });
});
