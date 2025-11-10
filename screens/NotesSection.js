import axios from 'axios';
import { format, isToday, isYesterday } from 'date-fns';
import React, { useEffect, useState } from 'react';
import { FlatList, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

export default function NotesSection({ storeId, visitId, authToken, employeeId }) {
  const [notes, setNotes] = useState([]);
  const [newNote, setNewNote] = useState('');
  const [editingNoteId, setEditingNoteId] = useState(null);
  const [isInputVisible, setInputVisible] = useState(false);

  const formatDate = (dateString) => {
    const date = new Date(dateString);

    if (isToday(date)) {
      return 'today';
    } else if (isYesterday(date)) {
      return 'yesterday';
    } else {
      // Format as "8 Nov '25"
      return format(date, "d MMM ''yy");
    }
  };

  console.log('🟣 [NOTES] Component Props:', { storeId, visitId, employeeId, hasAuthToken: !!authToken });

  useEffect(() => {
    console.log('🟢 [NOTES] useEffect triggered for storeId:', storeId);
    if (storeId) {
      fetchNotes();
    } else {
      console.log('⚠️ [NOTES] No storeId provided, skipping fetch');
    }
  }, [storeId]);

  const fetchNotes = async () => {
    try {
      console.log('🔵 [NOTES] Fetching notes for storeId:', storeId);
      
      // Calculate current month date range
      const today = new Date();
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
        .toISOString().split('T')[0]; // e.g., "2025-10-01"
      const endOfMonth = today.toISOString().split('T')[0]; // e.g., "2025-10-08" (today)
      
      console.log('🔵 [NOTES] Date range:', startOfMonth, 'to', endOfMonth);
      
      const response = await axios.get(
        `https://unbalkingly-uncharged-elizabet.ngrok-free.dev/notes/getByStoreAndDateRange?id=${storeId}&start=${startOfMonth}&end=${endOfMonth}`,
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
            // Bypass ngrok browser warning page
            'ngrok-skip-browser-warning': 'true',
            'User-Agent': 'IconMobile',
          },
        }
      );
      
      console.log('🔵 [NOTES] Response Data:', response.data);
      console.log('🔵 [NOTES] Is Array?:', Array.isArray(response.data));
      
      // Check if response.data is an array
      if (!response.data) {
        console.log('⚠️ [NOTES] Response data is null or undefined');
        setNotes([]);
        return;
      }
      
      // Handle if response.data is not directly an array
      let notesData = Array.isArray(response.data) ? response.data : [];
      
      console.log('🔵 [NOTES] Notes Count:', notesData.length);
      
      // Sort by created date, newest first
      const sortedNotes = notesData.sort(
        (a, b) => new Date(b.createdDate) - new Date(a.createdDate)
      );
      
      console.log('✅ [NOTES] Setting notes:', sortedNotes.length);
      setNotes(sortedNotes);
    } catch (error) {
      console.error('❌ [NOTES] Error fetching notes:', error);
      console.error('❌ [NOTES] Error message:', error.message);
      console.error('❌ [NOTES] Error response:', error.response?.data);
      console.error('❌ [NOTES] Error status:', error.response?.status);
      setNotes([]);
    }
  };

  const handleAddNote = () => {
    setInputVisible(true);
  };

  const handleSaveNote = async () => {
    if (newNote.trim() !== '') {
      try {
        if (editingNoteId) {
          console.log('🔵 [NOTES] Updating note:', editingNoteId);
          const payload = {
            content: newNote,
            ...(employeeId && { employeeId }),
            storeId: storeId,
          };
          console.log('🔵 [NOTES] Update payload:', payload);
          
          const response = await axios.put(
            `https://unbalkingly-uncharged-elizabet.ngrok-free.dev/notes/edit?id=${editingNoteId}`,
            payload,
            {
              headers: {
                Authorization: `Bearer ${authToken}`,
              },
            }
          );
          console.log('✅ [NOTES] Update response:', response.data);
        } else {
          console.log('🔵 [NOTES] Creating new note');
          
          // Build payload - only include visitId if it exists
          const payload = {
            content: newNote,
            storeId: storeId,
          };
          
          // Only include employeeId if it exists
          if (employeeId) {
            payload.employeeId = employeeId;
          }
          
          // Only include visitId if it exists and is not undefined
          if (visitId !== undefined && visitId !== null) {
            payload.visitId = visitId;
            console.log('🔵 [NOTES] Creating visit-specific note with visitId:', visitId);
          } else {
            console.log('🔵 [NOTES] Creating general store note (no visitId)');
          }
          
          console.log('🔵 [NOTES] Create payload:', payload);
          
          const response = await axios.post(
            'https://unbalkingly-uncharged-elizabet.ngrok-free.dev/notes/create',
            payload,
            {
              headers: {
                Authorization: `Bearer ${authToken}`,
              },
            }
          );
          console.log('✅ [NOTES] Create response:', response.data);
        }
        fetchNotes();
        setNewNote('');
        setInputVisible(false);
        setEditingNoteId(null);
      } catch (error) {
        console.error('❌ [NOTES] Error saving note:', error);
        console.error('❌ [NOTES] Error message:', error.message);
        console.error('❌ [NOTES] Error response:', error.response?.data);
      }
    }
  };

  const handleCancelNote = () => {
    setNewNote('');
    setInputVisible(false);
    setEditingNoteId(null);
  };

  const handleEditNote = (id) => {
    const note = notes.find((note) => note.id === id);
    setNewNote(note.content);
    setEditingNoteId(id);
    setInputVisible(true);
  };

  const handleDeleteNote = async (id) => {
    try {
      console.log('🔵 [NOTES] Deleting note:', id);
      
      const response = await axios.delete(
        `https://unbalkingly-uncharged-elizabet.ngrok-free.dev/notes/delete?id=${id}`,
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        }
      );
      
      console.log('✅ [NOTES] Delete response:', response.data);
      fetchNotes();
    } catch (error) {
      console.error('❌ [NOTES] Error deleting note:', error);
      console.error('❌ [NOTES] Error message:', error.message);
      console.error('❌ [NOTES] Error response:', error.response?.data);
    }
  };

  const renderNoteItem = ({ item: note, index }) => (
    <View style={styles.noteItem}>
      <View style={styles.avatarContainer}>
        <Text style={styles.avatarText}>
          {note.employeeName
            ? note.employeeName.split(' ').map((name) => name[0]).join('')
            : ''}
        </Text>
      </View>
      {index !== notes.length - 1 && <View style={styles.timelineLine} />}
      <View style={styles.noteContent}>
        <View style={styles.noteHeader}>
          <Text style={styles.noteDate}>
            {formatDate(note.createdDate)}
          </Text>
        </View>
        <Text style={styles.noteText}>{note.content}</Text>
        <View style={styles.noteActions}>
          <TouchableOpacity style={styles.actionButton} onPress={() => handleEditNote(note.id)}>
            {/* <Text style={styles.actionButtonText}>Edit</Text> */}
          </TouchableOpacity>
          {/* <TouchableOpacity
            style={[styles.actionButton, styles.deleteButton]}
            onPress={() => handleDeleteNote(note.id)}
          >
            <Text style={[styles.actionButtonText, styles.deleteButtonText]}>Delete</Text>
          </TouchableOpacity> */}
        </View>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={notes}
        renderItem={renderNoteItem}
        keyExtractor={(item) => item.id.toString()}
      />
      {!isInputVisible && (
        <TouchableOpacity style={styles.addButton} onPress={handleAddNote}>
          <Text style={styles.addButtonText}>Add Note</Text>
        </TouchableOpacity>
      )}
      {isInputVisible && (
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Enter note"
            value={newNote}
            onChangeText={(text) => setNewNote(text)}
            multiline
          />
          <View style={styles.buttonsContainer}>
            <TouchableOpacity style={styles.saveButton} onPress={handleSaveNote}>
              <Text style={styles.buttonText}>{editingNoteId ? 'Update' : 'Save'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelButton} onPress={handleCancelNote}>
              <Text style={styles.buttonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#FFFFFF',
  },
  noteItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  avatarContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#4F46E5',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  avatarText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  timelineLine: {
    position: 'absolute',
    left: 15,
    top: 32,
    bottom: -16,
    width: 2,
    backgroundColor: '#E5E7EB',
  },
  noteContent: {
    flex: 1,
  },
  noteHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  noteDate: {
    fontSize: 12,
    color: '#6B7280',
  },
  noteId: {
    fontSize: 12,
    color: '#4F46E5',
  },
  noteText: {
    fontSize: 16,
    color: '#1F2937',
    marginBottom: 8,
  },
  visitTag: {
    backgroundColor: '#4F46E5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginBottom: 8,
  },
  visitTagText: {
    fontSize: 12,
    color: '#FFFFFF',
  },
  noteActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  actionButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginLeft: 8,
  },
  actionButtonText: {
    fontSize: 14,
    color: '#4F46E5',
  },
  deleteButton: {
    backgroundColor: '#FEE2E2',
  },
  deleteButtonText: {
    color: '#EF4444',
  },
  addButton: {
    alignItems: 'center',
    backgroundColor: '#4F46E5',
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 16,
  },
  addButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  inputContainer: {
    marginTop: 16,
  },
  input: {
    height: 100,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 8,
    marginBottom: 8,
  },
  buttonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  saveButton: {
    flex: 1,
    backgroundColor: '#4F46E5',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginRight: 8,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#E5E7EB',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
});
