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

const getMobile = (attendee) => attendee?.mobile || attendee?.mobileNumber || '';

const getCategoryStyles = (category) => {
  const normalized = String(category || '').trim().toLowerCase();
  switch (normalized) {
    case 'counter':
      return { bg: '#F1F5F9', text: '#475569', avatarBg: '#E2E8F0', avatarText: '#475569' };
    case 'dealer':
      return { bg: '#EEF2FF', text: '#4F46E5', avatarBg: '#C7D2FE', avatarText: '#4F46E5' };
    case 'mason':
      return { bg: '#ECFDF5', text: '#059669', avatarBg: '#A7F3D0', avatarText: '#059669' };
    case 'contractor':
      return { bg: '#FFFBEB', text: '#D97706', avatarBg: '#FDE68A', avatarText: '#D97706' };
    case 'engineer':
      return { bg: '#FFF1F2', text: '#E11D48', avatarBg: '#FECDD3', avatarText: '#E11D48' };
    case 'architect':
      return { bg: '#F5F3FF', text: '#7C3AED', avatarBg: '#DDD6FE', avatarText: '#7C3AED' };
    case 'customer':
      return { bg: '#ECFEFF', text: '#0891B2', avatarBg: '#CFFAFE', avatarText: '#0891B2' };
    default:
      return { bg: '#FDF2F8', text: '#C026D3', avatarBg: '#FBCFE8', avatarText: '#C026D3' };
  }
};

const MeetingAttendeePicker = ({
  visible,
  attendees,
  isLoading,
  selectedMobiles = [],
  onClose,
  onSelect,
}) => {
  const [searchText, setSearchText] = useState('');
  const selectedMobileSet = useMemo(
    () => new Set(selectedMobiles.map((mobile) => String(mobile || '').replace(/\D/g, ''))),
    [selectedMobiles]
  );

  const filteredAttendees = useMemo(() => {
    const query = searchText.trim().toLowerCase();
    if (!query) return attendees || [];

    return (attendees || []).filter((attendee) => [
      attendee.name,
      getMobile(attendee),
      attendee.category,
      attendee.cityArea,
      attendee.company,
      attendee.companyShopProject,
    ]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(query)));
  }, [attendees, searchText]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>Existing Attendees</Text>
              <Text style={styles.subtitle}>Search master list and add to this meeting</Text>
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
              onChangeText={setSearchText}
              placeholder="Search name, mobile, category"
              placeholderTextColor="#94A3B8"
              autoCorrect={false}
            />
          </View>

          {isLoading ? (
            <View style={styles.stateBox}>
              <ActivityIndicator color="#4F46E5" />
              <Text style={styles.stateText}>Loading attendees...</Text>
            </View>
          ) : filteredAttendees.length === 0 ? (
            <View style={styles.stateBox}>
              <Ionicons name="people-outline" size={28} color="#94A3B8" />
              <Text style={styles.stateText}>No existing attendees found.</Text>
            </View>
          ) : (
            <ScrollView style={styles.list} keyboardShouldPersistTaps="handled">
              {filteredAttendees.map((attendee, index) => {
                const mobile = getMobile(attendee);
                const isSelected = selectedMobileSet.has(String(mobile || '').replace(/\D/g, ''));
                const catStyle = getCategoryStyles(attendee.category);
                const initial = String(attendee.name || '?').trim().charAt(0).toUpperCase();
                return (
                  <TouchableOpacity
                    key={`${attendee.id || attendee.attendeeId || mobile || index}`}
                    style={[styles.row, isSelected && styles.rowDisabled]}
                    onPress={() => !isSelected && onSelect(attendee)}
                    disabled={isSelected}
                  >
                    <View style={[styles.avatar, { backgroundColor: catStyle.avatarBg }]}>
                      <Text style={[styles.avatarText, { color: catStyle.avatarText }]}>{initial}</Text>
                    </View>
                    <View style={styles.rowText}>
                      <View style={styles.titleRow}>
                        <Text style={styles.name} numberOfLines={1}>{attendee.name || 'Unnamed attendee'}</Text>
                        <View style={[styles.categoryBadge, { backgroundColor: catStyle.bg }]}>
                          <Text style={[styles.categoryBadgeText, { color: catStyle.text }]}>{attendee.category || 'Other'}</Text>
                        </View>
                      </View>
                      
                      <View style={styles.metaRow}>
                        <Ionicons name="call-outline" size={12} color="#64748B" style={styles.metaIcon} />
                        <Text style={styles.meta}>{mobile || 'No mobile'}</Text>
                      </View>
                      
                      {(attendee.cityArea || attendee.company || attendee.companyShopProject) ? (
                        <View style={styles.metaRow}>
                          <Ionicons name="location-outline" size={12} color="#64748B" style={styles.metaIcon} />
                          <Text style={styles.meta} numberOfLines={1}>
                            {attendee.cityArea || 'No area'}{attendee.company || attendee.companyShopProject ? ` • ${attendee.company || attendee.companyShopProject}` : ''}
                          </Text>
                        </View>
                      ) : null}
                    </View>
                    <View style={styles.actionColumn}>
                      {isSelected ? (
                        <View style={styles.addedBadge}>
                          <Text style={styles.addedText}>Added</Text>
                        </View>
                      ) : (
                        <Ionicons name="add-circle-outline" size={24} color="#4F46E5" />
                      )}
                    </View>
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
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 11,
    paddingHorizontal: 8,
    color: '#111827',
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
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.02,
    shadowRadius: 4,
    elevation: 1,
  },
  rowDisabled: {
    backgroundColor: '#F8FAFC',
    opacity: 0.65,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '800',
  },
  rowText: {
    flex: 1,
    paddingRight: 8,
    justifyContent: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  name: {
    fontSize: 14.5,
    fontWeight: '800',
    color: '#0F172A',
    flexShrink: 1,
    marginRight: 6,
  },
  categoryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: 12,
  },
  categoryBadgeText: {
    fontSize: 10.5,
    fontWeight: '800',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  metaIcon: {
    marginRight: 5,
  },
  meta: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '500',
  },
  actionColumn: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 50,
  },
  addedBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    backgroundColor: '#D1FAE5',
  },
  addedText: {
    color: '#065F46',
    fontSize: 11,
    fontWeight: '800',
  },
  stateBox: {
    minHeight: 140,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stateText: {
    marginTop: 8,
    color: '#64748B',
    textAlign: 'center',
  },
});

export default MeetingAttendeePicker;
