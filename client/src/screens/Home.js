import React, { useState, useEffect } from "react";
import Calendar from "react-calendar";
import "../App.css"; // Import custom styles

const Home = ({ userData }) => {
  const [charges, setCharges] = useState([]);
  const [date, setDate] = useState(new Date());
  const [financialPosition, setFinancialPosition] = useState(null);

  // Form state
  const [merchantName, setMerchantName] = useState("");
  const [amount, setAmount] = useState("");
  const [frequency, setFrequency] = useState("Bi-Weekly");
  const [chargeDate, setChargeDate] = useState("");
  const [type, setType] = useState("credit");

  const onDateChange = (newDate) => {
    setDate(newDate);
  };

  // Load initial charges from userData
  useEffect(() => {
    if (userData && userData.charges_to_render) {
      const newCharges = userData.charges_to_render.map((charge) => {
        const chargeDate = new Date(charge.charge_date);
        chargeDate.setDate(chargeDate.getDate() + 1); // Add one day to the charge_date
        return { ...charge, date: chargeDate };
      });
      setCharges(newCharges);
    }
    if (userData && userData.disposable_income) {
      setFinancialPosition(userData.disposable_income);
    }
  }, [userData]);

  const addCharge = () => {
    const newCharge = {
      merchant_name: merchantName,
      amount: amount,
      frequency: frequency,
      last_charge_date: chargeDate,
      type: type,
    };

    // Send the POST request
    fetch(`http://localhost:3000/users/${userData.id}/recurring_charges`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(newCharge),
    })
      .then((response) => response.json())
      .then((data) => {
        // Add the date property for local state update
        const chargeWithDate = { ...newCharge, date: new Date(chargeDate) };
        // Add the new charge to the state
        setCharges((prevCharges) => [...prevCharges, chargeWithDate]);
        // Reset form fields
        setMerchantName("");
        setAmount("");
        setFrequency("Bi-Weekly");
        setChargeDate("");
        setType("credit");
      })
      .catch((error) => {
        console.error("Error:", error);
      });
  };

  const tileContent = ({ date, view }) => {
    if (view === "month") {
      const dayCharges = charges.filter(
        (charge) => charge.date.toDateString() === date.toDateString()
      );
      return (
        <div className="charge-list">
          {dayCharges.map((charge, index) => (
            <div key={index} className={`charge-item ${charge.type === "debit" ? "debit" : "credit"}`}>
              {`${charge.merchant_name}\n$${charge.amount}\n${charge.frequency}`}
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="App">
      <Calendar
        onChange={onDateChange}
        value={date}
        tileContent={tileContent}
        className="react-calendar"
      />
      <div>
        <h2>Charges on {date.toISOString().split("T")[0]}</h2>
        <ul>
          {charges
            .filter((charge) => charge.date.toDateString() === date.toDateString())
            .map((charge, index) => (
              <li key={index}>
                {`${charge.merchant_name} - $${charge.amount} - ${charge.frequency}`}
              </li>
            ))}
        </ul>
        <h2>Disposable Income</h2>
        <ul>
          {financialPosition?.map((position, index) => (
            <li key={index}>
              {`You have $${position.disposableIncome} in ${position.description}`}
            </li>
          ))}
        </ul>
        <h2>Recurring Charges</h2>
        <ul>
          {charges
            .filter(
              (charge, index, self) =>
                index ===
                self.findIndex(
                  (t) =>
                    t.merchant_name === charge.merchant_name &&
                    t.amount === charge.amount
                )
            )
            .map((charge, index) => (
              <li key={index}>
                {`${charge.date.toDateString()} - ${charge.merchant_name} - $${charge.amount}`}
              </li>
            ))}
        </ul>
      </div>
      <div>
        <h2>Add a New Charge</h2>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            addCharge();
          }}
        >
          <div>
            <label>Merchant Name:</label>
            <input
              type="text"
              value={merchantName}
              onChange={(e) => setMerchantName(e.target.value)}
              required
            />
          </div>
          <div>
            <label>Amount:</label>
            <input
              type="text"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
          </div>
          <div>
            <label>Frequency:</label>
            <select
              value={frequency}
              onChange={(e) => setFrequency(e.target.value)}
            >
              <option value="Bi-Weekly">Bi-Weekly</option>
              <option value="Semi-Monthly">Semi-Monthly</option>
              <option value="Monthly">Monthly</option>
              <option value="Annually">Annually</option>
              <option value="One-Time">One-Time</option>
            </select>
          </div>
          <div>
            <label>Charge Date:</label>
            <input
              type="date"
              value={chargeDate}
              onChange={(e) => setChargeDate(e.target.value)}
              required
            />
          </div>
          <div>
            <label>Type:</label>
            <select value={type} onChange={(e) => setType(e.target.value)}>
              <option value="credit">Credit</option>
              <option value="debit">Debit</option>
            </select>
          </div>
          <button type="submit">Add Charge</button>
        </form>
      </div>
    </div>
  );
};

export default Home;
