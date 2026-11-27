const EventTicketing = artifacts.require("EventTicketing");

contract("EventTicketing", (accounts) => {
  const [organizer, buyer, receiver] = accounts;
  let instance;

  beforeEach(async () => {
    instance = await EventTicketing.new();
  });

  it("creates an event successfully", async () => {
    const price = web3.utils.toWei("0.1", "ether");
    await instance.createEvent("Blockchain Conf", "2026-12-20", "Mumbai", price, 20, { from: organizer });

    const ev = await instance.events(1);
    assert.equal(ev.name, "Blockchain Conf");
    assert.equal(ev.totalTickets.toNumber(), 20);
    assert.equal(ev.organizer, organizer);
  });

  it("allows purchasing, transferring, and verifying a ticket", async () => {
    const price = web3.utils.toWei("0.1", "ether");
    await instance.createEvent("Web3 Hackathon", "2026-12-25", "Delhi", price, 10, { from: organizer });

    await instance.buyTicket(1, { from: buyer, value: price });
    let ticket = await instance.tickets(1);
    assert.equal(ticket.owner, buyer);

    await instance.transferTicket(1, receiver, { from: buyer });
    ticket = await instance.tickets(1);
    assert.equal(ticket.owner, receiver);

    await instance.verifyAndUseTicket(1, { from: organizer });
    ticket = await instance.tickets(1);
    assert.equal(ticket.isUsed, true);
  });

  it("allows organizer to withdraw ticket revenue", async () => {
    const price = web3.utils.toWei("1", "ether");
    await instance.createEvent("VIP Gala", "2026-12-30", "Goa", price, 5, { from: organizer });
    await instance.buyTicket(1, { from: buyer, value: price });

    const balanceBefore = await instance.organizerBalances(organizer);
    assert.equal(balanceBefore.toString(), price);

    await instance.withdrawFunds({ from: organizer });
    const balanceAfter = await instance.organizerBalances(organizer);
    assert.equal(balanceAfter.toString(), "0");
  });
});
