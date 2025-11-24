import "@/components/ui/button/Button.css";
import "@/styles/theme.css";

export default function Button({ children, className = "", ...props }) {
  return (
    <button className={`ui-button ${className}`} {...props}>
      {children}
    </button>
  );
}

