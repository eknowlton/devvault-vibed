/**
 * Terminal Card Formatter
 * Generates ASCII terminal cards, markdown blocks, and SVG images
 * for social sharing (Twitter/X, LinkedIn, Discord, GitHub, Slack).
 */

export interface TerminalCardOptions {
  title?: string;
  prompt?: string;
  username?: string;
  hostname?: string;
  cwd?: string;
  promptSymbol?: string;
  command: string;
  output: string;
  duration?: string;
  exitCode?: number;
  theme?: 'cyberpunk' | 'tokyo' | 'dracula' | 'matrix' | 'minimal';
  comment?: string;
}

/**
 * Extracts and normalizes shell comment lines starting with #.
 */
export function extractCommentLines(comment?: string): string[] {
  if (!comment) return [];
  return comment
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0)
    .map((l) => (l.startsWith('#') ? l : `# ${l}`));
}

/**
 * Builds a prompt string from user, host, cwd, and prompt symbol.
 * Example: ethan@devvault:~$ or root@prod-api-01:/etc#
 */
export function buildPromptString(options: Partial<TerminalCardOptions>): string {
  if (options.username || options.hostname || options.cwd || options.promptSymbol) {
    const user = (options.username || 'dev').trim();
    const host = (options.hostname || 'vault').trim();
    const cwd = (options.cwd || '~').trim();
    const symbol = options.promptSymbol || (user === 'root' ? '#' : '$');
    return `${user}@${host}:${cwd}${symbol}`;
  }
  return options.prompt || 'dev@vault:~$';
}

/**
 * Generates a clean, Unicode-framed ASCII terminal card.
 */
export function formatAsciiTerminalCard(options: TerminalCardOptions): string {
  const prompt = options.prompt || buildPromptString(options);
  const command = options.command.trim();
  const output = (options.output || '✔ Command completed successfully.').trim();
  const duration = options.duration || '120ms';
  const exitCode = options.exitCode ?? 0;
  const exitStatus = exitCode === 0 ? '✔ exit 0' : `✘ exit ${exitCode}`;

  const commentLines = extractCommentLines(options.comment);
  const cmdLines = command.split('\n');
  const outLines = output.split('\n');

  // Calculate width
  const allLines = [...commentLines, `$ ${cmdLines[0]}`, ...cmdLines.slice(1), ...outLines];
  const maxLineLen = Math.max(...allLines.map((l) => l.length), 40, prompt.length + 8);
  const width = Math.min(Math.max(maxLineLen + 4, 52), 76);

  const pad = (str: string, targetLen: number) => {
    if (str.length >= targetLen) return str.slice(0, targetLen);
    return str + ' '.repeat(targetLen - str.length);
  };

  const hr = '─'.repeat(width - 2);
  const promptHeader = `╭──[ ${prompt} ]${'─'.repeat(Math.max(0, width - prompt.length - 8))}╮`;
  const footerStatus = `[ ${exitStatus}  •  ⚡ ${duration}  •  DevVault ]`;
  const footerLine = `│ ${pad(footerStatus, width - 4)} │`;
  const bottom = `╰${'─'.repeat(width - 2)}╯`;

  const bodyRows: string[] = [];
  if (commentLines.length > 0) {
    commentLines.forEach((cLine) => {
      bodyRows.push(`│ ${pad(cLine, width - 4)} │`);
    });
  }
  cmdLines.forEach((line, idx) => {
    const prefix = idx === 0 ? '$ ' : '  ';
    bodyRows.push(`│ ${pad(prefix + line, width - 4)} │`);
  });

  bodyRows.push(`├${hr}┤`);

  outLines.forEach((line) => {
    bodyRows.push(`│ ${pad(line, width - 4)} │`);
  });

  bodyRows.push(`│ ${pad('', width - 4)} │`);
  bodyRows.push(footerLine);

  return [promptHeader, ...bodyRows, bottom].join('\n');
}

/**
 * Generates a GitHub / Markdown formatted code block.
 */
export function formatMarkdownTerminal(options: TerminalCardOptions): string {
  const prompt = options.prompt || buildPromptString(options);
  const duration = options.duration || '120ms';
  const exitCode = options.exitCode ?? 0;
  const exitStatus = exitCode === 0 ? 'exit 0' : `exit ${exitCode}`;
  const hostInfo =
    options.username && options.hostname
      ? `# [${options.username}@${options.hostname}:${options.cwd || '~'}]\n`
      : '';
  const commentLines = extractCommentLines(options.comment);
  const commentBlock = commentLines.length > 0 ? commentLines.join('\n') + '\n' : '';

  return [
    '```bash',
    `${hostInfo}${commentBlock}${prompt} ${options.command}`,
    '',
    options.output.trim(),
    '',
    `# [✔ ${exitStatus} • ⚡ ${duration} • DevVault]`,
    '```',
  ].join('\n');
}

/**
 * Generates a standalone SVG image card with macOS window controls and vibrant terminal styling.
 */
export function generateSvgTerminalCard(options: TerminalCardOptions): string {
  const prompt = options.prompt || buildPromptString(options);
  const command = options.command.trim();
  const output = (options.output || '✔ Command completed successfully.').trim();
  const duration = options.duration || '120ms';
  const exitCode = options.exitCode ?? 0;
  const exitStatus = exitCode === 0 ? 'exit 0' : `exit ${exitCode}`;
  const windowTitle =
    options.title ||
    (options.username && options.hostname
      ? `${options.username}@${options.hostname}: ${options.cwd || '~'} (zsh)`
      : 'DevVault Terminal Emulation');

  const themeColors = {
    cyberpunk: { bg: '#0d1117', border: '#58a6ff', glow: '#bc8cff', prompt: '#56d4dd' },
    tokyo: { bg: '#1a1b26', border: '#7aa2f7', glow: '#bb9af7', prompt: '#7dcfff' },
    dracula: { bg: '#282a36', border: '#bd93f9', glow: '#ff79c6', prompt: '#50fa7b' },
    matrix: { bg: '#0d1117', border: '#3fb950', glow: '#2ea043', prompt: '#3fb950' },
    minimal: { bg: '#161b22', border: '#30363d', glow: '#58a6ff', prompt: '#8b949e' },
  };

  const t = themeColors[options.theme || 'cyberpunk'];
  const commentLines = extractCommentLines(options.comment);
  const cmdLines = command.split('\n');
  const outLines = output.split('\n');

  const lineHeight = 20;
  const totalLines = commentLines.length + cmdLines.length + outLines.length + 3;
  const cardHeight = Math.max(260, 90 + totalLines * lineHeight);
  const cardWidth = 720;

  const escapeXml = (unsafe: string) =>
    unsafe
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');

  let y = 80;
  const textElements: string[] = [];

  // Shell comments
  if (commentLines.length > 0) {
    commentLines.forEach((cLine) => {
      textElements.push(
        `<text x="32" y="${y}" font-family="monospace" font-size="13" font-style="italic" fill="#8b949e">${escapeXml(cLine)}</text>`
      );
      y += lineHeight;
    });
  }

  // Command lines
  cmdLines.forEach((line, idx) => {
    if (idx === 0) {
      const promptSpacing = prompt.endsWith(' ') ? prompt : `${prompt} `;
      textElements.push(
        `<text x="32" y="${y}" font-family="monospace" font-size="13" font-weight="bold" fill="${t.prompt}">${escapeXml(promptSpacing)}</text>` +
        `<text x="${32 + promptSpacing.length * 8}" y="${y}" font-family="monospace" font-size="13" font-weight="600" fill="#f0f6fc">${escapeXml(line)}</text>`
      );
    } else {
      textElements.push(
        `<text x="32" y="${y}" font-family="monospace" font-size="13" fill="#c9d1d9">${escapeXml(line)}</text>`
      );
    }
    y += lineHeight;
  });

  y += 8;
  // Output lines
  outLines.forEach((line) => {
    const isSuccess = line.includes('✔') || line.toLowerCase().includes('success');
    const isWarning = line.includes('⚠️') || line.toLowerCase().includes('warn');
    const isError = line.includes('✘') || line.toLowerCase().includes('error');

    let fillColor = '#8b949e';
    if (isSuccess) fillColor = '#3fb950';
    else if (isWarning) fillColor = '#d29922';
    else if (isError) fillColor = '#f85149';

    textElements.push(
      `<text x="32" y="${y}" font-family="monospace" font-size="12" fill="${fillColor}">${escapeXml(line)}</text>`
    );
    y += lineHeight;
  });

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${cardWidth} ${cardHeight}" width="${cardWidth}" height="${cardHeight}">
  <defs>
    <linearGradient id="cardBorderGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${t.border}" />
      <stop offset="100%" stop-color="${t.glow}" />
    </linearGradient>
    <filter id="shadow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="12" stdDeviation="16" flood-color="${t.border}" flood-opacity="0.25" />
    </filter>
  </defs>

  <!-- Background Canvas -->
  <rect width="100%" height="100%" fill="#090d12" />

  <!-- Outer Card with Border Glow -->
  <rect x="16" y="16" width="${cardWidth - 32}" height="${cardHeight - 32}" rx="12" fill="${t.bg}" stroke="url(#cardBorderGrad)" stroke-width="1.5" filter="url(#shadow)" />

  <!-- Terminal Window Title Bar -->
  <rect x="16" y="16" width="${cardWidth - 32}" height="36" rx="12" fill="rgba(255, 255, 255, 0.04)" />
  <circle cx="36" cy="34" r="5.5" fill="#ff5f56" />
  <circle cx="54" cy="34" r="5.5" fill="#ffbd2e" />
  <circle cx="72" cy="34" r="5.5" fill="#27c93f" />

  <!-- Window Title -->
  <text x="${cardWidth / 2}" y="38" text-anchor="middle" font-family="monospace" font-size="11" font-weight="600" fill="#6e7681">${escapeXml(windowTitle)}</text>

  <!-- Status Badges -->
  <rect x="${cardWidth - 165}" y="26" width="60" height="18" rx="9" fill="rgba(63, 185, 80, 0.15)" stroke="#3fb950" stroke-width="0.8" />
  <text x="${cardWidth - 135}" y="38" text-anchor="middle" font-family="monospace" font-size="10" font-weight="700" fill="#3fb950">● ${exitStatus}</text>

  <rect x="${cardWidth - 95}" y="26" width="65" height="18" rx="9" fill="rgba(88, 166, 255, 0.15)" stroke="#58a6ff" stroke-width="0.8" />
  <text x="${cardWidth - 62}" y="38" text-anchor="middle" font-family="monospace" font-size="10" font-weight="700" fill="#58a6ff">⚡ ${escapeXml(duration)}</text>

  <!-- Terminal Body Content -->
  ${textElements.join('\n  ')}
</svg>`;
}
