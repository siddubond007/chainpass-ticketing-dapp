const EventTicketing = artifacts.require("EventTicketing");

module.exports = async function (deployer) {
  await deployer.deploy(EventTicketing);
  const instance = await EventTicketing.deployed();

  const price1 = web3.utils.toWei("0.05", "ether");
  const price2 = web3.utils.toWei("0.1", "ether");

  await instance.createEvent(
    "ETH Global Builders Summit",
    "2026-12-15",
    "Bengaluru Tech Park",
    price1,
    100
  );
  await instance.createEvent(
    "Web3 Music & Art Fest",
    "2026-12-22",
    "Hyderabad Arena",
    price2,
    50
  );
};
