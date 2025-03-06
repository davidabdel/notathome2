import React, { useState, useEffect } from 'react';
import { SupabaseClient } from '@supabase/supabase-js';
// Import the supabase client from the utility file
import { supabase } from '../utils/supabaseClient';
import { Database } from '../types/supabase';

// Database types
type DbAddress = Database['public']['Tables']['not_at_home_addresses']['Row'];

// Define the Address type for internal component use
interface Address {
  id: string;
  address: string;
  created_at: string;
  session_id: string;
  block_number: string;
  latitude?: number;
  longitude?: number;
}

// Define the AddressFields type for form state
interface AddressFields {
  block_number: string;
  unit_number: string;
  house_number: string;
  street_name: string;
  suburb: string;
}

interface AddressListProps {
  sessionId: string;
  selectedBlock: number | null;
  onAddressUpdated?: () => void;
}

const AddressList: React.FC<AddressListProps> = ({ 
  sessionId, 
  selectedBlock,
  onAddressUpdated
}) => {
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [detailedError, setDetailedError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [addressFields, setAddressFields] = useState<AddressFields>({
    block_number: '',
    unit_number: '',
    house_number: '',
    street_name: '',
    suburb: '',
  });

  const fetchAddresses = async () => {
    try {
      setLoading(true);
      
      // Use supabaseClient instead of supabase
      const { data, error: fetchError } = await supabase
        .from('not_at_home_addresses')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true });
      
      if (fetchError) {
        console.error('Error fetching addresses:', fetchError);
        setError('Failed to load addresses. Please try again.');
        return;
      }
      
      // Convert null addresses to empty strings and ensure proper typing
      const validAddresses: Address[] = (data || []).map((dbAddr: DbAddress) => ({
        ...dbAddr,
        address: dbAddr.address || '',
        block_number: dbAddr.block_number || ''
      }));
      
      setAddresses(validAddresses);
    } catch (err) {
      console.error('Error in fetchAddresses:', err);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    fetchAddresses();
  }, [sessionId, selectedBlock]);
  
  const handleDelete = async () => {
    if (!editingId) return;

    try {
      setError(null);
      setDetailedError(null);
      
      const { error: deleteError } = await supabase
        .from('not_at_home_addresses')
        .delete()
        .eq('id', editingId);
      
      if (deleteError) {
        setError('Error deleting address');
        setDetailedError(deleteError.message);
        console.error('Delete error:', deleteError);
        return;
      }
      
      // Update the local state
      setAddresses(addresses.filter(addr => addr.id !== editingId));
      
      // Close the modal
      setShowEditModal(false);
      setEditingId(null);
      
      // Notify parent component if needed
      if (onAddressUpdated) {
        onAddressUpdated();
      }
    } catch (err) {
      setError('Failed to delete address');
      setDetailedError(err instanceof Error ? err.message : String(err));
      console.error('Error in handleDelete:', err);
    }
  };

  const parseAddress = (address: string | Address) => {
    // Initialize with empty values
    const fields: AddressFields = {
      block_number: '',
      unit_number: '',
      house_number: '',
      street_name: '',
      suburb: '',
    };

    try {
      // Handle if address is an object (Address type)
      if (typeof address !== 'string') {
        // Extract the address string
        const addressStr = address.address;
        
        // Set block number if it exists
        if (address.block_number) {
          fields.block_number = address.block_number;
        }
        
        // Process the address string
        const parts = addressStr.trim().split(',').map(part => part.trim());
        
        // Rest of the parsing logic...
        if (parts.length >= 1) {
          // First part typically contains house number and street
          const streetParts = parts[0].split(' ');
          
          if (streetParts.length >= 2) {
            // First part is likely the house number
            fields.house_number = streetParts[0];
            // Rest is the street name
            fields.street_name = streetParts.slice(1).join(' ');
          } else {
            fields.street_name = parts[0];
          }
        }

        // If there's a second part, it's likely the suburb
        if (parts.length >= 2) {
          fields.suburb = parts[1];
        }
        
        return fields;
      }
      
      // If address is a string
      const parts = address.trim().split(',').map(part => part.trim());

      if (parts.length >= 1) {
        // First part typically contains house number and street
        const streetParts = parts[0].split(' ');
        
        if (streetParts.length >= 2) {
          // First part is likely the house number
          fields.house_number = streetParts[0];
          // Rest is the street name
          fields.street_name = streetParts.slice(1).join(' ');
        } else {
          fields.street_name = parts[0];
        }
      }

      // If there's a second part, it's likely the suburb
      if (parts.length >= 2) {
        fields.suburb = parts[1];
      }
    } catch (err) {
      console.error('Error parsing address:', err);
    }

    return fields;
  };
  
  const startEditing = (address: Address) => {
    setEditingId(address.id);
    
    // Parse the address into fields
    const parsedFields = parseAddress(address);
    
    setAddressFields(parsedFields);
    setShowEditModal(true);
  };
  
  const handleInputChange = (field: keyof AddressFields, value: string) => {
    setAddressFields(prev => ({
      ...prev,
      [field]: value
    }));
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingId) return;

    try {
      // Format the address from the fields
      const formattedAddress = [
        addressFields.house_number,
        addressFields.street_name,
        addressFields.suburb ? `, ${addressFields.suburb}` : ''
      ].filter(Boolean).join(' ');

      // Ensure we have a non-empty address
      if (!formattedAddress.trim()) {
        setError('Address cannot be empty');
        return;
      }
      
      const { error: updateError } = await supabase
        .from('not_at_home_addresses')
        .update({ 
          address: formattedAddress.trim(),
          block_number: addressFields.block_number
        })
        .eq('id', editingId);
      
      if (updateError) {
        setError('Error updating address');
        setDetailedError(updateError.message);
        console.error('Update error:', updateError);
        return;
      }
      
      // Update the local state with type guard
      const updatedAddresses = addresses.map(addr => {
        if (addr.id === editingId) {
          const updatedAddr: Address = {
            ...addr,
            address: formattedAddress.trim(),
            block_number: addressFields.block_number
          };
          return updatedAddr;
        }
        return addr;
      });
      
      setAddresses(updatedAddresses);
      
      // Reset editing state and close modal
      setEditingId(null);
      setShowEditModal(false);
      setAddressFields({
        block_number: '',
        unit_number: '',
        house_number: '',
        street_name: '',
        suburb: '',
      });
      
      // Notify parent component if needed
      if (onAddressUpdated) {
        onAddressUpdated();
      }
    } catch (err) {
      setError('Failed to update address');
      setDetailedError(err instanceof Error ? err.message : String(err));
      console.error('Error in handleSubmit:', err);
    }
  };

  const formatAddress = (address: Address): string => {
    if (address.address) {
      return address.address;
    } else if (address.latitude && address.longitude) {
      return `Lat: ${address.latitude.toFixed(6)}, Lng: ${address.longitude.toFixed(6)}`;
    } else {
      return 'No address information';
    }
  };

  const closeModal = () => {
    setShowEditModal(false);
    setEditingId(null);
  };

  if (loading) {
    return <div className="text-center py-4">Loading addresses...</div>;
  }
  
  return (
    <div className="addresses-container">
      {error && <div className="error-message">{error}</div>}
      <div className="address-list">
        <div className="address-header">
          <div className="address-cell">Address</div>
          <div className="actions-cell">Actions</div>
        </div>
        {addresses.map(address => (
          <div key={address.id} className="address-row">
            <div className="address-cell">{formatAddress(address)}</div>
            <div className="actions-cell">
              <button 
                onClick={() => startEditing(address)}
                className="edit-button"
                aria-label="Edit address"
              >
                ✎
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Edit Address Modal */}
      {showEditModal && (
        <div className="modal-overlay">
          <div className="modal-container">
            <div className="modal-header">
              <h2>Edit Location</h2>
              <p className="modal-subtitle">Update the location details</p>
              <button className="close-button" onClick={closeModal}>×</button>
            </div>
            <form onSubmit={handleSubmit} className="edit-form">
              <div className="form-group">
                <label htmlFor="block-number">Block Number</label>
                <input
                  id="block-number"
                  type="text"
                  value={addressFields.block_number}
                  onChange={(e) => handleInputChange('block_number', e.target.value)}
                  placeholder="1"
                />
              </div>
              
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="unit-number">Unit Number</label>
                  <input
                    id="unit-number"
                    type="text"
                    value={addressFields.unit_number}
                    onChange={(e) => handleInputChange('unit_number', e.target.value)}
                    placeholder="Optional"
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="house-number">House Number</label>
                  <input
                    id="house-number"
                    type="text"
                    value={addressFields.house_number}
                    onChange={(e) => handleInputChange('house_number', e.target.value)}
                    placeholder="Dalmeny"
                  />
                </div>
              </div>
              
              <div className="form-group">
                <label htmlFor="street-name">Street Name</label>
                <input
                  id="street-name"
                  type="text"
                  value={addressFields.street_name}
                  onChange={(e) => handleInputChange('street_name', e.target.value)}
                  placeholder="Dr Near Venenzia St"
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="suburb">Suburb</label>
                <input
                  id="suburb"
                  type="text"
                  value={addressFields.suburb}
                  onChange={(e) => handleInputChange('suburb', e.target.value)}
                  placeholder="Prestons"
                />
              </div>
              
              <div className="modal-actions">
                <button 
                  type="button" 
                  className="delete-button"
                  onClick={handleDelete}
                >
                  Delete
                </button>
                <div className="right-actions">
                  <button 
                    type="button" 
                    className="cancel-button"
                    onClick={closeModal}
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    className="save-button"
                  >
                    Save Changes
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      <style jsx>{`
        .addresses-container {
          padding: var(--spacing-md);
          background: white;
          border-radius: 8px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }

        h2 {
          margin: 0 0 var(--spacing-md);
          font-size: 1.5rem;
          color: var(--text-color);
        }

        .error-message {
          color: var(--error-color);
          padding: var(--spacing-sm);
          margin-bottom: var(--spacing-md);
          background-color: rgba(239, 68, 68, 0.1);
          border-radius: 4px;
        }

        .address-list {
          border: 1px solid var(--border-color);
          border-radius: 6px;
          overflow: hidden;
        }

        .address-header {
          display: flex;
          background-color: var(--background-color);
          font-weight: 600;
          border-bottom: 2px solid var(--border-color);
        }

        .address-row {
          display: flex;
          border-bottom: 1px solid var(--border-color);
        }

        .address-row:last-child {
          border-bottom: none;
        }

        .address-cell {
          flex: 1;
          padding: var(--spacing-sm) var(--spacing-md);
        }

        .actions-cell {
          width: 20%;
          padding: var(--spacing-sm) var(--spacing-md);
          display: flex;
          justify-content: flex-end;
          align-items: center;
        }

        .edit-button {
          background: none;
          border: none;
          color: var(--primary-color);
          cursor: pointer;
          font-size: 1.25rem;
          padding: 4px 8px;
          border-radius: 4px;
          transition: background-color 0.2s;
        }

        .edit-button:hover {
          background-color: rgba(37, 99, 235, 0.1);
        }

        /* Modal Styles */
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: rgba(0, 0, 0, 0.5);
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 1000;
        }

        .modal-container {
          background-color: white;
          border-radius: 8px;
          width: 90%;
          max-width: 500px;
          max-height: 90vh;
          overflow-y: auto;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }

        .modal-header {
          padding: 1.5rem;
          border-bottom: 1px solid #e5e7eb;
          position: relative;
        }

        .modal-header h2 {
          margin: 0;
          font-size: 1.5rem;
          color: #111827;
        }

        .modal-subtitle {
          margin: 0.5rem 0 0;
          color: #6b7280;
          font-size: 1rem;
        }

        .close-button {
          position: absolute;
          top: 1rem;
          right: 1rem;
          background: none;
          border: none;
          font-size: 1.5rem;
          cursor: pointer;
          color: #6b7280;
        }

        .edit-form {
          padding: 1.5rem;
        }

        .form-group {
          margin-bottom: 1.25rem;
        }

        .form-row {
          display: flex;
          gap: 1rem;
        }

        .form-row .form-group {
          flex: 1;
        }

        label {
          display: block;
          margin-bottom: 0.5rem;
          font-weight: 500;
          color: #111827;
          font-size: 0.95rem;
        }

        input {
          width: 100%;
          padding: 0.75rem;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          font-size: 1rem;
          transition: border-color 0.2s;
        }

        input:focus {
          outline: none;
          border-color: #2563eb;
          box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.1);
        }

        .modal-actions {
          display: flex;
          justify-content: space-between;
          margin-top: 2rem;
          padding-top: 1rem;
          border-top: 1px solid #e5e7eb;
        }

        .right-actions {
          display: flex;
          gap: 0.75rem;
        }

        .delete-button,
        .cancel-button,
        .save-button {
          padding: 0.75rem 1rem;
          border: none;
          border-radius: 6px;
          font-size: 0.95rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }

        .delete-button {
          background-color: #ef4444;
          color: white;
        }

        .delete-button:hover {
          background-color: #dc2626;
        }

        .cancel-button {
          background-color: #f3f4f6;
          color: #4b5563;
        }

        .cancel-button:hover {
          background-color: #e5e7eb;
        }

        .save-button {
          background-color: #1e293b;
          color: white;
        }

        .save-button:hover {
          background-color: #0f172a;
        }
      `}</style>
    </div>
  );
};

export default AddressList; 