import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import axios from 'axios';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';

const AddRequirementScreen = ({ route }) => {
    const { authToken } = route.params;
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [selectedStore, setSelectedStore] = useState(null);
    const [titleError, setTitleError] = useState('');
    const [descriptionError, setDescriptionError] = useState('');
    const [storeError, setStoreError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
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

    const handleSubmitRequirement = async () => {
        if (validateForm()) {
            setIsSubmitting(true);
            try {
                const employeeId = await AsyncStorage.getItem('employeeId');
                const newRequirement = {
                    taskTitle: title.trim(),
                    taskDesciption: description.trim(), // Note: Backend uses 'taskDesciption' (typo in backend)
                    dueDate: new Date().toISOString().split('T')[0],
                    assignedToId: parseInt(employeeId),
                    assignedById: parseInt(employeeId),
                    storeId: selectedStore.storeId,
                    taskType: 'requirement',
                    status: 'Assigned',
                    priority: 'low',
                };

                const response = await axios.post(
                    'https://unbalkingly-uncharged-elizabet.ngrok-free.dev/task/create',
                    newRequirement,
                    {
                        headers: {
                            Authorization: `Bearer ${authToken}`,
                            'ngrok-skip-browser-warning': 'true',
                            'User-Agent': 'IconMobile',
                        },
                    }
                );

                if (response.data) {
                    navigation.navigate('RequirementsScreen', {
                        authToken,
                        showSuccessMessage: true,
                        successMessage: 'Requirement added successfully'
                    });
                } else {
                    throw new Error('No data received from server');
                }
            } catch (error) {
                console.error('Error creating requirement:', error);
                Alert.alert('Error', 'Failed to add requirement. Please try again.');
            } finally {
                setIsSubmitting(false);
            }
        }
    };

    return (
        <ScrollView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Ionicons name="arrow-back" size={24} color="#333" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Add Requirement</Text>
            </View>

            <View style={styles.formGroup}>
                <Text style={styles.label}>Requirement Title</Text>
                <TextInput
                    style={[styles.input, titleError ? styles.inputError : null]}
                    value={title}
                    onChangeText={setTitle}
                    placeholder="Enter title"
                />
                {titleError ? <Text style={styles.errorText}>{titleError}</Text> : null}
            </View>

            <View style={styles.formGroup}>
                <Text style={styles.label}>Requirement Description</Text>
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

            <TouchableOpacity
                style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
                onPress={handleSubmitRequirement}
                disabled={isSubmitting}
            >
                {isSubmitting ? (
                    <ActivityIndicator color="#FFFFFF" />
                ) : (
                    <Text style={styles.submitButtonText}>Add Requirement</Text>
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

export default AddRequirementScreen;