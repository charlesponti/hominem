import { google } from '@ai-sdk/google';
import { educationalProfileSchema, professionalProfileSchema } from '@hominem/utils/schemas';
import { generateObject } from 'ai';
import { Command } from 'commander';
import { consola } from 'consola';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import ora from 'ora';
import PDFParser from 'pdf2json';
import { z } from 'zod';

export default new Command()
  .command('resume-to-json')
  .description('Analyze a PDF file')
  .requiredOption('--filepath <filepath>', 'Path to the PDF file')
  .option('--outfile <outfile>', 'Output file name')
  .option('--outdir <outdir>', 'Output file directory')
  .action(async (options) => {
    if (!options.outdir && !options.outfile) {
      consola.error('Output file or directory not specified');
      process.exit(1);
    }

    const outputFile =
      options.outfile || (options.outdir && path.resolve(options.outdir, 'output/resume.json'));
    const spinner = ora().start('Processing PDF file...');

    if (!fs.existsSync(path.dirname(outputFile))) {
      fs.mkdirSync(path.dirname(outputFile), { recursive: true });
    }

    try {
      const pdfParser = new PDFParser(this, true);

      const pdfText = await new Promise((resolve, reject) => {
        pdfParser.loadPDF(options.filepath);

        pdfParser.on('pdfParser_dataReady', () => {
          const text = pdfParser.getRawTextContent();
          resolve(text);
        });

        pdfParser.on('pdfParser_dataError', reject);
      });

      spinner.text = 'Generating JSON...';
      const response = await generateObject({
        model: google('gemini-2.0-flash-exp'),
        schema: z.object({
          description: z.string(),
          education: educationalProfileSchema,
          professional: professionalProfileSchema,
        }),
        messages: [
          {
            role: 'user',
            content: `Analyze the attached PDF: ${pdfText}`,
          },
        ],
      });

      spinner.succeed('JSON generated successfully');
      consola.success(`Resume converted successfully. Output saved to: ${outputFile}`);
      fs.writeFileSync(outputFile, JSON.stringify(response.object, null, 2));
      process.exit(0);
    } catch (error) {
      consola.error('Error reading or processing PDF:', error);
      console.error(error);
      process.exit(1);
    }
  });
