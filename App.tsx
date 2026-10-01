import React, { useEffect, useMemo, useState } from 'react';
import {
  FlatList,
  Modal,
  Platform,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from './src/theme/colors';
import { FilterState, Snippet } from './src/types/snippet';
import {
  addOrUpdateSnippet,
  getStoredSnippets,
  incrementSnippetCopyCount,
  removeSnippet,
  toggleSnippetStar,
  toggleSnippetVisibility,
} from './src/storage/snippetStorage';
import { filterAndSortSnippets } from './src/utils/searchEngine';
import { Header } from './src/components/Header';
import { Sidebar } from './src/components/Sidebar';
import { SnippetCard } from './src/components/SnippetCard';
import { SnippetEditorModal } from './src/components/SnippetEditorModal';
import { ParameterFillerModal } from './src/components/ParameterFillerModal';
import { BackupModal } from './src/components/BackupModal';
import { ServerModal } from './src/components/ServerModal';
import { TerminalEmulatorModal } from './src/components/TerminalEmulatorModal';
import { ExternalVaultImportModal } from './src/components/ExternalVaultImportModal';
import { injectGlobalWebStyles } from './src/theme/injectGlobalWebStyles';

// Initialize web darkmode scrollbar and focus styles
injectGlobalWebStyles();

export default function App() {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 840;

  const [snippets, setSnippets] = useState<Snippet[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter and Search State
  const [filters, setFilters] = useState<FilterState>({
    query: '',
    selectedCategory: null,
    selectedTag: null,
    typeFilter: 'all',
    platformFilter: 'all',
    starredOnly: false,
    visibilityFilter: 'all',
    sortBy: 'recentlyUpdated',
  });

  // Modals
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [snippetToEdit, setSnippetToEdit] = useState<Snippet | null>(null);

  const [isFillerOpen, setIsFillerOpen] = useState(false);
  const [fillerSnippet, setFillerSnippet] = useState<Snippet | null>(null);

  const [isEmulatorOpen, setIsEmulatorOpen] = useState(false);
  const [emulatorSnippet, setEmulatorSnippet] = useState<Snippet | null>(null);

  const [isBackupOpen, setIsBackupOpen] = useState(false);
  const [isServerOpen, setIsServerOpen] = useState(false);
  const [isImportRemoteOpen, setIsImportRemoteOpen] = useState(false);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);

  // Load initial data
  const loadData = async () => {
    setLoading(true);
    const data = await getStoredSnippets();
    setSnippets(data);
    setLoading(false);
  };

  useEffect(() => {
    injectGlobalWebStyles();
    loadData();
  }, []);

  // Web keyboard shortcuts
  useEffect(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const handleKeyDown = (e: KeyboardEvent) => {
        // Cmd/Ctrl + N: New Snippet
        if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'n') {
          e.preventDefault();
          setSnippetToEdit(null);
          setIsEditorOpen(true);
        }
        // Esc: close drawer/modals
        if (e.key === 'Escape') {
          setIsMobileDrawerOpen(false);
          setIsEditorOpen(false);
          setIsFillerOpen(false);
          setIsBackupOpen(false);
        }
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, []);

  // Filter and sort items
  const filteredSnippets = useMemo(() => {
    return filterAndSortSnippets(snippets, filters);
  }, [snippets, filters]);

  // Unique categories list
  const categoriesList = useMemo(() => {
    const set = new Set<string>();
    snippets.forEach((s) => set.add(s.category));
    return Array.from(set);
  }, [snippets]);

  // Actions
  const handleToggleStar = async (id: string) => {
    const updated = await toggleSnippetStar(id);
    setSnippets(updated);
  };

  const handleToggleVisibility = async (id: string) => {
    const updated = await toggleSnippetVisibility(id);
    setSnippets(updated);
  };

  const handleCopyIncrement = async (id: string) => {
    const updated = await incrementSnippetCopyCount(id);
    setSnippets(updated);
  };

  const handleDelete = async (id: string) => {
    const updated = await removeSnippet(id);
    setSnippets(updated);
  };

  const handleSaveSnippet = async (snippet: Snippet) => {
    const updated = await addOrUpdateSnippet(snippet);
    setSnippets(updated);
  };

  const handleOpenEditor = (snippet?: Snippet) => {
    setSnippetToEdit(snippet || null);
    setIsEditorOpen(true);
  };

  const handleOpenFiller = (snippet: Snippet) => {
    setFillerSnippet(snippet);
    setIsFillerOpen(true);
  };

  const handleOpenEmulator = (snippet: Snippet) => {
    setEmulatorSnippet(snippet);
    setIsEmulatorOpen(true);
  };

  const handleSaveSnippetOutput = async (
    snippetId: string,
    expectedOutput: string,
    duration: string,
    prompt: string,
    simulatedUser?: string,
    simulatedHost?: string,
    simulatedCwd?: string
  ) => {
    const target = snippets.find((s) => s.id === snippetId);
    if (target) {
      const updated: Snippet = {
        ...target,
        expectedOutput,
        executionDuration: duration,
        simulatedPrompt: prompt,
        simulatedUser,
        simulatedHost,
        simulatedCwd,
        updatedAt: Date.now(),
      };
      const updatedList = await addOrUpdateSnippet(updated);
      setSnippets(updatedList);
      setEmulatorSnippet(updated);
    }
  };

  const handleImportComplete = (updatedSnippets: Snippet[]) => {
    setSnippets(updatedSnippets);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={colors.background} />

      <View style={styles.container}>
        {/* Desktop Sidebar */}
        {isDesktop && (
          <Sidebar
            snippets={snippets}
            filters={filters}
            onUpdateFilters={setFilters}
            onOpenNewSnippet={() => handleOpenEditor()}
            onOpenBackup={() => setIsBackupOpen(true)}
            onOpenServer={() => setIsServerOpen(true)}
            onOpenImportRemote={() => setIsImportRemoteOpen(true)}
          />
        )}

        {/* Main Content Area */}
        <View style={styles.mainContent}>
          <Header
            filters={filters}
            onUpdateFilters={setFilters}
            resultCount={filteredSnippets.length}
            onToggleMobileDrawer={() => setIsMobileDrawerOpen(true)}
            isMobileLayout={!isDesktop}
            onOpenNewSnippet={() => handleOpenEditor()}
            onOpenServer={() => setIsServerOpen(true)}
            onOpenImportRemote={() => setIsImportRemoteOpen(true)}
          />

          {/* Snippet List */}
          <FlatList
            data={filteredSnippets}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={true}
            renderItem={({ item }) => (
              <SnippetCard
                snippet={item}
                onSelectTag={(tag) =>
                  setFilters((prev) => ({
                    ...prev,
                    selectedTag: prev.selectedTag === tag ? null : tag,
                  }))
                }
                onSelectCategory={(cat) =>
                  setFilters((prev) => ({
                    ...prev,
                    selectedCategory: prev.selectedCategory === cat ? null : cat,
                  }))
                }
                onToggleStar={handleToggleStar}
                onToggleVisibility={handleToggleVisibility}
                onCopyIncrement={handleCopyIncrement}
                onEdit={handleOpenEditor}
                onDelete={handleDelete}
                onOpenFiller={handleOpenFiller}
                onOpenEmulator={handleOpenEmulator}
              />
            )}
            ListEmptyComponent={
              !loading ? (
                <View style={styles.emptyContainer}>
                  <Ionicons
                    name="search-outline"
                    size={48}
                    color={colors.textMuted}
                  />
                  <Text style={styles.emptyTitle}>No matching snippets found</Text>
                  <Text style={styles.emptySubtitle}>
                    Try adjusting your search query, clearing filters, or create a new snippet.
                  </Text>
                  <TouchableOpacity
                    style={styles.emptyCreateBtn}
                    onPress={() => handleOpenEditor()}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="add" size={16} color={colors.textInverse} />
                    <Text style={styles.emptyCreateText}>Create New Snippet</Text>
                  </TouchableOpacity>
                </View>
              ) : null
            }
          />
        </View>
      </View>

      {/* Mobile Drawer Modal */}
      {!isDesktop && (
        <Modal
          visible={isMobileDrawerOpen}
          transparent
          animationType="slide"
          onRequestClose={() => setIsMobileDrawerOpen(false)}
        >
          <View style={styles.drawerOverlay}>
            <Sidebar
              snippets={snippets}
              filters={filters}
              onUpdateFilters={setFilters}
              onOpenNewSnippet={() => handleOpenEditor()}
              onOpenBackup={() => setIsBackupOpen(true)}
              onOpenServer={() => setIsServerOpen(true)}
              onOpenImportRemote={() => setIsImportRemoteOpen(true)}
              isMobileDrawer={true}
              onCloseDrawer={() => setIsMobileDrawerOpen(false)}
            />
            <TouchableOpacity
              style={styles.drawerBackdrop}
              onPress={() => setIsMobileDrawerOpen(false)}
              activeOpacity={1}
            />
          </View>
        </Modal>
      )}

      {/* Editor Modal */}
      <SnippetEditorModal
        visible={isEditorOpen}
        snippetToEdit={snippetToEdit}
        categories={categoriesList}
        onClose={() => setIsEditorOpen(false)}
        onSave={handleSaveSnippet}
      />

      {/* Parameter Filler Modal */}
      <ParameterFillerModal
        visible={isFillerOpen}
        snippet={fillerSnippet}
        onClose={() => setIsFillerOpen(false)}
        onSuccessCopy={() => {
          if (fillerSnippet) {
            handleCopyIncrement(fillerSnippet.id);
          }
        }}
      />

      {/* Backup & Portability Modal */}
      <BackupModal
        visible={isBackupOpen}
        onClose={() => setIsBackupOpen(false)}
        onDataChanged={loadData}
      />

      {/* API Server & Sharing Modal */}
      <ServerModal
        visible={isServerOpen}
        onClose={() => setIsServerOpen(false)}
      />

      {/* Terminal Emulation & Social Card Modal */}
      <TerminalEmulatorModal
        visible={isEmulatorOpen}
        snippet={emulatorSnippet}
        onClose={() => {
          setIsEmulatorOpen(false);
          setEmulatorSnippet(null);
        }}
        onSaveSnippetOutput={handleSaveSnippetOutput}
      />

      {/* Remote DevVault Peer Importer Modal */}
      <ExternalVaultImportModal
        visible={isImportRemoteOpen}
        existingSnippets={snippets}
        onClose={() => setIsImportRemoteOpen(false)}
        onImportComplete={handleImportComplete}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: colors.background,
  },
  mainContent: {
    flex: 1,
    backgroundColor: colors.background,
  },
  listContent: {
    padding: 20,
    maxWidth: 960,
    width: '100%',
    alignSelf: 'center',
    paddingBottom: 40,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.textPrimary,
    marginTop: 14,
    marginBottom: 6,
    fontFamily: 'monospace',
  },
  emptySubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    maxWidth: 380,
    lineHeight: 18,
    marginBottom: 20,
  },
  emptyCreateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  emptyCreateText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textInverse,
    fontFamily: 'monospace',
  },
  drawerOverlay: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  drawerBackdrop: {
    flex: 1,
  },
});
