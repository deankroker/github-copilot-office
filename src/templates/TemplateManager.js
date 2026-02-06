const fs = require('fs');
const path = require('path');
const os = require('os');

const BUILTINS_DIR = path.join(__dirname, 'builtins');
const CUSTOM_DIR = path.join(os.homedir(), '.copilot-office', 'templates');

/**
 * Parse simple YAML frontmatter from a markdown string.
 * Expects --- delimiters. Returns { meta, content }.
 */
function parseFrontmatter(raw) {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!match) {
    return { meta: {}, content: raw };
  }

  const meta = {};
  const lines = match[1].split(/\r?\n/);
  for (const line of lines) {
    const idx = line.indexOf(':');
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    let value = line.slice(idx + 1).trim();

    // Parse array values: [word, powerpoint]
    if (value.startsWith('[') && value.endsWith(']')) {
      value = value.slice(1, -1).split(',').map(s => s.trim()).filter(Boolean);
    }
    // Strip surrounding quotes
    else if ((value.startsWith('"') && value.endsWith('"')) ||
             (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }

    meta[key] = value;
  }

  return { meta, content: match[2] };
}

/**
 * Derive a template ID from a file path.
 */
function fileToId(filePath, prefix) {
  const basename = path.basename(filePath, '.md');
  return `${prefix}:${basename}`;
}

/**
 * Derive a display name from a filename.
 * "technical-spec" -> "Technical Spec"
 */
function filenameToName(filePath) {
  return path.basename(filePath, '.md')
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());
}

class TemplateManager {
  constructor() {
    this.templates = new Map(); // id -> template object
  }

  loadTemplates() {
    this.templates.clear();

    // Load built-in templates
    this._loadFromDir(BUILTINS_DIR, 'builtin');

    // Ensure custom dir exists
    if (!fs.existsSync(CUSTOM_DIR)) {
      fs.mkdirSync(CUSTOM_DIR, { recursive: true });
    }

    // Load custom templates
    this._loadFromDir(CUSTOM_DIR, 'custom');

    return this.templates;
  }

  _loadFromDir(dir, source) {
    if (!fs.existsSync(dir)) return;

    let files;
    try {
      files = fs.readdirSync(dir).filter(f => f.endsWith('.md'));
    } catch (e) {
      console.error(`[templates] Failed to read directory ${dir}:`, e.message);
      return;
    }

    for (const file of files) {
      try {
        const filePath = path.join(dir, file);
        const raw = fs.readFileSync(filePath, 'utf-8');
        const { meta, content } = parseFrontmatter(raw);

        const id = fileToId(filePath, source);
        this.templates.set(id, {
          id,
          name: meta.name || filenameToName(filePath),
          description: meta.description || '',
          hosts: meta.hosts || ['word', 'powerpoint', 'excel'],
          icon: meta.icon || '📄',
          source,
          content,
        });
      } catch (e) {
        console.error(`[templates] Failed to load ${file}:`, e.message);
      }
    }
  }

  getTemplates() {
    if (this.templates.size === 0) {
      this.loadTemplates();
    }

    const result = [];
    for (const [, template] of this.templates) {
      result.push({
        id: template.id,
        name: template.name,
        description: template.description,
        hosts: template.hosts,
        icon: template.icon,
        source: template.source,
      });
    }
    return result;
  }

  getTemplate(id) {
    if (this.templates.size === 0) {
      this.loadTemplates();
    }
    return this.templates.get(id) || null;
  }

  reloadTemplates() {
    this.loadTemplates();
    return this.getTemplates();
  }

  getCustomTemplatesPath() {
    return CUSTOM_DIR;
  }
}

// Singleton
let instance = null;
function getTemplateManager() {
  if (!instance) {
    instance = new TemplateManager();
    instance.loadTemplates();
  }
  return instance;
}

module.exports = { TemplateManager, getTemplateManager };
