import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, ScrollView, FlatList, TextInput, Alert, Dimensions, Modal as RNModal } from 'react-native';
import { BarChart } from 'react-native-chart-kit';
import Icon from 'react-native-vector-icons/FontAwesome5';
import { Ionicons } from '@expo/vector-icons';
import Modal from 'react-native-modal';
import { Calendar } from 'react-native-calendars';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { format, startOfMonth, endOfMonth } from 'date-fns';

const AttendanceScreen = () => {
    const [attendanceData, setAttendanceData] = useState({
        totalDays: 30,
        fullDays: 0,
        halfDays: 0,
        leaves: 0,
        holidays: 0,
    });
    const [totalVisits, setTotalVisits] = useState(0);
    const [totalStores, setTotalStores] = useState(0);
    const [isMonthPickerVisible, setMonthPickerVisible] = useState(false);
    const [isYearPickerVisible, setYearPickerVisible] = useState(false);
    const [authToken, setAuthToken] = useState(null);
    const [employeeId, setEmployeeId] = useState(null);
    const navigation = useNavigation();
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
        fetchAttendanceData();
        fetchRegularizationRequests();
    }, [selectedMonth, selectedYear, authToken]);

    const getSundaysPassed = (month, year, day) => {
        let count = 0;
        const date = new Date(year, month, 1);

        while (date.getMonth() === month && date.getDate() <= day) {
            if (date.getDay() === 0) {
                count++;
            }
            date.setDate(date.getDate() + 1);
        }
        return count;
    };

    const fetchAttendanceData = async () => {
        try {
            const token = await AsyncStorage.getItem('userToken');
            const id = await AsyncStorage.getItem('employeeId');
            const monthIndex = months.indexOf(selectedMonth);
            const isCurrentMonth = monthIndex === currentDate.getMonth() && selectedYear == currentDate.getFullYear();
            const currentDay = isCurrentMonth ? currentDate.getDate() : new Date(selectedYear, monthIndex + 1, 0).getDate();

            const response = await axios.get(`https://api.gajkesaristeels.in/attendance-log/monthlyVisits?date=${selectedYear}-${String(monthIndex + 1).padStart(2, '0')}-01&employeeId=${id}`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });
            const data = response.data;

            const sundaysPassed = getSundaysPassed(monthIndex, selectedYear, currentDay);
            const totalDays = isCurrentMonth ? currentDay : new Date(selectedYear, monthIndex + 1, 0).getDate();

            setAttendanceData({
                totalDays: totalDays,
                fullDays: data.statsDto.fullDays,
                halfDays: data.statsDto.halfDays,
                leaves: totalDays - data.statsDto.fullDays - data.statsDto.halfDays - sundaysPassed,
                holidays: sundaysPassed,
            });
            setTotalVisits(data.monthlyCount);
            setTotalStores(data.uniqueStoreCount);

            // Fetch regularization requests after attendance data is fetched
            fetchRegularizationRequests();
        } catch (error) {
            console.error('Error fetching attendance data:', error);
        }
    };

    const fetchRegularizationRequests = async () => {
        try {
            const token = await AsyncStorage.getItem('userToken');
            const startDate = startOfMonth(new Date(selectedYear, months.indexOf(selectedMonth)));
            const endDate = endOfMonth(new Date(selectedYear, months.indexOf(selectedMonth)));

            const response = await axios.get(
                `https://api.gajkesaristeels.in/request/getByDateRange?start=${format(startDate, 'yyyy-MM-dd')}&end=${format(endDate, 'yyyy-MM-dd')}`,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            );
            setRegularizationRequests(response.data);
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
        try {
            // Validate reason
            if (!regularizationReason) {
                Alert.alert('Reason required', 'Please select a reason for this request.');
                return;
            }

            // Validate custom reason if "Other" is selected
            if (regularizationReason === 'Other' && (!regularizationCustomReason || regularizationCustomReason.trim().length < 3)) {
                Alert.alert('Custom reason required', 'Please enter a custom reason (at least 3 characters).');
                return;
            }

            // Validate description
            if (!regularizationDescription || regularizationDescription.trim().length < 10) {
                Alert.alert(
                    'Description required',
                    'Please briefly explain why you want to change this day\'s attendance (at least 10 characters).'
                );
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
                Alert.alert('Invalid Date', 'You can request changes only for dates from 2 days ago onwards.');
                return;
            }

            const token = await AsyncStorage.getItem('userToken');
            const employeeId = await AsyncStorage.getItem('employeeId');

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
                'https://api.gajkesaristeels.in/request/create',
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
                // Reset the form silently
                setRegularizationDate(new Date());
                setRegularizationStatus('Full Day');
                setRegularizationDescription('');
                setRegularizationReason('');
                setRegularizationCustomReason('');
                // Remove success alert
                fetchRegularizationRequests();
            } else {
                throw new Error('Failed to create regularization request');
            }
        } catch (error) {
            console.error('Error creating regularization request:', error);
            console.log('Request Error Response:', error.response?.data);
            Alert.alert('Error', 'Failed to submit regularization request. Please try again.');
        }
    };

    const renderBottomSheet = (data, onSelect, isVisible, onClose, title) => (
        <Modal
            isVisible={isVisible}
            onBackdropPress={onClose}
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
                        <TouchableOpacity style={styles.bottomSheetItem} onPress={() => onSelect(item)}>
                            <Text style={styles.bottomSheetItemText}>{item}</Text>
                        </TouchableOpacity>
                    )}
                />
            </View>
        </Modal>
    );

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView>
                <View style={styles.header}>
                    <TouchableOpacity style={styles.backButton} onPress={goBack}>
                        <Ionicons name="chevron-back" size={24} color="#333" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>My Attendance</Text>
                </View>
                <View style={styles.filtersContainer}>
                    <TouchableOpacity style={[styles.filterItem, styles.cardShadow]} onPress={() => setMonthPickerVisible(true)}>
                        <Icon name="calendar-alt" size={18} color="#6C63FF" style={styles.filterIcon} />
                        <Text style={styles.filterText}>{selectedMonth}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.filterItem, styles.cardShadow]} onPress={() => setYearPickerVisible(true)}>
                        <Icon name="calendar" size={18} color="#6C63FF" style={styles.filterIcon} />
                        <Text style={styles.filterText}>{selectedYear}</Text>
                    </TouchableOpacity>
                </View>
                <View style={[styles.kpiSection, styles.cardShadow]}>
                    <View style={styles.kpiItem}>
                        <Icon name="calendar-check" size={36} color="#6C63FF" />
                        <Text style={styles.kpiValue}>{attendanceData.totalDays}</Text>
                        <Text style={styles.kpiLabel}>Total Days</Text>
                    </View>
                    <View style={styles.kpiItem}>
                        <Icon name="sun" size={36} color="#6C63FF" />
                        <Text style={styles.kpiValue}>{attendanceData.fullDays}</Text>
                        <Text style={styles.kpiLabel}>Full Days</Text>
                    </View>
                    <View style={styles.kpiItem}>
                        <Icon name="cloud-sun" size={36} color="#6C63FF" />
                        <Text style={styles.kpiValue}>{attendanceData.halfDays}</Text>
                        <Text style={styles.kpiLabel}>Half Days</Text>
                    </View>
                    <View style={styles.kpiItem}>
                        <Icon name="plane-departure" size={36} color="#6C63FF" />
                        <Text style={styles.kpiValue}>{attendanceData.leaves}</Text>
                        <Text style={styles.kpiLabel}>Leaves</Text>
                    </View>
                    <View style={styles.kpiItem}>
                        <Icon name="umbrella-beach" size={36} color="#6C63FF" />
                        <Text style={styles.kpiValue}>{attendanceData.holidays}</Text>
                        <Text style={styles.kpiLabel}>Holidays</Text>
                    </View>
                </View>
                <View style={[styles.chartSection, styles.cardShadow]}>
                    <Text style={styles.chartTitle}>Attendance Breakdown</Text>
                    <BarChart
                        data={{
                            labels: ['Full Days', 'Half Days', 'Leaves', 'Holidays'],
                            datasets: [
                                {
                                    data: [
                                        attendanceData.fullDays,
                                        attendanceData.halfDays,
                                        attendanceData.leaves,
                                        attendanceData.holidays,
                                    ],
                                },
                            ],
                        }}
                        width={Dimensions.get('window').width - 80}
                        height={200}
                        yAxisLabel=""
                        yAxisSuffix=""
                        chartConfig={{
                            backgroundColor: '#fff',
                            backgroundGradientFrom: '#fff',
                            backgroundGradientTo: '#fff',
                            decimalPlaces: 0,
                            color: (opacity = 1) => `rgba(108, 99, 255, ${opacity})`,
                            style: {
                                borderRadius: 16,
                            },
                            barPercentage: 0.5,
                        }}
                        fromZero={true}
                        showBarTops={false}
                        showValuesOnTopOfBars={false}
                        withHorizontalLabels={true}
                        withInnerLines={false}
                        withOuterLines={false}
                        style={{
                            marginVertical: 8,
                            borderRadius: 16,
                        }}
                    />
                </View>
                <View style={[styles.visitsStoresSection, styles.cardShadow]}>
                    <View style={styles.visitsSection}>
                        <Icon name="walking" size={48} color="#6C63FF" />
                        <Text style={styles.visitsValue}>{totalVisits}</Text>
                        <Text style={styles.visitsLabel}>Total Visits</Text>
                    </View>
                    <View style={styles.storesSection}>
                        <Icon name="store" size={48} color="#6C63FF" />
                        <Text style={styles.storesValue}>{totalStores}</Text>
                        <Text style={styles.storesLabel}>Total Stores</Text>
                    </View>
                </View>
                <TouchableOpacity
                    style={styles.regularizationButton}
                    onPress={() => setRegularizationModalVisible(true)}
                >
                    <Text style={styles.regularizationButtonText}>Mark Attendance</Text>
                </TouchableOpacity>

                <View style={styles.requestsContainer}>
                    <Text style={styles.requestsTitle}>Attendance Requests</Text>
                    {regularizationRequests.map((request) => (
                        <View key={request.id} style={styles.requestItem}>
                            <View style={styles.requestInfo}>
                                <Text style={styles.requestDate}>{format(new Date(request.logDate), 'MMM d, yyyy')}</Text>
                                <Text style={styles.requestStatus}>{request.requestedStatus}</Text>
                                {request.description ? (
                                    <Text style={styles.requestDescription} numberOfLines={2}>
                                        {request.description}
                                    </Text>
                                ) : null}
                            </View>
                            <View style={[styles.requestStatusBadge, styles[request.status.toLowerCase()]]}>
                                <Text style={styles.requestStatusText}>{request.status}</Text>
                            </View>
                        </View>
                    ))}
                </View>

                <View style={styles.bottomPadding} />
            </ScrollView>
            {renderBottomSheet(months, handleMonthChange, isMonthPickerVisible, () => setMonthPickerVisible(false), 'Select Month')}
            {renderBottomSheet(years, handleYearChange, isYearPickerVisible, () => setYearPickerVisible(false), 'Select Year')}
            {renderBottomSheet(reasonOptions, (reason) => {
                setRegularizationReason(reason);
                setIsReasonPickerVisible(false);
                if (reason !== 'Other') {
                    setRegularizationCustomReason('');
                }
            }, isReasonPickerVisible, () => setIsReasonPickerVisible(false), 'Select Reason')}
            <Modal
                isVisible={isRegularizationModalVisible}
                onBackdropPress={() => {
                    setRegularizationModalVisible(false);
                    setRegularizationDescription('');
                    setRegularizationReason('');
                    setRegularizationCustomReason('');
                }}
                style={styles.bottomModal}
            >
                <View style={styles.modalContent}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>Mark Attendance</Text>
                        <TouchableOpacity onPress={() => {
                            setRegularizationModalVisible(false);
                            setRegularizationDescription('');
                            setRegularizationReason('');
                            setRegularizationCustomReason('');
                        }}>
                            <Ionicons name="close" size={24} color="#333" />
                        </TouchableOpacity>
                    </View>

                    <Text style={styles.label}>Date</Text>
                    <TouchableOpacity
                        style={styles.dateButton}
                        onPress={() => setPickerVisible(true)}
                    >
                        <Text style={styles.dateButtonText}>
                            {format(regularizationDate, 'MMMM d, yyyy')}
                        </Text>
                    </TouchableOpacity>

                    <Text style={styles.label}>Requested Status</Text>
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
                        onPress={() => setIsReasonPickerVisible(true)}
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

                    <Text style={styles.label}>Why are you requesting this change?</Text>
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
                        style={styles.submitButton}
                        onPress={handleRegularizationRequest}
                    >
                        <Text style={styles.submitButtonText}>Submit Request</Text>
                    </TouchableOpacity>
                </View>
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
                                setRegularizationDate(new Date(day.dateString));
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
    modalTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        flex: 1,
        textAlign: 'center',
        color: '#333',
    },
    label: {
        fontSize: 18,
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
});

export default AttendanceScreen;    