import RegisterData from "@/utils/RegisterData";
import RegisterEntry from "@/pages/EmergencyEntry";
import Header from  "@/components/Header";
import BackgroundAnimation from "@/components/r3f/BackgroundAnimation";

export default function Emergency() {
  const emergencyContact = RegisterData.map((data) => {
    return <RegisterEntry key={data.heading.id} data={data} />;
  });

  return (
    <>
        <Header />
        <BackgroundAnimation />
        <article className="pt-20">
            <div>{emergencyContact}</div>
        </article>
    </>
  );
}
