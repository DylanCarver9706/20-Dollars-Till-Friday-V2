# 20-Dollars-Till-Friday-V2

Get Recurring Transactions Instructions:
1. Use Postman to get link token at Plaid API Endpoints/Link Tokens/Create Link Token
2. Give that to the link.html file located at directory Plaid-Transactions-Test/link.html and replace the token var with the response from Step 1
3. Use the GUI to sign into the account and retrieve the public token from the console output
4. Get the access token from Postman at Plaid API Endpoints/Transactions/Exchange public token for access token by giving the public token to the public_token var
5. Use the access_token var from the response and give that to the access_token at Plaid API Endpoints/Transactions/Retrieve Transactions by Date Range to get the account_id
6. Input the account_id and access_token vars at  Plaid API Endpoints/Transactions/Retrieve recurring transaction streams
7. Take that response and use the streams to create the app