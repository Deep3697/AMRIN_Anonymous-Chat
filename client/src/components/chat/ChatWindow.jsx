import { useEffect, useState } from "react";
import socket from "../../socket/socketClient";
import axiosClient from "../../api/axiosClient";
import { useAuthStore } from "../../store/authStore";

const GROUP_ID = "6ab696e19cdf1d77e4cab915";

export default function ChatWindow() {
    const [messages, setMessages] = useState([]);
    const [text, setText] = useState("");
    const clearUser = useAuthStore((state) => state.clearUser);

    const handleLogout = async () => {
        try {
            await axiosClient.post("/auth/logout");
            clearUser();
        } catch (error) {
            console.error("Logout failed:", error);
        }
    };

    useEffect(() => {
        axiosClient.get(`/messages/${GROUP_ID}`).then((res) => setMessages(res.data.messages));

        socket.connect();
        socket.emit("group:join", GROUP_ID);
        socket.on("message:new", (m) => setMessages((prev) => [...prev, m]));
        socket.on("message:error", (err) => console.error("Message Error:", err));
        socket.on("connect_error", (err) => console.error("Socket Auth Error:", err.message));

        return () => {
            socket.off("message:new");
            socket.off("message:error");
            socket.off("connect_error");
            socket.disconnect();
        };
    }, []);

    function sendMessage(e) {
        e.preventDefault();
        if (!text.trim()) return;
        socket.emit("message:send", { groupId: GROUP_ID, text });
        setText("");
    }

    return (
        <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h2>Chat Window</h2>
                <button onClick={handleLogout} style={{ padding: "5px 10px", cursor: "pointer" }}>Logout (Temp)</button>
            </div>
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