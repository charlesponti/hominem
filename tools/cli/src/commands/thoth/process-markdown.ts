import { MarkdownProcessor } from '@hominem/utils/markdown';
import { Command } from 'commander';
import { consola } from 'consola';
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

import { honoClient as trpc } from '../../lib/trpc';

interface NoteData {
  type: 'note' | 'task' | 'timer' | 'journal' | 'document';
  title?: string;
  content: string;
  tags?: Array<{ value: string }>;
  taskMetadata?: {
    status: 'todo' | 'in-progress' | 'done' | 'archived';
    priority?: 'low' | 'medium' | 'high' | 'urgent';
  };
}

export const groupMarkdownByHeadingCommand = new Command('group-markdown-by-heading')
  .description('Import markdown files as structured notes, preserving document hierarchy')
  .argument('<dir>', 'Directory containing markdown files')
  .option('-o, --output <dir>', 'Output directory for processed files (optional)', './processed')
  .option('--preserve-structure', 'Create separate notes for each heading level', false)
  .option('--combine-paragraphs', 'Combine consecutive paragraphs into single notes', true)
  .action(
    async (
      dir: string,
      options: { output: string; preserveStructure: boolean; combineParagraphs: boolean },
    ) => {
      try {
        const inputDir = path.resolve(process.cwd(), dir);
        const outputDir = path.resolve(process.cwd(), options.output);
        const processor = new MarkdownProcessor();

        // Ensure output directory exists
        await fs.mkdir(outputDir, { recursive: true });

        const files = await fs.readdir(inputDir);
        const markdownFiles = files.filter((file) => file.endsWith('.md'));

        if (markdownFiles.length === 0) {
          consola.warn('No markdown files found in the specified directory.');
          return;
        }

        consola.info(`Found ${markdownFiles.length} markdown files to process`);

        for (const fileName of markdownFiles) {
          consola.info(`Processing ${fileName}...`);
          const filePath = path.join(inputDir, fileName);
          const baseName = path.basename(fileName, '.md');
          const content = await fs.readFile(filePath, 'utf-8');

          const { result } = await processor.convertMarkdownToJSON(content, fileName);
          let notesCreated = 0;

          for (const entry of result.entries) {
            // If preserve structure is enabled, create a note for the heading itself
            if (options.preserveStructure && entry.heading !== baseName) {
              const headingNoteData: NoteData = {
                type: 'note',
                title: entry.heading,
                content: `# ${entry.heading}`,
                tags: [
                  { value: 'markdown-import' },
                  { value: 'heading' },
                  { value: baseName.toLowerCase() },
                ],
              };

              try {
                const res = await (trpc as any).api.notes.$post({ json: headingNoteData });
                const _result = await res.json();
                if (_result?.id) {
                  consola.success(`Created heading note: ${entry.heading}`);
                  notesCreated++;
                }
              } catch (error) {
                consola.error(`Failed to create heading note: ${error}`);
              }
            }

            let paragraphBuffer: string[] = [];

            const flushParagraphBuffer = async () => {
              if (paragraphBuffer.length === 0) return;
              const combinedContent = paragraphBuffer.join('\n\n');
              const noteData: NoteData = {
                type: 'note',
                title: entry.heading || baseName,
                content: combinedContent,
                tags: [
                  { value: 'markdown-import' },
                  { value: 'file-section' },
                  { value: baseName.toLowerCase() },
                ],
              };

              try {
                const res = await (trpc as any).api.notes.$post({ json: noteData });
                const _result = await res.json();
                if (_result?.id) {
                  consola.success(`Created note: ${_result.title || 'Untitled'}`);
                  notesCreated++;
                }
              } catch (error) {
                consola.error(`Failed to create note: ${error}`);
              }
              paragraphBuffer = [];
            };

            for (const item of entry.content) {
              if (item.tag === 'task' || item.tag === 'list-item') {
                await flushParagraphBuffer();
                const noteData: NoteData = {
                  type: item.isTask ? 'task' : 'note',
                  title: entry.heading || baseName,
                  content: item.text,
                  tags: [
                    { value: 'markdown-import' },
                    { value: item.isTask ? 'task' : 'list-item' },
                    { value: baseName.toLowerCase() },
                  ],
                  ...(item.isTask && {
                    taskMetadata: {
                      status: item.isComplete ? 'done' : 'todo',
                      priority: 'medium',
                    },
                  }),
                };

                try {
                  const res = await (trpc as any).api.notes.$post({ json: noteData });
                  const _result = await res.json();
                  if (_result?.id) {
                    consola.success(`Created ${item.isTask ? 'task' : 'note'}: ${item.text.substring(0, 50)}...`);
                    notesCreated++;
                  }
                } catch (error) {
                  consola.error(`Failed to create list item note: ${error}`);
                }
              } else {
                if (options.combineParagraphs) {
                  paragraphBuffer.push(item.text);
                } else {
                  const noteData: NoteData = {
                    type: 'note',
                    title: entry.heading || baseName,
                    content: item.text,
                    tags: [
                      { value: 'markdown-import' },
                      { value: item.tag },
                      { value: baseName.toLowerCase() },
                    ],
                  };

                  try {
                    const res = await (trpc as any).api.notes.$post({ json: noteData });
                    const _result = await res.json();
                    if (_result?.id) {
                      consola.success(`Created paragraph note: ${item.text.substring(0, 50)}...`);
                      notesCreated++;
                    }
                  } catch (error) {
                    consola.error(`Failed to create paragraph note: ${error}`);
                  }
                }
              }
            }
            await flushParagraphBuffer();
          }

          consola.success(`Completed processing ${fileName}. Created ${notesCreated} notes.`);
        }

        consola.success('Successfully processed all markdown files!');
      } catch (err) {
        consola.error('Error processing markdown files:', err);
        process.exit(1);
      }
    },
  );

export default groupMarkdownByHeadingCommand;
