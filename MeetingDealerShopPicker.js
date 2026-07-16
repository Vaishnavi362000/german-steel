import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const MeetingDealerShopPicker = ({
  visible,
  shops,
  isLoading,
  selectedStoreId,
  onClose,
  onSearch,
  onSelect,
  onAddNew,
}) => {
  const [searchText, setSearchText] = useState('');

  const filteredShops = useMemo(() => {
    const query = searchText.trim().toLowerCase();
    if (!query) return shops || [];
    return (shops || []).filter((shop) => [
      shop.storeName,
      shop.ownerName,
      shop.mobile,
      shop.city,
      shop.area,
    ]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(query)));
  }, [searchText, shops]);

  const handleSearchChange = (value) => {
    setSearchText(value);
    onSearch?.(value);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>Dealer / Shop</Text>
              <Text style={styles.subtitle}>Select from the customer database</Text>
            </View>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Ionicons name="close" size={20} color="#475569" />
            </TouchableOpacity>
          </View>

          <View style={styles.searchBox}>
            <Ionicons name="search-outline" size={17} color="#64748B" />
            <TextInput
              style={styles.searchInput}
              value={searchText}
              onChangeText={handleSearchChange}
              placeholder="Search dealer, shop, owner"
              placeholderTextColor="#94A3B8"
              autoCorrect={false}
            />
          </View>

          {onAddNew ? (
            <TouchableOpacity style={styles.addNewButton} onPress={onAddNew}>
              <Ionicons name="add-circle-outline" size={18} color="#4F46E5" />
              <Text style={styles.addNewText}>Add New Dealer / Shop</Text>
            </TouchableOpacity>
          ) : null}

          {isLoading ? (
            <View style={styles.stateBox}>
              <ActivityIndicator color="#4F46E5" />
              <Text style={styles.stateText}>Loading dealers...</Text>
            </View>
          ) : filteredShops.length === 0 ? (
            <View style={styles.stateBox}>
              <Ionicons name="storefront-outline" size={28} color="#94A3B8" />
              <Text style={styles.stateText}>No dealer/shop found.</Text>
            </View>
          ) : (
            <ScrollView style={styles.list} keyboardShouldPersistTaps="handled">
              {filteredShops.map((shop, index) => {
                const isSelected = String(selectedStoreId || '') === String(shop.storeId || '');
                return (
                  <TouchableOpacity
                    key={`${shop.storeId || shop.storeName || index}`}
                    style={[styles.row, isSelected && styles.rowSelected]}
                    onPress={() => onSelect(shop)}
                  >
                    <View style={styles.avatar}>
                      <Ionicons name="storefront-outline" size={20} color="#4F46E5" />
                    </View>
                    <View style={styles.rowText}>
                      <Text style={styles.name} numberOfLines={1}>{shop.storeName || 'Unnamed shop'}</Text>
                      <Text style={styles.meta} numberOfLines={1}>
                        {[shop.ownerName, shop.mobile].filter(Boolean).join(' - ') || 'No owner details'}
                      </Text>
                      <Text style={styles.meta} numberOfLines={1}>
                        {[shop.area, shop.city].filter(Boolean).join(', ') || 'No address'}
                      </Text>
                    </View>
                    <Ionicons
                      name={isSelected ? 'checkmark-circle' : 'add-circle-outline'}
                      size={24}
                      color={isSelected ? '#16A34A' : '#4F46E5'}
                    />
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.35)',
    justifyContent: 'flex-end',
  },
  sheet: {
    maxHeight: '82%',
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
  },
  subtitle: {
    marginTop: 2,
    color: '#64748B',
    fontSize: 12,
  },
  closeButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F5F9',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D7DCEA',
    borderRadius: 8,
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 11,
    marginBottom: 10,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 11,
    paddingHorizontal: 8,
    color: '#111827',
  },
  addNewButton: {
    minHeight: 44,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#C7D2FE',
    backgroundColor: '#EEF2FF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  addNewText: {
    marginLeft: 8,
    color: '#4F46E5',
    fontWeight: '900',
  },
  list: {
    marginHorizontal: -4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },
  rowSelected: {
    borderColor: '#86EFAC',
    backgroundColor: '#F0FDF4',
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EEF2FF',
    marginRight: 11,
  },
  rowText: {
    flex: 1,
    paddingRight: 8,
  },
  name: {
    color: '#0F172A',
    fontSize: 14.5,
    fontWeight: '900',
  },
  meta: {
    color: '#64748B',
    fontSize: 12.5,
    marginTop: 3,
  },
  stateBox: {
    minHeight: 140,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stateText: {
    color: '#64748B',
    marginTop: 8,
    fontWeight: '700',
  },
});

export default MeetingDealerShopPicker;
