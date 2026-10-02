import React, { useEffect, useState } from 'react';
import {
  Linking,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { ServerConfig, ServerStatusResponse } from '../types/server';
import {
  getStoredServerConfig,
  persistServerConfig,
} from '../storage/snippetStorage';
import { copyToClipboard } from '../utils/clipboard';

interface ServerModalProps {
  visible: boolean;
  onClose: () => void;
}

export const ServerModal: React.FC<ServerModalProps> = ({
  visible,
  onClose,
}) => {
  const [config, setConfig] = useState<ServerConfig>({
    enabled: false,
    port: 4141,
    apiKey: '',
    allowWrite: false,
  });

  const [serverStatus, setServerStatus] = useState<ServerStatusResponse | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [isStopping, setIsStopping] = useState(false);
  const [serverActionError, setServerActionError] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState(false);
  const [desktopPlatform, setDesktopPlatform] = useState<'win32' | 'linux' | 'darwin' | null>(null);

  const isDesktop =
    Platform.OS === 'web' &&
    typeof window !== 'undefined' &&
    Boolean(window.electronAPI?.isElectron);

  // Load config and platform on open
  useEffect(() => {
    if (visible) {
      setServerActionError(null);
      getStoredServerConfig().then((cfg) => {
        setConfig(cfg);
        checkServerHealth(cfg.port);
      });

      if (isDesktop && window.electronAPI?.getPlatform) {
        window.electronAPI.getPlatform().then((p) => setDesktopPlatform(p)).catch(() => {});
      }
    }
  }, [visible, isDesktop]);

  // Listen to live Electron server state changes
  useEffect(() => {
    if (visible && isDesktop && window.electronAPI?.onServerStateChange) {
      const unsubscribe = window.electronAPI.onServerStateChange((data) => {
        if (data.running) {
          checkServerHealth(data.port || config.port);
        } else {
          setServerStatus(null);
        }
      });
      return () => unsubscribe();
    }
  }, [visible, isDesktop, config.port]);

  const checkServerHealth = async (portNum: number) => {
    setIsChecking(true);
    try {
      if (isDesktop && window.electronAPI?.getServerStatus) {
        const status = await window.electronAPI.getServerStatus();
        if (status && 'running' in status && status.running) {
          setServerStatus(status as ServerStatusResponse);
          setIsChecking(false);
          return;
        } else if (status && 'running' in status && !status.running) {
          setServerStatus(null);
          setIsChecking(false);
          return;
        }
      }

      const url = `http://localhost:${portNum}/api/health`;
      const res = await fetch(url, { method: 'GET' });
      if (res.ok) {
        const data: ServerStatusResponse = await res.json();
        setServerStatus(data);
      } else {
        setServerStatus(null);
      }
    } catch {
      setServerStatus(null);
    } finally {
      setIsChecking(false);
    }
  };

  // In-App Server Controls (Start / Stop directly without CLI)
  const handleStartServer = async () => {
    setIsStarting(true);
    setServerActionError(null);
    try {
      const updatedConfig = { ...config, enabled: true };
      setConfig(updatedConfig);
      await persistServerConfig(updatedConfig);

      if (isDesktop && window.electronAPI?.startServer) {
        const res = await window.electronAPI.startServer(updatedConfig);
        if (!res.success) {
          throw new Error(res.error || 'Failed to start API server in desktop app');
        }
        if (window.electronAPI.getServerStatus) {
          const status = await window.electronAPI.getServerStatus();
          if (status && 'running' in status && status.running) {
            setServerStatus(status as ServerStatusResponse);
          }
        }
      }

      // Small delay for socket initialization, then check health
      setTimeout(async () => {
        await checkServerHealth(updatedConfig.port);
        setIsStarting(false);
      }, 300);
    } catch (err: any) {
      setServerActionError(err.message || 'Error starting server');
      setIsStarting(false);
    }
  };

  const handleStopServer = async () => {
    setIsStopping(true);
    setServerActionError(null);
    try {
      const updatedConfig = { ...config, enabled: false };
      setConfig(updatedConfig);
      await persistServerConfig(updatedConfig);

      if (isDesktop && window.electronAPI?.stopServer) {
        const res = await window.electronAPI.stopServer();
        if (res && !res.success && res.error) {
          throw new Error(res.error);
        }
      } else {
        // Attempt HTTP stop endpoint
        try {
          await fetch(`http://localhost:${config.port}/api/server/stop`, {
            method: 'POST',
            headers: config.apiKey ? { Authorization: `Bearer ${config.apiKey}` } : {},
          });
        } catch {}
      }

      setServerStatus(null);
      setTimeout(() => {
        setServerStatus(null);
        setIsStopping(false);
      }, 300);
    } catch (err: any) {
      setServerActionError(err.message || 'Error stopping server');
      setIsStopping(false);
    }
  };

  const handleRestartServer = async () => {
    await handleStopServer();
    setTimeout(() => {
      handleStartServer();
    }, 400);
  };

  const handleSaveConfig = async () => {
    await persistServerConfig(config);
    setSaveMessage(true);
    setTimeout(() => setSaveMessage(false), 2000);
    checkServerHealth(config.port);
  };

  const handleOpenBrowser = async () => {
    const url = `http://localhost:${serverPort}/api/health`;
    if (isDesktop && window.electronAPI?.openExternal) {
      await window.electronAPI.openExternal(url);
    } else {
      Linking.openURL(url);
    }
  };

  const handleCopyCommand = async (text: string, key: string) => {
    const success = await copyToClipboard(text);
    if (success) {
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2000);
    }
  };

  const serverPort = config.port || 4141;
  const startCommand = `npm run api:start`;

  const curlCommands = `curl -s http://localhost:${serverPort}/api/commands`;
  const curlRecipes = `curl -s http://localhost:${serverPort}/api/recipes`;
  const curlPublic = `curl -s http://localhost:${serverPort}/api/snippets`;
  const curlSearch = `curl -s "http://localhost:${serverPort}/api/snippets/search?q=docker"`;
  const curlRaw = `curl -s http://localhost:${serverPort}/api/raw/seed-git-undo-commit`;
  const curlAuth = config.apiKey
    ? `curl -s -H "Authorization: Bearer ${config.apiKey}" http://localhost:${serverPort}/api/snippets`
    : `curl -s -H "Authorization: Bearer YOUR_API_KEY" http://localhost:${serverPort}/api/snippets`;

  const getPlatformLabel = () => {
    if (desktopPlatform === 'win32') return 'Windows Desktop Edition';
    if (desktopPlatform === 'darwin') return 'macOS Desktop Edition';
    if (desktopPlatform === 'linux') return 'Linux Desktop Edition';
    if (isDesktop) return 'Desktop Edition';
    return 'Web / Browser Edition';
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.titleRow}>
              <View style={[styles.statusDot, serverStatus ? styles.dotGreen : styles.dotGray]} />
              <Ionicons name="server-outline" size={20} color={colors.primary} />
              <View>
                <Text style={styles.headerTitle}>API Server & Sharing</Text>
                <Text style={styles.headerSubtitle}>{getPlatformLabel()}</Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.body} contentContainerStyle={styles.scrollBody}>
            {/* IN-APP SERVER POWER & CONTROL PANEL */}
            <View style={styles.powerCard}>
              <View style={styles.powerCardHeader}>
                <View style={styles.powerTitleRow}>
                  <View style={[styles.powerIndicator, serverStatus ? styles.powerIndicatorOn : styles.powerIndicatorOff]}>
                    <Ionicons
                      name={serverStatus ? 'radio' : 'power-outline'}
                      size={18}
                      color={serverStatus ? colors.accentGreen : colors.textMuted}
                    />
                  </View>
                  <View>
                    <Text style={styles.powerTitle}>
                      {serverStatus ? 'Embedded Server is Active' : 'Embedded Server is Stopped'}
                    </Text>
                    <Text style={styles.powerSubtitle}>
                      {serverStatus
                        ? `Listening on http://localhost:${serverPort}`
                        : 'Enable API access directly inside DevVault with 1-click'}
                    </Text>
                  </View>
                </View>

                {/* Primary Start / Stop Action Buttons */}
                <View style={styles.powerButtonRow}>
                  {serverStatus ? (
                    <>
                      <TouchableOpacity
                        style={[styles.btnAction, styles.btnStop]}
                        onPress={handleStopServer}
                        disabled={isStopping}
                        activeOpacity={0.8}
                      >
                        <Ionicons name="stop-circle-outline" size={16} color="#fff" />
                        <Text style={styles.btnActionText}>
                          {isStopping ? 'Stopping...' : 'Stop Server'}
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.btnAction, styles.btnRestart]}
                        onPress={handleRestartServer}
                        disabled={isStarting || isStopping}
                        activeOpacity={0.8}
                      >
                        <Ionicons name="refresh-outline" size={15} color={colors.primary} />
                        <Text style={[styles.btnActionText, { color: colors.primary }]}>Restart</Text>
                      </TouchableOpacity>
                    </>
                  ) : (
                    <TouchableOpacity
                      style={[styles.btnAction, styles.btnStart]}
                      onPress={handleStartServer}
                      disabled={isStarting}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="play" size={16} color="#0d1117" />
                      <Text style={[styles.btnActionText, { color: '#0d1117', fontWeight: '800' }]}>
                        {isStarting ? 'Starting...' : 'Enable & Start Server'}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              {serverActionError && (
                <View style={styles.actionErrorBox}>
                  <Ionicons name="alert-circle-outline" size={16} color={colors.accentRed} />
                  <Text style={styles.actionErrorText}>{serverActionError}</Text>
                </View>
              )}

              {/* Status and Browser Launch Bar */}
              <View style={styles.powerStatusFooter}>
                <View style={styles.footerLeft}>
                  <Text style={styles.footerLabel}>STATUS:</Text>
                  <View style={[styles.badgePill, serverStatus ? styles.badgeGreen : styles.badgeMuted]}>
                    <Text style={[styles.badgePillText, serverStatus ? { color: colors.accentGreen } : { color: colors.textMuted }]}>
                      {serverStatus ? `RUNNING (PORT ${serverPort})` : 'OFFLINE'}
                    </Text>
                  </View>
                </View>

                <View style={styles.footerRight}>
                  {serverStatus && (
                    <TouchableOpacity
                      style={styles.openBrowserBtn}
                      onPress={handleOpenBrowser}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="open-outline" size={14} color={colors.primary} />
                      <Text style={styles.openBrowserBtnText}>Open /api/health</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    style={styles.refreshBtn}
                    onPress={() => checkServerHealth(config.port)}
                    disabled={isChecking}
                  >
                    <Ionicons
                      name="refresh"
                      size={14}
                      color={colors.primary}
                      style={isChecking ? styles.rotating : undefined}
                    />
                    <Text style={styles.refreshBtnText}>
                      {isChecking ? 'Checking...' : 'Check Status'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Live Statistics when Running */}
              {serverStatus && (
                <View style={styles.liveStatsContainer}>
                  <View style={styles.statChip}>
                    <Text style={styles.statChipLabel}>Total</Text>
                    <Text style={styles.statChipVal}>{serverStatus.totalSnippets}</Text>
                  </View>
                  <View style={styles.statChip}>
                    <Text style={styles.statChipLabel}>Commands</Text>
                    <Text style={styles.statChipVal}>{serverStatus.totalCommands ?? '-'}</Text>
                  </View>
                  <View style={styles.statChip}>
                    <Text style={styles.statChipLabel}>Recipes</Text>
                    <Text style={styles.statChipVal}>{serverStatus.totalRecipes ?? '-'}</Text>
                  </View>
                  <View style={styles.statChip}>
                    <Text style={styles.statChipLabel}>Public 🌐</Text>
                    <Text style={styles.statChipVal}>{serverStatus.publicSnippets}</Text>
                  </View>
                  <View style={styles.statChip}>
                    <Text style={styles.statChipLabel}>Private 🔒</Text>
                    <Text style={styles.statChipVal}>{serverStatus.privateSnippets}</Text>
                  </View>
                </View>
              )}

              {/* Offline Guidance */}
              {!serverStatus && (
                <View style={styles.offlineHelpRow}>
                  <Ionicons name="information-circle-outline" size={16} color={colors.textMuted} />
                  <Text style={styles.offlineHelpText}>
                    Click <Text style={styles.boldText}>"Enable & Start Server"</Text> above to start the embedded API server inside the app. Alternatively, run <Text style={styles.codeText}>{startCommand}</Text> in your terminal.
                  </Text>
                </View>
              )}
            </View>

            {/* Public vs Private Information Notice */}
            <View style={styles.privacyNoticeBox}>
              <Ionicons name="shield-checkmark-outline" size={18} color={colors.primary} />
              <View style={styles.privacyNoticeContent}>
                <Text style={styles.privacyNoticeTitle}>Public vs. Private Visibility</Text>
                <Text style={styles.privacyNoticeDesc}>
                  • <Text style={styles.boldText}>Public entries (🌐)</Text>: Accessible to anyone querying your API endpoints without authorization.
                  {'\n'}• <Text style={styles.boldText}>Private entries (🔒)</Text>: Strictly excluded from API responses unless the request includes a valid Bearer token header.
                </Text>
              </View>
            </View>

            {/* Server Settings */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>SERVER CONFIGURATION</Text>

              <View style={styles.rowTwoCols}>
                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.label}>PORT</Text>
                  <TextInput
                    style={styles.input}
                    value={String(config.port || 4141)}
                    keyboardType="numeric"
                    onChangeText={(val) =>
                      setConfig((prev) => ({
                        ...prev,
                        port: parseInt(val, 10) || 4141,
                      }))
                    }
                  />
                </View>

                <View style={[styles.inputGroup, { flex: 2 }]}>
                  <Text style={styles.label}>API TOKEN (BEARER AUTH)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Optional secret token for private access"
                    placeholderTextColor={colors.textMuted}
                    value={config.apiKey}
                    onChangeText={(val) =>
                      setConfig((prev) => ({ ...prev, apiKey: val }))
                    }
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>
              </View>

              <View style={styles.switchRow}>
                <View>
                  <Text style={styles.switchLabel}>Allow Remote Creation (POST /api/snippets)</Text>
                  <Text style={styles.switchSublabel}>
                    Allow authorized clients to insert new snippets via API
                  </Text>
                </View>
                <Switch
                  value={config.allowWrite}
                  onValueChange={(val) =>
                    setConfig((prev) => ({ ...prev, allowWrite: val }))
                  }
                  trackColor={{ false: colors.border, true: colors.primary }}
                  thumbColor={config.allowWrite ? '#fff' : '#8b949e'}
                />
              </View>

              <TouchableOpacity
                style={styles.saveBtn}
                onPress={handleSaveConfig}
                activeOpacity={0.8}
              >
                <Ionicons
                  name={saveMessage ? 'checkmark-circle' : 'save-outline'}
                  size={16}
                  color={colors.textInverse}
                />
                <Text style={styles.saveBtnText}>
                  {saveMessage ? 'Settings Saved!' : 'Save Server Settings'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Desktop Editions Callout Banner */}
            <View style={styles.desktopBannerBox}>
              <Ionicons name="desktop-outline" size={20} color={colors.accentPurple} />
              <View style={styles.desktopBannerContent}>
                <Text style={styles.desktopBannerTitle}>Native Desktop Editions Available</Text>
                <Text style={styles.desktopBannerDesc}>
                  DevVault now runs natively on <Text style={styles.boldText}>Windows (.exe)</Text>, <Text style={styles.boldText}>Linux (.AppImage / .deb)</Text>, and <Text style={styles.boldText}>macOS (.dmg)</Text> with a fully embedded, zero-CLI background API server.
                </Text>
              </View>
            </View>

            {/* API Endpoints & Curl Recipes */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>API ENDPOINTS & TERMINAL RECIPES</Text>

              {/* Endpoint 1: Commands */}
              <View style={styles.recipeCard}>
                <View style={styles.recipeHeader}>
                  <View style={styles.methodBadge}>
                    <Text style={styles.methodText}>GET</Text>
                  </View>
                  <Text style={styles.endpointPath}>/api/commands</Text>
                  <Text style={styles.recipeDesc}>Fetch CLI commands (or ?platform=linux)</Text>
                </View>
                <View style={styles.codeSnippetBox}>
                  <Text style={styles.codeSnippetText}>{curlCommands}</Text>
                  <TouchableOpacity
                    style={styles.copySnippetBtn}
                    onPress={() => handleCopyCommand(curlCommands, 'commands')}
                  >
                    <Ionicons
                      name={copiedKey === 'commands' ? 'checkmark' : 'copy-outline'}
                      size={14}
                      color={copiedKey === 'commands' ? colors.accentGreen : colors.textSecondary}
                    />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Endpoint 2: Recipes */}
              <View style={styles.recipeCard}>
                <View style={styles.recipeHeader}>
                  <View style={styles.methodBadge}>
                    <Text style={styles.methodText}>GET</Text>
                  </View>
                  <Text style={styles.endpointPath}>/api/recipes</Text>
                  <Text style={styles.recipeDesc}>Fetch multi-step recipes & workflows</Text>
                </View>
                <View style={styles.codeSnippetBox}>
                  <Text style={styles.codeSnippetText}>{curlRecipes}</Text>
                  <TouchableOpacity
                    style={styles.copySnippetBtn}
                    onPress={() => handleCopyCommand(curlRecipes, 'recipes')}
                  >
                    <Ionicons
                      name={copiedKey === 'recipes' ? 'checkmark' : 'copy-outline'}
                      size={14}
                      color={copiedKey === 'recipes' ? colors.accentGreen : colors.textSecondary}
                    />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Endpoint 3: Public Snippets */}
              <View style={styles.recipeCard}>
                <View style={styles.recipeHeader}>
                  <View style={styles.methodBadge}>
                    <Text style={styles.methodText}>GET</Text>
                  </View>
                  <Text style={styles.endpointPath}>/api/snippets</Text>
                  <Text style={styles.recipeDesc}>Fetch all public snippets</Text>
                </View>
                <View style={styles.codeSnippetBox}>
                  <Text style={styles.codeSnippetText}>{curlPublic}</Text>
                  <TouchableOpacity
                    style={styles.copySnippetBtn}
                    onPress={() => handleCopyCommand(curlPublic, 'public')}
                  >
                    <Ionicons
                      name={copiedKey === 'public' ? 'checkmark' : 'copy-outline'}
                      size={14}
                      color={copiedKey === 'public' ? colors.accentGreen : colors.textSecondary}
                    />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Endpoint 4: Full-text Search */}
              <View style={styles.recipeCard}>
                <View style={styles.recipeHeader}>
                  <View style={styles.methodBadge}>
                    <Text style={styles.methodText}>GET</Text>
                  </View>
                  <Text style={styles.endpointPath}>/api/snippets/search?q=...</Text>
                  <Text style={styles.recipeDesc}>Full-text search</Text>
                </View>
                <View style={styles.codeSnippetBox}>
                  <Text style={styles.codeSnippetText}>{curlSearch}</Text>
                  <TouchableOpacity
                    style={styles.copySnippetBtn}
                    onPress={() => handleCopyCommand(curlSearch, 'search')}
                  >
                    <Ionicons
                      name={copiedKey === 'search' ? 'checkmark' : 'copy-outline'}
                      size={14}
                      color={copiedKey === 'search' ? colors.accentGreen : colors.textSecondary}
                    />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Endpoint 5: Raw Output */}
              <View style={styles.recipeCard}>
                <View style={styles.recipeHeader}>
                  <View style={styles.methodBadge}>
                    <Text style={styles.methodText}>GET</Text>
                  </View>
                  <Text style={styles.endpointPath}>/api/raw/:id</Text>
                  <Text style={styles.recipeDesc}>Raw script (pipe to bash)</Text>
                </View>
                <View style={styles.codeSnippetBox}>
                  <Text style={styles.codeSnippetText}>{curlRaw}</Text>
                  <TouchableOpacity
                    style={styles.copySnippetBtn}
                    onPress={() => handleCopyCommand(curlRaw, 'raw')}
                  >
                    <Ionicons
                      name={copiedKey === 'raw' ? 'checkmark' : 'copy-outline'}
                      size={14}
                      color={copiedKey === 'raw' ? colors.accentGreen : colors.textSecondary}
                    />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Endpoint 6: Authenticated (Includes Private) */}
              <View style={styles.recipeCard}>
                <View style={styles.recipeHeader}>
                  <View style={[styles.methodBadge, { backgroundColor: 'rgba(210, 168, 255, 0.2)' }]}>
                    <Text style={[styles.methodText, { color: colors.accentPurple }]}>AUTH</Text>
                  </View>
                  <Text style={styles.endpointPath}>Authorization: Bearer</Text>
                  <Text style={styles.recipeDesc}>Access private entries</Text>
                </View>
                <View style={styles.codeSnippetBox}>
                  <Text style={styles.codeSnippetText}>{curlAuth}</Text>
                  <TouchableOpacity
                    style={styles.copySnippetBtn}
                    onPress={() => handleCopyCommand(curlAuth, 'auth')}
                  >
                    <Ionicons
                      name={copiedKey === 'auth' ? 'checkmark' : 'copy-outline'}
                      size={14}
                      color={copiedKey === 'auth' ? colors.accentGreen : colors.textSecondary}
                    />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
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
    maxWidth: 740,
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
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  dotGreen: {
    backgroundColor: colors.accentGreen,
  },
  dotGray: {
    backgroundColor: colors.textMuted,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    fontFamily: 'monospace',
  },
  headerSubtitle: {
    fontSize: 11,
    color: colors.textSecondary,
    fontFamily: 'monospace',
    marginTop: 1,
  },
  closeBtn: {
    padding: 4,
  },
  body: {
    flex: 1,
  },
  scrollBody: {
    padding: 18,
  },
  // In-App Server Control Panel
  powerCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.025)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: 16,
    marginBottom: 16,
  },
  powerCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 14,
  },
  powerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    minWidth: 240,
  },
  powerIndicator: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  powerIndicatorOn: {
    backgroundColor: 'rgba(63, 185, 80, 0.15)',
    borderColor: colors.accentGreen,
  },
  powerIndicatorOff: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderColor: colors.border,
  },
  powerTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
    fontFamily: 'monospace',
  },
  powerSubtitle: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  powerButtonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  btnAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 6,
  },
  btnStart: {
    backgroundColor: colors.accentGreen,
  },
  btnStop: {
    backgroundColor: colors.accentRed,
  },
  btnRestart: {
    backgroundColor: 'rgba(88, 166, 255, 0.12)',
    borderWidth: 1,
    borderColor: colors.primary,
  },
  btnActionText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
    fontFamily: 'monospace',
  },
  actionErrorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(248, 81, 73, 0.1)',
    borderWidth: 1,
    borderColor: colors.accentRed,
    borderRadius: 6,
    padding: 8,
    marginBottom: 10,
  },
  actionErrorText: {
    color: colors.accentRed,
    fontSize: 12,
    flex: 1,
  },
  powerStatusFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    paddingTop: 12,
    flexWrap: 'wrap',
    gap: 8,
  },
  footerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  footerLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textMuted,
    fontFamily: 'monospace',
  },
  badgePill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
  },
  badgeGreen: {
    backgroundColor: 'rgba(63, 185, 80, 0.15)',
    borderColor: colors.accentGreen,
  },
  badgeMuted: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderColor: colors.border,
  },
  badgePillText: {
    fontSize: 10,
    fontWeight: '700',
    fontFamily: 'monospace',
  },
  footerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  openBrowserBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(88, 166, 255, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(88, 166, 255, 0.3)',
  },
  openBrowserBtnText: {
    fontSize: 11,
    color: colors.primary,
    fontFamily: 'monospace',
    fontWeight: '600',
  },
  refreshBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  refreshBtnText: {
    fontSize: 11,
    color: colors.primary,
    fontFamily: 'monospace',
  },
  rotating: {
    transform: [{ rotate: '45deg' }],
  },
  liveStatsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  statChip: {
    backgroundColor: colors.card,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.borderLight,
    paddingHorizontal: 10,
    paddingVertical: 6,
    flex: 1,
    minWidth: 80,
    alignItems: 'center',
  },
  statChipLabel: {
    fontSize: 10,
    color: colors.textSecondary,
    fontFamily: 'monospace',
  },
  statChipVal: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
    marginTop: 2,
    fontFamily: 'monospace',
  },
  offlineHelpRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  offlineHelpText: {
    fontSize: 11,
    color: colors.textSecondary,
    flex: 1,
    lineHeight: 16,
  },
  codeText: {
    fontFamily: 'monospace',
    color: colors.accentGreen,
    fontWeight: '700',
  },
  privacyNoticeBox: {
    flexDirection: 'row',
    backgroundColor: 'rgba(88, 166, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(88, 166, 255, 0.25)',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    gap: 10,
  },
  privacyNoticeContent: {
    flex: 1,
  },
  privacyNoticeTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: 4,
    fontFamily: 'monospace',
  },
  privacyNoticeDesc: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  boldText: {
    fontWeight: '700',
    color: colors.textPrimary,
  },
  desktopBannerBox: {
    flexDirection: 'row',
    backgroundColor: 'rgba(210, 168, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(210, 168, 255, 0.25)',
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
    gap: 10,
    alignItems: 'center',
  },
  desktopBannerContent: {
    flex: 1,
  },
  desktopBannerTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.accentPurple,
    marginBottom: 3,
    fontFamily: 'monospace',
  },
  desktopBannerDesc: {
    fontSize: 11,
    color: colors.textSecondary,
    lineHeight: 16,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textMuted,
    fontFamily: 'monospace',
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  rowTwoCols: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  inputGroup: {
    marginBottom: 4,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textMuted,
    fontFamily: 'monospace',
    marginBottom: 4,
  },
  input: {
    backgroundColor: colors.codeBg,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    color: colors.textPrimary,
    fontFamily: 'monospace',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.borderLight,
    marginBottom: 14,
  },
  switchLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary,
    fontFamily: 'monospace',
  },
  switchSublabel: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    paddingVertical: 10,
    borderRadius: 6,
  },
  saveBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textInverse,
    fontFamily: 'monospace',
  },
  recipeCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: 10,
    marginBottom: 10,
  },
  recipeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  methodBadge: {
    backgroundColor: 'rgba(63, 185, 80, 0.2)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  methodText: {
    color: colors.accentGreen,
    fontSize: 10,
    fontWeight: '700',
    fontFamily: 'monospace',
  },
  endpointPath: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textPrimary,
    fontFamily: 'monospace',
  },
  recipeDesc: {
    fontSize: 11,
    color: colors.textMuted,
    marginLeft: 'auto',
  },
  codeSnippetBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.codeBg,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.codeBorder,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  codeSnippetText: {
    fontSize: 12,
    color: colors.textPrimary,
    fontFamily: 'monospace',
    flex: 1,
    marginRight: 8,
  },
  copySnippetBtn: {
    padding: 4,
  },
});
