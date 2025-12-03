import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, FlatList } from 'react-native';
import { format } from 'date-fns';
import axios from 'axios';

export default function NotesSection({ storeId, visitId, authToken, employeeId }) {
  const [notes, setNotes] = useState([]);
  const [newNote, setNewNote] = useState('');
  const [editingNoteId, setEditingNoteId] = useState(null);
  const [isInputVisible, setInputVisible] = useState(false);

  useEffect(() => {
    fetchNotes();
  }, [storeId]);

  const fetchNotes = async () => {
    try {
      const response = await axios.get(
        `https://api.gajkesaristeels.in/notes/getByStore?id=${storeId}`,
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        }
      );
      const sortedNotes = response.data.sort(
        (a, b) => new Date(b.createdDate) - new Date(a.createdDate)
      );
      setNotes(sortedNotes);
    } catch (error) {
      console.error('Error fetching notes:', error);
    }
  };

  const handleAddNote = () => {
    setInputVisible(true);
  };

  const handleSaveNote = async () => {
    if (newNote.trim() !== '') {
      try {
        if (editingNoteId) {
          await axios.put(
            `https://api.gajkesaristeels.in/notes/edit?id=${editingNoteId}`,
            {
              content: newNote,
              ...(employeeId && { employeeId }), // Include employeeId only if available
              storeId: storeId,
            },
            {
              headers: {
                Authorization: `Bearer ${authToken}`,
              },
            }
          );
        } else {
          await axios.post(
            'https://api.gajkesaristeels.in/notes/create',
            {
              content: newNote,
              ...(employeeId && { employeeId }), // Include employeeId only if available
              storeId: storeId,
              visitId: visitId,
            },
            {
              headers: {
                Authorization: `Bearer ${authToken}`,
              },
            }
          );
        }
        fetchNotes();
        setNewNote('');
        setInputVisible(false);
        setEditingNoteId(null);
      } catch (error) {
        console.error('Error saving note:', error);
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
      await axios.delete(
        `https://api.gajkesaristeels.in/notes/delete?id=${id}`,
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        }
      );
      fetchNotes();
    } catch (error) {
      console.error('Error deleting note:', error);
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
            {format(new Date(note.createdDate), "MMM d, yyyy")}
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
