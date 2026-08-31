import { API_BASE_URL } from './config/api';
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, FlatList, Alert, ActivityIndicator } from 'react-native';
import axios from 'axios';

const BrandsProCons = ({ visitId, authToken, onBrandAdded, readOnly, onClose }) => {
  const [brandsProCons, setBrandsProCons] = useState([]);
  const [brandName, setBrandName] = useState('');
  const [pros, setPros] = useState('');
  const [cons, setCons] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  useEffect(() => {
    fetchBrandsProCons();
  }, []);

  const fetchBrandsProCons = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/visit/getProCons?visitId=${visitId}`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      setBrandsProCons(response.data);
      return response.data;
    } catch (error) {
      console.error('Error fetching brands pro-cons:', error);
      Alert.alert('Error', 'Failed to fetch brands. Please try again.');
      return [];
    }
  };

  const addProCons = async () => {
    if (isAdding) {
      return;
    }

    if (!brandName.trim()) {
      Alert.alert('Error', 'Please enter a brand name');
      return;
    }

    const payload = [{
      brandName: brandName.trim(),
      pros: pros.split(',').map(pro => pro.trim()).filter(pro => pro),
      cons: cons.split(',').map(con => con.trim()).filter(con => con),
    }];

    try {
      setIsAdding(true);
      await axios.put(`${API_BASE_URL}/visit/addProCons?visitId=${visitId}`, payload, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      const updatedBrands = await fetchBrandsProCons();
      onBrandAdded(updatedBrands);
      setBrandName('');
      setPros('');
      setCons('');
      onClose(); // Close the modal after successful addition
    } catch (error) {
      console.error('Error adding pro cons:', error);
      Alert.alert('Error', 'Failed to add brand. Please try again.');
    } finally {
      setIsAdding(false);
    }
  };

  const renderBrandItem = ({ item }) => (
    <View style={styles.brandItem}>
      <Text style={styles.brandName}>{item.brandName}</Text>
      <Text style={styles.prosConsTitle}>Pros:</Text>
      {item.pros.map((pro, index) => (
        <Text key={`pro-${index}`} style={styles.proConItem}>• {pro}</Text>
      ))}
      <Text style={styles.prosConsTitle}>Cons:</Text>
      {item.cons.map((con, index) => (
        <Text key={`con-${index}`} style={styles.proConItem}>• {con}</Text>
      ))}
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Brands Pro/Cons</Text>
      {!readOnly && (
        <>
          <TextInput
            style={styles.input}
            placeholder="Brand Name"
            value={brandName}
            onChangeText={setBrandName}
          />
          <TextInput
            style={styles.input}
            placeholder="Pros (comma separated)"
            value={pros}
            onChangeText={setPros}
          />
          <TextInput
            style={styles.input}
            placeholder="Cons (comma separated)"
            value={cons}
            onChangeText={setCons}
          />
          <TouchableOpacity
            style={[styles.button, isAdding && styles.buttonDisabled]}
            onPress={addProCons}
            disabled={isAdding}
          >
            {isAdding ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Add Brand</Text>
            )}
          </TouchableOpacity>
        </>
      )}
      <FlatList
        data={brandsProCons}
        renderItem={renderBrandItem}
        keyExtractor={(item, index) => index.toString()}
        ListEmptyComponent={<Text style={styles.emptyText}>No brands added yet</Text>}
      />
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
    marginBottom: 10,
  },
  button: {
    backgroundColor: '#4A90E2',
    padding: 10,
    borderRadius: 5,
    alignItems: 'center',
    marginBottom: 20,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  brandItem: {
    backgroundColor: '#f0f0f0',
    padding: 10,
    borderRadius: 5,
    marginBottom: 10,
  },
  brandName: {
    fontWeight: 'bold',
    marginBottom: 5,
  },
  emptyText: {
    textAlign: 'center',
    fontStyle: 'italic',
    color: '#888',
  },
  prosConsTitle: {
    fontWeight: 'bold',
    marginTop: 5,
  },
  proConItem: {
    marginLeft: 10,
  },
});

export default BrandsProCons;