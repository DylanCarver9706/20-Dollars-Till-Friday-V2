const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const fs = require("fs");
const app = express();
const PORT = 3000;
const DATA_FILE = "./test_data.json";

const cstTimezoneOptions = {
  timeZone: "America/Chicago",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
};

// Use cors middleware
app.use(cors());

// Middleware to parse JSON requests
app.use(bodyParser.json());

// Helper function to read data from the file
const readData = () => {
  try {
    const data = fs.readFileSync(DATA_FILE);
    return JSON.parse(data);
  } catch (err) {
    return [];
  }
};

// Helper function to write data to the file
const writeData = (data) => {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
};

const frequencyConversionMap = {
  // ONE_TIME: "One-Time",
  SEMI_MONTHLY: "Semi-Monthly",
  BIWEEKLY: "Bi-Weekly",
  WEEKLY: "Weekly",
  MONTHLY: "Monthly",
  ANNUALLY: "Annually",
  UNKNOWN: "Monthly", // Default to Monthly until user specifies
  // Add support for MONTHLY_ON_DAY_X
};

// NOTE: Only to be used for response data from Plaid API
const formatRecurringResponseData = (data) => {
  let charges = [];

  // recurring credits
  for (let i = 0; i < data.inflow_streams.length; i++) {
    let itemName = "";
    if (data.inflow_streams[i].merchant_name !== "") {
      itemName = data.inflow_streams[i].merchant_name;
    } else {
      itemName = data.inflow_streams[i].description;
    }

    charges.push({
      merchant_name: itemName,
      amount: Math.abs(data.inflow_streams[i].last_amount.amount).toFixed(2),
      frequency: frequencyConversionMap[data.inflow_streams[i].frequency],
      last_charge_date: data.inflow_streams[i].last_charge_date,
      next_charge_date: getNextRecurringDate(
        data.inflow_streams[i].last_charge_date,
        frequencyConversionMap[data.inflow_streams[i].frequency]
      ),
      type: "credit",
    });
  }

  // recurring debits
  for (let i = 0; i < data.outflow_streams.length; i++) {
    let itemName = "";
    if (data.outflow_streams[i].merchant_name !== "") {
      itemName = data.outflow_streams[i].merchant_name;
    } else {
      itemName = data.outflow_streams[i].description;
    }

    charges.push({
      merchant_name: itemName,
      amount: Math.abs(data.outflow_streams[i].last_amount.amount).toFixed(2),
      frequency: frequencyConversionMap[data.outflow_streams[i].frequency],
      last_charge_date: data.outflow_streams[i].last_charge_date,
      next_charge_date: getNextRecurringDate(
        data.outflow_streams[i].last_charge_date,
        frequencyConversionMap[data.outflow_streams[i].frequency]
      ),
      type: "debit",
    });
  }

  return charges;
};

const getNextRecurringDate = (lastDate, frequency) => {
  // Adjust date to CST and format to YYYY-MM-DD
  const date = new Date(lastDate.toLocaleString("en-US", cstTimezoneOptions));

  // Add one day to the formatted date to make it work for some reason
  date.setDate(date.getDate() + 1);

  if (frequency === "Semi-Monthly") {
    const day = date.getDate();
    const month = date.getMonth() + 1; // JavaScript months are 0-11
    const year = date.getFullYear();

    if (day === 1) {
      return `${year}-${month < 10 ? `0${month}` : month}-15`;
    } else if (day === 15) {
      const nextMonth = month === 12 ? 1 : month + 1;
      const nextYear = month === 12 ? year + 1 : year;
      return `${nextYear}-${nextMonth < 10 ? `0${nextMonth}` : nextMonth}-01`;
    }
  } else if (frequency === "Weekly") {
    date.setDate(date.getDate() + 7);
  } else if (frequency === "Bi-Weekly") {
    date.setDate(date.getDate() + 14);
  } else if (frequency === "Monthly") {
    date.setMonth(date.getMonth() + 1);
  } else if (frequency === "Annually") {
    date.setFullYear(date.getFullYear() + 1);
  }

  const year = date.getFullYear();
  const month = date.getMonth() + 1; // JavaScript months are 0-11
  const day = date.getDate();

  return `${year}-${month < 10 ? `0${month}` : month}-${
    day < 10 ? `0${day}` : day
  }`;
};

const calculateDisposableIncome = (charges) => {

  // Sort by date first, then by frequency to ensure credits come before debits
  charges.sort((a, b) => {
    let dateComparison = new Date(a.charge_date) - new Date(b.charge_date);
    if (dateComparison !== 0) return dateComparison;

    // If dates are the same, sort by type (credit before debit)
    if (a.type === "credit" && b.type === "debit") return -1;
    if (a.type === "debit" && b.type === "credit") return 1;

    return 0;
  });

  console.log(charges)

  let disposableIncomeInfo = [];

  let payDay = null;
  let payDayAmount = 0.0;
  let description = "";
  let totalDebits = 0.0;
  let chargesInPeriod = []

  for (let i = 0; i < charges.length; i++) {
    let chargeItem = charges[i];

    if (chargeItem.type === "credit") {
      if (payDay !== null && payDay !== chargeItem.charge_date) {
        // Record the information for the previous pay period
        let nextPayDayMinusDay = new Date(chargeItem.charge_date);
        nextPayDayMinusDay.setDate(nextPayDayMinusDay.getDate() - 1);
        description += `${nextPayDayMinusDay.toISOString().split("T")[0]}`;

        disposableIncomeInfo.push({
          description: description,
          payDay: new Date(payDay).toISOString().split("T")[0],
          nextPayDayMinusDay: nextPayDayMinusDay.toISOString().split("T")[0],
          payDayAmount: payDayAmount,
          totalDebits: parseFloat(totalDebits.toFixed(2)),
          disposableIncome: parseFloat((payDayAmount - totalDebits).toFixed(2)),
          chargesInPeriod: chargesInPeriod
        });

        // Reset values for next disposable income period
        description = "";
        totalDebits = 0.0;
        payDay = null;
        chargesInPeriod = []
      } 
      else if (payDay == chargeItem.charge_date) {
        chargeItem.amount = parseFloat(chargeItem.amount) + payDayAmount
      }

      // Start a new pay period
      payDay = new Date(chargeItem.charge_date).toISOString().split("T")[0];
      payDayAmount = parseFloat(chargeItem.amount);
      description = `disposable income from ${
        new Date(payDay).toISOString().split("T")[0]
      } to `;
    } else if (chargeItem.type === "debit" && payDay !== null) {
      totalDebits += parseFloat(chargeItem.amount);
      chargesInPeriod.push(chargeItem);
    }
  }

  return disposableIncomeInfo;
};

const getChargesToRender = (charges) => {
  let chargesToRender = [];

  for (let i = 0; i < charges.length; i++) {

    let charge = charges[i];

    // Handle one-time charges
    if (charge.frequency == "One-Time") {
      chargesToRender.push({
        merchant_name: charge.merchant_name,
        amount: charge.amount,
        frequency: charge.frequency,
        charge_date: charge.last_charge_date,
        type: charge.type
      });
      continue;
    }

    let lastChargeDate = new Date(charge.last_charge_date);

    if (isNaN(lastChargeDate)) {
      console.error(`Invalid last_charge_date for charge: ${JSON.stringify(charge)}`);
      continue;
    }

    const todayDate = new Date();
    const thresholdDate = new Date(todayDate);
    thresholdDate.setDate(todayDate.getDate() - 32);

    let tempDate = lastChargeDate;

    while (tempDate <= thresholdDate) {
      tempDate = new Date(getNextRecurringDate(tempDate.toISOString().split("T")[0], charge.frequency));
      if (isNaN(tempDate)) {
        break;
      }
    }

    let tempChargeDate = tempDate;

    const numIterations = charge.frequency === "Weekly" ? 12 : 
                          charge.frequency === "Bi-Weekly" ? 6 : 
                          charge.frequency === "Semi-Monthly" ? 6 : 
                          charge.frequency === "Monthly" ? 3 : 
                          charge.frequency === "Annually" ? 1 : 0;

    for (let j = 0; j < numIterations; j++) {
      chargesToRender.push({
        merchant_name: charge.merchant_name,
        amount: charge.amount,
        frequency: charge.frequency,
        charge_date: tempChargeDate.toISOString().split("T")[0],
        type: charge.type
      });
      tempChargeDate = new Date(getNextRecurringDate(tempChargeDate.toISOString().split("T")[0], charge.frequency));
      if (isNaN(tempChargeDate)) {
        console.error(`Invalid tempChargeDate generated from getNextRecurringDate for charge: ${JSON.stringify(charge)}`);
        break;
      }
    }
  }

  return chargesToRender;
};

// CRUD Operations for Users

// Get user by id
app.get("/users/:id", (req, res) => {
  const data = readData();
  const userIndex = data.findIndex((u) => u.id === parseInt(req.params.id));
  if (userIndex !== -1) {
    data[userIndex].charges_to_render = getChargesToRender(data[userIndex].charges);
    data[userIndex].disposable_income = calculateDisposableIncome(data[userIndex].charges_to_render);
    writeData(data);
    res.json(data[userIndex]);
  } else {
    res.status(404).send("User not found");
  }
});

// Authentication endpoint
app.post("/auth/login", (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).send("Email and password are required.");
  }

  const data = readData();
  const user = data.find((u) => u.email === email);

  if (!user) {
    return res.status(404).send("User not found.");
  }

  // In a real-world scenario, you should hash passwords and compare hash values
  if (user.password !== password) {
    return res.status(401).send("Invalid password.");
  }

  // Return user data, excluding sensitive information like password
  const { password: userPassword, ...userData } = user;
  res.json(userData);
});

// Add a new user
app.post("/users", (req, res) => {
  const data = readData();
  const newUser = {
    id: data.length > 0 ? data[data.length - 1].id + 1 : 1,
    ...req.body,
    charges: [],
    charges_to_render: [],
  };
  data.push(newUser);
  writeData(data);
  res.status(201).json(newUser);
});

// Update a user
app.put("/users/:id", (req, res) => {
  const data = readData();
  const index = data.findIndex((u) => u.id === parseInt(req.params.id));
  if (index !== -1) {
    data[index] = { ...data[index], ...req.body };
    writeData(data);
    res.json(data[index]);
  } else {
    res.status(404).send("User not found");
  }
});

// Add a new charge to a user's charges array
app.post("/users/:id/charges", (req, res) => {
  const userId = parseInt(req.params.id);
  const newCharge = req.body;

  if (
    !newCharge.merchant_name ||
    !newCharge.amount ||
    !newCharge.frequency ||
    !newCharge.last_charge_date ||
    !newCharge.type
  ) {
    return res
      .status(400)
      .send(
        "All fields (merchant_name, amount, frequency, last_charge_date, type) are required."
      );
  }

  const data = readData();
  const userIndex = data.findIndex((user) => user.id === userId);

  if (userIndex === -1) {
    return res.status(404).send("User not found");
  }

  data[userIndex].charges.push(newCharge);
  data[userIndex].charges_to_render = getChargesToRender(
    data[userIndex].charges
  );
  data[userIndex].disposable_income = calculateDisposableIncome(data[userIndex].charges_to_render)

  res.status(201).json(data[userIndex]);
  writeData(data);
});

// Delete a user
app.delete("/users/:id", (req, res) => {
  let data = readData();
  const newData = data.filter((u) => u.id !== parseInt(req.params.id));
  if (newData.length !== data.length) {
    writeData(newData);
    res.status(204).send();
  } else {
    res.status(404).send("User not found");
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
