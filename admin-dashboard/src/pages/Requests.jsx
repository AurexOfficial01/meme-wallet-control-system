import React, { useEffect, useState } from "react";

export default function Requests() {
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
            <th>Wallet</th>
            <th>Chain</th>
            <th>To</th>
            <th>Amount</th>
            <th>Token</th>
            <th>Status</th>
            <th>TX Hash</th>
            <th>Created</th>
          </tr>
        </thead>

        <tbody>
          {list.map((r) => (
            <tr key={r.id}>
              <td>{r.wallet}</td>
              <td>{r.chain.toUpperCase()}</td>
              <td>{r.to}</td>
              <td>{r.amount}</td>
              <td>{r.token}</td>
              <td>
                <span
                  style={{
                    color:
                      r.status === "pending"
                        ? "orange"
                        : r.status === "completed"
                        ? "lightgreen"
                        : "red"
                  }}
                >
                  {r.status}
                </span>
              </td>
              <td>{r.txHash || "-"}</td>
              <td>{r.createdAt}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
