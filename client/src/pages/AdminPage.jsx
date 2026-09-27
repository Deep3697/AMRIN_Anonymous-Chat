import { useState } from "react";
import { useNavigate } from "react-router-dom";
import BatchCreateForm from "../components/admin/BatchCreateForm";
import UnassignedUsersList from "../components/admin/UnassignedUsersList";
import AssignInstitutePanel from "../components/admin/AssignInstitutePanel";
import AssignBranchPanel from "../components/admin/AssignBranchPanel";
import AssignDivisionPanel from "../components/admin/AssignDivisionPanel";
import PendingRequestsQueue from "../components/admin/PendingRequestsQueue";
import ReportsQueue from "../components/admin/ReportsQueue";
import BanPanel from "../components/admin/BanPanel";
import BanAppealsPanel from "../components/admin/BanAppealsPanel";
import MutePanel from "../components/admin/MutePanel";
import { useAuthStore } from "../store/authStore";
import { logoutUser } from "../api/auth.api";

export default function AdminPage() {
  const navigate = useNavigate();
  const { user, clearUser } = useAuthStore();
  const [refreshKey, setRefreshKey] = useState(0);

  const isGodAdmin = user?.role === "god_admin";

  async function handleLogout() {
    try {
      await logoutUser();
    } finally {
      clearUser();
      navigate("/login");
    }
  }

  return (
    <div style={{ padding: "20px" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "20px",
          borderBottom: "1px solid #ccc",
          paddingBottom: "10px",
        }}
      >
        <h1>Admin Dashboard</h1>
        <div style={{ display: "flex", alignItems: "center", gap: "15px" }}>
          <span>
            Logged in as: <strong>{user?.anonymousName || "Admin"}</strong> ({user?.role})
          </span>
          <button onClick={() => navigate("/chat")} style={{ padding: "6px 12px", cursor: "pointer" }}>
            Go to Chat
          </button>
          <button onClick={handleLogout} style={{ padding: "6px 12px", cursor: "pointer" }}>
            Logout
          </button>
        </div>
      </div>

      {/* Batch Creation */}
      <BatchCreateForm onBatchCreated={() => setRefreshKey((k) => k + 1)} />
      <hr style={{ margin: "20px 0" }} />

      {/* Phase 1: Unassigned → Batch */}
      <UnassignedUsersList refreshKey={refreshKey} />
      <hr style={{ margin: "20px 0" }} />

      {/* Phase 2: Batch → Institute */}
      <AssignInstitutePanel />
      <hr style={{ margin: "20px 0" }} />

      {/* Phase 3: Institute → Branch */}
      <AssignBranchPanel />
      <hr style={{ margin: "20px 0" }} />

      {/* Phase 4: Branch → Division */}
      <AssignDivisionPanel />
      <hr style={{ margin: "20px 0" }} />

      {/* Monitor Requests */}
      <PendingRequestsQueue />
      <hr style={{ margin: "20px 0" }} />

      {/* User Reports */}
      <ReportsQueue />
      <hr style={{ margin: "20px 0" }} />

      {/* Mute Management */}
      <MutePanel />
      <hr style={{ margin: "20px 0" }} />

      {/* Ban Management */}
      <BanPanel />
      <hr style={{ margin: "20px 0" }} />

      {/* Ban Appeals — God Admin Only */}
      {isGodAdmin && (
        <>
          <BanAppealsPanel />
          <hr style={{ margin: "20px 0" }} />
        </>
      )}
    </div>
  );
}