import axios from 'axios';
import React, { useEffect, useRef, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

export default function BrandsSection({ storeId, authToken }) {
  const [brands, setBrands] = useState([]);
  const [isAdding, setIsAdding] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [newBrand, setNewBrand] = useState({ brandName: '', pros: [], cons: [] });
  const [editingBrandId, setEditingBrandId] = useState(null);
  const scrollViewRef = useRef(null);

  useEffect(() => {
    fetchBrands();
  }, []);

  const fetchBrands = async () => {
    try {
      const response = await axios.get(
        `https://unbalkingly-uncharged-elizabet.ngrok-free.dev/store/getById?id=${storeId}`,
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        }
      );
      const storeData = response.data;
      setBrands(storeData.brandProCons || []);
    } catch (error) {
      console.error('Error fetching brands:', error);
    }
  };

  const handleAddBrand = async () => {
    if (newBrand.brandName.trim() !== '') {
      const updatedBrands = [...brands, newBrand];
      try {
        await axios.put(
          `https://unbalkingly-uncharged-elizabet.ngrok-free.dev/store/editProCons?id=${storeId}`,
          updatedBrands,
          {
            headers: {
              Authorization: `Bearer ${authToken}`,
            },
          }
        );
        setBrands(updatedBrands);
        setNewBrand({ brandName: '', pros: [], cons: [] });
        setIsAdding(false);
      } catch (error) {
        console.error('Error adding brand:', error);
        Alert.alert('Error', 'Failed to add brand');
      }
    }
  };

  const handleUpdateBrand = async () => {
    if (newBrand.brandName.trim() !== '') {
      const updatedBrands = [...brands];
      const brandIndex = updatedBrands.findIndex((brand) => brand.id === newBrand.id);
      if (brandIndex !== -1) {
        updatedBrands[brandIndex] = newBrand;

        try {
          await axios.put(
            `https://unbalkingly-uncharged-elizabet.ngrok-free.dev/store/editProCons?id=${newBrand.id}`,
            newBrand,
            {
              headers: {
                Authorization: `Bearer ${authToken}`,
              },
            }
          );
          setBrands(updatedBrands);
          setNewBrand({ brandName: '', pros: [], cons: [] });
          setIsEditing(false);
          setEditingBrandId(null);
        } catch (error) {
          console.error('Error updating brand:', error);
          Alert.alert('Error', 'Failed to update brand');
        }
      }
    }
  };


  const handleDeleteBrand = async (brandName) => {
    try {
      const payload = [{ brandName }];

      await axios.delete(
        `https://unbalkingly-uncharged-elizabet.ngrok-free.dev/store/deleteProCons?id=${storeId}`,
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
          data: payload,
        }
      );

      const updatedBrands = brands.filter((brand) => brand.brandName !== brandName);
      setBrands(updatedBrands);
    } catch (error) {
      console.error('Error deleting brand:', error);
      Alert.alert('Error', 'Failed to delete brand');
    }
  };

  const handleAddProCon = (type) => {
    if (newBrand[type].length < 3) {
      setNewBrand({
        ...newBrand,
        [type]: [...newBrand[type], ''],
      });
    }
  };

  const handleProConChange = (type, index, value) => {
    const updatedProCon = [...newBrand[type]];
    updatedProCon[index] = value;
    setNewBrand({ ...newBrand, [type]: updatedProCon });
  };


  const handleInputChange = (key, value) => {
    setNewBrand({ ...newBrand, [key]: value });
  };

  const handleEditBrand = (brand) => {
    setIsEditing(true);
    setEditingBrandId(brand.id);
    setNewBrand({ ...brand });
    scrollToTop();
  };




  const scrollToTop = () => {
    scrollViewRef.current.scrollTo({ y: 0, animated: true });
  };


  return (
    <ScrollView ref={scrollViewRef} style={styles.container}>
      {!isAdding && !isEditing && brands.length === 0 && (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No brands available.</Text>
          <TouchableOpacity
            style={styles.button}
            onPress={() => {
              setIsAdding(true);
              scrollToTop();
            }}
          >
            <Text style={styles.buttonText}>Add Brand</Text>
          </TouchableOpacity>
        </View>
      )}

      {(isAdding || isEditing) && (
        <View style={styles.formContainer}>
          <TextInput
            style={styles.input}
            placeholder="Brand Name"
            value={newBrand.brandName}
            onChangeText={(value) => handleInputChange('brandName', value)}
          />
          <View style={styles.proConContainer}>
            <View style={styles.proConColumn}>
              <Text style={styles.proConTitle}>Pros</Text>
              {newBrand.pros.map((pro, index) => (
                <TextInput
                  key={index}
                  style={styles.proConInput}
                  value={pro}
                  onChangeText={(value) => handleProConChange('pros', index, value)}
                  placeholder={`Pro ${index + 1}`}
                />
              ))}
              {newBrand.pros.length < 3 && (
                <TouchableOpacity
                  style={styles.addProConButton}
                  onPress={() => handleAddProCon('pros')}
                >
                  <Text style={styles.addProConButtonText}>Add Pro</Text>
                </TouchableOpacity>
              )}
            </View>
            <View style={styles.proConColumn}>
              <Text style={styles.proConTitle}>Cons</Text>
              {newBrand.cons.map((con, index) => (
                <TextInput
                  key={index}
                  style={styles.proConInput}
                  value={con}
                  onChangeText={(value) => handleProConChange('cons', index, value)}
                  placeholder={`Con ${index + 1}`}
                />
              ))}
              {newBrand.cons.length < 3 && (
                <TouchableOpacity
                  style={styles.addProConButton}
                  onPress={() => handleAddProCon('cons')}
                >
                  <Text style={styles.addProConButtonText}>Add Con</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={styles.button}
              onPress={isEditing ? handleUpdateBrand : handleAddBrand}
            >
              <Text style={styles.buttonText}>{isEditing ? 'Update' : 'Add'}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={() => {
                setIsAdding(false);
                setIsEditing(false);
                setEditingBrandId(null);
                setNewBrand({ brandName: '', pros: [], cons: [] });
              }}
            >
              <Text style={styles.buttonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {brands.length > 0 && (
        <View style={styles.brandList}>
          {brands.map((brand, index) => (
            <View key={brand.id} style={styles.brandItem}>
              <Text style={styles.brandName}>{brand.brandName}</Text>
              <View style={styles.proConContainer}>
                <View style={styles.proConColumn}>
                  <Text style={styles.proConTitle}>Pros</Text>
                  {brand.pros.map((pro, index) => (
                    <Text key={index} style={styles.proConText}>
                      {pro}
                    </Text>
                  ))}
                </View>
                <View style={styles.proConColumn}>
                  <Text style={styles.proConTitle}>Cons</Text>
                  {brand.cons.map((con, index) => (
                    <Text key={index} style={styles.proConText}>
                      {con}
                    </Text>
                  ))}
                </View>
              </View>
              <View style={styles.brandActions}>
                {/* <TouchableOpacity
                  style={styles.brandActionButton}
                  onPress={() => handleEditBrand(brand)}
                >
                  <Text style={styles.brandActionButtonText}>Edit</Text>
                </TouchableOpacity> */}
                {/* <TouchableOpacity
                  style={[styles.brandActionButton, styles.brandDeleteButton]}
                  onPress={() => handleDeleteBrand(brand.brandName)}
                >
                  <Text style={[styles.brandActionButtonText, styles.brandDeleteButtonText]}>
                    Delete
                  </Text>
                </TouchableOpacity> */}
              </View>
            </View>
          ))}
          {!isAdding && !isEditing && (
            <TouchableOpacity
              style={styles.button}
              onPress={() => {
                setIsAdding(true);
                scrollToTop();
              }}
            >
              <Text style={styles.buttonText}>Add Brand</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </ScrollView>
  );
}



const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#FFFFFF',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  emptyText: {
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 16,
  },
  button: {
    backgroundColor: '#4F46E5',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginTop: 8,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  formContainer: {
    marginBottom: 16,
  },
  input: {
    height: 40,
    borderColor: '#E5E7EB',
    borderWidth: 1,
    borderRadius: 8,
    padding: 8,
    marginBottom: 16,
  },
  proConContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  proConColumn: {
    flex: 1,
  },
  proConTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 8,
  },
  proConInput: {
    height: 40,
    borderColor: '#E5E7EB',
    borderWidth: 1,
    borderRadius: 8,
    padding: 8,
    marginBottom: 8,
  },
  addProConButton: {
    backgroundColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  addProConButtonText: {
    color: '#4F46E5',
    fontSize: 14,
    fontWeight: 'bold',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  cancelButton: {
    backgroundColor: '#E5E7EB',
    marginLeft: 8,
  },
  brandList: {
    marginTop: 16,
  },
  brandItem: {
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
  },
  brandName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 8,
  },
  proConText: {
    fontSize: 14,
    color: '#4B5563',
    marginBottom: 4,
  },
  brandActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 8,
  },
  brandActionButton: {
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginLeft: 8,
  },
  brandActionButtonText: {
    fontSize: 14,
    color: '#4F46E5',
  },
  brandDeleteButton: {
    backgroundColor: '#FEE2E2',
  },
  brandDeleteButtonText: {
    color: '#EF4444',
  },
});   