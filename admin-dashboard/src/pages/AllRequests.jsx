import React, { useState, useEffect } from "react";

export default function AllRequests() {
  const [list, setList] = useState([]);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    const res = await fetch(
      "https://meme-wallet-control-system-hx1r.vercel.app/api/transaction-request-get"
    );

    const data = await res.json();
    if (data.success) setList(data.requests);
  };

  return (
    <div className="page">
      <h1>All Transaction Requests</h1>

      <table className="table">
        <thead>
          <tr>
            <th>User Wallet</th>
            <th>To</th>
            <th>Amount</th>
            <th>Token</th>
            <th>Status</th>
            <th>Updated</th>
          </tr>
        </thead>

        <tbody>
          {list.map((req) => (
            <tr key={req.id}>
              <td>{req.wallet}</td>
              <td>{req.to}</td>
              <td>{req.amount}</td>
              <td>{req.token}</td>
              <td style={{ 
                  color: req.status === "confirmed"
                    ? "lime"
                    : req.status === "rejected"
                    ? "red"
                    : "yellow"
                }}
              >
                {req.status.toUpperCase()}
              </td>
              <td>{req.updatedAt}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
