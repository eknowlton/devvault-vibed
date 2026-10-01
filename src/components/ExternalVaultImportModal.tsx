import React, { useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { Snippet } from '../types/snippet';
import {
  commitImportedItems,
  fetchRemoteVault,
  ImportEndpointType,
  RemoteItemPreview,
} from '../utils/vaultImporter';

interface ExternalVaultImportModalProps {
  visible: boolean;
  existingSnippets: Snippet[];
  onClose: () => void;
  onImportComplete: (updatedSnippets: Snippet[], count: number) => void;
}

export const ExternalVaultImportModal: React.FC<ExternalVaultImportModalProps> = ({
  visible,
  existingSnippets,
  onClose,
  onImportComplete,
}) => {
  const [serverUrl, setServerUrl] = useState('http://localhost:4141');
  const [apiToken, setApiToken] = useState('');
  const [endpointType, setEndpointType] = useState<ImportEndpointType>('all');
  const [showTokenInput, setShowTokenInput] = useState(false);
  const [skipDuplicatesStrict, setSkipDuplicatesStrict] = useState(true);

  // Fetch status & results
  const [isFetching, setIsFetching] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [fetchedItems, setFetchedItems] = useState<RemoteItemPreview[]>([]);
  const [hasScanned, setHasScanned] = useState(false);
  const [duplicatesCount, setDuplicatesCount] = useState(0);
  const [newCount, setNewCount] = useState(0);

  // Filter query inside results
  const [searchFilter, setSearchFilter] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleFetch = async () => {
    setIsFetching(true);
    setFetchError(null);
    setHasScanned(false);

    try {
      const result = await fetchRemoteVault(serverUrl, existingSnippets, {
        token: apiToken,
        endpointType,
      });

      if (!result.success) {
        setFetchError(result.error || 'Failed to fetch items from remote DevVault server.');
        setFetchedItems([]);
      } else {
        setFetchedItems(result.items);
        setDuplicatesCount(result.duplicatesCount);
        setNewCount(result.newCount);
        setHasScanned(true);

        if (result.items.length === 0) {
          showToast('No entries found on remote server for this endpoint.');
        } else {
          showToast(
            `Found ${result.items.length} items (${result.newCount} new, ${result.duplicatesCount} duplicate)`
          );
        }
      }
    } catch (err: any) {
      setFetchError(err.message || 'An unexpected error occurred while connecting.');
    } finally {
      setIsFetching(false);
    }
  };

  const toggleItemSelection = (index: number) => {
    setFetchedItems((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], selected: !copy[index].selected };
      return copy;
    });
  };

  const handleSelectAllNew = () => {
    setFetchedItems((prev) =>
      prev.map((item) => ({
        ...item,
        selected: !item.isDuplicate,
      }))
    );
  };

  const handleSelectAll = () => {
    setFetchedItems((prev) =>
      prev.map((item) => ({
        ...item,
        selected: skipDuplicatesStrict ? !item.isDuplicate : true,
      }))
    );
  };

  const handleDeselectAll = () => {
    setFetchedItems((prev) =>
      prev.map((item) => ({
        ...item,
        selected: false,
      }))
    );
  };

  // Selected items calculation
  const selectedItems = fetchedItems.filter((i) => i.selected);
  const selectedNewCount = selectedItems.filter((i) => !i.isDuplicate).length;
  const selectedDuplicateCount = selectedItems.filter((i) => i.isDuplicate).length;

  const handleExecuteImport = async () => {
    if (selectedItems.length === 0) {
      showToast('Select at least one item to import.');
      return;
    }

    // Filter items based on strict deduplication if enabled
    const itemsToImport = skipDuplicatesStrict
      ? selectedItems.filter((i) => !i.isDuplicate).map((i) => i.item)
      : selectedItems.map((i) => i.item);

    if (itemsToImport.length === 0) {
      showToast('All selected items were skipped because they are duplicate entries.');
      return;
    }

    setIsImporting(true);
    try {
      const { updatedSnippets, importedCount } = await commitImportedItems(
        itemsToImport,
        existingSnippets,
        {
          addImportedTag: true,
          remoteHost: serverUrl,
        }
      );

      onImportComplete(updatedSnippets, importedCount);
      showToast(`Successfully imported ${importedCount} items!`);
      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err: any) {
      showToast(`Import error: ${err.message || 'Unknown error'}`);
    } finally {
      setIsImporting(false);
    }
  };

  // Filter items in list
  const filteredList = fetchedItems.filter((entry) => {
    if (!searchFilter.trim()) return true;
    const q = searchFilter.toLowerCase();
    return (
      entry.item.title.toLowerCase().includes(q) ||
      entry.item.category.toLowerCase().includes(q) ||
      entry.item.content.toLowerCase().includes(q) ||
      entry.item.tags.some((t) => t.toLowerCase().includes(q))
    );
  });

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalCard}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={styles.iconCircle}>
                <Ionicons name="cloud-download" size={20} color={colors.accentGreen} />
              </View>
              <View>
                <Text style={styles.headerTitle}>Import from Peer DevVault API</Text>
                <Text style={styles.headerSubtitle}>
                  Fetch commands, recipes & snippets from another user with strict deduplication
                </Text>
              </View>
            </View>

            <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.7}>
              <Ionicons name="close" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Toast Banner */}
          {toastMessage && (
            <View style={styles.toastBanner}>
              <Ionicons name="information-circle" size={16} color={colors.primary} />
              <Text style={styles.toastText}>{toastMessage}</Text>
            </View>
          )}

          {/* Body */}
          <ScrollView
            style={styles.modalBody}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={true}
          >
            {/* 1. Connection Config Card */}
            <View style={styles.sectionCard}>
              <Text style={styles.sectionHeading}>REMOTE SERVER CONNECTION</Text>

              {/* URL Input & Presets */}
              <View style={styles.inputGroup}>
                <View style={styles.labelRow}>
                  <Text style={styles.fieldLabel}>DEVVAULT API BASE URL</Text>
                  <View style={styles.presetRow}>
                    <TouchableOpacity
                      style={styles.presetChip}
                      onPress={() => setServerUrl('http://localhost:4141')}
                    >
                      <Text style={styles.presetChipText}>port 4141</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.presetChip}
                      onPress={() => setServerUrl('http://localhost:3000')}
                    >
                      <Text style={styles.presetChipText}>port 3000</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.urlInputRow}>
                  <Ionicons name="globe-outline" size={16} color={colors.textMuted} style={styles.inputIcon} />
                  <TextInput
                    style={styles.urlInput}
                    value={serverUrl}
                    onChangeText={setServerUrl}
                    placeholder="http://192.168.1.100:4141 or http://peer.local:3000"
                    placeholderTextColor={colors.textMuted}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>
              </View>

              {/* Endpoint Scope Selector */}
              <View style={styles.inputGroup}>
                <Text style={styles.fieldLabel}>RESOURCE TYPE TO IMPORT</Text>
                <View style={styles.endpointPills}>
                  {[
                    { key: 'all', label: 'All Items', icon: 'layers-outline' },
                    { key: 'commands', label: 'Commands', icon: 'terminal-outline' },
                    { key: 'recipes', label: 'Recipes', icon: 'reader-outline' },
                    { key: 'snippets', label: 'Snippets', icon: 'code-slash-outline' },
                  ].map((ep) => (
                    <TouchableOpacity
                      key={ep.key}
                      style={[
                        styles.endpointPill,
                        endpointType === ep.key && styles.endpointPillActive,
                      ]}
                      onPress={() => setEndpointType(ep.key as ImportEndpointType)}
                      activeOpacity={0.7}
                    >
                      <Ionicons
                        name={ep.icon as any}
                        size={14}
                        color={endpointType === ep.key ? colors.primary : colors.textMuted}
                      />
                      <Text
                        style={[
                          styles.endpointPillText,
                          endpointType === ep.key && styles.endpointPillTextActive,
                        ]}
                      >
                        {ep.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Optional Bearer Token Row */}
              <View style={styles.inputGroup}>
                <TouchableOpacity
                  style={styles.tokenToggleBtn}
                  onPress={() => setShowTokenInput((prev) => !prev)}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={showTokenInput ? 'chevron-down' : 'chevron-forward'}
                    size={14}
                    color={colors.primary}
                  />
                  <Text style={styles.tokenToggleText}>
                    {showTokenInput ? 'Hide Authentication Token' : '+ Add Bearer Token (for private recipes)'}
                  </Text>
                </TouchableOpacity>

                {showTokenInput && (
                  <TextInput
                    style={[styles.textInput, { marginTop: 6 }]}
                    value={apiToken}
                    onChangeText={setApiToken}
                    placeholder="Optional remote API key or Bearer token..."
                    placeholderTextColor={colors.textMuted}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                )}
              </View>

              {/* Connect / Scan Button */}
              <TouchableOpacity
                style={[styles.scanBtn, isFetching && styles.scanBtnLoading]}
                onPress={handleFetch}
                disabled={isFetching}
                activeOpacity={0.8}
              >
                {isFetching ? (
                  <>
                    <ActivityIndicator size="small" color={colors.textInverse} />
                    <Text style={styles.scanBtnText}>Connecting & Analyzing Vault...</Text>
                  </>
                ) : (
                  <>
                    <Ionicons name="search" size={16} color={colors.textInverse} />
                    <Text style={styles.scanBtnText}>Connect & Scan Remote Vault</Text>
                  </>
                )}
              </TouchableOpacity>

              {/* Error Box */}
              {fetchError && (
                <View style={styles.errorAlert}>
                  <Ionicons name="alert-circle" size={16} color={colors.accentRed} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.errorTitle}>Connection Failed</Text>
                    <Text style={styles.errorDesc}>{fetchError}</Text>
                  </View>
                </View>
              )}
            </View>

            {/* 2. Scanned Results & Deduplication Section */}
            {hasScanned && (
              <View style={styles.sectionCard}>
                {/* Summary Header */}
                <View style={styles.scanSummaryHeader}>
                  <View>
                    <Text style={styles.sectionHeading}>DEDUPLICATION ANALYSIS</Text>
                    <Text style={styles.scanSummarySub}>
                      Found {fetchedItems.length} total entries on remote server
                    </Text>
                  </View>

                  <View style={styles.statusBadgesRow}>
                    <View style={styles.newBadgePill}>
                      <Text style={styles.newBadgeText}>✨ {newCount} NEW</Text>
                    </View>
                    <View style={styles.dupBadgePill}>
                      <Text style={styles.dupBadgeText}>⚠️ {duplicatesCount} DUPLICATES</Text>
                    </View>
                  </View>
                </View>

                {/* Strict Deduplication Setting */}
                <View style={styles.strictDupRow}>
                  <View style={{ flex: 1, paddingRight: 12 }}>
                    <Text style={styles.strictDupTitle}>Strict Deduplication Mode</Text>
                    <Text style={styles.strictDupDesc}>
                      Automatically skips items matching existing titles or identical CLI script bodies.
                    </Text>
                  </View>
                  <Switch
                    value={skipDuplicatesStrict}
                    onValueChange={setSkipDuplicatesStrict}
                    trackColor={{ false: colors.border, true: colors.primary }}
                    thumbColor={colors.textInverse}
                  />
                </View>

                {/* Filter and Selection Tools */}
                <View style={styles.selectionToolbar}>
                  <View style={styles.searchBox}>
                    <Ionicons name="search" size={14} color={colors.textMuted} />
                    <TextInput
                      style={styles.searchInput}
                      value={searchFilter}
                      onChangeText={setSearchFilter}
                      placeholder="Filter remote entries..."
                      placeholderTextColor={colors.textMuted}
                    />
                    {searchFilter.length > 0 && (
                      <TouchableOpacity onPress={() => setSearchFilter('')}>
                        <Ionicons name="close-circle" size={14} color={colors.textMuted} />
                      </TouchableOpacity>
                    )}
                  </View>

                  <View style={styles.selectionActionsRow}>
                    <TouchableOpacity
                      style={styles.selectionSmallBtn}
                      onPress={handleSelectAllNew}
                    >
                      <Text style={styles.selectionSmallBtnText}>Select New ({newCount})</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.selectionSmallBtn}
                      onPress={handleSelectAll}
                    >
                      <Text style={styles.selectionSmallBtnText}>Select All</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.selectionSmallBtn}
                      onPress={handleDeselectAll}
                    >
                      <Text style={styles.selectionSmallBtnText}>Clear</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Items List */}
                <View style={styles.itemsList}>
                  {filteredList.map((entry, idx) => {
                    const isDup = entry.isDuplicate;

                    return (
                      <TouchableOpacity
                        key={entry.item.id || idx}
                        style={[
                          styles.itemCard,
                          entry.selected && styles.itemCardSelected,
                          isDup && styles.itemCardDuplicate,
                        ]}
                        onPress={() => toggleItemSelection(idx)}
                        activeOpacity={0.8}
                      >
                        <View style={styles.itemCardHeader}>
                          {/* Checkbox */}
                          <View
                            style={[
                              styles.checkbox,
                              entry.selected && styles.checkboxSelected,
                              isDup && !entry.selected && styles.checkboxDup,
                            ]}
                          >
                            {entry.selected && (
                              <Ionicons name="checkmark" size={13} color={colors.textInverse} />
                            )}
                          </View>

                          <View style={{ flex: 1 }}>
                            <View style={styles.itemTitleRow}>
                              <Text
                                style={[
                                  styles.itemTitle,
                                  isDup && { color: colors.textSecondary },
                                ]}
                                numberOfLines={1}
                              >
                                {entry.item.title}
                              </Text>

                              {/* Status Tag */}
                              {isDup ? (
                                <View style={styles.dupTag}>
                                  <Text style={styles.dupTagText}>DUPLICATE</Text>
                                </View>
                              ) : (
                                <View style={styles.newTag}>
                                  <Text style={styles.newTagText}>NEW</Text>
                                </View>
                              )}
                            </View>

                            {/* Duplicate Explanation */}
                            {isDup && entry.duplicateReason && (
                              <View style={styles.dupReasonBox}>
                                <Ionicons name="alert" size={12} color="#e3b341" />
                                <Text style={styles.dupReasonText} numberOfLines={2}>
                                  {entry.duplicateReason}
                                </Text>
                              </View>
                            )}

                            {/* Meta Tags Row */}
                            <View style={styles.metaRow}>
                              <View style={styles.typeBadge}>
                                <Text style={styles.typeBadgeText}>
                                  {entry.item.type.toUpperCase()}
                                </Text>
                              </View>
                              <Text style={styles.categoryBadge}>{entry.item.category}</Text>
                              <Text style={styles.platformBadge}>
                                {entry.item.platform.toUpperCase()}
                              </Text>
                              {entry.item.tags.map((t) => (
                                <Text key={t} style={styles.tagText}>
                                  #{t}
                                </Text>
                              ))}
                            </View>
                          </View>
                        </View>

                        {/* Code snippet preview */}
                        <View style={styles.codeSnippetBox}>
                          <Text style={styles.codeSnippetText} numberOfLines={2}>
                            {entry.item.content.trim()}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}
          </ScrollView>

          {/* Footer Controls */}
          {hasScanned && (
            <View style={styles.footer}>
              <View style={styles.footerStatus}>
                <Text style={styles.footerStatusBold}>
                  {selectedItems.length} selected for import
                </Text>
                <Text style={styles.footerStatusSub}>
                  ({selectedNewCount} new entries,{' '}
                  {skipDuplicatesStrict ? '0 duplicate' : `${selectedDuplicateCount} duplicate`} will be imported)
                </Text>
              </View>

              <View style={styles.footerButtons}>
                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={onClose}
                  activeOpacity={0.7}
                >
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.importConfirmBtn,
                    (selectedItems.length === 0 || isImporting) && styles.importConfirmBtnDisabled,
                  ]}
                  onPress={handleExecuteImport}
                  disabled={selectedItems.length === 0 || isImporting}
                  activeOpacity={0.8}
                >
                  {isImporting ? (
                    <ActivityIndicator size="small" color={colors.textInverse} />
                  ) : (
                    <>
                      <Ionicons name="cloud-download-outline" size={16} color={colors.textInverse} />
                      <Text style={styles.importConfirmBtnText}>
                        Import {skipDuplicatesStrict ? selectedNewCount : selectedItems.length} Items
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.78)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalCard: {
    width: '100%',
    maxWidth: 780,
    maxHeight: '92%',
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    ...(Platform.OS === 'web'
      ? ({
          boxShadow: '0 16px 48px rgba(0, 0, 0, 0.65)',
        } as any)
      : {}),
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: 8,
    backgroundColor: 'rgba(63, 185, 80, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(63, 185, 80, 0.3)',
  },
  headerTitle: {
    fontSize: 16,
    fontFamily: 'monospace',
    fontWeight: '700',
    color: colors.textPrimary,
  },
  headerSubtitle: {
    fontSize: 12,
    fontFamily: 'monospace',
    color: colors.textMuted,
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  toastBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(88, 166, 255, 0.15)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(88, 166, 255, 0.3)',
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  toastText: {
    fontSize: 12,
    fontFamily: 'monospace',
    color: colors.primary,
    fontWeight: '600',
  },
  modalBody: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    gap: 16,
  },
  sectionCard: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: 16,
    gap: 14,
  },
  sectionHeading: {
    fontSize: 11,
    fontFamily: 'monospace',
    fontWeight: '700',
    color: colors.textSecondary,
    letterSpacing: 0.5,
  },
  inputGroup: {
    gap: 6,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  fieldLabel: {
    fontSize: 11,
    fontFamily: 'monospace',
    color: colors.textMuted,
    fontWeight: '600',
  },
  presetRow: {
    flexDirection: 'row',
    gap: 6,
  },
  presetChip: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  presetChipText: {
    fontSize: 10,
    fontFamily: 'monospace',
    color: colors.primary,
  },
  urlInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 10,
  },
  inputIcon: {
    marginRight: 8,
  },
  urlInput: {
    flex: 1,
    height: 40,
    color: colors.textPrimary,
    fontFamily: 'monospace',
    fontSize: 13,
  },
  endpointPills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  endpointPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 6,
  },
  endpointPillActive: {
    borderColor: colors.primary,
    backgroundColor: 'rgba(88, 166, 255, 0.12)',
  },
  endpointPillText: {
    fontSize: 11,
    fontFamily: 'monospace',
    color: colors.textSecondary,
  },
  endpointPillTextActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  tokenToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  tokenToggleText: {
    fontSize: 11,
    fontFamily: 'monospace',
    color: colors.primary,
    fontWeight: '600',
  },
  textInput: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: colors.textPrimary,
    fontFamily: 'monospace',
    fontSize: 12,
  },
  scanBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.accentGreen,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 4,
  },
  scanBtnLoading: {
    opacity: 0.8,
  },
  scanBtnText: {
    fontSize: 13,
    fontFamily: 'monospace',
    fontWeight: '700',
    color: colors.textInverse,
  },
  errorAlert: {
    flexDirection: 'row',
    gap: 10,
    backgroundColor: 'rgba(248, 81, 73, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(248, 81, 73, 0.4)',
    borderRadius: 8,
    padding: 12,
  },
  errorTitle: {
    fontSize: 12,
    fontFamily: 'monospace',
    fontWeight: '700',
    color: colors.accentRed,
  },
  errorDesc: {
    fontSize: 11,
    fontFamily: 'monospace',
    color: colors.textSecondary,
    marginTop: 2,
    lineHeight: 16,
  },
  scanSummaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 10,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  scanSummarySub: {
    fontSize: 11,
    fontFamily: 'monospace',
    color: colors.textMuted,
    marginTop: 2,
  },
  statusBadgesRow: {
    flexDirection: 'row',
    gap: 8,
  },
  newBadgePill: {
    backgroundColor: 'rgba(63, 185, 80, 0.15)',
    borderWidth: 1,
    borderColor: '#3fb950',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  newBadgeText: {
    fontSize: 11,
    fontFamily: 'monospace',
    fontWeight: '700',
    color: '#3fb950',
  },
  dupBadgePill: {
    backgroundColor: 'rgba(227, 179, 65, 0.15)',
    borderWidth: 1,
    borderColor: '#e3b341',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  dupBadgeText: {
    fontSize: 11,
    fontFamily: 'monospace',
    fontWeight: '700',
    color: '#e3b341',
  },
  strictDupRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  strictDupTitle: {
    fontSize: 12,
    fontFamily: 'monospace',
    fontWeight: '700',
    color: colors.textPrimary,
  },
  strictDupDesc: {
    fontSize: 11,
    fontFamily: 'monospace',
    color: colors.textMuted,
    marginTop: 2,
    lineHeight: 15,
  },
  selectionToolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 10,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 6,
    paddingHorizontal: 10,
    height: 34,
    flex: 1,
    minWidth: 180,
    gap: 6,
  },
  searchInput: {
    flex: 1,
    color: colors.textPrimary,
    fontFamily: 'monospace',
    fontSize: 12,
  },
  selectionActionsRow: {
    flexDirection: 'row',
    gap: 6,
  },
  selectionSmallBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  selectionSmallBtnText: {
    fontSize: 11,
    fontFamily: 'monospace',
    color: colors.textPrimary,
    fontWeight: '600',
  },
  itemsList: {
    gap: 10,
  },
  itemCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 12,
    gap: 10,
  },
  itemCardSelected: {
    borderColor: colors.primary,
    backgroundColor: 'rgba(88, 166, 255, 0.04)',
  },
  itemCardDuplicate: {
    borderColor: 'rgba(227, 179, 65, 0.4)',
    opacity: 0.85,
  },
  itemCardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
  },
  checkboxSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  checkboxDup: {
    borderColor: 'rgba(227, 179, 65, 0.5)',
  },
  itemTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  itemTitle: {
    fontSize: 13,
    fontFamily: 'monospace',
    fontWeight: '700',
    color: colors.textPrimary,
    flex: 1,
  },
  newTag: {
    backgroundColor: 'rgba(63, 185, 80, 0.15)',
    borderWidth: 1,
    borderColor: '#3fb950',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  newTagText: {
    fontSize: 9,
    fontFamily: 'monospace',
    fontWeight: '700',
    color: '#3fb950',
  },
  dupTag: {
    backgroundColor: 'rgba(227, 179, 65, 0.15)',
    borderWidth: 1,
    borderColor: '#e3b341',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  dupTagText: {
    fontSize: 9,
    fontFamily: 'monospace',
    fontWeight: '700',
    color: '#e3b341',
  },
  dupReasonBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(227, 179, 65, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(227, 179, 65, 0.25)',
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginTop: 4,
  },
  dupReasonText: {
    fontSize: 10,
    fontFamily: 'monospace',
    color: '#e3b341',
    flex: 1,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 6,
  },
  typeBadge: {
    backgroundColor: 'rgba(88, 166, 255, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  typeBadgeText: {
    fontSize: 9,
    fontFamily: 'monospace',
    fontWeight: '700',
    color: colors.primary,
  },
  categoryBadge: {
    fontSize: 10,
    fontFamily: 'monospace',
    color: colors.textMuted,
  },
  platformBadge: {
    fontSize: 10,
    fontFamily: 'monospace',
    color: colors.textSecondary,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 3,
  },
  tagText: {
    fontSize: 10,
    fontFamily: 'monospace',
    color: colors.accentPurple,
  },
  codeSnippetBox: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  codeSnippetText: {
    fontSize: 11,
    fontFamily: 'monospace',
    color: colors.textSecondary,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    flexWrap: 'wrap',
    gap: 12,
  },
  footerStatus: {
    flex: 1,
    minWidth: 200,
  },
  footerStatusBold: {
    fontSize: 13,
    fontFamily: 'monospace',
    fontWeight: '700',
    color: colors.textPrimary,
  },
  footerStatusSub: {
    fontSize: 11,
    fontFamily: 'monospace',
    color: colors.textMuted,
    marginTop: 1,
  },
  footerButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  cancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: colors.border,
  },
  cancelBtnText: {
    fontSize: 12,
    fontFamily: 'monospace',
    fontWeight: '600',
    color: colors.textSecondary,
  },
  importConfirmBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: colors.accentGreen,
  },
  importConfirmBtnDisabled: {
    opacity: 0.5,
  },
  importConfirmBtnText: {
    fontSize: 12,
    fontFamily: 'monospace',
    fontWeight: '700',
    color: colors.textInverse,
  },
});
