// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract EventTicketing {
    struct Event {
        uint256 id;
        string name;
        string date;
        string location;
        uint256 ticketPrice;
        uint256 totalTickets;
        uint256 ticketsSold;
        address payable organizer;
        bool isActive;
    }

    struct Ticket {
        uint256 ticketId;
        uint256 eventId;
        address owner;
        bool isUsed;
        uint256 purchasedAt;
    }

    uint256 public eventCount;
    uint256 public ticketCount;
    bool private locked;

    mapping(uint256 => Event) public events;
    mapping(uint256 => Ticket) public tickets;
    mapping(address => uint256) public organizerBalances;

    event EventCreated(uint256 indexed eventId, string name, address indexed organizer, uint256 price, uint256 totalTickets);
    event TicketPurchased(uint256 indexed ticketId, uint256 indexed eventId, address indexed buyer);
    event TicketTransferred(uint256 indexed ticketId, address indexed from, address indexed to);
    event TicketVerified(uint256 indexed ticketId, uint256 indexed eventId, address indexed verifier);
    event FundsWithdrawn(address indexed organizer, uint256 amount);

    modifier nonReentrant() {
        require(!locked, "Reentrant call detected");
        locked = true;
        _;
        locked = false;
    }

    function createEvent(
        string memory _name,
        string memory _date,
        string memory _location,
        uint256 _ticketPrice,
        uint256 _totalTickets
    ) external {
        require(bytes(_name).length > 0, "Event name required");
        require(_totalTickets > 0, "Must have at least 1 ticket");
        require(_ticketPrice > 0, "Ticket price must be > 0");

        eventCount++;
        events[eventCount] = Event({
            id: eventCount,
            name: _name,
            date: _date,
            location: _location,
            ticketPrice: _ticketPrice,
            totalTickets: _totalTickets,
            ticketsSold: 0,
            organizer: payable(msg.sender),
            isActive: true
        });

        emit EventCreated(eventCount, _name, msg.sender, _ticketPrice, _totalTickets);
    }

    function buyTicket(uint256 _eventId) external payable nonReentrant {
        Event storage ev = events[_eventId];
        require(ev.id != 0 && ev.isActive, "Event does not exist or is inactive");
        require(ev.ticketsSold < ev.totalTickets, "Event sold out");
        require(msg.value == ev.ticketPrice, "Incorrect ETH amount sent");

        ev.ticketsSold++;
        ticketCount++;

        tickets[ticketCount] = Ticket({
            ticketId: ticketCount,
            eventId: _eventId,
            owner: msg.sender,
            isUsed: false,
            purchasedAt: block.timestamp
        });

        organizerBalances[ev.organizer] += msg.value;
        emit TicketPurchased(ticketCount, _eventId, msg.sender);
    }

    function transferTicket(uint256 _ticketId, address _to) external {
        Ticket storage t = tickets[_ticketId];
        require(t.ticketId != 0, "Ticket does not exist");
        require(t.owner == msg.sender, "You do not own this ticket");
        require(!t.isUsed, "Cannot transfer a used ticket");
        require(_to != address(0) && _to != msg.sender, "Invalid recipient address");

        t.owner = _to;
        emit TicketTransferred(_ticketId, msg.sender, _to);
    }

    function verifyAndUseTicket(uint256 _ticketId) external {
        Ticket storage t = tickets[_ticketId];
        require(t.ticketId != 0, "Ticket does not exist");

        Event storage ev = events[t.eventId];
        require(msg.sender == ev.organizer, "Only the event organizer can verify tickets");
        require(!t.isUsed, "Ticket has already been used");

        t.isUsed = true;
        emit TicketVerified(_ticketId, t.eventId, msg.sender);
    }

    function withdrawFunds() external nonReentrant {
        uint256 amount = organizerBalances[msg.sender];
        require(amount > 0, "No funds available to withdraw");

        organizerBalances[msg.sender] = 0;
        (bool success, ) = payable(msg.sender).call{value: amount}("");
        require(success, "ETH transfer failed");

        emit FundsWithdrawn(msg.sender, amount);
    }

    function getAllEvents() external view returns (Event[] memory) {
        Event[] memory allEvents = new Event[](eventCount);
        for (uint256 i = 1; i <= eventCount; i++) {
            allEvents[i - 1] = events[i];
        }
        return allEvents;
    }

    function getTicketsByOwner(address _owner) external view returns (Ticket[] memory) {
        uint256 count = 0;
        for (uint256 i = 1; i <= ticketCount; i++) {
            if (tickets[i].owner == _owner) {
                count++;
            }
        }

        Ticket[] memory owned = new Ticket[](count);
        uint256 index = 0;
        for (uint256 i = 1; i <= ticketCount; i++) {
            if (tickets[i].owner == _owner) {
                owned[index] = tickets[i];
                index++;
            }
        }
        return owned;
    }
}
