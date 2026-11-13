// Order a number, wait for the verification code, close the activation.
//
//     export SVN_API_KEY=your_key_here
//     node order_number.mjs tg 6 [maxPrice]   // Telegram, Indonesia, optional price ceiling
//
// Country and service ids come from getCountryAndOperators and
// getServicesAndCostWithStatistics.

const API = "https://sms-verification-number.com/stubs/handler_api";
const KEY = process.env.SVN_API_KEY;

// every call takes api_key, action and lang; errors come back as plain text with HTTP 200
async function call(action, params = {}) {
  const query = new URLSearchParams({ api_key: KEY, action, lang: "en", ...params });
  const response = await fetch(`${API}?${query}`);
  return (await response.text()).trim();
}

async function order(service, country, maxPrice) {
  const params = { service, country, operator: "any" };
  if (maxPrice) params.maxPrice = maxPrice;
  const answer = await call("getNumber", params);
  if (!answer.startsWith("ACCESS_NUMBER")) throw new Error(`could not order a number: ${answer}`);
  const [, id, phone] = answer.split(":");
  return { id, phone };
}

// the number lives 20 minutes; poll every 3 to 5 seconds, not once a second
async function waitForCode(id, minutes = 20) {
  const deadline = Date.now() + minutes * 60_000;
  while (Date.now() < deadline) {
    const answer = await call("getStatus", { id });
    if (answer.startsWith("STATUS_OK")) return answer.split(":")[1];
    if (answer === "STATUS_CANCEL") return null;
    await new Promise((r) => setTimeout(r, 4000));
  }
  return null;
}

const [service, country, maxPrice] = process.argv.slice(2);
if (!service || !country) {
  console.error("usage: node order_number.mjs SERVICE COUNTRY [MAX_PRICE]");
  process.exit(1);
}
const { id, phone } = await order(service, country, maxPrice);
console.log(`number ${phone} (activation ${id})`);
console.log("trigger the SMS on the target service now");

const code = await waitForCode(id);
if (code) {
  console.log("code:", code);
  await call("setStatus", { id, status: 6 });   // finished, the charge stays
} else {
  // cancelling is refused for the first 2 minutes, most codes land inside that window
  console.log("no code arrived, cancelling");
  await call("setStatus", { id, status: 8 });   // money returns to the balance
}
