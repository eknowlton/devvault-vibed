import React, { useEffect, useState } from 'react';
import {
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
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState(false);

  // Load config from storage on open
  useEffect(() => {
    if (visible) {
      getStoredServerConfig().then((cfg) => {
        setConfig(cfg);
        checkServerHealth(cfg.port);
      });
    }
  }, [visible]);

  const checkServerHealth = async (portNum: number) => {
    setIsChecking(true);
    try {
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

  const handleSaveConfig = async () => {
    await persistServerConfig(config);
    setSaveMessage(true);
    setTimeout(() => setSaveMessage(false), 2000);
    checkServerHealth(config.port);
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

  const curlPublic = `curl -s http://localhost:${serverPort}/api/snippets`;
  const curlSearch = `curl -s "http://localhost:${serverPort}/api/snippets/search?q=docker"`;
  const curlRaw = `curl -s http://localhost:${serverPort}/api/raw/seed-git-undo-commit`;
  const curlAuth = config.apiKey
    ? `curl -s -H "Authorization: Bearer ${config.apiKey}" http://localhost:${serverPort}/api/snippets`
    : `curl -s -H "Authorization: Bearer YOUR_API_KEY" http://localhost:${serverPort}/api/snippets`;

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
              <Text style={styles.headerTitle}>API Server & Sharing</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.body} contentContainerStyle={styles.scrollBody}>
            {/* Live Server Status Banner */}
            <View
              style={[
                styles.statusBanner,
                serverStatus ? styles.bannerActive : styles.bannerInactive,
              ]}
            >
              <View style={styles.bannerHeader}>
                <Ionicons
                  name={serverStatus ? 'radio' : 'radio-outline'}
                  size={18}
                  color={serverStatus ? colors.accentGreen : colors.textMuted}
                />
                <Text
                  style={[
                    styles.bannerStatusTitle,
                    serverStatus ? { color: colors.accentGreen } : { color: colors.textMuted },
                  ]}
                >
                  {serverStatus
                    ? `SERVER ACTIVE ON PORT ${serverPort}`
                    : `SERVER NOT RUNNING ON PORT ${serverPort}`}
                </Text>
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

              {serverStatus ? (
                <View style={styles.bannerStatsRow}>
                  <Text style={styles.statItem}>
                    Total: <Text style={styles.statVal}>{serverStatus.totalSnippets}</Text>
                  </Text>
                  <Text style={styles.statItem}>
                    Public (🌐): <Text style={styles.statVal}>{serverStatus.publicSnippets}</Text>
                  </Text>
                  <Text style={styles.statItem}>
                    Private (🔒): <Text style={styles.statVal}>{serverStatus.privateSnippets}</Text>
                  </Text>
                  <Text style={styles.statItem}>
                    Writes: <Text style={styles.statVal}>{serverStatus.allowWrite ? 'Yes' : 'No'}</Text>
                  </Text>
                </View>
              ) : (
                <View style={styles.startGuide}>
                  <Text style={styles.startGuideText}>
                    Start the background API server by running this command in your terminal:
                  </Text>
                  <View style={styles.cmdBox}>
                    <Text style={styles.cmdText}>{startCommand}</Text>
                    <TouchableOpacity
                      style={styles.cmdCopyBtn}
                      onPress={() => handleCopyCommand(startCommand, 'start')}
                    >
                      <Ionicons
                        name={copiedKey === 'start' ? 'checkmark' : 'copy-outline'}
                        size={14}
                        color={copiedKey === 'start' ? colors.accentGreen : colors.textSecondary}
                      />
                    </TouchableOpacity>
                  </View>
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

            {/* API Endpoints & Curl Recipes */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>API ENDPOINTS & TERMINAL RECIPES</Text>

              {/* Endpoint 1: Public Snippets */}
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

              {/* Endpoint 2: Full-text Search */}
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

              {/* Endpoint 3: Raw Output */}
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

              {/* Endpoint 4: Authenticated (Includes Private) */}
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
    maxWidth: 720,
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
  closeBtn: {
    padding: 4,
  },
  body: {
    flex: 1,
  },
  scrollBody: {
    padding: 18,
  },
  statusBanner: {
    borderRadius: 8,
    borderWidth: 1,
    padding: 14,
    marginBottom: 16,
  },
  bannerActive: {
    backgroundColor: 'rgba(63, 185, 80, 0.1)',
    borderColor: colors.accentGreen,
  },
  bannerInactive: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderColor: colors.border,
  },
  bannerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  bannerStatusTitle: {
    fontSize: 12,
    fontWeight: '700',
    fontFamily: 'monospace',
    flex: 1,
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
  bannerStatsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
    marginTop: 4,
  },
  statItem: {
    fontSize: 12,
    color: colors.textSecondary,
    fontFamily: 'monospace',
  },
  statVal: {
    color: colors.textPrimary,
    fontWeight: '700',
  },
  startGuide: {
    marginTop: 4,
  },
  startGuideText: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  cmdBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.codeBg,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.codeBorder,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  cmdText: {
    fontSize: 13,
    color: colors.accentGreen,
    fontFamily: 'monospace',
    fontWeight: '600',
  },
  cmdCopyBtn: {
    padding: 4,
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
