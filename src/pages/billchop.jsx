import React, { useState, useEffect, useCallback } from 'react';
import { Modal, Table, Button, Input, Form, message } from 'antd';
import { doc, onSnapshot, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useNavigate } from 'react-router-dom';

const BillChop = (props) => {
  const [bill, setBill] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [myItemQty, setMyItemQty] = useState(0);
  const [allMyItemsArray, setAllMyItemsArray] = useState([]);
  const navigate = useNavigate();
  const tip = "10%";
  const [currencySymbol, setCurrencySymbol] = useState('R');
  const [totalBillAmount, setTotalBillAmount] = useState(0);

  /// gotbill from locao storage
 
  const gotBillid = localStorage.getItem('billId'); 

  

  const readUserData = useCallback(async () => {
    try {
      const fileContent =  localStorage.getItem('userData');
      return JSON.parse(fileContent);
    } catch (error) {
      console.error('Error reading user data:', error);
      return null;
    }
  }, []);

  useEffect(() => {
    if (!gotBillid) return;
  
    const fetchBill = async () => {
      try {
        const billRef = doc(db, 'bills', gotBillid);
        const unsubscribe = onSnapshot(billRef, async (docSnap) => {
          if (docSnap.exists()) {
            const billData = { id: docSnap.id, ...docSnap.data() };
  
            // Calculate the line item totals
            const updatedBillFields = (billData.billfields || []).map(item => ({
              ...item,
              total: item.price * item.quantity, // Calculate line item total
            }));
  
            // Set the bill state with updated billfields
            setBill({ ...billData, billfields: updatedBillFields });
  
            const userData = await readUserData();
            const uid = userData?.uid;
  
            // Get currency symbol from the first bill field item
            const currencySymbol = updatedBillFields[0]?.currencySymbol || '';
            setCurrencySymbol(currencySymbol);
  
            // Calculate the total bill amount including tip
            const totals = updatedBillFields.reduce((acc, item) => acc + (item.price * item.quantity), 0);
            const tipPercentage = tip === "10%" ? 0.10 : tip === "15%" ? 0.15 : tip === "20%" ? 0.20 : 0;
            setTotalBillAmount((totals + (totals * tipPercentage)).toFixed(2));
  
            // Filter claimed items for the current user
            const claimedItems = updatedBillFields.filter((item) => {
              const claimedByIds = item.claimedBy?.map(claim => claim.claimedByUid) || [];
              return claimedByIds.includes(uid);
            });
            setAllMyItemsArray(claimedItems);
          }
        });
  
        return () => unsubscribe();
      } catch (error) {
        console.error("Error fetching document: ", error);
      }
    };
  
    fetchBill();
  }, [gotBillid, readUserData, tip]);

  const increaseQuantity = async () => {
    // Check if selectedItem is valid
    if (!selectedItem || typeof selectedItem.quantity !== 'number') return;

    const totalQty = selectedItem.quantity;

    // Calculate total claimed quantities
    const claimedQuantities = selectedItem.claimedBy?.reduce((sum, item) => sum + (item.claimedQuantity || 0), 0) || 0;

    // Fetch user data to check for specific user's claimed quantity
    const userData = await readUserData();
    const uid = userData?.uid;

    // Calculate the user's already claimed quantity
    let userClaimedQty = 0;
    if (uid) {
        userClaimedQty = selectedItem.claimedBy?.filter(item => item.claimedByUid === uid)
            .reduce((sum, item) => sum + (item.claimedQuantity || 0), 0) || 0;
    }

    // Calculate available quantity considering total claimed and user's claim
    const availableQty = totalQty - claimedQuantities + userClaimedQty;

    console.log('availableQty', availableQty);

    // Update the quantity in state
    setMyItemQty(prevQty => {
        // Check if increasing the quantity exceeds available quantity
        if (prevQty < availableQty) {
            return prevQty + 1; // Increase the quantity
        }
        message.warning('You have reached the maximum quantity'); // Alert if max is reached
        return prevQty; // Return previous quantity if limit is reached
    });
};

  const decreaseQuantity = () => {
    if (!selectedItem || typeof selectedItem.quantity !== 'number') return;
    
    const totalQty = selectedItem.quantity;
    const claimedQuantities = selectedItem.claimedBy?.reduce((sum, item) => sum + (item.claimedQuantity || 0), 0) || 0;
  
    const availableQty = totalQty - claimedQuantities;
    
    setMyItemQty(prevQty => {
      if (prevQty > 0) return prevQty - 1;
      message.warning('Quantity cannot be less than zero');
      return prevQty;
    });
  };
  

  const openEditModal = async (lineItem) => {
    setMyItemQty(0);
    const userData = await readUserData();
    const uid = userData?.uid;
    const claimedBy = lineItem.claimedBy || [];

    const claimedByIds = claimedBy.map(item => item.claimedByUid);
    if (claimedByIds.includes(uid)) {
      const currentUserClaim = claimedBy.find(item => item.claimedByUid === uid);
      setMyItemQty(currentUserClaim?.claimedQuantity || 0);
    } else {
      setMyItemQty(0);
    }

    setSelectedItem(lineItem);
    setModalVisible(true);
  };

const claimItem = async () => {
    if (myItemQty <= 0) {
        message.error('Please select a quantity');
        return;
    }

    const itemId = selectedItem.id;
    const userData = await readUserData();
    const uid = userData?.uid;

    const claimedByData = {
        name: userData?.name,
        claimedByUid: uid,
        claimedByProfileImage: userData?.profileImage,
        claimedQuantity: myItemQty,
    };

    try {
        const billDocRef = doc(db, "bills", gotBillid);
        const billDoc = await getDoc(billDocRef);
        if (billDoc.exists()) {
            const billData = billDoc.data();
            const updatedBillFields = billData.billfields.map((field) => {
                if (field.id === itemId) {
                    const claimedByArray = Array.isArray(field.claimedBy) ? field.claimedBy : [];
                    
                    // Check if the user has already claimed the item
                    const existingClaim = claimedByArray.find(claimant => claimant.claimedByUid === uid);
                    
                    if (existingClaim) {
                        // Update the existing claim's quantity
                        existingClaim.claimedQuantity = myItemQty;
                    } else {
                        // Add a new claim if the user hasn't claimed it before
                        claimedByArray.push(claimedByData);
                    }

                    return { ...field, claimedBy: claimedByArray };
                }
                return field;
            });

            await updateDoc(billDocRef, { billfields: updatedBillFields });
            message.success('Item claimed successfully!');
        }
    } catch (error) {
        console.error("Error updating document: ", error);
    }

    setModalVisible(false);
};

const proceedReview = () => {

  navigate('/pages/fullBillBreakdown');


};


  const unclaimItem = async () => {
    const itemId = selectedItem.id;
    const userData = await readUserData();
    const uid = userData?.uid;

    try {
      const billDocRef = doc(db, "bills", gotBillid);
      const billDoc = await getDoc(billDocRef);
      if (billDoc.exists()) {
        const billData = billDoc.data();
        const updatedBillFields = billData.billfields.map((field) => {
          if (field.id === itemId) {
            return {
              ...field,
              claimedBy: field.claimedBy.filter((claimant) => claimant.claimedByUid !== uid),
            };
          }
          return field;
        });

        await updateDoc(billDocRef, { billfields: updatedBillFields });
        message.success('Item unclaimed successfully!');
      }
    } catch (error) {
      console.error("Error updating document: ", error);
    }

    setModalVisible(false);
  };

  const columns = [
    {
        title: 'Item',
        dataIndex: 'item',
        key: 'item',
        render: (text, record) => (
            <div>
                <div>{record.item}</div>
                <div style={{ display: 'flex', gap: '11px', marginTop: '5px', flexWrap: 'wrap',fontSize: '10px' }}>
                    {record.claimedBy?.map((claim) => (
                        <div key={claim.claimedByUid} style={{ textAlign: 'center' }}>
                            <img
                                src={claim.claimedByProfileImage}
                                alt={claim.name}
                                style={{ width: '30px', height: '30px', borderRadius: '50%' }}
                            />
                            <div style={{ fontSize: '11px' }}>{claim.claimedQuantity}</div>
                        </div>
                    ))}
                </div>
            </div>
        ),
    },
    {
        title: 'Qty',
        dataIndex: 'quantity',
        key: 'quantity',
        render: (text) => (
            <span style={{ fontFamily: 'Arial, sans-serif', fontSize: '11px' }}>{text}</span>
        ),
    },
    {
        title: 'Price',
        dataIndex: 'price',
        key: 'price',
        render: (text) => (
            <span style={{ fontFamily: 'Arial, sans-serif', fontSize: '11px' }}>
                {`${currencySymbol}${text.toFixed(2)}`}
            </span>
        ),
    },
    {
        title: 'Total',
        dataIndex: 'total',
        key: 'total',
        render: (text) => (
            <span style={{ fontFamily: 'Arial, sans-serif', fontSize: '11px' }}>
                {`${currencySymbol}${text.toFixed(2)}`}
            </span>
        ),
    },
    {
        title: 'Action',
        key: 'action',
        render: (text, record) => {
            // Calculate total claimed quantity
            const claimedBy = Array.isArray(record.claimedBy) ? record.claimedBy : []; // Default to an empty array
            const totalClaimedQuantity = claimedBy.reduce((total, claimedItem) => total + (claimedItem.claimedQuantity || 0), 0);

            return (
                <div>
                    <Button onClick={() => openEditModal(record)} style={{ fontFamily: 'Arial, sans-serif', fontSize: '11px' }}>
                        Claim
                    </Button>
                    {totalClaimedQuantity === record.quantity ? (
                        <div style={{ fontFamily: 'Arial, sans-serif', fontSize: '11px' }}> Claimed ✅</div>
                    ) : (
                        <div  style={{ fontFamily: 'Arial, sans-serif', fontSize: '11px' }}>
                             Claimed: <br /> {totalClaimedQuantity} / {record.quantity}
                        </div>
                    )}
                </div>
            );
        },
    },
];

  


  return (
    <div style={{ padding: '20px', fontSize: '18px', overflowY: 'auto', maxHeight: '80vh' }}>
      <h2 style={{ fontSize: '22px' }}>Total Amount: {currencySymbol}{totalBillAmount}</h2>
      <Button key="unclaim" onClick={proceedReview} style={{ backgroundColor: 'green', color: 'white' }}>
            Proceed to Review
          </Button>
      <div className="table-container">
      <Table dataSource={bill?.billfields || []}
       columns={columns}
        rowKey="id"
         pagination={false}
         scroll={{ x: '100%' }}
         />
      </div>
      <Modal
        visible={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={[
          <Button key="unclaim" onClick={unclaimItem} style={{ backgroundColor: 'red', color: 'white' }}>
            Unclaim
          </Button>,
          <Button key="submit" type="primary" onClick={claimItem}>
            Claim
          </Button>,
          <Button key="back" onClick={() => setModalVisible(false)}>
            Close
          </Button>
        ]}
      >
        <Form layout="vertical">
          <Form.Item>
            <span>Item: {selectedItem?.item}</span>
            <br></br>
            <span>Total Item Qty: {selectedItem?.quantity}</span>
          </Form.Item>
          <Form.Item label="Quantity">
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <Button onClick={decreaseQuantity}>-</Button>
              <Input
                type="number"
                value={myItemQty}
                onChange={(e) => setMyItemQty(parseInt(e.target.value) || 0)}
                style={{ width: '60px', textAlign: 'center', margin: '0 10px' }}
              />
              <Button onClick={increaseQuantity}>+</Button>
            </div>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default BillChop;
