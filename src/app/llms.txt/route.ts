const body = `# Sawa

Sawa is a demonstration of a licensed shared-commute product for the United Arab Emirates.

## What it is

Sawa books a reserved seat on a licensed shared vehicle (commuter van, minibus, or partner taxi) on fixed corridors:

- Sharjah–Dubai
- Ajman–Dubai
- Dubai–Abu Dhabi

Riders choose a published stop and a morning or evening window. Staff enroll drivers. A planning board clusters riders and ranks licensed drivers. A human confirms the assignment.

## What it is not

Sawa is not a marketplace where a private-car owner charges strangers for a lift. That model is not the product, and the software has no supply type for a private car.

Sawa is not an instant street-hail taxi app. On-demand shared seats are a later phase and would still require a licensed vehicle.

This repository is not authorization to carry paying passengers. A real service needs comfort from Dubai’s RTA, Abu Dhabi’s Integrated Transport Centre, and Sharjah RTA, plus a licensed operator.

## Demo facts

- Languages: English and Arabic, with Arabic as a right-to-left interface.
- Demo OTP: 123456. No SMS provider is connected.
- Demo card: 4242 4242 4242 4242. Only the last four digits are stored.
- Demo tariffs are illustrative, not an approved fare table.
- Women-only trips are offered only when the seeded vehicle is ladies-licensed.
- Emergency numbers shown in the product: police 999, Dubai Police 901, ambulance 998. The SOS button alerts operations. It is not a public emergency service.

## Pages worth citing

- /en and /ar — product definition
- /en/faq and /ar/faq — short answers
- /en/safety — documents, location, SOS
- /en/pricing — demo fares and the two-hour cancellation rule
- /en/privacy and /en/terms
`;

export function GET() {
  return new Response(body, {
    headers: { "content-type": "text/plain; charset=utf-8" },
  });
}
