import MessageBubble from "./MessageBubble";

export default function OpportunityCard({ message, isOwnMessage, userRole, threadType, blockedList, isSenderKicked, onUserAdded }) {
  // System messages render without the card wrapper
  if (message.type === "system") {
    return <MessageBubble message={message} isOwnMessage={isOwnMessage} userRole={userRole} threadType={threadType} blockedList={blockedList} isSenderKicked={isSenderKicked} onUserAdded={onUserAdded} />;
  }

  return (
    <div style={{
      opacity: message.isOptimistic ? 0.6 : 1,
      transition: "opacity 0.2s ease"
    }}>
      <MessageBubble message={message} isOwnMessage={isOwnMessage} userRole={userRole} threadType={threadType} blockedList={blockedList} isSenderKicked={isSenderKicked} onUserAdded={onUserAdded} />
    </div>
  );
}