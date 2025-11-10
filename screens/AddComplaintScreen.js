import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import axios from 'axios';
import * as ImagePicker from 'expo-image-picker';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Image,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';

const AddComplaintScreen = ({ route }) => {
    const { authToken } = route.params;
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [selectedStore, setSelectedStore] = useState(null);
    const [titleError, setTitleError] = useState('');
    const [descriptionError, setDescriptionError] = useState('');
    const [storeError, setStoreError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [images, setImages] = useState([]);
    const navigation = useNavigation();

    const validateForm = () => {
        let isValid = true;

        if (!title.trim()) {
            setTitleError('Title is required');
            isValid = false;
        } else {
            setTitleError('');
        }

        if (!description.trim()) {
            setDescriptionError('Description is required');
            isValid = false;
        } else {
            setDescriptionError('');
        }

        if (!selectedStore) {
            setStoreError('Please select a store');
            isValid = false;
        } else {
            setStoreError('');
        }

        return isValid;
    };

    const handleSubmitComplaint = async () => {
        if (validateForm()) {
            setIsSubmitting(true);
            try {
                const employeeId = await AsyncStorage.getItem('employeeId');
                
                console.log('🔵 [CREATE COMPLAINT] Creating complaint...');
                console.log('🔵 [CREATE COMPLAINT] Employee ID:', employeeId);
                console.log('🔵 [CREATE COMPLAINT] Store:', selectedStore.storeName);
                console.log('🔵 [CREATE COMPLAINT] Images to upload:', images.length);
                
                const newComplaint = {
                    taskTitle: title.trim(),
                    taskDesciption: description.trim(), // Note: Backend uses 'taskDesciption' (typo in backend)
                    dueDate: new Date().toISOString().split('T')[0],
                    assignedToId: parseInt(employeeId),
                    assignedById: parseInt(employeeId),
                    storeId: selectedStore.storeId,
                    taskType: 'complaint',
                    status: 'Assigned',
                    priority: 'low',
                };

                const response = await axios.post(
                    'https://unbalkingly-uncharged-elizabet.ngrok-free.dev/task/create',
                    newComplaint,
                    {
                        headers: {
                            Authorization: `Bearer ${authToken}`,
                            'ngrok-skip-browser-warning': 'true',
                            'User-Agent': 'IconMobile',
                        },
                    }
                );

                console.log('🔵 [CREATE COMPLAINT] Response:', response.data);

                if (response.data) {
                    const taskId = response.data;
                    console.log('✅ [CREATE COMPLAINT] Complaint created with ID:', taskId);

                    // Upload images if any
                    if (images.length > 0) {
                        console.log('🔵 [UPLOAD IMAGES] Uploading', images.length, 'images...');
                        let uploadedCount = 0;
                        let failedCount = 0;
                        
                        for (let i = 0; i < images.length; i++) {
                            try {
                                console.log(`🔵 [UPLOAD IMAGES] Uploading image ${i + 1}/${images.length}`);
                                await uploadImage(taskId, images[i]);
                                uploadedCount++;
                            } catch (imgError) {
                                failedCount++;
                                console.error(`❌ [UPLOAD IMAGES] Failed to upload image ${i + 1}`);
                            }
                        }
                        
                        console.log(`✅ [UPLOAD IMAGES] Uploaded ${uploadedCount}/${images.length} images`);
                        
                        if (failedCount > 0) {
                            Alert.alert(
                                'Partial Success',
                                `Complaint created! ${uploadedCount} of ${images.length} images uploaded successfully.`
                            );
                        } else {
                            Alert.alert('Success', 'Complaint and all images uploaded successfully!');
                        }
                    } else {
                        Alert.alert('Success', 'Complaint added successfully!');
                    }

                    navigation.navigate('ComplaintsScreen', {
                        authToken,
                        showSuccessMessage: true,
                        successMessage: 'Complaint added successfully'
                    });
                } else {
                    throw new Error('No task ID received from server');
                }
            } catch (error) {
                console.error('❌ [CREATE COMPLAINT] Error:', error);
                console.error('❌ [CREATE COMPLAINT] Error response:', error.response?.data);
                Alert.alert(
                    'Error',
                    error.response?.data || 'Failed to add complaint. Please try again.',
                    [{ text: 'OK' }]
                );
            } finally {
                setIsSubmitting(false);
            }
        }
    };

    const uploadImage = async (taskId, imageUri) => {
        try {
            console.log('🔵 [UPLOAD IMAGE] Task ID:', taskId);
            console.log('🔵 [UPLOAD IMAGE] Image URI:', imageUri);
            
            const formData = new FormData();
            
            // Get file name from URI
            const fileName = imageUri.split('/').pop() || 'complaint_image.jpg';
            
            formData.append('file', {
                uri: imageUri,
                type: 'image/jpeg',
                name: fileName,
            });

            console.log('🔵 [UPLOAD IMAGE] FormData created');

            const response = await axios.put(
                `https://unbalkingly-uncharged-elizabet.ngrok-free.dev/task/uploadFile?id=${taskId}&tag=check-in`,
                formData,
                {
                    headers: {
                        'Content-Type': 'multipart/form-data',
                        Authorization: `Bearer ${authToken}`,
                        'ngrok-skip-browser-warning': 'true',
                        'User-Agent': 'IconMobile',
                    },
                }
            );

            console.log('🔵 [UPLOAD IMAGE] Response status:', response.status);
            console.log('🔵 [UPLOAD IMAGE] Response data:', response.data);

            if (response.status === 200) {
                console.log('✅ [UPLOAD IMAGE] Image uploaded successfully');
            } else {
                throw new Error(`Upload failed with status: ${response.status}`);
            }
        } catch (error) {
            console.error('❌ [UPLOAD IMAGE] Error:', error);
            console.error('❌ [UPLOAD IMAGE] Error response:', error.response?.data);
            // Don't show alert here, let the main function handle it
            throw error;
        }
    };

    const handleAddImage = async () => {
        if (images.length >= 5) {
            Alert.alert('Limit Reached', 'You can only add up to 5 images.');
            return;
        }

        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permission denied', 'Camera roll permission is required to add images.');
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'], // Updated from deprecated MediaTypeOptions
            allowsEditing: true,
            aspect: [4, 3],
            quality: 0.8,
        });

        console.log('Image picker result:', result);

        if (!result.canceled && result.assets && result.assets.length > 0) {
            console.log('Adding image:', result.assets[0].uri);
            setImages([...images, result.assets[0].uri]);
        }
    };

    const handleRemoveImage = (index) => {
        const newImages = [...images];
        newImages.splice(index, 1);
        setImages(newImages);
    };

    const renderImageItem = ({ item, index }) => (
        <View style={styles.imageContainer}>
            <Image source={{ uri: item }} style={styles.thumbnailImage} />
            <TouchableOpacity
                style={styles.removeImageButton}
                onPress={() => handleRemoveImage(index)}
            >
                <Ionicons name="close-circle" size={24} color="red" />
            </TouchableOpacity>
        </View>
    );

    return (
        <ScrollView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Ionicons name="arrow-back" size={24} color="#333" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Add Complaint</Text>
            </View>

            <View style={styles.formGroup}>
                <Text style={styles.label}>Complaint Type</Text>
                <TextInput
                    style={[styles.input, titleError ? styles.inputError : null]}
                    value={title}
                    onChangeText={setTitle}
                    placeholder="Enter title"
                />
                {titleError ? <Text style={styles.errorText}>{titleError}</Text> : null}
            </View>

            <View style={styles.formGroup}>
                <Text style={styles.label}>Complaint Description</Text>
                <TextInput
                    style={[styles.input, styles.descriptionInput, descriptionError ? styles.inputError : null]}
                    value={description}
                    onChangeText={setDescription}
                    placeholder="Enter description"
                    multiline
                />
                {descriptionError ? <Text style={styles.errorText}>{descriptionError}</Text> : null}
            </View>

            <View style={styles.formGroup}>
                <Text style={styles.label}>Customer</Text>
                <TouchableOpacity
                    style={[styles.input, storeError ? styles.inputError : null]}
                    onPress={() => navigation.navigate('StoreSelectionScreen', { onSelect: setSelectedStore, authToken })}
                >
                    <Text>{selectedStore ? selectedStore.storeName : 'Select Customer'}</Text>
                </TouchableOpacity>
                {storeError ? <Text style={styles.errorText}>{storeError}</Text> : null}
            </View>

            <TouchableOpacity style={styles.imageButton} onPress={handleAddImage}>
                <Ionicons name="images" size={24} color="#6C63FF" />
                <Text style={styles.imageButtonText}>Add Images (max 5)</Text>
            </TouchableOpacity>

            {images.length > 0 && (
                <FlatList
                    data={images}
                    renderItem={renderImageItem}
                    keyExtractor={(item, index) => index.toString()}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={styles.imageList}
                />
            )}

            <TouchableOpacity
                style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
                onPress={handleSubmitComplaint}
                disabled={isSubmitting}
            >
                {isSubmitting ? (
                    <ActivityIndicator color="#FFFFFF" />
                ) : (
                    <Text style={styles.submitButtonText}>Log Complaint</Text>
                )}
            </TouchableOpacity>
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        marginLeft: 16,
    },
    formGroup: {
        margin: 16,
    },
    label: {
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 8,
    },
    input: {
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 4,
        padding: 12,
        fontSize: 16,
    },
    descriptionInput: {
        height: 100,
        textAlignVertical: 'top',
    },
    inputError: {
        borderColor: 'red',
    },
    errorText: {
        color: 'red',
        fontSize: 12,
        marginTop: 4,
    },
    imageButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f0f0f0',
        padding: 12,
        borderRadius: 4,
        margin: 16,
    },
    imageButtonText: {
        marginLeft: 8,
        fontSize: 16,
        color: '#6C63FF',
    },
    imageList: {
        marginHorizontal: 16,
    },
    imageContainer: {
        marginRight: 8,
    },
    thumbnailImage: {
        width: 80,
        height: 80,
        borderRadius: 4,
    },
    removeImageButton: {
        position: 'absolute',
        top: -8,
        right: -8,
        backgroundColor: 'white',
        borderRadius: 12,
    },
    submitButton: {
        backgroundColor: '#6C63FF',
        padding: 16,
        borderRadius: 4,
        alignItems: 'center',
        margin: 16,
    },
    submitButtonDisabled: {
        opacity: 0.5,
    },
    submitButtonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
    },
});

export default AddComplaintScreen;