import { Ionicons } from '@expo/vector-icons';
import { Image as ExpoImage } from 'expo-image';
import * as FileSystem from 'expo-file-system';
import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import axios from 'axios';
import { API_BASE_URL } from './config/api';

const titleCase = (value) => {
  const text = String(value || '').trim();
  return text ? `${text.charAt(0).toUpperCase()}${text.slice(1).toLowerCase()}` : '';
};

const formatDate = (value) => {
  if (!value) return 'N/A';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return `${date.getDate()} ${date.toLocaleString('en-IN', { month: 'short' })} '${String(date.getFullYear()).slice(-2)}`;
};

const getTaskPresentation = (type) => {
  if (type === 'complaint') {
    return {
      label: 'Complaint',
      icon: 'alert-circle-outline',
      accent: '#FF644C',
      surface: '#FFF1EE',
      border: '#FFD7D0',
    };
  }

  if (type === 'requirement') {
    return {
      label: 'Requirement',
      icon: 'clipboard-outline',
      accent: '#4F46E5',
      surface: '#EEF2FF',
      border: '#DDE3FF',
    };
  }

  return {
    label: 'Task',
    icon: 'checkmark-circle-outline',
    accent: '#4F46E5',
    surface: '#EEF2FF',
    border: '#DDE3FF',
  };
};

const getStatusTone = (status) => {
  const value = String(status || '').toLowerCase();
  if (['completed', 'resolved', 'closed', 'done'].some((item) => value.includes(item))) {
    return { background: '#EAF8F1', border: '#B7E8CF', text: '#087A50' };
  }
  if (['cancelled', 'rejected', 'overdue'].some((item) => value.includes(item))) {
    return { background: '#FFF1F2', border: '#FECDD3', text: '#BE123C' };
  }
  if (['assigned', 'ongoing', 'progress'].some((item) => value.includes(item))) {
    return { background: '#EEF2FF', border: '#D8DEFF', text: '#4338CA' };
  }
  return { background: '#FFF7E6', border: '#FDE3A7', text: '#A85D00' };
};

const getPriorityTone = (priority) => {
  const value = String(priority || '').toLowerCase();
  if (value === 'high' || value === 'urgent') return { background: '#FFF1F2', icon: '#E11D48' };
  if (value === 'medium') return { background: '#FFF7E6', icon: '#D97706' };
  return { background: '#EEF2FF', icon: '#4F46E5' };
};

const getAttachmentUris = (task = {}) => {
  const attachments = [task.attachmentResponse, task.attachments, task.attachment, task.files]
    .find((value) => Array.isArray(value)) || [];

  const uris = attachments.map((attachment) => {
    if (typeof attachment === 'string') return attachment;
    if (attachment?.fileDownloadUri) return attachment.fileDownloadUri;
    if (attachment?.downloadUrl) return attachment.downloadUrl;
    const fileName = attachment?.fileName || attachment?.name;
    return task?.id && fileName
      ? `${API_BASE_URL}/task/downloadFile/${encodeURIComponent(task.id)}/${encodeURIComponent(fileName)}`
      : null;
  }).filter(Boolean);

  if (task?.fileDownloadUri) uris.push(task.fileDownloadUri);
  return [...new Set(uris)];
};

const MetaTile = ({ icon, label, value, iconBackground = '#EEF2FF', iconColor = '#4F46E5' }) => (
  <View style={styles.metaTile}>
    <View style={[styles.metaIcon, { backgroundColor: iconBackground }]}>
      <Ionicons name={icon} size={16} color={iconColor} />
    </View>
    <View style={styles.metaCopy}>
      <Text style={styles.metaLabel}>{label}</Text>
      <Text style={styles.metaValue} numberOfLines={2}>{value || 'Not available'}</Text>
    </View>
  </View>
);

const AttachmentImage = ({ uri, authToken, onPress }) => {
  const [localUri, setLocalUri] = useState(null);
  const [isLoading, setIsLoading] = useState(Boolean(uri));
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const downloadAttachment = async () => {
      if (!uri) {
        setIsLoading(false);
        return;
      }

      try {
        const fileUri = `${FileSystem.cacheDirectory}german_steel_task_${Date.now()}_${Math.random().toString(36).slice(2)}.img`;
        const response = await FileSystem.downloadAsync(uri, fileUri, {
          headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
        });
        if (!cancelled && response.status === 200 && response.uri) setLocalUri(response.uri);
      } catch (error) {
        console.warn('Unable to load task attachment', error?.message);
        if (!cancelled) setHasError(true);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    downloadAttachment();
    return () => { cancelled = true; };
  }, [uri, authToken]);

  if (!uri || hasError) return null;
  if (isLoading || !localUri) {
    return (
      <View style={styles.imagePlaceholder}>
        <Ionicons name="image-outline" size={22} color="#9CA3AF" />
        <Text style={styles.imagePlaceholderText}>Loading</Text>
      </View>
    );
  }

  return (
    <TouchableOpacity style={styles.imageTile} onPress={() => onPress(localUri)} activeOpacity={0.86}>
      <ExpoImage source={{ uri: localUri }} style={styles.attachmentImage} contentFit="cover" />
    </TouchableOpacity>
  );
};

const TaskDetailsScreen = ({ navigation, route, authToken: screenAuthToken }) => {
  const insets = useSafeAreaInsets();
  const task = route?.params?.task || {};
  const authToken = route?.params?.authToken || screenAuthToken;
  const [status, setStatus] = useState(task.status || 'Pending');
  const [previewUri, setPreviewUri] = useState(null);

  useEffect(() => setStatus(task.status || 'Pending'), [task.status]);

  const taskType = String(task.taskType || task.type || 'task').toLowerCase();
  const presentation = getTaskPresentation(taskType);
  const statusTone = getStatusTone(status);
  const priority = task.priority ? titleCase(task.priority) : '';
  const priorityTone = getPriorityTone(priority);
  const attachmentUris = useMemo(() => getAttachmentUris(task), [task]);
  const taskTitle = task.taskTitle || task.name || task.title || 'Untitled';
  const taskDescription = task.taskDescription || task.taskDesciption || task.description || '';
  const taskStore = task.storeName || task.customerName || task.dealerName || '';
  const assignedTo = task.assignedToName || task.assignedTo || '';
  const assignedBy = task.assignedByName || task.assignedBy || '';
  const screenTitle = taskType === 'complaint'
    ? 'Complaint Details'
    : taskType === 'requirement' ? 'Requirement Details' : 'Task Details';

  const updateStatus = async (nextStatus) => {
    if (!task.id || nextStatus === status) return;
    try {
      await axios.put(
        `${API_BASE_URL}/task/updateTask?taskId=${task.id}`,
        { status: nextStatus, priority: task.priority },
        { headers: authToken ? { Authorization: `Bearer ${authToken}` } : {} },
      );
      setStatus(nextStatus);
    } catch (error) {
      console.error('Error updating task status:', error);
      Alert.alert('Unable to update status', 'Please try again.');
    }
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 8) }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()} accessibilityRole="button" accessibilityLabel="Go back">
          <Ionicons name="arrow-back" size={22} color="#4F46E5" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{screenTitle}</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={[styles.content, { paddingBottom: Math.max(insets.bottom + 28, 48) }]} showsVerticalScrollIndicator={false}>
        <View style={[styles.summaryPanel, { borderTopColor: presentation.accent }]}>
          <View style={styles.summaryHeading}>
            <View style={[styles.summaryIcon, { backgroundColor: presentation.surface, borderColor: presentation.border }]}>
              <Ionicons name={presentation.icon} size={21} color={presentation.accent} />
            </View>
            <View style={styles.summaryCopy}>
              <Text style={[styles.taskTypeLabel, { color: presentation.accent }]}>{presentation.label}</Text>
              <Text style={styles.taskTitle} numberOfLines={2}>{taskTitle}</Text>
            </View>
          </View>

          {!!taskStore && (
            <View style={styles.storeRow}>
              <Ionicons name="storefront-outline" size={15} color="#6B7280" />
              <Text style={styles.storeText} numberOfLines={1}>{taskStore}</Text>
            </View>
          )}

          <View style={styles.summaryMetaRow}>
            <View style={styles.summaryMetaItem}>
              <Text style={styles.summaryMetaLabel}>Status</Text>
              <View style={[styles.statusBadge, { backgroundColor: statusTone.background, borderColor: statusTone.border }]}>
                <View style={[styles.statusDot, { backgroundColor: statusTone.text }]} />
                <Text style={[styles.statusText, { color: statusTone.text }]}>{titleCase(status)}</Text>
              </View>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryMetaItem}>
              <Text style={styles.summaryMetaLabel}>Due date</Text>
              <View style={styles.dueDateRow}>
                <Ionicons name="calendar-outline" size={16} color="#4F46E5" />
                <Text style={styles.summaryDate}>{formatDate(task.dueDate)}</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeading}>
            <View style={styles.sectionIcon}><Ionicons name="document-text-outline" size={17} color="#4F46E5" /></View>
            <Text style={styles.sectionTitle}>Description</Text>
          </View>
          <Text style={styles.descriptionText}>{taskDescription || 'No description provided.'}</Text>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeading}>
            <View style={styles.sectionIcon}><Ionicons name="information-circle-outline" size={18} color="#4F46E5" /></View>
            <Text style={styles.sectionTitle}>Assignment details</Text>
          </View>
          <View style={styles.metaGrid}>
            <MetaTile icon="flag-outline" label="Priority" value={priority || 'Not set'} iconBackground={priorityTone.background} iconColor={priorityTone.icon} />
            <MetaTile icon="person-outline" label="Assigned to" value={assignedTo || 'Not assigned'} />
            {!!assignedBy && <MetaTile icon="person-add-outline" label="Assigned by" value={assignedBy} />}
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.attachmentHeading}>
            <View style={styles.sectionHeading}>
              <View style={styles.sectionIcon}><Ionicons name="images-outline" size={17} color="#4F46E5" /></View>
              <Text style={styles.sectionTitle}>Attachments</Text>
            </View>
            {attachmentUris.length > 0 && (
              <View style={styles.photoCountBadge}>
                <Ionicons name="image-outline" size={14} color="#4F46E5" />
                <Text style={styles.photoCount}>{attachmentUris.length} image{attachmentUris.length === 1 ? '' : 's'}</Text>
              </View>
            )}
          </View>
          {attachmentUris.length > 0 ? (
            <>
              <View style={styles.imageGrid}>
                {attachmentUris.map((uri, index) => <AttachmentImage key={`${uri}-${index}`} uri={uri} authToken={authToken} onPress={setPreviewUri} />)}
              </View>
              <View style={styles.tapHint}>
                <Ionicons name="expand-outline" size={16} color="#4F46E5" />
                <Text style={styles.tapHintText}>Tap an image to preview</Text>
              </View>
            </>
          ) : (
            <View style={styles.emptyPhotos}>
              <Ionicons name="image-outline" size={26} color="#9CA3AF" />
              <Text style={styles.emptyPhotosText}>No photos attached.</Text>
            </View>
          )}
        </View>

        <View style={styles.statusSection}>
          <Text style={styles.statusSectionLabel}>Update status</Text>
          <View style={styles.statusOptions}>
            {['Pending', 'In Progress', 'Done'].map((option) => (
              <TouchableOpacity key={option} onPress={() => updateStatus(option)} style={[styles.statusOption, status === option && styles.statusOptionSelected]}>
                <Text style={[styles.statusOptionText, status === option && styles.statusOptionTextSelected]}>{option}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>

      <Modal visible={Boolean(previewUri)} transparent animationType="fade" onRequestClose={() => setPreviewUri(null)}>
        <View style={styles.previewBackdrop}>
          <TouchableOpacity style={[styles.previewClose, { top: Math.max(insets.top + 12, 24) }]} onPress={() => setPreviewUri(null)}>
            <Ionicons name="close" size={26} color="#FFFFFF" />
          </TouchableOpacity>
          {!!previewUri && <ExpoImage source={{ uri: previewUri }} style={styles.previewImage} contentFit="contain" />}
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F6F8' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#FFFFFF', paddingHorizontal: 12, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: '#E4E7EC' },
  backButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: '#202938', fontSize: 18, fontWeight: '700', textAlign: 'center' },
  headerSpacer: { width: 40, height: 40 },
  scroll: { flex: 1 },
  content: { padding: 12 },
  summaryPanel: { backgroundColor: '#FFFFFF', borderRadius: 13, padding: 14, borderTopWidth: 3, borderWidth: 1, borderColor: '#E3E6EC', shadowColor: '#101828', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 6, elevation: 2 },
  summaryHeading: { flexDirection: 'row', alignItems: 'center' },
  summaryIcon: { width: 42, height: 42, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center', marginRight: 11 },
  summaryCopy: { flex: 1, minWidth: 0 },
  taskTypeLabel: { fontSize: 10, lineHeight: 14, fontWeight: '800', letterSpacing: 0.75, textTransform: 'uppercase', marginBottom: 1 },
  taskTitle: { color: '#252E3B', fontSize: 17, lineHeight: 22, fontWeight: '700' },
  storeRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F7F8FA', borderRadius: 8, paddingHorizontal: 9, paddingVertical: 8, marginTop: 12 },
  storeText: { flex: 1, color: '#4B5563', fontSize: 13, lineHeight: 18, fontWeight: '600', marginLeft: 7 },
  summaryMetaRow: { flexDirection: 'row', alignItems: 'stretch', marginTop: 13, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#EAECF0' },
  summaryMetaItem: { flex: 1, minWidth: 0 },
  summaryMetaLabel: { color: '#858E9D', fontSize: 10, lineHeight: 14, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.45, marginBottom: 6 },
  summaryDivider: { width: 1, backgroundColor: '#E7EAF0', marginHorizontal: 12 },
  statusBadge: { alignSelf: 'flex-start', minWidth: 0, flexDirection: 'row', alignItems: 'center', borderRadius: 13, borderWidth: 1, paddingHorizontal: 8, paddingVertical: 5 },
  statusDot: { width: 6, height: 6, borderRadius: 3, marginRight: 5 },
  statusText: { fontSize: 11, lineHeight: 14, fontWeight: '700' },
  dueDateRow: { flexDirection: 'row', alignItems: 'center' },
  summaryDate: { flex: 1, color: '#344054', fontSize: 12, lineHeight: 17, fontWeight: '700', marginLeft: 6 },
  section: { backgroundColor: '#FFFFFF', borderRadius: 13, padding: 14, marginTop: 12, borderWidth: 1, borderColor: '#E4E7EC', shadowColor: '#101828', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 },
  sectionHeading: { flexDirection: 'row', alignItems: 'center' },
  sectionIcon: { width: 30, height: 30, borderRadius: 9, backgroundColor: '#EEF2FF', alignItems: 'center', justifyContent: 'center', marginRight: 9 },
  sectionTitle: { color: '#364152', fontSize: 14, lineHeight: 19, fontWeight: '700' },
  descriptionText: { color: '#596273', fontSize: 13, lineHeight: 20, marginTop: 12 },
  metaGrid: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 12, marginHorizontal: -3 },
  metaTile: { width: '50%', flexDirection: 'row', alignItems: 'center', backgroundColor: '#F7F8FB', borderRadius: 9, padding: 9, marginBottom: 7, borderWidth: 1, borderColor: '#ECEEF3' },
  metaIcon: { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginRight: 7 },
  metaCopy: { flex: 1, minWidth: 0 },
  metaLabel: { color: '#8A93A3', fontSize: 9, lineHeight: 12, fontWeight: '700', marginBottom: 1 },
  metaValue: { color: '#3B4656', fontSize: 11, lineHeight: 15, fontWeight: '700' },
  attachmentHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  photoCountBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F0F2FF', borderRadius: 12, paddingHorizontal: 8, paddingVertical: 5 },
  photoCount: { color: '#4F46E5', fontSize: 10, lineHeight: 14, fontWeight: '700', marginLeft: 4 },
  imageGrid: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 12, marginHorizontal: -4 },
  imageTile: { width: 104, height: 86, margin: 4, overflow: 'hidden', borderRadius: 9, backgroundColor: '#E5E7EB' },
  attachmentImage: { width: '100%', height: '100%' },
  imagePlaceholder: { width: 104, height: 86, margin: 4, borderRadius: 9, backgroundColor: '#F4F5F7', alignItems: 'center', justifyContent: 'center' },
  imagePlaceholderText: { color: '#9CA3AF', fontSize: 10, fontWeight: '600', marginTop: 4 },
  tapHint: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingTop: 10, marginTop: 10, borderTopWidth: 1, borderTopColor: '#EAECF0' },
  tapHintText: { color: '#8A93A3', fontSize: 11, lineHeight: 15, marginLeft: 6 },
  emptyPhotos: { alignItems: 'center', paddingVertical: 18 },
  emptyPhotosText: { color: '#8A93A3', fontSize: 12, lineHeight: 17, marginTop: 6 },
  statusSection: { backgroundColor: '#FFFFFF', borderRadius: 13, padding: 14, marginTop: 12, borderWidth: 1, borderColor: '#E4E7EC' },
  statusSectionLabel: { color: '#364152', fontSize: 14, lineHeight: 19, fontWeight: '700', marginBottom: 10 },
  statusOptions: { flexDirection: 'row' },
  statusOption: { flex: 1, borderRadius: 8, backgroundColor: '#F3F4F6', paddingVertical: 9, marginHorizontal: 3, alignItems: 'center' },
  statusOptionSelected: { backgroundColor: '#4F46E5' },
  statusOptionText: { color: '#596273', fontSize: 10, lineHeight: 14, fontWeight: '700' },
  statusOptionTextSelected: { color: '#FFFFFF' },
  previewBackdrop: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(17, 24, 39, 0.94)', padding: 16 },
  previewClose: { position: 'absolute', right: 18, width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.16)' },
  previewImage: { width: '100%', height: '80%' },
});

export default TaskDetailsScreen;
