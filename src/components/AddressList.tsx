import React, { useState, useEffect } from 'react';
import { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '../utils/supabaseClient';

// Explicitly type the supabase client
const supabaseClient: SupabaseClient = supabase;

interface Address {
  id: string;
  block_number: number;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  created_at: string;
}

interface AddressFields {
  unitNumber: string;
  houseNumber: string;
  streetName: string;
  suburb: string;
  blockNumber: number;
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
  const [editingAddress, setEditingAddress] = useState<Address | null>(null);
  const [addressFields, setAddressFields] = useState<AddressFields>({
    unitNumber: '',
    houseNumber: '',
    streetName: '',
    suburb: '',
    blockNumber: 0
  });

  const fetchAddresses = async () => {
    setLoading(true);
    setError(null);
    setDetailedError(null);
    
    try {
      // Check if the not_at_home_addresses table exists
      const { data: tableExists, error: tableCheckError } = await supabaseClient
        .from('not_at_home_addresses')
        .select('id', { count: 'exact', head: true })
        .limit(1);

      if (tableCheckError) {
        if (tableCheckError.message.includes('does not exist')) {
          setError('Addresses table does not exist');
          setDetailedError('The not_at_home_addresses table has not been created. Please run the create-addresses-table API endpoint.');
          setLoading(false);
          return;
        } else {
          setError('Error checking addresses table');
          setDetailedError(tableCheckError.message);
          setLoading(false);
          return;
        }
      }

      // Fetch addresses for the current session and block (if selected)
      let query = supabaseClient
        .from('not_at_home_addresses')
        .select('*')
        .eq('session_id', sessionId)
        .order('block_number', { ascending: true });
      
      if (selectedBlock) {
        query = query.eq('block_number', selectedBlock);
      }
      
      const { data, error: fetchError } = await query;
      
      if (fetchError) {
        setError('Error fetching addresses');
        setDetailedError(fetchError.message);
        console.error('Fetch error:', fetchError);
      } else {
        setAddresses(data || []);
      }
    } catch (err) {
      setError('Failed to fetch addresses');
      setDetailedError(err instanceof Error ? err.message : String(err));
      console.error('Error in fetchAddresses:', err);
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
      
      const { error: deleteError } = await supabaseClient
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

  // Parse an address string into separate fields
  const parseAddress = (address: string | null): AddressFields => {
    if (!address) {
      return {
        unitNumber: '',
        houseNumber: '',
        streetName: '',
        suburb: '',
        blockNumber: editingAddress?.block_number || 0
      };
    }

    // Try to parse the address into components
    let unitNumber = '';
    let houseNumber = '';
    let streetName = '';
    let suburb = '';

    // Check for unit number (format: "Unit X, ...")
    const unitMatch = address.match(/^Unit\s+(\w+),\s+/i);
    if (unitMatch) {
      unitNumber = unitMatch[1];
      address = address.substring(unitMatch[0].length);
    }

    // Split the remaining address by commas
    const parts = address.split(',').map(part => part.trim());
    
    if (parts.length >= 1) {
      // First part should be house number and street
      const streetParts = parts[0].split(' ');
      if (streetParts.length >= 2) {
        houseNumber = streetParts[0];
        streetName = streetParts.slice(1).join(' ');
      } else {
        streetName = parts[0];
      }
    }

    // Last part is likely the suburb
    if (parts.length >= 2) {
      suburb = parts[parts.length - 1];
    }

    return {
      unitNumber,
      houseNumber,
      streetName,
      suburb,
      blockNumber: editingAddress?.block_number || 0
    };
  };
  
  const startEditing = (address: Address) => {
    setEditingAddress(address);
    const parsedAddress = parseAddress(address.address);
    setAddressFields({
      ...parsedAddress,
      blockNumber: address.block_number
    });
  };
  
  const cancelEditing = () => {
    setEditingAddress(null);
    setAddressFields({
      unitNumber: '',
      houseNumber: '',
      streetName: '',
      suburb: '',
      blockNumber: 0
    });
  };

  const handleInputChange = (field: keyof AddressFields, value: string | number) => {
    setAddressFields(prev => ({
      ...prev,
      [field]: value
    }));
  };
  
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!editingAddress) return;
    
    try {
      setError(null);
      setDetailedError(null);

      // Format the address from the fields
      const formattedAddress = [
        addressFields.unitNumber ? `Unit ${addressFields.unitNumber},` : '',
        `${addressFields.houseNumber} ${addressFields.streetName}`,
        addressFields.suburb
      ].filter(Boolean).join(' ');
      
      const { error: updateError } = await supabaseClient
        .from('not_at_home_addresses')
        .update({ 
          address: formattedAddress.trim() || null,
          block_number: addressFields.blockNumber
        })
        .eq('id', editingAddress.id);
      
      if (updateError) {
        setError('Error updating address');
        setDetailedError(updateError.message);
        console.error('Update error:', updateError);
        return;
      }
      
      // Update the local state
      setAddresses(addresses.map(addr => 
        addr.id === editingAddress.id 
          ? { 
              ...addr, 
              address: formattedAddress.trim() || null,
              block_number: addressFields.blockNumber
            } 
          : addr
      ));
      
      // Reset editing state
      setEditingAddress(null);
      setAddressFields({
        unitNumber: '',
        houseNumber: '',
        streetName: '',
        suburb: '',
        blockNumber: 0
      });
      
      // Notify parent component if needed
      if (onAddressUpdated) {
        onAddressUpdated();
      }
    } catch (err) {
      setError('Failed to update address');
      setDetailedError(err instanceof Error ? err.message : String(err));
      console.error('Error in handleEditSubmit:', err);
    }
  };

  const handleDeleteFromModal = async () => {
    if (!editingAddress) return;
    
    await handleDelete(editingAddress.id);
    cancelEditing();
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
    <div className="w-full bg-white rounded-lg shadow-md">
      <div className="px-6 py-4 border-b border-gray-200">
        {/* Title removed to avoid duplication */}
      </div>
      
      {error && (
        <div className="mx-4 my-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          <p>{error}</p>
          {detailedError && (
            <p className="text-sm mt-1">
              <strong>Details:</strong> {detailedError}
            </p>
          )}
        </div>
      )}
      
      {addresses.length === 0 ? (
        <div className="p-6 text-gray-500 italic">No addresses recorded yet.</div>
      ) : (
        <div style={{ width: '100%', overflowX: 'auto' }}>
          <table style={{ width: '100%', tableLayout: 'fixed', borderCollapse: 'collapse' }}>
            <colgroup>
              <col style={{ width: '15%' }} />
              <col style={{ width: '65%' }} />
              <col style={{ width: '20%' }} />
            </colgroup>
            <thead style={{ backgroundColor: '#F9FAFB' }}>
              <tr>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '0.75rem', fontWeight: '500', color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #E5E7EB' }}>
                  Block
                </th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '0.75rem', fontWeight: '500', color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #E5E7EB' }}>
                  Address
                </th>
                <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: '0.75rem', fontWeight: '500', color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #E5E7EB' }}>
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {addresses.map(address => (
                <tr key={address.id} style={{ borderBottom: '1px solid #E5E7EB' }}>
                  <td style={{ padding: '12px 16px', fontSize: '0.875rem', color: '#111827', whiteSpace: 'nowrap' }}>
                    {address.block_number}
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: '0.875rem', color: '#111827' }}>
                    <span>{formatAddress(address)}</span>
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '16px' }}>
                      <button
                        onClick={() => startEditing(address)}
                        style={{ padding: '6px', color: '#2563EB', background: 'transparent', border: 'none', borderRadius: '9999px', cursor: 'pointer' }}
                        title="Edit address"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" style={{ width: '20px', height: '20px' }} viewBox="0 0 20 20" fill="currentColor">
                          <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDelete(address.id)}
                        style={{ padding: '6px', color: '#DC2626', background: 'transparent', border: 'none', borderRadius: '9999px', cursor: 'pointer' }}
                        title="Delete address"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" style={{ width: '20px', height: '20px' }} viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Edit Address Modal */}
      {editingAddress && (
        <div className="modal-overlay" style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000
        }}>
          <div className="modal-content" style={{
            backgroundColor: 'white',
            borderRadius: '0.5rem',
            width: '90%',
            maxWidth: '500px',
            maxHeight: '90vh',
            overflowY: 'auto',
            padding: '1.5rem',
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
          }}>
            <div className="modal-header" style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '0.5rem'
            }}>
              <h2 className="modal-title" style={{
                fontSize: '1.5rem',
                fontWeight: 600,
                color: '#111827',
                margin: 0
              }}>Edit Location</h2>
              <button 
                onClick={cancelEditing} 
                style={{
                  background: 'transparent',
                  border: 'none',
                  fontSize: '1.25rem',
                  cursor: 'pointer',
                  color: '#6B7280'
                }}
              >
                ✕
              </button>
            </div>
            <p className="modal-subtitle" style={{
              color: '#6B7280',
              fontSize: '1rem',
              marginTop: '0.5rem',
              marginBottom: '1.5rem'
            }}>Update the location details</p>
            
            <form onSubmit={handleEditSubmit} style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '1.25rem'
            }}>
              <div className="form-group" style={{
                display: 'flex',
                flexDirection: 'column'
              }}>
                <label htmlFor="blockNumber" style={{
                  fontWeight: 500,
                  marginBottom: '0.5rem',
                  color: '#111827'
                }}>Block Number</label>
                <input
                  id="blockNumber"
                  type="number"
                  value={addressFields.blockNumber}
                  onChange={(e) => handleInputChange('blockNumber', parseInt(e.target.value) || 0)}
                  style={{
                    padding: '0.75rem',
                    border: '1px solid #D1D5DB',
                    borderRadius: '0.375rem',
                    fontSize: '1rem',
                    width: '100%'
                  }}
                  required
                />
              </div>
              
              <div style={{ display: 'flex', gap: '1rem' }}>
                <div className="form-group" style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column'
                }}>
                  <label htmlFor="unitNumber" style={{
                    fontWeight: 500,
                    marginBottom: '0.5rem',
                    color: '#111827'
                  }}>Unit Number</label>
                  <input
                    id="unitNumber"
                    type="text"
                    value={addressFields.unitNumber}
                    onChange={(e) => handleInputChange('unitNumber', e.target.value)}
                    placeholder="Optional"
                    style={{
                      padding: '0.75rem',
                      border: '1px solid #D1D5DB',
                      borderRadius: '0.375rem',
                      fontSize: '1rem',
                      width: '100%'
                    }}
                  />
                </div>
                <div className="form-group" style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column'
                }}>
                  <label htmlFor="houseNumber" style={{
                    fontWeight: 500,
                    marginBottom: '0.5rem',
                    color: '#111827'
                  }}>House Number</label>
                  <input
                    id="houseNumber"
                    type="text"
                    value={addressFields.houseNumber}
                    onChange={(e) => handleInputChange('houseNumber', e.target.value)}
                    style={{
                      padding: '0.75rem',
                      border: '1px solid #D1D5DB',
                      borderRadius: '0.375rem',
                      fontSize: '1rem',
                      width: '100%'
                    }}
                    required
                  />
                </div>
              </div>
              
              <div className="form-group" style={{
                display: 'flex',
                flexDirection: 'column'
              }}>
                <label htmlFor="streetName" style={{
                  fontWeight: 500,
                  marginBottom: '0.5rem',
                  color: '#111827'
                }}>Street Name</label>
                <input
                  id="streetName"
                  type="text"
                  value={addressFields.streetName}
                  onChange={(e) => handleInputChange('streetName', e.target.value)}
                  style={{
                    padding: '0.75rem',
                    border: '1px solid #D1D5DB',
                    borderRadius: '0.375rem',
                    fontSize: '1rem',
                    width: '100%'
                  }}
                  required
                />
              </div>
              
              <div className="form-group" style={{
                display: 'flex',
                flexDirection: 'column'
              }}>
                <label htmlFor="suburb" style={{
                  fontWeight: 500,
                  marginBottom: '0.5rem',
                  color: '#111827'
                }}>Suburb</label>
                <input
                  id="suburb"
                  type="text"
                  value={addressFields.suburb}
                  onChange={(e) => handleInputChange('suburb', e.target.value)}
                  style={{
                    padding: '0.75rem',
                    border: '1px solid #D1D5DB',
                    borderRadius: '0.375rem',
                    fontSize: '1rem',
                    width: '100%'
                  }}
                />
              </div>
              
              <div style={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '1rem',
                marginTop: '1rem'
              }}>
                <button
                  type="button"
                  onClick={handleDeleteFromModal}
                  style={{
                    padding: '0.75rem 1.5rem',
                    backgroundColor: '#EF4444',
                    color: 'white',
                    border: 'none',
                    borderRadius: '0.375rem',
                    fontSize: '1rem',
                    fontWeight: 500,
                    cursor: 'pointer'
                  }}
                >
                  Delete
                </button>
                <button
                  type="button"
                  onClick={cancelEditing}
                  style={{
                    padding: '0.75rem 1.5rem',
                    backgroundColor: 'white',
                    border: '1px solid #D1D5DB',
                    borderRadius: '0.375rem',
                    fontSize: '1rem',
                    cursor: 'pointer',
                    color: '#111827'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    padding: '0.75rem 1.5rem',
                    backgroundColor: '#0F172A',
                    color: 'white',
                    border: 'none',
                    borderRadius: '0.375rem',
                    fontSize: '1rem',
                    fontWeight: 500,
                    cursor: 'pointer'
                  }}
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AddressList; 