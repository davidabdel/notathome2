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
  address: string;
  block_number: string;
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
  const [addressFields, setAddressFields] = useState<AddressFields>({
    address: '',
    block_number: '',
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
  
  const handleDelete = async (addressId: string) => {
    if (!confirm('Are you sure you want to delete this address?')) {
      return;
    }

    try {
      setError(null);
      setDetailedError(null);
      
      const { error: deleteError } = await supabase
        .from('not_at_home_addresses')
        .delete()
        .eq('id', addressId);
      
      if (deleteError) {
        setError('Error deleting address');
        setDetailedError(deleteError.message);
        console.error('Delete error:', deleteError);
        return;
      }
      
      // Update the local state
      setAddresses(addresses.filter(addr => addr.id !== addressId));
      
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

  const parseAddress = (address: string) => {
    // Initialize with empty values
    const fields: AddressFields = {
      address: '',
      block_number: '',
    };

    try {
      // Remove any extra whitespace and split the address
      const parts = address.trim().split(',').map(part => part.trim());

      if (parts.length >= 1) {
        // Handle the first part which could contain unit and house number
        const streetParts = parts[0].split(' ');
        
        // Check if the first part might be a unit number
        if (streetParts[0].toLowerCase().includes('unit')) {
          fields.address = streetParts.slice(1).join(' ');
          fields.block_number = streetParts[0];
        } else {
          fields.address = streetParts.join(' ');
          fields.block_number = streetParts[0];
        }
      }

      // If there's a second part, it's likely the suburb
      if (parts.length >= 2) {
        fields.address += `, ${parts[1]}`;
      }
    } catch (err) {
      console.error('Error parsing address:', err);
    }

    return fields;
  };
  
  const startEditing = (address: Address) => {
    setEditingId(address.id);
    const parsedAddress = parseAddress(address.address);
    setAddressFields(parsedAddress);
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
      const formattedAddress = [
        addressFields.address
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
            address: formattedAddress.trim()
          };
          return updatedAddr;
        }
        return addr;
      });
      
      setAddresses(updatedAddresses);
      
      // Reset editing state
      setEditingId(null);
      setAddressFields({
        address: '',
        block_number: '',
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

  if (loading) {
    return <div className="text-center py-4">Loading addresses...</div>;
  }
  
  return (
    <div className="addresses-container">
      <h2>Addresses</h2>
      {error && <div className="error-message">{error}</div>}
      <div className="address-list">
        <div className="address-header">
          <div className="address-cell">Address</div>
          <div className="actions-cell">Actions</div>
        </div>
        {addresses.map(address => (
          <div key={address.id} className="address-row">
            {editingId === address.id ? (
              <form onSubmit={handleSubmit} className="edit-form">
                <div className="form-group">
                  <label>Address</label>
                  <input
                    type="text"
                    value={addressFields.address}
                    onChange={(e) => handleInputChange('address', e.target.value)}
                    placeholder="e.g., 123 Main St, Richmond"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Block Number</label>
                  <input
                    type="text"
                    value={addressFields.block_number}
                    onChange={(e) => handleInputChange('block_number', e.target.value)}
                    placeholder="e.g., 4B"
                    required
                  />
                </div>
                <div className="button-group">
                  <button type="submit" className="save-button">Save</button>
                  <button 
                    type="button" 
                    onClick={() => setEditingId(null)}
                    className="cancel-button"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <>
                <div className="address-cell">{formatAddress(address)}</div>
                <div className="actions-cell">
                  <button 
                    onClick={() => startEditing(address)}
                    className="edit-button"
                  >
                    ✎
                  </button>
                </div>
              </>
            )}
          </div>
        ))}
      </div>

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

        .edit-form {
          flex: 1;
          padding: var(--spacing-md);
          background-color: var(--background-color);
        }

        .form-group {
          margin-bottom: var(--spacing-md);
        }

        label {
          display: block;
          margin-bottom: var(--spacing-xs);
          font-weight: 500;
          color: var(--text-color);
        }

        input {
          width: 100%;
          padding: 0.5rem 0.75rem;
          border: 1px solid var(--border-color);
          border-radius: 4px;
          font-size: 1rem;
          transition: border-color 0.2s;
        }

        input:focus {
          outline: none;
          border-color: var(--primary-color);
          box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.1);
        }

        .button-group {
          display: flex;
          gap: var(--spacing-sm);
          margin-top: var(--spacing-md);
        }

        .save-button,
        .cancel-button {
          padding: 0.5rem 1rem;
          border: none;
          border-radius: 4px;
          font-size: 0.875rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }

        .save-button {
          background-color: var(--primary-color);
          color: white;
        }

        .save-button:hover {
          background-color: var(--primary-hover);
        }

        .cancel-button {
          background-color: var(--border-color);
          color: var(--text-secondary);
        }

        .cancel-button:hover {
          background-color: #d1d5db;
        }
      `}</style>
    </div>
  );
};

export default AddressList; 