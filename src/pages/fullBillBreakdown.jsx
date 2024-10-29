import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import '../App.css';

const FullBillBreakdown = (props) => {
  const navigate = useNavigate();
  const [groupedByUser, setGroupedByUser] = useState({});
  const [expandedUsers, setExpandedUsers] = useState({});
  const [tip, setTip] = useState('');
  
  const gotBillid = localStorage.getItem('billId'); 
  const billTotal = 1000;
  const tipAmount = (tip === "10%" ? 0.10 : tip === "15%" ? 0.15 : tip === "20%" ? 0.20 : 0);
  const tipTotal = billTotal * tipAmount;
  const [currencySymbol, setCurrencySymbol] = useState('R');

  useEffect(() => {
    if (!gotBillid) return;

    const fetchBill = async () => {
      try {
        const billRef = doc(db, 'bills', gotBillid);
        const unsubscribe = onSnapshot(billRef, async (docSnap) => {
          if (docSnap.exists()) {
            const billData = { id: docSnap.id, ...docSnap.data() };
            const billFields = billData.billfields || [];
            const currencySymbol = billFields[0]?.currencySymbol || '';
            setCurrencySymbol(currencySymbol);

            const tip = billData.tip;
            setTip(tip);
            
            const claimedItems = [];

            billData.billfields.forEach(field => {
              const claimedBy = field.claimedBy;

              if (Array.isArray(claimedBy)) {
                claimedBy.forEach(user => {
                  const img = user.claimedByProfileImage;
                  const itemName = field.item;
                  const itemPrice = field.price;
                  const userName = user.name;
                  const claimedQty = user.claimedQuantity;
                  const claimedTotal = itemPrice * claimedQty;
                  const tip = claimedTotal * 0.15;

                  claimedItems.push({ itemName, itemPrice, userName, claimedQty, claimedTotal, tip, img });
                });
              }
            });

            const grouped = claimedItems.reduce((acc, item) => {
              const userKey = item.userName;
              if (!acc[userKey]) {
                acc[userKey] = [];
              }
              acc[userKey].push(item);
              return acc;
            }, {});

            setGroupedByUser(grouped);
          }
        });

        return () => unsubscribe();
      } catch (error) {
        console.error("Error fetching document: ", error); 
      }
    };

    fetchBill();
  }, [gotBillid]);

  const toggleUserItems = (userName) => {
    setExpandedUsers(prevState => ({
      ...prevState,
      [userName]: !prevState[userName],
    }));
  };

  const backToLanding = () => {
    navigate('/landing');
  };

  const calculateGrandTotals = (groupedByUser) => {
    let totalPaid = 0;

    Object.values(groupedByUser).forEach(items => {
      items.forEach(item => {
        totalPaid += item.claimedTotal;
      });
    });

    totalPaid += tipTotal;

    return { totalPaid };
  };

  const { totalPaid } = calculateGrandTotals(groupedByUser);

  return (
    <div className="container">
      {Object.keys(groupedByUser).map(userName => {
        const items = groupedByUser[userName];

        const userTotal = items.reduce((total, item) => total + item.claimedTotal + item.tip, 0);
        const totalClaimed = items.reduce((total, item) => total + item.claimedTotal, 0);
        const totalTips = items.reduce((total, item) => total + item.tip, 0);
        const totalQty = items.reduce((total, item) => total + item.claimedQty, 0);

        return (
           <div>
          <div key={userName} className="userContainer">
            <div onClick={() => toggleUserItems(userName)} className="userRow">
              <img src={items[0]?.img || 'https://via.placeholder.com/50'} alt={userName} className="userImage" />
              <div className="userInfo">
                <h3 className="userName">{userName}</h3>
                <p className="userTotal">Total: {currencySymbol}{userTotal.toFixed(2)} (Includes Tip)</p>
              </div>
            </div>
            </div>

            {expandedUsers[userName] && (
            <div className="itemsContainer">
                <div className="headerRow">
                <span className="columnText headerText">Item</span>
                <span className="columnText headerText">Quantity</span>
                <span className="columnText headerText">Amount</span>
                <span className="columnText headerText">Tip</span>
                </div>

                {items.map((item, index) => (
                <div key={index} className="itemRow">
                    <span className="itemText">{item.itemName}</span>
                    <span className="itemText">{item.claimedQty}</span>
                    <span className="itemText">{currencySymbol}{item.claimedTotal.toFixed(2)}</span>
                    <span className="itemText">{currencySymbol}{item.tip.toFixed(2)}</span>
                </div>
                ))}

                <div className="itemRow">
                <span className="totalText">Totals</span>
                <span className="totalText">{totalQty}</span>
                <span className="totalText">{currencySymbol}{totalClaimed.toFixed(2)}</span>
                <span className="totalText">{currencySymbol}{totalTips.toFixed(2)}</span>
                </div>
            </div>
            )}

          </div>
        );
      })}

      <div className="grandTotalContainer">
        <h2 className="grandTotalText">Bill Total: {currencySymbol}{billTotal.toFixed(2)}</h2>
        <h2 className="grandTotalText">Tip Total: {currencySymbol}{tipTotal.toFixed(2)}</h2>
        <h2 className="grandTotalText">Grand Total: {currencySymbol}{(billTotal + tipTotal).toFixed(2)}</h2>
        <h2 className="grandTotalText">Accounted For: {currencySymbol}{totalPaid.toFixed(2)}</h2>
      </div>
      <button className="saveButton" onClick={backToLanding}>
        Done!
      </button>
    </div>
  );
};

export default FullBillBreakdown;
