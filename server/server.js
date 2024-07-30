const express = require("express");
const bodyParser = require("body-parser");
const fs = require("fs");
const app = express();
const PORT = 3000;
const DATA_FILE = "./test_data.json";

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
  SEMI_MONTHLY: "Semi-Monthly",
  BIWEEKLY: "Bi-Weekly",
  WEEKLY: "Weekly",
  MONTHLY: "Monthly",
  ANNUALLY: "Annually",
  UNKNOWN: "Unknown",
  // Add support for MONTHLY_ON_DAY_X
};

const formatRecurringResponseData = (data) => {
  let recurring_items = { recurring_credits: [], recurring_debits: [] };

  // recurring credits
  for (let i = 0; i < data.inflow_streams.length; i++) {
    let itemName = "";
    if (data.inflow_streams[i].merchant_name !== "") {
      itemName = data.inflow_streams[i].merchant_name;
    } else {
      itemName = data.inflow_streams[i].description;
    }

    recurring_items.recurring_credits.push({
      merchant_name: itemName,
      amount: Math.abs(data.inflow_streams[i].last_amount.amount).toFixed(2),
      frequency: frequencyConversionMap[data.inflow_streams[i].frequency],
      last_date: data.inflow_streams[i].last_date,
      next_payment_date: getNextRecurringDate(
        data.inflow_streams[i].last_date,
        frequencyConversionMap[data.inflow_streams[i].frequency]
      ),
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

    recurring_items.recurring_debits.push({
      merchant_name: itemName,
      amount: Math.abs(data.outflow_streams[i].last_amount.amount).toFixed(2),
      frequency: frequencyConversionMap[data.outflow_streams[i].frequency],
      last_date: data.outflow_streams[i].last_date,
      next_payment_date: getNextRecurringDate(
        data.outflow_streams[i].last_date,
        frequencyConversionMap[data.outflow_streams[i].frequency]
      ),
    });
  }

  return recurring_items;
};

const getNextRecurringDate = (lastDate, frequency) => {
  if (frequency == "Semi-Monthly") {
    splitDate = lastDate.split("-");
    console.log(splitDate);
    if (splitDate[2] == "01") {
      splitDate[2] = "15";
      return splitDate.join("-");
    } else {
      splitDate[2] = "01";
      console.log(parseInt(splitDate[1]) + 1);
      console.log(parseInt(splitDate[1]) + 1 < 10);
      if (parseInt(splitDate[1]) + 1 < 10) {
        splitDate[1] = `0${parseInt(splitDate[1]) + 1}`;
      } else {
        splitDate[1] = (parseInt(splitDate[1]) + 1).toString();
      }
      return splitDate.join("-");
    }

    // return date.toISOString().split("T")[0];
  } else if (frequency == "Bi-Weekly") {
    const date = new Date(lastDate);

    // Add 14 days
    date.setDate(date.getDate() + 14);

    // Format the updated date back into "YYYY-MM-DD"
    return date.toISOString().split("T")[0];
  } else if (frequency == "Monthly") {
    const date = new Date(lastDate);

    // Add 1 month
    date.setMonth(date.getMonth() + 1);

    // Format the updated date back into "YYYY-MM-DD"
    return date.toISOString().split("T")[0];
  }
};

// CRUD Operations for Users

// Get all users
app.get("/users", (req, res) => {
  const data = readData();
  res.json(data);
});

// Get user by id
app.get("/users/:id", (req, res) => {
  const data = readData();
  const user = data.find((u) => u.id === parseInt(req.params.id));
  if (user) {
    res.json(user);
  } else {
    res.status(404).send("User not found");
  }
});

// Add a new user
app.post("/users", (req, res) => {
  const data = readData();
  const newUser = {
    id: data.length > 0 ? data[data.length - 1].id + 1 : 1,
    ...req.body,
    recurring_charges: {}
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

// Update a user's recurring charges
app.put("/users_recurring_charges/:id", (req, res) => {
  const data = readData();
  const index = data.findIndex((u) => u.id === parseInt(req.params.id));
  if (index !== -1) {
    data[index] = { ...data[index], recurring_charges: formatRecurringResponseData(req.body) };
    writeData(data);
    res.json(data[index]);
  } else {
    res.status(404).send("User not found");
  }
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
