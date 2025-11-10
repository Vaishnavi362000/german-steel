import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import axios from 'axios';
import { endOfMonth, format, startOfMonth } from 'date-fns';
import React, { useEffect, useState } from 'react';
import { Alert, FlatList, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View, Dimensions } from 'react-native';
import { BarChart } from 'react-native-chart-kit';
import Modal from 'react-native-modal';
import Icon from 'react-native-vector-icons/FontAwesome5';
import DatePicker1 from './DatePicker1';

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
    const [regularizationDate, setRegularizationDate] = useState(new Date(Date.now() - 86400000)); // Yesterday's date
    const [regularizationStatus, setRegularizationStatus] = useState('Full Day');
    const [regularizationRequests, setRegularizationRequests] = useState([]);
    const [isPickerVisible, setPickerVisible] = useState(false);

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

            const response = await axios.get(`https://unbalkingly-uncharged-elizabet.ngrok-free.dev/attendance-log/monthlyVisits?date=${selectedYear}-${String(monthIndex + 1).padStart(2, '0')}-01&employeeId=${id}`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'ngrok-skip-browser-warning': 'true',
                    'User-Agent': 'IconMobile',
                },
            });
            
            // Check if response is HTML instead of JSON
            const isHtmlResponse = typeof response.data === 'string' && 
                (response.data.includes('<!DOCTYPE html>') || response.data.includes('<html>'));
            
            if (isHtmlResponse) {
                console.log('⚠️ [ATTENDANCE] Server returned HTML instead of JSON');
                return;
            }
            
            const data = response.data;

            const sundaysPassed = getSundaysPassed(monthIndex, selectedYear, currentDay);
            const totalDays = isCurrentMonth ? currentDay : new Date(selectedYear, monthIndex + 1, 0).getDate();

            // Check if statsDto exists and has the required properties
            const fullDays = data?.statsDto?.fullDays || 0;
            const halfDays = data?.statsDto?.halfDays || 0;

            setAttendanceData({
                totalDays: totalDays,
                fullDays: fullDays,
                halfDays: halfDays,
                leaves: totalDays - fullDays - halfDays - sundaysPassed,
                holidays: sundaysPassed,
            });
            setTotalVisits(data?.monthlyCount || 0);
            setTotalStores(data?.uniqueStoreCount || 0);

            // Fetch regularization requests after attendance data is fetched
            fetchRegularizationRequests();
        } catch (error) {
            console.error('Error fetching attendance data:', error);
        }
    };

    const fetchRegularizationRequests = async () => {
        try {
            const token = await AsyncStorage.getItem('userToken');
            const employeeId = await AsyncStorage.getItem('employeeId');
            const startDate = startOfMonth(new Date(selectedYear, months.indexOf(selectedMonth)));
            const endDate = endOfMonth(new Date(selectedYear, months.indexOf(selectedMonth)));

            const url = `https://unbalkingly-uncharged-elizabet.ngrok-free.dev/request/getByDateRange?start=${format(startDate, 'yyyy-MM-dd')}&end=${format(endDate, 'yyyy-MM-dd')}`;
            
            console.log('🔵 [REGULARIZATION] ====================================');
            console.log('🔵 [REGULARIZATION] Fetching attendance regularization requests');
            console.log('🔵 [REGULARIZATION] Employee ID:', employeeId);
            console.log('🔵 [REGULARIZATION] Date Range:', format(startDate, 'yyyy-MM-dd'), 'to', format(endDate, 'yyyy-MM-dd'));
            console.log('🔵 [REGULARIZATION] API URL:', url);
            console.log('🔵 [REGULARIZATION] Token:', token ? `${token.substring(0, 30)}...` : 'null');

            const response = await axios.get(url, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'ngrok-skip-browser-warning': 'true',
                    'User-Agent': 'IconMobile',
                },
            });
            
            console.log('🔵 [REGULARIZATION] Response Status:', response.status);
            console.log('🔵 [REGULARIZATION] Response Type:', typeof response.data);
            
            // Check if response is HTML instead of JSON
            const isHtmlResponse = typeof response.data === 'string' && 
                (response.data.includes('<!DOCTYPE html>') || response.data.includes('<html>'));
            
            if (isHtmlResponse) {
                console.log('⚠️ [REGULARIZATION] Server returned HTML instead of JSON');
                setRegularizationRequests([]);
                return;
            }
            
            console.log('🔵 [REGULARIZATION] Response Data:', JSON.stringify(response.data, null, 2));
            console.log('🔵 [REGULARIZATION] Total Requests Found:', Array.isArray(response.data) ? response.data.length : 0);
            
            if (Array.isArray(response.data) && response.data.length > 0) {
                console.log('🔵 [REGULARIZATION] Requests Details:');
                response.data.forEach((req, index) => {
                    console.log(`  ${index + 1}. ID: ${req.id}, Employee: ${req.employeeName} (${req.employeeId}), Date: ${req.logDate}, Status: ${req.status}`);
                });
            }
            
            setRegularizationRequests(Array.isArray(response.data) ? response.data : []);
            console.log('🔵 [REGULARIZATION] ====================================');
        } catch (error) {
            console.error('❌ [REGULARIZATION] Error fetching regularization requests:', error);
            console.error('❌ [REGULARIZATION] Error response:', error.response?.data);
            setRegularizationRequests([]);
        }
    };

    const goBack = () => {
        navigation.navigate('UserProfile');
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
            const token = await AsyncStorage.getItem('userToken');
            const employeeId = await AsyncStorage.getItem('employeeId');

            const response = await axios.post(
                'https://unbalkingly-uncharged-elizabet.ngrok-free.dev/request/create',
                {
                    employeeId: parseInt(employeeId),
                    logDate: format(regularizationDate, 'yyyy-MM-dd'),
                    requestedStatus: regularizationStatus.toLowerCase()
                },
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    }
                }
            );

            if (response.status === 200 || response.status === 201) {
                setRegularizationModalVisible(false);
                // Reset the form silently
                setRegularizationDate(new Date(Date.now() - 86400000));
                setRegularizationStatus('Full Day');
                // Remove success alert
                fetchRegularizationRequests();
            } else {
                throw new Error('Failed to create regularization request');
            }
        } catch (error) {
            console.error('Error creating regularization request:', error);
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
                <Text style={styles.bottomSheetTitle}>{title}</Text>
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
                        <Icon name="chevron-left" size={24} color="#333" />
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
                    <Text style={styles.regularizationButtonText}>Attendance Regularization</Text>
                </TouchableOpacity>

                {regularizationRequests.length > 0 && (
                <View style={styles.requestsContainer}>
                    <Text style={styles.requestsTitle}>Regularization Requests</Text>
                    {regularizationRequests.map((request) => (
                        <View key={request.id} style={styles.requestItem}>
                            <View style={styles.requestInfo}>
                                <Text style={styles.requestDate}>{format(new Date(request.logDate), 'MMM d, yyyy')}</Text>
                                <Text style={styles.requestStatus}>{request.requestedStatus}</Text>
                            </View>
                            <View style={[styles.requestStatusBadge, styles[request.status.toLowerCase()]]}>
                                <Text style={styles.requestStatusText}>{request.status}</Text>
                            </View>
                        </View>
                    ))}
                </View>
                )}

                <View style={styles.bottomPadding} />
            </ScrollView>
            {renderBottomSheet(months, handleMonthChange, isMonthPickerVisible, () => setMonthPickerVisible(false), 'Select Month')}
            {renderBottomSheet(years, handleYearChange, isYearPickerVisible, () => setYearPickerVisible(false), 'Select Year')}
            <Modal
                isVisible={isRegularizationModalVisible}
                onBackdropPress={() => setRegularizationModalVisible(false)}
                style={styles.bottomModal}
            >
                <View style={styles.modalContent}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text style={styles.modalTitle}>Attendance Regularization</Text>
                        <TouchableOpacity onPress={() => setRegularizationModalVisible(false)} accessibilityLabel="Close">
                            <Icon name="times" size={20} color="#333" />
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

                    <TouchableOpacity
                        style={styles.submitButton}
                        onPress={handleRegularizationRequest}
                    >
                        <Text style={styles.submitButtonText}>Submit Request</Text>
                    </TouchableOpacity>
                </View>
            </Modal>

            <DatePicker1
                isVisible={isPickerVisible}
                onClose={() => setPickerVisible(false)}
                onSelect={(date) => {
                    setRegularizationDate(date);
                    setPickerVisible(false);
                }}
            />
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
        maxHeight: '50%',
    },
    bottomSheetHandle: {
        width: 40,
        height: 5,
        backgroundColor: '#ccc',
        borderRadius: 3,
        alignSelf: 'center',
        marginVertical: 10,
    },
    bottomSheetTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 10,
        textAlign: 'center',
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
        marginBottom: 20,
        textAlign: 'center',
        color: '#333',
    },
    label: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 10,
        color: '#555',
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
});

export default AttendanceScreen;    