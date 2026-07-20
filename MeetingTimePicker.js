import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const HOURS = Array.from({ length: 12 }, (_, index) => index + 1);
const MINUTES = Array.from({ length: 60 }, (_, index) => index);
const PERIODS = ['AM', 'PM'];
const OPTION_HEIGHT = 44;

const pad = (value) => String(value).padStart(2, '0');

const parseApiTime = (value) => {
  const match = String(value || '').trim().match(/^(\d{1,2}):([0-5]\d)(?::[0-5]\d)?$/);
  if (!match) return null;

  const hour24 = Number(match[1]);
  if (hour24 < 0 || hour24 > 23) return null;

  const minute = Number(match[2]);
  const period = hour24 >= 12 ? 'PM' : 'AM';
  const hour12 = hour24 % 12 || 12;

  return { hour12, minute, period };
};

const getCurrentTimeParts = () => {
  const now = new Date();
  const hour24 = now.getHours();
  const period = hour24 >= 12 ? 'PM' : 'AM';
  const hour12 = hour24 % 12 || 12;

  return { hour12, minute: now.getMinutes(), period };
};

const toApiTime = ({ hour12, minute, period }) => {
  let hour24 = Number(hour12) % 12;
  if (period === 'PM') hour24 += 12;
  return `${pad(hour24)}:${pad(minute)}:00`;
};

export const isValidMeetingTime = (value) => /^([01]\d|2[0-3]):[0-5]\d:00$/.test(String(value || ''));

export const formatMeetingTimeDisplay = (value) => {
  const parts = parseApiTime(value);
  if (!parts) return '';
  return `${parts.hour12}:${pad(parts.minute)} ${parts.period}`;
};

const WheelColumn = ({ label, options, value, renderValue, onSelect }) => {
  const scrollRef = useRef(null);

  useEffect(() => {
    const selectedIndex = options.findIndex((option) => option === value);
    if (selectedIndex < 0) return;

    const offset = Math.max(selectedIndex * OPTION_HEIGHT - OPTION_HEIGHT, 0);
    const timer = setTimeout(() => {
      scrollRef.current?.scrollTo({ y: offset, animated: false });
    }, 0);

    return () => clearTimeout(timer);
  }, [options, value]);

  return (
    <View style={styles.wheelColumn}>
      <Text style={styles.wheelLabel}>{label}</Text>
      <ScrollView
        ref={scrollRef}
        style={styles.wheelScroll}
        contentContainerStyle={styles.wheelContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {options.map((option) => {
          const isSelected = option === value;
          return (
            <TouchableOpacity
              key={String(option)}
              style={[styles.wheelOption, isSelected && styles.wheelOptionActive]}
              onPress={() => onSelect(option)}
              activeOpacity={0.85}
            >
              <Text style={[styles.wheelOptionText, isSelected && styles.wheelOptionTextActive]}>
                {renderValue ? renderValue(option) : option}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
};

const MeetingTimePicker = ({ label = 'Time', value, onChange, placeholder = 'Select time', required = false }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [draftTime, setDraftTime] = useState(() => parseApiTime(value) || getCurrentTimeParts());

  const displayValue = useMemo(() => formatMeetingTimeDisplay(value), [value]);

  useEffect(() => {
    if (isOpen) {
      setDraftTime(parseApiTime(value) || getCurrentTimeParts());
    }
  }, [isOpen, value]);

  const updateDraft = (field, nextValue) => {
    setDraftTime((prev) => ({ ...prev, [field]: nextValue }));
  };

  const confirmTime = () => {
    onChange(toApiTime(draftTime));
    setIsOpen(false);
  };

  const clearTime = () => {
    onChange('');
    setIsOpen(false);
  };

  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}{required ? <Text style={styles.requiredStar}> *</Text> : null}</Text>
      <TouchableOpacity style={styles.timeSelect} onPress={() => setIsOpen(true)} activeOpacity={0.85}>
        <View style={styles.timeIcon}>
          <Ionicons name="time-outline" size={18} color="#4F46E5" />
        </View>
        <Text style={[styles.timeSelectText, !displayValue && styles.placeholderText]}>
          {displayValue || placeholder}
        </Text>
        <Ionicons name="chevron-down" size={18} color="#64748B" />
      </TouchableOpacity>

      <Modal visible={isOpen} transparent animationType="slide" onRequestClose={() => setIsOpen(false)}>
        <View style={styles.modalRoot}>
          <TouchableOpacity
            style={styles.backdrop}
            activeOpacity={1}
            onPress={() => setIsOpen(false)}
          />
          <View style={styles.sheet}>
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHeader}>
              <View>
                <Text style={styles.sheetTitle}>Select Time</Text>
                <Text style={styles.sheetSubtitle}>Choose the planned start time.</Text>
              </View>
              <TouchableOpacity style={styles.sheetCloseButton} onPress={() => setIsOpen(false)}>
                <Ionicons name="close" size={20} color="#475569" />
              </TouchableOpacity>
            </View>

            <View style={styles.previewRow}>
              <Ionicons name="alarm-outline" size={20} color="#4F46E5" />
              <Text style={styles.previewTime}>
                {draftTime.hour12}:{pad(draftTime.minute)} {draftTime.period}
              </Text>
            </View>

            <View style={styles.wheelRow}>
              <WheelColumn
                label="Hour"
                options={HOURS}
                value={draftTime.hour12}
                renderValue={(option) => String(option)}
                onSelect={(option) => updateDraft('hour12', option)}
              />
              <WheelColumn
                label="Minute"
                options={MINUTES}
                value={draftTime.minute}
                renderValue={(option) => pad(option)}
                onSelect={(option) => updateDraft('minute', option)}
              />
              <WheelColumn
                label="AM/PM"
                options={PERIODS}
                value={draftTime.period}
                onSelect={(option) => updateDraft('period', option)}
              />
            </View>

            <View style={styles.actionRow}>
              <TouchableOpacity style={styles.clearButton} onPress={clearTime}>
                <Text style={styles.clearButtonText}>Clear</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.doneButton} onPress={confirmTime}>
                <Text style={styles.doneButtonText}>Done</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  field: {
    marginBottom: 15,
  },
  label: {
    fontSize: 13,
    fontWeight: '800',
    color: '#374151',
    marginBottom: 7,
  },
  requiredStar: {
    color: '#EF4444',
  },
  timeSelect: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: '#D7DCEA',
    borderRadius: 8,
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  timeSelectText: {
    flex: 1,
    color: '#111827',
    fontSize: 15,
    fontWeight: '800',
  },
  placeholderText: {
    color: '#94A3B8',
    fontWeight: '600',
  },
  modalRoot: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.42)',
  },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 22,
  },
  sheetHandle: {
    width: 42,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#CBD5E1',
    alignSelf: 'center',
    marginBottom: 12,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
  },
  sheetSubtitle: {
    marginTop: 3,
    color: '#64748B',
    fontSize: 12,
    lineHeight: 17,
  },
  sheetCloseButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F5F9',
    marginLeft: 10,
  },
  previewRow: {
    minHeight: 52,
    borderRadius: 8,
    backgroundColor: '#EEF2FF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  previewTime: {
    marginLeft: 8,
    color: '#312E81',
    fontSize: 22,
    fontWeight: '900',
  },
  wheelRow: {
    flexDirection: 'row',
  },
  wheelColumn: {
    flex: 1,
    paddingHorizontal: 4,
  },
  wheelLabel: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '800',
    marginBottom: 8,
    textAlign: 'center',
  },
  wheelScroll: {
    maxHeight: 184,
  },
  wheelContent: {
    paddingBottom: 4,
  },
  wheelOption: {
    minHeight: 38,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  wheelOptionActive: {
    backgroundColor: '#4F46E5',
    borderColor: '#4F46E5',
  },
  wheelOptionText: {
    color: '#334155',
    fontSize: 15,
    fontWeight: '800',
  },
  wheelOptionTextActive: {
    color: '#FFFFFF',
  },
  actionRow: {
    flexDirection: 'row',
    marginTop: 14,
  },
  clearButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  clearButtonText: {
    color: '#475569',
    fontWeight: '800',
  },
  doneButton: {
    flex: 1.4,
    minHeight: 48,
    borderRadius: 8,
    backgroundColor: '#4F46E5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneButtonText: {
    color: '#FFFFFF',
    fontWeight: '900',
  },
});

export default MeetingTimePicker;
