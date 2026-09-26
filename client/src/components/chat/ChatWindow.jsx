import { useEffect, useState } from "react";
import socket from "../../socket/socketClient";
import axiosClient from "../../api/axiosClient";
import { useChatStore } from "../../store/chatStore";

export default function ChatWindow() {
  const activeGroupId = useChatStore((s) => s.activeGroupId);
  const activeThreadType = useChatStore((s) => s.activeThreadType) || "group";
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");

  useEffect(() => {
    if (!activeGroupId) return;

    axiosClient.get(`/messages/${activeGroupId}`).then((res) => setMessages(res.data.messages));

    socket.connect();
    socket.emit("group:join", activeGroupId);
    socket.on("message:new", (m) => setMessages((prev) => [...prev, m]));

    return () => {
      socket.off("message:new");
      socket.disconnect();
      setMessages([]);
    };
  }, [activeGroupId]);

  function sendMessage(e) {
    e.preventDefault();
    if (!text.trim() || !activeGroupId) return;
    socket.emit("message:send", { threadId: activeGroupId, threadType: activeThreadType, text });
    setText("");
  }

  if (!activeGroupId) return <p>Select a group</p>;

  return (
    <div>
      <div>
        {messages.map((m) => (
          <p key={m._id}><strong>{m.anonymousNameSnapshot}:</strong> {m.text}</p>
        ))}
      </div>
      <form onSubmit={sendMessage}>
        <input value={text} onChange={(e) => setText(e.target.value)} />
        <button type="submit">Send</button>
      </form>
    </div>
  );
}