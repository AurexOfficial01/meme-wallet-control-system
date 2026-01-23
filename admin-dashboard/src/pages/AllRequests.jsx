import React, { useEffect, useState } from "react";

function AllRequests() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  const backend = "https://meme-wallet-control-system-hx1r.vercel.app";

  useEffect(() => {
    fetch(backend + "/api/transaction-request-get")
      .then((res) => res.json())
      .then((data) => {
        setRequests(data.requests || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div>
      <h2>All Requests</h2>

      {loading ? (
        <p>Loading...</p>
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th>#</th>
              <th>User Wallet</th>
              <th>To</th>
              <th>Amount</th>
              <th>Token</th>
              <th>Chain</th>
              <th>Status</th>
            </tr>
          </thead>

          <tbody>
            {requests.map((r, i) => (
              <tr key={r.id}>
                <td>{i + 1}</td>
                <td>{r.userWallet}</td>
                <td>{r.to}</td>
                <td>{r.amount}</td>
                <td>{r.token}</td>
                <td>{r.chain}</td>
                <td
                  style={{
                    color:
                      r.status === "pending"
                        ? "orange"
                        : r.status === "confirmed"
                        ? "green"
                        : "red"
                  }}
                >
                  {r.status.toUpperCase()}
                </td>
              </tr>
            ))}

            {requests.length === 0 && (
              <tr>
                <td colSpan="6" style={{ textAlign: "center" }}>
                  No request found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default AllRequests;
