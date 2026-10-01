import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { Snippet } from '../types/snippet';
import { hasPlaceholders } from '../utils/templateParser';
import { copyToClipboard } from '../utils/clipboard';
import { SyntaxCodeBlock } from './SyntaxCodeBlock';
import { TagBadge } from './TagBadge';

interface SnippetCardProps {
  snippet: Snippet;
  onSelectTag?: (tag: string) => void;
  onSelectCategory?: (category: string) => void;
  onToggleStar: (id: string) => void;
  onToggleVisibility?: (id: string) => void;
  onCopyIncrement: (id: string) => void;
  onEdit: (snippet: Snippet) => void;
  onDelete: (id: string) => void;
  onOpenFiller: (snippet: Snippet) => void;
  onOpenEmulator?: (snippet: Snippet) => void;
}

export const SnippetCard: React.FC<SnippetCardProps> = ({
  snippet,
  onSelectTag,
  onSelectCategory,
  onToggleStar,
  onToggleVisibility,
  onCopyIncrement,
  onEdit,
  onDelete,
  onOpenFiller,
  onOpenEmulator,
}) => {
  const [copiedQuick, setCopiedQuick] = useState(false);
  const [isDescExpanded, setIsDescExpanded] = useState(false);
  const isParameterized = hasPlaceholders(snippet.content);

  const handleQuickCopy = async () => {
    const success = await copyToClipboard(snippet.content);
    if (success) {
      setCopiedQuick(true);
      onCopyIncrement(snippet.id);
      setTimeout(() => setCopiedQuick(false), 2000);
    }
  };

  const getPlatformIcon = () => {
    switch (snippet.platform) {
      case 'linux':
        return 'logo-tux';
      case 'macos':
        return 'logo-apple';
      case 'windows':
        return 'logo-windows';
      default:
        return 'terminal-outline';
    }
  };

  return (
    <View style={styles.card}>
      {/* Top Meta Bar */}
      <View style={styles.topBar}>
        <View style={styles.badgesRow}>
          <TagBadge
            label={snippet.category}
            variant="category"
            onPress={onSelectCategory ? () => onSelectCategory(snippet.category) : undefined}
          />
          <TagBadge
            label={snippet.type}
            variant="type"
          />
          <TagBadge
            label={snippet.isPrivate ? '🔒 private' : '🌐 public'}
            variant="visibility"
            onPress={onToggleVisibility ? () => onToggleVisibility(snippet.id) : undefined}
          />
          {snippet.platform !== 'all' && (
            <TagBadge
              label={snippet.platform}
              variant="platform"
            />
          )}
        </View>

        <View style={styles.topActions}>
          {onToggleVisibility && (
            <TouchableOpacity
              onPress={() => onToggleVisibility(snippet.id)}
              style={styles.iconBtn}
              activeOpacity={0.7}
            >
              <Ionicons
                name={snippet.isPrivate ? 'lock-closed' : 'globe-outline'}
                size={16}
                color={snippet.isPrivate ? colors.danger : colors.accentGreen}
              />
            </TouchableOpacity>
          )}

          <TouchableOpacity
            onPress={() => onToggleStar(snippet.id)}
            style={styles.starBtn}
            activeOpacity={0.7}
          >
            <Ionicons
              name={snippet.starred ? 'star' : 'star-outline'}
              size={18}
              color={snippet.starred ? colors.star : colors.textMuted}
            />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => onEdit(snippet)}
            style={styles.iconBtn}
            activeOpacity={0.7}
          >
            <Ionicons name="pencil-outline" size={16} color={colors.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => onDelete(snippet.id)}
            style={styles.iconBtn}
            activeOpacity={0.7}
          >
            <Ionicons name="trash-outline" size={16} color={colors.danger} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Title */}
      <Text style={styles.title}>{snippet.title}</Text>

      {/* Description if any (toggleable full view on click) */}
      {snippet.description ? (
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => setIsDescExpanded(!isDescExpanded)}
        >
          <Text
            style={styles.description}
            numberOfLines={isDescExpanded ? undefined : 2}
          >
            {snippet.description}
          </Text>
        </TouchableOpacity>
      ) : null}

      {/* Code Block with expandable full view */}
      <SyntaxCodeBlock
        code={snippet.content}
        language={snippet.language}
        onCopied={() => onCopyIncrement(snippet.id)}
        collapsible={true}
        maxHeight={130}
      />

      {/* Footer / Action Bar */}
      <View style={styles.footerBar}>
        {/* Tags */}
        <View style={styles.tagsContainer}>
          {snippet.tags.map((tag) => (
            <TagBadge
              key={tag}
              label={tag}
              onPress={onSelectTag ? () => onSelectTag(tag) : undefined}
            />
          ))}
        </View>

        {/* Copy / Fill / Emulate Buttons & Copy Counter */}
        <View style={styles.bottomActions}>
          <View style={styles.copyCountBadge}>
            <Ionicons name="stats-chart-outline" size={12} color={colors.textMuted} />
            <Text style={styles.copyCountText}>{snippet.copyCount || 0}</Text>
          </View>

          {onOpenEmulator && (
            <TouchableOpacity
              style={styles.emulateBtn}
              onPress={() => onOpenEmulator(snippet)}
              activeOpacity={0.8}
            >
              <Ionicons name="terminal-outline" size={13} color={colors.accentGreen} />
              <Text style={styles.emulateBtnText}>Emulate</Text>
            </TouchableOpacity>
          )}

          {isParameterized ? (
            <TouchableOpacity
              style={styles.fillerBtn}
              onPress={() => onOpenFiller(snippet)}
              activeOpacity={0.8}
            >
              <Ionicons name="flash" size={13} color={colors.accentYellow} />
              <Text style={styles.fillerBtnText}>Fill & Copy</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.quickCopyBtn, copiedQuick && styles.quickCopyActive]}
              onPress={handleQuickCopy}
              activeOpacity={0.8}
            >
              <Ionicons
                name={copiedQuick ? 'checkmark' : 'copy-outline'}
                size={13}
                color={copiedQuick ? '#fff' : colors.primary}
              />
              <Text
                style={[
                  styles.quickCopyText,
                  copiedQuick && { color: '#fff' },
                ]}
              >
                {copiedQuick ? 'Copied' : 'Copy'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: 14,
    marginBottom: 14,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  badgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  topActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  starBtn: {
    padding: 4,
  },
  iconBtn: {
    padding: 4,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  description: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
    marginBottom: 6,
  },
  footerBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    flexWrap: 'wrap',
    gap: 8,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    flex: 1,
  },
  bottomActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  copyCountBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 4,
  },
  copyCountText: {
    fontSize: 11,
    color: colors.textMuted,
    fontFamily: 'monospace',
  },
  emulateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(63, 185, 80, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(63, 185, 80, 0.35)',
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 6,
  },
  emulateBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.accentGreen,
    fontFamily: 'monospace',
  },
  fillerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(227, 179, 65, 0.15)',
    borderWidth: 1,
    borderColor: colors.accentYellow,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  fillerBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.accentYellow,
    fontFamily: 'monospace',
  },
  quickCopyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(88, 166, 255, 0.12)',
    borderWidth: 1,
    borderColor: colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  quickCopyActive: {
    backgroundColor: colors.accentGreen,
    borderColor: colors.accentGreen,
  },
  quickCopyText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
    fontFamily: 'monospace',
  },
});
