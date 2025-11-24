import RegisterData from "@/utils/RegisterData";
import RegisterEntry from "@/pages/RegisterEntry";

import Header from "@/components/Header";
import BackgroundAnimation from "@/components/r3f/BackgroundAnimation";

export default function Register() {
  const personalInfo = RegisterData.map((data) => {
    return <RegisterEntry key={data.heading.id} data={data} />;
  });
  return (
    <>
        <Header />
        <BackgroundAnimation />
        <div className="pt-20">
            <div>{personalInfo}</div>
        </div>
    </>
  );
}
