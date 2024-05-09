/**
 * Updates Ethereum addresses and social information from the Airstack API into a Google Sheet.
 */
function updateETHAddresses() {
  // Access the active sheet
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  
  // Define the range of user IDs to update
  const range = sheet.getRange("A2:A" + sheet.getLastRow());
  const fids = range.getValues();
  
  // Set API credentials and endpoint
  const apiKey = 'YOUR_AIRSTACK_API_KEY';
  const url = 'https://api.airstack.xyz/gql';

  // Iterate over each user ID to fetch and update information
  fids.forEach((row, index) => {
    // GraphQL query for user's social profile and associated Ethereum addresses
    const userQuery = `query MyQuery($userId: String, $blockchain: Blockchain!) {
      Socials(input: {filter: {userId: {_eq: $userId}}, blockchain: $blockchain}) {
        Social {
          profileName
          followerCount
          followingCount
          isFarcasterPowerUser
          userAssociatedAddresses
        }
      }
    }`;

    // Define variables for the GraphQL query
    const userVariables = {
      userId: row[0].toString(),
      blockchain: "ethereum"
    };

    // Set options for HTTP request
    const userOptions = {
      'method' : 'post',
      'contentType': 'application/json',
      'headers': {
        'Authorization': 'Bearer ' + apiKey
      },
      'payload' : JSON.stringify({
        query: userQuery,
        variables: userVariables
      }),
      'muteHttpExceptions': true
    };

    // Fetch user data from Airstack API
    const userResponse = UrlFetchApp.fetch(url, userOptions);
    const userJson = JSON.parse(userResponse.getContentText());
    
    // Check if user data is available and process it
    if (userJson.data && userJson.data.Socials && userJson.data.Socials.Social && userJson.data.Socials.Social.length > 0) {
      const social = userJson.data.Socials.Social[0];
      const profileName = social.profileName || "";
      const profileUrl = profileName ? `https://warpcast.com/${encodeURIComponent(profileName)}` : "";
      const profileLink = profileName ? `=HYPERLINK("${profileUrl}", "${profileName}")` : "";
      const followerCount = social.followerCount || "";
      const followingCount = social.followingCount || "";
      const isPowerUser = social.isFarcasterPowerUser ? "Yes" : "";
      const addresses = social.userAssociatedAddresses || [];

      // Fetch ENS domains for the Ethereum addresses
      const ensQuery = `query MyQuery($address: [Identity!]) {
        Domains(input: {filter: {owner: {_in: $address}}, blockchain: ethereum}) {
          Domain {
            name
          }
        }
      }`;

      // Set options for HTTP request to fetch ENS domains
      const ensOptions = {
        'method' : 'post',
        'contentType': 'application/json',
        'headers': {
          'Authorization': 'Bearer ' + apiKey
        },
        'payload' : JSON.stringify({
          query: ensQuery,
          variables: { address: addresses.length > 0 ? addresses : [""] }
        }),
        'muteHttpExceptions': true
      };

      // Fetch ENS domain names
      const ensResponse = UrlFetchApp.fetch(url, ensOptions);
      const ensJson = JSON.parse(ensResponse.getContentText());
      const ensDomain = ensJson.data && ensJson.data.Domains && ensJson.data.Domains.Domain && ensJson.data.Domains.Domain.length > 0
                        ? ensJson.data.Domains.Domain[0].name : "";

      // Update sheet with fetched data
      sheet.getRange("B" + (index + 2)).setFormula(profileLink);
      sheet.getRange("C" + (index + 2)).setValue(followerCount);
      sheet.getRange("D" + (index + 2)).setValue(followingCount);
      sheet.getRange("E" + (index + 2)).setValue(isPowerUser);
      sheet.getRange("F" + (index + 2)).setValue(ensDomain);
      sheet.getRange("G" + (index + 2)).setValue(addresses.join(", "));
    } else {
      // Handle cases where no data is found
      sheet.getRange(index + 2, 2, 1, 6).setValues([["", "", "", "", "", ""]]);
    }
  });
}

/**
 * Adds a custom menu to the Google Sheet on open, facilitating the execution of the update function.
 */
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('⚡️⚡️⚡️')
      .addItem('Update', 'updateETHAddresses')
      .addToUi();
}
