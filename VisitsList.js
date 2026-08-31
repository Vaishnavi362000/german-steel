import { API_BASE_URL } from './config/api';
import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    TextInput,
    Modal,
    FlatList,
    Platform,
    ScrollView,
    KeyboardAvoidingView,
    Alert,
    Linking,
    ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import axios from 'axios';
import DatePicker from './DatePicker';
import { format, addDays, subDays, startOfWeek, endOfWeek, isSameDay } from 'date-fns';
import CalendarStrip from 'react-native-calendar-strip';
import { addWeeks, subWeeks } from 'date-fns';
import CustomDatePicker from './CustomDatePicker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import moment from 'moment';
import debounce from 'lodash.debounce';
import { fetchEmployeeVisitsPage } from './utils/optimizedVisitApi';
import { CLIENT_TYPE_OPTIONS } from './clientTypeOptions';
import { applyMissingLocationDefaults, fetchEmployeeStoreLocationDefaults } from './utils/storeLocationPrefill';

const VisitsList = ({ authToken }) => {
    const [visits, setVisits] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [isCreateStoreModalVisible, setIsCreateStoreModalVisible] = useState(false);
    const [isPickerVisible, setPickerVisible] = useState(false);
    const [selectedDate, setSelectedDate] = useState(() => {
        const now = new Date();
        now.setHours(0, 0, 0, 0);
        return now;
    });
    const navigation = useNavigation();
    const [isConfirmationVisible, setConfirmationVisible] = useState(false);
    const [existingVisit, setExistingVisit] = useState(null);
    const [existingVisits, setExistingVisits] = useState([]);
    const [isOngoingVisitVisible, setIsOngoingVisitVisible] = useState(false);
    const [ongoingVisit, setOngoingVisit] = useState(null);

    const [newVisitDetails, setNewVisitDetails] = useState({
        date: new Date(),
        purpose: '',
        customPurpose: '',
    });

    const [currentPage, setCurrentPage] = useState(0);
    const [totalPages, setTotalPages] = useState(0);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const pageSize = 10;

    const [newStoreDetails, setNewStoreDetails] = useState({
        storeName: '',
        clientFirstName: '',
        clientLastName: '',
        primaryContact: '',
        city: '',
        state: '',
        village: '',
        taluka: '',
        yearOfJoining: '',
    });

    const [filters, setFilters] = useState({
        customerName: '',
        purpose: '',
    });

    const [stores, setStores] = useState([]);
    const [selectedStore, setSelectedStore] = useState(null);
    const [storeSearchText, setStoreSearchText] = useState('');
    const [confirmationMessage, setConfirmationMessage] = useState('');
    const [isStoreLoading, setIsStoreLoading] = useState(false);
    const [isCreatingVisit, setIsCreatingVisit] = useState(false);
    const [customerTypeFilter, setCustomerTypeFilter] = useState('all');

    const purposeOptions = [
        { label: 'First Visit', value: 'First Visit' },
        { label: 'Follow Up', value: 'Follow Up' },
        { label: 'Order', value: 'Order' },
        { label: 'Monthly Visit', value: 'Monthly Visit' },
        { label: 'Special Meet', value: 'Special Meet' },
        { label: 'Sales', value: 'Sales' },
        { label: 'Special Enquiry', value: 'Special Enquiry' },
        { label: 'Payment', value: 'Payment' },
        { label: 'Gifting', value: 'Gifting' },
        { label: 'Others', value: 'Others' },
    ];

    const fetchVisits = async ({ page = 0, append = false } = {}) => {
        if (!authToken) return;
        
        try {
            if (append) {
                setIsLoadingMore(true);
            } else {
                setLoading(true);
                setError(null);
            }
            const formattedDate = format(selectedDate, 'yyyy-MM-dd');
            const employeeId = await AsyncStorage.getItem('employeeId');
            
            if (!employeeId) {
                throw new Error('Employee ID not found');
            }

            const result = await fetchEmployeeVisitsPage({
                employeeId,
                start: formattedDate,
                end: formattedDate,
                page,
                size: page === 0 ? 20 : 20,
                sort: 'id,desc',
                authToken,
            });
            const visitPage = result.page || {};
            const updatedVisits = (Array.isArray(visitPage.content) ? visitPage.content : []).map((visit) => {
                let visitStatus = 'Assigned';
                if (visit.checkinLatitude && visit.checkinLongitude && visit.checkinDate && visit.checkinTime) {
                    visitStatus = 'Ongoing';
                }
                if (visit.checkoutLatitude && visit.checkoutLongitude && visit.checkoutDate && visit.checkoutTime) {
                    visitStatus = 'Completed';
                }
                return { ...visit, status: visitStatus };
            });
            setVisits((previousVisits) => {
                const combined = append ? [...previousVisits, ...updatedVisits] : updatedVisits;
                return combined.filter((visit, index, all) => (
                    all.findIndex((candidate) => candidate?.id === visit?.id) === index
                ));
            });
            setCurrentPage(Number.isInteger(visitPage.number) ? visitPage.number : page);
            setTotalPages(Math.max(Number(visitPage.totalPages || 1), 1));
        } catch (error) {
            console.error('Error fetching visits:', error);
            if (!append) {
                setError(error.message);
                setVisits([]);
                setTotalPages(0);
            }
        } finally {
            if (append) {
                setIsLoadingMore(false);
            } else {
                setLoading(false);
            }
        }
    };

    useFocusEffect(
        useCallback(() => {
            if (authToken) {
                fetchVisits();
            }
            return () => {
                // Optional cleanup if needed
            };
        }, [selectedDate, authToken])
    );

    const handleDateChange = (date) => {
        const newDate = new Date(date);
        newDate.setHours(0, 0, 0, 0);
        setSelectedDate(newDate);
    };

    const handleSearch = (query) => {
        setSearchQuery(query);
    };

    const handleLoadMore = () => {
        if (!loading && !isLoadingMore && currentPage < totalPages - 1) {
            fetchVisits({ page: currentPage + 1, append: true });
        }
    };

    const handleFilterChange = (name, value) => {
        setFilters((prevFilters) => ({
            ...prevFilters,
            [name]: value,
        }));
    };

    const filteredVisits = visits
        ? visits
            .filter((visit) => {
                const { storeName, purpose } = visit;
                return (
                    (storeName || '').toLowerCase().includes(filters.customerName.toLowerCase()) &&
                    (purpose ? purpose.toLowerCase().includes(filters.purpose.toLowerCase()) : true)
                );
            })
            .sort((a, b) => {
                const statusOrder = { Ongoing: 0, Assigned: 1, Completed: 2 };
                return statusOrder[a.status] - statusOrder[b.status];
            })
        : [];

    const openModal = () => {
        setIsModalVisible(true);
    };

    const closeModal = () => {
        setIsModalVisible(false);
        setNewVisitDetails({
            date: new Date(),
            purpose: '',
            customPurpose: ''
        });
        setSelectedStore(null);
        setStores([]);
        setStoreSearchText('');
        setCustomerTypeFilter('all');
    };

    const openCreateStoreModal = async () => {
        setIsCreateStoreModalVisible(true);
        try {
            const employeeId = await AsyncStorage.getItem('employeeId');
            const defaults = await fetchEmployeeStoreLocationDefaults({ employeeId, authToken });
            setNewStoreDetails((current) => applyMissingLocationDefaults(current, defaults));
        } catch (error) {
            console.log('Inline store location prefill unavailable:', error?.message || error);
        }
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
            yearOfJoining: '',
        });
    };

    const createVisit = async () => {
        if (!newVisitDetails.purpose || newVisitDetails.purpose.trim() === '') {
            Alert.alert('Error', 'Please select a purpose for the visit');
            return;
        }

        if (!selectedStore) {
            Alert.alert('Error', 'Please select a store');
            return;
        }

        // Prevent multiple submissions
        if (isCreatingVisit) {
            return;
        }

        setIsCreatingVisit(true);
        try {
            const employeeId = await AsyncStorage.getItem('employeeId');
            const formattedDate = format(newVisitDetails.date, 'yyyy-MM-dd');
            const response = await fetch(
                `${API_BASE_URL}/visit/getByDateRangeAndEmployee?id=${employeeId}&start=${formattedDate}&end=${formattedDate}`,
                {
                    headers: {
                        Authorization: `Bearer ${authToken}`,
                    },
                }
            );

            if (response.ok) {
                const visits = await response.json();
                const existingVisitsForStore = visits.filter((visit) => visit.storeId === selectedStore.storeId);
                const hasOngoingVisit = existingVisitsForStore.some(visit => visit.checkinDate && !visit.checkoutDate);

                if (existingVisitsForStore.length > 0) {
                    setExistingVisits(existingVisitsForStore);
                    if (hasOngoingVisit) {
                        setOngoingVisit(existingVisitsForStore.find(visit => visit.checkinDate && !visit.checkoutDate));
                        setIsOngoingVisitVisible(true);
                    } else {
                        setConfirmationMessage("Are you sure you want to create another visit?");
                        setConfirmationVisible(true);
                    }
                } else {
                    await createVisitAPI();
                }
            } else {
                console.error('Server error:', response.status);
            }
        } catch (error) {
            console.error('Error checking visits:', error);
        } finally {
            setIsCreatingVisit(false);
        }
    };

    const createVisitAPI = async () => {
        try {
            const employeeId = await AsyncStorage.getItem('employeeId');
            const purpose = newVisitDetails.purpose === 'Others' ? newVisitDetails.customPurpose : newVisitDetails.purpose;
            const response = await axios.put(`${API_BASE_URL}/visit/create`, {
                storeId: selectedStore.storeId,
                employeeId: employeeId,
                visit_date: format(newVisitDetails.date, 'yyyy-MM-dd'),
                purpose: purpose,
            }, {
                headers: {
                    Authorization: `Bearer ${authToken}`,
                },
            });

            const visitId = response.data;
            navigation.navigate('VisitScreen', { visitId, authToken });
            closeModal();
        } catch (error) {
            console.error('Error creating visit:', error);
            Alert.alert('Error', 'Failed to create visit. Please try again.');
        }
    };

    const ConfirmationBottomSheet = () => (
        <Modal
            visible={isConfirmationVisible}
            animationType="slide"
            transparent={true}
            onRequestClose={() => setConfirmationVisible(false)}
        >
            <View style={styles.confirmationContainer}>
                <View style={styles.confirmationContent}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.confirmationTitle}>Existing Visits</Text>
                        <TouchableOpacity style={styles.closeButton} onPress={() => setConfirmationVisible(false)}>
                            <Ionicons name="close" size={24} color="#000" />
                        </TouchableOpacity>
                    </View>
                    <ScrollView contentContainerStyle={styles.existingVisitsList}>
                        {existingVisits.length > 0 ? (
                            existingVisits.map((item) => (
                                <View key={item.id.toString()} style={styles.existingVisitCard}>
                                    <View style={styles.existingVisitHeader}>
                                        <Text style={styles.existingVisitStoreName}>{item.storeName}</Text>
                                        <Text style={styles.existingVisitDate}>{moment(item.visit_date).format('MMMM D, YYYY')}</Text>
                                    </View>
                                    <View style={styles.existingVisitDetails}>
                                        <View style={styles.existingVisitItem}>
                                            <Ionicons name="location-outline" size={20} color="#6200EE" />
                                            <Text style={styles.existingVisitText}>{item.city}</Text>
                                        </View>
                                        <View style={styles.existingVisitItem}>
                                            <Ionicons name="bookmark-outline" size={20} color="#6200EE" />
                                            <Text style={styles.existingVisitText}>{item.purpose || 'N/A'}</Text>
                                        </View>
                                    </View>
                                    <TouchableOpacity
                                        style={styles.viewVisitButton}
                                        onPress={() => {
                                            setConfirmationVisible(false);
                                            setIsModalVisible(false);
                                            navigation.navigate('VisitScreen', { visitId: item.id, authToken });
                                        }}
                                    >
                                        <Text style={styles.viewVisitButtonText}>View Visit</Text>
                                    </TouchableOpacity>
                                </View>
                            ))
                        ) : (
                            <Text style={styles.noVisitsText}>No existing visits found for this customer on the selected date.</Text>
                        )}
                    </ScrollView>
                    <Text style={styles.confirmationMessage}>{confirmationMessage}</Text>
                    <View style={styles.confirmationButtons}>
                        <TouchableOpacity
                            style={[styles.confirmationButton, styles.cancelButton]}
                            onPress={() => setConfirmationVisible(false)}
                        >
                            <Text style={styles.cancelButtonText}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.confirmationButton, styles.createButton, isCreatingVisit && styles.buttonDisabled]}
                            onPress={() => {
                                setConfirmationVisible(false);
                                createVisitAPI();
                            }}
                            disabled={isCreatingVisit}
                        >
                            {isCreatingVisit ? (
                                <ActivityIndicator size="small" color="#fff" />
                            ) : (
                                <Text style={styles.createButtonText}>Create Visit</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );

    const OngoingVisitBottomSheet = () => (
        <Modal
            visible={isOngoingVisitVisible}
            animationType="slide"
            transparent={true}
            onRequestClose={() => setIsOngoingVisitVisible(false)}
        >
            <View style={styles.confirmationContainer}>
                <View style={styles.confirmationContent}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.confirmationTitle}>Ongoing Visit</Text>
                        <TouchableOpacity style={styles.closeButton} onPress={() => setIsOngoingVisitVisible(false)}>
                            <Ionicons name="close" size={24} color="#000" />
                        </TouchableOpacity>
                    </View>
                    <ScrollView contentContainerStyle={styles.existingVisitsList}>
                        {ongoingVisit && (
                            <View style={styles.existingVisitCard}>
                                <View style={styles.existingVisitHeader}>
                                    <Text style={styles.existingVisitStoreName}>{ongoingVisit.storeName}</Text>
                                    <Text style={styles.existingVisitDate}>{moment(ongoingVisit.visit_date).format('MMMM D, YYYY')}</Text>
                                </View>
                                <View style={styles.existingVisitDetails}>
                                    <View style={styles.existingVisitItem}>
                                        <Ionicons name="location-outline" size={20} color="#6200EE" />
                                        <Text style={styles.existingVisitText}>{ongoingVisit.city}</Text>
                                    </View>
                                    <View style={styles.existingVisitItem}>
                                        <Ionicons name="bookmark-outline" size={20} color="#6200EE" />
                                        <Text style={styles.existingVisitText}>{ongoingVisit.purpose || 'N/A'}</Text>
                                    </View>
                                </View>
                                <TouchableOpacity
                                    style={styles.viewVisitButton}
                                    onPress={() => {
                                        setIsOngoingVisitVisible(false);
                                        setIsModalVisible(false);
                                        navigation.navigate('VisitScreen', { visitId: ongoingVisit.id, authToken });
                                    }}
                                >
                                    <Text style={styles.viewVisitButtonText}>View Visit</Text>
                                </TouchableOpacity>
                            </View>
                        )}
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );

    const handleCreateStore = async () => {
        try {
            const employeeId = await AsyncStorage.getItem('employeeId');
            const payload = {
                ...newStoreDetails,
                employeeId: employeeId,
                subDistrict: newStoreDetails.village,
                district: newStoreDetails.taluka,
                yearOfJoining: newStoreDetails.yearOfJoining ? Number(newStoreDetails.yearOfJoining) : undefined,
            };
            delete payload.village;
            delete payload.taluka;
            if (!payload.yearOfJoining) delete payload.yearOfJoining;
            const response = await axios.post(`${API_BASE_URL}/store/create`, payload, {
                headers: { Authorization: `Bearer ${authToken}` },
            });

            const storeId = response.data;
            setSelectedStore({ storeId, storeName: newStoreDetails.storeName });
            closeCreateStoreModal();
        } catch (error) {
            console.error('Error creating store:', error);
        }
    };

    const handleStoreSelect = (store) => {
        setSelectedStore(store);
        setStoreSearchText(store.storeName);
        setNewVisitDetails(prev => ({
            ...prev,
            purpose: '',
            customPurpose: ''
        }));
    };

    const getStatusBadgeStyle = (status) => {
        switch (status) {
            case 'Assigned':
                return styles.assignedBadge;
            case 'Ongoing':
                return styles.ongoingBadge;
            case 'Completed':
                return styles.completedBadge;
            default:
                return null;
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'Assigned':
                return '#D97706';
            case 'Ongoing':
                return '#2563EB';
            case 'Completed':
                return '#059669';
            default:
                return '#E5E7EB';
        }
    };

    const handleSelectDate = (date) => {
        setNewVisitDetails({ ...newVisitDetails, date });
        setPickerVisible(false);
    };

    const fetchStores = async (searchText = '') => {
        try {
            setIsStoreLoading(true);
            const employeeId = await AsyncStorage.getItem('employeeId');
            if (!employeeId) {
                throw new Error('Employee ID not found');
            }

            const url = `${API_BASE_URL}/store/getByEmployeeWithSort?id=${employeeId}&storeName=${encodeURIComponent(searchText.trim())}&page=0&size=20&sortBy=storeName&sortOrder=asc`;

            const response = await axios.get(url, {
                headers: {
                    'Authorization': `Bearer ${authToken}`,
                }
            });

            if (response.data && Array.isArray(response.data.content)) {
                setStores(response.data.content);
            } else {
                setStores([]);
            }
        } catch (error) {
            console.error('Error fetching stores:', error);
            
            if (error.response && (error.response.status === 401 || error.response.status === 403)) {
                Alert.alert(
                    "Session Expired",
                    "Your session has expired. Please log in again.",
                    [
                        {
                            text: "OK",
                            onPress: () => {
                                setIsModalVisible(false);
                                navigation.navigate('Login');
                            }
                        }
                    ]
                );
            } else {
                Alert.alert(
                    "Error",
                    "Failed to fetch stores. Please try again.",
                    [{ text: "OK" }]
                );
            }
            setStores([]);
        } finally {
            setIsStoreLoading(false);
        }
    };

    const handleStoreSearchChange = (text) => {
        setStoreSearchText(text);
        fetchStores(text);
    };

    useEffect(() => {
        if (isModalVisible) {
            fetchStores('');
        } else {
            setStores([]);
            setStoreSearchText('');
            setSelectedStore(null);
        }
    }, [isModalVisible]);

    const renderVisitCard = ({ item: visit }) => {
        const checkinDateTime = visit.checkinDate && visit.checkinTime
            ? moment(`${visit.checkinDate} ${visit.checkinTime}`, 'YYYY-MM-DD HH:mm:ss.SSS')
            : null;
        const checkoutDateTime = visit.checkoutDate && visit.checkoutTime
            ? moment(`${visit.checkoutDate} ${visit.checkoutTime}`, 'YYYY-MM-DD HH:mm:ss.SSS')
            : null;

        const duration = checkinDateTime && checkoutDateTime
            ? moment.duration(checkoutDateTime.diff(checkinDateTime))
            : null;

        const formattedDuration = duration
            ? duration.hours() > 0
                ? `${duration.hours()}h ${duration.minutes()}m`
                : `${duration.minutes()}m`
            : null;

        return (
            <TouchableOpacity
                style={styles.card}
                onPress={() =>
                    navigation.navigate('VisitScreen', { visitId: visit.id, authToken })
                }
                activeOpacity={0.86}
            >
                <View style={styles.cardContent}>
                    <View style={styles.cardHeader}>
                        <View style={styles.visitIdentity}>
                            <View style={styles.visitIconBox}>
                                <Ionicons name="storefront-outline" size={20} color="#4F46E5" />
                            </View>
                            <View style={styles.cardTitleBlock}>
                                <Text style={styles.storeName} numberOfLines={1}>{visit.storeName || 'Unnamed customer'}</Text>
                                <Text style={styles.visitReference}>Visit #{visit.id}</Text>
                            </View>
                        </View>
                        <View style={[styles.statusContainer, { backgroundColor: getStatusColor(visit.status) }]}>
                            <Ionicons
                                name={visit.status === 'Completed' ? 'checkmark-circle' : visit.status === 'Ongoing' ? 'navigate-circle' : 'time-outline'}
                                size={13}
                                color="#FFFFFF"
                            />
                            <Text style={styles.statusText}>{visit.status}</Text>
                        </View>
                    </View>
                    <View style={styles.visitDetails}>
                        <View style={styles.visitItem}>
                            <View style={styles.visitMetaIcon}>
                                <Ionicons name="calendar-outline" size={17} color="#4F46E5" />
                            </View>
                            <View>
                                <Text style={styles.visitMetaLabel}>VISIT DATE</Text>
                                <Text style={styles.visitText}>{moment(visit.visit_date).format('DD MMM YYYY')}</Text>
                            </View>
                        </View>
                        <View style={styles.visitItem}>
                            <View style={styles.visitMetaIcon}>
                                <Ionicons name="bookmark-outline" size={17} color="#4F46E5" />
                            </View>
                            <View>
                                <Text style={styles.visitMetaLabel}>PURPOSE</Text>
                                <Text style={styles.visitText} numberOfLines={1}>{visit.purpose || 'Not specified'}</Text>
                            </View>
                        </View>
                    </View>
                    <View style={styles.cardFooter}>
                        <View style={styles.footerMeta}>
                            {formattedDuration && (
                                <View style={styles.footerItem}>
                                    <Ionicons name="time-outline" size={16} color="#7C8494" />
                                    <Text style={styles.footerText}>{formattedDuration}</Text>
                                </View>
                            )}
                            {!!visit.employeeName && (
                                <View style={styles.footerItem}>
                                    <Ionicons name="person-outline" size={16} color="#7C8494" />
                                    <Text style={styles.footerText} numberOfLines={1}>{visit.employeeName}</Text>
                                </View>
                            )}
                        </View>
                        <Ionicons name="chevron-forward" size={19} color="#4F46E5" />
                    </View>
                </View>
            </TouchableOpacity>
        );
    };

    const visibleStores = stores.filter((store) => {
        if (customerTypeFilter === 'all') return true;
        return String(store.clientType || '').trim().toLowerCase() === customerTypeFilter;
    });

    return (
        <View style={styles.container}>
            <CustomDatePicker 
                selectedDate={selectedDate} 
                onDateChange={handleDateChange}
            />
            <View style={styles.filtersContainer}>
                <View style={styles.filterField}>
                    <Ionicons name="search-outline" size={18} color="#7C8494" />
                    <TextInput
                        style={styles.filterInput}
                        placeholder="Customer"
                        value={filters.customerName}
                        onChangeText={(value) => handleFilterChange('customerName', value)}
                        placeholderTextColor="#9CA3AF"
                    />
                </View>
                <View style={styles.filterField}>
                    <Ionicons name="bookmark-outline" size={18} color="#7C8494" />
                    <TextInput
                        style={styles.filterInput}
                        placeholder="Purpose"
                        value={filters.purpose}
                        onChangeText={(value) => handleFilterChange('purpose', value)}
                        placeholderTextColor="#9CA3AF"
                    />
                </View>
            </View>
            {loading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#4F46E5" />
                    <Text style={styles.loadingText}>Loading visits...</Text>
                </View>
            ) : error ? (
                <View style={styles.errorContainer}>
                    <Text style={styles.errorText}>{error}</Text>
                </View>
            ) : (
                <>
                    <View style={styles.resultsHeader}>
                        <Text style={styles.resultsTitle}>Scheduled visits</Text>
                        <Text style={styles.resultsCount}>{filteredVisits.length} {filteredVisits.length === 1 ? 'visit' : 'visits'}</Text>
                    </View>
                    <FlatList
                        data={filteredVisits}
                        renderItem={renderVisitCard}
                        keyExtractor={(item) => item.id.toString()}
                        contentContainerStyle={styles.listContainer}
                        contentInsetAdjustmentBehavior="automatic"
                        onEndReached={handleLoadMore}
                        onEndReachedThreshold={0.5}
                        ListEmptyComponent={() => (
                            <View style={styles.emptyVisitsState}>
                                <View style={styles.emptyVisitsIcon}>
                                    <Ionicons name="calendar-outline" size={25} color="#4F46E5" />
                                </View>
                                <Text style={styles.noVisitsText}>No visits scheduled for this date</Text>
                                <Text style={styles.emptyVisitsHint}>Use the plus button to create one.</Text>
                            </View>
                        )}
                        ListFooterComponent={
                            isLoadingMore ? (
                                <View style={styles.paginationLoading}>
                                    <ActivityIndicator size="small" color="#4F46E5" />
                                </View>
                            ) : currentPage < totalPages - 1 ? (
                                <TouchableOpacity style={styles.loadMoreVisitsButton} onPress={handleLoadMore}>
                                    <Text style={styles.loadMoreVisitsText}>Load More Visits</Text>
                                </TouchableOpacity>
                            ) : null
                        }
                    />
                </>
            )}
            <TouchableOpacity style={styles.addButton} onPress={openModal}>
                <Ionicons name="add" size={24} color="white" />
            </TouchableOpacity>

            <Modal
                visible={isModalVisible}
                animationType="slide"
                onRequestClose={closeModal}
                transparent={true}
            >
                <View style={styles.modalBackground}>
                    <View style={[styles.modalContainer, styles.createVisitModalContainer]}>
                        <View style={styles.sheetHandle} />
                        <View style={[styles.modalHeader, styles.createVisitHeader]}>
                            <View style={styles.createVisitHeading}>
                                <Text style={styles.createVisitTitle}>Create Visit</Text>
                                <Text style={styles.createVisitSubtitle}>Choose a customer to continue</Text>
                            </View>
                            <TouchableOpacity style={styles.sheetCloseButton} onPress={closeModal} accessibilityLabel="Close create visit">
                                <Ionicons name="close" size={20} color="#374151" />
                            </TouchableOpacity>
                        </View>

                        {!selectedStore ? (
                            <View style={styles.storeSection}>
                                <View style={styles.searchInputContainer}>
                                    <Ionicons name="search" size={20} color="#999" style={styles.searchIcon} />
                                    <TextInput
                                        style={styles.searchInput}
                                        placeholder="Search customers by name"
                                        value={storeSearchText}
                                        onChangeText={handleStoreSearchChange}
                                        placeholderTextColor="#999"
                                    />
                                </View>

                                <View style={styles.visitFilterPanel}>
                                    <Text style={styles.visitFilterLabel}>Customer Type</Text>
                                    <View style={styles.visitFilterOptions}>
                                        {[{ label: 'All', value: 'all' }, ...CLIENT_TYPE_OPTIONS].map((option) => (
                                            <TouchableOpacity key={option.value} onPress={() => setCustomerTypeFilter(option.value)} style={[styles.visitFilterChip, customerTypeFilter === option.value && styles.visitFilterChipActive]}>
                                                <Text style={[styles.visitFilterChipText, customerTypeFilter === option.value && styles.visitFilterChipTextActive]}>{option.label}</Text>
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                </View>

                                <TouchableOpacity style={styles.createSiteVisitAction} onPress={openCreateStoreModal}>
                                    <View style={styles.createSiteVisitActionIcon}><Ionicons name="add" size={21} color="#4F46E5" /></View>
                                    <View style={styles.createSiteVisitActionText}>
                                        <Text style={styles.createSiteVisitActionTitle}>Create a new site visit</Text>
                                        <Text style={styles.createSiteVisitActionSubtitle}>Customer not in this list?</Text>
                                    </View>
                                    <Ionicons name="chevron-forward" size={20} color="#6B7280" />
                                </TouchableOpacity>
                                
                                <FlatList
                                    data={visibleStores}
                                    style={styles.storesList}
                                    contentContainerStyle={styles.storesListContent}
                                    ListHeaderComponent={() => (
                                        <View style={styles.storeResultsHeader}>
                                            <Text style={styles.storeResultsTitle}>Customers</Text>
                                            <Text style={styles.storeResultsCount}>{visibleStores.length} results</Text>
                                        </View>
                                    )}
                                    renderItem={({ item }) => (
                                        <TouchableOpacity
                                            style={styles.storeItem}
                                            onPress={() => handleStoreSelect(item)}
                                        >
                                            <View style={styles.storeItemAvatar}>
                                                <Ionicons name="storefront-outline" size={20} color="#4F46E5" />
                                            </View>
                                            <View style={styles.storeItemContent}>
                                                <View style={styles.storeItemHeader}>
                                                    <Text style={styles.storeItemName} numberOfLines={1}>{item.storeName}</Text>
                                                    {!!item.clientType && <View style={styles.storeTypeBadge}><Text style={styles.storeTypeBadgeText}>{item.clientType}</Text></View>}
                                                </View>
                                                <View style={styles.storeItemDetails}>
                                                    <View style={styles.storeItemRow}>
                                                        <Ionicons name="person-outline" size={13} color="#7C8494" />
                                                        <Text style={styles.storeItemText} numberOfLines={1}>{[item.clientFirstName, item.clientLastName].filter(Boolean).join(' ') || 'Customer'}</Text>
                                                    </View>
                                                    <View style={styles.storeItemRow}>
                                                        <Ionicons name="location-outline" size={13} color="#7C8494" />
                                                        <Text style={styles.storeItemText} numberOfLines={1}>{item.city || 'Location not set'}</Text>
                                                    </View>
                                                </View>
                                            </View>
                                            <Ionicons name="chevron-forward" size={20} color="#7C8494" />
                                        </TouchableOpacity>
                                    )}
                                    keyExtractor={(item) => (item?.storeId || '').toString()}
                                    ListEmptyComponent={() => (
                                        <Text style={styles.noStoresText}>
                                            {isStoreLoading ? 'Searching...' : 
                                             storeSearchText.trim() ? 'No customers found matching your search' :
                                             'No customers available'}
                                        </Text>
                                    )}
                                    ListFooterComponent={() => (
                                        isStoreLoading ? (
                                            <View style={styles.loadingContainer}>
                                                <ActivityIndicator size="small" color="#4F46E5" />
                                            </View>
                                        ) : null
                                    )}
                                />
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
                                    <TouchableOpacity 
                                        style={[styles.createButton, isCreatingVisit && styles.buttonDisabled]} 
                                        onPress={createVisit}
                                        disabled={isCreatingVisit}
                                    >
                                        {isCreatingVisit ? (
                                            <ActivityIndicator size="small" color="#fff" />
                                        ) : (
                                            <Text style={styles.createButtonText}>Create Visit</Text>
                                        )}
                                    </TouchableOpacity>
                                </View>
                            </ScrollView>
                        )}
                    </View>
                </View>
            </Modal>

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
                            <View style={styles.inputContainer}>
                                <Text style={styles.label}>Year of Joining (optional)</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="e.g. 2021"
                                    value={String(newStoreDetails.yearOfJoining || '')}
                                    onChangeText={(text) => setNewStoreDetails({ ...newStoreDetails, yearOfJoining: text.replace(/[^0-9]/g, '').slice(0, 4) })}
                                    keyboardType="number-pad"
                                    maxLength={4}
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
            <ConfirmationBottomSheet />
            <OngoingVisitBottomSheet />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingHorizontal: 14,
        paddingTop: 10,
        backgroundColor: '#F4F5F8',
    },
    dateFilterContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 16,
        backgroundColor: '#FFFFFF',
        borderRadius: 8,
        padding: 12,
    },
    selectedDateText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#1F2937',
    },
    heading: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 16,
    },
    filtersContainer: {
        flexDirection: 'row',
        gap: 10,
        marginBottom: 14,
    },
    filterField: {
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderColor: '#E5E7EB',
        borderRadius: 11,
        borderWidth: 1,
        flex: 1,
        flexDirection: 'row',
        minHeight: 46,
        paddingHorizontal: 11,
    },
    filterInput: {
        flex: 1,
        color: '#202938',
        fontSize: 13,
        paddingHorizontal: 8,
        paddingVertical: 10,
    },
    resultsHeader: {
        alignItems: 'center',
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 10,
        paddingHorizontal: 2,
    },
    resultsTitle: {
        color: '#202938',
        fontSize: 15,
        fontWeight: '800',
    },
    resultsCount: {
        color: '#6B7280',
        fontSize: 12,
        fontWeight: '700',
    },
    emptyVisitsState: {
        alignItems: 'center',
        paddingHorizontal: 28,
        paddingTop: 48,
    },
    emptyVisitsIcon: {
        alignItems: 'center',
        backgroundColor: '#EEF2FF',
        borderRadius: 24,
        height: 48,
        justifyContent: 'center',
        marginBottom: 9,
        width: 48,
    },
    emptyVisitsHint: {
        color: '#7C8494',
        fontSize: 13,
        marginTop: 4,
        textAlign: 'center',
    },
    loadingText: {
        fontSize: 16,
        color: '#6B7280',
        textAlign: 'center',
        marginTop: 20,
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
    buttonContainer: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        marginTop: 20,
    },
    listContainer: {
        paddingBottom: 112,
    },
    paginationLoading: {
        alignItems: 'center',
        paddingVertical: 18,
    },
    loadMoreVisitsButton: {
        alignItems: 'center',
        paddingVertical: 16,
    },
    loadMoreVisitsText: {
        color: '#4F46E5',
        fontSize: 14,
        fontWeight: '700',
    },
    card: {
        backgroundColor: '#FFFFFF',
        borderColor: '#E7EAF0',
        borderRadius: 16,
        borderWidth: 1,
        marginBottom: 12,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.06,
        shadowRadius: 6,
        elevation: 2,
    },
    statusBar: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: 8,
        borderTopLeftRadius: 10,
        borderTopRightRadius: 10,
    },
    cardContent: {
        flexDirection: 'column',
        padding: 12,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 12,
    },
    cardTitleBlock: {
        flex: 1,
        minWidth: 0,
    },
    visitIdentity: {
        alignItems: 'center',
        flex: 1,
        flexDirection: 'row',
        minWidth: 0,
    },
    visitIconBox: {
        alignItems: 'center',
        backgroundColor: '#EEF2FF',
        borderRadius: 11,
        height: 38,
        justifyContent: 'center',
        marginRight: 10,
        width: 38,
    },
    storeName: {
        fontSize: 16,
        fontWeight: '800',
        color: '#1F2937',
    },
    visitReference: {
        color: '#7C8494',
        fontSize: 11,
        fontWeight: '600',
        marginTop: 2,
    },
    visitCustomerName: {
        color: '#6B7280',
        fontSize: 13,
        fontWeight: '600',
        marginTop: 3,
    },
    statusContainer: {
        alignItems: 'center',
        borderRadius: 16,
        flexDirection: 'row',
        gap: 4,
        paddingHorizontal: 9,
        paddingVertical: 6,
        alignSelf: 'flex-start',
    },
    statusText: {
        fontSize: 10,
        fontWeight: '800',
        color: '#FFFFFF',
        textTransform: 'uppercase',
    },

    employeeName: {
        fontSize: 16,
        color: '#4B5563',
        marginLeft: 8,
    },
    visitDate: {
        fontSize: 14,
        color: '#6B7280',
    },
    cardInfoItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    purpose: {
        fontSize: 16,
        color: '#4B5563',
        marginLeft: 8,
    },
    outcome: {
        fontSize: 16,
        color: '#4B5563',
        marginLeft: 8,
    },
    actionContainer: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
    },
    button: {
        backgroundColor: '#007bff',
        borderRadius: 4,
        paddingVertical: 8,
        paddingHorizontal: 12,
    },
    buttonText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: 'bold',
    },
    addButton: {
        position: 'absolute',
        bottom: 20,
        right: 20,
        backgroundColor: '#4F46E5',
        borderRadius: 30,
        width: 60,
        height: 60,
        alignItems: 'center',
        justifyContent: 'center',
        elevation: 5,
    },
    addButtonDisabled: {
        backgroundColor: '#9CA3AF',
        elevation: 1,
    },
    modalContent: {
        flex: 1,
        padding: 20,
        backgroundColor: '#FFFFFF',
        borderRadius: 8,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
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
        maxHeight: '95%',
        minHeight: '70%',
    },
    createVisitModalContainer: {
        maxHeight: '92%',
        paddingTop: 9,
        paddingHorizontal: 16,
    },
    sheetHandle: {
        width: 38,
        height: 4,
        borderRadius: 2,
        backgroundColor: '#D2D6DE',
        alignSelf: 'center',
        marginBottom: 4,
    },
    modalKeyboardView: {
        flex: 1,
        width: '100%',
        justifyContent: 'flex-end',
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
    createVisitHeader: {
        marginBottom: 10,
        paddingTop: 4,
    },
    createVisitHeading: {
        flex: 1,
        minWidth: 0,
        paddingRight: 12,
    },
    createVisitTitle: {
        color: '#202938',
        fontSize: 17,
        lineHeight: 22,
    },
    createVisitSubtitle: {
        color: '#7C8494',
        fontSize: 11,
        marginTop: 2,
    },
    sheetCloseButton: {
        width: 34,
        height: 34,
        borderRadius: 17,
        backgroundColor: '#F2F4F7',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 0,
    },
    closeButton: {
        padding: 5,
    },
    storeSection: {
        marginBottom: 20,
        flex: 1,
    },
    storesList: {
        flex: 1,
    },
    storesListContent: {
        paddingBottom: 24,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 10,
    },
    searchInputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        minHeight: 46,
        backgroundColor: '#F8F9FB',
        borderRadius: 11,
        paddingHorizontal: 12,
        gap: 10,
        marginBottom: 14,
        borderWidth: 1,
        borderColor: '#DCE1EA',
    },
    searchInput: {
        flex: 1,
        fontSize: 14,
        color: '#202938',
        paddingHorizontal: 8,
        paddingVertical: 10,
    },
    clearStoreSearchButton: {
        width: 30,
        height: 30,
        alignItems: 'center',
        justifyContent: 'center',
    },
    storeItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: '#E4E7EC',
        borderRadius: 12,
        backgroundColor: '#FFFFFF',
        shadowColor: '#111827',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 3,
        elevation: 1,
    },
    cancelButton: {
        backgroundColor: '#E5E7EB',
        borderRadius: 4,
        paddingVertical: 12,
        paddingHorizontal: 16,
        marginRight: 10,
    },
    cancelButtonText: {
        fontSize: 16,
        color: '#4B5563',
        fontWeight: 'bold',
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

    createStoreButton: {
        backgroundColor: '#4F46E5',
        borderRadius: 4,
        paddingVertical: 12,
        paddingHorizontal: 16,
        alignItems: 'center',
        marginTop: 16,
    },
    createStoreButtonText: {
        fontSize: 16,
        color: '#FFFFFF',
        fontWeight: 'bold',
    },
    backButton: {
        marginRight: 10,
    },
    statusBadge: {
        paddingVertical: 4,
        paddingHorizontal: 8,
        borderRadius: 20,
    },
    assignedBadge: {
        backgroundColor: '#FCD34D',
    },
    ongoingBadge: {
        backgroundColor: '#60A5FA',
    },
    completedBadge: {
        backgroundColor: '#4ADE80',
    },
    selectedDateContainer: {
        alignItems: 'center',
        marginBottom: 20,
    },
    selectedDateText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#1F2937',
    },
    visitDetails: {
        backgroundColor: '#F8FAFC',
        borderRadius: 12,
        gap: 10,
        marginBottom: 9,
        padding: 9,
    },
    visitRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    visitItem: {
        flexDirection: 'row',
        alignItems: 'center',
        minWidth: 0,
    },
    visitMetaIcon: {
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderColor: '#E7EAF0',
        borderRadius: 9,
        borderWidth: 1,
        height: 34,
        justifyContent: 'center',
        marginRight: 9,
        width: 34,
    },
    visitMetaLabel: {
        color: '#8B95A7',
        fontSize: 10,
        fontWeight: '800',
        marginBottom: 2,
    },
    visitText: {
        color: '#374151',
        fontSize: 13,
        fontWeight: '700',
    },
    visitIcon: {
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        borderRadius: 30,
        width: 50,
        height: 50,
    },
    cardFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 2,
        paddingTop: 2,
        borderTopWidth: 1,
        borderTopColor: '#F3F4F6',
    },
    footerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    footerRight: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    footerItem: {
        flexDirection: 'row',
        alignItems: 'center',
        maxWidth: 160,
    },
    footerMeta: {
        alignItems: 'center',
        flex: 1,
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
        minWidth: 0,
    },
    footerText: {
        color: '#6B7280',
        fontSize: 12,
        marginLeft: 6,
        fontWeight: '600',
    },
    locationLink: {
        color: '#4F46E5',
        textDecorationLine: 'underline',
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
    activityCompleteButton: {
        marginTop: 12,
        marginBottom: 12,
        minHeight: 44,
        borderRadius: 8,
        backgroundColor: '#4F46E5',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 16,
        gap: 8,
    },
    activityCompleteButtonDisabled: {
        opacity: 0.7,
    },
    activityCompleteButtonText: {
        color: '#FFFFFF',
        fontSize: 15,
        fontWeight: '700',
    },
    activityConfirmOverlay: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    activityConfirmCard: {
        width: '86%',
        maxWidth: 360,
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 20,
        alignSelf: 'center',
        alignItems: 'center',
    },
    activityConfirmIcon: {
        width: 52,
        height: 52,
        borderRadius: 26,
        backgroundColor: '#EEF2FF',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 12,
    },
    activityConfirmTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#111827',
        marginBottom: 8,
    },
    activityConfirmText: {
        fontSize: 14,
        color: '#4B5563',
        textAlign: 'center',
        marginBottom: 8,
    },
    activityConfirmMeta: {
        fontSize: 13,
        color: '#6B7280',
        textAlign: 'center',
        marginBottom: 16,
    },
    activityConfirmActions: {
        flexDirection: 'row',
        width: '100%',
        gap: 12,
    },
    activityConfirmButton: {
        flex: 1,
        minHeight: 44,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
    },
    activityConfirmCancelButton: {
        backgroundColor: '#F3F4F6',
    },
    activityConfirmEndButton: {
        backgroundColor: '#4F46E5',
    },
    activityConfirmEndButtonDisabled: {
        opacity: 0.55,
    },
    activityConfirmCancelText: {
        color: '#374151',
        fontSize: 15,
        fontWeight: '700',
    },
    activityConfirmEndText: {
        color: '#FFFFFF',
        fontSize: 15,
        fontWeight: '700',
    },
    activityPhotoSection: {
        width: '100%',
        marginBottom: 16,
    },
    activityPhotoTitle: {
        color: '#374151',
        fontSize: 13,
        fontWeight: '700',
        marginBottom: 8,
        textAlign: 'left',
    },
    activityPhotoActions: {
        flexDirection: 'row',
        gap: 10,
        marginBottom: 10,
    },
    activityExistingPhotoBlock: {
        width: '100%',
        marginBottom: 10,
    },
    activityExistingPhotoText: {
        color: '#6B7280',
        fontSize: 12,
        fontWeight: '600',
        marginBottom: 8,
    },
    activityPhotoButton: {
        flex: 1,
        minHeight: 40,
        borderWidth: 1,
        borderColor: '#C7D2FE',
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        gap: 6,
        backgroundColor: '#EEF2FF',
    },
    activityPhotoButtonDisabled: {
        opacity: 0.5,
    },
    activityPhotoButtonText: {
        color: '#4F46E5',
        fontSize: 13,
        fontWeight: '700',
    },
    activityPreviewRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    activityPreviewWrap: {
        position: 'relative',
    },
    activityPreviewImage: {
        width: 52,
        height: 52,
        borderRadius: 6,
    },
    activityAttachmentRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginTop: 10,
    },
    activityAttachmentImage: {
        width: 60,
        height: 60,
        borderRadius: 6,
        backgroundColor: '#E5E7EB',
    },
    activityAttachmentPlaceholder: {
        width: 60,
        height: 60,
        borderRadius: 6,
        backgroundColor: '#E5E7EB',
        alignItems: 'center',
        justifyContent: 'center',
    },
    activityAttachmentPlaceholderText: {
        color: '#6B7280',
        fontSize: 10,
    },
    activityRemovePhotoButton: {
        position: 'absolute',
        right: -6,
        top: -6,
        width: 20,
        height: 20,
        borderRadius: 10,
        backgroundColor: '#EF4444',
        alignItems: 'center',
        justifyContent: 'center',
    },
    activityRemovePhotoText: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: '800',
    },
    activityCameraContainer: {
        flex: 1,
        backgroundColor: '#000000',
    },
    activityCameraPreview: {
        flex: 1,
    },
    activityCameraControls: {
        flexDirection: 'row',
        gap: 12,
        padding: 20,
        backgroundColor: '#111827',
    },
    activityCameraCancelButton: {
        flex: 1,
        borderWidth: 1,
        borderColor: '#FFFFFF',
        borderRadius: 8,
        paddingVertical: 14,
        alignItems: 'center',
    },
    activityCameraCancelText: {
        color: '#FFFFFF',
        fontWeight: '700',
    },
    activityCaptureButton: {
        flex: 1,
        backgroundColor: '#4F46E5',
        borderRadius: 8,
        paddingVertical: 14,
        alignItems: 'center',
    },
    activityCaptureButtonText: {
        color: '#FFFFFF',
        fontWeight: '700',
    },
    confirmationContainer: {
        flex: 1,
        justifyContent: 'flex-end',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    confirmationContent: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        padding: 20,
        maxHeight: '80%',
    },
    confirmationTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 10,
    },
    confirmationMessage: {
        fontSize: 16,
        marginBottom: 20,
    },
    confirmationButtons: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
    },
    confirmationButton: {
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 5,
        marginLeft: 10,
    },
    confirmationButtonText: {
        fontSize: 16,
        color: '#fff',
    },
    existingVisitCard: {
        backgroundColor: '#fff',
        borderRadius: 10,
        padding: 20,
        marginBottom: 20,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
    },
    existingVisitHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    existingVisitStoreName: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#4F46E5',
    },
    existingVisitDate: {
        fontSize: 14,
        color: '#888',
    },
    existingVisitDetails: {
        marginBottom: 15,
    },
    existingVisitItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 5,
    },
    existingVisitText: {
        fontSize: 16,
        color: '#4F46E5',
        marginLeft: 10,
    },
    viewVisitButton: {
        backgroundColor: '#4F46E5',
        paddingVertical: 10,
        borderRadius: 5,
        alignItems: 'center',
    },
    viewVisitButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    existingVisitsList: {
        paddingBottom: 20,
    },
    noVisitsText: {
        fontSize: 16,
        color: '#888',
        textAlign: 'center',
        marginBottom: 20,
    },
    scrollContent: {
        flexGrow: 1,
        paddingBottom: 120,
    },
    noStoresText: {
        textAlign: 'center',
        color: '#7C8494',
        fontSize: 12,
        lineHeight: 17,
        maxWidth: 250,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    storeLocation: {
        fontSize: 12,
        color: '#6B7280',
        marginTop: 4,
    },
    radiusSelector: {
        padding: 11,
        backgroundColor: '#F8F9FC',
        borderRadius: 11,
        borderWidth: 1,
        borderColor: '#E7EAF0',
    },
    radiusSelectorHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    radiusLabel: {
        fontSize: 12,
        fontWeight: '700',
        color: '#3D4656',
        marginLeft: 6,
    },
    radiusButtons: {
        flexDirection: 'row',
        flexWrap: 'wrap',
    },
    radiusButton: {
        backgroundColor: '#FFFFFF',
        paddingVertical: 7,
        paddingHorizontal: 11,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        marginRight: 7,
        marginBottom: 7,
    },
    radiusButtonActive: {
        backgroundColor: '#4F46E5',
        borderColor: '#4F46E5',
    },
    radiusButtonText: {
        fontSize: 12,
        color: '#6B7280',
        fontWeight: '500',
    },
    radiusButtonTextActive: {
        color: '#FFFFFF',
        fontWeight: '600',
    },
    radiusAndTypeContainer: {
        marginBottom: 12,
        gap: 8,
    },
    typeFilter: {
        backgroundColor: '#F8F9FC',
        borderRadius: 11,
        padding: 11,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    typeFilterHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
        gap: 6,
    },
    typeFilterLabel: {
        fontSize: 12,
        fontWeight: '700',
        color: '#3D4656',
    },
    typeFilterChips: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 7,
    },
    typeChip: {
        alignItems: 'center',
        flexDirection: 'row',
        gap: 4,
        paddingHorizontal: 10,
        paddingVertical: 7,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        backgroundColor: '#FFFFFF',
    },
    typeChipActive: {
        backgroundColor: '#4F46E5',
        borderColor: '#4F46E5',
    },
    typeChipText: {
        fontSize: 11,
        color: '#4B5563',
    },
    typeChipTextActive: {
        color: '#FFFFFF',
        fontWeight: '600',
    },
    createSiteVisitAction: {
        flexDirection: 'row',
        alignItems: 'center',
        minHeight: 56,
        backgroundColor: '#F7F8FF',
        borderWidth: 1,
        borderColor: '#DDE3FF',
        borderRadius: 12,
        paddingHorizontal: 12,
        paddingVertical: 9,
        marginBottom: 12,
    },
    createSiteVisitActionIcon: {
        width: 34,
        height: 34,
        borderRadius: 10,
        backgroundColor: '#E9ECFF',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 9,
    },
    createSiteVisitActionText: {
        flex: 1,
        minWidth: 0,
    },
    createSiteVisitActionTitle: {
        color: '#3431B5',
        fontSize: 13,
        fontWeight: '700',
    },
    createSiteVisitActionSubtitle: {
        color: '#747D8E',
        fontSize: 11,
        marginTop: 2,
    },
    visitFilterPanel: {
        backgroundColor: '#F7F8FB',
        borderWidth: 1,
        borderColor: '#E7EAF0',
        borderRadius: 12,
        padding: 10,
        marginBottom: 9,
    },
    visitFilterLabel: {
        color: '#4B5563',
        fontSize: 12,
        fontWeight: '700',
        marginBottom: 8,
    },
    visitFilterOptions: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 7,
    },
    visitFilterChip: {
        backgroundColor: '#FFFFFF',
        borderColor: '#E1E5EC',
        borderRadius: 8,
        borderWidth: 1,
        paddingHorizontal: 10,
        paddingVertical: 7,
    },
    visitFilterChipActive: {
        backgroundColor: '#4F46E5',
        borderColor: '#4F46E5',
    },
    visitFilterChipText: {
        color: '#697284',
        fontSize: 11,
        fontWeight: '700',
    },
    visitFilterChipTextActive: {
        color: '#FFFFFF',
    },
    locationErrorBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FEF2F2',
        padding: 10,
        borderRadius: 8,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#FEE2E2',
    },
    locationErrorText: {
        fontSize: 13,
        color: '#EF4444',
        marginLeft: 8,
        flex: 1,
    },
    storeItemContent: {
        flex: 1,
        minWidth: 0,
        marginRight: 8,
    },
    storeItemAvatar: {
        width: 38,
        height: 38,
        borderRadius: 11,
        backgroundColor: '#EEF2FF',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 10,
    },
    storeItemHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 7,
    },
    storeItemName: {
        flex: 1,
        minWidth: 0,
        fontSize: 14,
        lineHeight: 19,
        fontWeight: '700',
        color: '#202938',
    },
    storeTypeBadge: {
        maxWidth: '42%',
        backgroundColor: '#F1F3F7',
        borderRadius: 999,
        paddingHorizontal: 7,
        paddingVertical: 3,
    },
    storeTypeBadgeText: {
        color: '#697284',
        fontSize: 9,
        fontWeight: '700',
    },
    storeItemDetails: {
        flexDirection: 'row',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 10,
        marginTop: 6,
    },
    storeItemRow: {
        flexDirection: 'row',
        alignItems: 'center',
        maxWidth: '100%',
        gap: 4,
    },
    storeItemText: {
        fontSize: 11,
        color: '#697284',
        flexShrink: 1,
    },
    storeResultsHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 9,
        paddingHorizontal: 2,
    },
    storeResultsTitle: {
        color: '#293241',
        fontSize: 13,
        fontWeight: '700',
    },
    storeResultsCount: {
        color: '#7C8494',
        fontSize: 11,
        fontWeight: '600',
    },
    storeLoadingState: {
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 32,
    },
    storeLoadingText: {
        color: '#7C8494',
        fontSize: 12,
    },
    storeEmptyState: {
        alignItems: 'center',
        backgroundColor: '#F8F9FC',
        borderWidth: 1,
        borderColor: '#E6E9F0',
        borderRadius: 12,
        paddingVertical: 24,
        paddingHorizontal: 18,
    },
    storeEmptyIcon: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#EEF2FF',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 9,
    },
    storeEmptyTitle: {
        color: '#202938',
        fontSize: 14,
        fontWeight: '700',
        marginBottom: 3,
    },
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    errorText: {
        color: '#EF4444',
        fontSize: 16,
        textAlign: 'center',
    },
    // Activity card styles
    activityCard: {
        borderLeftWidth: 4,
        borderLeftColor: '#9C27B0',
    },
    activityCardChevron: {
        marginLeft: 8,
    },
    activityTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#1F2937',
        flex: 1,
        marginRight: 8,
    },
    // Create options modal styles
    createOptionsContainer: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        padding: 20,
        maxHeight: '60%',
    },
    optionsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        marginTop: 15,
        gap: 10,
    },
    optionButton: {
        alignItems: 'center',
        padding: 16,
        borderRadius: 12,
        backgroundColor: '#FFFFFF',
        borderWidth: 1.5,
        borderColor: '#E5E7EB',
        width: '48%',
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 1,
        },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    optionIconContainer: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: '#F3F4F6',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 10,
    },
    optionTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#1F2937',
        marginBottom: 3,
        textAlign: 'center',
    },
    optionDescription: {
        fontSize: 11,
        color: '#6B7280',
        textAlign: 'center',
        lineHeight: 14,
    },
    buttonDisabled: {
        opacity: 0.55,
    },
    searchIcon: {
        marginRight: 8,
    },
    storeItemColumn: {
        flex: 1,
    },
    storeItemGrid: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    // Text area styles
    textArea: {
        height: 100,
        textAlignVertical: 'top',
    },
    // Restriction banner styles
    restrictionBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FEF3C7',
        borderColor: '#F59E0B',
        borderWidth: 1,
        borderRadius: 8,
        padding: 12,
        marginBottom: 16,
    },
    restrictionText: {
        flex: 1,
        fontSize: 14,
        color: '#92400E',
        marginLeft: 8,
        lineHeight: 20,
    },
});

export default VisitsList;
