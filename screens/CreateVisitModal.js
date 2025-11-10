import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { format } from 'date-fns';
import React, { useState } from 'react';
import {
    FlatList,
    KeyboardAvoidingView,
    Modal,
    Platform, ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import DatePicker from './DatePicker';

const CreateVisitModal = ({ isVisible, onClose, onCreateVisit, authToken }) => {
    const [isCreateStoreModalVisible, setIsCreateStoreModalVisible] = useState(false);
    const [isPickerVisible, setPickerVisible] = useState(false);
    const [selectedStore, setSelectedStore] = useState(null);
    const [storeSearchText, setStoreSearchText] = useState('');
    const [stores, setStores] = useState([]);

    const [newVisitDetails, setNewVisitDetails] = useState({
        date: new Date(),
        purpose: '',
    });

    const [newStoreDetails, setNewStoreDetails] = useState({
        storeName: '',
        clientFirstName: '',
        clientLastName: '',
        primaryContact: '',
        city: '',
        state: '',
        village: '',
        taluka: '',
    });

    const purposeOptions = [
        { label: 'First Visit', value: 'First Visit' },
        { label: 'Follow Up', value: 'Follow Up' },
        { label: 'Order', value: 'Order' },
        { label: 'Monthly Visit', value: 'Monthly Visit' },
        { label: 'Special Meet', value: 'Special Meet' },
        { label: 'Sales', value: 'Sales' },
        { label: 'Special Enquiry', value: 'Special Enquiry' },
        { label: 'Payment', value: 'Payment' },
        { label: 'Others', value: 'Others' },
    ];

    const handleSelectDate = (date) => {
        setNewVisitDetails({ ...newVisitDetails, date });
        setPickerVisible(false);
    };

    const openCreateStoreModal = () => {
        setIsCreateStoreModalVisible(true);
    };

    const closeCreateStoreModal = () => {
        setIsCreateStoreModalVisible(false);
        setNewStoreDetails({
            storeName: '',
            clientFirstName: '',
            clientLastName: '',
            primaryContact: '',
            city: '',
            state: '',
            village: '',
            taluka: '',
        });
    };

    const handleCreateStore = async () => {
        try {
            const employeeId = await AsyncStorage.getItem('employeeId');
            const response = await axios.post('https://unbalkingly-uncharged-elizabet.ngrok-free.dev/store/create', {
                ...newStoreDetails,
                employeeId: employeeId,
            });

            const storeId = response.data;
            setSelectedStore({ storeId, storeName: newStoreDetails.storeName });
            closeCreateStoreModal();
        } catch (error) {
            console.error('Error creating store:', error);
        }
    };

    const handleStoreSearch = (text) => {
        setStoreSearchText(text);
    };

    const filteredStores = stores.filter((store) =>
        store.storeName.toLowerCase().includes(storeSearchText.toLowerCase())
    );

    const handleStoreSelect = (store) => {
        setSelectedStore(store);
        setStoreSearchText(store.storeName);
    };

    return (
        <Modal
            visible={isVisible}
            animationType="slide"
            onRequestClose={onClose}
            transparent={true}
        >
            <View style={styles.modalBackground}>
                <View style={styles.modalContainer}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>Create Visit</Text>
                        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                            <Ionicons name="close" size={24} color="#000" />
                        </TouchableOpacity>
                    </View>

                    {!selectedStore ? (
                        <View style={styles.storeSection}>
                            <Text style={styles.sectionTitle}>Select Store</Text>
                            <View style={styles.searchInputContainer}>
                                <Ionicons name="search" size={20} color="#999" style={styles.searchIcon} />
                                <TextInput
                                    style={styles.searchInput}
                                    placeholder="Search Store"
                                    value={storeSearchText}
                                    onChangeText={handleStoreSearch}
                                    placeholderTextColor="#999"
                                />
                            </View>
                            <FlatList
                                data={filteredStores.slice(0, 5)}
                                renderItem={({ item }) => (
                                    <TouchableOpacity
                                        style={styles.storeItem}
                                        onPress={() => handleStoreSelect(item)}
                                    >
                                        <Text style={styles.storeName}>{item.storeName}</Text>
                                    </TouchableOpacity>
                                )}
                                keyExtractor={(item) => item.storeId.toString()}
                            />
                            {/* <TouchableOpacity
                                style={styles.addStoreButton}
                                onPress={openCreateStoreModal}
                            >
                                <Text style={styles.addStoreButtonText}>Add New Store</Text>
                            </TouchableOpacity> */}
                        </View>
                    ) : (
                        <ScrollView contentContainerStyle={styles.scrollContent}>
                            <View style={styles.visitDetailsSection}>
                                <Text style={styles.sectionTitle}>Store</Text>
                                <Text style={styles.selectedStoreName}>{selectedStore.storeName}</Text>

                                <Text style={styles.sectionTitle}>Visit Date</Text>
                                <TouchableOpacity
                                    style={styles.dateButton}
                                    onPress={() => setPickerVisible(true)}
                                >
                                    <Text style={styles.dateButtonText}>
                                        {format(newVisitDetails.date, 'MMMM d, yyyy')}
                                    </Text>
                                </TouchableOpacity>

                                <Text style={styles.sectionTitle}>Purpose</Text>
                                <View style={styles.purposeOptions}>
                                    {purposeOptions.map((option) => (
                                        <TouchableOpacity
                                            key={option.value}
                                            style={[
                                                styles.purposeOption,
                                                newVisitDetails.purpose === option.value && styles.selectedPurposeOption,
                                            ]}
                                            onPress={() => setNewVisitDetails({ ...newVisitDetails, purpose: option.value })}
                                        >
                                            <Text style={[
                                                styles.purposeOptionText,
                                                newVisitDetails.purpose === option.value && styles.selectedPurposeOptionText,
                                            ]}>
                                                {option.label}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                                {newVisitDetails.purpose === 'Others' && (
                                    <>
                                        <Text style={styles.sectionTitle}>Custom Purpose</Text>
                                        <TextInput
                                            style={styles.customPurposeInput}
                                            placeholder="Enter custom purpose"
                                            value={newVisitDetails.customPurpose}
                                            onChangeText={(text) => setNewVisitDetails({ ...newVisitDetails, customPurpose: text })}
                                            placeholderTextColor="#999"
                                        />
                                    </>
                                )}
                                <TouchableOpacity style={styles.createButton} onPress={onCreateVisit}>
                                    <Text style={styles.createButtonText}>Create Visit</Text>
                                </TouchableOpacity>
                            </View>
                        </ScrollView>
                    )}
                </View>
            </View>

            <DatePicker
                isVisible={isPickerVisible}
                onClose={() => setPickerVisible(false)}
                onSelect={handleSelectDate}
            />

            <Modal
                visible={isCreateStoreModalVisible}
                animationType="slide"
                onRequestClose={closeCreateStoreModal}
            >
                <KeyboardAvoidingView
                    behavior={Platform.OS === "ios" ? "padding" : "height"}
                    style={{ flex: 1 }}
                    keyboardVerticalOffset={Platform.OS === "ios" ? 60 : 0}
                >
                    <ScrollView>
                        <View style={styles.modalContainer}>
                            <View style={styles.modalHeader}>
                                <TouchableOpacity style={styles.backButton} onPress={closeCreateStoreModal}>
                                    <Ionicons name="arrow-back" size={24} color="#000" />
                                </TouchableOpacity>
                                <Text style={styles.modalTitle}>Create New Store</Text>
                            </View>

                            <View style={styles.inputContainer}>
                                <Text style={styles.label}>Store Name</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="Name of your store"
                                    value={newStoreDetails.storeName}
                                    onChangeText={(text) => setNewStoreDetails({ ...newStoreDetails, storeName: text })}
                                />
                            </View>

                            <View style={styles.inputContainer}>
                                <Text style={styles.label}>Client First Name</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="First name of the client"
                                    value={newStoreDetails.clientFirstName}
                                    onChangeText={(text) => setNewStoreDetails({ ...newStoreDetails, clientFirstName: text })}
                                />
                            </View>

                            <View style={styles.inputContainer}>
                                <Text style={styles.label}>Client Last Name</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="Last name of the client"
                                    value={newStoreDetails.clientLastName}
                                    onChangeText={(text) => setNewStoreDetails({ ...newStoreDetails, clientLastName: text })}
                                />
                            </View>

                            <View style={styles.inputContainer}>
                                <Text style={styles.label}>Primary Contact</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="Primary phone number"
                                    value={newStoreDetails.primaryContact}
                                    onChangeText={(text) => setNewStoreDetails({ ...newStoreDetails, primaryContact: text })}
                                    keyboardType="phone-pad"
                                />
                            </View>
                            <View style={styles.inputContainer}>
                                <Text style={styles.label}>City</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="City"
                                    value={newStoreDetails.city}
                                    onChangeText={(text) => setNewStoreDetails({ ...newStoreDetails, city: text })}
                                />
                            </View>
                            <View style={styles.inputContainer}>
                                <Text style={styles.label}>Village</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="Village"
                                    value={newStoreDetails.village}
                                    onChangeText={(text) => setNewStoreDetails({ ...newStoreDetails, village: text })}
                                />
                            </View>
                            <View style={styles.inputContainer}>
                                <Text style={styles.label}>Taluka</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="Taluka"
                                    value={newStoreDetails.taluka}
                                    onChangeText={(text) => setNewStoreDetails({ ...newStoreDetails, taluka: text })}
                                />
                            </View>
                            <View style={styles.inputContainer}>
                                <Text style={styles.label}>State</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="State"
                                    value={newStoreDetails.state}
                                    onChangeText={(text) => setNewStoreDetails({ ...newStoreDetails, state: text })}
                                />
                            </View>

                            <TouchableOpacity
                                style={styles.createButton}
                                onPress={handleCreateStore}
                            >
                                <Text style={styles.createButtonText}>Create Store</Text>
                            </TouchableOpacity>
                        </View>
                    </ScrollView>
                </KeyboardAvoidingView>
            </Modal>
        </Modal>
    );
};

const styles = StyleSheet.create({
    modalBackground: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
    },
    modalContainer: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        padding: 20,
        maxHeight: '80%',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
    },
    closeButton: {
        padding: 5,
    },
    storeSection: {
        marginBottom: 20,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 10,
    },
    searchInputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F3E5F5',
        borderRadius: 10,
        paddingHorizontal: 10,
        marginBottom: 10,
    },
    searchIcon: {
        marginRight: 10,
    },
    searchInput: {
        flex: 1,
        fontSize: 16,
        color: '#333',
    },
    storeItem: {
        paddingVertical: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#ccc',
    },
    storeName: {
        fontSize: 16,
    },
    addStoreButton: {
        backgroundColor: '#007AFF',
        paddingVertical: 10,
        borderRadius: 5,
        alignItems: 'center',
        marginTop: 10,
    },
    addStoreButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    visitDetailsSection: {
        marginBottom: 20,
    },
    selectedStoreName: {
        fontSize: 16,
        marginBottom: 20,
    },
    purposeInput: {
        height: 100,
        borderColor: '#ccc',
        borderWidth: 1,
        borderRadius: 5,
        paddingHorizontal: 10,
        paddingTop: 10,
        marginBottom: 20,
        textAlignVertical: 'top',
    },
    purposeOptions: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        marginBottom: 20,
    },
    purposeOption: {
        backgroundColor: '#F3E5F5',
        paddingVertical: 10,
        paddingHorizontal: 15,
        borderRadius: 10,
        marginBottom: 10,
        width: '48%',
    },
    selectedPurposeOption: {
        backgroundColor: '#4F46E5',
    },
    purposeOptionText: {
        fontSize: 14,
        color: '#333',
        textAlign: 'center',
    },
    selectedPurposeOptionText: {
        color: '#fff',
        fontWeight: 'bold',
    },
    customPurposeInput: {
        backgroundColor: '#F3E5F5',
        borderRadius: 10,
        paddingHorizontal: 15,
        paddingVertical: 10,
        fontSize: 16,
        color: '#333',
        marginBottom: 20,
    },
    createButton: {
        backgroundColor: '#4F46E5',
        paddingVertical: 15,
        borderRadius: 10,
        alignItems: 'center',
    },
    createButtonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
    },
    inputContainer: {
        marginBottom: 20,
    },
    label: {
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 8,
        color: '#4B5563',
    },
    input: {
        height: 40,
        borderWidth: 1,
        borderColor: '#D1D5DB',
        borderRadius: 4,
        paddingHorizontal: 10,
        fontSize: 16,
        color: '#1F2937',
    },
    scrollContent: {
        flexGrow: 1,
        paddingBottom: 20,
    },
    backButton: {
        marginRight: 10,
    },
    dateButton: {
        backgroundColor: '#F3E5F5',
        paddingVertical: 15,
        borderRadius: 10,
        alignItems: 'center',
        marginBottom: 20,
    },
    dateButtonText: {
        fontSize: 16,
        color: '#333',
    },
});

export default CreateVisitModal;