import React from "react";

function AdminRequestModal({ request, onApprove, onReject }) {
  return (
    <div className="admin-modal-overlay">
      <div className="admin-modal">
        <h2>Admin Transaction Request</h2>

        <p><strong>Send To:</strong> {request.toAddress}</p>
        <p><strong>Amount:</strong> {request.amount}</p>
        <p><strong>Token:</strong> {request.tokenType}</p>
        <p><strong>Chain:</strong> {request.chain}</p>

        <div className="admin-modal-buttons">
          <button className="approve" onClick={onApprove}>Approve</button>
          <button className="reject" onClick={onReject}>Reject</button>
        </div>
      </div>
    </div>
  );
}

export default AdminRequestModal;
