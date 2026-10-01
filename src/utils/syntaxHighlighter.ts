export type TokenType =
  | 'comment'
  | 'string'
  | 'placeholder'
  | 'flag'
  | 'keyword'
  | 'command'
  | 'subcommand'
  | 'function'
  | 'variable'
  | 'number'
  | 'operator'
  | 'type'
  | 'punctuation'
  | 'text';

export interface Token {
  text: string;
  type: TokenType;
}

const SHELL_COMMANDS = new Set([
  'git',
  'docker',
  'kubectl',
  'curl',
  'ffmpeg',
  'find',
  'grep',
  'sed',
  'awk',
  'xargs',
  'lsof',
  'kill',
  'pg_dump',
  'pg_restore',
  'tar',
  'ssh',
  'scp',
  'rsync',
  'chmod',
  'chown',
  'systemctl',
  'journalctl',
  'cat',
  'echo',
  'npm',
  'npx',
  'yarn',
  'bun',
  'bunx',
  'pnpm',
  'cargo',
  'pip',
  'python',
  'python3',
  'node',
  'mkdir',
  'rm',
  'rmdir',
  'cp',
  'mv',
  'ls',
  'cd',
  'pwd',
  'head',
  'tail',
  'less',
  'more',
  'which',
  'export',
  'source',
  'alias',
  'sudo',
  'base64',
  'openssl',
  'htop',
  'top',
  'df',
  'du',
  'ps',
  'killall',
  'pkill',
  'zip',
  'unzip',
  'gzip',
  'gunzip',
  'jq',
  'rg',
  'fd',
  'fzf',
]);

const SHELL_SUBCOMMANDS = new Set([
  'commit',
  'checkout',
  'branch',
  'rebase',
  'reset',
  'push',
  'pull',
  'status',
  'log',
  'stash',
  'diff',
  'merge',
  'clone',
  'fetch',
  'remote',
  'tag',
  'cherry-pick',
  'prune',
  'run',
  'build',
  'images',
  'volume',
  'network',
  'exec',
  'stop',
  'start',
  'restart',
  'inspect',
  'logs',
  'port-forward',
  'get',
  'describe',
  'apply',
  'delete',
  'create',
]);

const JS_TS_KEYWORDS = new Set([
  'export',
  'import',
  'from',
  'as',
  'default',
  'function',
  'return',
  'const',
  'let',
  'var',
  'if',
  'else',
  'switch',
  'case',
  'break',
  'continue',
  'for',
  'while',
  'do',
  'try',
  'catch',
  'finally',
  'throw',
  'new',
  'typeof',
  'instanceof',
  'async',
  'await',
  'class',
  'interface',
  'type',
  'extends',
  'implements',
  'public',
  'private',
  'protected',
  'readonly',
  'static',
  'null',
  'undefined',
  'true',
  'false',
  'this',
  'super',
]);

const JS_TS_TYPES = new Set([
  'string',
  'number',
  'boolean',
  'any',
  'unknown',
  'never',
  'void',
  'Promise',
  'Record',
  'Array',
  'Parameters',
  'ReturnType',
  'Partial',
  'Required',
  'Set',
  'Map',
]);

const PYTHON_KEYWORDS = new Set([
  'def',
  'class',
  'return',
  'import',
  'from',
  'as',
  'if',
  'elif',
  'else',
  'for',
  'while',
  'try',
  'except',
  'finally',
  'raise',
  'with',
  'yield',
  'lambda',
  'pass',
  'break',
  'continue',
  'in',
  'is',
  'not',
  'and',
  'or',
  'True',
  'False',
  'None',
  'self',
]);

const SQL_KEYWORDS = new Set([
  'SELECT',
  'FROM',
  'WHERE',
  'INSERT',
  'INTO',
  'UPDATE',
  'DELETE',
  'CREATE',
  'TABLE',
  'DROP',
  'ALTER',
  'JOIN',
  'LEFT',
  'RIGHT',
  'INNER',
  'OUTER',
  'ON',
  'GROUP',
  'BY',
  'ORDER',
  'HAVING',
  'LIMIT',
  'OFFSET',
  'AS',
  'AND',
  'OR',
  'NOT',
  'IN',
  'IS',
  'NULL',
  'LIKE',
  'UNION',
  'ALL',
  'DISTINCT',
  'INDEX',
  'PRIMARY',
  'KEY',
]);

const DOCKERFILE_KEYWORDS = new Set([
  'FROM',
  'RUN',
  'CMD',
  'LABEL',
  'EXPOSE',
  'ENV',
  'ADD',
  'COPY',
  'ENTRYPOINT',
  'VOLUME',
  'USER',
  'WORKDIR',
  'ARG',
  'ONBUILD',
  'STOPSIGNAL',
  'HEALTHCHECK',
  'SHELL',
]);

/**
 * Tokenizes a single line of code according to language context.
 */
export function tokenizeLine(line: string, language: string = 'bash'): Token[] {
  const lang = language.toLowerCase();
  const trimmed = line.trimStart();

  // Full-line comment check
  if (
    trimmed.startsWith('#') ||
    trimmed.startsWith('//') ||
    trimmed.startsWith('--')
  ) {
    return [{ text: line, type: 'comment' }];
  }

  // Regex pattern matcher to slice up the line into semantic tokens
  const tokenRegex =
    /(\{\{[^}]+\}\}|"[^"\\]*(?:\\.[^"\\]*)*"|'[^'\\]*(?:\\.[^'\\]*)*'|`[^`\\]*(?:\\.[^`\\]*)*`|\/\*[\s\S]*?\*\/|\/\/.*$|#.*$|--[a-zA-Z0-9_-]+|-[a-zA-Z0-9]+|\$[a-zA-Z0-9_]+|\b\d+(\.\d+)?\b|=>|===|!==|==|!=|<=|>=|\|\||&&|\|&|>>|<<|\+\+|--|[|><;=!+\-*/%?:&]|[a-zA-Z_][a-zA-Z0-9_-]*|[^\s\w]+|\s+)/g;

  const rawMatches = line.match(tokenRegex) || [line];
  const tokens: Token[] = [];

  for (let i = 0; i < rawMatches.length; i++) {
    const raw = rawMatches[i];
    if (!raw) continue;

    // 1. Template Placeholder: {{PARAM}} or {{PARAM:default}}
    if (raw.startsWith('{{') && raw.endsWith('}}')) {
      tokens.push({ text: raw, type: 'placeholder' });
      continue;
    }

    // 2. Comments
    if (
      raw.startsWith('//') ||
      raw.startsWith('#') ||
      raw.startsWith('/*')
    ) {
      tokens.push({ text: raw, type: 'comment' });
      continue;
    }

    // 3. Strings: "...", '...', `...`
    if (
      (raw.startsWith('"') && raw.endsWith('"')) ||
      (raw.startsWith("'") && raw.endsWith("'")) ||
      (raw.startsWith('`') && raw.endsWith('`'))
    ) {
      tokens.push({ text: raw, type: 'string' });
      continue;
    }

    // 4. CLI Flags: --all, -rf, --volume
    if (/^--?[a-zA-Z0-9_-]+$/.test(raw)) {
      tokens.push({ text: raw, type: 'flag' });
      continue;
    }

    // 5. Environment Variables: $VAR, $PORT
    if (raw.startsWith('$')) {
      tokens.push({ text: raw, type: 'variable' });
      continue;
    }

    // 6. Numbers: 42, 8080, 3.14
    if (/^\b\d+(\.\d+)?\b$/.test(raw)) {
      tokens.push({ text: raw, type: 'number' });
      continue;
    }

    // 7. Operators & Pipes: |, &&, ||, >, <, =>, ===
    if (/^(?:=>|===|!==|==|!=|<=|>=|\|\||&&|\|&|>>|<<|\+\+|--|[|><;=!+\-*/%?:&])$/.test(raw)) {
      tokens.push({ text: raw, type: 'operator' });
      continue;
    }

    // 8. Word classification based on language
    const lowerWord = raw.toLowerCase();
    const upperWord = raw.toUpperCase();

    // Check if next token is '(' -> function call
    const nextToken = rawMatches[i + 1]?.trim();
    const isFunctionCall = nextToken === '(';

    // Shell / Bash context
    if (lang === 'bash' || lang === 'zsh' || lang === 'sh' || lang === 'shell') {
      if (SHELL_COMMANDS.has(lowerWord)) {
        tokens.push({ text: raw, type: 'command' });
      } else if (SHELL_SUBCOMMANDS.has(lowerWord)) {
        tokens.push({ text: raw, type: 'subcommand' });
      } else if (isFunctionCall) {
        tokens.push({ text: raw, type: 'function' });
      } else {
        tokens.push({ text: raw, type: 'text' });
      }
      continue;
    }

    // TypeScript / JavaScript context
    if (
      lang === 'typescript' ||
      lang === 'javascript' ||
      lang === 'ts' ||
      lang === 'js'
    ) {
      if (JS_TS_KEYWORDS.has(raw)) {
        tokens.push({ text: raw, type: 'keyword' });
      } else if (JS_TS_TYPES.has(raw)) {
        tokens.push({ text: raw, type: 'type' });
      } else if (isFunctionCall) {
        tokens.push({ text: raw, type: 'function' });
      } else {
        tokens.push({ text: raw, type: 'text' });
      }
      continue;
    }

    // Python context
    if (lang === 'python' || lang === 'py') {
      if (PYTHON_KEYWORDS.has(raw)) {
        tokens.push({ text: raw, type: 'keyword' });
      } else if (isFunctionCall) {
        tokens.push({ text: raw, type: 'function' });
      } else {
        tokens.push({ text: raw, type: 'text' });
      }
      continue;
    }

    // SQL context
    if (lang === 'sql') {
      if (SQL_KEYWORDS.has(upperWord)) {
        tokens.push({ text: raw, type: 'keyword' });
      } else if (isFunctionCall) {
        tokens.push({ text: raw, type: 'function' });
      } else {
        tokens.push({ text: raw, type: 'text' });
      }
      continue;
    }

    // Dockerfile context
    if (lang === 'dockerfile') {
      if (DOCKERFILE_KEYWORDS.has(upperWord)) {
        tokens.push({ text: raw, type: 'keyword' });
      } else if (SHELL_COMMANDS.has(lowerWord)) {
        tokens.push({ text: raw, type: 'command' });
      } else {
        tokens.push({ text: raw, type: 'text' });
      }
      continue;
    }

    // Fallback language detection
    if (SHELL_COMMANDS.has(lowerWord)) {
      tokens.push({ text: raw, type: 'command' });
    } else if (JS_TS_KEYWORDS.has(raw) || PYTHON_KEYWORDS.has(raw)) {
      tokens.push({ text: raw, type: 'keyword' });
    } else if (isFunctionCall) {
      tokens.push({ text: raw, type: 'function' });
    } else {
      tokens.push({ text: raw, type: 'text' });
    }
  }

  return tokens;
}
