import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    TextInput,
    Alert,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    Switch
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import HistoricalDatePicker from './HistoricalDatePicker';
import { format } from 'date-fns';

const Sites = ({ storeId, authToken, onClose, setModalVisible, onSitesUpdated, clientType }) => {
    const [sites, setSites] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingSite, setEditingSite] = useState(null);
    const [showStartDatePicker, setShowStartDatePicker] = useState(false);
    const [showEndDatePicker, setShowEndDatePicker] = useState(false);
    const [siteForm, setSiteForm] = useState({
        siteName: '',
        city: '',
        startDate: new Date(),
        endDate: new Date(),
        status: 'active',
        totalArea: '',
        completedArea: '',
        siteAddress: '',
        isCompleted: false
    });

    useEffect(() => {
        fetchSites();
    }, []);

    const fetchSites = async () => {
        try {
            setLoading(true);
            const token = await AsyncStorage.getItem('userToken');
            
            if (!token) {
                console.error('Auth token not found');
                setSites([]);
                return [];
            }
            
            const response = await axios.get(
                `https://unbalkingly-uncharged-elizabet.ngrok-free.dev/site/getByStore?id=${storeId}`,
                {
                    headers: { 
                        Authorization: `Bearer ${token}`,
                        'ngrok-skip-browser-warning': 'true',
                        'User-Agent': 'IconMobile',
                    },
                }
            );
            
            // Check if response is HTML instead of JSON
            const isHtmlResponse = typeof response.data === 'string' && 
                (response.data.includes('<!DOCTYPE html>') || response.data.includes('<html>'));
            
            if (isHtmlResponse) {
                console.log('⚠️ [SITES] Server returned HTML instead of JSON');
                setSites([]);
                return [];
            }
            
            const sitesData = Array.isArray(response.data) ? response.data : [];
            setSites(sitesData);
            return sitesData;
        } catch (error) {
            console.error('Error fetching sites:', error);
            setSites([]);
            return [];
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async () => {
        try {
            const token = await AsyncStorage.getItem('userToken');
            
            if (!token) {
                Alert.alert('Error', 'Authentication token not found');
                return;
            }
            
            const siteData = {
                siteName: siteForm.siteName,
                startDate: format(siteForm.startDate, 'yyyy-MM-dd'),
                endDate: format(siteForm.endDate, 'yyyy-MM-dd'),
                status: siteForm.status,
                addressLine1: siteForm.siteAddress,
                addressLine2: '',
                requirement: parseFloat(siteForm.totalArea) || 0,
                completed: parseFloat(siteForm.completedArea) || 0,
                city: siteForm.city,
                storeId: storeId
            };

            const headers = {
                Authorization: `Bearer ${token}`,
                'ngrok-skip-browser-warning': 'true',
                'User-Agent': 'IconMobile',
            };

            if (editingSite) {
                await axios.put(
                    `https://unbalkingly-uncharged-elizabet.ngrok-free.dev/site/edit?id=${editingSite.id}`,
                    siteData,
                    { headers }
                );

                if (siteForm.isCompleted !== editingSite.completionStatus) {
                    await axios.put(
                        `https://unbalkingly-uncharged-elizabet.ngrok-free.dev/site/markCompletionStatus?id=${editingSite.id}&status=${siteForm.isCompleted}`,
                        {},
                        { headers }
                    );
                }
            } else {
                await axios.post(
                    'https://unbalkingly-uncharged-elizabet.ngrok-free.dev/site/add',
                    siteData,
                    { headers }
                );
            }

            const updatedSites = await fetchSites();
            
            setSites(updatedSites);
            
            resetForm();
            setShowForm(false);
            
            if (onSitesUpdated) {
                onSitesUpdated(updatedSites);
            }
        } catch (error) {
            console.error('Error submitting site:', error);
            Alert.alert('Error', 'Failed to submit site. Please try again.');
        }
    };

    const handleDelete = async (id) => {
        Alert.alert(
            "Confirm Delete",
            "Are you sure you want to delete this site?",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    onPress: async () => {
                        try {
                            const token = await AsyncStorage.getItem('userToken');
                            
                            if (!token) {
                                Alert.alert('Error', 'Authentication token not found');
                                return;
                            }
                            
                            const response = await axios.delete(
                                `https://unbalkingly-uncharged-elizabet.ngrok-free.dev/site/delete?id=${id}`,
                                {
                                    headers: { 
                                        Authorization: `Bearer ${token}`,
                                        'ngrok-skip-browser-warning': 'true',
                                        'User-Agent': 'IconMobile',
                                    },
                                }
                            );

                            if (response.data === "Deleted successfully!") {
                                const updatedSites = await fetchSites();
                                setSites(updatedSites);
                                
                                if (onSitesUpdated) {
                                    onSitesUpdated(updatedSites);
                                }
                            } else {
                                throw new Error('Unexpected response from server');
                            }
                        } catch (error) {
                            console.error('Error deleting site:', error);
                            Alert.alert('Error', 'Failed to delete site. Please try again.');
                        }
                    }
                }
            ]
        );
    };

    const resetForm = () => {
        setSiteForm({
            siteName: '',
            city: '',
            startDate: new Date(),
            endDate: new Date(),
            status: 'active',
            totalArea: '',
            completedArea: '',
            siteAddress: '',
            isCompleted: false
        });
        setEditingSite(null);
        setShowForm(false);
    };

    const handleEdit = (site) => {
        setEditingSite(site);
        setSiteForm({
            siteName: site.siteName || '',
            city: site.city || '',
            startDate: new Date(site.startDate),
            endDate: new Date(site.endDate),
            status: site.status || 'active',
            totalArea: site.requirement?.toString() || '',
            completedArea: site.completed?.toString() || '',
            siteAddress: site.addressLine1 || '',
            isCompleted: site.completionStatus || false
        });
        setShowForm(true);
    };

    const isSiteVisit = clientType?.toLowerCase() === 'site visit';
    const isProfessional = ['architect', 'engineer', 'builder'].includes(clientType?.toLowerCase());

    const getHeaderText = () => {
        if (isProfessional) {
            return 'Ongoing Projects';
        }
        return 'Existing Sites';
    };

    const getAddButtonText = () => {
        if (isProfessional) {
            return 'Add New Project';
        }
        return isSiteVisit ? 'Add Site Details' : 'Add New Site';
    };

    const canAddSite = !isSiteVisit || (isSiteVisit && sites.length === 0);

    const renderForm = () => (
        <View style={styles.formContainer}>
            <ScrollView style={styles.formScrollView}>
                {/* Status Section */}
                <View style={styles.formSection}>
                    <View style={styles.completionToggle}>
                        <Text style={styles.toggleLabel}>Mark as Completed</Text>
                        <Switch
                            value={siteForm.isCompleted}
                            onValueChange={(value) =>
                                setSiteForm(prev => ({ ...prev, isCompleted: value }))}
                            trackColor={{ false: "#E5E7EB", true: "#93C5FD" }}
                            thumbColor={siteForm.isCompleted ? "#3B82F6" : "#fff"}
                        />
                    </View>
                </View>

                {/* Basic Information */}
                <View style={styles.formSection}>
                    <Text style={styles.sectionTitle}>Basic Information</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="Site Name"
                        value={siteForm.siteName}
                        onChangeText={(text) =>
                            setSiteForm(prev => ({ ...prev, siteName: text }))}
                        placeholderTextColor="#9CA3AF"
                    />
                    <TextInput
                        style={[styles.input, styles.multilineInput]}
                        placeholder="Site Address"
                        value={siteForm.siteAddress}
                        onChangeText={(text) =>
                            setSiteForm(prev => ({ ...prev, siteAddress: text }))}
                        multiline
                        numberOfLines={3}
                        placeholderTextColor="#9CA3AF"
                    />
                    <TextInput
                        style={styles.input}
                        placeholder="City"
                        value={siteForm.city}
                        onChangeText={(text) =>
                            setSiteForm(prev => ({ ...prev, city: text }))}
                        placeholderTextColor="#9CA3AF"
                    />
                </View>

                {/* Area Information */}
                <View style={styles.formSection}>
                    <Text style={styles.sectionTitle}>Area Details</Text>
                    <View style={styles.areaInputContainer}>
                        {!siteForm.isCompleted && (
                            <View style={styles.inputWrapper}>
                                <Text style={styles.inputLabel}>Total Area (sq ft)</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="0"
                                    value={siteForm.totalArea}
                                    onChangeText={(text) =>
                                        setSiteForm(prev => ({ ...prev, totalArea: text }))}
                                    keyboardType="numeric"
                                    placeholderTextColor="#9CA3AF"
                                />
                            </View>
                        )}
                        <View style={[styles.inputWrapper, siteForm.isCompleted && styles.fullWidth]}>
                            <Text style={styles.inputLabel}>Completed Area (sq ft)</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="0"
                                value={siteForm.completedArea}
                                onChangeText={(text) =>
                                    setSiteForm(prev => ({ ...prev, completedArea: text }))}
                                keyboardType="numeric"
                                placeholderTextColor="#9CA3AF"
                            />
                        </View>
                    </View>
                </View>

                {/* Timeline */}
                <View style={styles.formSection}>
                    <Text style={styles.sectionTitle}>Timeline</Text>
                    <View style={styles.dateContainer}>
                        <TouchableOpacity
                            style={styles.dateButton}
                            onPress={() => setShowStartDatePicker(true)}
                        >
                            <Ionicons name="calendar-outline" size={20} color="#3B82F6" />
                            <Text style={styles.dateButtonText}>
                                Start: {format(siteForm.startDate, 'MMM dd, yyyy')}
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.dateButton}
                            onPress={() => setShowEndDatePicker(true)}
                        >
                            <Ionicons name="calendar-outline" size={20} color="#3B82F6" />
                            <Text style={styles.dateButtonText}>
                                End: {format(siteForm.endDate, 'MMM dd, yyyy')}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </ScrollView>

            {/* Action Buttons */}
            <View style={styles.formActions}>
                <TouchableOpacity 
                    style={styles.cancelButton} 
                    onPress={resetForm}
                >
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                    style={styles.submitButton} 
                    onPress={handleSubmit}
                >
                    <Text style={styles.submitButtonText}>
                        {editingSite ? 'Update' : 'Add'} Site
                    </Text>
                </TouchableOpacity>
            </View>
        </View>
    );

    const renderSiteCard = (site) => {
        return (
            <View style={styles.siteCard}>
                {/* Header with Title and Actions */}
                <View style={styles.cardHeader}>
                    <Text style={styles.siteName}>{site.siteName}</Text>
                    <View style={styles.actionButtons}>
                        <View style={styles.statusBadge}>
                            <Text style={styles.statusText}>
                                {site.status === 'active' ? 'active' : 'inactive'}
                            </Text>
                        </View>
                        <TouchableOpacity onPress={() => handleEdit(site)}>
                            <Ionicons name="create-outline" size={20} color="#666" />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => handleDelete(site.id)}>
                            <Ionicons name="trash-outline" size={20} color="#666" />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Location */}
                <View style={styles.locationRow}>
                    <Ionicons name="location-outline" size={16} color="#666" />
                    <Text style={styles.locationText}>
                        {site.addressLine1}, {site.city}
                    </Text>
                </View>

                {/* Date Range */}
                <View style={styles.dateRow}>
                    <Ionicons name="calendar-outline" size={16} color="#666" />
                    <Text style={styles.dateText}>
                        {format(new Date(site.startDate), 'd MMM')} - {format(new Date(site.endDate), 'd MMM yyyy')}
                    </Text>
                </View>

                {/* Status and Progress */}
                <View style={styles.progressSection}>
                    <Text style={styles.progressStatus}>
                        {site.completionStatus ? 'Completed' : 'Ongoing'}
                    </Text>
                    <Text style={styles.progressText}>
                        Completed: {site.completed || 0} / {site.requirement || 0} sq.ft
                    </Text>
                </View>

                {/* Brands Section if needed */}
                {site.brands && site.brands.length > 0 && (
                    <View style={styles.brandsSection}>
                        <Text style={styles.brandsLabel}>Brands:</Text>
                        <View style={styles.brandTags}>
                            {site.brands.map((brand, index) => (
                                <View key={index} style={styles.brandTag}>
                                    <Text style={styles.brandTagText}>{brand}</Text>
                                </View>
                            ))}
                        </View>
                    </View>
                )}
            </View>
        );
    };

    return (
        <View style={styles.container}>
            {!showForm ? (
                // Show add button and site list when form is not visible
                <>
                    {canAddSite && (
                        <TouchableOpacity
                            style={styles.addButton}
                            onPress={() => setShowForm(true)}
                        >
                            <Ionicons name="add-circle-outline" size={24} color="#FFFFFF" />
                            <Text style={styles.addButtonText}>
                                {getAddButtonText()}
                            </Text>
                        </TouchableOpacity>
                    )}
                    <View style={styles.siteList}>
                        <Text style={styles.siteListTitle}>{getHeaderText()}</Text>
                        {loading ? (
                            <ActivityIndicator size="large" color="#4A90E2" />
                        ) : sites.length === 0 ? (
                            <Text style={styles.noSitesText}>
                                {isProfessional ? 'No projects added yet.' : 'No sites added yet.'}
                            </Text>
                        ) : (
                            sites.map((site, index) => (
                                <View key={site.id || index}>
                                    {renderSiteCard(site)}
                                </View>
                            ))
                        )}
                    </View>
                </>
            ) : (
                // Show only the form when it's visible
                renderForm()
            )}
            
            <HistoricalDatePicker
                isVisible={showStartDatePicker}
                onClose={() => setShowStartDatePicker(false)}
                onSelect={(date) => {
                    setSiteForm({ ...siteForm, startDate: date });
                    setShowStartDatePicker(false);
                }}
                initialDate={siteForm.startDate}
            />
            <HistoricalDatePicker
                isVisible={showEndDatePicker}
                onClose={() => setShowEndDatePicker(false)}
                onSelect={(date) => {
                    setSiteForm({ ...siteForm, endDate: date });
                    setShowEndDatePicker(false);
                }}
                initialDate={siteForm.endDate}
            />
        </View>
    );

};


const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F7F9FC',
        paddingTop: 8,
    },
    scrollView: {
        flex: 1,
    },
    scrollViewContent: {
        paddingBottom: 30,
    },
    addButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#4A90E2',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 8,
        marginHorizontal: 12,
        marginBottom: 16,
        shadowColor: "#4A90E2",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 2,
        elevation: 3,
    },
    addButtonText: {
        color: '#FFFFFF',
        fontSize: 18,
        fontWeight: 'bold',
        marginLeft: 10,
    },
    form: {
        backgroundColor: '#FFFFFF',
        padding: 20,
        marginHorizontal: 20,
        marginBottom: 20,
        borderRadius: 15,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 5,
    },
    input: {
        borderWidth: 1,
        borderColor: '#E0E0E0',
        borderRadius: 8,
        padding: 12,
        marginBottom: 15,
        fontSize: 16,
        backgroundColor: '#F7F9FC',
    },
    formButtonContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 20,
    },
    saveButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#4CAF50',
        padding: 12,
        borderRadius: 8,
        flex: 1,
        marginRight: 10,
    },
    saveButtonText: {
        color: '#FFFFFF',
        fontSize: 18,
        fontWeight: 'bold',
        marginLeft: 10,
    },
    cancelButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#FF3B30',
        padding: 12,
        borderRadius: 8,
        flex: 1,
        marginLeft: 10,
    },
    cancelButtonText: {
        color: '#FFFFFF',
        fontSize: 18,
        fontWeight: 'bold',
        marginLeft: 10,
    },
    siteList: {
        marginHorizontal: 8,
    },
    siteListTitle: {
        fontSize: 20,
        fontWeight: '600',
        marginBottom: 16,
        color: '#1F2937',
        paddingHorizontal: 8,
    },
    noSitesText: {
        textAlign: 'center',
        color: '#6B7280',
        fontSize: 15,
        paddingVertical: 20,
    },
    siteItem: {
        backgroundColor: '#F7F9FC',
        borderRadius: 10,
        padding: 15,
        marginBottom: 15,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 3,
    },
    siteHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    siteName: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#4A4A4A',
    },
    statusIndicator: {
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 12,
    },
    activeIndicator: {
        backgroundColor: '#E8F5E9',
    },
    inactiveIndicator: {
        backgroundColor: '#FFEBEE',
    },
    statusText: {
        fontWeight: 'bold',
        fontSize: 12,
    },
    siteInfo: {
        marginBottom: 10,
    },
    siteDetailRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 5,
    },
    siteDetailLabel: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#4A4A4A',
        marginLeft: 5,
        marginRight: 5,
    },
    siteDetailValue: {
        fontSize: 14,
        color: '#666',
    },
    editIcon: {
        position: 'absolute',
        bottom: 10,
        right: 10,
    },
    dateButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F0F4F8',
        padding: 12,
        borderRadius: 8,
        marginBottom: 15,
    },
    dateIcon: {
        marginRight: 10,
    },
    dateButtonText: {
        color: '#4A4A4A',
        fontSize: 16,
    },
    statusContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
    },
    statusLabel: {
        fontSize: 16,
        marginRight: 10,
    },
    statusButton: {
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 20,
        borderWidth: 1,
        marginHorizontal: 5,
    },
    activeStatus: {
        backgroundColor: '#4CAF50',
        borderColor: '#4CAF50',
    },
    inactiveStatus: {
        backgroundColor: '#F44336',
        borderColor: '#F44336',
    },
    activeStatusText: {
        color: '#FFFFFF',
        fontWeight: 'bold',
    },
    inactiveStatusText: {
        color: '#4A4A4A',
    },
    multilineInput: {
        height: 100,
        textAlignVertical: 'top',
        paddingTop: 12,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: 'bold',
    },
    brandsSection: {
        marginBottom: 20,
    },
    brandRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 5,
    },
    brandInput: {
        flex: 1,
        marginRight: 5,
    },
    addBrandButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F0F4F8',
        padding: 12,
        borderRadius: 8,
        marginBottom: 10,
    },
    addBrandText: {
        color: '#4A90E2',
        fontSize: 16,
        fontWeight: 'bold',
        marginLeft: 10,
    },
    removeBrandButton: {
        padding: 5,
        borderRadius: 5,
        backgroundColor: '#FF3B30',
    },
    contactSection: {
        marginBottom: 20,
    },
    togglesContainer: {
        marginVertical: 15,
    },
    completionContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 15,
        paddingHorizontal: 10,
    },
    siteCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        marginHorizontal: 0,
        elevation: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    siteName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1F2937',
        flex: 1,
    },
    actionButtons: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    statusBadge: {
        backgroundColor: '#F3F4F6',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 12,
        marginRight: 4,
    },
    statusText: {
        fontSize: 12,
        color: '#4B5563',
        textTransform: 'capitalize',
    },
    locationRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 6,
    },
    locationText: {
        fontSize: 13,
        color: '#6B7280',
        flex: 1,
    },
    dateRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 8,
    },
    dateText: {
        fontSize: 13,
        color: '#6B7280',
    },
    progressSection: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 4,
    },
    progressStatus: {
        fontSize: 13,
        fontWeight: '500',
        color: '#4A90E2',
    },
    progressText: {
        fontSize: 13,
        color: '#6B7280',
    },
    brandsSection: {
        marginTop: 8,
    },
    brandsLabel: {
        fontSize: 14,
        color: '#666',
        marginBottom: 4,
    },
    brandTags: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    brandTag: {
        backgroundColor: '#F3F4F6',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 16,
    },
    brandTagText: {
        fontSize: 12,
        color: '#4B5563',
    },
    dateContainer: {
        marginTop: 8,
    },
    formContainer: {
        flex: 1,
        backgroundColor: '#F9FAFB',
    },
    formScrollView: {
        padding: 16,
    },
    formSection: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#111827',
        marginBottom: 12,
    },
    completionToggle: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    toggleLabel: {
        fontSize: 16,
        fontWeight: '500',
        color: '#374151',
    },
    input: {
        backgroundColor: '#F9FAFB',
        borderWidth: 1,
        borderColor: '#E5E7EB',
        borderRadius: 8,
        padding: 12,
        fontSize: 15,
        color: '#111827',
        marginBottom: 12,
    },
    multilineInput: {
        height: 80,
        textAlignVertical: 'top',
    },
    inputLabel: {
        fontSize: 14,
        fontWeight: '500',
        color: '#374151',
        marginBottom: 4,
    },
    areaInputContainer: {
        flexDirection: 'row',
        gap: 12,
    },
    inputWrapper: {
        flex: 1,
    },
    fullWidth: {
        width: '100%',
    },
    dateContainer: {
        gap: 12,
    },
    dateButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F9FAFB',
        borderWidth: 1,
        borderColor: '#E5E7EB',
        borderRadius: 8,
        padding: 12,
        gap: 8,
    },
    dateButtonText: {
        fontSize: 15,
        color: '#374151',
    },
    formActions: {
        flexDirection: 'row',
        padding: 16,
        backgroundColor: '#FFFFFF',
        borderTopWidth: 1,
        borderTopColor: '#E5E7EB',
        gap: 12,
    },
    submitButton: {
        flex: 1,
        backgroundColor: '#3B82F6',
        padding: 12,
        borderRadius: 8,
        alignItems: 'center',
    },
    submitButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
    },
    cancelButton: {
        flex: 1,
        backgroundColor: '#EF4444',
        padding: 12,
        borderRadius: 8,
        alignItems: 'center',
    },
    cancelButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
    },
    actionButtonsContainer: {
        padding: 16,
        paddingHorizontal: 0,
        backgroundColor: '#fff',
        borderRadius: 12,
        margin: 16,
        marginHorizontal: 0,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    sitesContainer: {
        paddingHorizontal: 0,
        backgroundColor: '#fff',
    },
    siteCard: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        marginHorizontal: 0,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
});

export default Sites;