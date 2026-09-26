import { useEffect, useState } from "react";
import { fetchMyGroups } from "../../api/group.api";
import { useChatStore } from "../../store/chatStore";

export default function Sidebar() {
  const [groups, setGroups] = useState([]);
  const setActiveGroupId = useChatStore((s) => s.setActiveGroupId);
  const activeGroupId = useChatStore((s) => s.activeGroupId);

  useEffect(() => {
    fetchMyGroups().then((res) => setGroups(res.data.groups));
  }, []);

  return (
    <div>
      {groups.map((g) => (
        <div
          key={g._id}
          onClick={() => setActiveGroupId(g._id)}
          style={{ fontWeight: activeGroupId === g._id ? "bold" : "normal", cursor: "pointer" }}
        >
          <p>{g.name}</p>
          <p>{g.lastMessageSnippet}</p>
        </div>
      ))}
    </div>
  );
}