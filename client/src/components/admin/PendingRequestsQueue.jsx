import { useEffect, useState } from "react";
import { fetchPendingRequests, reviewRequest } from "../../api/admin.api";

export default function PendingRequestsQueue() {
  const [requests, setRequests] = useState([]);

  useEffect(() => {
    fetchPendingRequests().then((res) => setRequests(res.data.requests));
  }, []);

  async function handleReview(requestId, decision) {
    await reviewRequest(requestId, decision);
    setRequests((prev) => prev.filter((r) => r._id !== requestId));
  }

  return (
    <div>
      <h3>Pending Requests</h3>
      {requests.map((r) => (
        <div key={r._id}>
          <p>
            {r.requestedBy.anonymousName} wants to {r.action} {r.targetUserId.anonymousName}
          </p>
          <button onClick={() => handleReview(r._id, "approved")}>Approve</button>
          <button onClick={() => handleReview(r._id, "rejected")}>Reject</button>
        </div>
      ))}
    </div>
  );
}