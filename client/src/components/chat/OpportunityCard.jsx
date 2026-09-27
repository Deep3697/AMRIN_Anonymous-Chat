import { getDeadlineBorderColor } from "../../utils/borderColor";
import MessageBubble from "./MessageBubble";

export default function OpportunityCard({ message, isOwnMessage, userRole, threadType }) {
  const color = getDeadlineBorderColor(message.meta?.deadline);
  return (
    <div style={{ 
      border: `2px solid ${color}`, 
      padding: "10px", 
      borderRadius: "8px",
      backgroundColor: "#fff",
      opacity: message.isOptimistic ? 0.6 : 1,
      transition: "opacity 0.2s ease"
    }}>
      {message.isOptimistic && (
        <span style={{ fontSize: "0.75em", color: "#888", float: "right" }}>Sending...</span>
      )}
      <MessageBubble message={message} isOwnMessage={isOwnMessage} userRole={userRole} threadType={threadType} />
    </div>
  );
}