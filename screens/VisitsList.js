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
import { format, addDays, subDays, startOfWeek, endOfWeek, isSameDay, isToday, isYesterday } from 'date-fns';
import CalendarStrip from 'react-native-calendar-strip';
import { addWeeks, subWeeks } from 'date-fns';
import CustomDatePicker from './CustomDatePicker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import moment from 'moment';
import debounce from 'lodash.debounce';

const VisitsList = ({ authToken }) => {
    const [timelineData, setTimelineData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [isCreateStoreModalVisible, setIsCreateStoreModalVisible] = useState(false);
    const [isActivityModalVisible, setIsActivityModalVisible] = useState(false);
    const [isPickerVisible, setPickerVisible] = useState(false);
    const [selectedDate, setSelectedDate] = useState(() => {
        const now = new Date();
        now.setHours(0, 0, 0, 0);
        return now;
    });
    const navigation = useNavigation();
    const [isConfirmationVisible, setConfirmationVisible] = useState(false);
    const [existingVisit, setExistingVisit] = useState(null);

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
    const [existingVisits, setExistingVisits] = useState([]);
    const [isOngoingVisitVisible, setIsOngoingVisitVisible] = useState(false);
    const [ongoingVisit, setOngoingVisit] = useState(null);
    const [showCreateOptions, setShowCreateOptions] = useState(false);
    const [employeeRole, setEmployeeRole] = useState('');

    const [newVisitDetails, setNewVisitDetails] = useState({
        date: new Date(),
        purpose: '',
        customPurpose: '',
    });

    const [currentPage, setCurrentPage] = useState(0);
    const [totalPages, setTotalPages] = useState(0);
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
    const [newActivityDetails, setNewActivityDetails] = useState({
        title: '',
        description: '',
        activityDate: new Date(),
    });
    const [hasVisitsForDate, setHasVisitsForDate] = useState(false);

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

    const fetchTimelineData = async () => {
        if (!authToken) return;
        
        try {
            setLoading(true);
            setError(null);
            
            const token = await AsyncStorage.getItem('userToken');
            const formattedDate = format(selectedDate, 'yyyy-MM-dd');
            const employeeId = await AsyncStorage.getItem('employeeId');
            
            if (!employeeId) {
                throw new Error('Employee ID not found');
            }
            
            if (!token) {
                throw new Error('Auth token not found');
            }

            console.log('🔵 [TIMELINE] Fetching timeline data for:', formattedDate);

            const response = await fetch(
                `https://unbalkingly-uncharged-elizabet.ngrok-free.dev/timeline/getByDate?employeeId=${employeeId}&date=${formattedDate}`,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        'ngrok-skip-browser-warning': 'true',
                        'User-Agent': 'IconMobile',
                    },
                }
            );

            if (!response.ok) {
                throw new Error(`Server error: ${response.status}`);
            }

            const data = await response.json();
            
            // Check if response is HTML instead of JSON
            if (typeof data === 'string' && (data.includes('<!DOCTYPE html>') || data.includes('<html>'))) {
                console.log('⚠️ [TIMELINE] Server returned HTML instead of JSON');
                setTimelineData([]);
                return;
            }
            
            console.log('✅ [TIMELINE] Timeline data received:', data);
            
            // Process visits with status
            const processedVisits = (data.visits || []).map((visit) => {
                let visitStatus = 'Assigned';
                if (visit.checkinLatitude && visit.checkinLongitude && visit.checkinDate && visit.checkinTime) {
                    visitStatus = 'Ongoing';
                }
                if (visit.checkoutLatitude && visit.checkoutLongitude && visit.checkoutDate && visit.checkoutTime) {
                    visitStatus = 'Completed';
                }
                return { ...visit, status: visitStatus, type: 'visit' };
            });

            // Check if visits exist for this date
            setHasVisitsForDate(processedVisits.length > 0);

            // Process activities
            const processedActivities = (data.activities || []).map((activity) => ({
                ...activity,
                type: 'activity',
                storeName: activity.title, // Use title as display name
                purpose: 'Activity',
                visit_date: activity.activityDate,
            }));

            // Combine and sort by date/time
            const combinedData = [...processedVisits, ...processedActivities].sort((a, b) => {
                const dateA = new Date(a.visit_date || a.activityDate);
                const dateB = new Date(b.visit_date || b.activityDate);
                return dateB - dateA;
            });

            setTimelineData(combinedData);
        } catch (error) {
            console.error('❌ [TIMELINE] Error fetching timeline data:', error);
            setError(error.message);
            setTimelineData([]);
        } finally {
            setLoading(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            if (authToken) {
                fetchTimelineData();
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
        setCurrentPage(0);
    };

    const handleLoadMore = () => {
        if (currentPage < totalPages - 1) {
            setCurrentPage(prev => prev + 1);
        }
    };

    const handleFilterChange = (name, value) => {
        setFilters((prevFilters) => ({
            ...prevFilters,
            [name]: value,
        }));
    };

    const filteredTimelineData = timelineData
        ? timelineData
            .filter((item) => {
                const { storeName, purpose } = item;
                return (
                    storeName.toLowerCase().includes(filters.customerName.toLowerCase()) &&
                    (purpose ? purpose.toLowerCase().includes(filters.purpose.toLowerCase()) : true)
                );
            })
            .sort((a, b) => {
                // Sort by type first (activities first), then by status for visits
                if (a.type !== b.type) {
                    return a.type === 'activity' ? -1 : 1;
                }
                if (a.type === 'visit') {
                    const statusOrder = { Ongoing: 0, Assigned: 1, Completed: 2 };
                    return statusOrder[a.status] - statusOrder[b.status];
                }
                return 0;
            })
        : [];

    const openCreateOptions = () => {
        setShowCreateOptions(true);
    };

    const closeCreateOptions = () => {
        setShowCreateOptions(false);
    };

    const openVisitModal = () => {
        setShowCreateOptions(false);
        setIsModalVisible(true);
    };

    const openActivityModal = () => {
        setShowCreateOptions(false);
        setIsActivityModalVisible(true);
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
    };

    const closeActivityModal = () => {
        setIsActivityModalVisible(false);
        setNewActivityDetails({
            title: '',
            description: '',
            activityDate: new Date(),
        });
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

    const createVisit = async () => {
        if (!newVisitDetails.purpose || newVisitDetails.purpose.trim() === '') {
            Alert.alert('Error', 'Please select a purpose for the visit');
            return;
        }

        if (!selectedStore) {
            Alert.alert('Error', 'Please select a store');
            return;
        }

        try {
            const token = await AsyncStorage.getItem('userToken');
            const employeeId = await AsyncStorage.getItem('employeeId');
            const formattedDate = format(newVisitDetails.date, 'yyyy-MM-dd');
            
            const response = await fetch(
                `https://unbalkingly-uncharged-elizabet.ngrok-free.dev/visit/getByDateRangeAndEmployee?id=${employeeId}&start=${formattedDate}&end=${formattedDate}`,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        'ngrok-skip-browser-warning': 'true',
                        'User-Agent': 'IconMobile',
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
        }
    };

    const createVisitAPI = async () => {
        try {
            const token = await AsyncStorage.getItem('userToken');
            const employeeId = await AsyncStorage.getItem('employeeId');
            const purpose = newVisitDetails.purpose === 'Others' ? newVisitDetails.customPurpose : newVisitDetails.purpose;
            
            const response = await axios.put('https://unbalkingly-uncharged-elizabet.ngrok-free.dev/visit/create', {
                storeId: selectedStore.storeId,
                employeeId: parseInt(employeeId),
                visit_date: format(newVisitDetails.date, 'yyyy-MM-dd'),
                purpose: purpose,
            }, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'ngrok-skip-browser-warning': 'true',
                    'User-Agent': 'IconMobile',
                },
            });

            const visitId = response.data;
            navigation.navigate('VisitScreen', { visitId, authToken });
            closeModal();
        } catch (error) {
            console.error('Error creating visit:', error);
        }
    };

    const createActivityAPI = async () => {
        try {
            const token = await AsyncStorage.getItem('userToken');
            const employeeId = await AsyncStorage.getItem('employeeId');
            
            if (!newActivityDetails.title.trim()) {
                Alert.alert('Error', 'Please enter an activity title');
                return;
            }

            console.log('🔵 [ACTIVITY] Creating activity:', {
                employeeId: parseInt(employeeId),
                title: newActivityDetails.title,
                description: newActivityDetails.description,
                activityDate: format(newActivityDetails.activityDate, 'yyyy-MM-dd'),
            });

            const response = await axios.post('https://unbalkingly-uncharged-elizabet.ngrok-free.dev/activity/create', {
                employeeId: parseInt(employeeId),
                title: newActivityDetails.title,
                description: newActivityDetails.description,
                activityDate: format(newActivityDetails.activityDate, 'yyyy-MM-dd'),
            }, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'ngrok-skip-browser-warning': 'true',
                    'User-Agent': 'IconMobile',
                },
            });

            console.log('✅ [ACTIVITY] Activity created successfully:', response.data);
            
            Alert.alert('Success', 'Activity created successfully!');
            closeActivityModal();
            
            // Refresh timeline data
            fetchTimelineData();
        } catch (error) {
            console.error('❌ [ACTIVITY] Error creating activity:', error);
            Alert.alert('Error', error.response?.data || 'Failed to create activity. Please try again.');
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
                                        <Text style={styles.existingVisitDate}>{formatDate(item.visit_date)}</Text>
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
                            style={[styles.confirmationButton, styles.createButton]}
                            onPress={() => {
                                setConfirmationVisible(false);
                                createVisitAPI();
                            }}
                        >
                            <Text style={styles.createButtonText}>Create Visit</Text>
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
                                    <Text style={styles.existingVisitDate}>{formatDate(ongoingVisit.visit_date)}</Text>
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
            const token = await AsyncStorage.getItem('userToken');
            const employeeId = await AsyncStorage.getItem('employeeId');
            
            if (!token) {
                Alert.alert('Error', 'Authentication token not found');
                return;
            }
            
            const response = await axios.post('https://unbalkingly-uncharged-elizabet.ngrok-free.dev/store/create', {
                ...newStoreDetails,
                employeeId: parseInt(employeeId),
            }, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'ngrok-skip-browser-warning': 'true',
                    'User-Agent': 'IconMobile',
                }
            });

            // Check if response is HTML instead of JSON
            const isHtmlResponse = typeof response.data === 'string' && 
                (response.data.includes('<!DOCTYPE html>') || response.data.includes('<html>'));
            
            if (isHtmlResponse) {
                console.log('⚠️ [CREATE STORE] Server returned HTML instead of JSON');
                Alert.alert('Error', 'Authentication issue. Please try logging in again.');
                return;
            }

            const storeId = response.data;
            setSelectedStore({ storeId, storeName: newStoreDetails.storeName });
            Alert.alert('Success', 'Store created successfully');
            closeCreateStoreModal();
        } catch (error) {
            console.error('Error creating store:', error);
            Alert.alert('Error', error.response?.data || 'Failed to create store. Please try again.');
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
                return '#FCD34D';
            case 'Ongoing':
                return '#60A5FA';
            case 'Completed':
                return '#4ADE80';
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
            
            const token = await AsyncStorage.getItem('userToken');
            const employeeId = await AsyncStorage.getItem('employeeId');
            
            if (!employeeId) {
                throw new Error('Employee ID not found');
            }
            
            if (!token) {
                throw new Error('Auth token not found');
            }

            // Build URL with client type filter if no visits exist for this date
            let url = `https://unbalkingly-uncharged-elizabet.ngrok-free.dev/store/filteredValues?page=0&size=20&sortBy=storeName&sortOrder=asc`;
            
            if (searchText.trim()) {
                url += `&storeName=${encodeURIComponent(searchText.trim())}`;
            }
            
            // If no visits exist for this date, only show Dealer type stores
            if (!hasVisitsForDate) {
                url += `&clientType=Dealer`;
                console.log('🔵 [FETCH STORES] No visits exist for date, filtering for Dealer stores only');
            }

            const response = await axios.get(url, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'ngrok-skip-browser-warning': 'true',
                    'User-Agent': 'IconMobile',
                }
            });

            // Check if response is HTML instead of JSON
            const isHtmlResponse = typeof response.data === 'string' && 
                (response.data.includes('<!DOCTYPE html>') || response.data.includes('<html>'));
            
            if (isHtmlResponse) {
                console.log('⚠️ [FETCH STORES] Server returned HTML instead of JSON');
                setStores([]);
                return;
            }

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
        // Load role to conditionally show/hide '+' for AVP
        (async () => {
            try {
                const role = await AsyncStorage.getItem('employeeRole');
                if (role) setEmployeeRole(role);
            } catch (e) {
                // noop
            }
        })();
        if (isModalVisible) {
            fetchStores('');
        } else {
            setStores([]);
            setStoreSearchText('');
            setSelectedStore(null);
        }
    }, [isModalVisible]);

    const renderTimelineCard = ({ item }) => {
        if (item.type === 'activity') {
            return renderActivityCard({ item });
        } else {
            return renderVisitCard({ item });
        }
    };

    const renderActivityCard = ({ item: activity }) => {
        return (
            <View style={[styles.card, styles.activityCard]}>
                <View style={styles.cardContent}>
                    <View style={styles.cardHeader}>
                        <Text style={styles.activityTitle}>{activity.title}</Text>
                        <View style={[styles.statusContainer, { backgroundColor: '#9C27B0' }]}>
                            <Text style={styles.statusText}>Activity</Text>
                        </View>
                    </View>
                    
                    <View style={styles.visitDetails}>
                        <View style={styles.visitRow}>
                            <View style={styles.visitItem}>
                                <Ionicons name="calendar-outline" size={18} color="#6B7280" />
                                <Text style={styles.visitText}>{moment(activity.activityDate).format('DD MMM YYYY')}</Text>
                            </View>
                            <View style={styles.visitItem}>
                                <Ionicons name="document-text-outline" size={18} color="#6B7280" />
                                <Text style={styles.visitText}>{activity.description || 'No description'}</Text>
                            </View>
                        </View>
                    </View>
                    
                    <View style={styles.cardFooter}>
                        <View style={styles.footerLeft}>
                            <View style={styles.footerItem}>
                                <Ionicons name="briefcase-outline" size={16} color="#9CA3AF" />
                                <Text style={styles.footerText}>Activity</Text>
                            </View>
                        </View>
                        <View style={styles.footerRight}>
                            <View style={styles.footerItem}>
                                <Ionicons name="person-outline" size={16} color="#9CA3AF" />
                                <Text style={styles.footerText}>{activity.employeeName}</Text>
                            </View>
                        </View>
                    </View>
                </View>
            </View>
        );
    };

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

        const location = visit.village || visit.taluka || visit.city || 'N/A';

        const handleLocationPress = () => {
            const { storeLatitude, storeLongitude } = visit;
            const url = Platform.select({
                ios: `http://maps.apple.com/?daddr=${storeLatitude},${storeLongitude}`,
                android: `http://maps.google.com/maps?daddr=${storeLatitude},${storeLongitude}`,
            });

            Linking.openURL(url);
        };

        return (
            <TouchableOpacity
                style={styles.card}
                onPress={() =>
                    navigation.navigate('VisitScreen', { visitId: visit.id, authToken })
                }
            >
                <View style={styles.cardContent}>
                    <View style={styles.cardHeader}>
                        <Text style={styles.storeName}>{visit.storeName}</Text>
                        <View style={[styles.statusContainer, { backgroundColor: getStatusColor(visit.status) }]}>
                            <Text style={styles.statusText}>{visit.status}</Text>
                        </View>
                    </View>
                    
                    <View style={styles.visitDetails}>
                        <View style={styles.visitRow}>
                            <View style={styles.visitItem}>
                                <Ionicons name="calendar-outline" size={18} color="#6B7280" />
                                <Text style={styles.visitText}>{moment(visit.visit_date).format('DD MMM YYYY')}</Text>
                            </View>
                            <View style={styles.visitItem}>
                                <Ionicons name="bookmark-outline" size={18} color="#6B7280" />
                                <Text style={styles.visitText}>{visit.purpose || 'N/A'}</Text>
                            </View>
                        </View>
                    </View>
                    
                    <View style={styles.cardFooter}>
                        <View style={styles.footerLeft}>
                            {formattedDuration && (
                                <View style={styles.footerItem}>
                                    <Ionicons name="time-outline" size={16} color="#9CA3AF" />
                                    <Text style={styles.footerText}>{formattedDuration}</Text>
                                </View>
                            )}
                        </View>
                        <View style={styles.footerRight}>
                            <View style={styles.footerItem}>
                                <Ionicons name="person-outline" size={16} color="#9CA3AF" />
                                <Text style={styles.footerText}>{visit.employeeName}</Text>
                            </View>
                        </View>
                    </View>
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <View style={styles.container}>
            <CustomDatePicker 
                selectedDate={selectedDate} 
                onDateChange={handleDateChange}
            />
            <View style={styles.filtersContainer}>
                <TextInput
                    style={styles.filterInput}
                    placeholder="Filter by name"
                    value={filters.customerName}
                    onChangeText={(value) => handleFilterChange('customerName', value)}
                    placeholderTextColor="#9CA3AF"
                />
                <TextInput
                    style={styles.filterInput}
                    placeholder="Filter by purpose"
                    value={filters.purpose}
                    onChangeText={(value) => handleFilterChange('purpose', value)}
                    placeholderTextColor="#9CA3AF"
                />
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
                 <FlatList
                     data={filteredTimelineData}
                     renderItem={renderTimelineCard}
                     keyExtractor={(item) => `${item.type}-${item.id}`}
                     contentContainerStyle={styles.listContainer}
                     ListEmptyComponent={() => (
                         <Text style={styles.noVisitsText}>No visits or activities found for this date</Text>
                     )}
                 />
             )}
            {String(employeeRole).toUpperCase() !== 'AVP' && (
                <TouchableOpacity style={styles.addButton} onPress={openCreateOptions}>
                    <Ionicons name="add" size={24} color="white" />
                </TouchableOpacity>
            )}

            {/* Create Options Modal */}
            <Modal
                visible={showCreateOptions}
                animationType="slide"
                transparent={true}
                onRequestClose={closeCreateOptions}
            >
                <View style={styles.modalBackground}>
                    <View style={styles.createOptionsContainer}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Create New</Text>
                            <TouchableOpacity style={styles.closeButton} onPress={closeCreateOptions}>
                                <Ionicons name="close" size={24} color="#000" />
                            </TouchableOpacity>
                        </View>
                        
                        <View style={styles.optionsContainer}>
                            <TouchableOpacity style={styles.optionButton} onPress={openVisitModal}>
                                <View style={styles.optionIconContainer}>
                                    <Ionicons name="business-outline" size={32} color="#4F46E5" />
                                </View>
                                <Text style={styles.optionTitle}>Visit</Text>
                                <Text style={styles.optionDescription}>Create a customer visit</Text>
                            </TouchableOpacity>
                            
                            <TouchableOpacity style={styles.optionButton} onPress={openActivityModal}>
                                <View style={styles.optionIconContainer}>
                                    <Ionicons name="briefcase-outline" size={32} color="#9C27B0" />
                                </View>
                                <Text style={styles.optionTitle}>Activity</Text>
                                <Text style={styles.optionDescription}>Log a work activity</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            <Modal
                visible={isModalVisible}
                animationType="slide"
                onRequestClose={closeModal}
                transparent={true}
            >
                <View style={styles.modalBackground}>
                    <View style={styles.modalContainer}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Create Visit</Text>
                            <TouchableOpacity style={styles.closeButton} onPress={closeModal}>
                                <Ionicons name="close" size={24} color="#000" />
                            </TouchableOpacity>
                        </View>

                         {!selectedStore ? (
                             <View style={styles.storeSection}>
                                 <Text style={styles.sectionTitle}>Select Store</Text>
                                 
                                 {/* Show restriction message when no visits exist */}
                                 {!hasVisitsForDate && (
                                     <View style={styles.restrictionBanner}>
                                         <Ionicons name="information-circle" size={20} color="#F59E0B" />
                                         <Text style={styles.restrictionText}>
                                             No visits exist for this date. Only Dealer stores are available for new visits.
                                         </Text>
                                     </View>
                                 )}
                                 
                                 <View style={styles.searchInputContainer}>
                                     <Ionicons name="search" size={20} color="#999" style={styles.searchIcon} />
                                     <TextInput
                                         style={styles.searchInput}
                                         placeholder={hasVisitsForDate ? "Search stores by name" : "Search Dealer stores by name"}
                                         value={storeSearchText}
                                         onChangeText={handleStoreSearchChange}
                                         placeholderTextColor="#999"
                                     />
                                 </View>
                                
                                <FlatList
                                    data={stores}
                                    renderItem={({ item }) => (
                                        <TouchableOpacity
                                            style={styles.storeItem}
                                            onPress={() => handleStoreSelect(item)}
                                        >
                                            <View style={styles.storeItemContent}>
                                                <Text style={styles.storeItemName}>{item.storeName}</Text>
                                                <View style={styles.storeItemGrid}>
                                                    <View style={styles.storeItemColumn}>
                                                        <View style={styles.storeItemRow}>
                                                            <Ionicons name="person-outline" size={14} color="#6B7280" />
                                                            <Text style={styles.storeItemText} numberOfLines={1}>
                                                                {item.clientFirstName} {item.clientLastName}
                                                            </Text>
                                                        </View>
                                                        <View style={styles.storeItemRow}>
                                                            <Ionicons name="business-outline" size={14} color="#6B7280" />
                                                            <Text style={styles.storeItemText} numberOfLines={1}>
                                                                {item.clientType || 'N/A'}
                                                            </Text>
                                                        </View>
                                                    </View>
                                                    <View style={styles.storeItemColumn}>
                                                        <View style={styles.storeItemRow}>
                                                            <Ionicons name="location-outline" size={14} color="#6B7280" />
                                                            <Text style={styles.storeItemText} numberOfLines={1}>
                                                                {item.city}
                                                            </Text>
                                                        </View>
                                                    </View>
                                                </View>
                                            </View>
                                        </TouchableOpacity>
                                    )}
                                    keyExtractor={(item) => (item?.storeId || '').toString()}
                                    ListEmptyComponent={() => (
                                        <Text style={styles.noStoresText}>
                                            {isStoreLoading ? 'Searching...' : 
                                             storeSearchText.trim() ? 'No stores found matching your search' : 
                                             'No stores available'}
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
                                    <TouchableOpacity style={styles.createButton} onPress={createVisit}>
                                        <Text style={styles.createButtonText}>Create Visit</Text>
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

             {/* Activity Creation Modal */}
             <Modal
                 visible={isActivityModalVisible}
                 animationType="slide"
                 onRequestClose={closeActivityModal}
                 transparent={true}
             >
                 <View style={styles.modalBackground}>
                     <View style={styles.modalContainer}>
                         <View style={styles.modalHeader}>
                             <Text style={styles.modalTitle}>Create Activity</Text>
                             <TouchableOpacity style={styles.closeButton} onPress={closeActivityModal}>
                                 <Ionicons name="close" size={24} color="#000" />
                             </TouchableOpacity>
                         </View>

                         <ScrollView contentContainerStyle={styles.scrollContent}>
                             <View style={styles.inputContainer}>
                                 <Text style={styles.label}>Activity Title *</Text>
                                 <TextInput
                                     style={styles.input}
                                     placeholder="Enter activity title"
                                     value={newActivityDetails.title}
                                     onChangeText={(text) => setNewActivityDetails({ ...newActivityDetails, title: text })}
                                     placeholderTextColor="#999"
                                 />
                             </View>

                             <View style={styles.inputContainer}>
                                 <Text style={styles.label}>Description</Text>
                                 <TextInput
                                     style={[styles.input, styles.textArea]}
                                     placeholder="Enter activity description (optional)"
                                     value={newActivityDetails.description}
                                     onChangeText={(text) => setNewActivityDetails({ ...newActivityDetails, description: text })}
                                     placeholderTextColor="#999"
                                     multiline={true}
                                     numberOfLines={4}
                                     textAlignVertical="top"
                                 />
                             </View>

                             <View style={styles.inputContainer}>
                                 <Text style={styles.label}>Activity Date</Text>
                                 <TouchableOpacity
                                     style={styles.dateButton}
                                     onPress={() => setPickerVisible(true)}
                                 >
                                     <Text style={styles.dateButtonText}>
                                         {format(newActivityDetails.activityDate, 'MMMM d, yyyy')}
                                     </Text>
                                 </TouchableOpacity>
                             </View>

                             <TouchableOpacity style={styles.createButton} onPress={createActivityAPI}>
                                 <Text style={styles.createButtonText}>Create Activity</Text>
                             </TouchableOpacity>
                         </ScrollView>
                     </View>
                 </View>
             </Modal>

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
            <ConfirmationBottomSheet />
            <OngoingVisitBottomSheet />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 16,
        backgroundColor: '#f5f5f5',
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
        justifyContent: 'space-between',
        marginBottom: 16,
        backgroundColor: '#F9FAFB',
        padding: 12,
        borderRadius: 8,
    },
    filterInput: {
        flex: 1,
        height: 40,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        borderRadius: 8,
        paddingHorizontal: 12,
        fontSize: 16,
        color: '#1F2937',
        marginRight: 12,
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
        paddingBottom: 80,
    },
    card: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        marginHorizontal: 4,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
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
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 12,
    },
    storeName: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#1F2937',
        flex: 1,
        marginRight: 8,
    },
    statusContainer: {
        borderRadius: 16,
        paddingHorizontal: 12,
        paddingVertical: 6,
        alignSelf: 'flex-start',
    },
    statusText: {
        fontSize: 12,
        fontWeight: '600',
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
        backgroundColor: '#F3F4F6',
        borderRadius: 10,
        paddingHorizontal: 12,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    searchInput: {
        flex: 1,
        fontSize: 16,
        color: '#1F2937',
        paddingVertical: 12,
    },
    searchIcon: {
        marginRight: 8,
    },
    storeItem: {
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
        backgroundColor: '#FFFFFF',
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
        marginBottom: 12,
    },
    visitRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    visitItem: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    visitText: {
        fontSize: 14,
        color: '#6B7280',
        marginLeft: 8,
        flex: 1,
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
        paddingTop: 12,
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
    },
    footerText: {
        fontSize: 13,
        color: '#9CA3AF',
        marginLeft: 6,
        fontWeight: '500',
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
        paddingBottom: 20,
    },
    noStoresText: {
        textAlign: 'center',
        color: '#6B7280',
        fontSize: 16,
        paddingVertical: 16,
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
    storeItemContent: {
        flex: 1,
    },
    storeItemName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1F2937',
        marginBottom: 4,
    },
    storeItemGrid: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    storeItemColumn: {
        flex: 1,
        marginRight: 8,
    },
    storeItemRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 2,
    },
    storeItemText: {
        fontSize: 13,
        color: '#6B7280',
        marginLeft: 4,
        flex: 1,
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
         justifyContent: 'space-around',
         marginTop: 20,
     },
     optionButton: {
         alignItems: 'center',
         padding: 20,
         borderRadius: 12,
         backgroundColor: '#F9FAFB',
         borderWidth: 1,
         borderColor: '#E5E7EB',
         width: '45%',
     },
     optionIconContainer: {
         width: 60,
         height: 60,
         borderRadius: 30,
         backgroundColor: '#F3F4F6',
         alignItems: 'center',
         justifyContent: 'center',
         marginBottom: 12,
     },
     optionTitle: {
         fontSize: 16,
         fontWeight: 'bold',
         color: '#1F2937',
         marginBottom: 4,
     },
     optionDescription: {
         fontSize: 12,
         color: '#6B7280',
         textAlign: 'center',
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
