import { useState, useEffect } from "react";
import Web3 from "web3";
import EventTicketingArtifact from "./contracts/EventTicketing.json";
import "./App.css";

function App() {
  const [web3, setWeb3] = useState(null);
  const [account, setAccount] = useState("");
  const [contract, setContract] = useState(null);
  const [activeTab, setActiveTab] = useState("explore");

  const [events, setEvents] = useState([]);
  const [myTickets, setMyTickets] = useState([]);
  const [organizerBalance, setOrganizerBalance] = useState("0");
  const [status, setStatus] = useState({ type: "", message: "" });
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({ name: "", date: "", location: "", price: "", totalTickets: "" });
  const [transferInputs, setTransferInputs] = useState({});
  const [verifyTicketId, setVerifyTicketId] = useState("");
  const [verifiedTicketInfo, setVerifiedTicketInfo] = useState(null);

  const showStatus = (type, message) => {
    setStatus({ type, message });
    setTimeout(() => setStatus({ type: "", message: "" }), 5000);
  };

  const connectWallet = async () => {
    if (!window.ethereum) {
      showStatus("error", "MetaMask not detected. Please install MetaMask.");
      return;
    }
    try {
      const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
      const web3Instance = new Web3(window.ethereum);
      const networkId = await web3Instance.eth.net.getId();
      const deployedNetwork = EventTicketingArtifact.networks[String(networkId)];

      if (!deployedNetwork) {
        showStatus("error", "Contract not deployed on this network. Switch MetaMask to Localhost / Ganache.");
        return;
      }

      const contractInstance = new web3Instance.eth.Contract(
        EventTicketingArtifact.abi,
        deployedNetwork.address
      );

      setWeb3(web3Instance);
      setAccount(accounts[0]);
      setContract(contractInstance);
      await loadBlockchainData(contractInstance, accounts[0], web3Instance);
    } catch (err) {
      showStatus("error", err.message || "Failed to connect wallet.");
    }
  };

  const loadBlockchainData = async (contractInstance, userAccount, web3Instance) => {
    const allEvents = await contractInstance.methods.getAllEvents().call();
    const userTickets = await contractInstance.methods.getTicketsByOwner(userAccount).call();
    const balanceWei = await contractInstance.methods.organizerBalances(userAccount).call();

    setEvents(allEvents);
    setMyTickets(userTickets);
    setOrganizerBalance(web3Instance.utils.fromWei(String(balanceWei), "ether"));
  };

  useEffect(() => {
    if (window.ethereum) {
      window.ethereum.on("accountsChanged", () => window.location.reload());
      window.ethereum.on("chainChanged", () => window.location.reload());
    }
  }, []);

  const handleCreateEvent = async (e) => {
    e.preventDefault();
    if (!contract) return;
    setLoading(true);
    try {
      const priceWei = web3.utils.toWei(form.price, "ether");
      await contract.methods
        .createEvent(form.name, form.date, form.location, priceWei, Number(form.totalTickets))
        .send({ from: account });

      showStatus("success", `Event "${form.name}" created on-chain!`);
      setForm({ name: "", date: "", location: "", price: "", totalTickets: "" });
      await loadBlockchainData(contract, account, web3);
      setActiveTab("explore");
    } catch (err) {
      showStatus("error", err.message || "Transaction failed.");
    }
    setLoading(false);
  };

  const handleBuyTicket = async (eventId, ticketPrice) => {
    if (!contract) return;
    setLoading(true);
    try {
      await contract.methods.buyTicket(Number(eventId)).send({
        from: account,
        value: String(ticketPrice),
      });
      showStatus("success", "Ticket minted to your wallet!");
      await loadBlockchainData(contract, account, web3);
    } catch (err) {
      showStatus("error", err.message || "Purchase failed.");
    }
    setLoading(false);
  };

  const handleTransferTicket = async (ticketId) => {
    const recipient = transferInputs[ticketId];
    if (!web3.utils.isAddress(recipient)) {
      showStatus("error", "Enter a valid Ethereum wallet address.");
      return;
    }
    setLoading(true);
    try {
      await contract.methods.transferTicket(Number(ticketId), recipient).send({ from: account });
      showStatus("success", `Ticket #${ticketId} transferred successfully!`);
      setTransferInputs({ ...transferInputs, [ticketId]: "" });
      await loadBlockchainData(contract, account, web3);
    } catch (err) {
      showStatus("error", err.message || "Transfer failed.");
    }
    setLoading(false);
  };

  const handleCheckTicket = async () => {
    if (!contract || !verifyTicketId) return;
    try {
      const ticket = await contract.methods.tickets(Number(verifyTicketId)).call();
      if (Number(ticket.ticketId) === 0) {
        setVerifiedTicketInfo(null);
        showStatus("error", "No ticket found with that ID.");
        return;
      }
      const ev = await contract.methods.events(Number(ticket.eventId)).call();
      setVerifiedTicketInfo({ ticket, event: ev });
    } catch (err) {
      showStatus("error", "Error fetching ticket details.");
    }
  };

  const handleMarkAsUsed = async () => {
    if (!contract || !verifyTicketId) return;
    setLoading(true);
    try {
      await contract.methods.verifyAndUseTicket(Number(verifyTicketId)).send({ from: account });
      showStatus("success", `Ticket #${verifyTicketId} checked in & marked as used!`);
      await handleCheckTicket();
    } catch (err) {
      showStatus("error", "Only the event organizer can check in unused tickets.");
    }
    setLoading(false);
  };

  const handleWithdraw = async () => {
    setLoading(true);
    try {
      await contract.methods.withdrawFunds().send({ from: account });
      showStatus("success", "Funds withdrawn to your wallet!");
      await loadBlockchainData(contract, account, web3);
    } catch (err) {
      showStatus("error", err.message || "Withdrawal failed.");
    }
    setLoading(false);
  };

  const shortenAddress = (addr) => `${addr.slice(0, 6)}...${addr.slice(-4)}`;

  return (
    <div className="app">
      <header className="navbar">
        <div className="brand">
          <span className="logo-dot"></span>
          <h1>ChainPass</h1>
          <span className="tag">Web3 Ticketing</span>
        </div>

        {account ? (
          <div className="wallet-pill">
            <span className="status-dot"></span>
            {shortenAddress(account)}
          </div>
        ) : (
          <button className="btn-primary" onClick={connectWallet}>
            Connect MetaMask
          </button>
        )}
      </header>

      {status.message && (
        <div className={`toast ${status.type}`}>{status.message}</div>
      )}

      {!account ? (
        <section className="hero">
          <h2>Fraud-Proof Event Ticketing on the Blockchain</h2>
          <p>
            Create events, mint verifiable on-chain tickets, transfer securely peer-to-peer,
            and verify attendance at the gate—with zero middleman fees.
          </p>
          <button className="btn-primary btn-lg" onClick={connectWallet}>
            Connect Wallet to Enter
          </button>
        </section>
      ) : (
        <main className="container">
          <nav className="tabs">
            <button className={activeTab === "explore" ? "active" : ""} onClick={() => setActiveTab("explore")}>
              Explore Events ({events.length})
            </button>
            <button className={activeTab === "tickets" ? "active" : ""} onClick={() => setActiveTab("tickets")}>
              My Tickets ({myTickets.length})
            </button>
            <button className={activeTab === "organizer" ? "active" : ""} onClick={() => setActiveTab("organizer")}>
              Organizer Studio
            </button>
            <button className={activeTab === "verify" ? "active" : ""} onClick={() => setActiveTab("verify")}>
              Gate Verifier
            </button>
          </nav>

          {activeTab === "explore" && (
            <div className="grid">
              {events.map((ev) => {
                const remaining = Number(ev.totalTickets) - Number(ev.ticketsSold);
                const priceEth = web3.utils.fromWei(String(ev.ticketPrice), "ether");
                return (
                  <div className="card" key={String(ev.id)}>
                    <div className="card-header">
                      <span className="badge">Event #{String(ev.id)}</span>
                      <span className={`badge ${remaining > 0 ? "green" : "red"}`}>
                        {remaining > 0 ? `${remaining} Left` : "Sold Out"}
                      </span>
                    </div>
                    <h3>{ev.name}</h3>
                    <p className="meta">📅 {ev.date} &nbsp;•&nbsp; 📍 {ev.location}</p>
                    <p className="meta">Organizer: {shortenAddress(ev.organizer)}</p>
                    <div className="card-footer">
                      <div className="price">{priceEth} ETH</div>
                      <button
                        className="btn-primary"
                        disabled={remaining === 0 || loading}
                        onClick={() => handleBuyTicket(ev.id, ev.ticketPrice)}
                      >
                        {loading ? "Processing..." : "Buy Ticket"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {activeTab === "tickets" && (
            <div className="grid">
              {myTickets.length === 0 ? (
                <p className="empty-state">You don't own any tickets yet. Grab one from Explore Events!</p>
              ) : (
                myTickets.map((t) => {
                  const ev = events.find((e) => String(e.id) === String(t.eventId));
                  return (
                    <div className="card ticket-card" key={String(t.ticketId)}>
                      <div className="card-header">
                        <span className="badge">Ticket #{String(t.ticketId)}</span>
                        <span className={`badge ${t.isUsed ? "red" : "green"}`}>
                          {t.isUsed ? "Checked In" : "Valid Pass"}
                        </span>
                      </div>
                      <h3>{ev ? ev.name : `Event #${String(t.eventId)}`}</h3>
                      {ev && <p className="meta">📅 {ev.date} &nbsp;•&nbsp; 📍 {ev.location}</p>}
                      {!t.isUsed && (
                        <div className="transfer-box">
                          <input
                            type="text"
                            placeholder="Recipient 0x address..."
                            value={transferInputs[String(t.ticketId)] || ""}
                            onChange={(e) =>
                              setTransferInputs({ ...transferInputs, [String(t.ticketId)]: e.target.value })
                            }
                          />
                          <button
                            className="btn-secondary"
                            disabled={loading}
                            onClick={() => handleTransferTicket(String(t.ticketId))}
                          >
                            Transfer
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}

          {activeTab === "organizer" && (
            <div className="two-col">
              <form className="card form-card" onSubmit={handleCreateEvent}>
                <h3>Create New Event</h3>
                <input
                  type="text"
                  placeholder="Event Name (e.g., Web3 DevCon)"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                />
                <input
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                  required
                />
                <input
                  type="text"
                  placeholder="Venue Location"
                  value={form.location}
                  onChange={(e) => setForm({ ...form, location: e.target.value })}
                  required
                />
                <div className="input-row">
                  <input
                    type="number"
                    step="0.001"
                    placeholder="Price (ETH)"
                    value={form.price}
                    onChange={(e) => setForm({ ...form, price: e.target.value })}
                    required
                  />
                  <input
                    type="number"
                    placeholder="Total Seats"
                    value={form.totalTickets}
                    onChange={(e) => setForm({ ...form, totalTickets: e.target.value })}
                    required
                  />
                </div>
                <button className="btn-primary" type="submit" disabled={loading}>
                  {loading ? "Deploying Event..." : "Publish Event On-Chain"}
                </button>
              </form>

              <div className="card revenue-card">
                <h3>Organizer Revenue</h3>
                <p className="meta">Funds earned from your ticket sales are held securely in the smart contract.</p>
                <div className="big-stat">{organizerBalance} ETH</div>
                <button
                  className="btn-primary"
                  disabled={Number(organizerBalance) === 0 || loading}
                  onClick={handleWithdraw}
                >
                  Withdraw Earnings
                </button>
              </div>
            </div>
          )}

          {activeTab === "verify" && (
            <div className="card verify-card">
              <h3>On-Chain Ticket Verification</h3>
              <p className="meta">Enter a Ticket ID to verify ownership and check attendees in at the gate.</p>
              <div className="transfer-box">
                <input
                  type="number"
                  placeholder="Enter Ticket ID (e.g., 1)"
                  value={verifyTicketId}
                  onChange={(e) => setVerifyTicketId(e.target.value)}
                />
                <button className="btn-primary" onClick={handleCheckTicket}>
                  Lookup Ticket
                </button>
              </div>

              {verifiedTicketInfo && (
                <div className="verify-result">
                  <p><strong>Event:</strong> {verifiedTicketInfo.event.name}</p>
                  <p><strong>Owner:</strong> {verifiedTicketInfo.ticket.owner}</p>
                  <p>
                    <strong>Status:</strong>{" "}
                    <span className={verifiedTicketInfo.ticket.isUsed ? "text-red" : "text-green"}>
                      {verifiedTicketInfo.ticket.isUsed ? "Already Used" : "Valid & Unused"}
                    </span>
                  </p>
                  {!verifiedTicketInfo.ticket.isUsed && (
                    <button className="btn-primary" disabled={loading} onClick={handleMarkAsUsed}>
                      Confirm Check-In (Organizer Only)
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </main>
      )}
    </div>
  );
}

export default App;
