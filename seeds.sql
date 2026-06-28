-- Seed bills for credit card tracker
begin;

insert into public.bills (card_id, amount, currency, due_date, notes)
values
(NULL, 20.00, 'GBP', '2026-07-30', 'Contact Loan'),
(NULL, 29.00, 'GBP', '2026-07-29', 'Aviva INSURANCE'),
(NULL, 225.00, 'GBP', '2026-07-29', 'MBNA LIMITED'),
(NULL, 10.00, 'GBP', '2026-07-29', 'RSPCA HQ AC'),
(NULL, 0.00, 'GBP', '2026-07-29', 'Woodland Gym'),
(NULL, 925.00, 'GBP', '2026-07-27', 'BLYTH AND SONS'),
(NULL, 50.00, 'GBP', '2026-07-27', 'Savings account'),
(NULL, 38.00, 'GBP', '2026-07-19', 'ID MOBILE LIMITED'),
(NULL, 0.00, 'GBP', '2026-07-15', 'Marble'),
(NULL, 0.00, 'GBP', '2026-07-15', 'Fluid'),
(NULL, 100.00, 'GBP', '2026-07-15', 'HALIFAX'),
(NULL, 50.00, 'GBP', '2026-07-15', 'Virgin 1'),
(NULL, 90.00, 'GBP', '2026-07-15', 'Virgin 2'),
(NULL, 32.00, 'GBP', '2026-07-14', 'COUNTY BROADBAND'),
(NULL, 78.00, 'GBP', '2026-07-13', 'ANIMAL FRIENDS INS'),
(NULL, 299.00, 'GBP', '2026-07-10', 'CLOSEBROSMOTFIN'),
(NULL, 81.00, 'GBP', '2026-07-07', 'OCTOPUS ENERGY'),
(NULL, 100.00, 'GBP', '2026-07-06', 'Llloyds'),
(NULL, 150.00, 'GBP', '2026-07-02', 'HALIFAX'),
(NULL, 26.00, 'GBP', '2026-07-01', 'ANGLIAN WATER'),
(NULL, 4.00, 'GBP', '2026-07-01', 'Discovery'),
(NULL, 17.00, 'GBP', '2026-07-01', 'DVLA-CN70OZG'),
(NULL, 179.00, 'GBP', '2026-07-01', 'NORTH NORFOLK DIST'),
(NULL, 10.00, 'GBP', '2026-07-01', 'Apple'),
(NULL, 15.00, 'GBP', '2026-07-01', 'TV LICENCE MBP')
;

commit;

-- End of seeds
