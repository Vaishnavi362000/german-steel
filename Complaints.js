import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, FlatList, Alert, Image } from 'react-native';
import axios from 'axios';
import * as ImagePicker from 'expo-image-picker';

const Complaints = ({ visitId, authToken, onComplaintAdded, readOnly }) => {
  const [complaints, setComplaints] = useState([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [images, setImages] = useState([]);

  useEffect(() => {
    fetchComplaints();
  }, []);

  const fetchComplaints = async () => {
    try {
      const response = await axios.get(`https://api.gajkesaristeels.in/task/getByVisit?type=complaint&visitId=${visitId}`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      const filteredComplaints = Array.isArray(response.data)
        ? response.data.filter(task => task && task.taskType === 'complaint')
        : [];
      setComplaints(filteredComplaints);
    } catch (error) {
      console.error('Error fetching complaints:', error);
      Alert.alert('Error', 'Failed to fetch complaints. Please try again.');
    }
  };

  const handleAddComplaint = async () => {
    if (!title.trim()) {
      Alert.alert('Incomplete Form', 'Please fill in the title field.');
      return;
    }

    try {
      const newComplaint = {
        taskTitle: title.trim(),
        taskDesciption: description.trim(),
        taskType: 'complaint',
        status: 'Assigned',
        visitId: visitId
      };
      const response = await axios.post('https://api.gajkesaristeels.in/task/create', newComplaint, {
        headers: { Authorization: `Bearer ${authToken}` },
      });

      if (response.data) {
        const taskId = response.data;
        await Promise.all(images.map(imageUri => uploadImage(taskId, imageUri)));
        setTitle('');
        setDescription('');
        setImages([]);
        fetchComplaints();
        if (onComplaintAdded && typeof onComplaintAdded === 'function') {
          onComplaintAdded();
        }
      } else {
        throw new Error('No data received from server');
      }
    } catch (error) {
      console.error('Error creating complaint:', error);
      Alert.alert('Error', 'Failed to add complaint. Please try again.');
    }
  };

  const uploadImage = async (taskId, imageUri) => {
    try {
      const formData = new FormData();
      formData.append('file', {
        uri: imageUri,
        name: 'image.jpg',
        type: 'image/jpeg',
      });

      await axios.put(
        `https://api.gajkesaristeels.in/task/uploadFile?id=${taskId}&tag=check-in`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
            Authorization: `Bearer ${authToken}`,
          },
        }
      );
    } catch (error) {
      console.error('Error uploading image:', error);
      Alert.alert('Error', 'Failed to upload image. The complaint was created without the image.');
    }
  };

  const pickImage = async () => {
    const remainingSlots = 5 - images.length;
    if (remainingSlots <= 0) {
      Alert.alert('Limit Reached', 'You can only add up to 5 images.');
      return;
    }

    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission denied', 'Photo library permission is required to select images.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      allowsMultipleSelection: true,
      selectionLimit: remainingSlots,
      quality: 1,
    });

    if (!result.canceled && result.assets) {
      const newImages = result.assets.map(asset => asset.uri);
      const totalImages = images.length + newImages.length;
      if (totalImages > 5) {
        Alert.alert('Limit Reached', `You can only add up to 5 images. Selected ${newImages.length} but only ${5 - images.length} slots available.`);
        const imagesToAdd = newImages.slice(0, 5 - images.length);
        setImages([...images, ...imagesToAdd]);
      } else {
        setImages([...images, ...newImages]);
      }
    }
  };

  const takeImage = async () => {
    const remainingSlots = 5 - images.length;
    if (remainingSlots <= 0) {
      Alert.alert('Limit Reached', 'You can only add up to 5 images.');
      return;
    }

    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission denied', 'Camera permission is required to take photos.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 1,
    });

    if (!result.canceled && result.assets) {
      const newImages = result.assets.map(asset => asset.uri);
      const totalImages = images.length + newImages.length;
      if (totalImages > 5) {
        Alert.alert('Limit Reached', `You can only add up to 5 images.`);
        return;
      } else {
        setImages([...images, ...newImages]);
      }
    }
  };

  const removeImage = (index) => {
    const newImages = [...images];
    newImages.splice(index, 1);
    setImages(newImages);
  };

  const renderComplaintItem = ({ item }) => (
    <View style={styles.complaintItem}>
      <Text style={styles.complaintTitle}>{item.taskTitle}</Text>
      <Text style={styles.complaintDescription}>{item.taskDesciption}</Text>
      <Text style={styles.complaintDate}>Added: {new Date(item.createdAt).toLocaleDateString()}</Text>
      {item.attachmentResponse && item.attachmentResponse.length > 0 && (
        <Image
          source={{ uri: item.attachmentResponse[0].fileDownloadUri }}
          style={styles.complaintImage}
        />
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Complaints</Text>
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
          <View style={styles.imageButtonsContainer}>
            <TouchableOpacity style={styles.imageButton} onPress={pickImage}>
              <Text style={styles.imageButtonText}>
                {images.length < 5 ? 'Add Image' : 'Max Images Added'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.imageButton} onPress={takeImage}>
              <Text style={styles.imageButtonText}>
                {images.length < 5 ? 'Take Image' : 'Max Images Added'}
              </Text>
            </TouchableOpacity>
          </View>
          <View style={styles.imagePreviewContainer}>
            {images.map((img, index) => (
              <View key={index} style={styles.imageWrapper}>
                <Image source={{ uri: img }} style={styles.previewImage} />
                <TouchableOpacity
                  style={styles.removeImageButton}
                  onPress={() => removeImage(index)}
                >
                  <Text style={styles.removeImageButtonText}>Remove</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
          <TouchableOpacity style={styles.button} onPress={handleAddComplaint}>
            <Text style={styles.buttonText}>Add Complaint</Text>
          </TouchableOpacity>
        </>
      )}
      <FlatList
        data={complaints}
        renderItem={renderComplaintItem}
        keyExtractor={(item) => item.id.toString()}
        ListEmptyComponent={<Text style={styles.emptyText}>No complaints added yet</Text>}
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
  imageButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  imageButton: {
    backgroundColor: '#f0f0f0',
    padding: 10,
    borderRadius: 5,
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 5,
  },
  imageButtonText: {
    color: '#4A90E2',
  },
  imagePreviewContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 10,
  },
  imageWrapper: {
    position: 'relative',
    marginRight: 10,
    marginBottom: 10,
  },
  previewImage: {
    width: 80,
    height: 80,
    resizeMode: 'cover',
    borderRadius: 5,
  },
  removeImageButton: {
    position: 'absolute',
    top: 5,
    right: 5,
    backgroundColor: '#ff0000',
    padding: 5,
    borderRadius: 5,
  },
  removeImageButtonText: {
    color: '#fff',
    fontSize: 12,
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
  complaintItem: {
    backgroundColor: '#f0f0f0',
    padding: 10,
    borderRadius: 5,
    marginBottom: 10,
  },
  complaintTitle: {
    fontWeight: 'bold',
    marginBottom: 5,
  },
  complaintDescription: {
    color: '#666',
  },
  complaintDate: {
    fontSize: 12,
    color: '#888',
    marginTop: 5,
  },
  complaintImage: {
    width: '100%',
    height: 150,
    resizeMode: 'cover',
    marginTop: 10,
    borderRadius: 5,
  },
  emptyText: {
    textAlign: 'center',
    fontStyle: 'italic',
    color: '#888',
  },
});

export default Complaints;
