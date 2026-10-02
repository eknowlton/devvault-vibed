import React, { useRef, useState } from 'react';
import {
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { FilterState, SortOption } from '../types/snippet';
import { type AppEnvironment } from '../types/environment';

interface HeaderProps {
  filters: FilterState;
  onUpdateFilters: (updater: (prev: FilterState) => FilterState) => void;
  resultCount: number;
  onToggleMobileDrawer: () => void;
  isMobileLayout: boolean;
  onOpenNewSnippet: () => void;
  onOpenServer: () => void;
  onOpenImportRemote?: () => void;
  serverActive?: boolean;
  activeEnvironment?: AppEnvironment | null;
  onOpenEnvironmentModal?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  filters,
  onUpdateFilters,
  resultCount,
  onToggleMobileDrawer,
  isMobileLayout,
  onOpenNewSnippet,
  onOpenServer,
  onOpenImportRemote,
  serverActive,
  activeEnvironment,
  onOpenEnvironmentModal,
}) => {
  const inputRef = useRef<TextInput>(null);
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  const handleClearSearch = () => {
    onUpdateFilters((prev) => ({ ...prev, query: '' }));
    inputRef.current?.focus();
  };

  const handleNextSort = () => {
    const sorts: SortOption[] = ['recentlyUpdated', 'mostCopied', 'alphabetical'];
    const nextIdx = (sorts.indexOf(filters.sortBy) + 1) % sorts.length;
    onUpdateFilters((prev) => ({ ...prev, sortBy: sorts[nextIdx] }));
  };

  const getSortLabel = () => {
    switch (filters.sortBy) {
      case 'mostCopied':
        return 'Most Copied';
      case 'alphabetical':
        return 'A-Z';
      case 'recentlyUpdated':
      default:
        return 'Recent';
    }
  };

  const hasActiveFilters =
    Boolean(filters.selectedCategory) ||
    Boolean(filters.selectedTag) ||
    filters.starredOnly ||
    filters.visibilityFilter !== 'all' ||
    filters.typeFilter !== 'all' ||
    filters.platformFilter !== 'all';

  const clearAllFilters = () => {
    onUpdateFilters((prev) => ({
      ...prev,
      query: '',
      selectedCategory: null,
      selectedTag: null,
      starredOnly: false,
      typeFilter: 'all',
      platformFilter: 'all',
      visibilityFilter: 'all',
    }));
  };

  return (
    <View style={styles.container}>
      {/* Search Input Bar */}
      <View style={styles.mainRow}>
        {isMobileLayout && (
          <TouchableOpacity
            style={styles.mobileMenuBtn}
            onPress={onToggleMobileDrawer}
          >
            <Ionicons name="menu" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
        )}

        {/* Global Search Bar (Full Fieldset Focus Ring) */}
        <View
          style={[styles.searchBar, isSearchFocused && styles.searchBarFocused]}
          // @ts-ignore - React Native Web dataSet
          dataSet={{ searchbar: 'true' }}
          onStartShouldSetResponder={() => {
            inputRef.current?.focus();
            return false;
          }}
        >
          <Ionicons
            name="search"
            size={17}
            color={isSearchFocused ? colors.primary : colors.textMuted}
            style={styles.searchIcon}
          />
          <TextInput
            ref={inputRef}
            style={styles.input}
            placeholder="Search commands, code, #tags, or keywords... (Cmd+K)"
            placeholderTextColor={colors.textMuted}
            value={filters.query}
            onChangeText={(text) =>
              onUpdateFilters((prev) => ({ ...prev, query: text }))
            }
            onFocus={() => setIsSearchFocused(true)}
            onBlur={() => setIsSearchFocused(false)}
            autoCapitalize="none"
            autoCorrect={false}
          />

          {filters.query ? (
            <TouchableOpacity onPress={handleClearSearch} style={styles.clearBtn}>
              <Ionicons name="close-circle" size={16} color={colors.textMuted} />
            </TouchableOpacity>
          ) : (
            Platform.OS === 'web' && (
              <View style={styles.shortcutBadge}>
                <Text style={styles.shortcutText}>/</Text>
              </View>
            )
          )}
        </View>

        {/* Sort Button */}
        <TouchableOpacity
          style={styles.sortBtn}
          onPress={handleNextSort}
          activeOpacity={0.7}
        >
          <Ionicons name="swap-vertical" size={15} color={colors.textSecondary} />
          <Text style={styles.sortText}>{getSortLabel()}</Text>
        </TouchableOpacity>

        {/* Active Environment Switcher Button */}
        {activeEnvironment && onOpenEnvironmentModal && (
          <TouchableOpacity
            style={[
              styles.envBtn,
              { borderColor: `${activeEnvironment.color}55` },
            ]}
            onPress={onOpenEnvironmentModal}
            activeOpacity={0.7}
          >
            <View style={[styles.envDot, { backgroundColor: activeEnvironment.color }]} />
            {!isMobileLayout && (
              <Text style={[styles.envBtnText, { color: activeEnvironment.color }]}>
                {activeEnvironment.name}
              </Text>
            )}
            <Ionicons name="chevron-down" size={12} color={colors.textSecondary} />
          </TouchableOpacity>
        )}

        {/* API Server Button */}
        <TouchableOpacity
          style={[styles.serverBtn, serverActive && { borderColor: colors.accentGreen }]}
          onPress={onOpenServer}
          activeOpacity={0.7}
        >
          <View style={{ position: 'relative' }}>
            <Ionicons name="server-outline" size={15} color={serverActive ? colors.accentGreen : colors.primary} />
            {serverActive && (
              <View
                style={{
                  position: 'absolute',
                  top: -2,
                  right: -3,
                  width: 6,
                  height: 6,
                  borderRadius: 3,
                  backgroundColor: colors.accentGreen,
                }}
              />
            )}
          </View>
          {!isMobileLayout && (
            <Text style={[styles.serverBtnText, serverActive && { color: colors.accentGreen }]}>
              API Server
            </Text>
          )}
        </TouchableOpacity>

        {/* Remote Import Button */}
        {onOpenImportRemote && (
          <TouchableOpacity
            style={styles.importRemoteBtn}
            onPress={onOpenImportRemote}
            activeOpacity={0.7}
          >
            <Ionicons name="cloud-download-outline" size={15} color={colors.accentGreen} />
            {!isMobileLayout && <Text style={styles.importRemoteBtnText}>Import Remote</Text>}
          </TouchableOpacity>
        )}

        {/* Mobile New Snippet Button */}
        {isMobileLayout && (
          <TouchableOpacity
            style={styles.mobileAddBtn}
            onPress={onOpenNewSnippet}
          >
            <Ionicons name="add" size={22} color={colors.textInverse} />
          </TouchableOpacity>
        )}
      </View>

      {/* Active Filter Chips Bar (if any filters active) */}
      {(hasActiveFilters || filters.query) && (
        <View style={styles.activeFiltersRow}>
          <Text style={styles.filterMatchText}>{resultCount} matches</Text>

          {filters.visibilityFilter !== 'all' && (
            <TouchableOpacity
              style={styles.filterPill}
              onPress={() =>
                onUpdateFilters((prev) => ({ ...prev, visibilityFilter: 'all' }))
              }
            >
              <Text style={styles.filterPillText}>
                {filters.visibilityFilter === 'public' ? '🌐 Public Only' : '🔒 Private Only'}
              </Text>
              <Ionicons name="close" size={13} color={colors.primary} />
            </TouchableOpacity>
          )}

          {filters.selectedCategory && (
            <TouchableOpacity
              style={styles.filterPill}
              onPress={() =>
                onUpdateFilters((prev) => ({ ...prev, selectedCategory: null }))
              }
            >
              <Text style={styles.filterPillText}>
                Category: {filters.selectedCategory}
              </Text>
              <Ionicons name="close" size={13} color={colors.primary} />
            </TouchableOpacity>
          )}

          {filters.selectedTag && (
            <TouchableOpacity
              style={styles.filterPill}
              onPress={() =>
                onUpdateFilters((prev) => ({ ...prev, selectedTag: null }))
              }
            >
              <Text style={styles.filterPillText}>#{filters.selectedTag}</Text>
              <Ionicons name="close" size={13} color={colors.primary} />
            </TouchableOpacity>
          )}

          {filters.typeFilter !== 'all' && (
            <TouchableOpacity
              style={styles.filterPill}
              onPress={() =>
                onUpdateFilters((prev) => ({ ...prev, typeFilter: 'all' }))
              }
            >
              <Text style={styles.filterPillText}>Type: {filters.typeFilter}</Text>
              <Ionicons name="close" size={13} color={colors.primary} />
            </TouchableOpacity>
          )}

          {filters.platformFilter !== 'all' && (
            <TouchableOpacity
              style={styles.filterPill}
              onPress={() =>
                onUpdateFilters((prev) => ({ ...prev, platformFilter: 'all' }))
              }
            >
              <Text style={styles.filterPillText}>OS: {filters.platformFilter}</Text>
              <Ionicons name="close" size={13} color={colors.primary} />
            </TouchableOpacity>
          )}

          {filters.starredOnly && (
            <TouchableOpacity
              style={styles.filterPill}
              onPress={() =>
                onUpdateFilters((prev) => ({ ...prev, starredOnly: false }))
              }
            >
              <Text style={styles.filterPillText}>Starred Only</Text>
              <Ionicons name="close" size={13} color={colors.primary} />
            </TouchableOpacity>
          )}

          <TouchableOpacity onPress={clearAllFilters} style={styles.resetBtn}>
            <Text style={styles.resetText}>Clear filters</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  mainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  mobileMenuBtn: {
    padding: 6,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    height: 42,
  },
  searchBarFocused: {
    borderColor: colors.primary,
    ...(Platform.OS === 'web'
      ? ({
          boxShadow: '0 0 0 3px rgba(88, 166, 255, 0.25), 0 1px 3px rgba(0, 0, 0, 0.4)',
        } as any)
      : {
          borderWidth: 1.5,
        }),
  },
  searchIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: colors.textPrimary,
    fontFamily: 'monospace',
    height: '100%',
    borderWidth: 0,
    ...(Platform.OS === 'web'
      ? ({
          outline: 'none',
          outlineStyle: 'none',
          boxShadow: 'none',
        } as any)
      : {}),
  },
  clearBtn: {
    padding: 4,
  },
  shortcutBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.07)',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: colors.border,
  },
  shortcutText: {
    fontSize: 11,
    color: colors.textMuted,
    fontFamily: 'monospace',
  },
  sortBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 42,
  },
  sortText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontFamily: 'monospace',
    fontWeight: '600',
  },
  envBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    height: 42,
  },
  envDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  envBtnText: {
    fontSize: 12,
    fontFamily: 'monospace',
    fontWeight: '700',
  },
  serverBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(88, 166, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(88, 166, 255, 0.25)',
    borderRadius: 8,
    paddingHorizontal: 10,
    height: 42,
  },
  serverBtnText: {
    fontSize: 12,
    color: colors.primary,
    fontFamily: 'monospace',
    fontWeight: '700',
  },
  importRemoteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(63, 185, 80, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(63, 185, 80, 0.3)',
    borderRadius: 8,
    paddingHorizontal: 10,
    height: 42,
  },
  importRemoteBtnText: {
    fontSize: 12,
    color: colors.accentGreen,
    fontFamily: 'monospace',
    fontWeight: '700',
  },
  mobileAddBtn: {
    backgroundColor: colors.primary,
    width: 42,
    height: 42,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  activeFiltersRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  filterMatchText: {
    fontSize: 12,
    color: colors.textMuted,
    fontFamily: 'monospace',
    marginRight: 4,
  },
  filterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(88, 166, 255, 0.12)',
    borderColor: colors.primary,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 14,
  },
  filterPillText: {
    fontSize: 11,
    color: colors.primary,
    fontFamily: 'monospace',
    fontWeight: '600',
  },
  resetBtn: {
    marginLeft: 'auto',
  },
  resetText: {
    fontSize: 11,
    color: colors.accentRed,
    fontFamily: 'monospace',
  },
});
