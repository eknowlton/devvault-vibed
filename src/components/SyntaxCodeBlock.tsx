import React, { useState } from 'react';
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { copyToClipboard } from '../utils/clipboard';
import { tokenizeLine } from '../utils/syntaxHighlighter';

interface SyntaxCodeBlockProps {
  code: string;
  language?: string;
  showLineNumbers?: boolean;
  onCopied?: () => void;
  maxHeight?: number;
  collapsible?: boolean;
  defaultExpanded?: boolean;
}

export const SyntaxCodeBlock: React.FC<SyntaxCodeBlockProps> = ({
  code,
  language = 'bash',
  showLineNumbers = false,
  onCopied,
  maxHeight = 130,
  collapsible = true,
  defaultExpanded = false,
}) => {
  const [copied, setCopied] = useState(false);
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  const lines = code.split('\n');
  const isMultiLine = lines.length > 4;
  const canExpand = collapsible && isMultiLine;
  const displayLineNumbers = showLineNumbers || (isExpanded && lines.length > 2);

  const handleCopy = async () => {
    const success = await copyToClipboard(code);
    if (success) {
      setCopied(true);
      if (onCopied) onCopied();
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Language-aware syntax tokenized line rendering
  const renderHighlightedLine = (line: string, lineIndex: number) => {
    const tokens = tokenizeLine(line, language);

    return (
      <Text key={lineIndex} style={styles.baseCodeText}>
        {tokens.map((token, tIdx) => {
          let tokenStyle = styles.tokenText;
          switch (token.type) {
            case 'comment':
              tokenStyle = styles.tokenComment;
              break;
            case 'string':
              tokenStyle = styles.tokenString;
              break;
            case 'placeholder':
              tokenStyle = styles.tokenPlaceholder;
              break;
            case 'flag':
              tokenStyle = styles.tokenFlag;
              break;
            case 'keyword':
              tokenStyle = styles.tokenKeyword;
              break;
            case 'command':
              tokenStyle = styles.tokenCommand;
              break;
            case 'subcommand':
              tokenStyle = styles.tokenSubcommand;
              break;
            case 'function':
              tokenStyle = styles.tokenFunction;
              break;
            case 'type':
              tokenStyle = styles.tokenType;
              break;
            case 'variable':
              tokenStyle = styles.tokenVariable;
              break;
            case 'number':
              tokenStyle = styles.tokenNumber;
              break;
            case 'operator':
              tokenStyle = styles.tokenOperator;
              break;
            case 'text':
            default:
              tokenStyle = styles.tokenText;
              break;
          }

          return (
            <Text key={tIdx} style={tokenStyle}>
              {token.text}
            </Text>
          );
        })}
      </Text>
    );
  };

  return (
    <View style={styles.container}>
      {/* Code Header Bar */}
      <View style={styles.headerBar}>
        <View style={styles.headerLeft}>
          <View style={styles.langBadge}>
            <Text style={styles.langText}>{language.toLowerCase()}</Text>
          </View>
          {isMultiLine && (
            <View style={styles.lineCountBadge}>
              <Text style={styles.lineCountText}>{lines.length} lines</Text>
            </View>
          )}
        </View>

        <View style={styles.headerRight}>
          {canExpand && (
            <TouchableOpacity
              onPress={() => setIsExpanded(!isExpanded)}
              style={styles.expandHeaderBtn}
              activeOpacity={0.7}
            >
              <Ionicons
                name={isExpanded ? 'chevron-up' : 'chevron-down'}
                size={14}
                color={colors.primary}
              />
              <Text style={styles.expandHeaderText}>
                {isExpanded ? 'Collapse' : 'Expand'}
              </Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            onPress={handleCopy}
            style={[styles.copyButton, copied && styles.copyButtonActive]}
            activeOpacity={0.7}
          >
            <Ionicons
              name={copied ? 'checkmark-circle' : 'copy-outline'}
              size={14}
              color={copied ? colors.accentGreen : colors.textSecondary}
            />
            <Text
              style={[
                styles.copyButtonText,
                copied && { color: colors.accentGreen },
              ]}
            >
              {copied ? 'Copied' : 'Copy'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Code Viewport with horizontal scrolling */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={Platform.OS === 'web'}
        contentContainerStyle={styles.scrollContent}
        style={[
          styles.viewport,
          canExpand && !isExpanded ? { maxHeight } : undefined,
        ]}
        // @ts-ignore - React Native Web dataSet
        dataSet={{ codeBlock: 'true' }}
      >
        <View style={styles.codeBody}>
          {displayLineNumbers && (
            <View style={styles.lineNumberColumn}>
              {lines.map((_, i) => (
                <Text key={i} style={styles.lineNumberText}>
                  {i + 1}
                </Text>
              ))}
            </View>
          )}
          <View style={styles.linesColumn}>
            {lines.map((l, i) => (
              <View key={i} style={styles.codeLine}>
                {renderHighlightedLine(l, i)}
              </View>
            ))}
          </View>
        </View>
      </ScrollView>

      {/* Expand / Collapse Footer Bar */}
      {canExpand && !isExpanded && (
        <TouchableOpacity
          style={styles.expandBottomBar}
          onPress={() => setIsExpanded(true)}
          activeOpacity={0.8}
        >
          <Ionicons name="chevron-down" size={14} color={colors.primary} />
          <Text style={styles.expandBottomText}>
            Show full snippet ({lines.length} lines)
          </Text>
        </TouchableOpacity>
      )}

      {canExpand && isExpanded && (
        <TouchableOpacity
          style={styles.collapseBottomBar}
          onPress={() => setIsExpanded(false)}
          activeOpacity={0.8}
        >
          <Ionicons name="chevron-up" size={13} color={colors.textMuted} />
          <Text style={styles.collapseBottomText}>Collapse snippet</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.codeBg,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.codeBorder,
    overflow: 'hidden',
    marginVertical: 6,
  },
  headerBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderBottomWidth: 1,
    borderBottomColor: colors.codeBorder,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  langBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  langText: {
    color: colors.textMuted,
    fontSize: 11,
    fontFamily: 'monospace',
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  lineCountBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  lineCountText: {
    color: colors.textMuted,
    fontSize: 11,
    fontFamily: 'monospace',
  },
  expandHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    backgroundColor: 'rgba(88, 166, 255, 0.08)',
  },
  expandHeaderText: {
    fontSize: 11,
    color: colors.primary,
    fontFamily: 'monospace',
    fontWeight: '600',
  },
  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  copyButtonActive: {
    backgroundColor: 'rgba(63, 185, 80, 0.15)',
  },
  copyButtonText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontFamily: 'monospace',
    marginLeft: 4,
  },
  viewport: {
    width: '100%',
  },
  scrollContent: {
    padding: 12,
  },
  codeBody: {
    flexDirection: 'row',
  },
  lineNumberColumn: {
    paddingRight: 12,
    marginRight: 12,
    borderRightWidth: 1,
    borderRightColor: colors.codeBorder,
    userSelect: 'none' as any,
  },
  lineNumberText: {
    fontSize: 13,
    lineHeight: 20,
    fontFamily: 'monospace',
    color: colors.textMuted,
    textAlign: 'right',
  },
  linesColumn: {
    flex: 1,
  },
  codeLine: {
    minHeight: 20,
  },
  baseCodeText: {
    fontSize: 13,
    lineHeight: 20,
    fontFamily: 'monospace',
    color: colors.codeText,
  },
  tokenComment: {
    color: colors.codeComment,
    fontStyle: 'italic',
  },
  tokenString: {
    color: colors.codeString,
  },
  tokenPlaceholder: {
    color: colors.codePlaceholder,
    backgroundColor: 'rgba(227, 179, 65, 0.2)',
    fontWeight: '700',
    paddingHorizontal: 2,
    borderRadius: 3,
  },
  tokenFlag: {
    color: colors.codeFlag,
    fontWeight: '600',
  },
  tokenKeyword: {
    color: colors.codeKeyword,
    fontWeight: '700',
  },
  tokenCommand: {
    color: colors.codeCommand,
    fontWeight: '700',
  },
  tokenSubcommand: {
    color: colors.codeSubcommand,
    fontWeight: '600',
  },
  tokenFunction: {
    color: colors.codeFunction,
    fontWeight: '600',
  },
  tokenType: {
    color: colors.codeType,
    fontWeight: '600',
  },
  tokenVariable: {
    color: colors.codeVariable,
  },
  tokenNumber: {
    color: colors.codeNumber,
  },
  tokenOperator: {
    color: colors.codeOperator,
    fontWeight: '700',
  },
  tokenText: {
    color: colors.codeText,
  },
  expandBottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    backgroundColor: 'rgba(88, 166, 255, 0.07)',
    borderTopWidth: 1,
    borderTopColor: colors.codeBorder,
  },
  expandBottomText: {
    fontSize: 12,
    color: colors.primary,
    fontFamily: 'monospace',
    fontWeight: '600',
  },
  collapseBottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderTopWidth: 1,
    borderTopColor: colors.codeBorder,
  },
  collapseBottomText: {
    fontSize: 11,
    color: colors.textMuted,
    fontFamily: 'monospace',
  },
});
