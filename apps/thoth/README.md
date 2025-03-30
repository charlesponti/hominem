# Thoth Markdown Processor

An Obsidian plugin that processes markdown files to extract structured information from notes, tasks, and headings.

## Features

- Process markdown files to extract structured data
- Identify and track tasks from markdown
- Extract dates from headings and content
- Process nested lists and maintain hierarchy
- Export data as JSON for further processing
- Batch process entire vault or individual files

## Installation

### From GitHub Releases

1. Download the latest release from the GitHub repository
2. Unzip the downloaded file
3. Copy the unzipped folder to your Obsidian vault's `.obsidian/plugins` directory
4. Enable the plugin in Obsidian's settings under "Community Plugins"

### Manual Installation

1. Clone this repository
2. Run `npm install` to install dependencies
3. Run `npm run build` to build the plugin
4. Copy the `main.js`, `manifest.json`, and `styles.css` (if applicable) to a folder named `thoth-markdown-processor` in your Obsidian vault's `.obsidian/plugins` directory

## Usage

After installation, you can use the plugin in the following ways:

### Commands

The plugin adds the following commands to Obsidian:

- **Process Current File**: Processes the currently open file and exports the structured data as JSON
- **Process All Markdown Files**: Processes all markdown files in the vault and exports the structured data

### Settings

The plugin settings can be configured in the Obsidian settings panel:

- **Output Folder**: The folder where processed JSON files will be saved
- **Enhance Output**: Toggle for additional processing (not currently implemented)

## Development

### Prerequisites

- Node.js and npm/yarn
- Obsidian development environment

### Setup

1. Clone the repository
2. Run `npm install` to install dependencies
3. Run `npm run dev` to start the development server

### Building

Run `npm run build` to build the plugin.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT