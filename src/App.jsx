import { useState } from 'react';
import './App.css';
import { doc, setDoc, arrayUnion } from 'firebase/firestore';
import { db } from './firebase';
import { useNavigate } from 'react-router-dom';

function App() {
  const [inputValue, setInputValue] = useState('');
  const [proImage, setProImage] = useState('');
  const [ext, setExt] = useState('');
  const [awsProfile, setAwsProfile] = useState('');
  const navigate = useNavigate();

  const handleProfileImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const fileExtension = file.name.split('.').pop().toLowerCase();
    setExt(fileExtension);

    if (!['jpg', 'jpeg', 'png'].includes(fileExtension)) {
      alert('Please upload a valid image file (jpg, jpeg, or png).');
      return;
    }

    const tempFilePath = URL.createObjectURL(file);
    
    setProImage(tempFilePath);
  };

  const handleInputChange = (e) => {
    setInputValue(e.target.value);
  };

  const handleButtonClick = async () => {
    if (!inputValue.trim()) {
      alert('Please enter your name');
      return;
    }
  
    if (!proImage) {
      alert('No file uploaded. Please add an image.');
      return;
    }
  
    const response = await fetch(proImage);
    const blob = await response.blob();
    const formData = new FormData();
    formData.append('file', blob, `profileImage.${ext}`);
  
    try {
      const uploadResponse = await fetch('https://baselinesandbox.co.za/jp/cc/profileUpload.php', {
        method: 'POST',
        body: formData,
      });
  
      const responseData = await uploadResponse.json();
      const imageUrl = responseData.mediaUrl;
      
      if (imageUrl) {
        setAwsProfile(imageUrl);
      } else {
        throw new Error('Failed to retrieve image URL');
      }
  
      // Proceed only after awsProfile is set
      const urlParams = new URLSearchParams(window.location.search);
      const billId = urlParams.get('billId');
  
      if (!billId) {
        console.log('No bill ID provided in the URL.');
        return;
      }
  
      const guestId = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      const chops = {
        friendId: guestId,
        date: new Date(),
        name: inputValue,
        type: 'webView',
      };
  
      try {
        const userRefBills = doc(db, 'bills', billId);
        await setDoc(userRefBills, {
          friends: arrayUnion(chops),
        }, { merge: true });
      } catch (error) {
        console.error('Error updating or creating document:', error);
      }
  
      const userData = JSON.stringify({ 
        name: inputValue, 
        uid: guestId,
        profileImage: imageUrl // Use imageUrl directly
      });
  
      //console.log('userData', userData);
  
      localStorage.setItem('userData', userData);
      localStorage.setItem('billId', billId);
  
       navigate('/pages/billchop');
    } catch (error) {
      console.error('Image upload failed:', error);
      alert('Image upload failed. Please try again.');
    }
  };
  

  return (
    <div className="container">
      <div className="card">
        <div className="card-title">Add Your Image</div>
        <input 
          type="file"
          accept="image/*"
          className="card-input-file"
          onChange={handleProfileImageUpload}
        />
        <div className="card-title">Add Your Name</div>
        <input 
          type="text"
          placeholder="Your Name"
          className="card-input"
          value={inputValue}
          onChange={handleInputChange}
        />
        <button className="card-button" onClick={handleButtonClick}>Chop Cheque</button>
      </div>
    </div>
  );
}

export default App;
