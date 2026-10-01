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
import { PlatformTarget, Snippet, SnippetType } from '../types/snippet';

interface SnippetEditorModalProps {
  visible: boolean;
  snippetToEdit: Snippet | null;
  categories: string[];
  onClose: () => void;
  onSave: (snippet: Snippet) => void;
}

const COMMON_LANGUAGES = [
  'bash',
  'zsh',
  'powershell',
  'typescript',
  'javascript',
  'python',
  'dockerfile',
  'sql',
  'yaml',
  'json',
  'markdown',
];

export const SnippetEditorModal: React.FC<SnippetEditorModalProps> = ({
  visible,
  snippetToEdit,
  categories,
  onClose,
  onSave,
}) => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [type, setType] = useState<SnippetType>('command');
  const [language, setLanguage] = useState('bash');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('General');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [platform, setPlatform] = useState<PlatformTarget>('all');
  const [isPrivate, setIsPrivate] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (snippetToEdit) {
      setTitle(snippetToEdit.title);
      setContent(snippetToEdit.content);
      setType(snippetToEdit.type);
      setLanguage(snippetToEdit.language);
      setDescription(snippetToEdit.description);
      setCategory(snippetToEdit.category);
      setTags([...snippetToEdit.tags]);
      setPlatform(snippetToEdit.platform);
      setIsPrivate(Boolean(snippetToEdit.isPrivate));
    } else {
      setTitle('');
      setContent('');
      setType('command');
      setLanguage('bash');
      setDescription('');
      setCategory(categories[0] || 'General');
      setTags([]);
      setPlatform('all');
      setIsPrivate(false);
    }
    setTagInput('');
    setErrorMessage('');
  }, [snippetToEdit, visible, categories]);

  const handleAddTag = () => {
    const trimmed = tagInput.trim().toLowerCase().replace(/^#/, '');
    if (trimmed && !tags.includes(trimmed)) {
      setTags([...tags, trimmed]);
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((t) => t !== tagToRemove));
  };

  const handleSave = () => {
    if (!title.trim()) {
      setErrorMessage('Please enter a title');
      return;
    }
    if (!content.trim()) {
      setErrorMessage('Please enter command or code content');
      return;
    }

    const snippet: Snippet = {
      id: snippetToEdit ? snippetToEdit.id : `snip-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      title: title.trim(),
      content: content.trim(),
      type,
      language: language.trim().toLowerCase(),
      description: description.trim(),
      category: category.trim() || 'General',
      tags,
      platform,
      starred: snippetToEdit ? snippetToEdit.starred : false,
      isPrivate,
      copyCount: snippetToEdit ? snippetToEdit.copyCount : 0,
      createdAt: snippetToEdit ? snippetToEdit.createdAt : Date.now(),
      updatedAt: Date.now(),
    };

    onSave(snippet);
    onClose();
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
              <Ionicons
                name={snippetToEdit ? 'pencil-outline' : 'add-circle-outline'}
                size={20}
                color={colors.primary}
              />
              <Text style={styles.headerTitle}>
                {snippetToEdit ? 'Edit Snippet' : 'New Snippet / Command'}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.body} contentContainerStyle={styles.scrollBody}>
            {errorMessage ? (
              <View style={styles.errorBox}>
                <Ionicons name="alert-circle" size={16} color={colors.danger} />
                <Text style={styles.errorText}>{errorMessage}</Text>
              </View>
            ) : null}

            {/* Type selector */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>ENTRY TYPE</Text>
              <View style={styles.pillRow}>
                {(['command', 'snippet', 'recipe'] as SnippetType[]).map((t) => (
                  <TouchableOpacity
                    key={t}
                    style={[styles.pill, type === t && styles.pillActive]}
                    onPress={() => setType(t)}
                  >
                    <Text
                      style={[styles.pillText, type === t && styles.pillTextActive]}
                    >
                      {t.toUpperCase()}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Visibility selector */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>VISIBILITY & API ACCESS</Text>
              <View style={styles.pillRow}>
                <TouchableOpacity
                  style={[
                    styles.pill,
                    !isPrivate && {
                      backgroundColor: 'rgba(63, 185, 80, 0.15)',
                      borderColor: colors.accentGreen,
                    },
                  ]}
                  onPress={() => setIsPrivate(false)}
                >
                  <Text
                    style={[
                      styles.pillText,
                      !isPrivate && { color: colors.accentGreen, fontWeight: '700' },
                    ]}
                  >
                    🌐 PUBLIC (API Accessible)
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.pill,
                    isPrivate && {
                      backgroundColor: 'rgba(248, 81, 73, 0.15)',
                      borderColor: colors.danger,
                    },
                  ]}
                  onPress={() => setIsPrivate(true)}
                >
                  <Text
                    style={[
                      styles.pillText,
                      isPrivate && { color: colors.danger, fontWeight: '700' },
                    ]}
                  >
                    🔒 PRIVATE (Hidden from API)
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Title */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>TITLE *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Docker prune all unused containers and volumes"
                placeholderTextColor={colors.textMuted}
                value={title}
                onChangeText={setTitle}
              />
            </View>

            {/* Language and Platform */}
            <View style={styles.rowTwoCols}>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.label}>LANGUAGE / SHELL</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. bash, typescript, python"
                  placeholderTextColor={colors.textMuted}
                  value={language}
                  onChangeText={setLanguage}
                  autoCapitalize="none"
                />
              </View>

              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.label}>PLATFORM</Text>
                <View style={styles.pillRow}>
                  {(['all', 'linux', 'macos', 'windows'] as PlatformTarget[]).map((p) => (
                    <TouchableOpacity
                      key={p}
                      style={[
                        styles.platformPill,
                        platform === p && styles.platformPillActive,
                      ]}
                      onPress={() => setPlatform(p)}
                    >
                      <Text
                        style={[
                          styles.platformPillText,
                          platform === p && styles.platformPillTextActive,
                        ]}
                      >
                        {p}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>

            {/* Content / Code */}
            <View style={styles.inputGroup}>
              <View style={styles.labelWithHint}>
                <Text style={styles.label}>CODE / COMMAND BODY *</Text>
                <Text style={styles.hintText}>
                  Tip: Use {'{{PARAM:default}}'} for interactive variables!
                </Text>
              </View>
              <TextInput
                style={[styles.input, styles.codeTextArea]}
                placeholder={`git checkout -b {{BRANCH_NAME:feature-new}}\ndocker run -p {{PORT:8080}}:80 {{IMAGE}}`}
                placeholderTextColor={colors.textMuted}
                value={content}
                onChangeText={setContent}
                multiline
                numberOfLines={6}
                textAlignVertical="top"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            {/* Category */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>CATEGORY</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Git, Docker, Kubernetes, Linux, General"
                placeholderTextColor={colors.textMuted}
                value={category}
                onChangeText={setCategory}
              />
              {/* Category suggestion chips */}
              <View style={styles.quickChipsRow}>
                {categories.slice(0, 5).map((cat) => (
                  <TouchableOpacity
                    key={cat}
                    style={styles.quickChip}
                    onPress={() => setCategory(cat)}
                  >
                    <Text style={styles.quickChipText}>{cat}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Description / Notes */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>DESCRIPTION / NOTES</Text>
              <TextInput
                style={[styles.input, styles.descTextArea]}
                placeholder="Explain what the flags do, caveats, prerequisites..."
                placeholderTextColor={colors.textMuted}
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </View>

            {/* Tags */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>TAGS</Text>
              <View style={styles.tagInputRow}>
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  placeholder="Type tag name and click Add"
                  placeholderTextColor={colors.textMuted}
                  value={tagInput}
                  onChangeText={setTagInput}
                  onSubmitEditing={handleAddTag}
                  autoCapitalize="none"
                />
                <TouchableOpacity
                  style={styles.addTagBtn}
                  onPress={handleAddTag}
                  activeOpacity={0.7}
                >
                  <Text style={styles.addTagBtnText}>Add Tag</Text>
                </TouchableOpacity>
              </View>

              {tags.length > 0 && (
                <View style={styles.tagsList}>
                  {tags.map((t) => (
                    <TouchableOpacity
                      key={t}
                      style={styles.tagItem}
                      onPress={() => handleRemoveTag(t)}
                    >
                      <Text style={styles.tagItemText}>#{t}</Text>
                      <Ionicons name="close" size={13} color={colors.textSecondary} />
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          </ScrollView>

          {/* Footer */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={onClose}
              activeOpacity={0.7}
            >
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.saveBtn}
              onPress={handleSave}
              activeOpacity={0.8}
            >
              <Ionicons name="checkmark" size={16} color={colors.textInverse} />
              <Text style={styles.saveBtnText}>
                {snippetToEdit ? 'Update Snippet' : 'Save Snippet'}
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
    maxWidth: 700,
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
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
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
  body: {
    flex: 1,
  },
  scrollBody: {
    padding: 18,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(248, 81, 73, 0.15)',
    borderWidth: 1,
    borderColor: colors.danger,
    borderRadius: 6,
    padding: 10,
    marginBottom: 14,
  },
  errorText: {
    fontSize: 12,
    color: colors.danger,
    fontFamily: 'monospace',
  },
  inputGroup: {
    marginBottom: 14,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textMuted,
    fontFamily: 'monospace',
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  labelWithHint: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  hintText: {
    fontSize: 11,
    color: colors.accentYellow,
    fontFamily: 'monospace',
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
  codeTextArea: {
    minHeight: 120,
    lineHeight: 19,
  },
  descTextArea: {
    minHeight: 65,
    lineHeight: 18,
  },
  pillRow: {
    flexDirection: 'row',
    gap: 8,
  },
  pill: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
  },
  pillActive: {
    backgroundColor: 'rgba(88, 166, 255, 0.15)',
    borderColor: colors.primary,
  },
  pillText: {
    fontSize: 11,
    fontFamily: 'monospace',
    color: colors.textSecondary,
    fontWeight: '600',
  },
  pillTextActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  rowTwoCols: {
    flexDirection: 'row',
    gap: 12,
  },
  platformPill: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
  },
  platformPillActive: {
    backgroundColor: 'rgba(86, 212, 221, 0.15)',
    borderColor: colors.accentCyan,
  },
  platformPillText: {
    fontSize: 11,
    fontFamily: 'monospace',
    color: colors.textMuted,
    textTransform: 'uppercase',
  },
  platformPillTextActive: {
    color: colors.accentCyan,
    fontWeight: '700',
  },
  quickChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 6,
  },
  quickChip: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  quickChipText: {
    fontSize: 11,
    color: colors.textSecondary,
    fontFamily: 'monospace',
  },
  tagInputRow: {
    flexDirection: 'row',
    gap: 8,
  },
  addTagBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 6,
  },
  addTagBtnText: {
    fontSize: 12,
    color: colors.textPrimary,
    fontFamily: 'monospace',
  },
  tagsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
  },
  tagItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.tagBg,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  tagItemText: {
    fontSize: 11,
    color: colors.tagText,
    fontFamily: 'monospace',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
  },
  cancelBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  cancelBtnText: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 6,
  },
  saveBtnText: {
    color: colors.textInverse,
    fontWeight: '700',
    fontSize: 13,
    fontFamily: 'monospace',
  },
});
