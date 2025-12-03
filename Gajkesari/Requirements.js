import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, FlatList, Alert } from 'react-native';
import axios from 'axios';

const Requirements = ({ visitId, authToken, onRequirementAdded, readOnly }) => {
  const [requirements, setRequirements] = useState([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  useEffect(() => {
    fetchRequirements();
  }, []);

  const fetchRequirements = async () => {
    try {
      const response = await axios.get(`https://api.gajkesaristeels.in/task/getByVisit?type=requirement&visitId=${visitId}`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      const filteredRequirements = Array.isArray(response.data)
        ? response.data.filter(task => task && task.taskType === 'requirement')
        : [];
      setRequirements(filteredRequirements);
    } catch (error) {
      console.error('Error fetching requirements:', error);
      Alert.alert('Error', 'Failed to fetch requirements. Please try again.');
    }
  };

  const handleAddRequirement = async () => {
    if (!title.trim() && !description.trim()) {
      Alert.alert('Incomplete Form', 'Please fill in at least one field.');
      return;
    }

    try {
      const response = await axios.post('https://api.gajkesaristeels.in/task/create', {
        taskTitle: title.trim(),
        taskDescription: description.trim(),
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

  const renderRequirementItem = ({ item }) => (
    <View style={styles.requirementItem}>
      <Text style={styles.requirementTitle}>{item.taskTitle || 'No title'}</Text>
      <Text style={styles.requirementDescription}>{item.taskDesciption || 'No description'}</Text>
      <Text style={styles.requirementDate}>Added: {new Date(item.createdAt).toLocaleDateString()}</Text>
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
  },
});

export default Requirements;