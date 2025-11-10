import axios from 'axios';
import React, { useEffect, useState } from 'react';
import { Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

export default function LikesSection({ storeId, authToken }) {
  const [likes, setLikes] = useState({});
  const [isAdding, setIsAdding] = useState(false);
  const [newLike, setNewLike] = useState({ key: '', value: '' });

  useEffect(() => {
    fetchLikes();
  }, []);

  const fetchLikes = async () => {
    try {
      const response = await axios.get(
        `https://unbalkingly-uncharged-elizabet.ngrok-free.dev/store/getById?id=${storeId}`,
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        }
      );
      const storeData = response.data;
      setLikes(storeData.likes || {});
    } catch (error) {
      console.error('Error fetching likes:', error);
    }
  };

  const handleInputChange = (key, value) => {
    setNewLike({ ...newLike, [key]: value });
  };

  const handleAddLike = async () => {
    if (newLike.key.trim() !== '' && newLike.value.trim() !== '') {
      const updatedLikes = { ...likes, [newLike.key]: newLike.value };
      setLikes(updatedLikes);
      setNewLike({ key: '', value: '' });
      setIsAdding(false);

      try {
        const payload = { likes: updatedLikes };
        await axios.put(
          `https://unbalkingly-uncharged-elizabet.ngrok-free.dev/store/edit?id=${storeId}`,
          payload,
          {
            headers: {
              Authorization: `Bearer ${authToken}`,
            },
          }
        );
      } catch (error) {
        console.error('Error updating likes:', error);
        Alert.alert('Error', 'Failed to update likes');
      }
    }
  };

  const handleDeleteLike = async (key) => {
    const updatedLikes = { ...likes };
    delete updatedLikes[key];
    setLikes(updatedLikes);

    try {
      const payload = { likes: updatedLikes };
      await axios.put(
        `https://unbalkingly-uncharged-elizabet.ngrok-free.dev/store/edit?id=${storeId}`,
        payload,
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        }
      );
    } catch (error) {
      console.error('Error updating likes:', error);
      Alert.alert('Error', 'Failed to update likes');
    }
  };

  return (
    <View style={styles.container}>
      {Object.keys(likes).length === 0 && !isAdding && (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No likes available.</Text>
          <TouchableOpacity style={styles.button} onPress={() => setIsAdding(true)}>
            <Text style={styles.buttonText}>Add Like</Text>
          </TouchableOpacity>
        </View>
      )}

      {isAdding && (
        <View style={styles.addContainer}>
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="Key"
              value={newLike.key}
              onChangeText={(value) => handleInputChange('key', value)}
            />
            <TextInput
              style={styles.input}
              placeholder="Value"
              value={newLike.value}
              onChangeText={(value) => handleInputChange('value', value)}
            />
          </View>
          <View style={styles.buttonContainer}>
            <TouchableOpacity style={styles.button} onPress={handleAddLike}>
              <Text style={styles.buttonText}>Add</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={() => setIsAdding(false)}
            >
              <Text style={styles.buttonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {Object.keys(likes).length > 0 && (
        <View style={styles.likeList}>
          {Object.entries(likes).map(([key, value]) => (
            <View key={key} style={styles.likeItem}>
              <Text style={styles.likeText}>
                {key}: {value}
              </Text>
              {/* <TouchableOpacity
                style={styles.deleteButton}
                onPress={() => handleDeleteLike(key)}
              >
                <Text style={styles.deleteButtonText}>Delete</Text>
              </TouchableOpacity> */}
            </View>
          ))}
          {!isAdding && (
            <TouchableOpacity style={styles.button} onPress={() => setIsAdding(true)}>
              <Text style={styles.buttonText}>Add Like</Text>
            </TouchableOpacity>
          )}
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
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  emptyText: {
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 16,
  },
  button: {
    backgroundColor: '#4F46E5',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginTop: 8,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  addContainer: {
    marginBottom: 16,
  },
  inputContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  input: {
    flex: 1,
    height: 40,
    borderColor: '#E5E7EB',
    borderWidth: 1,
    borderRadius: 8,
    padding: 8,
    marginRight: 8,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  cancelButton: {
    backgroundColor: '#E5E7EB',
    marginLeft: 8,
  },
  likeList: {
    marginTop: 16,
  },
  likeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  likeText: {
    fontSize: 16,
    color: '#1F2937',
  },
  deleteButton: {
    backgroundColor: '#FEE2E2',
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  deleteButtonText: {
    fontSize: 14,
    color: '#EF4444',
  },
});