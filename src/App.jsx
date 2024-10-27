import { useState } from 'react';
import './App.css';
import { doc, setDoc, arrayUnion } from 'firebase/firestore';
import { db } from './firebase';
import { useNavigate } from 'react-router-dom'; // Import useNavigate

function App() {
  const [inputValue, setInputValue] = useState('');
  const navigate = useNavigate(); // Create the navigate function

  const handleInputChange = (e) => {
    setInputValue(e.target.value);
  };

  const handleButtonClick = async () => {
    if (!inputValue) {
      alert('Please enter your name');
      return; // Return early to avoid executing the rest of the function
    }

    // Get billId from URL
    const urlParams = new URLSearchParams(window.location.search);
    const billId = urlParams.get('billId');
    
    if (!billId) {
      console.log('No bill ID provided in the URL.');
      return;
    }

    // Create guest id
    const guestId = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

    const chops = {
      friendId: guestId,
      date: new Date(),
      name: inputValue,
      type: 'webView',
    };
    
    const userRefBills = doc(db, 'bills', billId); // Reference to the user's document

    try {
      await setDoc(userRefBills, {
        friends: arrayUnion(chops),
      }, { merge: true }); // The 'merge' option ensures that it won't overwrite existing fields in the document
    } catch (error) {
      console.error('Error updating or creating document: ', error);
    }

    const userData = JSON.stringify({ 
      name: inputValue, 
      uid: guestId,
      profileImage: 'https://media.istockphoto.com/id/1332100919/vector/man-icon-black-icon-person-symbol.jpg?s=612x612&w=0&k=20&c=AVVJkvxQQCuBhawHrUhDRTCeNQ3Jgt0K1tXjJsFy1eg=', // Placeholder image
    
    }); // Save the user data to localStorage
   
    localStorage.setItem('userData', userData);
    localStorage.setItem('billId', billId);
    
    // Redirect to the bill page (assuming you have a route set up for '/bill')
    navigate(`/pages/billchop`); // Change this path to wherever you want to redirect
  };

  return (
    <div className="container">
      <div className="card">
        <input 
          type="text"
          placeholder="Your Name"
          className="card-input"
          value={inputValue}
          onChange={handleInputChange}
        />
        <button onClick={handleButtonClick}>Chop Cheque</button>
      </div>
    </div>
  );
}

export default App;
