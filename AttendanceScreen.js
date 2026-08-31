import { API_BASE_URL } from './config/api';
import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, ScrollView, FlatList, TextInput, Alert, Dimensions, Modal as RNModal, ActivityIndicator, useWindowDimensions } from 'react-native';
import { BarChart } from 'react-native-chart-kit';
import Icon from 'react-native-vector-icons/FontAwesome5';
import { Ionicons } from '@expo/vector-icons';
import Modal from 'react-native-modal';
import { Calendar } from 'react-native-calendars';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { summarizeAttendanceDays, isPaidLeaveDate } from './utils/attendanceSummary';

const AttendanceScreen = () => {
    const { width: windowWidth, height: windowHeight } = useWindowDimensions();
    const [attendanceData, setAttendanceData] = useState({
        totalDays: 30,
        fullDays: 0,
        halfDays: 0,
        absentDays: 0,
        paidLeaveDays: 0,
    });
    const [totalVisits, setTotalVisits] = useState(0);
    const [totalStores, setTotalStores] = useState(0);
    const [isMonthPickerVisible, setMonthPickerVisible] = useState(false);
    const [isYearPickerVisible, setYearPickerVisible] = useState(false);
    const [authToken, setAuthToken] = useState(null);
    const [employeeId, setEmployeeId] = useState(null);
    const navigation = useNavigation();
    const isFocused = useIsFocused();
    const [requestNotice, setRequestNotice] = useState('');
    const [attendanceLoadError, setAttendanceLoadError] = useState('');
    const currentDate = new Date();
    const currentMonth = currentDate.toLocaleString('default', { month: 'long' });
    const currentYear = currentDate.getFullYear();

    const [selectedMonth, setSelectedMonth] = useState(currentMonth);
    const [selectedYear, setSelectedYear] = useState(currentYear.toString());

    const months = [
        'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'
    ];

    const years = ['2023', '2024', '2025', '2026', '2027', '2028', '2029', '2030', '2031', '2032', '2033'];

    const [isRegularizationModalVisible, setRegularizationModalVisible] = useState(false);
    const [regularizationDate, setRegularizationDate] = useState(new Date()); // Today's date
    const [regularizationStatus, setRegularizationStatus] = useState('Full Day');
    const [regularizationDescription, setRegularizationDescription] = useState('');
    const [regularizationReason, setRegularizationReason] = useState('');
    const [regularizationCustomReason, setRegularizationCustomReason] = useState('');
    const [regularizationRequests, setRegularizationRequests] = useState([]);
    const [isPickerVisible, setPickerVisible] = useState(false);
    const [isReasonPickerVisible, setIsReasonPickerVisible] = useState(false);
    const [regularizationSubmitError, setRegularizationSubmitError] = useState(null);
    const [isSubmittingRegularization, setIsSubmittingRegularization] = useState(false);
    const [requestDateCheck, setRequestDateCheck] = useState({ date: '', status: 'checking' });
    const requestDateKey = format(regularizationDate, 'yyyy-MM-dd');
    const requestDateStatus = isPaidLeaveDate(requestDateKey) ? 'paid'
        : requestDateCheck.date === requestDateKey ? requestDateCheck.status : 'checking';
    const canSubmitRequest = requestDateStatus === 'allowed' && !isSubmittingRegularization;

    const getRequestDateRecords = async (dateKey, token, id) => {
        if (!token || !id) throw new Error('Sign in required');
        const response = await axios.get(`${API_BASE_URL}/salary-calculation/daily-breakdown?employeeId=${id}&startDate=${dateKey}&endDate=${dateKey}`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        if (!Array.isArray(response.data)) throw new Error('Invalid attendance response');
        return response.data.filter((row) => String(row.employeeId) === String(id));
    };

    useEffect(() => {
        if (!isRegularizationModalVisible) return;
        let active = true;
        if (isPaidLeaveDate(requestDateKey)) {
            setRequestDateCheck({ date: requestDateKey, status: 'paid' });
            return;
        }
        setRequestDateCheck({ date: requestDateKey, status: 'checking' });
        const checkDate = async () => {
            try {
                const token = await AsyncStorage.getItem('userToken');
                const id = await AsyncStorage.getItem('employeeId');
                const records = await getRequestDateRecords(requestDateKey, token, id);
                if (active) setRequestDateCheck({ date: requestDateKey, status: isPaidLeaveDate(requestDateKey, records) ? 'paid' : 'allowed' });
            } catch {
                if (active) setRequestDateCheck({ date: requestDateKey, status: 'error' });
            }
        };
        checkDate();
        return () => { active = false; };
    }, [requestDateKey, isRegularizationModalVisible]);
    
    const reasonOptions = [
        'Office meeting',
        'Other office work',
        'Exhibition',
        'Request a leave',
        'Payment follow up',
        'Site complaint issue',
        'Other'
    ];

    // Build marked dates for the calendar: highlight selected date and any days with requests
    const markedDates = useMemo(() => {
        const marks = {};

        // Mark all existing requests with a subtle dot
        regularizationRequests.forEach((req) => {
            if (!req?.logDate) return;
            const key = format(new Date(req.logDate), 'yyyy-MM-dd');
            if (!marks[key]) {
                marks[key] = { marked: true, dotColor: '#F97316' }; // orange dot for requested days
            } else {
                marks[key].marked = true;
                marks[key].dotColor = '#F97316';
            }
        });

        // Ensure currently selected date is highlighted
        const selectedKey = format(regularizationDate, 'yyyy-MM-dd');
        marks[selectedKey] = {
            ...(marks[selectedKey] || {}),
            selected: true,
            selectedColor: '#2563EB',
        };

        return marks;
    }, [regularizationDate, regularizationRequests]);

    useEffect(() => {
        if (!isFocused) return;
        fetchAttendanceData();
        const timer = setInterval(fetchAttendanceData, 15000);
        return () => clearInterval(timer);
    }, [selectedMonth, selectedYear, authToken, isFocused]);

    useEffect(() => {
        if (!requestNotice) return;
        const timer = setTimeout(() => setRequestNotice(''), 3000);
        return () => clearTimeout(timer);
    }, [requestNotice]);

    const fetchAttendanceData = async () => {
        try {
            const token = await AsyncStorage.getItem('userToken');
            const id = await AsyncStorage.getItem('employeeId');
            const monthIndex = months.indexOf(selectedMonth);

            const response = await axios.get(`${API_BASE_URL}/attendance-log/monthlyVisits?date=${selectedYear}-${String(monthIndex + 1).padStart(2, '0')}-01&employeeId=${id}`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });
            const data = response.data;

            const startDate = format(new Date(Number(selectedYear), monthIndex, 1), 'yyyy-MM-dd');
            const endDate = format(new Date(Number(selectedYear), monthIndex + 1, 0), 'yyyy-MM-dd');
            // Employee-scoped daily records avoid double-counting approved Sunday requests.
            const dailyResponse = await axios.get(`${API_BASE_URL}/salary-calculation/daily-breakdown?employeeId=${id}&startDate=${startDate}&endDate=${endDate}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!Array.isArray(dailyResponse.data)) throw new Error('Invalid daily attendance response');
            const ownRecords = dailyResponse.data.filter((row) => String(row.employeeId) === String(id));
            setAttendanceData(summarizeAttendanceDays(ownRecords, Number(selectedYear), monthIndex));
            setAttendanceLoadError('');
            setTotalVisits(data.monthlyCount);
            setTotalStores(data.uniqueStoreCount);

            // Fetch regularization requests after attendance data is fetched
            fetchRegularizationRequests();
        } catch (error) {
            setAttendanceLoadError('Could not refresh attendance. The totals may be out of date. Please try again.');
        }
    };

    const fetchRegularizationRequests = async () => {
        try {
            const token = await AsyncStorage.getItem('userToken');
            const currentEmployeeId = await AsyncStorage.getItem('employeeId');
            const startDate = startOfMonth(new Date(selectedYear, months.indexOf(selectedMonth)));
            const endDate = endOfMonth(new Date(selectedYear, months.indexOf(selectedMonth)));

            if (!currentEmployeeId) {
                console.warn('[Attendance] Unable to scope attendance requests: no employee ID is stored.');
                setRegularizationRequests([]);
                return;
            }

            const requestRange = {
                start: format(startDate, 'yyyy-MM-dd'),
                end: format(endDate, 'yyyy-MM-dd'),
            };

            console.log('[Attendance] getByDateRange request', {
                employeeId: currentEmployeeId,
                ...requestRange,
            });

            const response = await axios.get(
                `${API_BASE_URL}/request/getByDateRange?start=${requestRange.start}&end=${requestRange.end}`,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            );

            const allRequests = Array.isArray(response.data) ? response.data : [];
            const employeeRequests = allRequests.filter((request) => {
                const requestEmployeeId = request?.employeeId ?? request?.employee?.id ?? request?.employee?.employeeId;
                return String(requestEmployeeId ?? '') === String(currentEmployeeId);
            });
            const unscopedCount = allRequests.length - employeeRequests.length;

            console.log('[Attendance] getByDateRange response', {
                employeeId: currentEmployeeId,
                receivedCount: allRequests.length,
                visibleCount: employeeRequests.length,
                requests: employeeRequests.map((request) => ({
                    id: request.id,
                    employeeId: request.employeeId,
                    logDate: request.logDate,
                    requestedStatus: request.requestedStatus,
                    status: request.status,
                })),
            });

            if (unscopedCount > 0) {
                console.warn('[Attendance] The API returned attendance requests for other employees. They were hidden in the mobile UI, but the backend endpoint must enforce this scope.', {
                    currentEmployeeId,
                    unscopedCount,
                });
            }

            setRegularizationRequests(employeeRequests);
        } catch (error) {
            console.error('Error fetching regularization requests:', error);
            Alert.alert('Error', 'Failed to fetch regularization requests. Please try again.');
        }
    };

    const goBack = () => {
        navigation.goBack();
    };

    const handleMonthChange = (month) => {
        setSelectedMonth(month);
        setMonthPickerVisible(false);
    };

    const handleYearChange = (year) => {
        setSelectedYear(year);
        setYearPickerVisible(false);
    };

    const handleRegularizationRequest = async () => {
        if (!canSubmitRequest) {
            return;
        }

        setRegularizationSubmitError(null);
        setIsSubmittingRegularization(true);

        try {
            // Validate reason
            if (!regularizationReason) {
                setRegularizationSubmitError({ type: 'generic', title: 'Reason required', message: 'Select a reason for your attendance request.' });
                return;
            }

            // Validate custom reason if "Other" is selected
            if (regularizationReason === 'Other' && (!regularizationCustomReason || regularizationCustomReason.trim().length < 3)) {
                setRegularizationSubmitError({ type: 'generic', title: 'Reason required', message: 'Enter a reason with at least 3 characters.' });
                return;
            }

            // Validate description
            if (!regularizationDescription || regularizationDescription.trim().length < 10) {
                setRegularizationSubmitError({ type: 'generic', title: 'Details required', message: 'Explain your request in at least 10 characters.' });
                return;
            }

            // Validate date - allow from 2 days ago to future dates
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const selectedDate = new Date(regularizationDate);
            selectedDate.setHours(0, 0, 0, 0);
            const twoDaysAgo = new Date(today);
            twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

            if (selectedDate < twoDaysAgo) {
                setRegularizationSubmitError({ type: 'generic', title: 'Invalid attendance date', message: 'Choose a date from two days ago onwards.' });
                return;
            }

            const token = await AsyncStorage.getItem('userToken');
            const employeeId = await AsyncStorage.getItem('employeeId');
            // Recheck immediately before creating: an admin may have changed the day
            // while this form was open. Never create a request on Paid Leave.
            const dateRecords = await getRequestDateRecords(requestDateKey, token, employeeId);
            if (isPaidLeaveDate(requestDateKey, dateRecords)) {
                setRequestDateCheck({ date: requestDateKey, status: 'paid' });
                return;
            }

            // Determine the reason value - use custom reason if "Other" is selected
            const reasonValue = regularizationReason === 'Other' 
                ? regularizationCustomReason.trim() 
                : regularizationReason;

            const requestPayload = {
                employeeId: parseInt(employeeId),
                logDate: format(regularizationDate, 'yyyy-MM-dd'),
                requestedStatus: regularizationStatus.toLowerCase(),
                description: regularizationDescription.trim(),
                reason: reasonValue,
            };

            console.log('Create Regularization Request Payload:', JSON.stringify(requestPayload, null, 2));

            const response = await axios.post(
                `${API_BASE_URL}/request/create`,
                requestPayload,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    }
                }
            );

            console.log('Create Regularization Request Response:', JSON.stringify(response.data, null, 2));

            if (response.status === 200 || response.status === 201) {
                setRegularizationModalVisible(false);
                setPickerVisible(false);
                setIsReasonPickerVisible(false);
                // Reset the form silently
                setRegularizationDate(new Date());
                setRegularizationStatus('Full Day');
                setRegularizationDescription('');
                setRegularizationReason('');
                setRegularizationCustomReason('');
                setRegularizationSubmitError(null);
                setRequestNotice('Attendance request submitted. Pending approval.');
                fetchRegularizationRequests();
            } else {
                throw new Error('Failed to create regularization request');
            }
        } catch (error) {
            console.error('Error creating regularization request:', error);
            console.log('Request Error Response:', error.response?.data);
            const responseData = error?.response?.data || {};
            const isDuplicateRequest = error?.response?.status === 409 || responseData?.code === 'DUPLICATE_DATA';

            setRegularizationSubmitError({
                type: isDuplicateRequest ? 'duplicate' : 'generic',
                title: isDuplicateRequest ? 'Attendance request already exists' : 'Unable to submit request',
                message: isDuplicateRequest
                    ? `You already have an attendance request for ${format(regularizationDate, 'd MMM yyyy')}. Check its status below or choose another date.`
                    : 'We could not submit your request. Please check your connection and try again.',
            });
        } finally {
            setIsSubmittingRegularization(false);
        }
    };

    const renderBottomSheet = (data, onSelect, isVisible, onClose, title, coverScreen = true) => (
        <Modal
            coverScreen={coverScreen}
            deviceWidth={windowWidth}
            deviceHeight={windowHeight}
            isVisible={isVisible}
            onBackdropPress={onClose}
            onBackButtonPress={onClose}
            style={styles.bottomModal}
            swipeDirection="down"
            onSwipeComplete={onClose}
            animationIn="slideInUp"
            animationOut="slideOutDown"
        >
            <View style={styles.bottomSheetContainer}>
                <View style={styles.bottomSheetHandle} />
                <View style={styles.bottomSheetHeader}>
                    <Text style={styles.bottomSheetTitle}>{title}</Text>
                    <TouchableOpacity onPress={onClose}>
                        <Ionicons name="close" size={24} color="#333" />
                    </TouchableOpacity>
                </View>
                <FlatList
                    data={data}
                    keyExtractor={(item) => item}
                    renderItem={({ item }) => (
                        <TouchableOpacity accessibilityRole="button" style={styles.bottomSheetItem} onPress={() => onSelect(item)}>
                            <Text style={styles.bottomSheetItemText}>{item}</Text>
                        </TouchableOpacity>
                    )}
                />
            </View>
        </Modal>
    );

    const toAttendanceNumber = (value) => {
        const numericValue = Number(value);
        return Number.isFinite(numericValue) ? numericValue : 0;
    };

    const attendanceSummaryItems = [
        { icon: 'calendar-check', label: 'Total Days', value: toAttendanceNumber(attendanceData.totalDays), color: '#6C63FF', tint: '#F0F0FF' },
        { icon: 'sun', label: 'Full Days', value: toAttendanceNumber(attendanceData.fullDays), color: '#2FA36B', tint: '#EAF7F0' },
        { icon: 'cloud-sun', label: 'Half Days', value: toAttendanceNumber(attendanceData.halfDays), color: '#F97316', tint: '#FFF4E8' },
        { icon: 'calendar-check', label: 'Paid Leave', value: toAttendanceNumber(attendanceData.paidLeaveDays), color: '#7C3AED', tint: '#F5F3FF' },
        { icon: 'times-circle', label: 'Absent', value: toAttendanceNumber(attendanceData.absentDays), color: '#BE123C', tint: '#FFF1F2' },
    ];
    // Keep chart labels, values, order, and colors aligned with the summary.
    const attendanceBars = attendanceSummaryItems.slice(1);
    const maxAttendanceValue = Math.max(12, ...attendanceBars.map((item) => item.value));

    return (
        <SafeAreaView style={styles.container}>
            {attendanceLoadError ? <Text accessibilityRole="alert" style={{ color: '#BE123C', padding: 12 }}>{attendanceLoadError}</Text> : null}
            <View style={styles.header}>
                <TouchableOpacity style={styles.backButton} onPress={goBack} accessibilityLabel="Go back">
                    <Icon name="chevron-left" size={22} color="#6C63FF" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>My Attendance</Text>
                <View style={styles.headerSpacer} />
            </View>
            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                <View style={styles.filtersContainer}>
                    <TouchableOpacity style={[styles.filterItem, styles.cardShadow]} onPress={() => setMonthPickerVisible(true)}>
                        <Icon name="calendar-alt" size={18} color="#6C63FF" style={styles.filterIcon} />
                        <Text style={styles.filterText}>{selectedMonth}</Text>
                        <Icon name="chevron-down" size={12} color="#666" style={styles.filterChevron} />
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.filterItem, styles.cardShadow]} onPress={() => setYearPickerVisible(true)}>
                        <Icon name="calendar" size={18} color="#6C63FF" style={styles.filterIcon} />
                        <Text style={styles.filterText}>{selectedYear}</Text>
                        <Icon name="chevron-down" size={12} color="#666" style={styles.filterChevron} />
                    </TouchableOpacity>
                </View>
                <View style={[styles.kpiSection, styles.cardShadow]}>
                    <View style={styles.summaryHeader}>
                        <View style={styles.summaryIcon}>
                            <Icon name="calendar-alt" size={26} color="#6C63FF" />
                        </View>
                        <View style={styles.summaryTitleWrap}>
                            <Text style={styles.summaryTitle}>Month Summary</Text>
                            <Text style={styles.summarySubtitle}>{selectedMonth} {selectedYear}</Text>
                        </View>
                    </View>
                    <View style={styles.summaryStatsCard}>
                        {attendanceSummaryItems.map((item, index) => (
                            <View key={item.label} style={styles.summaryStatWrap}>
                                <View style={styles.kpiItem}>
                                    <View style={[styles.statIconCircle, { backgroundColor: item.tint }]}>
                                        <Icon name={item.icon} size={18} color={item.color} />
                                    </View>
                                    <Text style={styles.kpiLabel} numberOfLines={2}>{item.label}</Text>
                                    <Text style={[styles.kpiValue, { color: item.color }]}>{item.value}</Text>
                                </View>
                                {index < attendanceSummaryItems.length - 1 && <View style={styles.summaryDivider} />}
                            </View>
                        ))}
                    </View>
                </View>
                <View style={[styles.chartSection, styles.cardShadow]}>
                    <View style={styles.cardTitleRow}>
                        <View style={styles.cardTitleIcon}><Icon name="chart-bar" size={18} color="#6C63FF" /></View>
                        <Text style={styles.chartTitle}>Attendance Breakdown</Text>
                    </View>
                    <View style={styles.chartBarsRow}>
                        {attendanceBars.map((item) => {
                            const barHeight = item.value > 0 ? Math.max(4, (item.value / maxAttendanceValue) * 100) : 0;
                            return (
                                <View key={item.label} style={styles.barColumn}>
                                    <Text style={[styles.barValue, { color: item.color }]}>{item.value}</Text>
                                    <View style={styles.barTrack}>
                                        <View style={[styles.barFill, { height: `${barHeight}%`, backgroundColor: item.color }]} />
                                    </View>
                                    <Text style={styles.barLabel} numberOfLines={2}>{item.label}</Text>
                                </View>
                            );
                        })}
                    </View>
                </View>
                <View style={[styles.visitsStoresSection, styles.cardShadow]}>
                    <View style={styles.visitsSection}>
                        <View style={styles.visitStoreIcon}><Icon name="walking" size={22} color="#6C63FF" /></View>
                        <View style={styles.visitStoreTextWrap}>
                            <Text style={styles.visitsLabel}>Total Visits</Text>
                            <Text style={styles.visitsValue}>{totalVisits}</Text>
                            <Text style={styles.thisMonthLabel}>This Month</Text>
                        </View>
                    </View>
                    <View style={styles.metricDivider} />
                    <View style={styles.storesSection}>
                        <View style={styles.visitStoreIcon}><Icon name="store" size={22} color="#6C63FF" /></View>
                        <View style={styles.visitStoreTextWrap}>
                            <Text style={styles.storesLabel}>Total Stores</Text>
                            <Text style={styles.storesValue}>{totalStores}</Text>
                            <Text style={styles.thisMonthLabel}>This Month</Text>
                        </View>
                    </View>
                </View>
                <TouchableOpacity
                    style={styles.regularizationButton}
                    onPress={() => {
                        setRegularizationSubmitError(null);
                        setRegularizationModalVisible(true);
                    }}
                >
                    <Icon name="clipboard-list" size={18} color="#fff" style={styles.regularizationButtonIcon} />
                    <Text style={styles.regularizationButtonText}>Request attendance change</Text>
                </TouchableOpacity>

                <View style={styles.requestsContainer}>
                    <Text style={styles.requestsTitle}>Attendance requests</Text>
                    {requestNotice ? <Text accessibilityRole="alert" style={styles.requestDescription}>{requestNotice}</Text> : null}
                    {regularizationRequests.map((request) => (
                        <View key={request.id} style={styles.requestItem}>
                            <View style={styles.requestInfo}>
                                <Text style={styles.requestDate}>{format(new Date(request.logDate), 'MMM d, yyyy')}</Text>
                                <Text style={styles.requestStatus}>{request.requestedStatus?.toLowerCase() === 'half day' ? 'Half Day' : 'Full Day'}</Text>
                                {request.reason ? <Text style={styles.requestDescription}>{request.reason}</Text> : null}
                                {request.description ? (
                                    <Text style={styles.requestDescription} numberOfLines={2}>
                                        {request.description}
                                    </Text>
                                ) : null}
                            </View>
                            <View style={[styles.requestStatusBadge, styles[request.status.toLowerCase()]]}>
                                <Text style={styles.requestStatusText}>{request.status?.charAt(0).toUpperCase() + request.status?.slice(1).toLowerCase()}</Text>
                            </View>
                        </View>
                    ))}
                </View>

                <View style={styles.bottomPadding} />
            </ScrollView>
            {renderBottomSheet(months, handleMonthChange, isMonthPickerVisible, () => setMonthPickerVisible(false), 'Select Month')}
            {renderBottomSheet(years, handleYearChange, isYearPickerVisible, () => setYearPickerVisible(false), 'Select Year')}
            <Modal
                isVisible={isRegularizationModalVisible}
                deviceWidth={windowWidth}
                deviceHeight={windowHeight}
                onBackButtonPress={() => {
                    if (isReasonPickerVisible) setIsReasonPickerVisible(false);
                    else setRegularizationModalVisible(false);
                }}
                onBackdropPress={() => {
                    if (isReasonPickerVisible) {
                        setIsReasonPickerVisible(false);
                        return;
                    }
                    setRegularizationModalVisible(false);
                    setRegularizationDescription('');
                    setRegularizationReason('');
                    setRegularizationCustomReason('');
                    setRegularizationSubmitError(null);
                }}
                style={styles.bottomModal}
            >
                <ScrollView style={{ maxHeight: '90%' }} contentContainerStyle={styles.modalContent} keyboardShouldPersistTaps="handled">
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>Request attendance change</Text>
                        <TouchableOpacity onPress={() => {
                            setIsReasonPickerVisible(false);
                            setRegularizationModalVisible(false);
                            setRegularizationDescription('');
                            setRegularizationReason('');
                            setRegularizationCustomReason('');
                            setRegularizationSubmitError(null);
                        }}>
                            <Ionicons name="close" size={24} color="#333" />
                        </TouchableOpacity>
                    </View>

                    {regularizationSubmitError && (
                        <View
                            style={[
                                styles.regularizationErrorCard,
                                regularizationSubmitError.type === 'generic' && styles.regularizationErrorCardGeneric,
                            ]}
                            accessibilityRole="alert"
                        >
                            <View style={styles.regularizationErrorIcon}>
                                <Ionicons
                                    name={regularizationSubmitError.type === 'duplicate' ? 'information-circle' : 'alert-circle'}
                                    size={22}
                                    color={regularizationSubmitError.type === 'duplicate' ? '#C2410C' : '#B91C1C'}
                                />
                            </View>
                            <View style={styles.regularizationErrorCopy}>
                                <Text style={styles.regularizationErrorTitle}>{regularizationSubmitError.title}</Text>
                                <Text style={styles.regularizationErrorMessage}>{regularizationSubmitError.message}</Text>
                            </View>
                            <TouchableOpacity
                                style={styles.regularizationErrorDismiss}
                                onPress={() => setRegularizationSubmitError(null)}
                                accessibilityLabel="Dismiss request error"
                            >
                                <Ionicons name="close" size={20} color="#6B7280" />
                            </TouchableOpacity>
                        </View>
                    )}

                    <Text style={styles.descriptionHelper}>Submit a change for approval. Attendance updates only after approval.</Text>
                    <Text style={styles.label}>Attendance date</Text>
                    <TouchableOpacity
                        style={styles.dateButton}
                        onPress={() => setPickerVisible(true)}
                    >
                        <Text style={styles.dateButtonText}>
                            {format(regularizationDate, 'MMMM d, yyyy')}
                        </Text>
                    </TouchableOpacity>

                    {requestDateStatus !== 'allowed' && (
                        <Text accessibilityRole="alert" style={styles.descriptionHelper}>
                            {requestDateStatus === 'paid'
                                ? 'This date is Paid Leave. No attendance request is needed. Please choose another date.'
                                : requestDateStatus === 'error'
                                    ? 'Could not check this date. Reopen the form to try again; requests are disabled until it is verified.'
                                    : 'Checking attendance for this date…'}
                        </Text>
                    )}

                    <Text style={styles.label}>Requested attendance</Text>
                    <View style={styles.statusButtons}>
                        <TouchableOpacity
                            style={[styles.statusButton, regularizationStatus === 'Full Day' && styles.selectedStatusButton]}
                            onPress={() => setRegularizationStatus('Full Day')}
                        >
                            <Text style={[styles.statusButtonText, regularizationStatus === 'Full Day' && styles.selectedStatusButtonText]}>Full Day</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.statusButton, regularizationStatus === 'Half Day' && styles.selectedStatusButton]}
                            onPress={() => setRegularizationStatus('Half Day')}
                        >
                            <Text style={[styles.statusButtonText, regularizationStatus === 'Half Day' && styles.selectedStatusButtonText]}>Half Day</Text>
                        </TouchableOpacity>
                    </View>

                    <Text style={styles.label}>Reason</Text>
                    <TouchableOpacity
                        style={styles.reasonSelectButton}
                        onPress={() => setIsReasonPickerVisible(value => !value)}
                        accessibilityRole="button"
                        accessibilityLabel="Select a reason"
                        accessibilityState={{ expanded: isReasonPickerVisible }}
                    >
                        <Text style={[styles.reasonSelectText, !regularizationReason && styles.placeholderText]}>
                            {regularizationReason || 'Select a reason'}
                        </Text>
                        <Ionicons name="chevron-down" size={20} color="#6C63FF" />
                    </TouchableOpacity>

                    {regularizationReason === 'Other' && (
                        <View style={styles.customReasonContainer}>
                            <Text style={styles.label}>Custom Reason</Text>
                            <TextInput
                                style={styles.customReasonInput}
                                value={regularizationCustomReason}
                                onChangeText={setRegularizationCustomReason}
                                placeholder="Enter your custom reason"
                                maxLength={100}
                            />
                        </View>
                    )}

                    <Text style={styles.label}>Details</Text>
                    <Text style={styles.descriptionHelper}>
                        Share a short reason so your manager understands what happened.
                    </Text>
                    <TextInput
                        style={styles.descriptionInput}
                        value={regularizationDescription}
                        onChangeText={setRegularizationDescription}
                        placeholder="E.g. Was late due to traffic but worked the full day."
                        multiline
                        numberOfLines={4}
                        maxLength={250}
                        textAlignVertical="top"
                    />
                    <Text style={styles.charCount}>{regularizationDescription.length}/250</Text>

                    <TouchableOpacity
                        style={[styles.submitButton, !canSubmitRequest && styles.submitButtonDisabled]}
                        onPress={handleRegularizationRequest}
                        disabled={!canSubmitRequest}
                        accessibilityRole="button"
                        accessibilityState={{ disabled: !canSubmitRequest, busy: isSubmittingRegularization }}
                    >
                        {isSubmittingRegularization ? (
                            <ActivityIndicator color="#FFFFFF" />
                        ) : (
                            <Text style={styles.submitButtonText}>Submit request</Text>
                        )}
                    </TouchableOpacity>
                </ScrollView>
                {/* Keep the picker in the form's native modal layer, above its content.
                    A sibling native modal can appear behind it on web/iOS. */}
                {renderBottomSheet(reasonOptions, (reason) => {
                    setRegularizationReason(reason);
                    setIsReasonPickerVisible(false);
                    setRegularizationSubmitError(null);
                    if (reason !== 'Other') setRegularizationCustomReason('');
                }, isReasonPickerVisible, () => setIsReasonPickerVisible(false), 'Select Reason', false)}
            </Modal>

            <RNModal visible={isPickerVisible} transparent animationType="slide">
                <View style={styles.calendarModalContainer}>
                    <View style={styles.calendarContainer}>
                        <Calendar
                            current={format(regularizationDate, 'yyyy-MM-dd')}
                            minDate={(() => {
                                const twoDaysAgo = new Date();
                                twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
                                return format(twoDaysAgo, 'yyyy-MM-dd');
                            })()}
                            maxDate={undefined} // Allow future dates
                            onDayPress={(day) => {
                                setRegularizationDate(new Date(`${day.dateString}T00:00:00`));
                                setRegularizationSubmitError(null);
                                setPickerVisible(false);
                            }}
                            markedDates={markedDates}
                        />
                        <View style={styles.calendarButtonContainer}>
                            <TouchableOpacity 
                                style={[styles.calendarButton, styles.cancelCalendarButton]} 
                                onPress={() => setPickerVisible(false)}
                            >
                                <Text style={styles.calendarButtonText}>Cancel</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </RNModal>
        </SafeAreaView>
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
        padding: 20,
        backgroundColor: '#fff',
    },
    backButton: {
        marginRight: 10,
    },
    headerTitle: {
        fontSize: 20,
        color: '#333',
    },
    filtersContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 10,
    },
    filterItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        padding: 10,
        borderRadius: 8,
    },
    filterIcon: {
        marginRight: 5,
    },
    filterText: {
        fontSize: 16,
        color: '#333',
    },
    kpiSection: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        padding: 20,
        backgroundColor: '#fff',
        borderRadius: 8,
        marginHorizontal: 20,
        marginVertical: 10,
    },
    kpiItem: {
        alignItems: 'center',
    },
    kpiValue: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#333',
    },
    kpiLabel: {
        fontSize: 14,
        color: '#666',
    },
    chartSection: {
        padding: 20,
        backgroundColor: '#fff',
        borderRadius: 8,
        marginHorizontal: 20,
        marginVertical: 10,
    },
    chartTitle: {
        fontSize: 18,
        marginBottom: 10,
    },
    visitsStoresSection: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        padding: 20,
        backgroundColor: '#fff',
        borderRadius: 8,
        marginHorizontal: 20,
        marginVertical: 10,
    },
    visitsSection: {
        alignItems: 'center',
    },
    visitsValue: {
        fontSize: 36,
        fontWeight: 'bold',
        color: '#333',
    },
    visitsLabel: {
        fontSize: 18,
        color: '#666',
    },
    storesSection: {
        alignItems: 'center',
    },
    storesValue: {
        fontSize: 36,
        fontWeight: 'bold',
        color: '#333',
    },
    storesLabel: {
        fontSize: 18,
        color: '#666',
    },
    cardShadow: {
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    bottomModal: {
        justifyContent: 'flex-end',
        margin: 0,
    },
    bottomSheetContainer: {
        backgroundColor: '#fff',
        padding: 20,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        maxHeight: '80%',
        minHeight: '50%',
    },
    bottomSheetHandle: {
        width: 40,
        height: 5,
        backgroundColor: '#ccc',
        borderRadius: 3,
        alignSelf: 'center',
        marginVertical: 10,
    },
    bottomSheetHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    bottomSheetTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        flex: 1,
        textAlign: 'center',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    bottomSheetItem: {
        paddingVertical: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#ccc',
    },
    bottomSheetItemText: {
        fontSize: 18,
        textAlign: 'center',
    },
    regularizationButton: {
        backgroundColor: '#6C63FF',
        padding: 15,
        borderRadius: 8,
        alignItems: 'center',
        marginHorizontal: 20,
        marginTop: 20,
    },
    regularizationButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    modalContent: {
        backgroundColor: '#fff',
        padding: 20,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
    },
    regularizationErrorCard: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        backgroundColor: '#FFF7ED',
        borderWidth: 1,
        borderColor: '#FED7AA',
        borderRadius: 12,
        padding: 12,
        marginBottom: 16,
    },
    regularizationErrorCardGeneric: {
        backgroundColor: '#FEF2F2',
        borderColor: '#FECACA',
    },
    regularizationErrorIcon: {
        marginTop: 1,
    },
    regularizationErrorCopy: {
        flex: 1,
        marginLeft: 10,
    },
    regularizationErrorTitle: {
        color: '#1F2937',
        fontSize: 14,
        fontWeight: '700',
        marginBottom: 3,
    },
    regularizationErrorMessage: {
        color: '#4B5563',
        fontSize: 13,
        lineHeight: 18,
    },
    regularizationErrorDismiss: {
        paddingLeft: 8,
        paddingVertical: 1,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        flex: 1,
        textAlign: 'center',
        color: '#333',
    },
    label: {
        fontSize: 14,
        fontWeight: 'bold',
        marginBottom: 10,
        color: '#555',
    },
    descriptionHelper: {
        fontSize: 12,
        color: '#6B7280',
        marginBottom: 8,
    },
    descriptionInput: {
        backgroundColor: '#f0f0f0',
        padding: 12,
        borderRadius: 8,
        minHeight: 80,
        fontSize: 16,
        color: '#333',
    },
    charCount: {
        fontSize: 12,
        color: '#9CA3AF',
        alignSelf: 'flex-end',
        marginTop: 4,
        marginBottom: 16,
    },
    dateButton: {
        backgroundColor: '#f0f0f0',
        padding: 15,
        borderRadius: 8,
        marginBottom: 20,
    },
    dateButtonText: {
        fontSize: 16,
        color: '#333',
        textAlign: 'center',
    },
    statusButtons: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 20,
    },
    statusButton: {
        backgroundColor: '#f0f0f0',
        padding: 15,
        borderRadius: 8,
        width: '48%',
        alignItems: 'center',
    },
    selectedStatusButton: {
        backgroundColor: '#6C63FF',
    },
    statusButtonText: {
        fontSize: 16,
        color: '#333',
    },
    selectedStatusButtonText: {
        color: '#fff',
    },
    submitButton: {
        backgroundColor: '#6C63FF',
        padding: 15,
        borderRadius: 8,
        alignItems: 'center',
    },
    submitButtonDisabled: {
        opacity: 0.65,
    },
    submitButtonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
    },
    reasonSelectButton: {
        backgroundColor: '#f0f0f0',
        padding: 15,
        borderRadius: 8,
        marginBottom: 20,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    reasonSelectText: {
        fontSize: 16,
        color: '#333',
        flex: 1,
    },
    placeholderText: {
        color: '#9CA3AF',
    },
    customReasonContainer: {
        marginBottom: 20,
    },
    customReasonInput: {
        backgroundColor: '#f0f0f0',
        padding: 12,
        borderRadius: 8,
        fontSize: 16,
        color: '#333',
        marginTop: 8,
    },
    requestsContainer: {
        marginHorizontal: 20,
        marginTop: 30,
    },
    requestsTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 15,
        color: '#333',
    },
    requestItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#fff',
        borderRadius: 8,
        padding: 15,
        marginBottom: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    requestInfo: {
        flex: 1,
    },
    requestDate: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
    },
    requestStatus: {
        fontSize: 14,
        color: '#666',
        marginTop: 5,
    },
    requestDescription: {
        fontSize: 14,
        color: '#4B5563',
        marginTop: 6,
    },
    requestStatusBadge: {
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 20,
    },
    pending: {
        backgroundColor: '#FFA500',
    },
    approved: {
        backgroundColor: '#4CAF50',
    },
    rejected: {
        backgroundColor: '#F44336',
    },
    requestStatusText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: 'bold',
    },
    bottomPadding: {
        height: 100, // Adjust this value as needed
    },
    calendarModalContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    calendarContainer: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 16,
        width: '90%',
    },
    calendarButtonContainer: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        marginTop: 16,
    },
    calendarButton: {
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 8,
        alignItems: 'center',
    },
    cancelCalendarButton: {
        backgroundColor: '#f2f2f2',
    },
    calendarButtonText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
    },
    scrollContent: {
        paddingBottom: 28,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 8,
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: '#E9EAF0',
    },
    backButton: {
        width: 40,
        height: 40,
        marginRight: 0,
        alignItems: 'flex-start',
        justifyContent: 'center',
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#1F2937',
    },
    headerSpacer: {
        width: 40,
        height: 40,
    },
    filtersContainer: {
        flexDirection: 'row',
        paddingHorizontal: 16,
        paddingTop: 12,
        paddingBottom: 6,
        gap: 10,
    },
    filterItem: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        minHeight: 48,
        paddingHorizontal: 12,
        paddingVertical: 9,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    filterIcon: { marginRight: 8 },
    filterChevron: { marginLeft: 'auto' },
    filterText: {
        fontSize: 13,
        fontWeight: '600',
        color: '#374151',
    },
    cardShadow: {
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 5 },
        shadowOpacity: 0.06,
        shadowRadius: 10,
        elevation: 3,
    },
    kpiSection: {
        padding: 16,
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        marginHorizontal: 16,
        marginTop: 8,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    summaryHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    summaryIcon: {
        width: 46,
        height: 46,
        borderRadius: 14,
        backgroundColor: '#F0F0FF',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    summaryTitleWrap: { flex: 1 },
    summaryTitle: { fontSize: 16, fontWeight: '700', color: '#1F2937' },
    summarySubtitle: { fontSize: 12, color: '#6B7280', marginTop: 3 },
    summaryStatsCard: {
        flexDirection: 'row',
        alignItems: 'stretch',
        justifyContent: 'space-between',
    },
    summaryStatWrap: { flex: 1, flexDirection: 'row', alignItems: 'stretch' },
    summaryDivider: { width: 1, backgroundColor: '#E5E7EB', marginVertical: 4 },
    kpiItem: { flex: 1, alignItems: 'center', paddingHorizontal: 2 },
    statIconCircle: {
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 6,
    },
    kpiValue: { fontSize: 16, fontWeight: '800', marginTop: 3 },
    kpiLabel: {
        fontSize: 9,
        lineHeight: 12,
        textAlign: 'center',
        color: '#6B7280',
        fontWeight: '600',
    },
    chartSection: {
        padding: 16,
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        marginHorizontal: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    cardTitleRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
    cardTitleIcon: {
        width: 36,
        height: 36,
        borderRadius: 12,
        backgroundColor: '#F0F0FF',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 10,
    },
    chartTitle: { fontSize: 16, fontWeight: '700', color: '#1F2937' },
    chartBarsRow: {
        height: 162,
        flexDirection: 'row',
        alignItems: 'flex-end',
        justifyContent: 'space-around',
    },
    barColumn: { flex: 1, alignItems: 'center', height: '100%', justifyContent: 'flex-end' },
    barValue: { color: '#6C63FF', fontSize: 12, fontWeight: '700', marginBottom: 5 },
    barTrack: {
        height: 100,
        width: 22,
        borderRadius: 11,
        backgroundColor: '#F0F0FF',
        justifyContent: 'flex-end',
        overflow: 'hidden',
    },
    barFill: { width: '100%', borderRadius: 11 },
    barLabel: { marginTop: 8, fontSize: 10, lineHeight: 12, color: '#6B7280', textAlign: 'center' },
    visitsStoresSection: {
        flexDirection: 'row',
        alignItems: 'stretch',
        padding: 16,
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        marginHorizontal: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    visitsSection: { flex: 1, flexDirection: 'row', alignItems: 'center' },
    storesSection: { flex: 1, flexDirection: 'row', alignItems: 'center', paddingLeft: 12 },
    metricDivider: { width: 1, backgroundColor: '#E5E7EB', marginVertical: 2 },
    visitStoreIcon: {
        width: 42,
        height: 42,
        borderRadius: 14,
        backgroundColor: '#F0F0FF',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 9,
    },
    visitStoreTextWrap: { flex: 1 },
    visitsValue: { fontSize: 18, fontWeight: '800', color: '#1F2937', marginTop: 2 },
    storesValue: { fontSize: 18, fontWeight: '800', color: '#1F2937', marginTop: 2 },
    visitsLabel: { fontSize: 11, fontWeight: '700', color: '#374151' },
    storesLabel: { fontSize: 11, fontWeight: '700', color: '#374151' },
    thisMonthLabel: { fontSize: 10, color: '#9CA3AF', marginTop: 1 },
    regularizationButton: {
        backgroundColor: '#6C63FF',
        paddingVertical: 14,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        marginHorizontal: 16,
        marginTop: 4,
    },
    regularizationButtonIcon: { marginRight: 8 },
    regularizationButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
});

export default AttendanceScreen;
