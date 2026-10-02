import React, { useEffect, useState } from 'react';
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
import { Snippet } from '../types/snippet';
import { type AppEnvironment } from '../types/environment';
import {
  extractPlaceholders,
  renderTemplate,
  resolveParameter,
} from '../utils/templateParser';
import { copyToClipboard } from '../utils/clipboard';
import { SyntaxCodeBlock } from './SyntaxCodeBlock';

interface ParameterFillerModalProps {
  visible: boolean;
  snippet: Snippet | null;
  onClose: () => void;
  onSuccessCopy: () => void;
  activeEnvironment?: AppEnvironment | null;
  environments?: AppEnvironment[];
  onSelectEnvironment?: (id: string) => Promise<void> | void;
  onOpenEnvironmentModal?: () => void;
}

export const ParameterFillerModal: React.FC<ParameterFillerModalProps> = ({
  visible,
  snippet,
  onClose,
  onSuccessCopy,
  activeEnvironment,
  environments = [],
  onSelectEnvironment,
  onOpenEnvironmentModal,
}) => {
  const [paramValues, setParamValues] = useState<Record<string, string>>({});
  const [copied, setCopied] = useState(false);

  // Initialize and populate values when snippet or active environment changes
  useEffect(() => {
    if (snippet) {
      const placeholders = extractPlaceholders(snippet.content);
      const initial: Record<string, string> = {};
      const envVars = activeEnvironment?.variables || {};

      placeholders.forEach((p) => {
        // Priority for pre-populating: active environment variable > snippet inline default
        if (envVars[p.name] !== undefined && envVars[p.name].trim() !== '') {
          initial[p.name] = envVars[p.name];
        } else {
          initial[p.name] = p.defaultValue;
        }
      });
      setParamValues(initial);
      setCopied(false);
    }
  }, [snippet, activeEnvironment]);

  if (!snippet) return null;

  const placeholders = extractPlaceholders(snippet.content);
  const envVars = activeEnvironment?.variables || {};
  const resolvedCommand = renderTemplate(snippet.content, paramValues, envVars);

  const handleCopy = async () => {
    const success = await copyToClipboard(resolvedCommand);
    if (success) {
      setCopied(true);
      onSuccessCopy();
      setTimeout(() => {
        setCopied(false);
        onClose();
      }, 700);
    }
  };

  const handleResetToDefaults = () => {
    const resetVals: Record<string, string> = {};
    placeholders.forEach((p) => {
      if (envVars[p.name] !== undefined && envVars[p.name].trim() !== '') {
        resetVals[p.name] = envVars[p.name];
      } else {
        resetVals[p.name] = p.defaultValue;
      }
    });
    setParamValues(resetVals);
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
              <Ionicons name="flash-outline" size={20} color={colors.accentYellow} />
              <Text style={styles.title}>Fill & Execute Recipe</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.body} contentContainerStyle={styles.scrollBody}>
            <Text style={styles.snippetTitle}>{snippet.title}</Text>

            {/* Active Environment Selector Bar */}
            {environments.length > 0 && (
              <View style={styles.envBar}>
                <View style={styles.envBarLeft}>
                  <Ionicons name="earth" size={15} color={colors.primary} />
                  <Text style={styles.envBarLabel}>Active Environment:</Text>
                </View>

                <View style={styles.envPillsContainer}>
                  {environments.map((env) => {
                    const isActive = env.id === activeEnvironment?.id;
                    return (
                      <TouchableOpacity
                        key={env.id}
                        style={[
                          styles.envPill,
                          isActive && {
                            borderColor: env.color,
                            backgroundColor: `${env.color}22`,
                          },
                        ]}
                        onPress={() => onSelectEnvironment && onSelectEnvironment(env.id)}
                        activeOpacity={0.7}
                      >
                        <View style={[styles.envPillDot, { backgroundColor: env.color }]} />
                        <Text
                          style={[
                            styles.envPillText,
                            isActive && { color: colors.textPrimary, fontWeight: '700' },
                          ]}
                        >
                          {env.name}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}

                  {onOpenEnvironmentModal && (
                    <TouchableOpacity
                      style={styles.manageEnvBtn}
                      onPress={onOpenEnvironmentModal}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="settings-outline" size={13} color={colors.textSecondary} />
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            )}

            {/* Input fields for each placeholder */}
            <View style={styles.paramsSection}>
              <View style={styles.paramsSectionHeader}>
                <Text style={styles.sectionLabel}>TEMPLATE PARAMETERS</Text>
                <TouchableOpacity onPress={handleResetToDefaults} style={styles.resetValuesBtn}>
                  <Ionicons name="refresh-outline" size={12} color={colors.textSecondary} />
                  <Text style={styles.resetValuesText}>Reset to Env / Defaults</Text>
                </TouchableOpacity>
              </View>

              {placeholders.map((p) => {
                const curVal = paramValues[p.name] || '';
                const envVal = envVars[p.name];
                const resolution = resolveParameter(
                  p.name,
                  p.defaultValue,
                  { [p.name]: curVal },
                  envVars,
                  activeEnvironment?.name
                );

                const isEnvSource =
                  envVal !== undefined && envVal.trim() !== '' && curVal === envVal;
                const isDefaultSource =
                  p.defaultValue !== '' && curVal === p.defaultValue && !isEnvSource;
                const isCustomSource =
                  curVal !== '' && !isEnvSource && !isDefaultSource;

                return (
                  <View key={p.name} style={styles.inputGroup}>
                    <View style={styles.inputLabelRow}>
                      <View style={styles.paramTitleRow}>
                        <Text style={styles.paramName}>{p.name}</Text>
                        {/* Source indicator badge */}
                        {isEnvSource && activeEnvironment && (
                          <View
                            style={[
                              styles.sourceBadge,
                              {
                                borderColor: activeEnvironment.color,
                                backgroundColor: `${activeEnvironment.color}1c`,
                              },
                            ]}
                          >
                            <View
                              style={[
                                styles.sourceBadgeDot,
                                { backgroundColor: activeEnvironment.color },
                              ]}
                            />
                            <Text
                              style={[
                                styles.sourceBadgeText,
                                { color: activeEnvironment.color },
                              ]}
                            >
                              ENV: {activeEnvironment.name}
                            </Text>
                          </View>
                        )}
                        {isDefaultSource && (
                          <View style={styles.defaultBadge}>
                            <Text style={styles.defaultBadgeText}>DEFAULT</Text>
                          </View>
                        )}
                        {isCustomSource && (
                          <View style={styles.customBadge}>
                            <Text style={styles.customBadgeText}>CUSTOM</Text>
                          </View>
                        )}
                      </View>

                      {p.defaultValue ? (
                        <Text style={styles.defaultHint}>
                          snippet default: {p.defaultValue}
                        </Text>
                      ) : null}
                    </View>

                    <TextInput
                      style={styles.input}
                      value={paramValues[p.name] || ''}
                      placeholder={
                        envVal || p.defaultValue || `Enter value for ${p.name}`
                      }
                      placeholderTextColor={colors.textMuted}
                      onChangeText={(val) =>
                        setParamValues((prev) => ({ ...prev, [p.name]: val }))
                      }
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                  </View>
                );
              })}
            </View>

            {/* Live Preview */}
            <View style={styles.previewSection}>
              <Text style={styles.sectionLabel}>LIVE COMMAND PREVIEW</Text>
              <SyntaxCodeBlock
                code={resolvedCommand}
                language={snippet.language}
              />
            </View>
          </ScrollView>

          {/* Footer Actions */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={onClose}
              activeOpacity={0.7}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.copyButton, copied && styles.copyButtonActive]}
              onPress={handleCopy}
              activeOpacity={0.8}
            >
              <Ionicons
                name={copied ? 'checkmark' : 'copy'}
                size={16}
                color={copied ? '#ffffff' : colors.textInverse}
              />
              <Text
                style={[
                  styles.copyText,
                  copied && { color: '#ffffff' },
                ]}
              >
                {copied ? 'Copied to Clipboard!' : 'Copy Populated Command'}
              </Text>
            </TouchableOpacity>
          </View>
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
    maxWidth: 680,
    maxHeight: '90%',
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    fontFamily: 'monospace',
  },
  closeBtn: {
    padding: 4,
  },
  body: {
    maxHeight: 520,
  },
  scrollBody: {
    padding: 16,
  },
  snippetTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 14,
  },
  envBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.borderLight,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: 16,
    flexWrap: 'wrap',
    gap: 8,
  },
  envBarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  envBarLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    fontFamily: 'monospace',
  },
  envPillsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  envPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
  },
  envPillDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  envPillText: {
    fontSize: 11,
    color: colors.textSecondary,
    fontFamily: 'monospace',
  },
  manageEnvBtn: {
    padding: 4,
    borderRadius: 4,
  },
  paramsSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textMuted,
    fontFamily: 'monospace',
    letterSpacing: 0.5,
  },
  resetValuesBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  resetValuesText: {
    fontSize: 11,
    color: colors.textSecondary,
    fontFamily: 'monospace',
  },
  paramsSection: {
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 12,
  },
  inputLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  paramTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  paramName: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.accentYellow,
    fontFamily: 'monospace',
  },
  sourceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
  },
  sourceBadgeDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
  },
  sourceBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    fontFamily: 'monospace',
  },
  defaultBadge: {
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  defaultBadgeText: {
    fontSize: 9,
    fontWeight: '600',
    color: colors.textMuted,
    fontFamily: 'monospace',
  },
  customBadge: {
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: 'rgba(88, 166, 255, 0.1)',
    borderWidth: 1,
    borderColor: colors.primary,
  },
  customBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.primary,
    fontFamily: 'monospace',
  },
  defaultHint: {
    fontSize: 11,
    color: colors.textMuted,
    fontFamily: 'monospace',
  },
  input: {
    backgroundColor: colors.codeBg,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    color: colors.textPrimary,
    fontFamily: 'monospace',
  },
  previewSection: {
    marginTop: 8,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
  },
  cancelButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 6,
  },
  cancelText: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 6,
  },
  copyButtonActive: {
    backgroundColor: colors.accentGreen,
  },
  copyText: {
    color: colors.textInverse,
    fontWeight: '700',
    fontSize: 13,
    fontFamily: 'monospace',
  },
});
