/**
 * Code Snippet Social Card Formatter
 * Generates IDE/Editor-style SVG images, ASCII frames, and Markdown blocks
 * for sharing code snippets on Twitter/X, LinkedIn, Discord, and GitHub.
 */

import { type Token, tokenizeLine } from './syntaxHighlighter';

export type IdeTheme =
  | 'vscode'
  | 'onedark'
  | 'dracula'
  | 'nord'
  | 'cyberpunk'
  | 'minimal';

export interface CodeCardOptions {
  title: string;
  description?: string;
  code: string;
  language?: string;
  filename?: string;
  tags?: string[];
  theme?: IdeTheme;
  showLineNumbers?: boolean;
  showBackdrop?: boolean;
  watermark?: boolean;
}

export interface IdeThemeConfig {
  name: string;
  bg: string;
  titleBar: string;
  tabBg: string;
  tabBorder: string;
  border: string;
  lineNum: string;
  lineDivider: string;
  canvasBg: string;
  gradientStart: string;
  gradientEnd: string;
  descBg: string;
  descBorder: string;
  descText: string;
}

export const IDE_THEMES: Record<IdeTheme, IdeThemeConfig> = {
  vscode: {
    name: 'VS Code Dark',
    bg: '#1e1e1e',
    titleBar: '#2d2d2d',
    tabBg: '#1e1e1e',
    tabBorder: '#007acc',
    border: '#333333',
    lineNum: '#858585',
    lineDivider: '#2a2d2e',
    canvasBg: '#111317',
    gradientStart: '#1a1d24',
    gradientEnd: '#28303d',
    descBg: 'rgba(0, 122, 204, 0.12)',
    descBorder: 'rgba(0, 122, 204, 0.35)',
    descText: '#75beff',
  },
  onedark: {
    name: 'One Dark Pro',
    bg: '#282c34',
    titleBar: '#21252b',
    tabBg: '#282c34',
    tabBorder: '#61afef',
    border: '#3e4451',
    lineNum: '#636d83',
    lineDivider: '#353b45',
    canvasBg: '#14181f',
    gradientStart: '#1e222a',
    gradientEnd: '#3a3f4b',
    descBg: 'rgba(97, 175, 239, 0.12)',
    descBorder: 'rgba(97, 175, 239, 0.35)',
    descText: '#61afef',
  },
  dracula: {
    name: 'Dracula',
    bg: '#282a36',
    titleBar: '#21222c',
    tabBg: '#282a36',
    tabBorder: '#bd93f9',
    border: '#44475a',
    lineNum: '#6272a4',
    lineDivider: '#383a4c',
    canvasBg: '#191a21',
    gradientStart: '#2d1b4e',
    gradientEnd: '#4c2e86',
    descBg: 'rgba(189, 147, 249, 0.15)',
    descBorder: 'rgba(189, 147, 249, 0.4)',
    descText: '#bd93f9',
  },
  nord: {
    name: 'Nord Frost',
    bg: '#2e3440',
    titleBar: '#242933',
    tabBg: '#2e3440',
    tabBorder: '#88c0d0',
    border: '#3b4252',
    lineNum: '#4c566a',
    lineDivider: '#353c4a',
    canvasBg: '#1c2027',
    gradientStart: '#242933',
    gradientEnd: '#434c5e',
    descBg: 'rgba(136, 192, 208, 0.12)',
    descBorder: 'rgba(136, 192, 208, 0.35)',
    descText: '#88c0d0',
  },
  cyberpunk: {
    name: 'Cyberpunk Neon',
    bg: '#0d1117',
    titleBar: '#161b22',
    tabBg: '#0d1117',
    tabBorder: '#58a6ff',
    border: '#30363d',
    lineNum: '#6e7681',
    lineDivider: '#21262d',
    canvasBg: '#070a0d',
    gradientStart: '#0d233a',
    gradientEnd: '#2e1844',
    descBg: 'rgba(88, 166, 255, 0.14)',
    descBorder: 'rgba(88, 166, 255, 0.4)',
    descText: '#58a6ff',
  },
  minimal: {
    name: 'Obsidian Minimal',
    bg: '#161b22',
    titleBar: '#1c2128',
    tabBg: '#161b22',
    tabBorder: '#8b949e',
    border: '#30363d',
    lineNum: '#6e7681',
    lineDivider: '#262c36',
    canvasBg: '#0d1117',
    gradientStart: '#161b22',
    gradientEnd: '#21262d',
    descBg: 'rgba(139, 148, 158, 0.12)',
    descBorder: 'rgba(139, 148, 158, 0.3)',
    descText: '#c9d1d9',
  },
};

/**
 * Derives a clean filename from title and programming language.
 */
export function getDefaultFilename(title: string, language: string = 'typescript'): string {
  const slug =
    title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '') || 'snippet';

  const extMap: Record<string, string> = {
    typescript: '.ts',
    javascript: '.js',
    ts: '.ts',
    js: '.js',
    python: '.py',
    py: '.py',
    bash: '.sh',
    shell: '.sh',
    sh: '.sh',
    zsh: '.zsh',
    sql: '.sql',
    html: '.html',
    css: '.css',
    json: '.json',
    markdown: '.md',
    md: '.md',
    rust: '.rs',
    go: '.go',
    dockerfile: 'Dockerfile',
    yaml: '.yaml',
    yml: '.yml',
  };

  const ext = extMap[language.toLowerCase()] || '.ts';
  if (ext === 'Dockerfile') return 'Dockerfile';
  return `${slug}${ext}`;
}

const escapeXml = (unsafe: string): string =>
  unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

/**
 * Returns syntax highlight hex color for a given token type.
 */
function getTokenColor(token: Token): string {
  switch (token.type) {
    case 'comment':
      return '#8b949e';
    case 'keyword':
      return '#ff7b72';
    case 'string':
      return '#a5d6ff';
    case 'function':
      return '#d2a8ff';
    case 'type':
      return '#ffa657';
    case 'number':
      return '#79c0ff';
    case 'operator':
      return '#f47067';
    case 'variable':
      return '#ffa657';
    case 'flag':
      return '#7ee787';
    case 'placeholder':
      return '#e3b341';
    case 'command':
      return '#58a6ff';
    case 'subcommand':
      return '#79c0ff';
    case 'text':
    default:
      return '#e6edf3';
  }
}

/**
 * Generates an SVG code editor social card.
 */
export function generateSvgCodeCard(options: CodeCardOptions): string {
  const theme = IDE_THEMES[options.theme || 'vscode'];
  const language = options.language || 'typescript';
  const filename = options.filename || getDefaultFilename(options.title, language);
  const showLineNumbers = options.showLineNumbers ?? true;
  const showBackdrop = options.showBackdrop ?? true;
  const description = options.description?.trim() || '';

  const rawLines = options.code.replace(/\r\n/g, '\n').split('\n');
  const codeLines = rawLines.length > 0 ? rawLines : [''];

  const lineHeight = 21;
  const fontMono = `ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace`;
  const fontSans = `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif`;

  // Description box sizing
  let descHeight = 0;
  const descLines: string[] = [];
  if (description) {
    // Break description into readable lines (~70 chars max)
    const words = description.split(' ');
    let currentLine = '';
    words.forEach((w) => {
      if ((currentLine + ' ' + w).trim().length > 72) {
        descLines.push(currentLine.trim());
        currentLine = w;
      } else {
        currentLine = currentLine ? `${currentLine} ${w}` : w;
      }
    });
    if (currentLine) descLines.push(currentLine.trim());
    descHeight = 36 + descLines.length * 18;
  }

  const editorPaddingY = 16;
  const headerHeight = 42;
  const statusBarHeight = 28;
  const codeHeight = codeLines.length * lineHeight;

  const innerEditorHeight = headerHeight + (descHeight > 0 ? descHeight + 12 : 0) + codeHeight + editorPaddingY * 2 + statusBarHeight;
  const editorWidth = 740;

  // Outer canvas margins
  const padX = showBackdrop ? 40 : 16;
  const padY = showBackdrop ? 40 : 16;
  const canvasWidth = editorWidth + padX * 2;
  const canvasHeight = innerEditorHeight + padY * 2;

  const editorX = padX;
  const editorY = padY;

  // Code line layout
  const lineNumWidth = showLineNumbers ? 44 : 0;
  const codeStartX = editorX + 20 + lineNumWidth;
  const dividerX = editorX + 16 + lineNumWidth;

  let currentY = editorY + headerHeight + (descHeight > 0 ? descHeight + 12 : 0) + editorPaddingY + 4;

  const codeSvgElements: string[] = [];

  codeLines.forEach((lineStr, index) => {
    const lineNum = index + 1;
    const yPos = currentY + index * lineHeight;

    // Line number element
    if (showLineNumbers) {
      codeSvgElements.push(
        `<text x="${dividerX - 10}" y="${yPos}" text-anchor="end" font-family="${fontMono}" font-size="12" fill="${theme.lineNum}">${lineNum}</text>`
      );
    }

    // Tokenized syntax highlighted line
    const tokens = tokenizeLine(lineStr, language);
    let tspans = '';
    tokens.forEach((t) => {
      const color = getTokenColor(t);
      const isItalic = t.type === 'comment' ? ' font-style="italic"' : '';
      tspans += `<tspan fill="${color}"${isItalic}>${escapeXml(t.text)}</tspan>`;
    });

    codeSvgElements.push(
      `<text x="${codeStartX}" y="${yPos}" xml:space="preserve" font-family="${fontMono}" font-size="13">${tspans}</text>`
    );
  });

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${canvasWidth} ${canvasHeight}" width="${canvasWidth}" height="${canvasHeight}">
  <defs>
    <!-- Backdrop Gradient -->
    <linearGradient id="bgGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${theme.gradientStart}" />
      <stop offset="100%" stop-color="${theme.gradientEnd}" />
    </linearGradient>

    <!-- Editor Shadow -->
    <filter id="editorShadow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="16" stdDeviation="20" flood-color="#000000" flood-opacity="0.45" />
    </filter>
  </defs>

  <!-- Background Canvas Backdrop -->
  ${
    showBackdrop
      ? `<rect width="100%" height="100%" fill="url(#bgGradient)" rx="16" />`
      : `<rect width="100%" height="100%" fill="${theme.canvasBg}" />`
  }

  <!-- Main IDE Window -->
  <g filter="url(#editorShadow)">
    <rect x="${editorX}" y="${editorY}" width="${editorWidth}" height="${innerEditorHeight}" rx="12" fill="${theme.bg}" stroke="${theme.border}" stroke-width="1.2" />

    <!-- Window Title Bar -->
    <path d="M ${editorX} ${editorY + 12} A 12 12 0 0 1 ${editorX + 12} ${editorY} L ${editorX + editorWidth - 12} ${editorY} A 12 12 0 0 1 ${editorX + editorWidth} ${editorY + 12} L ${editorX + editorWidth} ${editorY + headerHeight} L ${editorX} ${editorY + headerHeight} Z" fill="${theme.titleBar}" />
    
    <!-- macOS Traffic Light Buttons -->
    <circle cx="${editorX + 20}" cy="${editorY + 21}" r="5.5" fill="#ff5f56" />
    <circle cx="${editorX + 38}" cy="${editorY + 21}" r="5.5" fill="#ffbd2e" />
    <circle cx="${editorX + 56}" cy="${editorY + 21}" r="5.5" fill="#27c93f" />

    <!-- Active Editor Tab -->
    <rect x="${editorX + 80}" y="${editorY + 8}" width="180" height="34" rx="6" fill="${theme.tabBg}" stroke="${theme.border}" stroke-width="0.8" />
    <rect x="${editorX + 80}" y="${editorY + 40}" width="180" height="2" fill="${theme.tabBorder}" />
    
    <!-- Tab Icon (Document Symbol) -->
    <text x="${editorX + 96}" y="${editorY + 26}" font-family="${fontSans}" font-size="12" fill="${theme.tabBorder}">📄</text>
    <text x="${editorX + 116}" y="${editorY + 26}" font-family="${fontMono}" font-size="12" font-weight="600" fill="#e6edf3">${escapeXml(filename)}</text>
    <text x="${editorX + 242}" y="${editorY + 26}" font-family="${fontSans}" font-size="12" fill="${theme.lineNum}">×</text>

    <!-- Header Title Label (Center-Right) -->
    <text x="${editorX + editorWidth - 20}" y="${editorY + 26}" text-anchor="end" font-family="${fontMono}" font-size="11" font-weight="600" fill="${theme.lineNum}">${escapeXml(options.title)}</text>

    <!-- Optional Description Docstring Box -->
    ${
      descHeight > 0
        ? `
    <g transform="translate(${editorX + 16}, ${editorY + headerHeight + 10})">
      <rect width="${editorWidth - 32}" height="${descHeight}" rx="6" fill="${theme.descBg}" stroke="${theme.descBorder}" stroke-width="1" />
      <text x="14" y="20" font-family="${fontSans}" font-size="11" font-weight="700" fill="${theme.descText}">// 💡 DESCRIPTION</text>
      ${descLines
        .map(
          (dLine, dIdx) =>
            `<text x="14" y="${36 + dIdx * 18}" font-family="${fontSans}" font-size="12" fill="#c9d1d9">${escapeXml(dLine)}</text>`
        )
        .join('\n      ')}
    </g>`
        : ''
    }

    <!-- Vertical Line Number Divider -->
    ${
      showLineNumbers
        ? `<line x1="${dividerX}" y1="${editorY + headerHeight + (descHeight > 0 ? descHeight + 12 : 0) + 6}" x2="${dividerX}" y2="${editorY + innerEditorHeight - statusBarHeight - 6}" stroke="${theme.lineDivider}" stroke-width="1" />`
        : ''
    }

    <!-- Syntax Highlighted Code Lines -->
    <g>
      ${codeSvgElements.join('\n      ')}
    </g>

    <!-- IDE Status Bar (Footer) -->
    <path d="M ${editorX} ${editorY + innerEditorHeight - statusBarHeight} L ${editorX + editorWidth} ${editorY + innerEditorHeight - statusBarHeight} L ${editorX + editorWidth} ${editorY + innerEditorHeight - 12} A 12 12 0 0 1 ${editorX + editorWidth - 12} ${editorY + innerEditorHeight} L ${editorX + 12} ${editorY + innerEditorHeight} A 12 12 0 0 1 ${editorX} ${editorY + innerEditorHeight - 12} Z" fill="${theme.titleBar}" />
    
    <!-- Status Bar Left: Language & Encoding -->
    <text x="${editorX + 16}" y="${editorY + innerEditorHeight - 10}" font-family="${fontMono}" font-size="10" font-weight="600" fill="${theme.lineNum}">● ${escapeXml(language.toUpperCase())}  •  UTF-8</text>

    <!-- Status Bar Right: Line count & Branding -->
    <text x="${editorX + editorWidth - 16}" y="${editorY + innerEditorHeight - 10}" text-anchor="end" font-family="${fontMono}" font-size="10" font-weight="600" fill="${theme.lineNum}">Lines: ${codeLines.length}  •  ⚡ DevVault IDE</text>
  </g>
</svg>`;
}

/**
 * Generates a clean, Unicode-framed ASCII IDE code card.
 */
export function formatAsciiCodeCard(options: CodeCardOptions): string {
  const language = options.language || 'typescript';
  const filename = options.filename || getDefaultFilename(options.title, language);
  const rawLines = options.code.replace(/\r\n/g, '\n').split('\n');
  const codeLines = rawLines.length > 0 ? rawLines : [''];
  const description = options.description?.trim();

  // Width calculation
  const maxLineLen = Math.max(
    ...codeLines.map((l) => l.length),
    options.title.length + 8,
    filename.length + 10,
    44
  );
  const width = Math.min(Math.max(maxLineLen + 10, 56), 84);

  const pad = (str: string, targetLen: number) => {
    if (str.length >= targetLen) return str.slice(0, targetLen);
    return str + ' '.repeat(targetLen - str.length);
  };

  const hr = '─'.repeat(width - 2);
  const topHeader = `╭──[ 📄 ${filename} ]${'─'.repeat(Math.max(0, width - filename.length - 11))}╮`;
  const bottom = `╰${'─'.repeat(width - 2)}╯`;

  const rows: string[] = [];

  // Description block if present
  if (description) {
    rows.push(`│ ${pad(`// 💡 ${options.title}`, width - 4)} │`);
    rows.push(`│ ${pad(`// ${description}`, width - 4)} │`);
    rows.push(`├${hr}┤`);
  }

  // Code rows with line numbers
  codeLines.forEach((line, idx) => {
    const num = String(idx + 1).padStart(2, ' ');
    const formatted = `${num} │ ${line}`;
    rows.push(`│ ${pad(formatted, width - 4)} │`);
  });

  rows.push(`├${hr}┤`);
  const footer = `[ ${language.toUpperCase()} • ${codeLines.length} lines • DevVault IDE ]`;
  rows.push(`│ ${pad(footer, width - 4)} │`);

  return [topHeader, ...rows, bottom].join('\n');
}

/**
 * Formats a clean Markdown code block ready for blogs, documentation, and GitHub.
 */
export function formatMarkdownCodeCard(options: CodeCardOptions): string {
  const language = options.language || 'typescript';
  const filename = options.filename || getDefaultFilename(options.title, language);
  const desc = options.description ? `\n# 💡 ${options.description}` : '';

  return [
    `# 📄 ${options.title} (${filename})`,
    desc,
    '',
    `\`\`\`${language}`,
    options.code.trim(),
    '```',
    '',
    `*Shared via DevVault IDE*`,
  ]
    .filter((line) => line !== undefined)
    .join('\n');
}
