import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import React, { useEffect, useState } from 'react';
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

const ContactsManager = ({ storeId, authToken, onClose }) => {
    const [contacts, setContacts] = useState([]);
    const [showForm, setShowForm] = useState(false);
    const [contactForm, setContactForm] = useState({
        name: '',
        role: '',
        contact: '',
    });
    const [loading, setLoading] = useState(true);
    const [editingContact, setEditingContact] = useState(null);

    const contactTypes = ['Architect', 'Engineer', 'Builder'];

    useEffect(() => {
        fetchContacts();
    }, []);

    const fetchContacts = async () => {
        try {
            const response = await axios.get(
                `https://unbalkingly-uncharged-elizabet.ngrok-free.dev/professionals/getByStore?storeId=${storeId}`,
                {
                    headers: { Authorization: `Bearer ${authToken}` },
                }
            );
            setContacts(response.data);
            setLoading(false);
        } catch (error) {
            console.error('Error fetching contacts:', error);
            Alert.alert('Error', 'Failed to fetch contacts');
            setLoading(false);
        }
    };

    const handleSubmit = async () => {
        if (!contactForm.name || !contactForm.role || !contactForm.contact) {
            Alert.alert('Error', 'Please fill all fields');
            return;
        }

        try {
            if (editingContact) {
                // Edit existing contact
                await axios.put(
                    `https://unbalkingly-uncharged-elizabet.ngrok-free.dev/professionals/edit?professionalId=${editingContact.id}`,
                    {
                        ...contactForm,
                        storeId,
                    },
                    {
                        headers: { Authorization: `Bearer ${authToken}` },
                    }
                );
            } else {
                // Add new contact
                await axios.post(
                    'https://unbalkingly-uncharged-elizabet.ngrok-free.dev/professionals/addForStore',
                    {
                        ...contactForm,
                        storeId,
                    },
                    {
                        headers: { Authorization: `Bearer ${authToken}` },
                    }
                );
            }
            resetForm();
            fetchContacts();
        } catch (error) {
            console.error('Error saving contact:', error);
            Alert.alert('Error', 'Failed to save contact');
        }
    };

    const handleDelete = async (professionalId) => {
        try {
            await axios.delete(
                `https://unbalkingly-uncharged-elizabet.ngrok-free.dev/professionals/delete?professionalId=${professionalId}`,
                {
                    headers: { Authorization: `Bearer ${authToken}` },
                }
            );
            fetchContacts();
        } catch (error) {
            console.error('Error deleting contact:', error);
            Alert.alert('Error', 'Failed to delete contact');
        }
    };

    const handleEdit = (contact) => {
        setEditingContact(contact);
        setContactForm({
            name: contact.name,
            role: contact.role.toLowerCase(),
            contact: contact.contact,
        });
        setShowForm(true);
    };

    const resetForm = () => {
        setContactForm({ name: '', role: '', contact: '' });
        setEditingContact(null);
        setShowForm(false);
    };

    const renderContactCard = (contact) => (
        <View style={styles.contactCard} key={contact.id}>
            <View style={styles.contactInfo}>
                <Text style={styles.contactName}>{contact.name}</Text>
                <View style={styles.typeTag}>
                    <Text style={styles.typeText}>{contact.role}</Text>
                </View>
                <Text style={styles.contactNumber}>{contact.contact}</Text>
            </View>
            <View style={styles.actionButtons}>
                <TouchableOpacity
                    style={styles.editButton}
                    onPress={() => handleEdit(contact)}
                >
                    <Ionicons name="create-outline" size={24} color="#4A90E2" />
                </TouchableOpacity>
                <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={() => handleDelete(contact.id)}
                >
                    <Ionicons name="trash-outline" size={24} color="#FF3B30" />
                </TouchableOpacity>
            </View>
        </View>
    );

    return (
        <View style={styles.container}>
            <TouchableOpacity
                style={styles.addButton}
                onPress={() => setShowForm(true)}
            >
                <Ionicons name="add-circle-outline" size={24} color="#4A90E2" />
                <Text style={styles.addButtonText}>Add Contact</Text>
            </TouchableOpacity>

            {showForm && (
                <View style={styles.form}>
                    <TextInput
                        style={styles.input}
                        placeholder="Contact Name"
                        value={contactForm.name}
                        onChangeText={(text) =>
                            setContactForm({ ...contactForm, name: text })
                        }
                    />
                    <View style={styles.typeButtons}>
                        {contactTypes.map((type) => (
                            <TouchableOpacity
                                key={type}
                                style={[
                                    styles.typeButton,
                                    contactForm.role === type.toLowerCase() && styles.selectedType,
                                ]}
                                onPress={() =>
                                    setContactForm({ ...contactForm, role: type.toLowerCase() })
                                }
                            >
                                <Text
                                    style={[
                                        styles.typeButtonText,
                                        contactForm.role === type.toLowerCase() && styles.selectedTypeText,
                                    ]}
                                >
                                    {type}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                    <TextInput
                        style={styles.input}
                        placeholder="Contact Number"
                        value={contactForm.contact}
                        onChangeText={(text) =>
                            setContactForm({ ...contactForm, contact: text })
                        }
                        keyboardType="phone-pad"
                    />
                    <View style={styles.formButtons}>
                        <TouchableOpacity
                            style={styles.submitButton}
                            onPress={handleSubmit}
                        >
                            <Text style={styles.submitButtonText}>
                                {editingContact ? 'Update' : 'Save'}
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.cancelButton}
                            onPress={resetForm}
                        >
                            <Text style={styles.cancelButtonText}>Cancel</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            )}

            <ScrollView style={styles.contactsList}>
                {loading ? (
                    <ActivityIndicator size="large" color="#4A90E2" />
                ) : contacts.length === 0 ? (
                    <Text style={styles.noContactsText}>No contacts added yet.</Text>
                ) : (
                    contacts.map(renderContactCard)
                )}
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 16,
    },
    addButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F0F4F8',
        padding: 12,
        borderRadius: 8,
        marginBottom: 16,
    },
    addButtonText: {
        marginLeft: 8,
        color: '#4A90E2',
        fontSize: 16,
        fontWeight: '600',
    },
    form: {
        backgroundColor: '#fff',
        padding: 16,
        borderRadius: 12,
        marginBottom: 16,
        elevation: 2,
    },
    input: {
        borderWidth: 1,
        borderColor: '#E5E7EB',
        borderRadius: 8,
        padding: 12,
        marginBottom: 12,
        fontSize: 16,
    },
    typeButtons: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 12,
    },
    typeButton: {
        flex: 1,
        padding: 8,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        marginHorizontal: 4,
        alignItems: 'center',
    },
    selectedType: {
        backgroundColor: '#4A90E2',
        borderColor: '#4A90E2',
    },
    typeButtonText: {
        color: '#4B5563',
        fontSize: 14,
    },
    selectedTypeText: {
        color: '#fff',
    },
    formButtons: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 8,
    },
    submitButton: {
        backgroundColor: '#4A90E2',
        padding: 12,
        borderRadius: 8,
        flex: 1,
        marginRight: 8,
    },
    submitButtonText: {
        color: '#fff',
        textAlign: 'center',
        fontSize: 16,
        fontWeight: '600',
    },
    cancelButton: {
        backgroundColor: '#EF4444',
        padding: 12,
        borderRadius: 8,
        flex: 1,
        marginLeft: 8,
    },
    cancelButtonText: {
        color: '#fff',
        textAlign: 'center',
        fontSize: 16,
        fontWeight: '600',
    },
    contactsList: {
        flex: 1,
    },
    contactCard: {
        backgroundColor: '#fff',
        padding: 16,
        borderRadius: 12,
        marginBottom: 12,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        elevation: 2,
    },
    contactInfo: {
        flex: 1,
    },
    contactName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1F2937',
        marginBottom: 4,
    },
    typeTag: {
        backgroundColor: '#E5E7EB',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
        alignSelf: 'flex-start',
        marginBottom: 4,
    },
    typeText: {
        color: '#4B5563',
        fontSize: 12,
        fontWeight: '500',
    },
    contactNumber: {
        color: '#6B7280',
        fontSize: 14,
    },
    deleteButton: {
        padding: 8,
    },
    editButton: {
        padding: 8,
    },
    actionButtons: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    noContactsText: {
        color: '#6B7280',
        fontSize: 16,
        textAlign: 'center',
        marginTop: 16,
    },
});

export default ContactsManager;