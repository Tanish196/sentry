import React, { useRef, useState } from 'react'
import { useNavigate } from "react-router-dom"
import { useRegistrationData } from '@/context/RegistrationContext'
import '@/styles/EmergencyEntry.css'

import axios from 'axios';

const getExistingEmergencyData = () => {
    try {
        const savedData = localStorage.getItem('emergencyData');
        if (savedData) {
            return JSON.parse(savedData);
        }
    } catch (e) {
        console.error("Failed to parse emergency data from storage.");
    }
    return {
        medicalInfo: '',
        contacts: []
    };
};


export default function EmergencyEntry(props){

    const formRef = useRef(null)
    const navigate = useNavigate()
    const { updateFormData } = useRegistrationData()

    const [isSuccess, setIsSuccess] = useState(false)

    const handleSuccessAndNavigate = (newFullData) => {

        updateFormData(newFullData)
        
        setIsSuccess(true)
        
        const timer = setTimeout(() => {
            setIsSuccess(false)
            navigate("/")
        }, 2000)

        return () => clearTimeout(timer)
    };


    

async function handleNextStep(e) {
    e.preventDefault();
    const form = formRef.current;

    if (!form) {
        console.error("Form reference is missing.");
        return;
    }

    if (!form.checkValidity()) {
        form.reportValidity();
        console.log("Validation failed: Please fill out all required fields.");
        return;
    }

    const formData = new FormData(form);
    const newEntry = Object.fromEntries(formData);

    // Construct the payload matching your backend fields
    const payload = {
        Name: newEntry.name,                 // your input name for user's name
        Age: newEntry.age,                   // your input name for age
        Email_Address: newEntry.email,       // input for email
        Phone_Number: newEntry.phone,        // input for phone
        Nationality: newEntry.nationality,   // input for nationality
        Adhaar_Number: newEntry.adhaar,      // input for adhaar
        Contact_Name: newEntry.contactName,
        Contact_Phone: newEntry.contactPhoneNum,
        Relationship: newEntry.relationship,
        password: newEntry.password
    };

    try {
        const response = await axios.post("http://localhost:3030/signup", payload);

        console.log("Signup successful:", response.data);

        // Optionally, save emergency data in localStorage too
        const existingData = getExistingEmergencyData();
        const newContact = {
            name: newEntry.contactName,
            phone: newEntry.contactPhoneNum,
            relationship: newEntry.relationship,
            id: Date.now()
        };
        const updatedData = {
            medicalInfo: newEntry.description || "",
            contacts: [...existingData.contacts, newContact]
        };
        localStorage.setItem('emergencyData', JSON.stringify(updatedData));
        handleSuccessAndNavigate(updatedData);

    } catch (error) {
        if (error.response) {
            // Server responded with an error
            console.error("Error from server:", error.response.data);
        } else {
            console.error("Network or other error:", error.message);
        }
    }
}


    return(
        <article className="register-entry relative">
            
            {isSuccess && (
                <div className="success-notification fixed top-4 left-1/2 transform -translate-x-1/2 z-50">
                    ✅ {props.data.success.title}
                </div>
            )}

            <form ref={formRef} onSubmit={handleNextStep}>
             <section className="heading-details">
                <div className="title-and-back">
                        <button className="back-button" onClick={() => {navigate(-1)}}>
                            &larr; 
                        </button>
                        <h2>{props.data.heading.title}</h2>
                </div>
                <h3>{props.data.heading.subtitle}</h3>
             </section>
             <div className="Emergency-Contacts">
                <div>
                    <section key={props.data.emergency.id} className="emergency-contacts">
                        <h4>Emergency Contacts (First Entry)</h4>
                        <label htmlFor="contactName">
                            {props.data.emergency.contactName}:
                            <input id="contactName" type="text" name="contactName" placeholder="FullName" required ></input>
                        </label>


                        <label htmlFor="contactPhoneNum">
                            {props.data.emergency.contactPhone}:
                            <input id="contactPhoneNum" type="tel" name="contactPhoneNum" placeholder="0000-0000-00" required></input>
                        </label>

                        <label htmlFor="relationship">
                            {props.data.emergency.contactRelation}:
                            <input id="relationship" type="text" name="relationship" placeholder="spouse" required></input>
                        </label>
                        
                        <label htmlFor="description">
                            {props.data.emergency.medicalInfo}:
                            <textarea id="description" name="description" placeholder="any medical conditions,allergic.."></textarea>
                        </label>
                        
                    </section>
                </div>
             

                <div className="next-button2" key={props.data.buttons.id}>
                    <button  type="submit">
                    {props.data.buttons?.submit || "Generate Digital ID"}

                    </button>
                </div>
            </div>
             </form>
 
        </article>
     )
}