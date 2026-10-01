import React from 'react';
import { StyleProp, StyleSheet, Text, TouchableOpacity, View, ViewStyle } from 'react-native';
import { colors } from '../theme/colors';

interface TagBadgeProps {
  label: string;
  isActive?: boolean;
  onPress?: () => void;
  count?: number;
  variant?: 'tag' | 'category' | 'platform' | 'type' | 'visibility';
  style?: StyleProp<ViewStyle>;
}

export const TagBadge: React.FC<TagBadgeProps> = ({
  label,
  isActive = false,
  onPress,
  count,
  variant = 'tag',
  style,
}) => {
  const isClickable = Boolean(onPress);

  const getVariantStyles = () => {
    switch (variant) {
      case 'visibility':
        const isPriv = label.toLowerCase().includes('private');
        return {
          bg: isPriv ? 'rgba(248, 81, 73, 0.12)' : 'rgba(63, 185, 80, 0.12)',
          border: isPriv ? 'rgba(248, 81, 73, 0.35)' : 'rgba(63, 185, 80, 0.35)',
          text: isPriv ? colors.danger : colors.accentGreen,
        };
      case 'category':
        return {
          bg: isActive ? colors.primaryGlow : 'rgba(88, 166, 255, 0.08)',
          border: isActive ? colors.primary : 'rgba(88, 166, 255, 0.2)',
          text: isActive ? colors.primaryHover : colors.primary,
        };
      case 'platform':
        return {
          bg: 'rgba(86, 212, 221, 0.1)',
          border: 'rgba(86, 212, 221, 0.3)',
          text: colors.accentCyan,
        };
      case 'type':
        return {
          bg: 'rgba(210, 168, 255, 0.1)',
          border: 'rgba(210, 168, 255, 0.3)',
          text: colors.accentPurple,
        };
      case 'tag':
      default:
        return {
          bg: isActive ? colors.tagActiveBg : colors.tagBg,
          border: isActive ? colors.tagActiveBorder : colors.tagBorder,
          text: isActive ? colors.tagActiveText : colors.tagText,
        };
    }
  };

  const vStyles = getVariantStyles();

  const content = (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: vStyles.bg,
          borderColor: vStyles.border,
        },
      ]}
    >
      <Text
        style={[
          styles.text,
          { color: vStyles.text },
          isActive && styles.activeText,
        ]}
      >
        {variant === 'tag' && !label.startsWith('#') ? `#${label}` : label}
      </Text>
      {count !== undefined && (
        <View style={styles.countBadge}>
          <Text style={styles.countText}>{count}</Text>
        </View>
      )}
    </View>
  );

  if (isClickable) {
    return (
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={onPress}
        style={[styles.badgeWrapper, style]}
      >
        {content}
      </TouchableOpacity>
    );
  }

  return (
    <View style={[styles.badgeWrapper, style]}>
      {content}
    </View>
  );
};

const styles = StyleSheet.create({
  badgeWrapper: {
    marginRight: 8,
    marginBottom: 4,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  text: {
    fontSize: 12,
    fontFamily: 'monospace',
    fontWeight: '500',
  },
  activeText: {
    fontWeight: '700',
  },
  countBadge: {
    marginLeft: 6,
    paddingHorizontal: 5,
    paddingVertical: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 8,
  },
  countText: {
    fontSize: 10,
    color: colors.textSecondary,
    fontFamily: 'monospace',
  },
});
