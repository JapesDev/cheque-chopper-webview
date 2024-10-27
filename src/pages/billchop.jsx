import React, { useState, useEffect, useCallback } from 'react';
import { Modal, Table, Button, Input, Form, message } from 'antd';
import { doc, onSnapshot, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';


const BillChop = (props) => {
  const [bill, setBill] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [myItemQty, setMyItemQty] = useState(0);
  const [allMyItemsArray, setAllMyItemsArray] = useState([]);

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
            setBill(billData);
            const userData = await readUserData();
            const uid = userData?.uid;

            const billFields = billData.billfields || [];
            const currencySymbol = billFields[0]?.currencySymbol || '';
            setCurrencySymbol(currencySymbol);

            const totals = billFields.reduce((acc, item) => acc + (item.price * item.quantity), 0);
            setTotalBillAmount((totals + (totals * (tip === "10%" ? 0.10 : tip === "15%" ? 0.15 : tip === "20%" ? 0.20 : 0))).toFixed(2));

            const claimedItems = billFields.filter((item) => {
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

  const openEditModal = async (lineItem) => {
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
            return { ...field, claimedBy: [...claimedByArray, claimedByData] };
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
      title: 'Item Name',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: 'Price',
      dataIndex: 'price',
      key: 'price',
      render: (text) => `${currencySymbol}${text.toFixed(2)}`,
    },
    {
      title: 'Quantity',
      dataIndex: 'quantity',
      key: 'quantity',
    },
    {
      title: 'Action',
      key: 'action',
      render: (text, record) => (
        <Button onClick={() => openEditModal(record)}>Edit</Button> 
      ),
    },
  ];



  return (
    <div style={{ padding: '20px' }}>
      <Table dataSource={bill?.billfields || []} columns={columns} rowKey="id" />
      <Modal
        title="Edit Item"
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
          <Form.Item label="Item Name">
            <span>{selectedItem?.name}</span>
          </Form.Item>
          <Form.Item label="Quantity">
            <Input
              type="number"
              value={myItemQty}
              onChange={(e) => setMyItemQty(parseInt(e.target.value) || 0)}
            />
          </Form.Item>
        </Form>
      </Modal>
      <h2>Total Amount: {currencySymbol}{totalBillAmount}</h2>
    </div>
  );
};

export default BillChop;
