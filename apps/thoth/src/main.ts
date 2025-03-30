import {
  type App,
  type Editor,
  type MarkdownView,
  Modal,
  Notice,
  Plugin,
  PluginSettingTab,
  Setting,
  TFile,
  normalizePath,
} from 'obsidian'
import { MarkdownProcessor } from './markdown/markdown-processor'

interface ThothSettings {
  outputFolder: string
  enhanceOutput: boolean
}

const DEFAULT_SETTINGS: ThothSettings = {
  outputFolder: 'thoth-output',
  enhanceOutput: false,
}

export default class ThothPlugin extends Plugin {
  settings: ThothSettings
  processor: MarkdownProcessor

  async onload() {
    await this.loadSettings()
    this.processor = new MarkdownProcessor()

    // Add a command to process the current file
    this.addCommand({
      id: 'process-current-file',
      name: 'Process Current File',
      editorCheckCallback: (checking: boolean, editor: Editor, view: MarkdownView) => {
        if (checking) {
          return true
        }
        this.processCurrentFile(editor, view)
        return true
      },
    })

    // Add a command to process all markdown files in the vault
    this.addCommand({
      id: 'process-all-files',
      name: 'Process All Markdown Files',
      callback: () => {
        this.processAllFiles()
      },
    })

    // Add settings tab
    this.addSettingTab(new ThothSettingTab(this.app, this))
  }

  onunload() {
    // Clean up resources when plugin is unloaded
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData())
  }

  async saveSettings() {
    await this.saveData(this.settings)
  }

  async processCurrentFile(editor: Editor, view: MarkdownView) {
    try {
      const file = view.file
      if (!file) {
        new Notice('No file is open')
        return
      }

      new Notice(`Processing file: ${file.name}`)
      const content = await this.app.vault.read(file)
      const result = await this.processor.convertMarkdownToJSON(content, file.path)

      // Save the output file
      const outputPath = normalizePath(`${this.settings.outputFolder}/${file.basename}.json`)
      await this.ensureFolder(this.settings.outputFolder)
      await this.app.vault.create(outputPath, JSON.stringify(result.result, null, 2))

      new Notice(`File processed and saved to ${outputPath}`)
    } catch (error) {
      console.error('Error processing file:', error)
      new Notice(`Error processing file: ${error.message}`)
    }
  }

  async processAllFiles() {
    try {
      new Notice('Processing all markdown files...')

      // Get all markdown files
      const markdownFiles = this.app.vault.getMarkdownFiles()
      const totalFiles = markdownFiles.length
      let processedCount = 0

      await this.ensureFolder(this.settings.outputFolder)

      // Process each file
      for (const file of markdownFiles) {
        try {
          const content = await this.app.vault.read(file)
          const result = await this.processor.convertMarkdownToJSON(content, file.path)

          // Save the output file
          const outputPath = normalizePath(`${this.settings.outputFolder}/${file.basename}.json`)
          await this.app.vault.create(outputPath, JSON.stringify(result.result, null, 2))

          processedCount++
          if (processedCount % 10 === 0) {
            new Notice(`Processed ${processedCount} of ${totalFiles} files`)
          }
        } catch (fileError) {
          console.error(`Error processing file ${file.path}:`, fileError)
        }
      }

      // Create index file with all results
      const allResults = []
      const outputFiles = this.app.vault
        .getFiles()
        .filter((f) => f.path.startsWith(this.settings.outputFolder) && f.extension === 'json')

      for (const file of outputFiles) {
        const content = await this.app.vault.read(file)
        try {
          const json = JSON.parse(content)
          allResults.push(json)
        } catch (e) {
          console.error(`Error parsing ${file.path}:`, e)
        }
      }

      await this.app.vault.create(
        normalizePath(`${this.settings.outputFolder}/index.json`),
        JSON.stringify(allResults, null, 2)
      )

      new Notice(
        `All files processed. ${processedCount} of ${totalFiles} files successfully processed.`
      )
    } catch (error) {
      console.error('Error processing files:', error)
      new Notice(`Error processing files: ${error.message}`)
    }
  }

  async ensureFolder(folderPath: string) {
    const normalizedFolderPath = normalizePath(folderPath)
    const folders = normalizedFolderPath.split('/')
    let currentPath = ''

    for (const folder of folders) {
      currentPath = currentPath ? `${currentPath}/${folder}` : folder
      if (!(await this.app.vault.adapter.exists(currentPath))) {
        await this.app.vault.createFolder(currentPath)
      }
    }
  }
}

class ThothSettingTab extends PluginSettingTab {
  plugin: ThothPlugin

  constructor(app: App, plugin: ThothPlugin) {
    super(app, plugin)
    this.plugin = plugin
  }

  display(): void {
    const { containerEl } = this

    containerEl.empty()

    containerEl.createEl('h2', { text: 'Thoth Markdown Processor Settings' })

    new Setting(containerEl)
      .setName('Output Folder')
      .setDesc('The folder where processed files will be saved')
      .addText((text) =>
        text
          .setPlaceholder('thoth-output')
          .setValue(this.plugin.settings.outputFolder)
          .onChange(async (value) => {
            this.plugin.settings.outputFolder = value
            await this.plugin.saveSettings()
          })
      )

    new Setting(containerEl)
      .setName('Enhance Output')
      .setDesc('Apply additional processing to enhance the output (requires external services)')
      .addToggle((toggle) =>
        toggle.setValue(this.plugin.settings.enhanceOutput).onChange(async (value) => {
          this.plugin.settings.enhanceOutput = value
          await this.plugin.saveSettings()
        })
      )
  }
}
