import { detectTask } from '@hominem/utils/markdown';
import { Command } from 'commander';
import { consola } from 'consola';
import { createReadStream } from 'node:fs';
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import readline from 'node:readline';

import { trpc } from '../../lib/trpc';

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

export const importCommand = new Command('import')
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

          const rl = readline.createInterface({
            input: createReadStream(filePath),
            crlfDelay: Number.POSITIVE_INFINITY,
          });

          let currentHeading = '';
          let currentHeadingLevel = 0;
          let paragraphBuffer: string[] = [];
          let notesCreated = 0;

          async function flushParagraphBuffer() {
            if (!paragraphBuffer.length) return;

            const content = paragraphBuffer.join('\n\n');
            const noteData: NoteData = {
              type: 'note',
              title: currentHeading || `${baseName} - Section ${notesCreated + 1}`,
              content,
              tags: [
                { value: 'markdown-import' },
                { value: 'file-section' },
                { value: baseName.toLowerCase() },
              ],
            };

            try {
              const result = await trpc.notes.create.mutate(noteData);
              consola.success(`Created note: ${result.title || 'Untitled'}`);
              notesCreated++;
            } catch (error) {
              consola.error(`Failed to create note: ${error}`);
            }

            paragraphBuffer = [];
          }

          async function processBulletPoint(line: string) {
            const { isTask, isComplete } = detectTask(line);
            const noteData: NoteData = {
              type: isTask ? 'task' : 'note',
              title: currentHeading || baseName,
              content: line,
              tags: [
                { value: 'markdown-import' },
                { value: 'bullet-point' },
                { value: baseName.toLowerCase() },
              ],
              ...(isTask && {
                taskMetadata: {
                  status: isComplete ? 'done' : 'todo',
                  priority: 'medium',
                },
              }),
            };

            try {
              const _result = await trpc.notes.create.mutate(noteData);
              consola.success(`Created ${isTask ? 'task' : 'note'}: ${line.substring(0, 50)}...`);
              notesCreated++;
            } catch (error) {
              consola.error(`Failed to create bullet point note: ${error}`);
            }
          }

          for await (const line of rl) {
            const trimmed = line.trim();

            // Check for headings
            const headingMatch = /^(#{1,6})\s+(.*)/.exec(trimmed);
            if (headingMatch) {
              await flushParagraphBuffer();
              currentHeading = headingMatch[2].trim();
              currentHeadingLevel = headingMatch[1].length;

              // If preserve structure is enabled, create a note for the heading itself
              if (options.preserveStructure) {
                const headingNoteData: NoteData = {
                  type: 'note',
                  title: currentHeading,
                  content: `# ${currentHeading}\n\nHeading level ${currentHeadingLevel}`,
                  tags: [
                    { value: 'markdown-import' },
                    { value: 'heading' },
                    { value: `h${currentHeadingLevel}` },
                    { value: baseName.toLowerCase() },
                  ],
                };

                try {
                  const _result = await trpc.notes.create.mutate(headingNoteData);
                  consola.success(`Created heading note: ${currentHeading}`);
                  notesCreated++;
                } catch (error) {
                  consola.error(`Failed to create heading note: ${error}`);
                }
              }
            }
            // Check for bullet points
            else if (/^[-*]\s+/.test(trimmed)) {
              await flushParagraphBuffer();
              await processBulletPoint(trimmed);
            }
            // Check for numbered lists
            else if (/^\d+\.\s+/.test(trimmed)) {
              await flushParagraphBuffer();
              await processBulletPoint(trimmed);
            }
            // Regular content
            else if (trimmed) {
              if (options.combineParagraphs) {
                paragraphBuffer.push(trimmed);
              } else {
                // Create individual notes for each paragraph
                const noteData: NoteData = {
                  type: 'note',
                  title: currentHeading || baseName,
                  content: trimmed,
                  tags: [
                    { value: 'markdown-import' },
                    { value: 'paragraph' },
                    { value: baseName.toLowerCase() },
                  ],
                };

                try {
                  const _result = await trpc.notes.create.mutate(noteData);
                  consola.success(`Created paragraph note: ${trimmed.substring(0, 50)}...`);
                  notesCreated++;
                } catch (error) {
                  consola.error(`Failed to create paragraph note: ${error}`);
                }
              }
            } else {
              // Empty line - flush buffer if combining paragraphs
              if (options.combineParagraphs) {
                await flushParagraphBuffer();
              }
            }
          }

          // Flush any remaining content
          await flushParagraphBuffer();
          rl.close();

          consola.success(`Completed processing ${fileName}. Created ${notesCreated} notes.`);
        }

        consola.success('Successfully processed all markdown files!');
      } catch (err) {
        consola.error('Error processing markdown files:', err);
        process.exit(1);
      }
    },
  );

export default importCommand;
