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
import {
  extractPlaceholders,
  renderTemplate,
} from '../utils/templateParser';
import { copyToClipboard } from '../utils/clipboard';
import { SyntaxCodeBlock } from './SyntaxCodeBlock';

interface ParameterFillerModalProps {
  visible: boolean;
  snippet: Snippet | null;
  onClose: () => void;
  onSuccessCopy: () => void;
}

export const ParameterFillerModal: React.FC<ParameterFillerModalProps> = ({
  visible,
  snippet,
  onClose,
  onSuccessCopy,
}) => {
  const [paramValues, setParamValues] = useState<Record<string, string>>({});
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (snippet) {
      const placeholders = extractPlaceholders(snippet.content);
      const initial: Record<string, string> = {};
      placeholders.forEach((p) => {
        initial[p.name] = p.defaultValue;
      });
      setParamValues(initial);
      setCopied(false);
    }
  }, [snippet]);

  if (!snippet) return null;

  const placeholders = extractPlaceholders(snippet.content);
  const resolvedCommand = renderTemplate(snippet.content, paramValues);

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

            {/* Input fields for each placeholder */}
            <View style={styles.paramsSection}>
              <Text style={styles.sectionLabel}>TEMPLATE PARAMETERS</Text>
              {placeholders.map((p) => (
                <View key={p.name} style={styles.inputGroup}>
                  <View style={styles.inputLabelRow}>
                    <Text style={styles.paramName}>{p.name}</Text>
                    {p.defaultValue ? (
                      <Text style={styles.defaultHint}>
                        default: {p.defaultValue}
                      </Text>
                    ) : null}
                  </View>
                  <TextInput
                    style={styles.input}
                    value={paramValues[p.name] || ''}
                    placeholder={p.defaultValue || `Enter ${p.name}`}
                    placeholderTextColor={colors.textMuted}
                    onChangeText={(val) =>
                      setParamValues((prev) => ({ ...prev, [p.name]: val }))
                    }
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>
              ))}
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
    maxWidth: 640,
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
    maxHeight: 500,
  },
  scrollBody: {
    padding: 16,
  },
  snippetTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 16,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textMuted,
    fontFamily: 'monospace',
    marginBottom: 8,
    letterSpacing: 0.5,
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
  paramName: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.accentYellow,
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
