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
    const { formData } = useRegistrationData();

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

    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }

    const formDataLocal = new FormData(form);
    const newEntry = Object.fromEntries(formDataLocal);

    // Merge Step 1 + Step 2
    const payload = {
        name: formData.fullName,
        age: Number(formData.age),
        emailAddress: formData.email,
        phoneNumber: formData.phoneNumber,
        nationality: formData.nationality,
        adhaarNumber: formData.aadhar,
        password: formData.password,

        // emergency contact
        contactName: newEntry.contactName,
        contactemail: newEntry.contactPhoneNum,
        relationship: newEntry.relationship,
        destination: formData.destination || ""
    };

    try {
        console.log("Sending payload:", payload);
        const response = await axios.post("https://sentry-3.onrender.com/signup", payload);

        console.log("Signup successful:", response.data);
        alert("Signup successful");
        navigate("/");
    } catch (error) {
        if (error.response) console.log("Error from server:", error.response.data);
        else console.log("Network error:", error.message);
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
                            <input id="contactPhoneNum" type="tel" name="contactPhoneNum" placeholder="abcd@gmail.com" required></input>
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