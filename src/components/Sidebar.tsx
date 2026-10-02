import React from 'react';
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
import { FilterState, PlatformTarget, Snippet, SnippetType } from '../types/snippet';
import { type AppEnvironment } from '../types/environment';
import { TagBadge } from './TagBadge';

interface SidebarProps {
  snippets: Snippet[];
  filters: FilterState;
  onUpdateFilters: (updater: (prev: FilterState) => FilterState) => void;
  onOpenNewSnippet: () => void;
  onOpenBackup: () => void;
  onOpenServer: () => void;
  onOpenImportRemote?: () => void;
  serverActive?: boolean;
  isMobileDrawer?: boolean;
  onCloseDrawer?: () => void;
  activeEnvironment?: AppEnvironment | null;
  environments?: AppEnvironment[];
  onOpenEnvironmentModal?: () => void;
  onSelectEnvironment?: (id: string) => Promise<void> | void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  snippets,
  filters,
  onUpdateFilters,
  onOpenNewSnippet,
  onOpenBackup,
  onOpenServer,
  onOpenImportRemote,
  serverActive,
  isMobileDrawer = false,
  onCloseDrawer,
  activeEnvironment,
  environments = [],
  onOpenEnvironmentModal,
  onSelectEnvironment,
}) => {
  // Aggregate categories
  const categoriesMap: Record<string, number> = {};
  const tagsMap: Record<string, number> = {};
  let starredCount = 0;
  let publicCount = 0;
  let privateCount = 0;
  let commandsCount = 0;
  let snippetsCount = 0;
  let recipesCount = 0;

  snippets.forEach((s) => {
    if (s.starred) starredCount++;
    if (s.isPrivate) privateCount++;
    else publicCount++;
    if (s.type === 'command') commandsCount++;
    else if (s.type === 'snippet') snippetsCount++;
    else if (s.type === 'recipe') recipesCount++;

    categoriesMap[s.category] = (categoriesMap[s.category] || 0) + 1;
    s.tags.forEach((t) => {
      tagsMap[t] = (tagsMap[t] || 0) + 1;
    });
  });

  const categories = Object.keys(categoriesMap).sort();
  const topTags = Object.entries(tagsMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20);

  const handleSelectCategory = (cat: string | null) => {
    onUpdateFilters((prev) => ({
      ...prev,
      selectedCategory: prev.selectedCategory === cat ? null : cat,
    }));
    if (isMobileDrawer && onCloseDrawer) onCloseDrawer();
  };

  const handleSelectTag = (tag: string | null) => {
    onUpdateFilters((prev) => ({
      ...prev,
      selectedTag: prev.selectedTag === tag ? null : tag,
    }));
    if (isMobileDrawer && onCloseDrawer) onCloseDrawer();
  };

  const handleTypeFilter = (type: SnippetType | 'all') => {
    onUpdateFilters((prev) => ({
      ...prev,
      typeFilter: prev.typeFilter === type && type !== 'all' ? 'all' : type,
    }));
    if (isMobileDrawer && onCloseDrawer) onCloseDrawer();
  };

  const handlePlatformFilter = (platform: PlatformTarget) => {
    onUpdateFilters((prev) => ({
      ...prev,
      platformFilter: prev.platformFilter === platform && platform !== 'all' ? 'all' : platform,
    }));
    if (isMobileDrawer && onCloseDrawer) onCloseDrawer();
  };

  return (
    <View style={[styles.container, isMobileDrawer && styles.drawerContainer]}>
      {/* Brand Header */}
      <View style={styles.brandHeader}>
        <View style={styles.brandTitleRow}>
          <View style={styles.logoBadge}>
            <Ionicons name="terminal" size={18} color={colors.primary} />
          </View>
          <View>
            <Text style={styles.brandName}>DevVault</Text>
            <Text style={styles.brandSubtitle}>CLI & Snippet DB</Text>
          </View>
        </View>

        {isMobileDrawer && onCloseDrawer && (
          <TouchableOpacity onPress={onCloseDrawer} style={styles.closeDrawerBtn}>
            <Ionicons name="close" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      {/* New Snippet Primary Action Button */}
      <TouchableOpacity
        style={styles.newSnippetBtn}
        onPress={() => {
          onOpenNewSnippet();
          if (isMobileDrawer && onCloseDrawer) onCloseDrawer();
        }}
        activeOpacity={0.8}
      >
        <Ionicons name="add" size={18} color={colors.textInverse} />
        <Text style={styles.newSnippetText}>New Entry (Cmd+N)</Text>
      </TouchableOpacity>

      <ScrollView style={styles.scrollArea} showsVerticalScrollIndicator={Platform.OS === 'web'}>
        {/* App Environments Section */}
        {environments.length > 0 && onOpenEnvironmentModal && (
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>ENVIRONMENT</Text>
              <TouchableOpacity
                onPress={() => {
                  onOpenEnvironmentModal();
                  if (isMobileDrawer && onCloseDrawer) onCloseDrawer();
                }}
                style={styles.manageSectionBtn}
              >
                <Ionicons name="options-outline" size={13} color={colors.primary} />
                <Text style={styles.manageSectionText}>Manage</Text>
              </TouchableOpacity>
            </View>

            {environments.map((env) => {
              const isActive = env.id === activeEnvironment?.id;
              return (
                <TouchableOpacity
                  key={env.id}
                  style={[styles.navItem, isActive && styles.navItemActive]}
                  onPress={() => {
                    if (onSelectEnvironment) onSelectEnvironment(env.id);
                  }}
                  activeOpacity={0.7}
                >
                  <View style={[styles.envDot, { backgroundColor: env.color }]} />
                  <Text
                    style={[
                      styles.navItemText,
                      isActive && { color: colors.textPrimary, fontWeight: '700' },
                    ]}
                    numberOfLines={1}
                  >
                    {env.name}
                  </Text>
                  {isActive && (
                    <View
                      style={[
                        styles.activeEnvPill,
                        { backgroundColor: `${env.color}22`, borderColor: env.color },
                      ]}
                    >
                      <Text style={[styles.activeEnvPillText, { color: env.color }]}>
                        ACTIVE
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* Quick Views */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>LIBRARY</Text>

          <TouchableOpacity
            style={[
              styles.navItem,
              !filters.selectedCategory &&
                !filters.selectedTag &&
                !filters.starredOnly &&
                filters.typeFilter === 'all' &&
                styles.navItemActive,
            ]}
            onPress={() => {
              onUpdateFilters((prev) => ({
                ...prev,
                selectedCategory: null,
                selectedTag: null,
                starredOnly: false,
                typeFilter: 'all',
              }));
              if (isMobileDrawer && onCloseDrawer) onCloseDrawer();
            }}
          >
            <Ionicons name="albums-outline" size={16} color={colors.textPrimary} />
            <Text style={styles.navItemText}>All Snippets</Text>
            <Text style={styles.countText}>{snippets.length}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.navItem, filters.starredOnly && styles.navItemActive]}
            onPress={() => {
              onUpdateFilters((prev) => ({
                ...prev,
                starredOnly: !prev.starredOnly,
              }));
              if (isMobileDrawer && onCloseDrawer) onCloseDrawer();
            }}
          >
            <Ionicons name="star" size={16} color={colors.star} />
            <Text style={styles.navItemText}>Starred</Text>
            <Text style={styles.countText}>{starredCount}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.navItem,
              filters.visibilityFilter === 'public' && styles.navItemActive,
            ]}
            onPress={() => {
              onUpdateFilters((prev) => ({
                ...prev,
                visibilityFilter: prev.visibilityFilter === 'public' ? 'all' : 'public',
              }));
              if (isMobileDrawer && onCloseDrawer) onCloseDrawer();
            }}
          >
            <Ionicons name="globe-outline" size={16} color={colors.accentGreen} />
            <Text style={styles.navItemText}>Public (API)</Text>
            <Text style={styles.countText}>{publicCount}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.navItem,
              filters.visibilityFilter === 'private' && styles.navItemActive,
            ]}
            onPress={() => {
              onUpdateFilters((prev) => ({
                ...prev,
                visibilityFilter: prev.visibilityFilter === 'private' ? 'all' : 'private',
              }));
              if (isMobileDrawer && onCloseDrawer) onCloseDrawer();
            }}
          >
            <Ionicons name="lock-closed-outline" size={16} color={colors.danger} />
            <Text style={styles.navItemText}>Private (Auth Only)</Text>
            <Text style={styles.countText}>{privateCount}</Text>
          </TouchableOpacity>
        </View>

        {/* Types */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>ENTRY TYPES</Text>

          <TouchableOpacity
            style={[
              styles.navItem,
              filters.typeFilter === 'command' && styles.navItemActive,
            ]}
            onPress={() => handleTypeFilter('command')}
          >
            <Ionicons name="terminal-outline" size={16} color={colors.accentGreen} />
            <Text style={styles.navItemText}>Commands</Text>
            <Text style={styles.countText}>{commandsCount}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.navItem,
              filters.typeFilter === 'snippet' && styles.navItemActive,
            ]}
            onPress={() => handleTypeFilter('snippet')}
          >
            <Ionicons name="code-slash-outline" size={16} color={colors.accentPurple} />
            <Text style={styles.navItemText}>Code Snippets</Text>
            <Text style={styles.countText}>{snippetsCount}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.navItem,
              filters.typeFilter === 'recipe' && styles.navItemActive,
            ]}
            onPress={() => handleTypeFilter('recipe')}
          >
            <Ionicons name="document-text-outline" size={16} color={colors.accentOrange} />
            <Text style={styles.navItemText}>Recipes</Text>
            <Text style={styles.countText}>{recipesCount}</Text>
          </TouchableOpacity>
        </View>

        {/* Platform Selector */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>PLATFORM / OS</Text>
          <View style={styles.platformRow}>
            {(['all', 'linux', 'macos', 'windows'] as PlatformTarget[]).map((p) => (
              <TouchableOpacity
                key={p}
                style={[
                  styles.platformPill,
                  filters.platformFilter === p && styles.platformPillActive,
                ]}
                onPress={() => handlePlatformFilter(p)}
              >
                <Text
                  style={[
                    styles.platformText,
                    filters.platformFilter === p && styles.platformTextActive,
                  ]}
                >
                  {p.toUpperCase()}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Categories */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>CATEGORIES</Text>
          {categories.map((cat) => {
            const isSelected = filters.selectedCategory?.toLowerCase() === cat.toLowerCase();
            return (
              <TouchableOpacity
                key={cat}
                style={[styles.navItem, isSelected && styles.navItemActive]}
                onPress={() => handleSelectCategory(cat)}
              >
                <Ionicons
                  name={isSelected ? 'folder-open' : 'folder-outline'}
                  size={15}
                  color={isSelected ? colors.primary : colors.textSecondary}
                />
                <Text
                  style={[
                    styles.navItemText,
                    isSelected && { color: colors.primary, fontWeight: '700' },
                  ]}
                >
                  {cat}
                </Text>
                <Text style={styles.countText}>{categoriesMap[cat]}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Popular Tags */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>TAGS</Text>
          <View style={styles.tagCloud}>
            {topTags.map(([tag, count]) => {
              const isSelected = filters.selectedTag?.toLowerCase() === tag.toLowerCase();
              return (
                <TagBadge
                  key={tag}
                  label={tag}
                  count={count}
                  isActive={isSelected}
                  onPress={() => handleSelectTag(tag)}
                />
              );
            })}
          </View>
        </View>
      </ScrollView>

      {/* Footer Tools */}
      <View style={styles.footerTools}>
        {onOpenEnvironmentModal && (
          <TouchableOpacity
            style={styles.toolBtn}
            onPress={() => {
              onOpenEnvironmentModal();
              if (isMobileDrawer && onCloseDrawer) onCloseDrawer();
            }}
          >
            <Ionicons name="earth-outline" size={16} color={activeEnvironment?.color || colors.primary} />
            <Text style={[styles.toolBtnText, { color: activeEnvironment?.color || colors.primary, fontWeight: '700' }]}>
              Environment: {activeEnvironment?.name || 'Default'}
            </Text>
          </TouchableOpacity>
        )}

        {onOpenImportRemote && (
          <TouchableOpacity
            style={styles.toolBtn}
            onPress={() => {
              onOpenImportRemote();
              if (isMobileDrawer && onCloseDrawer) onCloseDrawer();
            }}
          >
            <Ionicons name="cloud-download-outline" size={16} color={colors.accentGreen} />
            <Text style={[styles.toolBtnText, { color: colors.accentGreen, fontWeight: '700' }]}>
              Import Remote Vault
            </Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[styles.toolBtn, serverActive && { borderColor: colors.accentGreen, backgroundColor: 'rgba(63, 185, 80, 0.08)' }]}
          onPress={() => {
            onOpenServer();
            if (isMobileDrawer && onCloseDrawer) onCloseDrawer();
          }}
        >
          <Ionicons name="server-outline" size={16} color={serverActive ? colors.accentGreen : colors.primary} />
          <Text style={[styles.toolBtnText, { color: serverActive ? colors.accentGreen : colors.primary, fontWeight: '700' }]}>
            API Server & Sharing {serverActive ? '●' : ''}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.toolBtn}
          onPress={() => {
            onOpenBackup();
            if (isMobileDrawer && onCloseDrawer) onCloseDrawer();
          }}
        >
          <Ionicons name="save-outline" size={16} color={colors.textSecondary} />
          <Text style={styles.toolBtnText}>Backup & JSON Import/Export</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: 280,
    backgroundColor: colors.surface,
    borderRightWidth: 1,
    borderRightColor: colors.border,
    paddingHorizontal: 16,
    paddingVertical: 18,
    height: '100%',
  },
  drawerContainer: {
    width: 320,
    maxWidth: '85%',
  },
  brandHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  brandTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  logoBadge: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: 'rgba(88, 166, 255, 0.12)',
    borderWidth: 1,
    borderColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  brandName: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.textPrimary,
    fontFamily: 'monospace',
    letterSpacing: 0.5,
  },
  brandSubtitle: {
    fontSize: 11,
    color: colors.textMuted,
    fontFamily: 'monospace',
  },
  closeDrawerBtn: {
    padding: 6,
  },
  newSnippetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.primary,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
    marginBottom: 16,
  },
  newSnippetText: {
    color: colors.textInverse,
    fontWeight: '700',
    fontSize: 13,
    fontFamily: 'monospace',
  },
  scrollArea: {
    flex: 1,
  },
  section: {
    marginBottom: 20,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  manageSectionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: 'rgba(88, 166, 255, 0.1)',
  },
  manageSectionText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.primary,
    fontFamily: 'monospace',
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textMuted,
    fontFamily: 'monospace',
    letterSpacing: 0.8,
  },
  envDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  activeEnvPill: {
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    marginLeft: 4,
  },
  activeEnvPillText: {
    fontSize: 9,
    fontWeight: '800',
    fontFamily: 'monospace',
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 7,
    paddingHorizontal: 8,
    borderRadius: 6,
    marginBottom: 2,
    gap: 10,
  },
  navItemActive: {
    backgroundColor: 'rgba(88, 166, 255, 0.12)',
  },
  navItemText: {
    flex: 1,
    fontSize: 13,
    color: colors.textPrimary,
  },
  countText: {
    fontSize: 11,
    color: colors.textMuted,
    fontFamily: 'monospace',
  },
  platformRow: {
    flexDirection: 'row',
    gap: 6,
  },
  platformPill: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 5,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  platformPillActive: {
    backgroundColor: 'rgba(88, 166, 255, 0.15)',
    borderColor: colors.primary,
  },
  platformText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.textSecondary,
    fontFamily: 'monospace',
  },
  platformTextActive: {
    color: colors.primary,
  },
  tagCloud: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  footerTools: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 12,
  },
  toolBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  toolBtnText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontFamily: 'monospace',
  },
});
