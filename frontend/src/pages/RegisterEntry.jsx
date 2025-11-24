import React, { useRef } from "react";
import { useNavigate } from "react-router-dom";


import { useRegistrationData } from "@/context/RegistrationContext";
import "@/styles/RegisterEntry.css";

export default function RegisterEntry(props) {
  const formRef = useRef(null);
  const navigate = useNavigate();
  const { updateFormData } = useRegistrationData();

  function handleNextStep(e) {
    e.preventDefault();
    const form = formRef.current;

    if (form) {
      if (!form.checkValidity()) {
        form.reportValidity();
        console.log("Validation failed: Please fill out all required fields.");
        return;
      }

      const formData = new FormData(form);
      const data = Object.fromEntries(formData);

      const allData = {
        ...data,
      };

      updateFormData(data);
      navigate("/emergency");

      form.reset();
      console.log("Data collected for next step:", allData);
    } else {
      console.error("Form reference is missing.");
    }
  }

  return (
    <>
        
      <article className="register-entry">
        <form ref={formRef} onSubmit={handleNextStep}>
          <section className="heading-details">
            <div className="title-and-back">
              <button
                className="back-button"
                onClick={() => {
                  navigate(-1);
                }}
              >
                &larr;
              </button>
              <h2>{props.data.heading.title}</h2>
            </div>
            <h3>{props.data.heading.subtitle}</h3>
          </section>
          <div className="personal-info">
            <div>
              <section
                key={props.data.personalInfo.id}
                className="personal-details"
              >
                <h4>Personal Information</h4>

                <label htmlFor="fullName">
                  {props.data.personalInfo.fullName}:
                  <input
                    id="fullName"
                    type="text"
                    defaultValue="vikash adivasi"
                    name="fullName"
                    placeholder="FullName"
                    required
                  ></input>
                </label>

                <label htmlFor="age">
                  {props.data.personalInfo.age}:
                  <input
                    id="age"
                    type="number"
                    defaultValue="18"
                    name="age"
                    placeholder="age"
                    required
                  ></input>
                </label>

                <label htmlFor="email">
                  {props.data.personalInfo.email}:
                  <input
                    id="email"
                    type="email"
                    defaultValue="vikas@gmail.com"
                    name="email"
                    placeholder="vikas@gmail.com"
                    required
                  ></input>
                </label>

                <label htmlFor="password">
                  {props.data.personalInfo.password}:
                  <input
                    id="password"
                    type="password"
                    defaultValue=""
                    name="password"
                    placeholder="a-z/1-9"
                    required
                  ></input>
                </label>

                <label htmlFor="phoneNumber">
                  {props.data.personalInfo.phone}:
                  <input
                    id="phoneNumber"
                    type="tel"
                    defaultValue="9754221972"
                    name="phoneNumber"
                    placeholder="0000-0000-00"
                    required
                  ></input>
                </label>

                <label htmlFor="nationality">
                  {props.data.personalInfo.nationality}:
                  <input
                    id="nationality"
                    type="text"
                    name="nationality"
                    placeholder="indian"
                    required
                  ></input>
                </label>

                <label htmlFor="aadhar">
                  {props.data.personalInfo.aadhaar}:
                  <input
                    id="aadhar"
                    type="number"
                    name="aadhar"
                    placeholder="1234-5678-1290"
                    required
                  ></input>
                </label>
              </section>
            </div>

            <div className="next-button1" key={props.data.buttons.id}>
              <button type="submit">
                {props.data.buttons.next || "Submit"}
              </button>
            </div>
          </div>
        </form>
      </article>
    </>
  );
}
