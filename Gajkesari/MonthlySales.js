import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert } from 'react-native';
import axios from 'axios';

const MonthlySales = ({ visitId, authToken, initialMonthlySale, onSaleUpdated, onClose, clientType }) => {
    const [monthlySale, setMonthlySale] = useState(initialMonthlySale?.toString() || '');
    const requirementsClientTypes = ['site visit', 'engineer', 'architect', 'builder'];
    const isRequirementsType = requirementsClientTypes.includes(clientType);

    useEffect(() => {
        if (initialMonthlySale) {
            setMonthlySale(initialMonthlySale.toString());
        } else {
            fetchMonthlySale();
        }
    }, [initialMonthlySale]);

    const fetchMonthlySale = async () => {
        try {
            const response = await axios.get(`https://api.gajkesaristeels.in/monthly-sale/getByVisit?visitId=${visitId}`, {
                headers: {
                    Authorization: `Bearer ${authToken}`,
                },
            });
            const newMonthlySale = response.data.newMonthlySale?.toString() || '';
            setMonthlySale(newMonthlySale);
            onSaleUpdated(parseFloat(newMonthlySale) || 0);
        } catch (error) {
            console.error('Error fetching monthly sale:', error);
            Alert.alert('Error', 'Failed to fetch monthly sale. Please try again.');
        }
    };

    const updateMonthlySale = async () => {
        if (monthlySale.trim() === '') {
            Alert.alert('Error', isRequirementsType ? 'Requirements cannot be empty.' : 'Monthly sale cannot be empty.');
            return;
        }

        try {
            await axios.put(`https://api.gajkesaristeels.in/visit/editMonthlySale?visitId=${visitId}&monthlySale=${monthlySale}`, null, {
                headers: {
                    Authorization: `Bearer ${authToken}`,
                },
            });
            onSaleUpdated(parseFloat(monthlySale));
            onClose();
        } catch (error) {
            console.error('Error updating monthly sale:', error);
            Alert.alert('Error', isRequirementsType ? 'Failed to update requirements. Please try again.' : 'Failed to update monthly sale. Please try again.');
        }
    };

    const handleMonthlySaleChange = (value) => {
        setMonthlySale(value);
        onSaleUpdated(parseFloat(value) || 0);
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>{isRequirementsType ? 'Update Requirements' : 'Update Monthly Sales'}</Text>
            <TextInput
                style={styles.input}
                placeholder={isRequirementsType ? "Enter Requirements" : "Enter Monthly Sales"}
                keyboardType={isRequirementsType ? "default" : "numeric"}
                value={monthlySale}
                onChangeText={handleMonthlySaleChange}
            />
            <TouchableOpacity style={styles.button} onPress={updateMonthlySale}>
                <Text style={styles.buttonText}>Save</Text>
            </TouchableOpacity>
        </View>
    );
};


const styles = StyleSheet.create({
    container: {
        padding: 20,
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 20,
    },
    input: {
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 5,
        padding: 10,
        marginBottom: 20,
    },
    button: {
        backgroundColor: '#4A90E2',
        padding: 10,
        borderRadius: 5,
        alignItems: 'center',
    },
    buttonText: {
        color: '#fff',
        fontWeight: 'bold',
    },
});

export default MonthlySales;