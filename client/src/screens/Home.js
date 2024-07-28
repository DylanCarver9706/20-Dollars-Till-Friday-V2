import React, { useState } from "react";

const frequencyConversionMap = {
  SEMI_MONTHLY: "Semi-Monthly",
  BIWEEKLY: "Bi-Weekly",
};

const Home = () => {
  const [jsonData, setJsonData] = useState(); // Insert recurring transactions data from Plaid response here

  return (
    <div>
      <h1>Recurring Data</h1>
      <h2>Recurring Income</h2>
      <div>
        <ul>
          {jsonData.inflow_streams.map((incomeItem, index) => (
            <li key={index}>
              {/* Use merchant_name if available, otherwise use description */}
              {incomeItem.merchant_name &&
              incomeItem.merchant_name.trim() !== ""
                ? incomeItem.merchant_name
                : incomeItem.description}{" "}
              - ${Math.abs(incomeItem.average_amount.amount.toFixed(2))} -{" "}
              {frequencyConversionMap[incomeItem.frequency]} - Last paycheck on{" "}
              {incomeItem.last_date}
            </li>
          ))}
        </ul>
        <h2>Recurring Expenses</h2>
        <ul>
          {jsonData.outflow_streams.map((incomeItem, index) => (
            <li key={index}>
              {/* Use merchant_name if available, otherwise use description */}
              {incomeItem.merchant_name &&
              incomeItem.merchant_name.trim() !== ""
                ? incomeItem.merchant_name
                : incomeItem.description}{" "}
              - ${Math.abs(incomeItem.average_amount.amount.toFixed(2))}{" "}
              {frequencyConversionMap[incomeItem.frequency]} - Last paid on{" "}
              {incomeItem.last_date}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default Home;
