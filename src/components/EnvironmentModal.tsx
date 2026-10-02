import React, { useEffect, useState } from 'react';
import {
  Alert,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { type AppEnvironment } from '../types/environment';
import { copyToClipboard } from '../utils/clipboard';

interface EnvironmentModalProps {
  visible: boolean;
  environments: AppEnvironment[];
  activeEnvironmentId: string;
  onClose: () => void;
  onSelectActive: (id: string) => Promise<void>;
  onSaveEnvironment: (env: AppEnvironment) => Promise<void>;
  onDeleteEnvironment: (id: string) => Promise<void>;
  onResetDefaults: () => Promise<void>;
}

const COLOR_PALETTE = [
  '#3fb950', // Emerald Green
  '#58a6ff', // Azure Blue
  '#d29922', // Amber / Gold
  '#f85149', // Coral Red
  '#bc8cff', // Purple
  '#39c5bb', // Cyan / Teal
  '#f0883e', // Orange
  '#e3b341', // Star Yellow
];

interface VariableEntry {
  key: string;
  value: string;
}

export const EnvironmentModal: React.FC<EnvironmentModalProps> = ({
  visible,
  environments,
  activeEnvironmentId,
  onClose,
  onSelectActive,
  onSaveEnvironment,
  onDeleteEnvironment,
  onResetDefaults,
}) => {
  const [selectedEnvId, setSelectedEnvId] = useState<string>(activeEnvironmentId);
  const [name, setName] = useState('');
  const [color, setColor] = useState('#3fb950');
  const [description, setDescription] = useState('');
  const [variableEntries, setVariableEntries] = useState<VariableEntry[]>([]);
  const [importText, setImportText] = useState('');
  const [showImportBox, setShowImportBox] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Sync state when visible or active env changes
  useEffect(() => {
    if (visible) {
      const targetId = environments.some((e) => e.id === selectedEnvId)
        ? selectedEnvId
        : activeEnvironmentId || environments[0]?.id || '';
      setSelectedEnvId(targetId);
      loadEnvToForm(targetId);
      setShowImportBox(false);
      setFeedbackMsg(null);
    }
  }, [visible, activeEnvironmentId, environments]);

  const loadEnvToForm = (id: string) => {
    const target = environments.find((e) => e.id === id);
    if (target) {
      setName(target.name);
      setColor(target.color || '#3fb950');
      setDescription(target.description || '');
      const entries: VariableEntry[] = Object.entries(target.variables).map(([k, v]) => ({
        key: k,
        value: v,
      }));
      setVariableEntries(entries);
    }
  };

  const handleSelectEnvironmentTab = (id: string) => {
    setSelectedEnvId(id);
    loadEnvToForm(id);
    setShowImportBox(false);
    setFeedbackMsg(null);
  };

  const handleAddVariable = () => {
    setVariableEntries((prev) => [...prev, { key: '', value: '' }]);
  };

  const handleUpdateVariableKey = (index: number, newKey: string) => {
    setVariableEntries((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], key: newKey.toUpperCase().replace(/[^A-Z0-9_-]/g, '_') };
      return copy;
    });
  };

  const handleUpdateVariableValue = (index: number, newValue: string) => {
    setVariableEntries((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], value: newValue };
      return copy;
    });
  };

  const handleRemoveVariable = (index: number) => {
    setVariableEntries((prev) => prev.filter((_, i) => i !== index));
  };

  const handleCreateNewEnvironment = () => {
    const newId = `env-${Date.now()}`;
    const newEnv: AppEnvironment = {
      id: newId,
      name: 'Custom Environment',
      color: '#58a6ff',
      description: 'Custom environment parameters',
      variables: {
        PORT: '8080',
        HOST: 'localhost',
      },
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    onSaveEnvironment(newEnv).then(() => {
      setSelectedEnvId(newId);
      setName(newEnv.name);
      setColor(newEnv.color);
      setDescription(newEnv.description || '');
      setVariableEntries([
        { key: 'PORT', value: '8080' },
        { key: 'HOST', value: 'localhost' },
      ]);
      setFeedbackMsg({ text: 'Created new environment', type: 'success' });
    });
  };

  const handleDuplicate = () => {
    const target = environments.find((e) => e.id === selectedEnvId);
    if (!target) return;

    const newId = `env-${Date.now()}`;
    const duplicateEnv: AppEnvironment = {
      id: newId,
      name: `${target.name} (Copy)`,
      color: target.color,
      description: target.description,
      variables: { ...target.variables },
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    onSaveEnvironment(duplicateEnv).then(() => {
      setSelectedEnvId(newId);
      loadEnvToForm(newId);
      setFeedbackMsg({ text: `Duplicated ${target.name}`, type: 'success' });
    });
  };

  const handleDelete = () => {
    if (environments.length <= 1) {
      Alert.alert('Cannot Delete', 'At least one environment must remain.');
      return;
    }
    const currentName = name;
    onDeleteEnvironment(selectedEnvId).then(() => {
      setFeedbackMsg({ text: `Deleted "${currentName}"`, type: 'success' });
    });
  };

  const handleSaveCurrent = async () => {
    if (!name.trim()) {
      setFeedbackMsg({ text: 'Environment name cannot be empty', type: 'error' });
      return;
    }

    const varsObj: Record<string, string> = {};
    for (const entry of variableEntries) {
      const trimmedKey = entry.key.trim();
      if (trimmedKey) {
        varsObj[trimmedKey] = entry.value;
      }
    }

    const updated: AppEnvironment = {
      id: selectedEnvId,
      name: name.trim(),
      color,
      description: description.trim(),
      variables: varsObj,
      createdAt: environments.find((e) => e.id === selectedEnvId)?.createdAt || Date.now(),
      updatedAt: Date.now(),
    };

    await onSaveEnvironment(updated);
    setFeedbackMsg({ text: `Saved "${updated.name}" successfully!`, type: 'success' });
    setTimeout(() => setFeedbackMsg(null), 3000);
  };

  const handleExportEnv = async () => {
    const lines = variableEntries
      .filter((e) => e.key.trim())
      .map((e) => `${e.key.trim()}=${e.value}`);
    const envContent = `# DevVault Environment: ${name}\n` + lines.join('\n');
    const success = await copyToClipboard(envContent);
    if (success) {
      setFeedbackMsg({ text: `Exported ${lines.length} variables to clipboard!`, type: 'success' });
      setTimeout(() => setFeedbackMsg(null), 3000);
    }
  };

  const handleApplyImport = () => {
    if (!importText.trim()) return;

    const importedVars: Record<string, string> = {};
    // Check if JSON
    try {
      const parsed = JSON.parse(importText);
      if (typeof parsed === 'object' && parsed !== null) {
        for (const [k, v] of Object.entries(parsed)) {
          importedVars[k.toUpperCase().trim()] = String(v);
        }
      }
    } catch {
      // Parse .env format
      const lines = importText.split('\n');
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const eqIdx = trimmed.indexOf('=');
        if (eqIdx > 0) {
          const k = trimmed.substring(0, eqIdx).trim().toUpperCase();
          let v = trimmed.substring(eqIdx + 1).trim();
          if (
            (v.startsWith('"') && v.endsWith('"')) ||
            (v.startsWith("'") && v.endsWith("'"))
          ) {
            v = v.substring(1, v.length - 1);
          }
          importedVars[k] = v;
        }
      }
    }

    const count = Object.keys(importedVars).length;
    if (count === 0) {
      setFeedbackMsg({ text: 'No valid variables found in pasted content.', type: 'error' });
      return;
    }

    // Merge into entries
    const existingMap = new Map(variableEntries.map((e) => [e.key, e.value]));
    for (const [k, v] of Object.entries(importedVars)) {
      existingMap.set(k, v);
    }

    const mergedEntries: VariableEntry[] = Array.from(existingMap.entries()).map(
      ([k, v]) => ({ key: k, value: v })
    );
    setVariableEntries(mergedEntries);
    setShowImportBox(false);
    setImportText('');
    setFeedbackMsg({ text: `Imported ${count} variables! Click Save to apply.`, type: 'success' });
  };

  const selectedEnv = environments.find((e) => e.id === selectedEnvId);
  const isSelectedActive = selectedEnvId === activeEnvironmentId;

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
              <View style={[styles.headerIconBadge, { backgroundColor: 'rgba(88, 166, 255, 0.12)' }]}>
                <Ionicons name="earth" size={20} color={colors.primary} />
              </View>
              <View>
                <Text style={styles.title}>App Environments & Template Variables</Text>
                <Text style={styles.subtitle}>
                  Configure environment-specific variables (ports, hostnames, namespaces) for snippet recipes
                </Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Feedback banner */}
          {feedbackMsg && (
            <View
              style={[
                styles.feedbackBanner,
                feedbackMsg.type === 'success'
                  ? styles.feedbackSuccess
                  : styles.feedbackError,
              ]}
            >
              <Ionicons
                name={
                  feedbackMsg.type === 'success'
                    ? 'checkmark-circle'
                    : 'alert-circle'
                }
                size={16}
                color={
                  feedbackMsg.type === 'success'
                    ? colors.accentGreen
                    : colors.danger
                }
              />
              <Text
                style={[
                  styles.feedbackText,
                  feedbackMsg.type === 'success'
                    ? { color: colors.accentGreen }
                    : { color: colors.danger },
                ]}
              >
                {feedbackMsg.text}
              </Text>
            </View>
          )}

          {/* Two-Pane Body */}
          <View style={styles.body}>
            {/* Left Column: Environment List */}
            <View style={styles.leftPane}>
              <View style={styles.leftPaneHeader}>
                <Text style={styles.paneLabel}>ENVIRONMENTS</Text>
                <TouchableOpacity
                  style={styles.addEnvBtn}
                  onPress={handleCreateNewEnvironment}
                >
                  <Ionicons name="add" size={14} color={colors.primary} />
                  <Text style={styles.addEnvBtnText}>New</Text>
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.envListScroll}>
                {environments.map((env) => {
                  const isSelected = env.id === selectedEnvId;
                  const isActive = env.id === activeEnvironmentId;
                  const varCount = Object.keys(env.variables).length;

                  return (
                    <TouchableOpacity
                      key={env.id}
                      style={[
                        styles.envItem,
                        isSelected && styles.envItemActive,
                      ]}
                      onPress={() => handleSelectEnvironmentTab(env.id)}
                      activeOpacity={0.7}
                    >
                      <View style={[styles.envDot, { backgroundColor: env.color }]} />
                      <View style={styles.envItemInfo}>
                        <View style={styles.envItemTopRow}>
                          <Text
                            style={[
                              styles.envItemName,
                              isSelected && { color: colors.textPrimary, fontWeight: '700' },
                            ]}
                            numberOfLines={1}
                          >
                            {env.name}
                          </Text>
                          {isActive && (
                            <View
                              style={[
                                styles.activeBadge,
                                { backgroundColor: `${env.color}22`, borderColor: env.color },
                              ]}
                            >
                              <Text style={[styles.activeBadgeText, { color: env.color }]}>
                                ACTIVE
                              </Text>
                            </View>
                          )}
                        </View>
                        <Text style={styles.envItemMeta}>
                          {varCount} variable{varCount === 1 ? '' : 's'}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              <View style={styles.leftPaneFooter}>
                <TouchableOpacity
                  style={styles.resetBtn}
                  onPress={onResetDefaults}
                >
                  <Ionicons name="refresh-outline" size={13} color={colors.textMuted} />
                  <Text style={styles.resetBtnText}>Reset Defaults</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Right Column: Selected Environment Details & Variables Editor */}
            <ScrollView style={styles.rightPane} contentContainerStyle={styles.rightPaneContent}>
              {/* Form Controls */}
              <View style={styles.formRow}>
                <View style={styles.formColLarge}>
                  <Text style={styles.inputLabel}>ENVIRONMENT NAME</Text>
                  <TextInput
                    style={styles.textInput}
                    value={name}
                    onChangeText={setName}
                    placeholder="e.g. Staging, Cloud EKS, Local"
                    placeholderTextColor={colors.textMuted}
                  />
                </View>

                <View style={styles.formColSmall}>
                  <Text style={styles.inputLabel}>ACCENT COLOR</Text>
                  <View style={styles.colorPaletteRow}>
                    {COLOR_PALETTE.map((c) => (
                      <TouchableOpacity
                        key={c}
                        style={[
                          styles.colorSwatch,
                          { backgroundColor: c },
                          color === c && styles.colorSwatchActive,
                        ]}
                        onPress={() => setColor(c)}
                      />
                    ))}
                  </View>
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.inputLabel}>DESCRIPTION / PURPOSE</Text>
                <TextInput
                  style={styles.textInput}
                  value={description}
                  onChangeText={setDescription}
                  placeholder="e.g. Pre-production testing environment with QA namespace"
                  placeholderTextColor={colors.textMuted}
                />
              </View>

              {/* Set Active / Status Bar */}
              <View style={styles.activeStatusBar}>
                <View style={styles.activeStatusInfo}>
                  <Ionicons
                    name={isSelectedActive ? 'checkmark-circle' : 'radio-button-off'}
                    size={18}
                    color={isSelectedActive ? color : colors.textMuted}
                  />
                  <Text style={styles.activeStatusText}>
                    {isSelectedActive
                      ? 'This is the active app-wide environment'
                      : 'Not currently active'}
                  </Text>
                </View>

                {!isSelectedActive && (
                  <TouchableOpacity
                    style={[styles.setActiveBtn, { borderColor: color }]}
                    onPress={() => onSelectActive(selectedEnvId)}
                  >
                    <Ionicons name="radio-button-on" size={14} color={color} />
                    <Text style={[styles.setActiveBtnText, { color }]}>
                      Set as Active
                    </Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* Variables Section */}
              <View style={styles.variablesSection}>
                <View style={styles.varsHeaderRow}>
                  <View>
                    <Text style={styles.sectionTitle}>TEMPLATE PARAMETER VARIABLES</Text>
                    <Text style={styles.sectionSubtitle}>
                      Automatically populates matching {'{{KEY}}'} placeholders in recipes and commands
                    </Text>
                  </View>

                  <View style={styles.varsHeaderActions}>
                    <TouchableOpacity
                      style={styles.utilityBtn}
                      onPress={() => setShowImportBox(!showImportBox)}
                    >
                      <Ionicons name="download-outline" size={14} color={colors.primary} />
                      <Text style={styles.utilityBtnText}>Import .env</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.utilityBtn}
                      onPress={handleExportEnv}
                    >
                      <Ionicons name="copy-outline" size={14} color={colors.accentGreen} />
                      <Text style={[styles.utilityBtnText, { color: colors.accentGreen }]}>
                        Export .env
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.addVarBtn}
                      onPress={handleAddVariable}
                    >
                      <Ionicons name="add" size={16} color={colors.textInverse} />
                      <Text style={styles.addVarBtnText}>Add Variable</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Import Box */}
                {showImportBox && (
                  <View style={styles.importBox}>
                    <Text style={styles.importBoxTitle}>
                      Paste .env formatted lines or JSON object:
                    </Text>
                    <TextInput
                      style={styles.importTextArea}
                      multiline
                      numberOfLines={4}
                      value={importText}
                      onChangeText={setImportText}
                      placeholder={`PORT=8080\nHOST=staging.internal\nNAMESPACE=staging`}
                      placeholderTextColor={colors.textMuted}
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                    <View style={styles.importBoxActions}>
                      <TouchableOpacity
                        style={styles.importCancelBtn}
                        onPress={() => setShowImportBox(false)}
                      >
                        <Text style={styles.importCancelText}>Cancel</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.importApplyBtn}
                        onPress={handleApplyImport}
                      >
                        <Ionicons name="checkmark" size={14} color={colors.textInverse} />
                        <Text style={styles.importApplyText}>Parse & Merge</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}

                {/* Table Header */}
                <View style={styles.tableHeader}>
                  <Text style={[styles.thText, { flex: 2 }]}>VARIABLE KEY</Text>
                  <Text style={[styles.thText, { flex: 3 }]}>VALUE</Text>
                  <View style={{ width: 40 }} />
                </View>

                {/* Table Rows */}
                {variableEntries.length === 0 ? (
                  <View style={styles.emptyVars}>
                    <Text style={styles.emptyVarsText}>
                      No variables defined for this environment. Click "Add Variable" or "Import .env" to start.
                    </Text>
                  </View>
                ) : (
                  variableEntries.map((entry, idx) => (
                    <View key={idx} style={styles.tableRow}>
                      <View style={{ flex: 2, marginRight: 8 }}>
                        <TextInput
                          style={styles.keyInput}
                          value={entry.key}
                          onChangeText={(txt) => handleUpdateVariableKey(idx, txt)}
                          placeholder="e.g. PORT"
                          placeholderTextColor={colors.textMuted}
                          autoCapitalize="characters"
                          autoCorrect={false}
                        />
                      </View>
                      <View style={{ flex: 3, marginRight: 8 }}>
                        <TextInput
                          style={styles.valInput}
                          value={entry.value}
                          onChangeText={(txt) => handleUpdateVariableValue(idx, txt)}
                          placeholder="Value"
                          placeholderTextColor={colors.textMuted}
                          autoCapitalize="none"
                          autoCorrect={false}
                        />
                      </View>
                      <TouchableOpacity
                        style={styles.removeRowBtn}
                        onPress={() => handleRemoveVariable(idx)}
                      >
                        <Ionicons name="trash-outline" size={16} color={colors.danger} />
                      </TouchableOpacity>
                    </View>
                  ))
                )}
              </View>

              {/* Action Buttons */}
              <View style={styles.rightPaneBottomActions}>
                <View style={styles.mgmtRow}>
                  <TouchableOpacity
                    style={styles.dupBtn}
                    onPress={handleDuplicate}
                  >
                    <Ionicons name="copy-outline" size={14} color={colors.textSecondary} />
                    <Text style={styles.dupBtnText}>Duplicate</Text>
                  </TouchableOpacity>

                  {environments.length > 1 && (
                    <TouchableOpacity
                      style={styles.deleteEnvBtn}
                      onPress={handleDelete}
                    >
                      <Ionicons name="trash-outline" size={14} color={colors.danger} />
                      <Text style={styles.deleteEnvBtnText}>Delete</Text>
                    </TouchableOpacity>
                  )}
                </View>

                <TouchableOpacity
                  style={styles.saveBtn}
                  onPress={handleSaveCurrent}
                  activeOpacity={0.8}
                >
                  <Ionicons name="save-outline" size={16} color={colors.textInverse} />
                  <Text style={styles.saveBtnText}>Save Environment</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.78)',
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
    maxWidth: 860,
    height: '85%',
    maxHeight: 700,
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
    gap: 12,
  },
  headerIconBadge: {
    width: 36,
    height: 36,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    fontFamily: 'monospace',
  },
  subtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  closeBtn: {
    padding: 4,
  },
  feedbackBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  feedbackSuccess: {
    backgroundColor: 'rgba(63, 185, 80, 0.12)',
    borderBottomColor: 'rgba(63, 185, 80, 0.3)',
  },
  feedbackError: {
    backgroundColor: 'rgba(248, 81, 73, 0.12)',
    borderBottomColor: 'rgba(248, 81, 73, 0.3)',
  },
  feedbackText: {
    fontSize: 12,
    fontWeight: '600',
    fontFamily: 'monospace',
  },
  body: {
    flex: 1,
    flexDirection: 'row',
  },
  leftPane: {
    width: 240,
    borderRightWidth: 1,
    borderRightColor: colors.border,
    backgroundColor: 'rgba(0, 0, 0, 0.15)',
    display: 'flex',
    flexDirection: 'column',
  },
  leftPaneHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  paneLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textMuted,
    fontFamily: 'monospace',
    letterSpacing: 0.8,
  },
  addEnvBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    backgroundColor: 'rgba(88, 166, 255, 0.1)',
  },
  addEnvBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
    fontFamily: 'monospace',
  },
  envListScroll: {
    flex: 1,
    padding: 8,
  },
  envItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 8,
    marginBottom: 4,
  },
  envItemActive: {
    backgroundColor: 'rgba(88, 166, 255, 0.14)',
  },
  envDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  envItemInfo: {
    flex: 1,
  },
  envItemTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  envItemName: {
    fontSize: 13,
    color: colors.textSecondary,
    flex: 1,
  },
  activeBadge: {
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    marginLeft: 6,
  },
  activeBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    fontFamily: 'monospace',
  },
  envItemMeta: {
    fontSize: 11,
    color: colors.textMuted,
    fontFamily: 'monospace',
    marginTop: 2,
  },
  leftPaneFooter: {
    padding: 8,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  resetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 6,
  },
  resetBtnText: {
    fontSize: 11,
    color: colors.textMuted,
    fontFamily: 'monospace',
  },
  rightPane: {
    flex: 1,
  },
  rightPaneContent: {
    padding: 18,
  },
  formRow: {
    flexDirection: 'row',
    gap: 14,
    marginBottom: 12,
  },
  formColLarge: {
    flex: 1,
  },
  formColSmall: {
    width: 200,
  },
  formGroup: {
    marginBottom: 14,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textMuted,
    fontFamily: 'monospace',
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  textInput: {
    backgroundColor: colors.background,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    color: colors.textPrimary,
  },
  colorPaletteRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    alignItems: 'center',
    height: 38,
  },
  colorSwatch: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  colorSwatchActive: {
    borderColor: '#ffffff',
    transform: [{ scale: 1.15 }],
  },
  activeStatusBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.borderLight,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 18,
  },
  activeStatusInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  activeStatusText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontFamily: 'monospace',
  },
  setActiveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
  },
  setActiveBtnText: {
    fontSize: 11,
    fontWeight: '700',
    fontFamily: 'monospace',
  },
  variablesSection: {
    marginBottom: 20,
  },
  varsHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
    flexWrap: 'wrap',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textPrimary,
    fontFamily: 'monospace',
    letterSpacing: 0.5,
  },
  sectionSubtitle: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  varsHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  utilityBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  utilityBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.primary,
    fontFamily: 'monospace',
  },
  addVarBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    backgroundColor: colors.primary,
  },
  addVarBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textInverse,
    fontFamily: 'monospace',
  },
  importBox: {
    backgroundColor: colors.codeBg,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 10,
    marginBottom: 12,
  },
  importBoxTitle: {
    fontSize: 11,
    color: colors.textSecondary,
    fontFamily: 'monospace',
    marginBottom: 6,
  },
  importTextArea: {
    backgroundColor: colors.background,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: 8,
    color: colors.textPrimary,
    fontFamily: 'monospace',
    fontSize: 12,
    minHeight: 80,
  },
  importBoxActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 8,
  },
  importCancelBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  importCancelText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  importApplyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.accentGreen,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 6,
  },
  importApplyText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textInverse,
    fontFamily: 'monospace',
  },
  tableHeader: {
    flexDirection: 'row',
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    marginBottom: 6,
  },
  thText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textMuted,
    fontFamily: 'monospace',
    letterSpacing: 0.5,
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  keyInput: {
    backgroundColor: colors.codeBg,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 13,
    color: colors.accentYellow,
    fontFamily: 'monospace',
    fontWeight: '600',
  },
  valInput: {
    backgroundColor: colors.codeBg,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 13,
    color: colors.textPrimary,
    fontFamily: 'monospace',
  },
  removeRowBtn: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyVars: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  emptyVarsText: {
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'center',
  },
  rightPaneBottomActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  mgmtRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dupBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  dupBtnText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontFamily: 'monospace',
  },
  deleteEnvBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: 'rgba(248, 81, 73, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(248, 81, 73, 0.25)',
  },
  deleteEnvBtnText: {
    fontSize: 12,
    color: colors.danger,
    fontFamily: 'monospace',
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  saveBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textInverse,
    fontFamily: 'monospace',
  },
});
