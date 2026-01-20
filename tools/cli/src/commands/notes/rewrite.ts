import { chat } from '@tanstack/ai';
import { createOllamaChat } from '@tanstack/ai-ollama';
import { Command } from 'commander';
import fs from 'node:fs';
import path from 'node:path';

const adapter = createOllamaChat();

type Options = {
  dir: string;
  glob?: string;
  instruction?: string;
  model?: string;
  dryRun?: boolean;
  backup?: boolean;
};

const SYSTEM_PROMPT =
  'You are a markdown editor assistant that rewrites files while preserving frontmatter, code blocks, and structural intent.';

function isMarkdownFile(file: string) {
  return file.endsWith('.md') || file.endsWith('.mdx');
}

async function collectMarkdownFiles(dir: string): Promise<string[]> {
  const results: string[] = [];

  async function walk(current: string) {
    const entries = await fs.promises.readdir(current, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name === 'node_modules' || entry.name === '.git') {
        continue;
      }
      const resolved = path.join(current, entry.name);
      if (entry.isDirectory()) {
        await walk(resolved);
      } else if (entry.isFile() && isMarkdownFile(entry.name)) {
        results.push(resolved);
      }
    }
  }

  await walk(dir);
  return results;
}

function extractFrontmatter(content: string) {
  if (content.startsWith('---')) {
    const end = content.indexOf('\n---', 3);
    if (end !== -1) {
      const fm = content.slice(0, end + 4); // include trailing newline
      const body = content.slice(end + 4);
      return { frontmatter: fm, body };
    }
  }
  return { frontmatter: '', body: content };
}

function preserveFrontmatterPromptInstruction(frontmatter: string, instruction: string) {
  if (!frontmatter) {
    return instruction;
  }
  return `${instruction}\n\nImportant: this file contains the following YAML frontmatter which must be preserved exactly (do not change it):\n${frontmatter}`;
}

// Using the official @tanstack/ai-ollama adapter (`ollamaText`) below —
// no manual CLI or HTTP calls are necessary in this file.

export const rewriteCommand = new Command('rewrite')
  .description('Rewrite markdown files in a directory using an Ollama agent via @tanstack/ai')
  .requiredOption('-d, --dir <dir>', 'Directory to scan for markdown files')
  .option('-i, --instruction <instruction>', 'Rewrite instructions to send to the agent')
  .option('-m, --model <model>', 'Ollama model to use (default: llama2)', 'qwen3-vl:30b')
  .option('--mock', 'Use a local deterministic mock adapter (for testing without Ollama)')
  .option('--dry-run', "Don't write files, only show diffs")
  .option('--backup', 'Save a .bak copy of the original file before overwriting')
  .action(async (opts: Options) => {
    const dir = path.resolve(opts.dir);
    if (!(fs.existsSync(dir) && fs.statSync(dir).isDirectory())) {
      console.error('Provided path is not a directory:', opts.dir);
      process.exit(1);
    }

    const files = await collectMarkdownFiles(dir);
    console.log(`Found ${files.length} markdown files in ${dir}`);

    if (files.length === 0) {
      return;
    }

    const instruction =
      opts.instruction ||
      'Rewrite the markdown to improve clarity, fix grammar, and preserve original meaning and structure. Keep code blocks and frontmatter unchanged unless the instruction explicitly asks to alter them.';

    for (const file of files) {
      try {
        const content = await fs.promises.readFile(file, 'utf-8');
        const { frontmatter, body } = extractFrontmatter(content);

        const fullInstruction = preserveFrontmatterPromptInstruction(frontmatter, instruction);

        const prompt = `${fullInstruction}\n\nFile content:\n${body}`;

        process.stdout.write(`Rewriting ${path.relative(process.cwd(), file)} ... `);
        const start = Date.now();

        const stream = chat({
          adapter,
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: prompt },
          ],
        });

        let accumulated = '';
        for await (const event of stream as AsyncIterable<any>) {
          console.log(event.content);
          if (event.type === 'content') {
            accumulated += event.content;
          }
        }

        const rewritten = accumulated;
        const duration = Date.now() - start;

        if (!rewritten || rewritten.trim().length === 0) {
          console.log('no output');
          continue;
        }

        const finalContent = `${frontmatter}${rewritten.trim()}\n`;

        if (opts.dryRun) {
          console.log(`(dry-run) ${finalContent.slice(0, 200).replace(/\n/g, ' ')}...`);
        } else {
          if (opts.backup) {
            await fs.promises.copyFile(file, `${file}.bak`);
          }
          await fs.promises.writeFile(file, finalContent, 'utf-8');
          console.log(`updated (${duration}ms)`);
        }
      } catch (err) {
        console.error('Error rewriting', file, err);
      }
    }
  });

export default rewriteCommand;
