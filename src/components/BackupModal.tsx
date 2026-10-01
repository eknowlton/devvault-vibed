import React, { useState } from 'react';
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import {
  exportSnippetsToJson,
  importSnippetsFromJson,
  resetSnippetsToSeed,
} from '../storage/snippetStorage';
import { copyToClipboard } from '../utils/clipboard';

interface BackupModalProps {
  visible: boolean;
  onClose: () => void;
  onDataChanged: () => void;
}

export const BackupModal: React.FC<BackupModalProps> = ({
  visible,
  onClose,
  onDataChanged,
}) => {
  const [activeTab, setActiveTab] = useState<'export' | 'import' | 'reset'>('export');
  const [jsonText, setJsonText] = useState('');
  const [copied, setCopied] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleOpenExport = async () => {
    setActiveTab('export');
    setStatusMessage(null);
    const exported = await exportSnippetsToJson();
    setJsonText(exported);
  };

  const handleCopyJson = async () => {
    const success = await copyToClipboard(jsonText);
    if (success) {
      setCopied(true);
      setStatusMessage({ type: 'success', text: 'JSON exported and copied to clipboard!' });
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleImport = async () => {
    if (!jsonText.trim()) {
      setStatusMessage({ type: 'error', text: 'Please paste JSON data first.' });
      return;
    }

    const result = await importSnippetsFromJson(jsonText);
    if (result.success) {
      setStatusMessage({
        type: 'success',
        text: `Successfully imported ${result.count || 0} snippet(s)!`,
      });
      onDataChanged();
      setTimeout(() => {
        onClose();
      }, 1000);
    } else {
      setStatusMessage({
        type: 'error',
        text: result.error || 'Failed to parse JSON snippet data',
      });
    }
  };

  const handleReset = async () => {
    await resetSnippetsToSeed();
    setStatusMessage({
      type: 'success',
      text: 'Database restored to default curated developer recipes!',
    });
    onDataChanged();
    setTimeout(() => {
      onClose();
    }, 1000);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onShow={handleOpenExport}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.titleRow}>
              <Ionicons name="cloud-outline" size={20} color={colors.primary} />
              <Text style={styles.headerTitle}>Backup & Portability</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Navigation Tabs */}
          <View style={styles.tabRow}>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'export' && styles.tabActive]}
              onPress={handleOpenExport}
            >
              <Text
                style={[styles.tabText, activeTab === 'export' && styles.tabTextActive]}
              >
                Export JSON
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tab, activeTab === 'import' && styles.tabActive]}
              onPress={() => {
                setActiveTab('import');
                setJsonText('');
                setStatusMessage(null);
              }}
            >
              <Text
                style={[styles.tabText, activeTab === 'import' && styles.tabTextActive]}
              >
                Import JSON
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tab, activeTab === 'reset' && styles.tabActive]}
              onPress={() => {
                setActiveTab('reset');
                setStatusMessage(null);
              }}
            >
              <Text
                style={[styles.tabText, activeTab === 'reset' && styles.tabTextActive]}
              >
                Reset Defaults
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.body} contentContainerStyle={styles.scrollBody}>
            {statusMessage && (
              <View
                style={[
                  styles.statusBox,
                  statusMessage.type === 'success'
                    ? styles.statusSuccess
                    : styles.statusError,
                ]}
              >
                <Ionicons
                  name={
                    statusMessage.type === 'success'
                      ? 'checkmark-circle'
                      : 'alert-circle'
                  }
                  size={16}
                  color={
                    statusMessage.type === 'success'
                      ? colors.accentGreen
                      : colors.danger
                  }
                />
                <Text
                  style={[
                    styles.statusText,
                    statusMessage.type === 'success'
                      ? { color: colors.accentGreen }
                      : { color: colors.danger },
                  ]}
                >
                  {statusMessage.text}
                </Text>
              </View>
            )}

            {activeTab === 'export' && (
              <View>
                <Text style={styles.desc}>
                  Export your complete library of snippets, commands, and tags into standard JSON.
                </Text>
                <TextInput
                  style={[styles.input, styles.jsonTextArea]}
                  value={jsonText}
                  multiline
                  editable={false}
                  numberOfLines={10}
                />
                <TouchableOpacity
                  style={[styles.actionBtn, copied && styles.actionBtnActive]}
                  onPress={handleCopyJson}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name={copied ? 'checkmark' : 'copy'}
                    size={16}
                    color={colors.textInverse}
                  />
                  <Text style={styles.actionBtnText}>
                    {copied ? 'Copied JSON to Clipboard!' : 'Copy Export JSON'}
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {activeTab === 'import' && (
              <View>
                <Text style={styles.desc}>
                  Paste snippet JSON data below to merge into your library.
                </Text>
                <TextInput
                  style={[styles.input, styles.jsonTextArea]}
                  placeholder='[ { "title": "...", "content": "..." } ]'
                  placeholderTextColor={colors.textMuted}
                  value={jsonText}
                  onChangeText={setJsonText}
                  multiline
                  numberOfLines={10}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <TouchableOpacity
                  style={styles.actionBtn}
                  onPress={handleImport}
                  activeOpacity={0.8}
                >
                  <Ionicons name="download-outline" size={16} color={colors.textInverse} />
                  <Text style={styles.actionBtnText}>Import Snippets</Text>
                </TouchableOpacity>
              </View>
            )}

            {activeTab === 'reset' && (
              <View style={styles.resetContainer}>
                <Ionicons name="warning-outline" size={32} color={colors.accentYellow} />
                <Text style={styles.resetTitle}>Reset to Curated Recipes</Text>
                <Text style={styles.resetDesc}>
                  This will reload the initial developer recipe pack (Git, Docker, Kubernetes, Linux, FFmpeg, Curl, Database).
                </Text>
                <TouchableOpacity
                  style={[
                    styles.actionBtn,
                    styles.resetConfirmBtn,
                    { backgroundColor: colors.danger },
                  ]}
                  onPress={handleReset}
                  activeOpacity={0.8}
                >
                  <Ionicons name="refresh" size={16} color="#fff" />
                  <Text style={[styles.actionBtnText, { color: '#fff' }]}>
                    Confirm Reset Database
                  </Text>
                </TouchableOpacity>
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
    maxWidth: 640,
    maxHeight: '90%',
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
    gap: 8,
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
  tabRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: colors.primary,
    backgroundColor: 'rgba(88, 166, 255, 0.08)',
  },
  tabText: {
    fontSize: 12,
    fontFamily: 'monospace',
    color: colors.textMuted,
    fontWeight: '600',
  },
  tabTextActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  body: {
    flex: 1,
  },
  scrollBody: {
    padding: 18,
  },
  desc: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 12,
    lineHeight: 18,
  },
  input: {
    backgroundColor: colors.codeBg,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    fontSize: 12,
    color: colors.textPrimary,
    fontFamily: 'monospace',
  },
  jsonTextArea: {
    minHeight: 180,
    marginBottom: 14,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 6,
  },
  resetConfirmBtn: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    minHeight: 44,
    gap: 10,
  },
  actionBtnActive: {
    backgroundColor: colors.accentGreen,
  },
  actionBtnText: {
    fontSize: 13,
    color: colors.textInverse,
    fontFamily: 'monospace',
    fontWeight: '700',
  },
  statusBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderRadius: 6,
    marginBottom: 12,
    borderWidth: 1,
  },
  statusSuccess: {
    backgroundColor: 'rgba(63, 185, 80, 0.15)',
    borderColor: colors.accentGreen,
  },
  statusError: {
    backgroundColor: 'rgba(248, 81, 73, 0.15)',
    borderColor: colors.danger,
  },
  statusText: {
    fontSize: 12,
    fontFamily: 'monospace',
  },
  resetContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  resetTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    marginTop: 10,
    marginBottom: 6,
  },
  resetDesc: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 20,
    maxWidth: 400,
  },
});
