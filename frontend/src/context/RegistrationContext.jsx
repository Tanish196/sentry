import React, { createContext, useContext, useState } from 'react';

const RegistrationContext = createContext();

export function RegistrationProvider({ children }) {
  
  const [formData, setFormData] = useState({});

  const updateFormData = (newData) => {
    setFormData(prevData => ({
      ...prevData, 
      ...newData,  
    }));
  };
  
  const resetFormData = () => setFormData({});

  const value = { formData, updateFormData, resetFormData };

  return (
    <RegistrationContext.Provider value={value}>
      {children}
    </RegistrationContext.Provider>
  );
}


export const useRegistrationData = () => {
  const context = useContext(RegistrationContext);

  if (context === undefined) {
    throw new Error('useRegistrationData must be used within a RegistrationProvider');
  }
  return context;
    

};