import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import moment from 'moment';
import React, { useEffect, useState } from 'react';
import { Alert, FlatList, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

const Notes = ({ visitId, storeId, authToken, readOnly, onNotesUpdated = () => { } }) => { // Set default prop value
  const [notes, setNotes] = useState([]);
  const [newNote, setNewNote] = useState('');

  useEffect(() => {
    fetchNotes();
  }, []);

  const fetchNotes = async () => {
    try {
      const response = await axios.get(`https://unbalkingly-uncharged-elizabet.ngrok-free.dev/notes/getByVisit?id=${visitId}`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });
      setNotes(response.data);
      onNotesUpdated(response.data.length); // Notify parent component
    } catch (error) {
      console.error('Error fetching notes:', error);
    }
  };

  const handleAddNote = async () => {
    if (newNote.trim() === '') {
      Alert.alert('Error', 'Note content cannot be empty.');
      return;
    }

    try {
      const employeeId = await AsyncStorage.getItem('employeeId');
      const response = await axios.post(
        'https://unbalkingly-uncharged-elizabet.ngrok-free.dev/notes/create',
        {
          content: newNote,
          employeeId: employeeId,
          storeId: storeId,
          visitId: visitId,
        },
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        }
      );

      if (response.data) {
        const newNoteItem = {
          id: response.data,
          content: newNote,
          visitId: visitId,
          employeeId: employeeId,
          createdAt: moment().format(),
        };
        const updatedNotes = [newNoteItem, ...notes];
        setNotes(updatedNotes);
        setNewNote('');
        onNotesUpdated(updatedNotes.length); // Notify parent component
      }
    } catch (error) {
      console.error('Error adding note:', error);
      Alert.alert('Error', 'Failed to add note. Please try again.');
    }
  };

  const renderNoteItem = ({ item }) => (
    <View style={styles.noteItem}>
      <Text style={styles.noteContent}>{item.content}</Text>
      <Text style={styles.noteDate}>{moment(item.createdAt).format('MMM D, YYYY HH:mm')}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.inputSection}>
        {!readOnly && (
          <>
            <TextInput
              style={styles.input}
              placeholder="Add a new note"
              value={newNote}
              onChangeText={setNewNote}
              multiline
            />
            <TouchableOpacity style={styles.button} onPress={handleAddNote}>
              <Text style={styles.buttonText}>Add Note</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
      <View style={styles.notesSection}>
        <FlatList
          data={notes}
          renderItem={renderNoteItem}
          keyExtractor={item => item.id.toString()}
          ListEmptyComponent={<Text style={styles.emptyText}>No notes available for this visit.</Text>}
          style={styles.notesList}
          contentContainerStyle={styles.notesListContent}
          showsVerticalScrollIndicator={true}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  inputSection: {
    flexShrink: 0,
    paddingBottom: 15,
  },
  input: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    marginBottom: 15,
    minHeight: 100,
    maxHeight: 150,
    textAlignVertical: 'top',
    backgroundColor: '#FFFFFF',
    fontSize: 16,
    color: '#1F2937',
  },
  notesSection: {
    flex: 1,
    minHeight: 200,
  },
  button: {
    backgroundColor: '#4F46E5',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 20,
    elevation: 2,
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 16,
  },
  noteItem: {
    backgroundColor: '#F9FAFB',
    padding: 15,
    borderRadius: 8,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#4F46E5',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  noteContent: {
    fontSize: 16,
    color: '#1F2937',
    lineHeight: 22,
    marginBottom: 8,
  },
  noteDate: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  notesList: {
    flex: 1,
  },
  notesListContent: {
    flexGrow: 1,
    paddingBottom: 30,
  },
  emptyText: {
    textAlign: 'center',
    fontStyle: 'italic',
    color: '#6B7280',
    fontSize: 16,
    marginTop: 40,
    paddingHorizontal: 20,
  },
});

export default Notes;
