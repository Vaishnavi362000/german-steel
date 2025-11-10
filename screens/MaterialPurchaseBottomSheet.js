import React from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import Modal from 'react-native-modal';
import { Ionicons } from '@expo/vector-icons';

const MaterialPurchaseBottomSheet = ({
  isVisible,
  onClose,
  materialPurchases,
  updateMaterialPurchaseField,
  addMaterialPurchaseRow,
  removeMaterialPurchaseRow,
  constructionStage,
  setConstructionStage,
  isSiteRelatedClient,
  canEdit,
  onSave,
  isSaving,
  constructionStageOptions,
}) => {
  // Separate saved entries from new entries
  const savedEntries = materialPurchases.filter(item => item.brandName && item.purchasedFrom);
  const newEntries = materialPurchases.filter(item => !item.brandName || !item.purchasedFrom);
  return (
    <Modal
      isVisible={isVisible}
      onBackdropPress={onClose}
      onSwipeComplete={onClose}
      swipeDirection={['down']}
      propagateSwipe={true}
      style={styles.modal}
      avoidKeyboard={false}
      useNativeDriver={true}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardView}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <View style={styles.container}>
          {/* Handle */}
          <View style={styles.handle} />

          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Material Purchase Details</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>

          {/* Content */}
          <ScrollView
            style={styles.content}
            contentContainerStyle={styles.contentContainer}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            bounces={false}
          >
            {!canEdit && (
              <View style={styles.warningBox}>
                <Ionicons name="information-circle" size={20} color="#F59E0B" />
                <Text style={styles.warningText}>
                  Check in to update material information for this visit.
                </Text>
              </View>
            )}

            {/* New Material Purchases (Editable) */}
            {newEntries.map((item, index) => (
              <View key={`new-material-${index}`} style={styles.materialRow}>
                <View style={styles.materialInputs}>
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Steel Brand</Text>
                    <TextInput
                      style={[
                        styles.input,
                        !canEdit && styles.inputDisabled,
                      ]}
                      placeholder="Enter brand name"
                      placeholderTextColor="#9CA3AF"
                      value={item.brandName}
                      editable={canEdit}
                      onChangeText={(text) =>
                        updateMaterialPurchaseField(index, 'brandName', text)
                      }
                      autoCapitalize="words"
                      returnKeyType="next"
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Purchased From</Text>
                    <TextInput
                      style={[
                        styles.input,
                        !canEdit && styles.inputDisabled,
                      ]}
                      placeholder="Dealer / Source"
                      placeholderTextColor="#9CA3AF"
                      value={item.purchasedFrom}
                      editable={canEdit}
                      onChangeText={(text) =>
                        updateMaterialPurchaseField(index, 'purchasedFrom', text)
                      }
                      autoCapitalize="words"
                      returnKeyType="done"
                    />
                  </View>
                </View>

                {canEdit && newEntries.length > 1 && index > 0 && (
                  <TouchableOpacity
                    style={styles.removeButton}
                    onPress={() => removeMaterialPurchaseRow(index)}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="trash-outline" size={20} color="#EF4444" />
                  </TouchableOpacity>
                )}
              </View>
            ))}

            {/* Saved Material Purchases (Read-only Cards) */}
            {savedEntries.length > 0 && (
              <View style={styles.savedSection}>
                <Text style={styles.savedSectionTitle}>Saved Materials</Text>
                {savedEntries.map((item, index) => (
                  <View key={`saved-material-${index}`} style={styles.savedCard}>
                    <View style={styles.savedCardContent}>
                      <View style={styles.savedField}>
                        <Text style={styles.savedLabel}>Steel Brand</Text>
                        <Text style={styles.savedValue}>{item.brandName}</Text>
                      </View>
                      <View style={styles.savedField}>
                        <Text style={styles.savedLabel}>Purchased From</Text>
                        <Text style={styles.savedValue}>{item.purchasedFrom}</Text>
                      </View>
                    </View>
                    <TouchableOpacity
                      style={styles.savedDeleteButton}
                      onPress={() => removeMaterialPurchaseRow(index + newEntries.length)}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="trash-outline" size={20} color="#EF4444" />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}

            {/* Add Another Brand Button */}
            {canEdit && (
              <TouchableOpacity
                style={styles.addButton}
                onPress={addMaterialPurchaseRow}
                activeOpacity={0.7}
              >
                <Ionicons name="add-circle-outline" size={20} color="#4F46E5" />
                <Text style={styles.addButtonText}>Add Another Brand</Text>
              </TouchableOpacity>
            )}

            {/* Construction Stage (for site visits) */}
            {isSiteRelatedClient && (
              <View style={styles.stageSection}>
                <Text style={styles.sectionTitle}>Construction Stage</Text>
                <View style={styles.stageGrid}>
                  {constructionStageOptions.map((stage) => {
                    const isSelected = constructionStage === stage.value;
                    return (
                      <TouchableOpacity
                        key={stage.value}
                        style={[
                          styles.stageButton,
                          isSelected && styles.stageButtonSelected,
                          !canEdit && styles.stageButtonDisabled,
                        ]}
                        onPress={() => canEdit && setConstructionStage(stage.value)}
                        disabled={!canEdit}
                        activeOpacity={0.7}
                      >
                        <Text
                          style={[
                            styles.stageButtonText,
                            isSelected && styles.stageButtonTextSelected,
                            !canEdit && styles.stageButtonTextDisabled,
                          ]}
                        >
                          {stage.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}

            {/* Save Button */}
            {canEdit ? (
              <TouchableOpacity
                style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
                onPress={onSave}
                disabled={isSaving}
                activeOpacity={0.7}
              >
                {isSaving ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
                    <Text style={styles.saveButtonText}>Save Details</Text>
                  </>
                )}
              </TouchableOpacity>
            ) : (
              <View style={styles.infoBox}>
                <Text style={styles.infoText}>
                  Material details are read-only after checkout.
                </Text>
              </View>
            )}

            {/* Bottom padding for keyboard */}
            <View style={styles.bottomPadding} />
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modal: {
    justifyContent: 'flex-end',
    margin: 0,
  },
  keyboardView: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: '90%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: '#D1D5DB',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  closeButton: {
    position: 'absolute',
    right: 20,
    padding: 4,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    gap: 8,
  },
  warningText: {
    flex: 1,
    fontSize: 14,
    color: '#92400E',
  },
  materialRow: {
    marginBottom: 16,
    backgroundColor: '#F9FAFB',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  materialInputs: {
    gap: 12,
  },
  inputGroup: {
    gap: 6,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: '#111827',
  },
  inputDisabled: {
    backgroundColor: '#F3F4F6',
    color: '#9CA3AF',
  },
  removeButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    padding: 8,
    backgroundColor: '#FEE2E2',
    borderRadius: 8,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EEF2FF',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
    gap: 8,
  },
  addButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4F46E5',
  },
  stageSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  stageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  stageButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    backgroundColor: '#FFFFFF',
  },
  stageButtonSelected: {
    backgroundColor: '#4F46E5',
    borderColor: '#4F46E5',
  },
  stageButtonDisabled: {
    backgroundColor: '#F3F4F6',
    borderColor: '#E5E7EB',
  },
  stageButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  stageButtonTextSelected: {
    color: '#FFFFFF',
  },
  stageButtonTextDisabled: {
    color: '#9CA3AF',
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4F46E5',
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  saveButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  infoBox: {
    backgroundColor: '#F3F4F6',
    padding: 12,
    borderRadius: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
  bottomPadding: {
    height: 40,
  },
  savedSection: {
    marginBottom: 20,
  },
  savedSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  savedCard: {
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    position: 'relative',
  },
  savedCardContent: {
    flex: 1,
  },
  savedField: {
    marginBottom: 8,
  },
  savedLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6B7280',
    marginBottom: 2,
  },
  savedValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  savedDeleteButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    padding: 8,
    backgroundColor: '#FEE2E2',
    borderRadius: 8,
  },
});

export default MaterialPurchaseBottomSheet;

