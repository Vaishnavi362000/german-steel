import axios from 'axios';
import React, { useEffect, useState } from 'react';
import { Alert, FlatList, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { format, isToday, isYesterday } from 'date-fns';

const Requirements = ({ visitId, authToken, onRequirementAdded, readOnly }) => {
  const [requirements, setRequirements] = useState([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  useEffect(() => {
    fetchRequirements();
  }, []);

  const fetchRequirements = async () => {
    try {
      const response = await axios.get(`https://unbalkingly-uncharged-elizabet.ngrok-free.dev/task/getByVisit?type=requirement&visitId=${visitId}`, {
        headers: { 
          Authorization: `Bearer ${authToken}`,
          'ngrok-skip-browser-warning': 'true',
          'User-Agent': 'IconMobile',
        },
      });
      
      // Check if response is HTML instead of JSON
      const isHtmlResponse = typeof response.data === 'string' && 
        (response.data.includes('<!DOCTYPE html>') || response.data.includes('<html>'));
      
      if (isHtmlResponse) {
        console.log('⚠️ [REQUIREMENTS] Server returned HTML instead of JSON');
        setRequirements([]);
        return;
      }
      
      const filteredRequirements = Array.isArray(response.data)
        ? response.data.filter(task => task && task.taskType === 'requirement')
        : [];
      setRequirements(filteredRequirements);
    } catch (error) {
      console.error('Error fetching requirements:', error);
      setRequirements([]);
    }
  };

  const handleAddRequirement = async () => {
    if (!title.trim() && !description.trim()) {
      Alert.alert('Incomplete Form', 'Please fill in at least one field.');
      return;
    }

    try {
      const response = await axios.post('https://unbalkingly-uncharged-elizabet.ngrok-free.dev/task/create', {
        taskTitle: title.trim(),
        taskDesciption: description.trim(), // Note: Backend uses 'taskDesciption' (typo in backend)
        visitId: visitId,
        taskType: 'requirement',
        status: 'Assigned',
        priority: 'low',
      }, {
        headers: { Authorization: `Bearer ${authToken}` },
      });

      if (response.data) {
        setTitle('');
        setDescription('');
        fetchRequirements();
        if (onRequirementAdded) {
          onRequirementAdded();
        }
      } else {
        throw new Error('No data received from server');
      }
    } catch (error) {
      console.error('Error creating requirement:', error);
      Alert.alert('Error', 'Failed to add requirement. Please try again.');
    }
  };

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

  const renderRequirementItem = ({ item }) => (
    <View style={styles.requirementItem}>
      <Text style={styles.requirementTitle}>{item.taskTitle || 'No title'}</Text>
      <Text style={styles.requirementDescription}>{item.taskDesciption || 'No description'}</Text>
      <Text style={styles.requirementDate}>Added: {formatDate(item.createdAt)}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Requirements</Text>
      {!readOnly && (
        <>
          <TextInput
            style={styles.input}
            placeholder="Title"
            value={title}
            onChangeText={setTitle}
          />
          <TextInput
            style={[styles.input, styles.descriptionInput]}
            placeholder="Description"
            value={description}
            onChangeText={setDescription}
            multiline
          />
          <TouchableOpacity style={styles.button} onPress={handleAddRequirement}>
            <Text style={styles.buttonText}>Add Requirement</Text>
          </TouchableOpacity>
        </>
      )}
      <FlatList
        data={requirements}
        renderItem={renderRequirementItem}
        keyExtractor={(item) => item.id.toString()}
        ListEmptyComponent={<Text style={styles.emptyText}>No requirements added yet</Text>}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    paddingBottom: 40,
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
  },
  descriptionInput: {
    height: 100,
    textAlignVertical: 'top',
  },
  button: {
    backgroundColor: '#4F46E5',
    padding: 10,
    borderRadius: 5,
    alignItems: 'center',
    marginBottom: 20,
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  requirementItem: {
    backgroundColor: '#f0f0f0',
    padding: 10,
    borderRadius: 5,
    marginBottom: 10,
  },
  requirementTitle: {
    fontWeight: 'bold',
    marginBottom: 5,
  },
  requirementDescription: {
    color: '#666',
  },
  requirementDate: {
    fontSize: 12,
    color: '#888',
    marginTop: 5,
  },
  emptyText: {
    textAlign: 'center',
    fontStyle: 'italic',
    color: '#888',
    paddingBottom: 20,
  },
});

export default Requirements;