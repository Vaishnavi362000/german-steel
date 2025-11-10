import axios from 'axios';
import React, { useEffect, useState } from 'react';
import { Alert, FlatList, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

const BrandsProCons = ({ 
  visitId, 
  authToken, 
  onBrandAdded, 
  readOnly, 
  onClose,
  constructionStage: initialConstructionStage,
  onConstructionStageChange,
  isSiteRelatedClient = false 
}) => {
  const CATEGORY_OPTIONS = [
    { label: 'Steel', value: 'STEEL' },
    { label: 'Cement', value: 'CEMENT' },
  ];

  const [brandsProCons, setBrandsProCons] = useState([]);
  const [brandName, setBrandName] = useState('');
  const [brandCategory, setBrandCategory] = useState('STEEL');
  const [purchasedFrom, setPurchasedFrom] = useState('');
  const [steelQuantity, setSteelQuantity] = useState('');
  const [cementQuantity, setCementQuantity] = useState('');
  const [pros, setPros] = useState('');
  const [cons, setCons] = useState('');
  const [constructionStage, setConstructionStage] = useState(initialConstructionStage || '');

  useEffect(() => {
    fetchBrandsProCons();
  }, []);

  useEffect(() => {
    setConstructionStage(initialConstructionStage || '');
  }, [initialConstructionStage]);

  const fetchBrandsProCons = async () => {
    try {
      const response = await axios.get(`https://unbalkingly-uncharged-elizabet.ngrok-free.dev/visit/getProCons?visitId=${visitId}`, {
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
    if (!brandName.trim()) {
      Alert.alert('Error', 'Please enter a brand name');
      return;
    }

    const parseQuantity = (value) => {
      if (value === undefined || value === null || value === '') return null;
      const numericValue = parseFloat(value);
      return Number.isNaN(numericValue) ? null : numericValue;
    };

    const payload = [{
      brandName: brandName.trim(),
      purchasedFrom: purchasedFrom.trim() || null,
      category: brandCategory,
      steelQuantitySold: brandCategory === 'STEEL' ? parseQuantity(steelQuantity) : null,
      cementQuantitySold: brandCategory === 'CEMENT' ? parseQuantity(cementQuantity) : null,
      pros: pros.split(',').map(pro => pro.trim()).filter(pro => pro),
      cons: cons.split(',').map(con => con.trim()).filter(con => con),
    }];

    try {
      await axios.put(`https://unbalkingly-uncharged-elizabet.ngrok-free.dev/visit/addProCons?visitId=${visitId}`, payload, {
        headers: { 
          Authorization: `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
      });
      
      // Update construction stage if changed (for site visits)
      if (isSiteRelatedClient && constructionStage !== initialConstructionStage) {
        await axios.put(
          `https://unbalkingly-uncharged-elizabet.ngrok-free.dev/visit/edit?id=${visitId}`,
          { constructionStage },
          {
            headers: {
              Authorization: `Bearer ${authToken}`,
              'Content-Type': 'application/json',
            },
          }
        );
        if (onConstructionStageChange) {
          onConstructionStageChange(constructionStage);
        }
      }
      
      const updatedBrands = await fetchBrandsProCons();
      if (onBrandAdded) {
        onBrandAdded(updatedBrands);
      }
      setBrandName('');
      setBrandCategory('STEEL');
      setPurchasedFrom('');
      setSteelQuantity('');
      setCementQuantity('');
      setPros('');
      setCons('');
      onClose(); // Close the modal after successful addition
    } catch (error) {
      console.error('Error adding pro cons:', error);
      Alert.alert('Error', 'Failed to add brand. Please try again.');
    }
  };

  const renderBrandItem = ({ item }) => (
    <View style={styles.brandItem}>
      <Text style={styles.brandName}>{item.brandName}</Text>
      <View style={styles.brandMetaRow}>
        {item.category && (
          <View style={[
            styles.categoryBadge,
            item.category === 'STEEL' ? styles.categoryBadgeSteel : styles.categoryBadgeCement
          ]}>
            <Text style={styles.categoryBadgeText}>
              {item.category === 'STEEL' ? 'Steel' : item.category === 'CEMENT' ? 'Cement' : item.category}
            </Text>
          </View>
        )}
        {typeof item.steelQuantitySold === 'number' && !Number.isNaN(item.steelQuantitySold) && (
          <Text style={styles.quantityTag}>
            Steel Qty: {item.steelQuantitySold}T
          </Text>
        )}
        {typeof item.cementQuantitySold === 'number' && !Number.isNaN(item.cementQuantitySold) && (
          <Text style={styles.quantityTag}>
            Cement Qty: {item.cementQuantitySold}T
          </Text>
        )}
      </View>
      {item.purchasedFrom && (
        <Text style={styles.purchasedFromText}>
          🏪 Source: {item.purchasedFrom}
        </Text>
      )}
      {item.pros && item.pros.length > 0 && (
        <>
          <Text style={styles.prosConsTitle}>Pros:</Text>
          {item.pros.map((pro, index) => (
            <Text key={`pro-${index}`} style={styles.proConItem}>• {pro}</Text>
          ))}
        </>
      )}
      {item.cons && item.cons.length > 0 && (
        <>
          <Text style={styles.prosConsTitle}>Cons:</Text>
          {item.cons.map((con, index) => (
            <Text key={`con-${index}`} style={styles.proConItem}>• {con}</Text>
          ))}
        </>
      )}
    </View>
  );
  
  const CONSTRUCTION_STAGE_OPTIONS = [
    { label: 'Foundation', value: 'FOUNDATION' },
    { label: 'Plinth', value: 'PLINTH' },
    { label: 'Slab 1', value: 'SLAB_1' },
    { label: 'Slab 2', value: 'SLAB_2' },
    { label: 'Completing', value: 'COMPLETING' },
  ];

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Brands & Materials</Text>
      
      {/* NEW: Construction Stage Selector for Site Visits */}
      {isSiteRelatedClient && !readOnly && (
        <View style={styles.constructionStageSection}>
          <Text style={styles.sectionTitle}>Construction Stage</Text>
          <View style={styles.stageOptionsContainer}>
            {CONSTRUCTION_STAGE_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.stageOption,
                  constructionStage === option.value && styles.stageOptionSelected,
                ]}
                onPress={() => setConstructionStage(option.value)}
              >
                <Text
                  style={[
                    styles.stageOptionText,
                    constructionStage === option.value && styles.stageOptionTextSelected,
                  ]}
                >
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}
      
      {!readOnly && (
        <>
          <Text style={styles.sectionTitle}>Add New Brand</Text>
          <Text style={styles.label}>Brand Category</Text>
          <View style={styles.categoryOptionsContainer}>
            {CATEGORY_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.categoryOption,
                  brandCategory === option.value && styles.categoryOptionSelected
                ]}
                onPress={() => {
                  setBrandCategory(option.value);
                  if (option.value === 'STEEL') {
                    setCementQuantity('');
                  } else {
                    setSteelQuantity('');
                  }
                }}
              >
                <Text
                  style={[
                    styles.categoryOptionText,
                    brandCategory === option.value && styles.categoryOptionTextSelected
                  ]}
                >
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <TextInput
            style={styles.input}
            placeholder="Brand Name *"
            value={brandName}
            onChangeText={setBrandName}
          />
          {/* NEW: Purchased From Field */}
          <TextInput
            style={styles.input}
            placeholder="Purchased From (Optional)"
            value={purchasedFrom}
            onChangeText={setPurchasedFrom}
          />
          {brandCategory === 'STEEL' && (
            <TextInput
              style={styles.input}
              placeholder="Steel Quantity Sold (tons, optional)"
              value={steelQuantity}
              onChangeText={setSteelQuantity}
              keyboardType="decimal-pad"
            />
          )}
          {brandCategory === 'CEMENT' && (
            <TextInput
              style={styles.input}
              placeholder="Cement Quantity Sold (tons, optional)"
              value={cementQuantity}
              onChangeText={setCementQuantity}
              keyboardType="decimal-pad"
            />
          )}
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
          <TouchableOpacity style={styles.button} onPress={addProCons}>
            <Text style={styles.buttonText}>Add Brand</Text>
          </TouchableOpacity>
        </>
      )}
      
      {brandsProCons.length > 0 && (
        <Text style={styles.sectionTitle}>Saved Brands</Text>
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
    paddingBottom: 40,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#1F2937',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
    marginTop: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#4B5563',
    marginBottom: 8,
    marginTop: 8,
  },
  categoryOptionsContainer: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  categoryOption: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    marginRight: 12,
  },
  categoryOptionSelected: {
    backgroundColor: '#4F46E5',
    borderColor: '#4F46E5',
  },
  categoryOptionText: {
    color: '#4B5563',
    fontSize: 14,
    fontWeight: '500',
  },
  categoryOptionTextSelected: {
    color: '#FFFFFF',
  },
  constructionStageSection: {
    marginBottom: 20,
  },
  stageOptionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  stageOption: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginRight: 8,
    marginBottom: 8,
  },
  stageOptionSelected: {
    backgroundColor: '#4F46E5',
    borderColor: '#4F46E5',
  },
  stageOptionText: {
    fontSize: 14,
    color: '#6B7280',
  },
  stageOptionTextSelected: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  input: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
    fontSize: 14,
    backgroundColor: '#FFFFFF',
  },
  button: {
    backgroundColor: '#4F46E5',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 8,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  brandItem: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  brandName: {
    fontWeight: '600',
    fontSize: 16,
    marginBottom: 8,
    color: '#1F2937',
  },
  brandMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    marginBottom: 8,
  },
  categoryBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: '#E5E7EB',
    marginRight: 8,
    marginBottom: 6,
  },
  categoryBadgeSteel: {
    backgroundColor: '#DBEAFE',
  },
  categoryBadgeCement: {
    backgroundColor: '#D1FAE5',
  },
  categoryBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1F2937',
  },
  quantityTag: {
    fontSize: 12,
    fontWeight: '500',
    color: '#4B5563',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    marginRight: 8,
    marginBottom: 6,
  },
  purchasedFromText: {
    fontSize: 14,
    color: '#4F46E5',
    marginBottom: 8,
    fontWeight: '500',
    backgroundColor: '#F3F4F6',
    padding: 6,
    borderRadius: 4,
  },
  emptyText: {
    textAlign: 'center',
    fontStyle: 'italic',
    color: '#9CA3AF',
    paddingBottom: 20,
    fontSize: 14,
  },
  prosConsTitle: {
    fontWeight: '600',
    marginTop: 8,
    marginBottom: 4,
    fontSize: 14,
    color: '#4B5563',
  },
  proConItem: {
    marginLeft: 10,
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 2,
  },
});

export default BrandsProCons;
