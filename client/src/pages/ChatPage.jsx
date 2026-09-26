import Sidebar from "../components/layout/Sidebar";
import ChatWindow from "../components/chat/ChatWindow";

export default function ChatPage() {
  return (
    <div style={{ display: "flex" }}>
      <Sidebar />
      <ChatWindow />
    </div>
  );
}