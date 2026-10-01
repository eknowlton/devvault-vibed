import React, { useEffect, useState } from 'react';
import {
  Linking,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { Snippet } from '../types/snippet';
import { copyToClipboard } from '../utils/clipboard';
import {
  CodeCardOptions,
  formatAsciiCodeCard,
  formatMarkdownCodeCard,
  generateSvgCodeCard,
  getDefaultFilename,
  IDE_THEMES,
  IdeTheme,
} from '../utils/codeSnippetCardFormatter';
import { SyntaxCodeBlock } from './SyntaxCodeBlock';

interface CodeSnippetCardModalProps {
  visible: boolean;
  snippet: Snippet | null;
  onClose: () => void;
}

type TabMode = 'preview' | 'customize' | 'share';

export const CodeSnippetCardModal: React.FC<CodeSnippetCardModalProps> = ({
  visible,
  snippet,
  onClose,
}) => {
  if (!snippet) return null;

  const [activeTab, setActiveTab] = useState<TabMode>('preview');
  const [filename, setFilename] = useState('');
  const [description, setDescription] = useState('');
  const [theme, setTheme] = useState<IdeTheme>('vscode');
  const [showLineNumbers, setShowLineNumbers] = useState(true);
  const [showBackdrop, setShowBackdrop] = useState(true);
  const [copiedNotification, setCopiedNotification] = useState<string | null>(null);

  // Initialize state when snippet opens
  useEffect(() => {
    if (snippet) {
      setFilename(getDefaultFilename(snippet.title, snippet.language));
      setDescription(snippet.description || '');
      setActiveTab('preview');
    }
  }, [snippet?.id, visible]);

  const showToast = (msg: string) => {
    setCopiedNotification(msg);
    setTimeout(() => setCopiedNotification(null), 2400);
  };

  const getCardOptions = (): CodeCardOptions => ({
    title: snippet.title,
    description: description.trim() || undefined,
    code: snippet.content,
    language: snippet.language || 'typescript',
    filename: filename.trim() || getDefaultFilename(snippet.title, snippet.language),
    tags: snippet.tags,
    theme,
    showLineNumbers,
    showBackdrop,
    watermark: true,
  });

  const handleCopyAscii = async () => {
    const ascii = formatAsciiCodeCard(getCardOptions());
    const ok = await copyToClipboard(ascii);
    if (ok) showToast('ASCII Code Card Copied!');
  };

  const handleCopyMarkdown = async () => {
    const md = formatMarkdownCodeCard(getCardOptions());
    const ok = await copyToClipboard(md);
    if (ok) showToast('Markdown Codeblock Copied!');
  };

  const handleCopySvgCode = async () => {
    const svg = generateSvgCodeCard(getCardOptions());
    const ok = await copyToClipboard(svg);
    if (ok) showToast('SVG XML Code Copied to Clipboard!');
  };

  const handleDownloadSvg = () => {
    const svg = generateSvgCodeCard(getCardOptions());
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const downloadName = (filename.trim() || snippet.title.replace(/\s+/g, '-').toLowerCase()) + '.svg';
      link.download = downloadName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      showToast('SVG Code Card Downloaded!');
    } else {
      handleCopyAscii();
    }
  };

  const handleShareTwitter = () => {
    const descText = description ? `\n\n💡 ${description}` : '';
    const text = `📄 ${snippet.title} (${filename})${descText}\n\n\`\`\`${snippet.language}\n${snippet.content.slice(0, 160)}${snippet.content.length > 160 ? '...' : ''}\n\`\`\`\n\n#DevVault #Coding #WebDev`;
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
    Linking.openURL(url).catch(() => {});
  };

  const handleShareLinkedIn = () => {
    const descText = description ? `\n\n💡 ${description}` : '';
    const text = `📄 ${snippet.title} (${filename})${descText}\n\n${snippet.content}`;
    const url = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent('https://github.com')}&summary=${encodeURIComponent(text)}`;
    Linking.openURL(url).catch(() => {});
  };

  const currentThemeConfig = IDE_THEMES[theme];

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={styles.ideIconWrap}>
                <Ionicons name="code-working" size={18} color={colors.primary} />
              </View>
              <View>
                <Text style={styles.headerTitle}>Code Snippet Social Card</Text>
                <Text style={styles.headerSubtitle} numberOfLines={1}>
                  {snippet.title}
                </Text>
              </View>
            </View>

            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Toast Notification Banner */}
          {copiedNotification && (
            <View style={styles.toastBanner}>
              <Ionicons name="checkmark-circle" size={16} color={colors.accentGreen} />
              <Text style={styles.toastText}>{copiedNotification}</Text>
            </View>
          )}

          {/* Tab Navigation */}
          <View style={styles.tabBar}>
            <TouchableOpacity
              style={[styles.tabBtn, activeTab === 'preview' && styles.tabBtnActive]}
              onPress={() => setActiveTab('preview')}
            >
              <Ionicons
                name="image-outline"
                size={15}
                color={activeTab === 'preview' ? colors.primary : colors.textMuted}
              />
              <Text style={[styles.tabText, activeTab === 'preview' && styles.tabTextActive]}>
                IDE Preview
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tabBtn, activeTab === 'customize' && styles.tabBtnActive]}
              onPress={() => setActiveTab('customize')}
            >
              <Ionicons
                name="color-palette-outline"
                size={15}
                color={activeTab === 'customize' ? colors.primary : colors.textMuted}
              />
              <Text style={[styles.tabText, activeTab === 'customize' && styles.tabTextActive]}>
                Themes & Options
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tabBtn, activeTab === 'share' && styles.tabBtnActive]}
              onPress={() => setActiveTab('share')}
            >
              <Ionicons
                name="share-social-outline"
                size={15}
                color={activeTab === 'share' ? colors.primary : colors.textMuted}
              />
              <Text style={[styles.tabText, activeTab === 'share' && styles.tabTextActive]}>
                Export & Social
              </Text>
            </TouchableOpacity>
          </View>

          {/* Body Content */}
          <ScrollView style={styles.body} contentContainerStyle={styles.scrollBody} showsVerticalScrollIndicator={true}>
            {/* 1. PREVIEW TAB */}
            {activeTab === 'preview' && (
              <View style={styles.tabContent}>
                {/* Backdrop Wrapper for floating IDE effect */}
                <View
                  style={[
                    styles.backdropCanvas,
                    showBackdrop
                      ? { backgroundColor: currentThemeConfig.gradientStart, borderColor: currentThemeConfig.border }
                      : { backgroundColor: 'transparent', borderColor: 'transparent', padding: 0 },
                  ]}
                >
                  {/* Simulated IDE Window */}
                  <View
                    style={[
                      styles.ideWindow,
                      {
                        backgroundColor: currentThemeConfig.bg,
                        borderColor: currentThemeConfig.border,
                      },
                    ]}
                  >
                    {/* IDE Title Bar & Tab */}
                    <View
                      style={[
                        styles.ideTitleBar,
                        {
                          backgroundColor: currentThemeConfig.titleBar,
                          borderBottomColor: currentThemeConfig.border,
                        },
                      ]}
                    >
                      {/* Traffic Lights */}
                      <View style={styles.trafficLights}>
                        <View style={[styles.trafficDot, { backgroundColor: '#ff5f56' }]} />
                        <View style={[styles.trafficDot, { backgroundColor: '#ffbd2e' }]} />
                        <View style={[styles.trafficDot, { backgroundColor: '#27c93f' }]} />
                      </View>

                      {/* Active File Tab */}
                      <View
                        style={[
                          styles.activeTabItem,
                          {
                            backgroundColor: currentThemeConfig.tabBg,
                            borderColor: currentThemeConfig.border,
                            borderBottomColor: currentThemeConfig.tabBorder,
                          },
                        ]}
                      >
                        <Text style={styles.tabIcon}>📄</Text>
                        <Text style={styles.tabFilenameText} numberOfLines={1}>
                          {filename || getDefaultFilename(snippet.title, snippet.language)}
                        </Text>
                        <Text style={[styles.tabCloseX, { color: currentThemeConfig.lineNum }]}>×</Text>
                      </View>

                      {/* Language Badge */}
                      <View style={styles.langPill}>
                        <Text style={styles.langPillText}>
                          {(snippet.language || 'ts').toUpperCase()}
                        </Text>
                      </View>
                    </View>

                    {/* Description Docstring Banner */}
                    {description.trim() ? (
                      <View
                        style={[
                          styles.descBanner,
                          {
                            backgroundColor: currentThemeConfig.descBg,
                            borderColor: currentThemeConfig.descBorder,
                          },
                        ]}
                      >
                        <View style={styles.descTitleRow}>
                          <Ionicons name="bulb-outline" size={13} color={currentThemeConfig.descText} />
                          <Text style={[styles.descTitleText, { color: currentThemeConfig.descText }]}>
                            DESCRIPTION & NOTES
                          </Text>
                        </View>
                        <Text style={styles.descBodyText}>{description}</Text>
                      </View>
                    ) : null}

                    {/* Code Editor Body */}
                    <View style={styles.ideCodeArea}>
                      <SyntaxCodeBlock
                        code={snippet.content}
                        language={snippet.language}
                        showLineNumbers={showLineNumbers}
                        collapsible={false}
                        defaultExpanded={true}
                      />
                    </View>

                    {/* IDE Status Bar */}
                    <View
                      style={[
                        styles.ideStatusBar,
                        {
                          backgroundColor: currentThemeConfig.titleBar,
                          borderTopColor: currentThemeConfig.border,
                        },
                      ]}
                    >
                      <Text style={[styles.statusBarText, { color: currentThemeConfig.lineNum }]}>
                        ● {(snippet.language || 'ts').toUpperCase()}  •  UTF-8
                      </Text>
                      <Text style={[styles.statusBarText, { color: currentThemeConfig.lineNum }]}>
                        {snippet.content.split('\n').length} lines  •  DevVault IDE
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Quick Export Actions Strip */}
                <View style={styles.quickExportStrip}>
                  <Text style={styles.quickExportLabel}>QUICK EXPORT:</Text>
                  {Platform.OS === 'web' && (
                    <TouchableOpacity style={styles.quickActionPill} onPress={handleDownloadSvg}>
                      <Ionicons name="download-outline" size={13} color={colors.accentPurple} />
                      <Text style={styles.quickActionPillText}>SVG Image</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity style={styles.quickActionPill} onPress={handleCopyAscii}>
                    <Ionicons name="copy-outline" size={13} color={colors.textPrimary} />
                    <Text style={styles.quickActionPillText}>ASCII Frame</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.quickActionPill} onPress={handleCopyMarkdown}>
                    <Ionicons name="logo-markdown" size={13} color={colors.textPrimary} />
                    <Text style={styles.quickActionPillText}>Markdown</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.quickActionPill} onPress={handleShareTwitter}>
                    <Ionicons name="logo-twitter" size={13} color="#1da1f2" />
                    <Text style={styles.quickActionPillText}>Post to X</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* 2. CUSTOMIZE TAB */}
            {activeTab === 'customize' && (
              <View style={styles.tabContent}>
                <View style={styles.settingsGrid}>
                  {/* Theme Selector */}
                  <View style={styles.formGroup}>
                    <Text style={styles.inputLabel}>EDITOR THEME</Text>
                    <View style={styles.themeSelectorRow}>
                      {(
                        [
                          { key: 'vscode', label: 'VS Code Dark', dot: '#007acc' },
                          { key: 'onedark', label: 'One Dark Pro', dot: '#61afef' },
                          { key: 'dracula', label: 'Dracula', dot: '#bd93f9' },
                          { key: 'nord', label: 'Nord Frost', dot: '#88c0d0' },
                          { key: 'cyberpunk', label: 'Cyberpunk', dot: '#58a6ff' },
                          { key: 'minimal', label: 'Obsidian Minimal', dot: '#6e7681' },
                        ] as { key: IdeTheme; label: string; dot: string }[]
                      ).map((t) => (
                        <TouchableOpacity
                          key={t.key}
                          style={[styles.themeChip, theme === t.key && styles.themeChipActive]}
                          onPress={() => setTheme(t.key)}
                        >
                          <View style={[styles.themeDot, { backgroundColor: t.dot }]} />
                          <Text style={[styles.themeChipText, theme === t.key && styles.themeChipTextActive]}>
                            {t.label}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>

                  {/* File Name Editor */}
                  <View style={styles.formGroup}>
                    <View style={styles.labelWithActions}>
                      <Text style={styles.inputLabel}>FILE TAB NAME</Text>
                      <TouchableOpacity
                        style={styles.presetBtn}
                        onPress={() => setFilename(getDefaultFilename(snippet.title, snippet.language))}
                      >
                        <Text style={styles.presetBtnText}>Reset to Default</Text>
                      </TouchableOpacity>
                    </View>
                    <TextInput
                      style={styles.textInput}
                      value={filename}
                      onChangeText={setFilename}
                      placeholder="e.g. useDebounce.ts, api.py, query.sql"
                      placeholderTextColor={colors.textMuted}
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                    <Text style={styles.fieldHelpText}>
                      Renders in the editor tab bar with file extension icon.
                    </Text>
                  </View>

                  {/* Description Editor */}
                  <View style={styles.formGroup}>
                    <View style={styles.labelWithActions}>
                      <Text style={styles.inputLabel}>DESCRIPTION / DOCUMENTATION</Text>
                      <View style={styles.presetButtons}>
                        {snippet.description ? (
                          <TouchableOpacity
                            style={styles.presetBtn}
                            onPress={() => setDescription(snippet.description)}
                          >
                            <Text style={styles.presetBtnText}>From Snippet</Text>
                          </TouchableOpacity>
                        ) : null}
                        {description ? (
                          <TouchableOpacity style={styles.presetBtn} onPress={() => setDescription('')}>
                            <Text style={styles.presetBtnText}>Clear</Text>
                          </TouchableOpacity>
                        ) : null}
                      </View>
                    </View>
                    <TextInput
                      style={[styles.textInput, styles.descTextArea]}
                      value={description}
                      onChangeText={setDescription}
                      placeholder="Add an explanation or notes to appear above the code in the social card..."
                      placeholderTextColor={colors.textMuted}
                      multiline
                      numberOfLines={3}
                      autoCapitalize="none"
                    />
                    <Text style={styles.fieldHelpText}>
                      Renders as an annotated docstring box above the code.
                    </Text>
                  </View>

                  {/* Options Toggles */}
                  <View style={styles.togglesRow}>
                    <TouchableOpacity
                      style={[styles.toggleCard, showLineNumbers && styles.toggleCardActive]}
                      onPress={() => setShowLineNumbers((prev) => !prev)}
                    >
                      <Ionicons
                        name={showLineNumbers ? 'checkbox' : 'square-outline'}
                        size={18}
                        color={showLineNumbers ? colors.primary : colors.textMuted}
                      />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.toggleTitle}>Line Numbers</Text>
                        <Text style={styles.toggleDesc}>Show vertical line number gutter</Text>
                      </View>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.toggleCard, showBackdrop && styles.toggleCardActive]}
                      onPress={() => setShowBackdrop((prev) => !prev)}
                    >
                      <Ionicons
                        name={showBackdrop ? 'checkbox' : 'square-outline'}
                        size={18}
                        color={showBackdrop ? colors.primary : colors.textMuted}
                      />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.toggleTitle}>Wallpaper Backdrop</Text>
                        <Text style={styles.toggleDesc}>Gradient canvas around the IDE window</Text>
                      </View>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            )}

            {/* 3. SHARE TAB */}
            {activeTab === 'share' && (
              <View style={styles.tabContent}>
                <Text style={styles.shareHeading}>Export Code Snippet Card</Text>
                <Text style={styles.shareSubtitle}>
                  Share high-resolution vector images or formatted text code blocks across social media and developer tools.
                </Text>

                <View style={styles.shareCardsGrid}>
                  {/* SVG Download (Web) */}
                  {Platform.OS === 'web' && (
                    <View style={styles.shareOptionCard}>
                      <View style={styles.shareOptionHeader}>
                        <View style={[styles.shareOptionIconBox, { backgroundColor: 'rgba(210, 168, 255, 0.15)' }]}>
                          <Ionicons name="image-outline" size={18} color={colors.accentPurple} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.shareOptionTitle}>Vector SVG Image</Text>
                          <Text style={styles.shareOptionDesc}>
                            Download high-res vector graphics card with syntax highlighting, IDE tabs, and drop shadow.
                          </Text>
                        </View>
                      </View>
                      <View style={styles.btnRow}>
                        <TouchableOpacity
                          style={[styles.shareActionBtn, { borderColor: colors.accentPurple }]}
                          onPress={handleDownloadSvg}
                        >
                          <Ionicons name="download-outline" size={15} color={colors.accentPurple} />
                          <Text style={[styles.shareActionBtnText, { color: colors.accentPurple }]}>
                            Download SVG Image
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.shareActionBtn} onPress={handleCopySvgCode}>
                          <Ionicons name="copy-outline" size={15} color={colors.primary} />
                          <Text style={styles.shareActionBtnText}>Copy SVG XML</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}

                  {/* ASCII Code Box */}
                  <View style={styles.shareOptionCard}>
                    <View style={styles.shareOptionHeader}>
                      <View style={styles.shareOptionIconBox}>
                        <Ionicons name="code-slash" size={18} color={colors.primary} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.shareOptionTitle}>ASCII Editor Box</Text>
                        <Text style={styles.shareOptionDesc}>
                          Unicode monospaced frame with line numbers and header. Perfect for Discord, GitHub, and Reddit.
                        </Text>
                      </View>
                    </View>
                    <TouchableOpacity style={styles.shareActionBtn} onPress={handleCopyAscii}>
                      <Ionicons name="copy-outline" size={15} color={colors.primary} />
                      <Text style={styles.shareActionBtnText}>Copy ASCII Box</Text>
                    </TouchableOpacity>
                  </View>

                  {/* Markdown Block */}
                  <View style={styles.shareOptionCard}>
                    <View style={styles.shareOptionHeader}>
                      <View style={styles.shareOptionIconBox}>
                        <Ionicons name="logo-markdown" size={18} color={colors.secondary} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.shareOptionTitle}>Markdown Codeblock</Text>
                        <Text style={styles.shareOptionDesc}>
                          Formatted with language header and description block for documentation and blog posts.
                        </Text>
                      </View>
                    </View>
                    <TouchableOpacity style={styles.shareActionBtn} onPress={handleCopyMarkdown}>
                      <Ionicons name="copy-outline" size={15} color={colors.secondary} />
                      <Text style={[styles.shareActionBtnText, { color: colors.secondary }]}>
                        Copy Markdown Block
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {/* Twitter / X */}
                  <View style={styles.shareOptionCard}>
                    <View style={styles.shareOptionHeader}>
                      <View style={[styles.shareOptionIconBox, { backgroundColor: 'rgba(29, 161, 242, 0.15)' }]}>
                        <Ionicons name="logo-twitter" size={18} color="#1da1f2" />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.shareOptionTitle}>Share on X / Twitter</Text>
                        <Text style={styles.shareOptionDesc}>
                          Opens a formatted post with snippet name, code preview, description, and hashtags.
                        </Text>
                      </View>
                    </View>
                    <TouchableOpacity
                      style={[styles.shareActionBtn, { borderColor: '#1da1f2' }]}
                      onPress={handleShareTwitter}
                    >
                      <Ionicons name="open-outline" size={15} color="#1da1f2" />
                      <Text style={[styles.shareActionBtnText, { color: '#1da1f2' }]}>
                        Post to Twitter / X
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {/* LinkedIn */}
                  <View style={styles.shareOptionCard}>
                    <View style={styles.shareOptionHeader}>
                      <View style={[styles.shareOptionIconBox, { backgroundColor: 'rgba(10, 102, 194, 0.15)' }]}>
                        <Ionicons name="logo-linkedin" size={18} color="#0a66c2" />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.shareOptionTitle}>Share on LinkedIn</Text>
                        <Text style={styles.shareOptionDesc}>
                          Share your code snippet directly to professional developer feeds.
                        </Text>
                      </View>
                    </View>
                    <TouchableOpacity
                      style={[styles.shareActionBtn, { borderColor: '#0a66c2' }]}
                      onPress={handleShareLinkedIn}
                    >
                      <Ionicons name="open-outline" size={15} color="#0a66c2" />
                      <Text style={[styles.shareActionBtnText, { color: '#0a66c2' }]}>
                        Share to LinkedIn
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalContainer: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    width: '100%',
    maxWidth: 820,
    maxHeight: '92%',
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  ideIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: 'rgba(88, 166, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    fontFamily: 'monospace',
  },
  headerSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    fontFamily: 'monospace',
    marginTop: 2,
    maxWidth: 500,
  },
  closeBtn: {
    padding: 6,
    borderRadius: 6,
  },
  toastBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(63, 185, 80, 0.18)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(63, 185, 80, 0.3)',
    paddingVertical: 8,
    paddingHorizontal: 20,
  },
  toastText: {
    fontSize: 12,
    color: colors.accentGreen,
    fontFamily: 'monospace',
    fontWeight: '600',
  },
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
  },
  tabBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabBtnActive: {
    borderBottomColor: colors.primary,
    backgroundColor: 'rgba(88, 166, 255, 0.05)',
  },
  tabText: {
    fontSize: 12,
    fontFamily: 'monospace',
    fontWeight: '600',
    color: colors.textMuted,
  },
  tabTextActive: {
    color: colors.primary,
  },
  body: {
    flex: 1,
  },
  scrollBody: {
    padding: 20,
  },
  tabContent: {
    gap: 16,
  },
  // Floating Backdrop Canvas
  backdropCanvas: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Simulated IDE Window
  ideWindow: {
    borderRadius: 10,
    borderWidth: 1.2,
    width: '100%',
    overflow: 'hidden',
    ...(Platform.OS === 'web'
      ? ({
          boxShadow: '0 16px 36px rgba(0, 0, 0, 0.55)',
        } as any)
      : {}),
  },
  ideTitleBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderBottomWidth: 1,
    gap: 12,
  },
  trafficLights: {
    flexDirection: 'row',
    gap: 7,
  },
  trafficDot: {
    width: 11,
    height: 11,
    borderRadius: 6,
  },
  activeTabItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderBottomWidth: 2,
    maxWidth: 260,
  },
  tabIcon: {
    fontSize: 12,
  },
  tabFilenameText: {
    fontSize: 12,
    fontFamily: 'monospace',
    fontWeight: '600',
    color: colors.textPrimary,
  },
  tabCloseX: {
    fontSize: 14,
    marginLeft: 4,
  },
  langPill: {
    marginLeft: 'auto',
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  langPillText: {
    fontSize: 10,
    fontFamily: 'monospace',
    fontWeight: '700',
    color: colors.textMuted,
  },
  descBanner: {
    margin: 14,
    marginBottom: 0,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    gap: 4,
  },
  descTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  descTitleText: {
    fontSize: 11,
    fontFamily: 'monospace',
    fontWeight: '700',
  },
  descBodyText: {
    fontSize: 12,
    color: colors.textPrimary,
    lineHeight: 18,
    marginTop: 2,
  },
  ideCodeArea: {
    padding: 14,
  },
  ideStatusBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderTopWidth: 1,
  },
  statusBarText: {
    fontSize: 10,
    fontFamily: 'monospace',
    fontWeight: '600',
  },
  // Quick Export Strip
  quickExportStrip: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  quickExportLabel: {
    fontSize: 10,
    fontFamily: 'monospace',
    color: colors.textMuted,
    fontWeight: '700',
    marginRight: 4,
  },
  quickActionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
  },
  quickActionPillText: {
    fontSize: 11,
    fontFamily: 'monospace',
    color: colors.textPrimary,
  },
  // Customization Form
  settingsGrid: {
    gap: 16,
  },
  formGroup: {
    gap: 6,
  },
  inputLabel: {
    fontSize: 11,
    fontFamily: 'monospace',
    color: colors.textSecondary,
    fontWeight: '700',
  },
  labelWithActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  presetButtons: {
    flexDirection: 'row',
    gap: 6,
  },
  presetBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  presetBtnText: {
    fontSize: 10,
    fontFamily: 'monospace',
    color: colors.primary,
  },
  textInput: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: colors.textPrimary,
    fontFamily: 'monospace',
    fontSize: 13,
  },
  descTextArea: {
    minHeight: 80,
    textAlignVertical: 'top',
    lineHeight: 18,
  },
  fieldHelpText: {
    fontSize: 11,
    fontFamily: 'monospace',
    color: colors.textMuted,
    marginTop: 2,
  },
  themeSelectorRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  themeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  themeChipActive: {
    borderColor: colors.primary,
    backgroundColor: 'rgba(88, 166, 255, 0.12)',
  },
  themeDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
  },
  themeChipText: {
    fontSize: 12,
    fontFamily: 'monospace',
    color: colors.textSecondary,
  },
  themeChipTextActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  togglesRow: {
    flexDirection: 'row',
    gap: 12,
    flexWrap: 'wrap',
  },
  toggleCard: {
    flex: 1,
    minWidth: 200,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 12,
  },
  toggleCardActive: {
    borderColor: colors.primary,
    backgroundColor: 'rgba(88, 166, 255, 0.06)',
  },
  toggleTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
    fontFamily: 'monospace',
  },
  toggleDesc: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
  // Share Tab
  shareHeading: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    fontFamily: 'monospace',
  },
  shareSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 17,
  },
  shareCardsGrid: {
    gap: 12,
  },
  shareOptionCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 10,
    padding: 14,
    gap: 12,
  },
  shareOptionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  shareOptionIconBox: {
    width: 38,
    height: 38,
    borderRadius: 8,
    backgroundColor: 'rgba(88, 166, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  shareOptionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
    fontFamily: 'monospace',
  },
  shareOptionDesc: {
    fontSize: 11,
    color: colors.textSecondary,
    lineHeight: 16,
    marginTop: 2,
  },
  btnRow: {
    flexDirection: 'row',
    gap: 10,
  },
  shareActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: 6,
  },
  shareActionBtnText: {
    fontSize: 12,
    fontFamily: 'monospace',
    color: colors.textPrimary,
    fontWeight: '600',
  },
});
