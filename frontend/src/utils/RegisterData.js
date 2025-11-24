export default [
    {
        heading:{
            id:1,
            title: 'Tourist Registration',
            subtitle: 'Create your Digital Tourist ID for safe travel in India',
            },
        personalInfo: {
            id:2,
            fullName: 'Full Name',
            email: 'Email Address',
            password: 'Password',
            phone: 'Phone Number',
            nationality: 'Nationality',
            aadhaar: 'Aadhaar Number (Indians)',
            age: 'Age'
          },
        
        emergency: {
            id:3,
            contactName: 'Emergency Contact Name',
            contactPhone: 'Emergency Contact email',
            contactRelation: 'Relationship',
            medicalInfo: 'Medical Information (if any)'
          },

        buttons: {
            id:5,
            back: 'Back',
            next: 'Next',
            submit: 'Generate Digital ID',
            backToHome: 'Back to Home'
          },

        success: {
            id:6,
            title: 'Digital Tourist ID Generated Successfully!',
            description: 'Your unique tourist ID has been created. You can now access the tourist dashboard.',
            idNumber: 'Tourist ID: TIN-2024-',
          },

        profile:{
            id:7,
            
        }
    }
]