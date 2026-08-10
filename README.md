# SV Number agent skill

Your agent hits a signup wall: "we sent a code to your phone". It has no phone. This skill
gives it one on demand, in the country the service expects, and reads the code back over
the API.

One markdown file. No SDK, no dashboard, no human at the keyboard.

```
> Read the sv-number skill and register me a Telegram account on an Indonesian number.

  ordered +62 838 1234 5678
  code 123456
  account created
```

## What it lets an agent do

### Sign up anywhere, not just where you live

Most verification checks look at the country the number came from. An Indonesian
marketplace refuses a US number before the SMS is even sent. The agent names the country in
the request and that whole class of failure disappears.

The catalogue carries 200+ countries, the widest coverage in this category. You do not have
to take that on faith, and you should not: one call returns the list, so count it yourself.

```bash
curl -s "https://sms-verification-number.com/stubs/handler_api?api_key=$SVN_API_KEY\
&action=getCountryAndOperators&lang=en" | jq length
```

### Read the code, not an inbox

The API returns the verification code itself, already parsed out of the message. There is
no regex to write per service and nothing to fix when a service rewrites its wording.

### Pay for the code, not for the month

Money is held when the number is ordered and charged when the code lands. Nothing in 20
minutes and it returns to the balance by itself.

### Keep the number private

One activation, one holder. Nobody else receives its codes, which is exactly the part that
free shared pools get wrong.

### Steer by what the pool is doing, not by price

The catalogue call returns, per service and country, the share of codes that arrived for
other users and how many numbers are live right now. Where the share is measured, an agent
that reads it stops paying for countries that never deliver; where it is not, the size of
the live pool tells the same story.

### Finish the second factor too

When the account asks for an authenticator, the agent stores the TOTP secret next to its
API key and computes the six digits locally, by RFC 6238. The secret never leaves the
machine.

## Start

```bash
curl -O https://raw.githubusercontent.com/sv-number/skills/main/sv-number/SKILL.md
export SVN_API_KEY=your_key_here
```

The layout follows the [Agent Skills specification](https://agentskills.io/specification):
a directory named after the skill, holding `SKILL.md` and `scripts/`. Point any runner at
it and it works as is, in Claude Code, Codex or anything else that reads a skill. The key comes from
[your profile](https://sms-verification-number.com/en/user/profile/) after
[signup](https://sms-verification-number.com/en/register/). The balance has to be funded:
there is no free tier on this API.

## The cycle

```
getNumber   -> ACCESS_NUMBER:id:phone      order a number, money is held
getStatus   -> STATUS_WAIT_CODE            poll every 3 to 5 seconds
            -> STATUS_OK:123456            the code
setStatus 6 -> ACCESS_ACTIVATION           done, the charge stays
setStatus 8 -> ACCESS_CANCEL               nothing came, money back
```

Runnable versions: [`sv-number/scripts/order_number.py`](sv-number/scripts/order_number.py)
and [`sv-number/scripts/order_number.mjs`](sv-number/scripts/order_number.mjs).

## What it is not

Receiving codes is the whole job. These numbers do not send SMS and do not take calls, and
they are not for banking, payment or government accounts. If your agent needs a permanent
number that holds a conversation with people, you want a carrier product instead.

## Rules the skill enforces

The API key stays in the agent's environment and goes nowhere else. An activation is used
for the service it was ordered under, because that is what keeps delivery rates high for
everyone. Every activation gets closed: `setStatus 6` when the code was used, `setStatus 8`
when nothing arrived. A forgotten activation holds money until it expires.

## Links

- Skill file: [`sv-number/SKILL.md`](sv-number/SKILL.md)
- The same skill as a page: https://sms-verification-number.com/en/agent-skill/
- Full API reference: https://sms-verification-number.com/en/api-sms-activate/
- Live coverage and prices: https://sms-verification-number.com/en/number-for-ai-agents/

MIT for the skill and the examples. The service behind it is commercial.
