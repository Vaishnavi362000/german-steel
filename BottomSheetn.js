import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Modal from 'react-native-modal';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const BottomSheetn = ({ isVisible, onClose, data, onSelect, title, renderItem, selectedValue }) => {
  const insets = useSafeAreaInsets();
  const bottomSafePadding = Math.max(insets.bottom, 12);
  const options = Array.isArray(data) ? data : [];

  const getOptionValue = (item) => item?.value ?? item;
  const getOptionLabel = (item) => item?.label ?? item?.toString() ?? '';
  const isOptionSelected = (item) => (
    selectedValue !== undefined &&
    selectedValue !== null &&
    String(getOptionValue(item)) === String(selectedValue)
  );

  return (
    <Modal
      isVisible={isVisible}
      onBackdropPress={onClose}
      onBackButtonPress={onClose}
      style={styles.modal}
      swipeDirection="down"
      onSwipeComplete={onClose}
      backdropColor="#111827"
      backdropOpacity={0.42}
    >
      <View style={[styles.container, { paddingBottom: bottomSafePadding }]}>
        <View style={styles.sheetHandle} />
        <View style={styles.header}>
          <View style={styles.heading}>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.subtitle}>
              {options.length} {options.length === 1 ? 'option' : 'options'}
            </Text>
          </View>
          <TouchableOpacity
            onPress={onClose}
            style={styles.closeButton}
            accessibilityRole="button"
            accessibilityLabel="Close picker"
          >
            <Ionicons name="close" size={21} color="#374151" />
          </TouchableOpacity>
        </View>
        <FlatList
          data={options}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => {
            const selected = isOptionSelected(item);
            return (
              <TouchableOpacity
                style={[styles.item, selected && styles.itemSelected]}
                onPress={() => onSelect(item)}
                activeOpacity={0.75}
                accessibilityRole="button"
                accessibilityState={{ selected }}
              >
                <Text style={styles.itemText}>
                  {renderItem ? renderItem(item) : getOptionLabel(item)}
                </Text>
                {selected && (
                  <View style={styles.selectedIndicator}>
                    <Ionicons name="checkmark" size={15} color="#FFFFFF" />
                  </View>
                )}
              </TouchableOpacity>
            );
          }}
          keyExtractor={(item, index) => String(item?.storeId ?? getOptionValue(item) ?? index)}
        />
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modal: {
    justifyContent: 'flex-end',
    margin: 0,
  },
  container: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '82%',
    shadowColor: '#111827',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.14,
    shadowRadius: 8,
    elevation: 12,
  },
  sheetHandle: {
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#D2D6DE',
    alignSelf: 'center',
    marginTop: 9,
    marginBottom: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 11,
  },
  heading: {
    flex: 1,
    minWidth: 0,
    paddingRight: 12,
  },
  title: {
    color: '#202938',
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '700',
  },
  subtitle: {
    color: '#7C8494',
    fontSize: 11,
    lineHeight: 15,
    marginTop: 2,
  },
  closeButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#F2F4F7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    paddingHorizontal: 12,
    paddingBottom: 10,
  },
  item: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#EEF0F4',
    borderRadius: 9,
  },
  itemSelected: {
    backgroundColor: '#F0F2FF',
    borderBottomColor: 'transparent',
  },
  itemText: {
    flex: 1,
    color: '#293241',
    fontSize: 14,
    lineHeight: 19,
    fontWeight: '600',
    paddingRight: 12,
  },
  selectedIndicator: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#4F46E5',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default BottomSheetn;
