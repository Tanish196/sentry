import "@/components/ui/card/card.css";

export default function Card({ children, className = "" }) {
  return <div className={`ui-card ${className}`}>{children}</div>;
}
