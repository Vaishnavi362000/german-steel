import { API_BASE_URL } from './config/api';
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, FlatList, Alert, ActivityIndicator } from 'react-native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import moment from 'moment';

const Notes = ({ visitId, storeId, authToken, readOnly, onNotesUpdated = () => { } }) => { // Set default prop value
  const [notes, setNotes] = useState([]);
  const [newNote, setNewNote] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  useEffect(() => {
    fetchNotes();
  }, []);

  const fetchNotes = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/notes/getByVisit?id=${visitId}`, {
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
    if (isAdding) {
      return;
    }

    if (newNote.trim() === '') {
      Alert.alert('Error', 'Note content cannot be empty.');
      return;
    }

    try {
      setIsAdding(true);
      const employeeId = await AsyncStorage.getItem('employeeId');
      const response = await axios.post(
        `${API_BASE_URL}/notes/create`,
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
    } finally {
      setIsAdding(false);
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
      <Text style={styles.title}>Notes</Text>
      {!readOnly && (
        <>
          <TextInput
            style={styles.input}
            placeholder="Add a new note"
            value={newNote}
            onChangeText={setNewNote}
            multiline
          />
          <TouchableOpacity
            style={[styles.button, isAdding && styles.buttonDisabled]}
            onPress={handleAddNote}
            disabled={isAdding}
          >
            {isAdding ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Add Note</Text>
            )}
          </TouchableOpacity>
        </>
      )}
      <FlatList
        data={notes}
        renderItem={renderNoteItem}
        keyExtractor={item => item.id.toString()}
        ListEmptyComponent={<Text style={styles.emptyText}>No notes available for this visit.</Text>}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 5,
    padding: 10,
    marginBottom: 10,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  button: {
    backgroundColor: '#4A90E2',
    padding: 10,
    borderRadius: 5,
    alignItems: 'center',
    marginBottom: 20,
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  noteItem: {
    backgroundColor: '#f0f0f0',
    padding: 10,
    borderRadius: 5,
    marginBottom: 10,
  },
  noteContent: {
    fontSize: 16,
  },
  noteDate: {
    fontSize: 12,
    color: '#888',
    marginTop: 5,
  },
  emptyText: {
    textAlign: 'center',
    fontStyle: 'italic',
    color: '#888',
  },
});

export default Notes;
